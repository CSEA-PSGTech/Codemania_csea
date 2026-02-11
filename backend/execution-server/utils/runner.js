const { spawn } = require("child_process");
const fs = require("fs").promises;
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const { pool: jvmPool } = require("./jvmPool");

const PYTHON_PATH = process.env.PYTHON_PATH || "python";
const JAVA_PATH = process.env.JAVA_PATH || "java";
const JAVAC_PATH = process.env.JAVAC_PATH || "javac";
const GCC_PATH = process.env.GCC_PATH || "gcc";

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
    const { filePath, className } = await writeCodeToFile(
      code,
      language,
      tempDir
    );

    // Compile if needed (Java or C)
    if (language === "java") {
      const compileResult = await compileJava(filePath, tempDir);
      if (!compileResult.success) {
        return {
          verdict: "CE",
          error: compileResult.error,
          results: [],
        };
      }
    } else if (language === "c") {
      const compileResult = await compileC(filePath, tempDir);
      if (!compileResult.success) {
        return {
          verdict: "CE",
          error: compileResult.error,
          results: [],
        };
      }
    }

    // ── Run test cases ──
    // For Java: use warm JVM pool (no cold-start), fall back to per-process if pool unavailable
    if (language === "java" && jvmPool.initialized) {
      try {
        return await jvmPool.runTests(tempDir, className, testCases, timeLimit);
      } catch (poolErr) {
        console.warn("[Java] Pool execution failed, falling back to per-process:", poolErr.message);
        // Fall through to per-process execution below
      }
    }

    // Per-process execution (Python, C, or Java fallback)
    const results = [];
    let finalVerdict = "AC";

    // For Java fallback: measure JVM startup overhead to compensate timeouts
    let jvmOverhead = 0;
    if (language === "java") {
      jvmOverhead = await measureJvmStartup(tempDir, className);
      console.log(`[Java fallback] JVM startup overhead: ${jvmOverhead}ms`);
    }

    for (let i = 0; i < testCases.length; i++) {
      const testCase = testCases[i];

      const result = await runTestCase(
        language,
        tempDir,
        className,
        testCase,
        timeLimit,      // original timeLimit — runTestCase adds jvmOverhead internally
        jvmOverhead
      );

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

    // If all passed
    if (finalVerdict === "AC") {
      finalVerdict = "AC";
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
 * Write code to appropriate file based on language
 */
async function writeCodeToFile(code, language, tempDir) {
  let fileName, className;

  if (language === "python") {
    fileName = "solution.py";
    className = null;
  } else if (language === "java") {
    // Extract class name from Java code
    const classMatch = code.match(/public\s+class\s+(\w+)/);
    className = classMatch ? classMatch[1] : "Solution";
    fileName = `${className}.java`;
  } else if (language === "c") {
    fileName = "solution.c";
    className = "solution"; // Executable name
  } else {
    throw new Error(`Unsupported language: ${language}`);
  }

  const filePath = path.join(tempDir, fileName);
  await fs.writeFile(filePath, code, "utf8");

  return { filePath, className };
}

/**
 * Compile Java code
 */
async function compileJava(filePath, tempDir) {
  return new Promise((resolve) => {
    const compile = spawn(JAVAC_PATH, [filePath], {
      cwd: tempDir,
      timeout: 30000, // 30 second compile timeout
    });

    let stderr = "";

    compile.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    compile.on("close", (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({
          success: false,
          error: stderr || "Compilation failed",
        });
      }
    });

    compile.on("error", (err) => {
      resolve({
        success: false,
        error: `Compilation error: ${err.message}`,
      });
    });
  });
}

/**
 * Compile C code using GCC
 */
async function compileC(filePath, tempDir) {
  return new Promise((resolve) => {
    const isWindows = process.platform === "win32";
    const outputName = isWindows ? "solution.exe" : "solution";

    const compile = spawn(GCC_PATH, [filePath, "-o", outputName], {
      cwd: tempDir,
      timeout: 30000, // 30 second compile timeout
    });

    let stderr = "";

    compile.stderr.on("data", (data) => {
      stderr += data.toString();
    });

    compile.on("close", (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        resolve({
          success: false,
          error: stderr || "Compilation failed",
        });
      }
    });

    compile.on("error", (err) => {
      resolve({
        success: false,
        error: `Compilation error: ${err.message}`,
      });
    });
  });
}

/**
 * Measure JVM startup time by running a trivial program.
 * This runs once per submission, the result is used to offset timeouts for all test cases.
 */
async function measureJvmStartup(tempDir, className) {
  const markerFile = path.join(tempDir, "JvmProbe.java");
  await fs.writeFile(markerFile, 'public class JvmProbe { public static void main(String[] a) { System.out.println("OK"); } }', "utf8");
  
  const compileResult = await compileJava(markerFile, tempDir);
  if (!compileResult.success) return 3000; // default estimate

  return new Promise((resolve) => {
    const start = Date.now();
    const proc = spawn(JAVA_PATH, ["JvmProbe"], { cwd: tempDir, timeout: 15000 });
    let got = "";
    proc.stdout.on("data", d => { got += d.toString(); });
    proc.on("close", () => {
      const elapsed = Date.now() - start;
      // If probe worked, use measured time; otherwise estimate
      resolve(got.trim() === "OK" ? elapsed : 3000);
    });
    proc.on("error", () => resolve(3000));
    proc.stdin.end();
  });
}

/**
 * Run code against a single test case
 */
async function runTestCase(language, tempDir, className, testCase, timeLimit, jvmOverhead = 0) {
  // For Java, give the process extra time to account for JVM cold start
  const effectiveTimeout = language === "java" ? timeLimit + jvmOverhead + 1000 : timeLimit;

  return new Promise((resolve) => {
    const startTime = Date.now();
    let processRef;

    // Build command based on language
    if (language === "python") {
      processRef = spawn(PYTHON_PATH, ["solution.py"], {
        cwd: tempDir,
        timeout: effectiveTimeout,
      });
    } else if (language === "java") {
      processRef = spawn(JAVA_PATH, [className], {
        cwd: tempDir,
        timeout: effectiveTimeout,
      });
    } else if (language === "c") {
      const isWindows = process.platform === "win32";
      const execName = isWindows ? "solution.exe" : "./solution";
      processRef = spawn(execName, [], {
        cwd: tempDir,
        timeout: effectiveTimeout,
        shell: isWindows,
      });
    }

    let stdout = "";
    let stderr = "";
    let killed = false;

    // Manual backup timeout
    const timeoutId = setTimeout(() => {
      killed = true;
      try { processRef.kill("SIGKILL"); } catch (e) {}
    }, effectiveTimeout + 500);

    // Send input to stdin
    if (testCase.input) {
      processRef.stdin.write(testCase.input);
    }
    processRef.stdin.end();

    processRef.stdout.on("data", (data) => { stdout += data.toString(); });
    processRef.stderr.on("data", (data) => { stderr += data.toString(); });

    processRef.on("close", (code, signal) => {
      clearTimeout(timeoutId);
      const wallTime = Date.now() - startTime;
      // For Java: subtract JVM startup overhead to get the actual code execution time
      const codeTime = language === "java" ? Math.max(0, wallTime - jvmOverhead) : wallTime;

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
    .join("\n");
}

module.exports = { runCode };
