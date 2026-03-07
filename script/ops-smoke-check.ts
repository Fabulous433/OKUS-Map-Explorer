import { isHelpRequested, parseArgs, printJson } from "./ops-utils";

type SmokeItem = {
  name: string;
  path: string;
  status: "pass" | "fail";
  statusCode: number;
  requestId: string | null;
  message?: string;
};

type SmokeConfig = {
  baseUrl: string;
  username: string;
  password: string;
  timeoutMs: number;
};

function printHelp() {
  console.log(`Usage: tsx script/ops-smoke-check.ts [options]

Options:
  --base-url <url>
  --username <username>
  --password <password>
  --timeout-ms <number>

Examples:
  tsx script/ops-smoke-check.ts
  tsx script/ops-smoke-check.ts --base-url http://127.0.0.1:5000 --username admin --password admin123
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

function resolveConfig(args: Map<string, string | boolean>): SmokeConfig {
  const port = process.env.PORT?.trim() || "5000";
  const baseUrlArg = typeof args.get("base-url") === "string" ? String(args.get("base-url")) : undefined;
  const usernameArg = typeof args.get("username") === "string" ? String(args.get("username")) : undefined;
  const passwordArg = typeof args.get("password") === "string" ? String(args.get("password")) : undefined;
  const timeoutArg = typeof args.get("timeout-ms") === "string" ? String(args.get("timeout-ms")) : undefined;

  return {
    baseUrl: normalizeBaseUrl(baseUrlArg || process.env.SMOKE_BASE_URL || `http://127.0.0.1:${port}`),
    username: usernameArg || process.env.SMOKE_USERNAME || "admin",
    password: passwordArg || process.env.SMOKE_PASSWORD || "admin123",
    timeoutMs: parsePositiveInt(timeoutArg || process.env.SMOKE_TIMEOUT_MS, 30_000, "timeout-ms"),
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

async function login(config: SmokeConfig) {
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
    throw new Error(`Login gagal (${response.status}): ${bodyText}`);
  }

  const cookie = getCookieFromResponse(response);
  if (!cookie) {
    throw new Error("Session cookie tidak ditemukan setelah login");
  }
  return cookie;
}

async function checkEndpoint(params: {
  config: SmokeConfig;
  cookie: string;
  name: string;
  path: string;
}) {
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

    const requestId = response.headers.get("x-request-id");
    const ok = response.status >= 200 && response.status < 300;

    return {
      name: params.name,
      path: params.path,
      status: ok ? "pass" : "fail",
      statusCode: response.status,
      requestId,
      message: ok ? undefined : await response.text(),
    } satisfies SmokeItem;
  } catch (error) {
    return {
      name: params.name,
      path: params.path,
      status: "fail",
      statusCode: 0,
      requestId: null,
      message: String(error),
    } satisfies SmokeItem;
  }
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  if (isHelpRequested(args)) {
    printHelp();
    return;
  }

  const config = resolveConfig(args);
  const startedAt = new Date();
  const cookie = await login(config);
  const checklist = [
    { name: "auth_me", path: "/api/auth/me" },
    { name: "wajib_pajak_list", path: "/api/wajib-pajak?page=1&limit=25" },
    { name: "objek_pajak_list", path: "/api/objek-pajak?page=1&limit=25&includeUnverified=true" },
    { name: "master_rekening", path: "/api/master/rekening-pajak?includeInactive=true" },
    { name: "dashboard_summary", path: "/api/dashboard/summary?includeUnverified=true" },
    { name: "objek_pajak_map", path: "/api/objek-pajak/map?bbox=104,-4.6,104.2,-4.4&limit=100&includeUnverified=true" },
  ];

  const items: SmokeItem[] = [];
  for (const item of checklist) {
    items.push(
      await checkEndpoint({
        config,
        cookie,
        ...item,
      }),
    );
  }

  const failed = items.filter((item) => item.status === "fail");
  const finishedAt = new Date();
  const result = {
    status: failed.length === 0 ? "pass" : "fail",
    startedAt: startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationSec: Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000),
    baseUrl: config.baseUrl,
    checks: items,
  };

  printJson(result);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

run().catch((error) => {
  console.error("[ops-smoke-check] failed:", error);
  process.exit(1);
});
