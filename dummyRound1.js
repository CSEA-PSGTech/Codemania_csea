const mongoose = require("mongoose");
const Team = require("./models/Team");
const sortRound1Leaderboard = require("./utils/round1Leaderboard");

// 🔹 connect to MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/codemania_dummy");

async function runDummy() {
  console.log("🔁 Clearing old data...");
  await Team.deleteMany({});

  console.log("👥 Creating dummy teams...");

  const teams = [];
  for (let i = 1; i <= 10; i++) {
    const team = await Team.create({
      teamName: `Team_${i}`,
      participant1Roll: `ROLL${i}`,
      collegeName: "PSG Tech",
      email: `team${i}@test.com`,
      passwordHash: "dummyhash",
      yearOfStudy: 2
    });

    teams.push(team);
  }

  console.log("⏱ Simulating Round 1 progress...");

  // simulate completion in different order
  for (let i = 0; i < teams.length; i++) {
    const team = teams[i];

    team.round1.startTime = new Date();
    team.round1.status = "IN_PROGRESS";

    // simulate solving all 5
    team.round1.questionsSolved = {
      q1: true,
      q2: true,
      q3: true,
      q4: true,
      q5: true
    };

    team.round1.solvedCount = 5;

    // delay finish time
    team.round1.endTime = new Date(
      Date.now() + i * 2000 // 2 sec gap
    );

    team.round1.totalTime =
      (team.round1.endTime - team.round1.startTime) / 1000;

    team.round1.status = "COMPLETED";
    await team.save();
  }

  console.log("🏆 Calculating leaderboard...");

  const completedTeams = await Team.find({
    "round1.status": "COMPLETED"
  });

  const sorted = sortRound1Leaderboard(completedTeams);

  const total = sorted.length;

  sorted.forEach((team, index) => {
    team.round1.round1Points = (total - index) * 10;
    team.save();
  });

  console.log("\n🔥 ROUND 1 LEADERBOARD 🔥");
  console.log("--------------------------------");

  sorted.forEach((team, index) => {
    console.log(
      `#${index + 1} ${team.teamName} | Points: ${team.round1.round1Points}`
    );
  });

  mongoose.disconnect();
}

runDummy();
