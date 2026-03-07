import { createGunzip } from "node:zlib";
import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import { extname, resolve } from "node:path";
import { spawn } from "node:child_process";
import {
  assertSafeIdentifier,
  isHelpRequested,
  listBackupFiles,
  loadOpsConfig,
  parseArgs,
  parseBackupFileName,
  printJson,
  runCommand,
} from "./ops-utils";

function printHelp() {
  console.log(`Usage: tsx script/ops-restore-drill.ts [--file <backup-file>] [--database <db_name>] [--cleanup]

Examples:
  tsx script/ops-restore-drill.ts
  tsx script/ops-restore-drill.ts --file backups/daily/okus-map-explorer_local_daily_20260307-010000.sql.gz
  tsx script/ops-restore-drill.ts --database okus_restore_drill --cleanup
`);
}

async function resolveBackupFile(preferredPath: string | undefined, backupDir: string) {
  if (preferredPath) {
    const absolute = resolve(preferredPath);
    await access(absolute);
    return absolute;
  }

  const candidates = await listBackupFiles(backupDir);
  const parsedCandidates = candidates
    .map((item) => {
      const parsed = parseBackupFileName(item.fileName);
      if (!parsed) return null;
      return {
        filePath: item.fullPath,
        timestamp: parsed.timestamp.getTime(),
      };
    })
    .filter((item): item is { filePath: string; timestamp: number } => item !== null)
    .sort((a, b) => b.timestamp - a.timestamp);

  if (parsedCandidates.length === 0) {
    throw new Error(`No backup file found in ${backupDir}`);
  }

  return parsedCandidates[0].filePath;
}

async function restoreSqlFile(params: {
  container: string;
  dbUser: string;
  dbName: string;
  backupFile: string;
}) {
  const restoreProc = spawn(
    "docker",
    ["exec", "-i", params.container, "psql", "-U", params.dbUser, "-d", params.dbName],
    { stdio: ["pipe", "pipe", "pipe"] },
  );

  let stderr = "";
  let stdout = "";
  restoreProc.stderr.on("data", (chunk) => {
    stderr += String(chunk);
  });
  restoreProc.stdout.on("data", (chunk) => {
    stdout += String(chunk);
  });

  const inputFile = createReadStream(params.backupFile);
  if (extname(params.backupFile).toLowerCase() === ".gz") {
    inputFile.pipe(createGunzip()).pipe(restoreProc.stdin);
  } else {
    inputFile.pipe(restoreProc.stdin);
  }

  await new Promise<void>((resolvePromise, rejectPromise) => {
    restoreProc.on("error", (error) => rejectPromise(error));
    restoreProc.on("close", (code) => {
      if ((code ?? 1) !== 0) {
        rejectPromise(
          new Error(`Restore failed with exit code ${code ?? 1}: ${stderr || stdout}`),
        );
        return;
      }
      resolvePromise();
    });
  });
}

async function queryCount(container: string, user: string, dbName: string, table: string) {
  const result = await runCommand("docker", [
    "exec",
    container,
    "psql",
    "-U",
    user,
    "-d",
    dbName,
    "-t",
    "-A",
    "-c",
    `select count(*) from ${table};`,
  ]);
  return Number.parseInt(result.stdout.trim(), 10);
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  if (isHelpRequested(args)) {
    printHelp();
    return;
  }

  const config = loadOpsConfig();
  const fileArg = typeof args.get("file") === "string" ? String(args.get("file")) : undefined;
  const dbArg =
    typeof args.get("database") === "string" ? String(args.get("database")) : config.restoreDrillDbName;
  const cleanup = Boolean(args.get("cleanup"));

  assertSafeIdentifier(config.backupDbUser, "BACKUP_DB_USER");
  assertSafeIdentifier(dbArg, "restore database");

  const backupFile = await resolveBackupFile(fileArg, config.backupDir);
  await runCommand("docker", [
    "exec",
    config.backupContainer,
    "psql",
    "-U",
    config.backupDbUser,
    "-d",
    "postgres",
    "-c",
    `DROP DATABASE IF EXISTS ${dbArg};`,
  ]);
  await runCommand("docker", [
    "exec",
    config.backupContainer,
    "psql",
    "-U",
    config.backupDbUser,
    "-d",
    "postgres",
    "-c",
    `CREATE DATABASE ${dbArg};`,
  ]);

  const startedAt = new Date();
  let finishedAt = startedAt;
  let rowCounts: {
    wajibPajak: number;
    objekPajak: number;
    masterRekeningPajak: number;
  } | null = null;
  let primaryError: unknown = null;

  try {
    await restoreSqlFile({
      container: config.backupContainer,
      dbUser: config.backupDbUser,
      dbName: dbArg,
      backupFile,
    });
    finishedAt = new Date();

    rowCounts = {
      wajibPajak: await queryCount(config.backupContainer, config.backupDbUser, dbArg, "wajib_pajak"),
      objekPajak: await queryCount(config.backupContainer, config.backupDbUser, dbArg, "objek_pajak"),
      masterRekeningPajak: await queryCount(
        config.backupContainer,
        config.backupDbUser,
        dbArg,
        "master_rekening_pajak",
      ),
    };
  } catch (error) {
    primaryError = error;
    finishedAt = new Date();
  }

  if (cleanup) {
    try {
      await runCommand("docker", [
        "exec",
        config.backupContainer,
        "psql",
        "-U",
        config.backupDbUser,
        "-d",
        "postgres",
        "-c",
        `DROP DATABASE IF EXISTS ${dbArg};`,
      ]);
    } catch (cleanupError) {
      if (primaryError) {
        console.error("[ops-restore-drill] cleanup after failure also failed:", cleanupError);
      } else {
        primaryError = cleanupError;
      }
    }
  }

  if (primaryError) {
    throw primaryError;
  }

  if (!rowCounts) {
    throw new Error("Restore drill completed without row count result");
  }

  printJson({
    status: "ok",
    backupFile,
    restoreDatabase: dbArg,
    cleanup,
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationSec: Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000),
    rowCounts,
  });
}

run().catch((error) => {
  console.error("[ops-restore-drill] failed:", error);
  process.exit(1);
});
