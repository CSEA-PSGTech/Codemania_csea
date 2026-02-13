const Team = require("../models/Team");
const sortRound1Leaderboard = require("../utils/round1Leaderboard");

// @desc    Get overall leaderboard
exports.getLeaderboard = async (req, res) => {
  try {
    const teams = await Team.find()
      .select("teamName collegeName solvedCount totalPoints totalSubmissions")
      .sort({ totalPoints: -1, solvedCount: -1 });

    const leaderboard = teams.map((team, index) => ({
      rank: index + 1,
      teamName: team.teamName,
      collegeName: team.collegeName,
      solvedCount: team.solvedCount,
      totalPoints: team.totalPoints,
      totalSubmissions: team.totalSubmissions
    }));

    res.json(leaderboard);
  } catch (error) {
    console.error("Leaderboard error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get Round 1 leaderboard (speed-based)
exports.getRound1Leaderboard = async (req, res) => {
  try {
    const teams = await Team.find()
      .select("teamName collegeName round1");

    const sorted = sortRound1Leaderboard(teams);

    const leaderboard = sorted.map((team, index) => ({
      rank: index + 1,
      teamName: team.teamName,
      collegeName: team.collegeName,
      status: team.round1.status,
      solvedCount: team.round1.solvedCount,
      totalTime: team.round1.totalTime,
      round1Points: team.round1.round1Points
    }));

    res.json(leaderboard);
  } catch (error) {
    console.error("Round 1 leaderboard error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get top N teams
exports.getTopTeams = async (req, res) => {
  try {
    const count = parseInt(req.params.count) || 10;

    const teams = await Team.find()
      .select("teamName collegeName solvedCount totalPoints")
      .sort({ totalPoints: -1, solvedCount: -1 })
      .limit(count);

    const leaderboard = teams.map((team, index) => ({
      rank: index + 1,
      teamName: team.teamName,
      collegeName: team.collegeName,
      solvedCount: team.solvedCount,
      totalPoints: team.totalPoints
    }));

    res.json(leaderboard);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};


