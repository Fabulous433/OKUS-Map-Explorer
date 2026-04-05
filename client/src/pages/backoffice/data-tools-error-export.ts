import type { DataToolsEntity } from "./data-tools-config";
import { toExcelSafeCell } from "./data-tools-excel-safe";

export type ImportRunMode = "preview" | "import";

type ImportErrorCsvRow = {
  baris: string;
  pesan: string;
};

type CorrectionTemplateRowInput = {
  rowNumber: number;
  messages: string[];
  sourceRow: Record<string, string>;
};

type ImportAuditCsvRowInput = {
  rowNumber: number;
  action: "created" | "updated" | "skipped" | "failed";
  status: "valid" | "invalid";
  entityLabel: string;
  warnings: string[];
  messages: string[];
  resolutionSteps: string[];
  sourceRow: Record<string, string>;
};

function escapeCsvCell(value: unknown) {
  const normalized = value === null || value === undefined ? "" : String(value);
  if (/[",\r\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

function stringifyCsvRows(rows: Array<Record<string, string>>, columns: string[]) {
  const header = columns.map(escapeCsvCell).join(",");
  const lines = rows.map((row) => columns.map((column) => escapeCsvCell(row[column] ?? "")).join(","));
  return [header, ...lines].join("\n");
}

function parseImportError(error: string): ImportErrorCsvRow {
  const match = /^Baris\s+(\d+):\s*(.+)$/i.exec(error.trim());
  if (!match) {
    return {
      baris: "",
      pesan: error.trim(),
    };
  }

  return {
    baris: match[1],
    pesan: match[2],
  };
}

export function buildImportErrorCsv(errors: string[]) {
  const rows = errors.map(parseImportError);
  return stringifyCsvRows(rows, ["baris", "pesan"]);
}

export function buildImportErrorFileName(entity: DataToolsEntity, mode: ImportRunMode) {
  const normalizedEntity = entity.replace(/-/g, "_");
  return `${normalizedEntity}_${mode}_errors.csv`;
}

export function buildCorrectionTemplateCsv(rows: CorrectionTemplateRowInput[]) {
  const allSourceKeys = Array.from(
    new Set(rows.flatMap((row) => Object.keys(row.sourceRow))),
  );

  const data = rows.map((row) => ({
    error_baris: String(row.rowNumber),
    error_pesan: row.messages.join(" | "),
    ...Object.fromEntries(allSourceKeys.map((key) => [key, toExcelSafeCell(key, row.sourceRow[key] ?? "")])),
  }));

  return stringifyCsvRows(data, ["error_baris", "error_pesan", ...allSourceKeys]);
}

export function buildCorrectionTemplateFileName(entity: DataToolsEntity, mode: ImportRunMode) {
  const normalizedEntity = entity.replace(/-/g, "_");
  return `${normalizedEntity}_${mode}_corrections.csv`;
}

export function buildImportAuditCsv(rows: ImportAuditCsvRowInput[]) {
  const allSourceKeys = Array.from(new Set(rows.flatMap((row) => Object.keys(row.sourceRow))));

  const data = rows.map((row) => ({
    row_number: String(row.rowNumber),
    action: row.action,
    status: row.status,
    entity_label: row.entityLabel,
    warnings: row.warnings.join(" | "),
    messages: row.messages.join(" | "),
    resolution_steps: row.resolutionSteps.join(" | "),
    ...Object.fromEntries(allSourceKeys.map((key) => [key, toExcelSafeCell(key, row.sourceRow[key] ?? "")])),
  }));

  return stringifyCsvRows(data, [
    "row_number",
    "action",
    "status",
    "entity_label",
    "warnings",
    "messages",
    "resolution_steps",
    ...allSourceKeys,
  ]);
}

export function buildImportAuditFileName(entity: DataToolsEntity, mode: ImportRunMode) {
  const normalizedEntity = entity.replace(/-/g, "_");
  return `${normalizedEntity}_${mode}_report.csv`;
}
