import { createGzip } from "node:zlib";
import { createWriteStream } from "node:fs";
import { mkdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { pipeline } from "node:stream/promises";
import {
  BACKUP_FREQUENCIES,
  type BackupFrequency,
  buildBackupFileName,
  ensureBackupDirectory,
  isHelpRequested,
  loadOpsConfig,
  parseArgs,
  printJson,
} from "./ops-utils";

function printHelp() {
  console.log(`Usage: tsx script/ops-backup.ts [--frequency daily|weekly|monthly] [--output <path>]

Examples:
  tsx script/ops-backup.ts --frequency daily
  tsx script/ops-backup.ts --frequency weekly --output backups/manual
`);
}

function parseFrequency(value: string | boolean | undefined): BackupFrequency {
  if (typeof value !== "string") return "daily";
  if (BACKUP_FREQUENCIES.includes(value as BackupFrequency)) {
    return value as BackupFrequency;
  }
  throw new Error(`Invalid frequency: ${value}`);
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  if (isHelpRequested(args)) {
    printHelp();
    return;
  }

  const config = loadOpsConfig();
  const frequency = parseFrequency(args.get("frequency"));
  const outputRoot = typeof args.get("output") === "string" ? String(args.get("output")) : config.backupDir;

  const targetDir = await ensureBackupDirectory(outputRoot, frequency);
  await mkdir(targetDir, { recursive: true });
  const fileName = buildBackupFileName(config.backupEnv, frequency, new Date());
  const outputPath = path.resolve(targetDir, fileName);

  const pgDumpArgs = [
    "exec",
    config.backupContainer,
    "pg_dump",
    "-U",
    config.backupDbUser,
    "-d",
    config.backupDbName,
    "--no-owner",
    "--no-privileges",
  ];
  const pgDump = spawn("docker", pgDumpArgs, {
    stdio: ["ignore", "pipe", "pipe"],
  });

  const gzip = createGzip({ level: 9 });
  const outputStream = createWriteStream(outputPath);

  let stderr = "";
  pgDump.stderr.on("data", (chunk) => {
    stderr += String(chunk);
  });

  const exitCodePromise = new Promise<number>((resolve, reject) => {
    pgDump.on("error", (error) => reject(error));
    pgDump.on("close", (code) => resolve(code ?? 1));
  });

  try {
    await pipeline(pgDump.stdout, gzip, outputStream);

    const exitCode = await exitCodePromise;
    if (exitCode !== 0) {
      throw new Error(`Backup failed: ${stderr || "pg_dump exited with non-zero code"}`);
    }

    const fileStat = await stat(outputPath);
    if (fileStat.size <= 0) {
      throw new Error(`Backup file is empty: ${outputPath}`);
    }

    printJson({
      status: "ok",
      frequency,
      file: outputPath,
      sizeBytes: fileStat.size,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    await rm(outputPath, { force: true }).catch(() => undefined);
    await exitCodePromise.catch(() => undefined);
    throw error;
  }
}

run().catch((error) => {
  console.error("[ops-backup] failed:", error);
  process.exit(1);
});
