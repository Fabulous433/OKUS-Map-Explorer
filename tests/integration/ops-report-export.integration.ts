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
  const outputRoot = path.join("reports", `integration-export-${runId}`);
  const npmExecPath = process.env.npm_execpath;
  assert.equal(typeof npmExecPath, "string");
  assert.ok(npmExecPath.length > 0, "npm_execpath wajib tersedia untuk menjalankan tsx");

  try {
    const commandResult = await runProcess(
      process.execPath,
      [
        npmExecPath,
        "exec",
        "--",
        "tsx",
        "script/ops-report-export.ts",
        "--frequency",
        "daily",
        "--base-url",
        server.baseUrl,
        "--output-root",
        outputRoot,
        "--username",
        "admin",
        "--password",
        "admin123",
        "--generated-by",
        "integration-test",
        "--retry-attempts",
        "1",
        "--retry-delay-ms",
        "50",
        "--timeout-ms",
        "30000",
      ],
      {
        cwd: workspaceDir,
        env: process.env,
        timeoutMs: 240_000,
      },
    );

    assert.equal(commandResult.code, 0, `Script export gagal: ${commandResult.stderr}`);
    const json = parseJsonOutput(commandResult.stdout);
    assert.equal(String(json.status), "ok");

    const reports = Array.isArray(json.reports) ? json.reports : [];
    assert.equal(reports.length, 3, "Frequency daily wajib menghasilkan 3 report");

    for (const report of reports) {
      const filePath = String((report as Record<string, unknown>).filePath ?? "");
      assert.ok(filePath.endsWith(".csv"), "Report artifact harus CSV");
      const fileContent = await readFile(filePath, "utf8");
      assert.ok(fileContent.includes("export_timestamp"), "CSV report harus memuat metadata export_timestamp");
      assert.ok(fileContent.includes("generated_by"), "CSV report harus memuat metadata generated_by");
    }
  } finally {
    await server.close();
  }
}

run()
  .then(() => {
    console.log("[integration] ops report export daily scheduling baseline: PASS");
  })
  .catch((error) => {
    console.error("[integration] ops report export daily scheduling baseline: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
