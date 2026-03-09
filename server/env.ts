import { config } from "dotenv";

config({ path: ".env.local" });
config();

function requireEnv(name: "DATABASE_URL" | "SESSION_SECRET"): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function parsePort(rawPort: string | undefined): number {
  if (!rawPort) {
    return 5000;
  }

  const port = Number.parseInt(rawPort, 10);
  if (Number.isNaN(port) || port <= 0) {
    throw new Error(`Invalid PORT value: ${rawPort}`);
  }

  return port;
}

function parseOptionalPositiveInt(rawValue: string | undefined, fallback: number): number {
  if (!rawValue || rawValue.trim().length === 0) {
    return fallback;
  }

  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid numeric env value: ${rawValue}`);
  }

  return parsed;
}

function parseOptionalNonEmptyString(rawValue: string | undefined, fallback: string): string {
  if (!rawValue || rawValue.trim().length === 0) {
    return fallback;
  }

  return rawValue.trim();
}

export const env = {
  DATABASE_URL: requireEnv("DATABASE_URL"),
  SESSION_SECRET: requireEnv("SESSION_SECRET"),
  PORT: parsePort(process.env.PORT),
  ATTACHMENTS_STORAGE_ROOT: parseOptionalNonEmptyString(process.env.ATTACHMENTS_STORAGE_ROOT, "./uploads"),
  SLOW_QUERY_MS: parseOptionalPositiveInt(process.env.SLOW_QUERY_MS, 300),
  AUTH_LOGIN_RATE_LIMIT_WINDOW_MS: parseOptionalPositiveInt(process.env.AUTH_LOGIN_RATE_LIMIT_WINDOW_MS, 60_000),
  AUTH_LOGIN_RATE_LIMIT_MAX_REQUESTS: parseOptionalPositiveInt(process.env.AUTH_LOGIN_RATE_LIMIT_MAX_REQUESTS, 40),
  AUTH_LOGIN_LOCKOUT_THRESHOLD: parseOptionalPositiveInt(process.env.AUTH_LOGIN_LOCKOUT_THRESHOLD, 5),
  AUTH_LOGIN_LOCKOUT_MS: parseOptionalPositiveInt(process.env.AUTH_LOGIN_LOCKOUT_MS, 5 * 60_000),
};
