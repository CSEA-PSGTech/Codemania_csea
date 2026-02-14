const mongoose = require('mongoose');
const XLSX = require('xlsx');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Load Team model
const Team = require('./models/Team');

const EXCEL_PATH = String.raw`C:\Users\shiva\Downloads\CODE MANIA Infinitum'26 (Responses).xlsx`;

async function registerTeams() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Read Excel
    const workbook = XLSX.readFile(EXCEL_PATH);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet);

    console.log(`Found ${rows.length} rows in Excel\n`);

    let registered = 0;
    let skipped = 0;
    let errors = 0;

    for (const row of rows) {
        const teamName = (row['Team Name'] || '').toString().trim();
        const user1Name = (row['Name of Participant 1'] || '').toString().trim();
        const user1Mobile = (row['Contact Number 1'] || '').toString().trim();
        const user2Name = (row['Name of Participant 2'] || '').toString().trim();
        const user2Mobile = (row['Contact Number 2'] || '').toString().trim();
        const collegeName = (row['Name of College'] || '').toString().trim();

        if (!teamName) {
            console.log(`  SKIP: Empty team name in row`);
            skipped++;
            continue;
        }

        // Check for duplicate team name
        const existing = await Team.findOne({ teamName });
        if (existing) {
            console.log(`  SKIP: "${teamName}" already exists`);
            skipped++;
            continue;
        }

        try {
            await Team.create({
                teamName,
                collegeName: collegeName || 'Unknown',
                user1Name: user1Name || 'Participant 1',
                user2Name: user2Name || 'Participant 2',
                user1Mobile: user1Mobile || 'N/A',
                user2Mobile: user2Mobile || 'N/A',
            });
            console.log(`  ✅ Registered: "${teamName}" (${collegeName})`);
            registered++;
        } catch (err) {
            console.log(`  ❌ ERROR: "${teamName}" - ${err.message}`);
            errors++;
        }
    }

    console.log(`\n========== SUMMARY ==========`);
    console.log(`Registered: ${registered}`);
    console.log(`Skipped:    ${skipped}`);
    console.log(`Errors:     ${errors}`);
    console.log(`Total rows: ${rows.length}`);

    await mongoose.disconnect();
}

registerTeams().catch(err => { console.error(err); process.exit(1); });
