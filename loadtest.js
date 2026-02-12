/**
 * Load Test: 10 Concurrent Submissions
 * 
 * Registers 10 test teams, fetches a question, and submits
 * optimized Python code for all 10 teams simultaneously.
 * 
 * Usage: node loadtest.js
 */

const axios = require("axios");

const BACKEND_URL = "http://localhost:5000";
const ACCESS_CODE = "CODEMANIA2026";

// Simple Python solution that should work for most code-optimization problems
// We'll pick the actual question and tailor the code after fetching it
const PYTHON_CODE_TEMPLATE = `
# Simple valid Python code
import sys
input_data = sys.stdin.read().strip()
if input_data:
    lines = input_data.split('\\n')
    for line in lines:
        print(line)
else:
    print("")
`.trim();

// ──────────────────────────────────────────────
// 1) Register / Login 10 test teams
// ──────────────────────────────────────────────
async function setupTeams(count) {
  const teams = [];

  for (let i = 1; i <= count; i++) {
    const teamName = `LoadTest_Team_${i}_${Date.now()}`;
    try {
      // Register
      const regRes = await axios.post(`${BACKEND_URL}/api/auth/register`, {
        teamName,
        collegeName: `TestCollege_${i}`,
        user1Name: `User1_${i}`,
        user2Name: `User2_${i}`,
        user1Mobile: `90000000${String(i).padStart(2, "0")}`,
        user2Mobile: `80000000${String(i).padStart(2, "0")}`
      });

      teams.push({
        name: teamName,
        token: regRes.data.token,
        id: regRes.data.team.id
      });
      console.log(`  ✅ Registered: ${teamName}`);
    } catch (err) {
      console.error(`  ❌ Failed to register ${teamName}:`, err.response?.data?.message || err.message);
    }
  }

  return teams;
}

// ──────────────────────────────────────────────
// 2) Fetch all questions
// ──────────────────────────────────────────────
async function getQuestions(token) {
  const res = await axios.get(`${BACKEND_URL}/api/questions`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data;
}

// ──────────────────────────────────────────────
// 3) Submit code for a single team
// ──────────────────────────────────────────────
async function submitCode(team, questionId, code, language) {
  const start = Date.now();
  try {
    const res = await axios.post(
      `${BACKEND_URL}/api/submissions`,
      { questionId, code, language },
      {
        headers: { Authorization: `Bearer ${team.token}` },
        timeout: 120000
      }
    );
    const elapsed = Date.now() - start;
    return {
      team: team.name,
      status: res.data.submission?.status || "unknown",
      passed: res.data.submission?.passedTestCases,
      total: res.data.submission?.totalTestCases,
      time: elapsed,
      execTime: res.data.submission?.executionTime,
      message: res.data.message,
      error: null
    };
  } catch (err) {
    const elapsed = Date.now() - start;
    return {
      team: team.name,
      status: "ERROR",
      passed: 0,
      total: 0,
      time: elapsed,
      execTime: 0,
      message: err.response?.data?.message || err.message,
      error: err.response?.status || err.code
    };
  }
}

// ──────────────────────────────────────────────
// 4) Main: Run load test
// ──────────────────────────────────────────────
async function main() {
  const TEAM_COUNT = 10;

  console.log("╔══════════════════════════════════════════════╗");
  console.log("║   CODEMANIA LOAD TEST — 10 SIMULTANEOUS      ║");
  console.log("╚══════════════════════════════════════════════╝\n");

  // Step 1: Register teams
  console.log(`📝 Registering ${TEAM_COUNT} test teams...`);
  const teams = await setupTeams(TEAM_COUNT);

  if (teams.length === 0) {
    console.error("No teams registered. Aborting.");
    process.exit(1);
  }

  console.log(`\n✅ ${teams.length} teams ready.\n`);

  // Step 2: Fetch questions
  console.log("📋 Fetching questions...");
  const questions = await getQuestions(teams[0].token);

  if (!questions || questions.length === 0) {
    console.error("No questions found. Add questions via admin dashboard first.");
    process.exit(1);
  }

  console.log(`   Found ${questions.length} question(s):`);
  questions.forEach((q, i) => {
    console.log(`   ${i + 1}. [${q.tag}] ${q.title} (${q.currentPoints} pts)`);
  });

  // Use the non-optimized Python code from the first question as the submission
  // This way the code actually compiles and runs, even if it doesn't pass all test cases
  const targetQuestion = questions[0];
  const code = targetQuestion.nonOptimizedCode || PYTHON_CODE_TEMPLATE;
  const language = "python";

  console.log(`\n🎯 Target: "${targetQuestion.title}" (ID: ${targetQuestion._id})`);
  console.log(`📝 Submitting ${language} code (${code.length} chars) for all ${teams.length} teams...`);
  console.log(`\n⏱️  Firing all ${teams.length} submissions NOW...\n`);

  const overallStart = Date.now();

  // Step 3: Fire ALL submissions in parallel
  const promises = teams.map((team) =>
    submitCode(team, targetQuestion._id, code, language)
  );

  const results = await Promise.all(promises);
  const overallElapsed = Date.now() - overallStart;

  // Step 4: Print results
  console.log("┌─────────────────────────────────────────────────────────────────────────┐");
  console.log("│                          RESULTS                                        │");
  console.log("├──────────────────────────┬────────┬────────┬──────────┬─────────┬────────┤");
  console.log("│ Team                     │ Status │ Passed │ RespTime │ ExecMs  │ Error  │");
  console.log("├──────────────────────────┼────────┼────────┼──────────┼─────────┼────────┤");

  let successCount = 0;
  let errorCount = 0;
  let totalRespTime = 0;

  results.forEach((r) => {
    const teamShort = r.team.substring(0, 24).padEnd(24);
    const status = (r.status || "???").padEnd(6);
    const passed = `${r.passed}/${r.total}`.padEnd(6);
    const respTime = `${r.time}ms`.padEnd(8);
    const execTime = `${r.execTime || 0}ms`.padEnd(7);
    const error = (r.error || "—").toString().padEnd(6);

    console.log(`│ ${teamShort} │ ${status} │ ${passed} │ ${respTime} │ ${execTime} │ ${error} │`);

    totalRespTime += r.time;
    if (r.status !== "ERROR") successCount++;
    else errorCount++;
  });

  console.log("└──────────────────────────┴────────┴────────┴──────────┴─────────┴────────┘");

  // Summary
  console.log(`\n📊 SUMMARY:`);
  console.log(`   Total time (wall clock):  ${overallElapsed}ms`);
  console.log(`   Avg response time:        ${Math.round(totalRespTime / results.length)}ms`);
  console.log(`   Min response time:        ${Math.min(...results.map(r => r.time))}ms`);
  console.log(`   Max response time:        ${Math.max(...results.map(r => r.time))}ms`);
  console.log(`   Successful:               ${successCount}/${results.length}`);
  console.log(`   Errors:                   ${errorCount}/${results.length}`);
  console.log(`   Throughput:               ${(results.length / (overallElapsed / 1000)).toFixed(2)} submissions/sec`);

  if (errorCount > 0) {
    console.log(`\n⚠️  ${errorCount} submissions failed. Check execution server logs.`);
  } else {
    console.log(`\n🎉 All ${successCount} submissions completed successfully!`);
  }

  // Cleanup: list the test team names for easy manual deletion
  console.log(`\n🧹 Test teams created (delete via admin if needed):`);
  teams.forEach(t => console.log(`   - ${t.name}`));
}

main().catch((err) => {
  console.error("Load test crashed:", err.message);
  process.exit(1);
});
