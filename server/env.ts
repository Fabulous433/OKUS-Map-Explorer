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

export const env = {
  DATABASE_URL: requireEnv("DATABASE_URL"),
  SESSION_SECRET: requireEnv("SESSION_SECRET"),
  PORT: parsePort(process.env.PORT),
};
