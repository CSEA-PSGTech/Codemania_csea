const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });
const express = require("express");
const cors = require("cors");
const { runCode } = require("./utils/runner");

const app = express();
const PORT = process.env.EXECUTION_PORT || 6001;  // Use EXECUTION_PORT, not PORT
const EXECUTION_SECRET = process.env.EXECUTION_SECRET;
const MAX_CODE_SIZE = parseInt(process.env.MAX_CODE_SIZE) || 50000;
const DEFAULT_TIME_LIMIT = parseInt(process.env.DEFAULT_TIME_LIMIT) || 2000;

// ==================== CONCURRENCY LIMITER ====================
// Limits parallel code executions to prevent CPU thrashing
// Extra requests wait in queue instead of all running at once
const MAX_CONCURRENT = parseInt(process.env.MAX_CONCURRENT) || 2;
let activeJobs = 0;
const jobQueue = [];

function enqueue(fn) {
  return new Promise((resolve, reject) => {
    const run = () => {
      activeJobs++;
      fn()
        .then(resolve)
        .catch(reject)
        .finally(() => {
          activeJobs--;
          if (jobQueue.length > 0) {
            const next = jobQueue.shift();
            next();
          }
        });
    };

    if (activeJobs < MAX_CONCURRENT) {
      run();
    } else {
      jobQueue.push(run);
    }
  });
}

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));

/**
 * Middleware to verify requests are from main backend
 */
const verifySecret = (req, res, next) => {
  const secret = req.headers["x-execution-secret"];

  if (!EXECUTION_SECRET) {
    console.warn("WARNING: EXECUTION_SECRET not set. Allowing all requests.");
    return next();
  }

  if (secret !== EXECUTION_SECRET) {
    return res.status(401).json({
      error: "Unauthorized",
      message: "Invalid or missing execution secret",
    });
  }

  next();
};

/**
 * Health check endpoint
 */
app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    port: PORT,
    activeJobs,
    queueLength: jobQueue.length,
    maxConcurrent: MAX_CONCURRENT,

    timestamp: new Date().toISOString(),
  });
});

/**
 * Main execution endpoint
 * Expects: { code, language, testCases, timeLimit }
 */
app.post("/execute", verifySecret, async (req, res) => {
  const startTime = Date.now();

  try {
    const { code, language, testCases, timeLimit, submissionId } = req.body;

    // Validation
    if (!code) {
      return res.status(400).json({ error: "Code is required" });
    }

    if (!language || !["python"].includes(language.toLowerCase())) {
      return res.status(400).json({
        error: "Invalid language. Supported: python",
      });
    }

    if (!testCases || !Array.isArray(testCases) || testCases.length === 0) {
      return res.status(400).json({ error: "Test cases are required" });
    }

    // Code size check
    if (code.length > MAX_CODE_SIZE) {
      return res.status(400).json({
        error: `Code too large. Maximum ${MAX_CODE_SIZE} characters allowed`,
      });
    }

    // Validate test cases format
    for (let i = 0; i < testCases.length; i++) {
      if (testCases[i].expectedOutput === undefined) {
        return res.status(400).json({
          error: `Test case ${i + 1} missing expectedOutput`,
        });
      }
    }

    console.log(
      `[${new Date().toISOString()}] Executing ${language} code - ${testCases.length} test cases | Queue: ${jobQueue.length} | Active: ${activeJobs}/${MAX_CONCURRENT}`
    );

    // Run the code through concurrency limiter
    const result = await enqueue(() =>
      runCode(
        code,
        language.toLowerCase(),
        testCases,
        timeLimit || DEFAULT_TIME_LIMIT
      )
    );

    const totalTime = Date.now() - startTime;

    console.log(
      `[${new Date().toISOString()}] Result: ${result.verdict} - Total time: ${totalTime}ms`
    );

    res.json({
      ...result,
      submissionId,
      serverTime: totalTime,
    });
  } catch (error) {
    console.error("Execution error:", error);
    res.status(500).json({
      verdict: "RE",
      error: error.message,
      serverTime: Date.now() - startTime,
    });
  }
});

/**
 * Test endpoint - run sample code without authentication
 * Only available in development
 */
if (process.env.NODE_ENV !== "production") {
  app.post("/test", async (req, res) => {
    const { code, language, input, expectedOutput, timeLimit } = req.body;

    const testCases = [{ input: input || "", expectedOutput: expectedOutput || "" }];

    try {
      const result = await runCode(
        code,
        language?.toLowerCase() || "python",
        testCases,
        timeLimit || DEFAULT_TIME_LIMIT
      );
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
}

// Start server
(async () => {
  app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║         CodeMania Execution Server                        ║
╠════════════════════════════════════════════════════════════╣
║  Port:        ${PORT}                                         ║
║  Secret:      ${EXECUTION_SECRET ? "Configured ✓" : "NOT SET ⚠️"}                             ║
║  Time Limit:  ${DEFAULT_TIME_LIMIT}ms                                      ║
║  Max Code:    ${MAX_CODE_SIZE} chars                                 ║
║  Concurrency: ${MAX_CONCURRENT} parallel jobs                             ║
╚════════════════════════════════════════════════════════════╝
    `);
  });
})();

// Graceful shutdown
process.on("SIGINT", () => { process.exit(0); });
process.on("SIGTERM", () => { process.exit(0); });
