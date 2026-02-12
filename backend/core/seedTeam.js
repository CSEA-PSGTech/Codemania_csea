// Quick script to seed test teams for load testing
// Run: node seedTeam.js

require("dotenv").config({ path: "../../.env" });
const mongoose = require("mongoose");
const Team = require("./models/Team");

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/codemania";

// Generate 40 teams with varying scores
const colleges = [
  "MIT Chennai", "VIT Vellore", "SRM University", "Anna University", 
  "IIT Madras", "NIT Trichy", "PSG Tech", "CEG Chennai",
  "BITS Pilani", "IIIT Hyderabad", "DTU Delhi", "NSIT Delhi",
  "Jadavpur University", "IIT Kharagpur", "NIT Warangal", "RVCE Bangalore",
  "PES University", "BMS College", "RV College", "MSRIT Bangalore"
];

const teamPrefixes = [
  "Alpha", "Beta", "Gamma", "Delta", "Omega", "Sigma", "Theta", "Lambda",
  "Phoenix", "Dragon", "Tiger", "Falcon", "Eagle", "Cobra", "Viper", "Wolf",
  "Cyber", "Quantum", "Stellar", "Cosmic", "Nebula", "Nova", "Astro", "Helix",
  "Binary", "Neural", "Matrix", "Vector", "Scalar", "Tensor", "Crypto", "Logic",
  "Turbo", "Hyper", "Ultra", "Mega", "Giga", "Tera", "Nano", "Pico"
];

const teamSuffixes = [
  "Coders", "Hackers", "Ninjas", "Warriors", "Legends", "Masters", "Pros", "Elites",
  "Squad", "Force", "Team", "Crew", "Gang", "Pack", "Unit", "Corps"
];

const testTeams = [];

for (let i = 0; i < 40; i++) {
  const prefix = teamPrefixes[i % teamPrefixes.length];
  const suffix = teamSuffixes[i % teamSuffixes.length];
  const college = colleges[i % colleges.length];
  
  // Generate varying scores - some high, some medium, some low
  let solvedCount, totalPoints, totalSubmissions;
  
  if (i < 5) {
    // Top performers
    solvedCount = 5 + Math.floor(Math.random() * 3);
    totalPoints = 600 + Math.floor(Math.random() * 400);
    totalSubmissions = solvedCount + Math.floor(Math.random() * 5);
  } else if (i < 15) {
    // Good performers
    solvedCount = 3 + Math.floor(Math.random() * 3);
    totalPoints = 300 + Math.floor(Math.random() * 300);
    totalSubmissions = solvedCount + Math.floor(Math.random() * 4);
  } else if (i < 30) {
    // Average performers
    solvedCount = 1 + Math.floor(Math.random() * 3);
    totalPoints = 100 + Math.floor(Math.random() * 200);
    totalSubmissions = solvedCount + Math.floor(Math.random() * 3);
  } else {
    // New/struggling teams
    solvedCount = Math.floor(Math.random() * 2);
    totalPoints = Math.floor(Math.random() * 100);
    totalSubmissions = Math.floor(Math.random() * 5);
  }

  testTeams.push({
    teamName: `${prefix}${suffix}`,
    collegeName: college,
    user1Name: `Player${i * 2 + 1}`,
    user2Name: `Player${i * 2 + 2}`,
    user1Mobile: `90000${String(10000 + i).padStart(5, '0')}`,
    user2Mobile: `90001${String(10000 + i).padStart(5, '0')}`,
    solvedCount,
    totalPoints,
    totalSubmissions
  });
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const seedTeams = async () => {
  try {
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB");

    // DELETE ALL EXISTING TEAMS
    console.log("\n🗑️  Deleting all existing teams...");
    const deleteResult = await Team.deleteMany({});
    console.log(`   Deleted ${deleteResult.deletedCount} teams\n`);

    console.log("⏳ Adding teams one by one (3 second delay)...\n");

    for (let i = 0; i < testTeams.length; i++) {
      const teamData = testTeams[i];
      const team = new Team(teamData);
      await team.save();
      console.log(`✅ [${i + 1}/${testTeams.length}] Created: ${team.teamName} (${team.totalPoints} pts, ${team.solvedCount} solved)`);
      
      // Wait 3 seconds before adding next team (except for last one)
      if (i < testTeams.length - 1) {
        await sleep(3000);
      }
    }

    console.log(`\n✅ Seeding complete! Created ${testTeams.length} teams`);
    console.log("Use Access Code: CODEMANIA2026 (or your TEAM_ACCESS_CODE env variable)");

    process.exit(0);
  } catch (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
};

seedTeams();
