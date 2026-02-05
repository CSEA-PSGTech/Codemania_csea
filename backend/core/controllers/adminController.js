const Question = require("../models/Question");
const Team = require("../models/Team");
const Submission = require("../models/Submission");

// ==================== QUESTION MANAGEMENT ====================

// @desc    Get all questions (with test cases)
exports.getAllQuestions = async (req, res) => {
  try {
    const questions = await Question.find();
    res.json(questions);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Create a new question
exports.createQuestion = async (req, res) => {
  try {
    const {
      title,
      descriptionWithConstraints,
      nonOptimizedCode,
      nonOptimizedCodeJava,
      totalPoints,
      testcases
    } = req.body;

    const question = new Question({
      title,
      descriptionWithConstraints,
      nonOptimizedCode,
      nonOptimizedCodeJava,
      totalPoints,
      currentPoints: totalPoints, // starts at max
      testcases
    });

    await question.save();

    res.status(201).json({
      message: "Question created successfully!",
      question
    });
  } catch (error) {
    console.error("Create question error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Update a question
exports.updateQuestion = async (req, res) => {
  try {
    const {
      title,
      descriptionWithConstraints,
      nonOptimizedCode,
      nonOptimizedCodeJava,
      totalPoints,
      currentPoints,
      testcases
    } = req.body;

    const question = await Question.findByIdAndUpdate(
      req.params.id,
      {
        title,
        descriptionWithConstraints,
        nonOptimizedCode,
        nonOptimizedCodeJava,
        totalPoints,
        currentPoints,
        testcases
      },
      { new: true }
    );

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    res.json({ message: "Question updated!", question });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Delete a question
exports.deleteQuestion = async (req, res) => {
  try {
    const question = await Question.findByIdAndDelete(req.params.id);

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    // Also delete related submissions
    await Submission.deleteMany({ questionId: req.params.id });

    res.json({ message: "Question deleted!" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ==================== TEAM MANAGEMENT ====================

// @desc    Get all teams
exports.getAllTeams = async (req, res) => {
  try {
    const teams = await Team.find().select("-passwordHash");
    res.json(teams);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Delete a team
exports.deleteTeam = async (req, res) => {
  try {
    const team = await Team.findByIdAndDelete(req.params.id);

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    // Also delete their submissions
    await Submission.deleteMany({ teamId: req.params.id });

    res.json({ message: "Team deleted!" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Reset team's progress
exports.resetTeam = async (req, res) => {
  try {
    const team = await Team.findById(req.params.id);

    if (!team) {
      return res.status(404).json({ message: "Team not found" });
    }

    team.solvedCount = 0;
    team.totalSubmissions = 0;
    team.totalPoints = 0;
    team.round1 = {
      questionsSolved: { q1: false, q2: false, q3: false, q4: false, q5: false },
      solvedCount: 0,
      startTime: null,
      endTime: null,
      totalTime: null,
      status: "NOT_STARTED",
      round1Points: 0
    };

    await team.save();
    await Submission.deleteMany({ teamId: req.params.id });

    res.json({ message: "Team progress reset!" });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// ==================== SUBMISSIONS & STATS ====================

// @desc    Get all submissions
exports.getAllSubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find()
      .populate("teamId", "teamName")
      .populate("questionId", "title")
      .sort({ submissionTime: -1 });

    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get event statistics
exports.getStats = async (req, res) => {
  try {
    const totalTeams = await Team.countDocuments();
    const totalQuestions = await Question.countDocuments();
    const totalSubmissions = await Submission.countDocuments();
    const acceptedSubmissions = await Submission.countDocuments({ status: "AC" });

    const teamsCompleted = await Team.countDocuments({
      "round1.status": "COMPLETED"
    });

    res.json({
      totalTeams,
      totalQuestions,
      totalSubmissions,
      acceptedSubmissions,
      acceptanceRate: totalSubmissions > 0
        ? ((acceptedSubmissions / totalSubmissions) * 100).toFixed(2) + "%"
        : "0%",
      teamsCompletedRound1: teamsCompleted
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
