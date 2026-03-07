import assert from "node:assert/strict";
import { spawn } from "node:child_process";
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
        "script/ops-smoke-check.ts",
        "--base-url",
        server.baseUrl,
        "--username",
        "admin",
        "--password",
        "admin123",
        "--timeout-ms",
        "30000",
      ],
      {
        cwd: workspaceDir,
        env: process.env,
        timeoutMs: 240_000,
      },
    );

    assert.equal(result.code, 0, `Smoke script gagal: ${result.stderr}`);
    const output = parseJsonOutput(result.stdout);
    assert.equal(String(output.status), "pass");
    const checks = Array.isArray(output.checks) ? output.checks : [];
    assert.ok(checks.length >= 6, "Smoke check harus memverifikasi seluruh endpoint critical path");
  } finally {
    await server.close();
  }
}

run()
  .then(() => {
    console.log("[integration] ops smoke checklist critical path: PASS");
  })
  .catch((error) => {
    console.error("[integration] ops smoke checklist critical path: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
