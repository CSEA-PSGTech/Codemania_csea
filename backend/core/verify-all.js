const mongoose = require('mongoose');
const path = require('path');
const axios = require('axios');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

async function verify() {
    // ── DB CHECKS ──
    await mongoose.connect(process.env.MONGO_URI);
    const db = mongoose.connection.db;

    console.log('╔══════════════════════════════════════╗');
    console.log('║   CODEMANIA FINAL VERIFICATION       ║');
    console.log('╚══════════════════════════════════════╝\n');

    // Questions
    const qs = await db.collection('questions').find({}).toArray();
    console.log(`[✓] QUESTIONS: ${qs.length}`);
    let qIssues = 0;
    for (const q of qs) {
        const sampleTc = (q.testcases || []).filter(t => !t.hidden).length;
        const hiddenTc = (q.testcases || []).filter(t => t.hidden).length;
        const issues = [];
        if (q.currentPoints !== q.totalPoints) issues.push(`pts mismatch: cur=${q.currentPoints} total=${q.totalPoints}`);
        if (q.noOfTeamsSolved !== 0) issues.push(`solved=${q.noOfTeamsSolved} (should be 0)`);
        if (!q.timeLimitPython) issues.push('no timeLimitPython');
        if (sampleTc === 0) issues.push('NO SAMPLE TEST CASES');
        if (hiddenTc === 0) issues.push('NO HIDDEN TEST CASES');
        if (!q.nonOptimizedCode) issues.push('NO nonOptimizedCode');

        const status = issues.length > 0 ? '⚠' : '✓';
        console.log(`  [${status}] "${q.title}" | pts:${q.totalPoints} cur:${q.currentPoints} | TL:${q.timeLimitPython}ms | tc:${sampleTc}s/${hiddenTc}h`);
        if (issues.length > 0) {
            issues.forEach(i => console.log(`      ⚠ ${i}`));
            qIssues++;
        }
    }

    // Teams
    const teams = await db.collection('teams').countDocuments();
    const teamsWithPoints = await db.collection('teams').countDocuments({ totalPoints: { $gt: 0 } });
    console.log(`\n[✓] TEAMS: ${teams} (${teamsWithPoints} with points > 0)`);

    // Submissions
    const subs = await db.collection('submissions').countDocuments();
    console.log(`[✓] SUBMISSIONS: ${subs}`);

    await mongoose.disconnect();

    // ── HEALTH CHECKS ──
    console.log('\n── HEALTH CHECKS ──');

    try {
        const health = await axios.get('http://localhost:3000/health', { timeout: 5000 });
        console.log(`[✓] Execution Server (via LB): ${JSON.stringify(health.data)}`);
    } catch (e) {
        console.log(`[✗] Execution Server health: ${e.message}`);
    }

    // ── TEST EXECUTION ──
    console.log('\n── TEST EXECUTION ──');
    try {
        const execRes = await axios.post('http://localhost:3000/execute', {
            code: 'n = int(input())\narr = list(map(int, input().split()))\nprint(sum(arr))',
            language: 'python',
            testCases: [{ input: '3\n1 2 3', expectedOutput: '6' }],
            timeLimit: 2000,
            submissionId: 'verify-test'
        }, {
            headers: { 'X-Execution-Secret': 'codemania-secret-key-2026' },
            timeout: 15000
        });
        console.log(`[✓] Execution: verdict=${execRes.data.verdict} time=${execRes.data.results?.[0]?.time}ms`);
    } catch (e) {
        console.log(`[✗] Execution failed: ${e.response?.data?.error || e.message}`);
    }

    // ── SUMMARY ──
    console.log('\n══════════════════════════════════════');
    console.log(`Questions: ${qs.length} (${qIssues} with issues)`);
    console.log(`Teams: ${teams}`);
    console.log(`Submissions: ${subs}`);
    console.log(`Points clean: ${teamsWithPoints === 0 ? 'YES' : 'NO - ' + teamsWithPoints + ' teams have points'}`);
    console.log('══════════════════════════════════════');
}

verify().catch(err => { console.error('VERIFY ERROR:', err); process.exit(1); });
