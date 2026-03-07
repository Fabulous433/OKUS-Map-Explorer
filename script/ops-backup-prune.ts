import { rm } from "node:fs/promises";
import { basename } from "node:path";
import {
  BACKUP_FREQUENCIES,
  getRetentionCutoff,
  isHelpRequested,
  listBackupFiles,
  loadOpsConfig,
  parseArgs,
  parseBackupFileName,
  printJson,
  type BackupFrequency,
} from "./ops-utils";

function printHelp() {
  console.log(`Usage: tsx script/ops-backup-prune.ts [--dry-run] [--frequency daily|weekly|monthly]

Examples:
  tsx script/ops-backup-prune.ts
  tsx script/ops-backup-prune.ts --dry-run
  tsx script/ops-backup-prune.ts --frequency daily
`);
}

function shouldIncludeFrequency(rawValue: string | boolean | undefined): BackupFrequency[] {
  if (rawValue === undefined) return [...BACKUP_FREQUENCIES];
  if (typeof rawValue !== "string") {
    throw new Error(`Invalid frequency flag: ${String(rawValue)}`);
  }
  if (!BACKUP_FREQUENCIES.includes(rawValue as BackupFrequency)) {
    throw new Error(`Invalid frequency value: ${rawValue}`);
  }
  return [rawValue as BackupFrequency];
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  if (isHelpRequested(args)) {
    printHelp();
    return;
  }

  const config = loadOpsConfig();
  const dryRun = Boolean(args.get("dry-run"));
  const enabledFrequencies = shouldIncludeFrequency(args.get("frequency"));
  const now = new Date();

  const files = await listBackupFiles(config.backupDir);
  const summary: Record<
    BackupFrequency,
    { cutoff: string; inspected: number; removed: string[]; kept: string[]; skipped: string[] }
  > = {
    daily: { cutoff: "", inspected: 0, removed: [], kept: [], skipped: [] },
    weekly: { cutoff: "", inspected: 0, removed: [], kept: [], skipped: [] },
    monthly: { cutoff: "", inspected: 0, removed: [], kept: [], skipped: [] },
  };

  for (const frequency of BACKUP_FREQUENCIES) {
    summary[frequency].cutoff = getRetentionCutoff(config, frequency, now).toISOString();
  }

  for (const file of files) {
    const fileName = basename(file.fileName);
    const parsed = parseBackupFileName(fileName);
    if (!parsed) {
      for (const freq of enabledFrequencies) {
        summary[freq].skipped.push(file.fullPath);
      }
      continue;
    }

    if (!enabledFrequencies.includes(parsed.frequency)) {
      continue;
    }

    const info = summary[parsed.frequency];
    info.inspected += 1;
    const cutoffDate = new Date(info.cutoff);
    const isExpired = parsed.timestamp < cutoffDate;

    if (!isExpired) {
      info.kept.push(file.fullPath);
      continue;
    }

    if (!dryRun) {
      await rm(file.fullPath, { force: true });
    }
    info.removed.push(file.fullPath);
  }

  printJson({
    status: "ok",
    dryRun,
    backupDir: config.backupDir,
    processedAt: now.toISOString(),
    summary,
  });
}

run().catch((error) => {
  console.error("[ops-backup-prune] failed:", error);
  process.exit(1);
});
