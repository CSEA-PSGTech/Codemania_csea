const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const path = require("path");
const dotenv = require("dotenv");

// Load .env from backend/core first, then fall back to workspace root.
const localEnvPath = path.join(__dirname, ".env");
const rootEnvPath = path.join(__dirname, "../../.env");

if (dotenv.config({ path: localEnvPath }).error) {
  dotenv.config({ path: rootEnvPath });
}

const app = express();

app.use(cors());
app.use(express.json());

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

const authRoutes = require("./routes/auth");
const questionRoutes = require("./routes/questions");
const submissionRoutes = require("./routes/submissions");
const leaderboardRoutes = require("./routes/leaderboard");
const adminRoutes = require("./routes/admin");

app.use("/api/auth", authRoutes);
app.use("/api/questions", questionRoutes);
app.use("/api/submissions", submissionRoutes);
app.use("/api/leaderboard", leaderboardRoutes);
app.use("/api/admin", adminRoutes);

// ==================== ROUND STATUS (in-memory toggle) ====================
let round1Active = false;

app.get("/api/round-status", (req, res) => {
  res.json({ round1Active });
});

// Admin-only toggle
const { verifyAdmin } = require("./middleware/admin");
app.post("/api/admin/round-status", verifyAdmin, (req, res) => {
  const { active } = req.body;
  round1Active = !!active;
  console.log(`🔔 Round 1 ${round1Active ? "ACTIVATED" : "DEACTIVATED"} by admin`);
  res.json({ round1Active });
});

app.get("/", (req, res) => {
  res.json({ message: "🚀 CodeMania API is running!" });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT}`);
});