import { config } from "dotenv";
import { spawn } from "node:child_process";
import { mkdir, readdir } from "node:fs/promises";
import path from "node:path";

config({ path: ".env.local" });
config();

export const BACKUP_FREQUENCIES = ["daily", "weekly", "monthly"] as const;
export type BackupFrequency = (typeof BACKUP_FREQUENCIES)[number];

const BACKUP_FILE_RE = /^okus-map-explorer_(.+)_(daily|weekly|monthly)_(\d{8}-\d{6})\.sql(?:\.gz)?$/i;

export type OpsConfig = {
  backupDir: string;
  backupEnv: string;
  backupContainer: string;
  backupDbName: string;
  backupDbUser: string;
  retentionDailyDays: number;
  retentionWeeklyWeeks: number;
  retentionMonthlyMonths: number;
  restoreDrillDbName: string;
};

function parsePositiveInt(input: string | undefined, fallbackValue: number) {
  if (!input || input.trim().length === 0) return fallbackValue;
  const parsed = Number.parseInt(input, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid positive integer env value: ${input}`);
  }
  return parsed;
}

export function loadOpsConfig(): OpsConfig {
  return {
    backupDir: process.env.BACKUP_DIR?.trim() || "backups",
    backupEnv: process.env.BACKUP_ENV?.trim() || "local",
    backupContainer: process.env.BACKUP_CONTAINER?.trim() || "okus-postgres",
    backupDbName: process.env.BACKUP_DB_NAME?.trim() || "okus_map_explorer",
    backupDbUser: process.env.BACKUP_DB_USER?.trim() || "okus_dev",
    retentionDailyDays: parsePositiveInt(process.env.BACKUP_RETENTION_DAYS_DAILY, 35),
    retentionWeeklyWeeks: parsePositiveInt(process.env.BACKUP_RETENTION_WEEKS_WEEKLY, 12),
    retentionMonthlyMonths: parsePositiveInt(process.env.BACKUP_RETENTION_MONTHS_MONTHLY, 12),
    restoreDrillDbName: process.env.RESTORE_DRILL_DB_NAME?.trim() || "okus_restore_drill",
  };
}

export function formatTimestamp(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}-${hour}${minute}${second}`;
}

export function parseTimestamp(raw: string) {
  const match = /^(\d{4})(\d{2})(\d{2})-(\d{2})(\d{2})(\d{2})$/.exec(raw);
  if (!match) return null;

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10) - 1;
  const day = Number.parseInt(match[3], 10);
  const hour = Number.parseInt(match[4], 10);
  const minute = Number.parseInt(match[5], 10);
  const second = Number.parseInt(match[6], 10);

  const date = new Date(year, month, day, hour, minute, second);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute ||
    date.getSeconds() !== second
  ) {
    return null;
  }

  return date;
}

export function parseBackupFileName(fileName: string): {
  backupEnv: string;
  frequency: BackupFrequency;
  timestamp: Date;
} | null {
  const match = BACKUP_FILE_RE.exec(fileName);
  if (!match) return null;

  const parsedDate = parseTimestamp(match[3]);
  if (!parsedDate) return null;

  const freq = match[2].toLowerCase();
  if (!BACKUP_FREQUENCIES.includes(freq as BackupFrequency)) return null;

  return {
    backupEnv: match[1],
    frequency: freq as BackupFrequency,
    timestamp: parsedDate,
  };
}

export function buildBackupFileName(backupEnv: string, frequency: BackupFrequency, date = new Date()) {
  const ts = formatTimestamp(date);
  return `okus-map-explorer_${backupEnv}_${frequency}_${ts}.sql.gz`;
}

export function getRetentionCutoff(config: OpsConfig, frequency: BackupFrequency, now = new Date()) {
  const cutoff = new Date(now);
  if (frequency === "daily") {
    cutoff.setDate(cutoff.getDate() - config.retentionDailyDays);
    return cutoff;
  }
  if (frequency === "weekly") {
    cutoff.setDate(cutoff.getDate() - config.retentionWeeklyWeeks * 7);
    return cutoff;
  }
  cutoff.setMonth(cutoff.getMonth() - config.retentionMonthlyMonths);
  return cutoff;
}

export async function ensureBackupDirectory(rootDir: string, frequency: BackupFrequency) {
  const target = path.resolve(rootDir, frequency);
  await mkdir(target, { recursive: true });
  return target;
}

export async function listBackupFiles(rootDir: string) {
  const resolvedRoot = path.resolve(rootDir);
  const result: Array<{ fullPath: string; fileName: string }> = [];

  const topLevel = await readdir(resolvedRoot, { withFileTypes: true }).catch(() => []);
  for (const entry of topLevel) {
    const entryPath = path.join(resolvedRoot, entry.name);
    if (entry.isDirectory()) {
      const nested = await readdir(entryPath, { withFileTypes: true }).catch(() => []);
      for (const child of nested) {
        if (child.isFile()) {
          result.push({
            fullPath: path.join(entryPath, child.name),
            fileName: child.name,
          });
        }
      }
      continue;
    }

    if (entry.isFile()) {
      result.push({
        fullPath: entryPath,
        fileName: entry.name,
      });
    }
  }

  return result;
}

export function parseArgs(rawArgs: string[]) {
  const args = new Map<string, string | boolean>();
  for (let i = 0; i < rawArgs.length; i += 1) {
    const item = rawArgs[i];
    if (!item.startsWith("--")) continue;

    const [flag, inlineValue] = item.slice(2).split("=", 2);
    if (inlineValue !== undefined) {
      args.set(flag, inlineValue);
      continue;
    }

    const next = rawArgs[i + 1];
    if (next && !next.startsWith("--")) {
      args.set(flag, next);
      i += 1;
      continue;
    }

    args.set(flag, true);
  }
  return args;
}

export function isHelpRequested(argMap: Map<string, string | boolean>) {
  return argMap.has("help") || argMap.has("h");
}

export function assertSafeIdentifier(value: string, label: string) {
  if (!/^[A-Za-z0-9_]+$/.test(value)) {
    throw new Error(`${label} contains unsupported characters: ${value}`);
  }
}

export async function runCommand(command: string, args: string[], options?: { stdinText?: string }) {
  return new Promise<{ stdout: string; stderr: string; exitCode: number }>((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["pipe", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += String(chunk);
    });

    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      const exitCode = code ?? 1;
      if (exitCode !== 0) {
        reject(new Error(`Command failed (${command} ${args.join(" ")}): ${stderr || stdout}`));
        return;
      }

      resolve({ stdout, stderr, exitCode });
    });

    if (options?.stdinText !== undefined) {
      child.stdin.write(options.stdinText);
    }
    child.stdin.end();
  });
}

export function printJson(data: unknown) {
  console.log(JSON.stringify(data, null, 2));
}
