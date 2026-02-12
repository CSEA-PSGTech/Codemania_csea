const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const dotenv = require("dotenv");

// Load .env from backend/core first, then fall back to workspace root.
const localEnvPath = path.join(__dirname, ".env");
const rootEnvPath = path.join(__dirname, "../../.env");

if (dotenv.config({ path: localEnvPath }).error) {
  dotenv.config({ path: rootEnvPath });
}

const app = express();

// Create HTTP server for Socket.io
const server = http.createServer(app);

// Initialize Socket.io with base path
const io = new Server(server, {
  path: "/codemania",
  cors: {
    origin: "*", // In production, set your frontend URL
    methods: ["GET", "POST"]
  }
});

// Make io accessible in routes/controllers
app.set("io", io);

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

app.use("/codemania/api/auth", authRoutes);
app.use("/codemania/api/questions", questionRoutes);
app.use("/codemania/api/submissions", submissionRoutes);
app.use("/codemania/api/leaderboard", leaderboardRoutes);
app.use("/codemania/api/admin", adminRoutes);

// ==================== ROUND STATUS (in-memory toggle) ====================
let round1Active = false;

app.get("/codemania/api/round-status", (req, res) => {
  res.json({ round1Active });
});

// Admin-only toggle
const { verifyAdmin } = require("./middleware/admin");
app.post("/codemania/api/admin/round-status", verifyAdmin, (req, res) => {
  const { active } = req.body;
  round1Active = !!active;
  console.log(`🔔 Round 1 ${round1Active ? "ACTIVATED" : "DEACTIVATED"} by admin`);
  // Notify all connected clients via Socket.io
  const io = app.get("io");
  if (io) io.emit("round-status", { round1Active });
  res.json({ round1Active });
});

app.get("/", (req, res) => {
  res.json({ message: "🚀 CodeMania API is running!" });
});

app.get("/codemania", (req, res) => {
  res.json({ message: "🚀 CodeMania API is running! with /codemania" });
});

// ==================== SOCKET.IO ====================
io.on("connection", (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);

  // Join leaderboard room
  socket.on("join-leaderboard", () => {
    socket.join("leaderboard");
    console.log(`👀 ${socket.id} joined leaderboard room`);
  });

  // Leave leaderboard room
  socket.on("leave-leaderboard", () => {
    socket.leave("leaderboard");
  });

  socket.on("disconnect", () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🔥 Server running on port ${PORT}`);
});