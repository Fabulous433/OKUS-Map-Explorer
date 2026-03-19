import assert from "node:assert/strict";
import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const testPort = 5012;
const testBaseUrl = `http://127.0.0.1:${testPort}`;

function runCommand(command: string, args: string[], label: string) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(process.env.ComSpec ?? "cmd.exe", ["/c", command, ...args], {
      cwd: process.cwd(),
      env: process.env,
      stdio: "pipe",
    });

    let stderr = "";

    child.stdout.on("data", (chunk) => {
      process.stdout.write(chunk);
    });

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
      process.stderr.write(chunk);
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${label} failed with exit code ${code}\n${stderr}`));
    });
  });
}

async function waitForServer(url: string, timeoutMs: number) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.status >= 200) {
        return;
      }
    } catch {
      // server not ready yet
    }

    await delay(500);
  }

  throw new Error(`server did not become ready within ${timeoutMs}ms`);
}

function startProductionServer() {
  return spawn("node", ["dist/index.cjs"], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NODE_ENV: "production",
      PORT: String(testPort),
      ENABLE_STARTUP_SEED: "false",
    },
    stdio: "pipe",
  });
}

async function stopProcess(child: ChildProcessWithoutNullStreams) {
  if (child.exitCode !== null || child.killed) {
    return;
  }

  child.kill("SIGTERM");

  await Promise.race([
    new Promise<void>((resolve) => {
      child.once("exit", () => resolve());
    }),
    delay(5_000),
  ]);

  if (child.exitCode === null && !child.killed) {
    child.kill("SIGKILL");
  }
}

async function run() {
  await runCommand("npm", ["run", "build"], "npm run build");

  const server = startProductionServer();
  let stderr = "";

  server.stdout.on("data", (chunk) => {
    process.stdout.write(chunk);
  });

  server.stderr.on("data", (chunk) => {
    stderr += String(chunk);
    process.stderr.write(chunk);
  });

  try {
    await waitForServer(`${testBaseUrl}/api/region-boundaries/active/kabupaten`, 30_000);

    const response = await fetch(`${testBaseUrl}/api/region-boundaries/active/kabupaten`);
    const body = await response.json();

    assert.equal(
      response.status,
      200,
      `production bundle boundary route must stay healthy, got ${response.status}: ${JSON.stringify(body)}`,
    );
    assert.equal(body.regionKey, "okus");
    assert.equal(body.level, "kabupaten");
    assert.equal(body.boundary.type, "FeatureCollection");
    assert.ok(Array.isArray(body.boundary.features));
    assert.ok(body.boundary.features.length > 0);
  } finally {
    await stopProcess(server);
  }

  assert.equal(stderr.includes("Internal Server Error"), false, "production server must not log region boundary errors");
}

run()
  .then(() => {
    console.log("[integration] region-boundary-production-bundle: PASS");
  })
  .catch((error) => {
    console.error("[integration] region-boundary-production-bundle: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
