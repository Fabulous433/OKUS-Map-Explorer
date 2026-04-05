import type { DataToolsEntity } from "./data-tools-config";
import type { ImportRunMode } from "./data-tools-error-export";
import type { PreviewRowAction } from "./data-tools-preview-filter";

const DATA_TOOLS_HISTORY_STORAGE_KEY = "okus-data-tools-import-history";
const DATA_TOOLS_HISTORY_LIMIT = 10;

export type DataToolsImportHistoryEntry = {
  id: string;
  entity: DataToolsEntity;
  mode: ImportRunMode;
  pinned: boolean;
  total: number;
  created: number;
  updated: number;
  skipped: number;
  success: number;
  failed: number;
  warnings: string[];
  createdAt: string;
  errors: string[];
  previewSummary: Record<string, number>;
  previewRows: Array<{
    rowNumber: number;
    action: PreviewRowAction;
    status: "valid" | "invalid";
    entityLabel: string;
    messages: string[];
    warnings: string[];
    resolutionSteps: string[];
    resolutionStatus: {
      wpResolved: boolean | null;
      rekeningResolved: boolean | null;
    } | null;
  }>;
};

function canUseLocalStorage() {
  return typeof globalThis !== "undefined" && typeof globalThis.localStorage !== "undefined";
}

function isDataToolsEntity(value: unknown): value is DataToolsEntity {
  return value === "wajib-pajak" || value === "objek-pajak";
}

function isImportRunMode(value: unknown): value is ImportRunMode {
  return value === "preview" || value === "import";
}

function sortImportHistoryEntries(a: DataToolsImportHistoryEntry, b: DataToolsImportHistoryEntry) {
  if (a.pinned !== b.pinned) {
    return a.pinned ? -1 : 1;
  }

  return b.createdAt.localeCompare(a.createdAt);
}

function normalizePreviewRows(value: unknown): DataToolsImportHistoryEntry["previewRows"] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((row) => typeof row === "object" && row !== null)
    .map((row) => row as Record<string, unknown>)
    .filter(
      (row) =>
        Number.isFinite(Number(row.rowNumber)) &&
        (row.status === "valid" || row.status === "invalid") &&
        typeof row.entityLabel === "string",
    )
    .map((row) => {
      const status = (row.status === "invalid" ? "invalid" : "valid") as "valid" | "invalid";
      const action =
        row.action === "created" || row.action === "updated" || row.action === "skipped" || row.action === "failed"
          ? (row.action as PreviewRowAction)
          : status === "invalid"
            ? "failed"
            : "updated";

      return {
        rowNumber: Number(row.rowNumber),
        action,
        status,
        entityLabel: row.entityLabel as string,
        messages: Array.isArray(row.messages) ? row.messages.map(String).slice(0, 5) : [],
        warnings: Array.isArray(row.warnings) ? row.warnings.map(String).slice(0, 5) : [],
        resolutionSteps: Array.isArray(row.resolutionSteps) ? row.resolutionSteps.map(String).slice(0, 5) : [],
        resolutionStatus:
          row.resolutionStatus && typeof row.resolutionStatus === "object"
            ? {
                wpResolved:
                  (row.resolutionStatus as Record<string, unknown>).wpResolved === null ||
                  (row.resolutionStatus as Record<string, unknown>).wpResolved === undefined
                    ? null
                    : Boolean((row.resolutionStatus as Record<string, unknown>).wpResolved),
                rekeningResolved:
                  (row.resolutionStatus as Record<string, unknown>).rekeningResolved === null ||
                  (row.resolutionStatus as Record<string, unknown>).rekeningResolved === undefined
                    ? null
                    : Boolean((row.resolutionStatus as Record<string, unknown>).rekeningResolved),
              }
            : null,
      };
    })
    .slice(0, 5);
}

export function normalizeImportHistoryEntries(value: unknown): DataToolsImportHistoryEntry[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((entry) => typeof entry === "object" && entry !== null)
    .map((entry) => entry as Record<string, unknown>)
    .filter(
      (entry) =>
        typeof entry.id === "string" &&
        isDataToolsEntity(entry.entity) &&
        isImportRunMode(entry.mode) &&
        typeof entry.createdAt === "string" &&
        Number.isFinite(Number(entry.total)) &&
        Number.isFinite(Number(entry.created ?? 0)) &&
        Number.isFinite(Number(entry.updated ?? 0)) &&
        Number.isFinite(Number(entry.skipped ?? 0)) &&
        Number.isFinite(Number(entry.success)) &&
        Number.isFinite(Number(entry.failed)),
    )
    .map((entry) => ({
      id: entry.id as string,
      entity: entry.entity as DataToolsEntity,
      mode: entry.mode as ImportRunMode,
      pinned: Boolean(entry.pinned),
      total: Number(entry.total),
      created: Number(entry.created ?? 0),
      updated: Number(entry.updated ?? 0),
      skipped: Number(entry.skipped ?? 0),
      success: Number(entry.success),
      failed: Number(entry.failed),
      warnings: Array.isArray(entry.warnings) ? entry.warnings.map(String).slice(0, 5) : [],
      createdAt: entry.createdAt as string,
      errors: Array.isArray(entry.errors) ? entry.errors.map(String).slice(0, 3) : [],
      previewSummary:
        entry.previewSummary && typeof entry.previewSummary === "object"
          ? Object.fromEntries(
              Object.entries(entry.previewSummary as Record<string, unknown>).map(([key, innerValue]) => [
                key,
                Number(innerValue ?? 0),
              ]),
            )
          : {},
      previewRows: normalizePreviewRows(entry.previewRows),
    }))
    .sort(sortImportHistoryEntries)
    .slice(0, DATA_TOOLS_HISTORY_LIMIT);
}

export function appendImportHistoryEntry(
  entries: DataToolsImportHistoryEntry[],
  nextEntry: DataToolsImportHistoryEntry,
) {
  return [nextEntry, ...entries].sort(sortImportHistoryEntries).slice(0, DATA_TOOLS_HISTORY_LIMIT);
}

export function togglePinnedImportHistoryEntry(
  entries: DataToolsImportHistoryEntry[],
  id: string,
) {
  return entries
    .map((entry) =>
      entry.id === id
        ? {
            ...entry,
            pinned: !entry.pinned,
          }
        : entry,
    )
    .sort(sortImportHistoryEntries)
    .slice(0, DATA_TOOLS_HISTORY_LIMIT);
}

export function removeImportHistoryEntry(entries: DataToolsImportHistoryEntry[], id: string) {
  return entries.filter((entry) => entry.id !== id).sort(sortImportHistoryEntries).slice(0, DATA_TOOLS_HISTORY_LIMIT);
}

export function loadDataToolsImportHistory(): DataToolsImportHistoryEntry[] {
  if (!canUseLocalStorage()) {
    return [];
  }

  try {
    const raw = globalThis.localStorage.getItem(DATA_TOOLS_HISTORY_STORAGE_KEY);
    if (!raw) {
      return [];
    }
    return normalizeImportHistoryEntries(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveDataToolsImportHistoryEntry(entry: DataToolsImportHistoryEntry) {
  if (!canUseLocalStorage()) {
    return [];
  }

  try {
    const current = loadDataToolsImportHistory();
    const next = appendImportHistoryEntry(current, entry);
    globalThis.localStorage.setItem(DATA_TOOLS_HISTORY_STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [];
  }
}

export function togglePinnedDataToolsImportHistoryEntry(id: string) {
  if (!canUseLocalStorage()) {
    return [];
  }

  try {
    const current = loadDataToolsImportHistory();
    const next = togglePinnedImportHistoryEntry(current, id);
    globalThis.localStorage.setItem(DATA_TOOLS_HISTORY_STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [];
  }
}

export function clearDataToolsImportHistory() {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    globalThis.localStorage.removeItem(DATA_TOOLS_HISTORY_STORAGE_KEY);
  } catch {
    // no-op
  }
}

export function removeDataToolsImportHistoryEntry(id: string) {
  if (!canUseLocalStorage()) {
    return [];
  }

  try {
    const current = loadDataToolsImportHistory();
    const next = removeImportHistoryEntry(current, id);
    globalThis.localStorage.setItem(DATA_TOOLS_HISTORY_STORAGE_KEY, JSON.stringify(next));
    return next;
  } catch {
    return [];
  }
}
