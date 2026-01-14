const mongoose = require("mongoose");
const Team = require("./models/Team"); // correct path

mongoose.connect("mongodb://127.0.0.1:27017/codemania")
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

async function seed() {
  try {
    await Team.deleteMany({}); // clear old data

    const teams = [
      {
        teamName: "Team Alpha",
        participant1Roll: "R001",
        collegeName: "ABC College",
        email: "alpha@mail.com",
        passwordHash: "pass123",
        yearOfStudy: 2
      },
      {
        teamName: "Team Beta",
        participant1Roll: "R002",
        collegeName: "XYZ College",
        email: "beta@mail.com",
        passwordHash: "pass123",
        yearOfStudy: 3
      },
      {
        teamName: "Team Gamma",
        participant1Roll: "R003",
        collegeName: "PQR College",
        email: "gamma@mail.com",
        passwordHash: "pass123",
        yearOfStudy: 2
      }
    ];

    await Team.insertMany(teams);
    console.log("✅ Teams inserted successfully!");
  } catch(err) {
    console.error("❌ Seeding error:", err);
  } finally {
    mongoose.disconnect();
  }
}

seed();
