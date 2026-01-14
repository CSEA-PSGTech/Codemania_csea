const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const Team = require("./models/Team");

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect("mongodb://127.0.0.1:27017/codemania")
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error(err));

// --- API: Get all teams ---
app.get("/api/admin/teams", async (req, res) => {
  const teams = await Team.find({});
  res.json(teams);
});

// --- API: Mark question solved ---
app.post("/api/admin/solve", async (req, res) => {
  const { teamId, questionIndex } = req.body;
  const team = await Team.findById(teamId);
  if (!team) return res.status(404).send("Team not found");

  const questionKey = `q${questionIndex + 1}`;
  if (!team.round1.questionsSolved[questionKey]) {
    team.round1.questionsSolved[questionKey] = true;
    team.round1.solvedCount += 1;

    if (!team.round1.startTime) team.round1.startTime = new Date();

    if (team.round1.solvedCount === 5) {
      team.round1.status = "COMPLETED";
      team.round1.endTime = new Date();
      team.round1.totalTime = team.round1.endTime - team.round1.startTime;

      // --- Assign descending points based on order of completion ---
      const completedTeams = await Team.find({ "round1.status": "COMPLETED" }).sort({ "round1.endTime": 1 });
      const rank = completedTeams.length; // 1-based rank
      team.round1.round1Points = Math.max(100 - (rank - 1) * 10, 10); // 100, 90, 80 ...
      team.totalPoints += team.round1.round1Points;
    } else {
      team.round1.status = "IN_PROGRESS";
    }

    await team.save();
  }

  res.json({ success: true, team });
});

// --- API: Leaderboard ---
app.get("/api/admin/leaderboard", async (req, res) => {
  const teams = await Team.find({});
  const leaderboard = teams
    .map(t => ({
      _id: t._id,
      name: t.teamName,
      solvedCount: t.round1.solvedCount,
      points: t.round1.round1Points,
      totalTime: t.round1.totalTime
    }))
    .sort((a,b) => {
      if (b.solvedCount !== a.solvedCount) return b.solvedCount - a.solvedCount;
      if (a.totalTime && b.totalTime) return a.totalTime - b.totalTime;
      return b.points - a.points;
    });

  res.json(leaderboard);
});

// --- Serve frontend ---
app.use(express.static(path.join(__dirname, "frontend/admin")));
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "frontend/admin/index.html"));
});

app.listen(5000, () => console.log("🚀 Admin API running on http://localhost:5000"));
