import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parse as parseCsv } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";
import {
  formatTimestamp,
  isHelpRequested,
  parseArgs,
  printJson,
} from "./ops-utils";

const EXPORT_FREQUENCIES = ["daily", "weekly"] as const;
type ExportFrequency = (typeof EXPORT_FREQUENCIES)[number];
type ReportKind = "csv-endpoint" | "quality-json";

type ReportDefinition = {
  reportName: string;
  sourcePath: string;
  kind: ReportKind;
  filterSnapshot: Record<string, unknown>;
};

type ReportConfig = {
  frequency: ExportFrequency;
  baseUrl: string;
  outputRoot: string;
  username: string;
  password: string;
  retryAttempts: number;
  retryDelayMs: number;
  timeoutMs: number;
  generatedBy: string;
};

type ReportExecutionResult = {
  reportName: string;
  sourcePath: string;
  filePath: string;
  rowCount: number;
  durationMs: number;
};

const METADATA_COLUMNS = [
  "export_timestamp",
  "export_source",
  "filter_snapshot",
  "generated_by",
] as const;

function printHelp() {
  console.log(`Usage: tsx script/ops-report-export.ts [options]

Options:
  --frequency daily|weekly
  --base-url <url>
  --output-root <path>
  --username <username>
  --password <password>
  --retry-attempts <number>
  --retry-delay-ms <number>
  --timeout-ms <number>
  --generated-by <identity>

Examples:
  tsx script/ops-report-export.ts --frequency daily
  tsx script/ops-report-export.ts --frequency weekly --base-url http://127.0.0.1:5000
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

function parseFrequency(value: string | boolean | undefined): ExportFrequency {
  if (typeof value !== "string") return "daily";
  if (!EXPORT_FREQUENCIES.includes(value as ExportFrequency)) {
    throw new Error(`Invalid frequency: ${value}`);
  }
  return value as ExportFrequency;
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

function resolveReportConfig(args: Map<string, string | boolean>): ReportConfig {
  const frequency = parseFrequency(args.get("frequency"));
  const port = process.env.PORT?.trim() || "5000";

  const baseUrlArg = typeof args.get("base-url") === "string" ? String(args.get("base-url")) : undefined;
  const outputRootArg = typeof args.get("output-root") === "string" ? String(args.get("output-root")) : undefined;
  const usernameArg = typeof args.get("username") === "string" ? String(args.get("username")) : undefined;
  const passwordArg = typeof args.get("password") === "string" ? String(args.get("password")) : undefined;
  const generatedByArg = typeof args.get("generated-by") === "string" ? String(args.get("generated-by")) : undefined;

  const baseUrl = normalizeBaseUrl(baseUrlArg || process.env.REPORT_EXPORT_BASE_URL || `http://127.0.0.1:${port}`);
  const outputRoot = outputRootArg || process.env.REPORT_EXPORT_OUTPUT_DIR || "reports";
  const username = usernameArg || process.env.REPORT_EXPORT_USERNAME || "admin";
  const password = passwordArg || process.env.REPORT_EXPORT_PASSWORD || "admin123";
  const generatedBy = generatedByArg || process.env.REPORT_EXPORT_GENERATED_BY || "system";

  const retryAttempts = parsePositiveInt(
    typeof args.get("retry-attempts") === "string" ? String(args.get("retry-attempts")) : process.env.REPORT_EXPORT_RETRY_ATTEMPTS,
    3,
    "retry-attempts",
  );
  const retryDelayMs = parsePositiveInt(
    typeof args.get("retry-delay-ms") === "string" ? String(args.get("retry-delay-ms")) : process.env.REPORT_EXPORT_RETRY_DELAY_MS,
    300_000,
    "retry-delay-ms",
  );
  const timeoutMs = parsePositiveInt(
    typeof args.get("timeout-ms") === "string" ? String(args.get("timeout-ms")) : process.env.REPORT_EXPORT_TIMEOUT_MS,
    600_000,
    "timeout-ms",
  );

  if (username.trim().length === 0 || password.trim().length === 0) {
    throw new Error("username/password export tidak boleh kosong");
  }

  return {
    frequency,
    baseUrl,
    outputRoot,
    username,
    password,
    retryAttempts,
    retryDelayMs,
    timeoutMs,
    generatedBy,
  };
}

function getReportsForFrequency(frequency: ExportFrequency): ReportDefinition[] {
  if (frequency === "daily") {
    return [
      {
        reportName: "dashboard_summary",
        sourcePath: "/api/dashboard/summary/export?includeUnverified=true&groupBy=day",
        kind: "csv-endpoint",
        filterSnapshot: { includeUnverified: true, groupBy: "day" },
      },
      {
        reportName: "wajib_pajak_active",
        sourcePath: "/api/wajib-pajak/export",
        kind: "csv-endpoint",
        filterSnapshot: { statusAktif: "active|inactive(all from export endpoint)" },
      },
      {
        reportName: "objek_pajak_verification",
        sourcePath: "/api/objek-pajak/export",
        kind: "csv-endpoint",
        filterSnapshot: { source: "full export" },
      },
    ];
  }

  return [
    {
      reportName: "dashboard_trend",
      sourcePath: "/api/dashboard/summary/export?includeUnverified=true&groupBy=week",
      kind: "csv-endpoint",
      filterSnapshot: { includeUnverified: true, groupBy: "week" },
    },
    {
      reportName: "verification_backlog",
      sourcePath: "/api/objek-pajak/export",
      kind: "csv-endpoint",
      filterSnapshot: { source: "verification snapshot from objek pajak export" },
    },
    {
      reportName: "data_quality",
      sourcePath: "/api/quality/report",
      kind: "quality-json",
      filterSnapshot: { source: "quality-report aggregate" },
    },
  ];
}

function getCookieFromLoginResponse(response: Response) {
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

async function delay(ms: number) {
  await new Promise<void>((resolve) => setTimeout(resolve, ms));
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

async function loginAndGetCookie(config: ReportConfig) {
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
    throw new Error(`Login export gagal (${response.status}): ${bodyText}`);
  }

  const cookie = getCookieFromLoginResponse(response);
  if (!cookie) {
    throw new Error("Login berhasil tetapi cookie session tidak ditemukan");
  }
  return cookie;
}

function ensureCsvColumns(rows: Array<Record<string, string>>) {
  if (rows.length === 0) {
    return ["data_status"];
  }

  const seen = new Set<string>();
  const columns: string[] = [];
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (seen.has(key)) continue;
      seen.add(key);
      columns.push(key);
    }
  }
  return columns;
}

function parseCsvRows(rawCsv: string) {
  const parsed = parseCsv(rawCsv, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  }) as Array<Record<string, unknown>>;

  return parsed.map((row) => {
    const next: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      next[key] = value === undefined || value === null ? "" : String(value);
    }
    return next;
  });
}

function csvWithMetadata(params: {
  rows: Array<Record<string, string>>;
  sourcePath: string;
  generatedBy: string;
  filterSnapshot: Record<string, unknown>;
  exportedAtIso: string;
}) {
  const rows = params.rows.length > 0
    ? params.rows
    : [{ data_status: "empty" }];
  const dataColumns = ensureCsvColumns(rows);

  const mapped = rows.map((row) => ({
    export_timestamp: params.exportedAtIso,
    export_source: params.sourcePath,
    filter_snapshot: JSON.stringify(params.filterSnapshot),
    generated_by: params.generatedBy,
    ...row,
  }));

  const columns = [...METADATA_COLUMNS, ...dataColumns];
  return stringify(mapped, {
    header: true,
    columns,
  });
}

function qualityReportToRows(payload: Record<string, unknown>) {
  const rows: Array<Record<string, string>> = [];
  const totals = (payload.totals ?? {}) as Record<string, unknown>;
  const duplicateIndicators = (payload.duplicateIndicators ?? {}) as Record<string, unknown>;
  const missingCritical = (payload.missingCriticalFields ?? {}) as Record<string, unknown>;
  const invalidGeo = (payload.invalidGeoRange ?? {}) as Record<string, unknown>;

  for (const [metric, value] of Object.entries(totals)) {
    rows.push({
      section: "totals",
      metric,
      value: String(value ?? ""),
      related_ids: "",
    });
  }

  for (const [metric, value] of Object.entries(duplicateIndicators)) {
    rows.push({
      section: "duplicate_indicators",
      metric,
      value: String(value ?? ""),
      related_ids: "",
    });
  }

  rows.push({
    section: "missing_critical_fields",
    metric: "count",
    value: String(missingCritical.count ?? ""),
    related_ids: Array.isArray(missingCritical.relatedIds)
      ? missingCritical.relatedIds.map((item) => String(item)).join("|")
      : "",
  });
  rows.push({
    section: "invalid_geo_range",
    metric: "count",
    value: String(invalidGeo.count ?? ""),
    related_ids: Array.isArray(invalidGeo.relatedIds)
      ? invalidGeo.relatedIds.map((item) => String(item)).join("|")
      : "",
  });

  if (rows.length === 0) {
    rows.push({
      section: "summary",
      metric: "data_status",
      value: "empty",
      related_ids: "",
    });
  }

  return rows;
}

async function fetchCsvReport(params: {
  config: ReportConfig;
  cookie: string;
  report: ReportDefinition;
  exportedAtIso: string;
}) {
  const response = await fetchWithTimeout(
    `${params.config.baseUrl}${params.report.sourcePath}`,
    {
      method: "GET",
      headers: {
        cookie: params.cookie,
      },
    },
    params.config.timeoutMs,
  );

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(`Export CSV gagal (${response.status}) ${params.report.sourcePath}: ${bodyText}`);
  }

  const rawCsv = await response.text();
  const rows = parseCsvRows(rawCsv);
  return csvWithMetadata({
    rows,
    sourcePath: params.report.sourcePath,
    generatedBy: params.config.generatedBy,
    filterSnapshot: params.report.filterSnapshot,
    exportedAtIso: params.exportedAtIso,
  });
}

async function fetchQualityReportCsv(params: {
  config: ReportConfig;
  cookie: string;
  report: ReportDefinition;
  exportedAtIso: string;
}) {
  const response = await fetchWithTimeout(
    `${params.config.baseUrl}${params.report.sourcePath}`,
    {
      method: "GET",
      headers: {
        cookie: params.cookie,
      },
    },
    params.config.timeoutMs,
  );

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(`Quality report gagal (${response.status}) ${params.report.sourcePath}: ${bodyText}`);
  }

  const payload = (await response.json()) as Record<string, unknown>;
  const rows = qualityReportToRows(payload);
  return csvWithMetadata({
    rows,
    sourcePath: params.report.sourcePath,
    generatedBy: params.config.generatedBy,
    filterSnapshot: params.report.filterSnapshot,
    exportedAtIso: params.exportedAtIso,
  });
}

async function runWithRetry<T>(params: {
  attempts: number;
  retryDelayMs: number;
  fn: () => Promise<T>;
}) {
  let lastError: unknown = null;
  for (let attempt = 1; attempt <= params.attempts; attempt += 1) {
    try {
      return await params.fn();
    } catch (error) {
      lastError = error;
      if (attempt >= params.attempts) break;
      await delay(params.retryDelayMs);
    }
  }
  throw lastError;
}

function buildOutputDirectory(root: string, frequency: ExportFrequency, now: Date) {
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return path.resolve(root, frequency, year, month, day);
}

async function run() {
  const args = parseArgs(process.argv.slice(2));
  if (isHelpRequested(args)) {
    printHelp();
    return;
  }

  const config = resolveReportConfig(args);
  const now = new Date();
  const outputDir = buildOutputDirectory(config.outputRoot, config.frequency, now);
  const reports = getReportsForFrequency(config.frequency);
  const timestamp = formatTimestamp(now);
  await mkdir(outputDir, { recursive: true });

  const cookie = await loginAndGetCookie(config);
  const results: ReportExecutionResult[] = [];

  for (const report of reports) {
    const startedAt = Date.now();
    const exportedAtIso = new Date().toISOString();

    const csvContent = await runWithRetry({
      attempts: config.retryAttempts,
      retryDelayMs: config.retryDelayMs,
      fn: async () => {
        if (report.kind === "csv-endpoint") {
          return fetchCsvReport({
            config,
            cookie,
            report,
            exportedAtIso,
          });
        }

        return fetchQualityReportCsv({
          config,
          cookie,
          report,
          exportedAtIso,
        });
      },
    });

    const fileName = `${report.reportName}_${config.frequency}_${timestamp}.csv`;
    const filePath = path.resolve(outputDir, fileName);
    await writeFile(filePath, csvContent, "utf8");

    const rowCount = Math.max(csvContent.split(/\r?\n/).length - 1, 0);
    results.push({
      reportName: report.reportName,
      sourcePath: report.sourcePath,
      filePath,
      rowCount,
      durationMs: Date.now() - startedAt,
    });
  }

  printJson({
    status: "ok",
    frequency: config.frequency,
    processedAt: new Date().toISOString(),
    outputDir,
    reports: results,
  });
}

run().catch((error) => {
  console.error("[ops-report-export] failed:", error);
  process.exit(1);
});
