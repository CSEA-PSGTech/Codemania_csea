const Submission = require("../models/Submission");
const Question = require("../models/Question");
const Team = require("../models/Team");
const axios = require("axios");
const { emitLeaderboardUpdate, emitSolveNotification } = require("../utils/socketHandlers");

const EXECUTION_SERVER_URL = process.env.EXECUTION_SERVER_URL || "http://localhost:6001";
const EXECUTION_SECRET = process.env.EXECUTION_SECRET || "codemania-secret-key-2026";

// @desc    Submit code for a question
exports.submitCode = async (req, res) => {
  try {
    const { questionId, code, language } = req.body;
    const teamId = req.teamId;

    // Validate input
    if (!code || !language) {
      return res.status(400).json({ message: "Code and language are required" });
    }

    if (!["python", "java"].includes(language.toLowerCase())) {
      return res.status(400).json({ message: "Supported languages: python, java" });
    }

    // Validate question exists
    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    // Check if team already solved this question
    const alreadySolved = await Submission.findOne({
      teamId,
      questionId,
      isCorrect: true
    });

    if (alreadySolved) {
      return res.status(400).json({ 
        message: "You have already solved this question",
        alreadySolved: true
      });
    }

    // Format test cases for execution server
    const testCases = question.testcases.map((tc) => ({
      input: tc.input || "",
      expectedOutput: tc.output || "",
      hidden: tc.hidden
    }));

    if (testCases.length === 0) {
      return res.status(400).json({ message: "Question has no test cases" });
    }

    // Call execution server
    let execResult;
    try {
      const execResponse = await axios.post(
        `${EXECUTION_SERVER_URL}/execute`,
        {
          code,
          language: language.toLowerCase(),
          testCases,
          timeLimit: question.timeLimit || 2000,
          submissionId: `${teamId}-${questionId}-${Date.now()}`
        },
        {
          headers: { "x-execution-secret": EXECUTION_SECRET },
          timeout: 30000 // 30 second max wait
        }
      );
      execResult = execResponse.data;
    } catch (execError) {
      console.error("Execution server error:", execError.message);
      return res.status(503).json({ 
        message: "Code execution service unavailable",
        error: execError.response?.data?.error || execError.message
      });
    }

    const status = execResult.verdict;

    // Create submission
    const submission = new Submission({
      teamId,
      questionId,
      code,
      language: language.toLowerCase(),
      status,
      isCorrect: status === "AC",
      executionTime: execResult.results?.[0]?.time || 0,
      passedTestCases: execResult.passedTestCases || 0,
      totalTestCases: execResult.totalTestCases || testCases.length
    });

    await submission.save();

    // Update team stats
    const team = await Team.findById(teamId);
    team.totalSubmissions += 1;

    let pointsAwarded = 0;
    let shouldUpdateLeaderboard = false;

    // If correct answer
    if (status === "AC") {
      // Check if already solved this question
      const previousCorrect = await Submission.findOne({
        teamId,
        questionId,
        isCorrect: true,
        _id: { $ne: submission._id }
      });

      if (!previousCorrect) {
        // First time solving - award points
        team.solvedCount += 1;
        pointsAwarded = question.currentPoints;
        team.totalPoints += pointsAwarded;
        shouldUpdateLeaderboard = true;

        // Update question stats
        question.noOfTeamsSolved += 1;
        // Decay points (reduce by 10% for each solve, min 50% of total)
        question.currentPoints = Math.max(
          Math.floor(question.totalPoints * 0.5),
          Math.floor(question.currentPoints * 0.9)
        );
        await question.save();
      }
    }

    await team.save();

    // 🔥 Emit socket events if leaderboard changed
    if (shouldUpdateLeaderboard) {
      const io = req.app.get("io");
      
      // Emit solve notification
      emitSolveNotification(io, {
        teamName: team.teamName,
        questionTitle: question.title,
        pointsAwarded
      });
      
      // Emit updated leaderboard
      await emitLeaderboardUpdate(io);
    }

    // Return submission result
    res.status(201).json({
      message: status === "AC" ? "✅ Accepted!" : `❌ ${status}`,
      submission: {
        id: submission._id,
        status: submission.status,
        isCorrect: submission.isCorrect,
        submissionTime: submission.submissionTime,
        pointsAwarded,
        executionTime: submission.executionTime,
        passedTestCases: submission.passedTestCases,
        totalTestCases: submission.totalTestCases
      },
      // Show test case results (hide details for hidden test cases)
      testResults: execResult.results?.map((r, i) => ({
        testCase: r.testCase,
        verdict: r.verdict,
        time: r.time,
        ...(r.hidden ? {} : { expected: r.expected, actual: r.actual })
      }))
    });
  } catch (error) {
    console.error("Submission error:", error);
    res.status(500).json({ message: "Server error during submission" });
  }
};

// @desc    Get current team's submissions
exports.getMySubmissions = async (req, res) => {
  try {
    const submissions = await Submission.find({ teamId: req.teamId })
      .populate("questionId", "title")
      .sort({ submissionTime: -1 });

    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get team's submissions for a specific question
exports.getMySubmissionsByQuestion = async (req, res) => {
  try {
    const submissions = await Submission.find({
      teamId: req.teamId,
      questionId: req.params.questionId
    }).sort({ submissionTime: -1 });

    res.json(submissions);
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Run code without saving submission (for testing)
exports.runCode = async (req, res) => {
  try {
    const { code, language, testCases, timeLimit } = req.body;

    // Validate input
    if (!code || !language) {
      return res.status(400).json({ message: "Code and language are required" });
    }

    if (!["python", "java"].includes(language.toLowerCase())) {
      return res.status(400).json({ message: "Supported languages: python, java" });
    }

    if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
      return res.status(400).json({ message: "Test cases are required" });
    }

    // Call execution server with secret
    try {
      const execResponse = await axios.post(
        `${EXECUTION_SERVER_URL}/execute`,
        {
          code,
          language: language.toLowerCase(),
          testCases,
          timeLimit: timeLimit || 2000
        },
        {
          headers: { "x-execution-secret": EXECUTION_SECRET },
          timeout: 30000
        }
      );

      res.json(execResponse.data);
    } catch (execError) {
      console.error("Execution server error:", execError.message);
      return res.status(503).json({
        message: "Code execution service unavailable",
        error: execError.response?.data?.error || execError.message
      });
    }
  } catch (error) {
    console.error("Run code error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get list of solved question IDs for current team
exports.getSolvedQuestions = async (req, res) => {
  try {
    const teamId = req.teamId;

    // Find all correct submissions for this team
    const solvedSubmissions = await Submission.find({
      teamId,
      isCorrect: true
    }).select("questionId");

    // Extract unique question IDs
    const solvedQuestionIds = [...new Set(solvedSubmissions.map(s => s.questionId.toString()))];

    res.json({ solvedQuestionIds });
  } catch (error) {
    console.error("Get solved questions error:", error);
    res.status(500).json({ message: "Server error" });
  }
};