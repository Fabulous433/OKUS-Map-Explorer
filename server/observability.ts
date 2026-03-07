import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import type { RequestHandler } from "express";
import type pg from "pg";

type RequestContext = {
  requestId: string;
};

const requestContextStorage = new AsyncLocalStorage<RequestContext>();
const REQUEST_ID_HEADER = "x-request-id";
const REQUEST_ID_MAX_LENGTH = 64;

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

function log(message: string, source = "observability") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

function normalizeSql(sqlText: string) {
  return sqlText.replace(/\s+/g, " ").trim().slice(0, 220);
}

function resolveRequestId(rawValue: unknown) {
  if (typeof rawValue !== "string") {
    return randomUUID();
  }

  const cleaned = rawValue.trim();
  if (cleaned.length === 0 || cleaned.length > REQUEST_ID_MAX_LENGTH) {
    return randomUUID();
  }

  return cleaned;
}

function extractQueryText(queryArg: unknown) {
  if (typeof queryArg === "string") return queryArg;
  if (queryArg && typeof queryArg === "object" && "text" in queryArg) {
    const text = (queryArg as { text?: unknown }).text;
    if (typeof text === "string") {
      return text;
    }
  }
  return "<unknown-query>";
}

export function createRequestContextMiddleware(): RequestHandler {
  return (req, res, next) => {
    const requestId = resolveRequestId(req.header(REQUEST_ID_HEADER));
    req.requestId = requestId;
    res.setHeader(REQUEST_ID_HEADER, requestId);

    requestContextStorage.run({ requestId }, () => {
      next();
    });
  };
}

export function getCurrentRequestId() {
  return requestContextStorage.getStore()?.requestId ?? null;
}

export function instrumentPoolForSlowQueryLogging(pool: pg.Pool, slowQueryMs: number) {
  const currentQuery = pool.query.bind(pool) as (...args: unknown[]) => Promise<{
    rowCount?: number | null;
  }>;

  (pool as unknown as { query: (...args: unknown[]) => Promise<unknown> }).query = async (...args: unknown[]) => {
    const startedAt = process.hrtime.bigint();
    try {
      const result = await currentQuery(...args);
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      if (durationMs >= slowQueryMs) {
        const requestId = getCurrentRequestId() ?? "-";
        const sqlText = normalizeSql(extractQueryText(args[0]));
        const rowCount = typeof result.rowCount === "number" ? result.rowCount : -1;
        log(
          `slow-query request_id=${requestId} duration_ms=${durationMs.toFixed(2)} row_count=${rowCount} sql="${sqlText}"`,
          "db",
        );
      }
      return result;
    } catch (error) {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      const requestId = getCurrentRequestId() ?? "-";
      const sqlText = normalizeSql(extractQueryText(args[0]));
      const message = error instanceof Error ? error.message : String(error);
      log(
        `query-error request_id=${requestId} duration_ms=${durationMs.toFixed(2)} sql="${sqlText}" error="${message}"`,
        "db",
      );
      throw error;
    }
  };
}
