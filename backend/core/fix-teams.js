const mongoose = require('mongoose');
const XLSX = require('xlsx');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const Team = require('./models/Team');

const EXCEL_PATH = String.raw`C:\Users\shiva\Downloads\CODE MANIA Infinitum'26 (Responses).xlsx`;

async function fixTeams() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    // ── Step 1: Remove teams with incomplete participant 2 details ──
    console.log('=== STEP 1: Removing teams with incomplete details ===');
    const allTeams = await Team.find({});
    let removed = 0;
    for (const team of allTeams) {
        const missing2 = !team.user2Name || team.user2Name === 'Participant 2' || team.user2Name === 'N/A' || team.user2Name === '' ||
            !team.user2Mobile || team.user2Mobile === 'N/A' || team.user2Mobile === '';
        if (missing2) {
            console.log(`  ❌ Removing: "${team.teamName}" (user2: "${team.user2Name}", mobile2: "${team.user2Mobile}")`);
            await Team.deleteOne({ _id: team._id });
            removed++;
        }
    }
    console.log(`Removed ${removed} incomplete teams\n`);

    // ── Step 2: Re-read Excel and add skipped duplicates with suffix ──
    console.log('=== STEP 2: Adding duplicate-named teams with suffix ===');
    const workbook = XLSX.readFile(EXCEL_PATH);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    // Group by team name to find duplicates
    const teamGroups = {};
    for (const row of rows) {
        const teamName = (row['Team Name'] || '').toString().trim();
        if (!teamName) continue;
        if (!teamGroups[teamName]) teamGroups[teamName] = [];
        teamGroups[teamName].push(row);
    }

    let added = 0;
    for (const [teamName, entries] of Object.entries(teamGroups)) {
        for (let i = 0; i < entries.length; i++) {
            const row = entries[i];
            const user1Name = (row['Name of Participant 1'] || '').toString().trim();
            const user1Mobile = (row['Contact Number 1'] || '').toString().trim();
            const user2Name = (row['Name of Participant 2'] || '').toString().trim();
            const user2Mobile = (row['Contact Number 2'] || '').toString().trim();
            const collegeName = (row['Name of College'] || '').toString().trim();

            // Skip rows with incomplete participant 2 details
            if (!user2Name || !user2Mobile) {
                console.log(`  SKIP (incomplete): "${teamName}" — missing participant 2 details`);
                continue;
            }

            // For duplicates, append _2, _3, etc.
            let finalName = teamName;
            if (i > 0) {
                finalName = `${teamName}_${i + 1}`;
            }

            // Check if already exists
            const existing = await Team.findOne({ teamName: finalName });
            if (existing) {
                // Check if it's the same participants
                if (existing.user1Name === user1Name && existing.user2Name === user2Name) {
                    continue; // Already registered correctly
                }
                // Different participants with same resolved name, try next suffix
                let suffix = i > 0 ? i + 1 : 2;
                while (await Team.findOne({ teamName: `${teamName}_${suffix}` })) {
                    suffix++;
                }
                finalName = `${teamName}_${suffix}`;
            }

            try {
                await Team.create({
                    teamName: finalName,
                    collegeName: collegeName || 'Unknown',
                    user1Name: user1Name || 'Participant 1',
                    user2Name,
                    user1Mobile: user1Mobile || 'N/A',
                    user2Mobile,
                });
                console.log(`  ✅ Registered: "${finalName}" — ${user1Name} & ${user2Name} (${collegeName})`);
                added++;
            } catch (err) {
                console.log(`  ❌ ERROR: "${finalName}" — ${err.message}`);
            }
        }
    }

    // Final count
    const totalTeams = await Team.countDocuments();
    console.log(`\n========== SUMMARY ==========`);
    console.log(`Removed (incomplete): ${removed}`);
    console.log(`Added (new/dup):      ${added}`);
    console.log(`Total teams in DB:    ${totalTeams}`);

    await mongoose.disconnect();
}

fixTeams().catch(err => { console.error(err); process.exit(1); });
