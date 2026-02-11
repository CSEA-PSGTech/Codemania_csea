import java.io.*;
import java.lang.reflect.Method;
import java.net.URL;
import java.net.URLClassLoader;

/**
 * Persistent JVM worker for CodeMania execution server.
 * Stays alive between submissions to eliminate JVM cold-start overhead (~3-5s
 * per spawn on Windows).
 * 
 * Protocol (line-based over stdin/stdout):
 * Startup: -> READY
 * Command: EXEC\n
 * <dir>
 * \n<className>\n<numTests>\n<timeLimitMs>
 * Per test: -> OK <ms> (output written to output_<i>.txt)
 * -> TLE <ms> (time limit exceeded — worker will exit for cleanup)
 * -> RE <ms> <message>
 * After: -> DONE
 * Shutdown: EXIT
 */
public class JvmWorker {
    private static final PrintStream STDOUT = System.out;
    private static final PrintStream STDERR = System.err;
    private static volatile boolean needsRecycle = false;

    public static void main(String[] args) {
        try {
            BufferedReader reader = new BufferedReader(new InputStreamReader(System.in));
            STDOUT.println("READY");
            STDOUT.flush();

            String line;
            while ((line = reader.readLine()) != null) {
                line = line.trim();
                if ("EXIT".equals(line))
                    break;
                if ("EXEC".equals(line)) {
                    String dir = reader.readLine().trim();
                    String className = reader.readLine().trim();
                    int numTests = Integer.parseInt(reader.readLine().trim());
                    int timeLimit = Integer.parseInt(reader.readLine().trim());
                    handleExec(dir, className, numTests, timeLimit);
                    if (needsRecycle)
                        break; // exit so Node.js can respawn a clean worker
                }
            }
        } catch (Exception e) {
            STDOUT.println("FATAL " + safe(e.getMessage()));
            STDOUT.flush();
        }
    }

    private static void handleExec(String dir, String className, int numTests, int timeLimit) {
        try {
            for (int i = 0; i < numTests; i++) {
                // Fresh classloader per test so static fields are reset
                URL[] urls = { new File(dir).toURI().toURL() };
                URLClassLoader cl = new URLClassLoader(urls, JvmWorker.class.getClassLoader());
                Class<?> cls = cl.loadClass(className);
                Method m = cls.getMethod("main", String[].class);
                m.setAccessible(true);

                boolean ok = execTest(m, dir, i, timeLimit);
                try {
                    cl.close();
                } catch (Exception ignored) {
                }

                if (!ok) {
                    // TLE — output TLE for remaining tests, then exit for cleanup
                    for (int j = i + 1; j < numTests; j++) {
                        STDOUT.println("TLE 0");
                    }
                    needsRecycle = true;
                    break;
                }
            }
            STDOUT.println("DONE");
        } catch (ClassNotFoundException e) {
            STDOUT.println("FATAL Class not found: " + className);
        } catch (NoSuchMethodException e) {
            STDOUT.println("FATAL No main method in: " + className);
        } catch (Exception e) {
            STDOUT.println("FATAL " + safe(e.getMessage()));
        }
        STDOUT.flush();
    }

    /**
     * Run a single test case. Returns true if the worker can continue (OK or RE),
     * false if it needs recycling (TLE — zombie thread may linger).
     */
    private static boolean execTest(Method m, String dir, int idx, int limit) {
        long t0 = System.currentTimeMillis();
        FileInputStream fis = null;
        try {
            // Redirect stdin from input file
            fis = new FileInputStream(dir + File.separator + "input_" + idx + ".txt");
            System.setIn(fis);

            // Capture stdout
            ByteArrayOutputStream captured = new ByteArrayOutputStream();
            System.setOut(new PrintStream(captured));
            System.setErr(new PrintStream(new ByteArrayOutputStream()));

            // Run user code in a thread with timeout
            final Throwable[] error = { null };
            Thread t = new Thread(() -> {
                try {
                    m.invoke(null, (Object) new String[] {});
                } catch (Throwable e) {
                    error[0] = e.getCause() != null ? e.getCause() : e;
                }
            });
            t.setDaemon(true);
            t.start();
            t.join(limit + 200); // small scheduling buffer

            long elapsed = System.currentTimeMillis() - t0;
            System.setOut(STDOUT);
            System.setErr(STDERR);

            if (t.isAlive()) {
                t.interrupt();
                STDOUT.println("TLE " + elapsed);
                STDOUT.flush();
                return false; // needs recycle — zombie thread may keep running
            }

            if (error[0] != null) {
                STDOUT.println("RE " + elapsed + " " + safe(error[0].toString()));
                STDOUT.flush();
                return true; // RE is clean, can continue
            }

            // Write captured output to file
            captured.flush();
            try (FileOutputStream fos = new FileOutputStream(dir + File.separator + "output_" + idx + ".txt")) {
                fos.write(captured.toByteArray());
            }
            STDOUT.println("OK " + elapsed);
            STDOUT.flush();
            return true;

        } catch (Exception e) {
            long elapsed = System.currentTimeMillis() - t0;
            System.setOut(STDOUT);
            System.setErr(STDERR);
            STDOUT.println("RE " + elapsed + " " + safe(e.getMessage()));
            STDOUT.flush();
            return true;
        } finally {
            if (fis != null) {
                try {
                    fis.close();
                } catch (Exception ignored) {
                }
            }
        }
    }

    private static String safe(String s) {
        if (s == null)
            return "Unknown error";
        return s.replace("\n", " ").replace("\r", "");
    }
}
