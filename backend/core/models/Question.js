const mongoose = require("mongoose");

const TestCaseSchema = new mongoose.Schema(
  {
    input: String,
    output: String,
    hidden: { type: Boolean, default: true }
  },
  { _id: false }
);

const QuestionSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    tag: { type: String, enum: ['Easy', 'Medium', 'Hard'], default: 'Medium' },
    description: { type: String, required: true },
    constraints: { type: String, default: '' },
    nonOptimizedCode: { type: String, required: true },
    nonOptimizedCodeJava: { type: String, default: '' },

    totalPoints: { type: Number, required: true },
    currentPoints: { type: Number, required: true },
    noOfTeamsSolved: { type: Number, default: 0 },

    timeLimit: { type: Number, default: 1000 }, // ms
    memoryLimit: { type: Number, default: 256 }, // MB
    maxInputN: { type: Number, default: null },

    testcases: [TestCaseSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model("Question", QuestionSchema);
