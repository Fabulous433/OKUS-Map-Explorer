import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";

import { createIntegrationServer } from "./_helpers";

type ProcessResult = {
  code: number;
  stdout: string;
  stderr: string;
};

function runProcess(
  command: string,
  args: string[],
  options?: {
    cwd?: string;
    env?: NodeJS.ProcessEnv;
    timeoutMs?: number;
  },
) {
  return new Promise<ProcessResult>((resolve) => {
    const child = spawn(command, args, {
      cwd: options?.cwd,
      env: options?.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      child.kill();
      resolve({
        code: 124,
        stdout,
        stderr: `${stderr}\nProcess timeout after ${options?.timeoutMs ?? 180_000}ms`,
      });
    }, options?.timeoutMs ?? 180_000);

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("close", (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve({
        code: code ?? 1,
        stdout,
        stderr,
      });
    });
  });
}

function parseJsonOutput(stdout: string) {
  const start = stdout.indexOf("{");
  if (start < 0) {
    throw new Error(`Cannot parse JSON output. stdout=${stdout}`);
  }
  return JSON.parse(stdout.slice(start)) as Record<string, unknown>;
}

async function run() {
  const server = await createIntegrationServer();
  const workspaceDir = path.resolve(".");
  const runId = Date.now();
  const outputRoot = path.join("reports", `integration-post-launch-${runId}`);
  const npmExecPath = process.env.npm_execpath;
  assert.equal(typeof npmExecPath, "string");
  assert.ok(npmExecPath.length > 0, "npm_execpath wajib tersedia");

  try {
    const result = await runProcess(
      process.execPath,
      [
        npmExecPath,
        "exec",
        "--",
        "tsx",
        "script/ops-post-launch-snapshot.ts",
        "--base-url",
        server.baseUrl,
        "--username",
        "admin",
        "--password",
        "admin123",
        "--output-root",
        outputRoot,
        "--generated-by",
        "integration-test",
        "--timeout-ms",
        "30000",
      ],
      {
        cwd: workspaceDir,
        env: process.env,
        timeoutMs: 240_000,
      },
    );

    assert.equal(result.code, 0, `Post-launch snapshot gagal: ${result.stderr}`);
    const output = parseJsonOutput(result.stdout);
    assert.equal(String(output.status), "ok");

    const outputFile = String(output.outputFile ?? "");
    assert.ok(outputFile.endsWith(".json"), "Output post-launch harus file JSON");

    const fileContent = await readFile(outputFile, "utf8");
    const snapshot = JSON.parse(fileContent) as Record<string, unknown>;
    const summary = (snapshot.summary ?? {}) as Record<string, unknown>;
    assert.equal(String(summary.status), "healthy");
    assert.ok(Number(summary.totalChecks ?? 0) >= 6, "Snapshot harus memuat minimal 6 endpoint check");
  } finally {
    await server.close();
  }
}

run()
  .then(() => {
    console.log("[integration] ops post-launch snapshot baseline: PASS");
  })
  .catch((error) => {
    console.error("[integration] ops post-launch snapshot baseline: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
