/**
 * JVM Worker Pool — keeps warm JVM processes alive to eliminate cold-start overhead.
 * Each worker runs JvmWorker.java which loads user classes via URLClassLoader.
 *
 * Lifecycle:
 *   init()     → compile JvmWorker.java, spawn N worker JVMs, wait for READY
 *   runTests() → acquire worker, send EXEC command, read results, release worker
 *   shutdown() → send EXIT to all workers
 *
 * If a worker dies (TLE zombie cleanup, OOM, etc.) it is auto-respawned.
 */

const { spawn } = require("child_process");
const readline = require("readline");
const path = require("path");
const fs = require("fs").promises;

const JAVA_PATH  = process.env.JAVA_PATH  || "java";
const JAVAC_PATH = process.env.JAVAC_PATH || "javac";
const WORKER_DIR = path.join(__dirname, "..", "jvm-worker");
const POOL_SIZE  = parseInt(process.env.JVM_POOL_SIZE) || 2;

class JvmPool {
  constructor() {
    this.workers = [];
    this.available = [];
    this.waitQueue = [];
    this.initialized = false;
  }

  /* ───────── Initialization ───────── */

  async init() {
    try {
      console.log("[JVM Pool] Compiling JvmWorker...");
      await this._compileWorker();

      console.log(`[JVM Pool] Spawning ${POOL_SIZE} warm JVM workers...`);
      for (let i = 0; i < POOL_SIZE; i++) {
        const w = await this._spawnWorker(i);
        this.workers.push(w);
        this.available.push(w);
      }

      this.initialized = true;
      console.log(`[JVM Pool] ✓ Ready — ${POOL_SIZE} warm workers`);
    } catch (err) {
      console.error("[JVM Pool] Init failed, Java will fall back to per-process execution:", err.message);
      this.initialized = false;
    }
  }

  _compileWorker() {
    return new Promise((resolve, reject) => {
      const proc = spawn(JAVAC_PATH, [path.join(WORKER_DIR, "JvmWorker.java")], {
        cwd: WORKER_DIR,
        timeout: 30000,
      });
      let stderr = "";
      proc.stderr.on("data", (d) => (stderr += d.toString()));
      proc.on("close", (code) => (code === 0 ? resolve() : reject(new Error(stderr))));
      proc.on("error", reject);
    });
  }

  async _spawnWorker(id) {
    const proc = spawn(JAVA_PATH, ["-cp", WORKER_DIR, "JvmWorker"], {
      stdio: ["pipe", "pipe", "pipe"],
    });

    const rl = readline.createInterface({ input: proc.stdout });
    const worker = { id, proc, rl, alive: true, busy: false };

    // Wait for READY signal
    const readyLine = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Worker startup timeout")), 15000);
      rl.once("line", (line) => { clearTimeout(timer); resolve(line.trim()); });
      proc.on("error", (err) => { clearTimeout(timer); reject(err); });
    });

    if (readyLine !== "READY") {
      throw new Error(`Worker ${id}: expected READY, got "${readyLine}"`);
    }

    // Auto-respawn on death
    proc.on("close", () => {
      worker.alive = false;
      console.log(`[JVM Pool] Worker ${id} exited, respawning...`);
      this._handleDeath(worker);
    });

    // Swallow stderr
    proc.stderr.on("data", () => {});

    return worker;
  }

  async _handleDeath(dead) {
    const idx = this.workers.indexOf(dead);
    if (idx === -1) return;
    this.available = this.available.filter((w) => w !== dead);
    try {
      const fresh = await this._spawnWorker(dead.id);
      this.workers[idx] = fresh;
      this._release(fresh);
      console.log(`[JVM Pool] Worker ${dead.id} respawned ✓`);
    } catch (err) {
      console.error(`[JVM Pool] Respawn failed for worker ${dead.id}:`, err.message);
    }
  }

  /* ───────── Acquire / Release ───────── */

  _acquire() {
    if (this.available.length > 0) {
      const w = this.available.pop();
      w.busy = true;
      return Promise.resolve(w);
    }
    return new Promise((resolve) => this.waitQueue.push(resolve));
  }

  _release(worker) {
    worker.busy = false;
    if (this.waitQueue.length > 0) {
      worker.busy = true;
      this.waitQueue.shift()(worker);
    } else {
      this.available.push(worker);
    }
  }

  /* ───────── Read one line with timeout ───────── */

  _readLine(worker, timeout = 30000) {
    return new Promise((resolve, reject) => {
      if (!worker.alive) return reject(new Error("Worker is dead"));
      const timer = setTimeout(() => reject(new Error("Response timeout")), timeout);
      worker.rl.once("line", (line) => { clearTimeout(timer); resolve(line.trim()); });
    });
  }

  /* ───────── Run Java test cases on a warm worker ───────── */

  /**
   * @param {string}   tempDir    — absolute path to temp dir with compiled .class files
   * @param {string}   className  — Java class name (e.g. "Solution")
   * @param {Object[]} testCases  — [{input, expectedOutput, hidden}]
   * @param {number}   timeLimit  — per-test time limit in ms
   * @returns {Object}  { verdict, results[], totalTestCases, passedTestCases }
   */
  async runTests(tempDir, className, testCases, timeLimit) {
    // Write input files
    await Promise.all(
      testCases.map((tc, i) =>
        fs.writeFile(path.join(tempDir, `input_${i}.txt`), tc.input || "", "utf8")
      )
    );

    const worker = await this._acquire();
    const startAll = Date.now();

    try {
      // Send EXEC command (multi-line protocol)
      worker.proc.stdin.write(`EXEC\n${tempDir}\n${className}\n${testCases.length}\n${timeLimit}\n`);

      // Read per-test responses
      const rawResults = [];
      for (let i = 0; i < testCases.length; i++) {
        const line = await this._readLine(worker, timeLimit + 5000);
        const parsed = this._parseLine(line);
        console.log(`[JVM Pool] Test ${i + 1}: ${line}`);
        rawResults.push(parsed);
      }

      // Read DONE / FATAL
      const doneLine = await this._readLine(worker, 3000);
      console.log(`[JVM Pool] Final: ${doneLine}`);
      if (doneLine.startsWith("FATAL")) {
        throw new Error(doneLine.substring(6));
      }

      // Build final results — compare outputs, stop on first non-AC
      const results = [];
      let finalVerdict = "AC";

      for (let i = 0; i < rawResults.length; i++) {
        const r  = rawResults[i];
        const tc = testCases[i];

        if (r.verdict === "TLE") {
          results.push({ testCase: i + 1, verdict: "TLE", time: r.time, message: "Time Limit Exceeded", hidden: tc.hidden || false });
          finalVerdict = "TLE";
          break;
        }

        if (r.verdict === "RE") {
          results.push({ testCase: i + 1, verdict: "RE", time: r.time, error: r.error, hidden: tc.hidden || false });
          finalVerdict = "RE";
          break;
        }

        // OK — read output file and compare
        let actual = "";
        try {
          actual = await fs.readFile(path.join(tempDir, `output_${i}.txt`), "utf8");
        } catch {
          results.push({ testCase: i + 1, verdict: "RE", time: r.time, error: "Output file missing", hidden: tc.hidden || false });
          finalVerdict = "RE";
          break;
        }

        const actualNorm   = normalizeOutput(actual);
        const expectedNorm = normalizeOutput(tc.expectedOutput);

        if (actualNorm === expectedNorm) {
          results.push({ testCase: i + 1, verdict: "AC", time: r.time, hidden: tc.hidden || false });
        } else {
          results.push({
            testCase: i + 1,
            verdict: "WA",
            time: r.time,
            expected: tc.hidden ? "[Hidden]" : expectedNorm,
            actual:   tc.hidden ? "[Hidden]" : actualNorm,
            hidden: tc.hidden || false,
          });
          finalVerdict = "WA";
          break;
        }
      }

      const totalTime = Date.now() - startAll;
      console.log(`[JVM Pool] ${testCases.length} tests — ${finalVerdict} in ${totalTime}ms`);

      return {
        verdict: finalVerdict,
        results,
        totalTestCases: testCases.length,
        passedTestCases: results.filter((r) => r.verdict === "AC").length,
      };
    } catch (error) {
      console.error("[JVM Pool] Execution error:", error.message);
      // Kill the worker — it will auto-respawn
      if (worker.alive) {
        try { worker.proc.kill(); } catch (e) {}
      }
      throw error; // runner.js will fall back to per-process execution
    } finally {
      if (worker.alive) {
        this._release(worker);
      }
    }
  }

  _parseLine(line) {
    const parts = line.split(" ");
    const verdict = parts[0];
    const time = parseInt(parts[1]) || 0;
    if (verdict === "OK")  return { verdict: "OK",  time };
    if (verdict === "TLE") return { verdict: "TLE", time };
    if (verdict === "RE")  return { verdict: "RE",  time, error: parts.slice(2).join(" ") || "Runtime Error" };
    if (verdict === "FATAL") throw new Error(parts.slice(1).join(" "));
    return { verdict: "RE", time: 0, error: `Unexpected worker output: ${line}` };
  }

  /* ───────── Shutdown ───────── */

  shutdown() {
    console.log("[JVM Pool] Shutting down...");
    for (const w of this.workers) {
      try {
        w.proc.stdin.write("EXIT\n");
        setTimeout(() => { try { if (w.alive) w.proc.kill(); } catch (e) {} }, 2000);
      } catch (e) {}
    }
  }
}

/* ───────── Utility (duplicated here to avoid circular dep) ───────── */

function normalizeOutput(output) {
  if (!output) return "";
  return output.toString().trim().replace(/\r\n/g, "\n").replace(/\r/g, "\n")
    .split("\n").map((l) => l.trim()).join("\n");
}

// Singleton
const pool = new JvmPool();
module.exports = { pool };
