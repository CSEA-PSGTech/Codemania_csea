const { spawn } = require("child_process");
const fs = require("fs").promises;
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const PYTHON_PATH = process.env.PYTHON_PATH || "python";

/**
 * Main function to run code against test cases
 */
async function runCode(code, language, testCases, timeLimit = 2000) {
  const jobId = uuidv4();
  const tempDir = path.join(__dirname, "..", "temp", jobId);

  try {
    // Create temp directory
    await fs.mkdir(tempDir, { recursive: true });

    // Write code to file
    const filePath = path.join(tempDir, "solution.py");
    await fs.writeFile(filePath, code, "utf8");

    // Run test cases
    const results = [];
    let finalVerdict = "AC";

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];
      const result = await runTestCase(tempDir, testCase, timeLimit);

      results.push({
        testCase: i + 1,
        ...result,
        hidden: testCase.hidden || false,
      });

      // Stop on first failure
      if (result.verdict !== "AC") {
        finalVerdict = result.verdict;
        break;
      }
    }

    return {
      verdict: finalVerdict,
      results,
      totalTestCases: testCases.length,
      passedTestCases: results.filter((r) => r.verdict === "AC").length,
    };
  } catch (error) {
    console.error("Execution error:", error);
    return {
      verdict: "RE",
      error: error.message,
      results: [],
    };
  } finally {
    // Cleanup temp directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (cleanupError) {
      console.error("Cleanup error:", cleanupError);
    }
  }
}

/**
 * Run code against a single test case
 */
async function runTestCase(tempDir, testCase, timeLimit) {
  return new Promise((resolve) => {
    const startTime = Date.now();

    const processRef = spawn(PYTHON_PATH, ["solution.py"], {
      cwd: tempDir,
      timeout: timeLimit,
    });

    let stdout = "";
    let stderr = "";
    let killed = false;

    // Manual backup timeout
    const timeoutId = setTimeout(() => {
      killed = true;
      try { processRef.kill("SIGKILL"); } catch (e) { }
    }, timeLimit + 500);

    // Send input to stdin
    if (testCase.input) {
      processRef.stdin.write(testCase.input);
    }
    processRef.stdin.end();

    processRef.stdout.on("data", (data) => { stdout += data.toString(); });
    processRef.stderr.on("data", (data) => { stderr += data.toString(); });

    processRef.on("close", (code, signal) => {
      clearTimeout(timeoutId);
      const codeTime = Date.now() - startTime;

      // Check if killed due to timeout
      if (killed || signal === "SIGKILL" || signal === "SIGTERM") {
        return resolve({
          verdict: "TLE",
          time: timeLimit,
          message: "Time Limit Exceeded",
        });
      }

      // Even if process exited normally, check if code execution exceeded timeLimit
      if (codeTime > timeLimit) {
        return resolve({
          verdict: "TLE",
          time: codeTime,
          message: "Time Limit Exceeded",
        });
      }

      // Runtime error
      if (code !== 0) {
        return resolve({
          verdict: "RE",
          time: codeTime,
          error: stderr || `Process exited with code ${code}`,
        });
      }

      // Compare output
      const actualOutput = normalizeOutput(stdout);
      const expectedOutput = normalizeOutput(testCase.expectedOutput);

      if (actualOutput === expectedOutput) {
        return resolve({
          verdict: "AC",
          time: codeTime,
        });
      } else {
        return resolve({
          verdict: "WA",
          time: codeTime,
          expected: testCase.hidden ? "[Hidden]" : expectedOutput,
          actual: testCase.hidden ? "[Hidden]" : actualOutput,
        });
      }
    });

    processRef.on("error", (err) => {
      clearTimeout(timeoutId);
      resolve({
        verdict: "RE",
        time: Date.now() - startTime,
        error: err.message,
      });
    });
  });
}

/**
 * Normalize output for comparison (trim whitespace, normalize line endings)
 */
function normalizeOutput(output) {
  if (!output) return "";
  return output
    .toString()
    .trim()
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .map((line) => line.replace(/\bTrue\b/g, "true").replace(/\bFalse\b/g, "false"))
    .join("\n");
}

module.exports = { runCode };
