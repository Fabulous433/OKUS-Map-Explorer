import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

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
        stderr: `${stderr}\nProcess timeout after ${options?.timeoutMs ?? 120_000}ms`,
      });
    }, options?.timeoutMs ?? 120_000);

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
  const workspaceDir = path.resolve(".");
  const npmExecPath = process.env.npm_execpath;
  assert.equal(typeof npmExecPath, "string");
  assert.ok(npmExecPath.length > 0, "npm_execpath wajib tersedia untuk menjalankan tsx");
  const tsxInvocation = (scriptPath: string, extraArgs: string[] = []) => [
    npmExecPath,
    "exec",
    "--",
    "tsx",
    scriptPath,
    ...extraArgs,
  ];
  const runId = Date.now();
  const backupDir = path.join("backups", `integration-ops-${runId}`);
  const restoreDbOk = `okus_restore_it_ok_${runId}`;
  const restoreDbFail = `okus_restore_it_fail_${runId}`;
  const backupContainer = process.env.BACKUP_CONTAINER ?? "okus-postgres";
  const backupDbUser = process.env.BACKUP_DB_USER ?? "okus_dev";

  await mkdir(path.resolve(backupDir), { recursive: true });

  const scriptEnv: NodeJS.ProcessEnv = {
    ...process.env,
    BACKUP_DIR: backupDir,
  };

  const backupResult = await runProcess(
    process.execPath,
    tsxInvocation("script/ops-backup.ts", ["--frequency", "daily"]),
    { cwd: workspaceDir, env: scriptEnv },
  );
  assert.equal(backupResult.code, 0, `Backup script gagal: ${backupResult.stderr}`);
  const backupJson = parseJsonOutput(backupResult.stdout);
  const backupFile = String(backupJson.file ?? "");
  assert.ok(backupFile.endsWith(".sql.gz"), "Backup output harus file .sql.gz");

  const restoreOkResult = await runProcess(
    process.execPath,
    tsxInvocation("script/ops-restore-drill.ts", [
      "--file",
      backupFile,
      "--database",
      restoreDbOk,
      "--cleanup",
    ]),
    { cwd: workspaceDir, env: scriptEnv },
  );
  assert.equal(restoreOkResult.code, 0, `Restore drill sukses seharusnya lulus: ${restoreOkResult.stderr}`);
  const restoreOkJson = parseJsonOutput(restoreOkResult.stdout);
  const rowCounts = (restoreOkJson.rowCounts ?? {}) as Record<string, unknown>;
  assert.ok(Number(rowCounts.wajibPajak) >= 0, "Count wajib_pajak harus valid");
  assert.ok(Number(rowCounts.objekPajak) >= 0, "Count objek_pajak harus valid");
  assert.ok(Number(rowCounts.masterRekeningPajak) >= 0, "Count master_rekening_pajak harus valid");

  const pruneResult = await runProcess(
    process.execPath,
    tsxInvocation("script/ops-backup-prune.ts", ["--dry-run"]),
    { cwd: workspaceDir, env: scriptEnv },
  );
  assert.equal(pruneResult.code, 0, `Prune dry-run gagal: ${pruneResult.stderr}`);
  const pruneJson = parseJsonOutput(pruneResult.stdout);
  const dailySummary = ((pruneJson.summary as Record<string, unknown>)?.daily ?? {}) as Record<string, unknown>;
  assert.ok(Number(dailySummary.inspected) >= 1, "Prune dry-run harus inspeksi minimal 1 backup daily");

  const invalidSqlPath = path.resolve(backupDir, "invalid-restore.sql");
  await writeFile(invalidSqlPath, "THIS IS NOT VALID SQL;\nSELECT FROM broken;", "utf8");

  const restoreFailResult = await runProcess(
    process.execPath,
    tsxInvocation("script/ops-restore-drill.ts", [
      "--file",
      invalidSqlPath,
      "--database",
      restoreDbFail,
      "--cleanup",
    ]),
    { cwd: workspaceDir, env: scriptEnv },
  );
  assert.notEqual(restoreFailResult.code, 0, "Restore invalid SQL harus gagal");

  const dbExistsResult = await runProcess(
    "docker",
    [
      "exec",
      backupContainer,
      "psql",
      "-U",
      backupDbUser,
      "-d",
      "postgres",
      "-t",
      "-A",
      "-c",
      `select count(*) from pg_database where datname='${restoreDbFail}';`,
    ],
    { cwd: workspaceDir, env: process.env },
  );
  assert.equal(dbExistsResult.code, 0, `Gagal cek keberadaan DB: ${dbExistsResult.stderr}`);
  assert.equal(Number.parseInt(dbExistsResult.stdout.trim(), 10), 0, "DB restore gagal harus ter-cleanup");
}

run()
  .then(() => {
    console.log("[integration] ops lifecycle backup/prune/restore: PASS");
  })
  .catch((error) => {
    console.error("[integration] ops lifecycle backup/prune/restore: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
