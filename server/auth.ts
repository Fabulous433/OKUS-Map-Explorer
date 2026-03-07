import { pbkdf2Sync, randomBytes, timingSafeEqual } from "node:crypto";

export const APP_ROLE_OPTIONS = ["admin", "editor", "viewer"] as const;
export type AppRole = (typeof APP_ROLE_OPTIONS)[number];

const HASH_PREFIX = "pbkdf2";
const ITERATIONS = 120_000;
const KEY_LEN = 32;
const DIGEST = "sha256";

export type SessionUser = {
  id: string;
  username: string;
  role: AppRole;
};

declare module "express-session" {
  interface SessionData {
    user?: SessionUser;
  }
}

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && APP_ROLE_OPTIONS.includes(value as AppRole);
}

export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = pbkdf2Sync(plain, salt, ITERATIONS, KEY_LEN, DIGEST).toString("hex");
  return `${HASH_PREFIX}$${ITERATIONS}$${salt}$${derived}`;
}

export function verifyPassword(stored: string, plain: string): boolean {
  if (!stored) return false;

  if (!stored.startsWith(`${HASH_PREFIX}$`)) {
    // Backward compatibility for legacy plain-text user records.
    return stored === plain;
  }

  const [prefix, iterRaw, salt, hash] = stored.split("$");
  if (prefix !== HASH_PREFIX || !iterRaw || !salt || !hash) {
    return false;
  }

  const iterations = Number.parseInt(iterRaw, 10);
  if (!Number.isFinite(iterations) || iterations <= 0) {
    return false;
  }

  const derived = pbkdf2Sync(plain, salt, iterations, KEY_LEN, DIGEST);
  const expected = Buffer.from(hash, "hex");
  if (expected.length !== derived.length) {
    return false;
  }

  return timingSafeEqual(expected, derived);
}
