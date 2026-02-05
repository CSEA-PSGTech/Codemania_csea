const Question = require("../models/Question");

// @desc    Get all questions (for users - hides test cases)
exports.getAllQuestions = async (req, res) => {
  try {
    const questions = await Question.find().select(
      "title descriptionWithConstraints nonOptimizedCode nonOptimizedCodeJava totalPoints currentPoints noOfTeamsSolved"
    );

    res.json(questions);
  } catch (error) {
    console.error("Error fetching questions:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get single question by ID (for users)
exports.getQuestionById = async (req, res) => {
  try {
    const question = await Question.findById(req.params.id).select(
      "title descriptionWithConstraints nonOptimizedCode nonOptimizedCodeJava totalPoints currentPoints noOfTeamsSolved timeLimit memoryLimit"
    );

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    // Get only visible test cases (not hidden)
    const fullQuestion = await Question.findById(req.params.id);
    const visibleTestCases = (fullQuestion.testcases || []).filter(tc => !tc.hidden);

    res.json({
      ...question.toObject(),
      sampleTestCases: visibleTestCases
    });
  } catch (error) {
    console.error("Error fetching question:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// @desc    Get team's Round 1 progress
exports.getRound1Status = async (req, res) => {
  try {
    const team = req.team;

    res.json({
      status: team.round1.status,
      questionsSolved: team.round1.questionsSolved,
      solvedCount: team.round1.solvedCount,
      startTime: team.round1.startTime,
      endTime: team.round1.endTime,
      totalTime: team.round1.totalTime
    });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
};
