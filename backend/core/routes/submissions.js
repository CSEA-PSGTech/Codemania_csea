const express = require("express");
const router = express.Router();
const submissionController = require("../controllers/submissionController");
const { verifyToken } = require("../middleware/auth");

// @route   POST /api/submissions/run - Run code without saving (for testing)
router.post("/run", verifyToken, submissionController.runCode);

// @route   GET /api/submissions/solved - Get list of solved question IDs
router.get("/solved", verifyToken, submissionController.getSolvedQuestions);

// @route   POST /api/submissions
router.post("/", verifyToken, submissionController.submitCode);

// @route   GET /api/submissions/my
router.get("/my", verifyToken, submissionController.getMySubmissions);

// @route   GET /api/submissions/my/:questionId
router.get("/my/:questionId", verifyToken, submissionController.getMySubmissionsByQuestion);

module.exports = router;
