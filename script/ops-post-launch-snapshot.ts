import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  formatTimestamp,
  isHelpRequested,
  parseArgs,
  printJson,
} from "./ops-utils";

type SnapshotConfig = {
  baseUrl: string;
  username: string;
  password: string;
  outputRoot: string;
  timeoutMs: number;
  generatedBy: string;
};

type EndpointSnapshot = {
  name: string;
  path: string;
  ok: boolean;
  statusCode: number;
  durationMs: number;
  requestId: string | null;
  message?: string;
};

function printHelp() {
  console.log(`Usage: tsx script/ops-post-launch-snapshot.ts [options]

Options:
  --base-url <url>
  --username <username>
  --password <password>
  --output-root <path>
  --timeout-ms <number>
  --generated-by <identity>

Examples:
  tsx script/ops-post-launch-snapshot.ts
  tsx script/ops-post-launch-snapshot.ts --base-url http://127.0.0.1:5000 --output-root reports
`);
}

function parsePositiveInt(rawValue: string | undefined, fallbackValue: number, label: string) {
  if (!rawValue || rawValue.trim().length === 0) return fallbackValue;
  const parsed = Number.parseInt(rawValue, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${label}: ${rawValue}`);
  }
  return parsed;
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

function resolveConfig(args: Map<string, string | boolean>): SnapshotConfig {
  const port = process.env.PORT?.trim() || "5000";

  const baseUrlArg = typeof args.get("base-url") === "string" ? String(args.get("base-url")) : undefined;
  const usernameArg = typeof args.get("username") === "string" ? String(args.get("username")) : undefined;
  const passwordArg = typeof args.get("password") === "string" ? String(args.get("password")) : undefined;
  const outputRootArg = typeof args.get("output-root") === "string" ? String(args.get("output-root")) : undefined;
  const timeoutArg = typeof args.get("timeout-ms") === "string" ? String(args.get("timeout-ms")) : undefined;
  const generatedByArg = typeof args.get("generated-by") === "string" ? String(args.get("generated-by")) : undefined;

  return {
    baseUrl: normalizeBaseUrl(baseUrlArg || process.env.POST_LAUNCH_BASE_URL || `http://127.0.0.1:${port}`),
    username: usernameArg || process.env.POST_LAUNCH_USERNAME || "admin",
    password: passwordArg || process.env.POST_LAUNCH_PASSWORD || "admin123",
    outputRoot: outputRootArg || process.env.POST_LAUNCH_OUTPUT_DIR || "reports",
    timeoutMs: parsePositiveInt(timeoutArg || process.env.POST_LAUNCH_TIMEOUT_MS, 30_000, "timeout-ms"),
    generatedBy: generatedByArg || process.env.POST_LAUNCH_GENERATED_BY || "system",
  };
}

function getCookieFromResponse(response: Response) {
  const withGetSetCookie = response.headers as Headers & { getSetCookie?: () => string[] };
  const setCookies = withGetSetCookie.getSetCookie?.() ?? [];
  if (setCookies.length > 0) {
    const cookiePair = setCookies
      .map((item) => item.split(";")[0]?.trim())
      .find((item) => item?.startsWith("connect.sid="));
    if (cookiePair) return cookiePair;
  }

  const rawSetCookie = response.headers.get("set-cookie");
  if (!rawSetCookie) return "";
  const match = rawSetCookie.match(/connect\.sid=[^;]+/);
  return match?.[0] ?? "";
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function login(config: SnapshotConfig) {
  const response = await fetchWithTimeout(
    `${config.baseUrl}/api/auth/login`,
    {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        username: config.username,
        password: config.password,
      }),
    },
    config.timeoutMs,
  );

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(`Login snapshot gagal (${response.status}): ${bodyText}`);
  }

  const cookie = getCookieFromResponse(response);
  if (!cookie) {
    throw new Error("Session cookie tidak ditemukan setelah login");
  }
  return cookie;
}

async function snapshotEndpoint(params: {
  config: SnapshotConfig;
  cookie: string;
  name: string;
  path: string;
}) {
  const startedAt = Date.now();
  try {
    const response = await fetchWithTimeout(
      `${params.config.baseUrl}${params.path}`,
      {
        method: "GET",
        headers: {
          cookie: params.cookie,
        },
      },
      params.config.timeoutMs,
    );
    const durationMs = Date.now() - startedAt;
    const requestId = response.headers.get("x-request-id");
    const ok = response.status >= 200 && response.status < 300;

    return {
      endpoint: {
        name: params.name,
        path: params.path,
        ok,
        statusCode: response.status,
        durationMs,
        requestId,
      } satisfies EndpointSnapshot,
      payload: ok ? await response.json() : null,
      rawText: ok ? null : await response.text(),
    };
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    return {
      endpoint: {
        name: params.name,
        path: params.path,
        ok: false,
        statusCode: 0,
        durationMs,
        requestId: null,
        message: String(error),
      } satisfies EndpointSnapshot,
      payload: null,
      rawText: null,
    };
  }
}

function buildOutputDirectory(root: string, now: Date) {
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return path.resolve(root, "post-launch", year, month, day);
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  if (isHelpRequested(args)) {
    printHelp();
    return;
  }

  const config = resolveConfig(args);
  const now = new Date();
  const cookie = await login(config);
  const outputDir = buildOutputDirectory(config.outputRoot, now);
  await mkdir(outputDir, { recursive: true });

  const endpointDefs = [
    { name: "auth_me", path: "/api/auth/me" },
    { name: "wajib_pajak_list", path: "/api/wajib-pajak?page=1&limit=25" },
    { name: "objek_pajak_list", path: "/api/objek-pajak?page=1&limit=25&includeUnverified=true" },
    { name: "dashboard_summary", path: "/api/dashboard/summary?includeUnverified=true" },
    { name: "quality_report", path: "/api/quality/report" },
    { name: "audit_log", path: "/api/audit-log?limit=10" },
  ] as const;

  const endpointResults = [];
  const payloadByName: Record<string, unknown> = {};
  for (const endpoint of endpointDefs) {
    const result = await snapshotEndpoint({
      config,
      cookie,
      name: endpoint.name,
      path: endpoint.path,
    });
    endpointResults.push(result.endpoint);
    if (result.payload !== null) {
      payloadByName[endpoint.name] = result.payload;
    }
  }

  const passedCount = endpointResults.filter((item) => item.ok).length;
  const failedCount = endpointResults.length - passedCount;
  const avgDurationMs = endpointResults.length > 0
    ? Math.round(
        endpointResults.reduce((acc, item) => acc + item.durationMs, 0) / endpointResults.length,
      )
    : 0;

  const dashboard = (payloadByName.dashboard_summary ?? {}) as Record<string, unknown>;
  const totals = (dashboard.totals ?? {}) as Record<string, unknown>;
  const quality = (payloadByName.quality_report ?? {}) as Record<string, unknown>;
  const missingCritical = (quality.missingCriticalFields ?? {}) as Record<string, unknown>;
  const invalidGeo = (quality.invalidGeoRange ?? {}) as Record<string, unknown>;

  const snapshot = {
    generatedAt: now.toISOString(),
    generatedBy: config.generatedBy,
    baseUrl: config.baseUrl,
    summary: {
      status: failedCount === 0 ? "healthy" : "degraded",
      totalChecks: endpointResults.length,
      passedChecks: passedCount,
      failedChecks: failedCount,
      avgDurationMs,
    },
    highlights: {
      totalWp: Number(totals.totalWp ?? 0),
      totalOp: Number(totals.totalOp ?? 0),
      totalPending: Number(totals.totalPending ?? 0),
      missingCriticalCount: Number(missingCritical.count ?? 0),
      invalidGeoCount: Number(invalidGeo.count ?? 0),
    },
    checks: endpointResults,
  };

  const fileName = `post-launch-snapshot_${formatTimestamp(now)}.json`;
  const filePath = path.resolve(outputDir, fileName);
  await writeFile(filePath, JSON.stringify(snapshot, null, 2), "utf8");

  printJson({
    status: "ok",
    outputFile: filePath,
    summary: snapshot.summary,
    highlights: snapshot.highlights,
  });

  if (failedCount > 0) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error("[ops-post-launch-snapshot] failed:", error);
  process.exit(1);
});
