const bcrypt = require("bcryptjs");
const Team = require("../models/Team");
const { generateToken } = require("../middleware/auth");
const { generateAdminToken, ADMIN_USERNAME, ADMIN_PASSWORD } = require("../middleware/admin");

// Common access code for all teams (set in environment or default)
const TEAM_ACCESS_CODE = process.env.TEAM_ACCESS_CODE || "CODEMANIA2026";

// @desc    Register a new team
exports.register = async (req, res) => {
  try {
    const { teamName, collegeName, user1Name, user2Name, user1Mobile, user2Mobile } = req.body;

    // Input validation
    if (!teamName || !collegeName || !user1Name || !user2Name || !user1Mobile || !user2Mobile) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Mobile number validation (10 digits)
    const mobileRegex = /^[0-9]{10}$/;
    if (!mobileRegex.test(user1Mobile)) {
      return res.status(400).json({ message: "Invalid mobile number for User 1 (must be 10 digits)" });
    }
    if (!mobileRegex.test(user2Mobile)) {
      return res.status(400).json({ message: "Invalid mobile number for User 2 (must be 10 digits)" });
    }

    // Check if team already exists
    const existingTeam = await Team.findOne({ teamName });

    if (existingTeam) {
      return res.status(400).json({ message: "Team name already taken" });
    }

    // Create team (no password needed - they use common access code)
    const team = new Team({
      teamName: teamName.trim(),
      collegeName: collegeName.trim(),
      user1Name: user1Name.trim(),
      user2Name: user2Name.trim(),
      user1Mobile: user1Mobile.trim(),
      user2Mobile: user2Mobile.trim()
    });

    await team.save();

    // Generate token
    const token = generateToken(team._id);

    res.status(201).json({
      message: "Team registered successfully!",
      token,
      team: {
        id: team._id,
        teamName: team.teamName,
        collegeName: team.collegeName
      }
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({ message: "Server error during registration" });
  }
};

// @desc    Login team with teamName + common accessCode
exports.login = async (req, res) => {
  try {
    const { teamName, accessCode } = req.body;

    // Input validation
    if (!teamName || !accessCode) {
      return res.status(400).json({ message: "Team name and access code are required" });
    }

    // Check access code
    if (accessCode !== TEAM_ACCESS_CODE) {
      return res.status(400).json({ message: "Invalid access code" });
    }

    // Find team by name (case-insensitive)
    const team = await Team.findOne({ 
      teamName: { $regex: new RegExp(`^${teamName.trim()}$`, 'i') }
    });
    
    if (!team) {
      return res.status(400).json({ message: "Team not found. Please register first." });
    }

    // Generate token
    const token = generateToken(team._id);

    res.json({
      message: "Login successful!",
      token,
      team: {
        id: team._id,
        teamName: team.teamName,
        collegeName: team.collegeName,
        round1Status: team.round1.status
      }
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error during login" });
  }
};

// @desc    Get current team info
exports.getMe = async (req, res) => {
  try {
    const team = await Team.findById(req.teamId).select("-passwordHash");
    res.json(team);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Admin login
exports.adminLogin = (req, res) => {
  const { username, password } = req.body;

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    const token = generateAdminToken();
    res.json({ message: "Admin login successful", token });
  } else {
    res.status(401).json({ message: "Invalid admin credentials" });
  }
};
