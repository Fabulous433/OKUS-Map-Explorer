import type { Request } from "express";

export type LoginRateLimitResult =
  | { allowed: true }
  | { allowed: false; retryAfterSec: number };

export type LockoutState =
  | { locked: false }
  | { locked: true; retryAfterSec: number };

type RateWindowState = {
  windowStart: number;
  count: number;
};

type FailedLoginState = {
  failedCount: number;
  lockUntil: number;
};

type LoginSecurityConfig = {
  windowMs: number;
  maxRequestsPerWindow: number;
  lockoutThreshold: number;
  lockoutMs: number;
};

const FALLBACK_CLIENT_ID = "unknown-client";

function toRetryAfterSec(milliseconds: number) {
  return Math.max(1, Math.ceil(milliseconds / 1000));
}

export function resolveLoginClientId(req: Request) {
  const forwarded = req.header("x-forwarded-for");
  if (forwarded) {
    const candidate = forwarded
      .split(",")
      .map((value) => value.trim())
      .find((value) => value.length > 0);
    if (candidate) {
      return candidate.toLowerCase();
    }
  }

  const ip = req.ip?.trim();
  if (ip && ip.length > 0) {
    return ip.toLowerCase();
  }

  return FALLBACK_CLIENT_ID;
}

function buildLockKey(clientId: string, username: string) {
  return `${clientId}|${username.toLowerCase()}`;
}

export class LoginSecurityService {
  private readonly windowMs: number;
  private readonly maxRequestsPerWindow: number;
  private readonly lockoutThreshold: number;
  private readonly lockoutMs: number;
  private readonly rateLimitByClient = new Map<string, RateWindowState>();
  private readonly lockByCredential = new Map<string, FailedLoginState>();

  constructor(config: LoginSecurityConfig) {
    this.windowMs = config.windowMs;
    this.maxRequestsPerWindow = config.maxRequestsPerWindow;
    this.lockoutThreshold = config.lockoutThreshold;
    this.lockoutMs = config.lockoutMs;
  }

  consumeRateLimit(clientId: string, now = Date.now()): LoginRateLimitResult {
    this.pruneIfNeeded(now);

    const state = this.rateLimitByClient.get(clientId);
    if (!state || now - state.windowStart >= this.windowMs) {
      this.rateLimitByClient.set(clientId, { windowStart: now, count: 1 });
      return { allowed: true };
    }

    state.count += 1;
    if (state.count > this.maxRequestsPerWindow) {
      const remainingMs = this.windowMs - (now - state.windowStart);
      return { allowed: false, retryAfterSec: toRetryAfterSec(remainingMs) };
    }

    return { allowed: true };
  }

  getLockoutState(clientId: string, username: string, now = Date.now()): LockoutState {
    this.pruneIfNeeded(now);

    const key = buildLockKey(clientId, username);
    const state = this.lockByCredential.get(key);
    if (!state) {
      return { locked: false };
    }

    if (state.lockUntil > now) {
      return { locked: true, retryAfterSec: toRetryAfterSec(state.lockUntil - now) };
    }

    if (state.failedCount <= 0) {
      this.lockByCredential.delete(key);
    }

    return { locked: false };
  }

  registerFailedAttempt(clientId: string, username: string, now = Date.now()): LockoutState {
    this.pruneIfNeeded(now);

    const key = buildLockKey(clientId, username);
    const current = this.lockByCredential.get(key) ?? { failedCount: 0, lockUntil: 0 };

    if (current.lockUntil > now) {
      return { locked: true, retryAfterSec: toRetryAfterSec(current.lockUntil - now) };
    }

    current.failedCount += 1;
    if (current.failedCount >= this.lockoutThreshold) {
      current.failedCount = 0;
      current.lockUntil = now + this.lockoutMs;
      this.lockByCredential.set(key, current);
      return { locked: true, retryAfterSec: toRetryAfterSec(this.lockoutMs) };
    }

    this.lockByCredential.set(key, current);
    return { locked: false };
  }

  clearFailedAttempt(clientId: string, username: string) {
    this.lockByCredential.delete(buildLockKey(clientId, username));
  }

  private pruneIfNeeded(now: number) {
    if (this.rateLimitByClient.size > 10_000) {
      for (const [key, state] of Array.from(this.rateLimitByClient.entries())) {
        if (now - state.windowStart > this.windowMs * 2) {
          this.rateLimitByClient.delete(key);
        }
      }
    }

    if (this.lockByCredential.size > 10_000) {
      for (const [key, state] of Array.from(this.lockByCredential.entries())) {
        if (state.lockUntil <= now && state.failedCount <= 0) {
          this.lockByCredential.delete(key);
        }
        if (state.lockUntil > 0 && now - state.lockUntil > this.lockoutMs) {
          this.lockByCredential.delete(key);
        }
      }
    }
  }
}
