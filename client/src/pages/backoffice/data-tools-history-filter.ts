import type { DataToolsEntity } from "./data-tools-config";
import type { DataToolsImportHistoryEntry } from "./data-tools-history";
import type { ImportRunMode } from "./data-tools-error-export";

export type HistoryEntityFilterKey = "all" | DataToolsEntity;
export type HistoryModeFilterKey = "all" | ImportRunMode;

export function filterImportHistoryEntries(
  entries: DataToolsImportHistoryEntry[],
  entityFilter: HistoryEntityFilterKey,
  modeFilter: HistoryModeFilterKey,
  searchTerm = "",
) {
  const normalizedSearchTerm = searchTerm.trim().toLowerCase();

  return entries.filter((entry) => {
    if (entityFilter !== "all" && entry.entity !== entityFilter) {
      return false;
    }

    if (modeFilter !== "all" && entry.mode !== modeFilter) {
      return false;
    }

    if (!normalizedSearchTerm) {
      return true;
    }

    if (normalizedSearchTerm === "pinned" || normalizedSearchTerm === "pin") {
      return entry.pinned;
    }

    if (normalizedSearchTerm === "unpinned" || normalizedSearchTerm === "unpin") {
      return !entry.pinned;
    }

    const warnings = Array.isArray(entry.warnings) ? entry.warnings : [];
    const previewRows = Array.isArray(entry.previewRows) ? entry.previewRows : [];
    const searchHaystack = [
      entry.entity,
      entry.entity === "wajib-pajak" ? "wajib pajak wp" : "objek pajak op",
      entry.mode,
      entry.mode === "preview" ? "dry run preview" : "import final",
      entry.pinned ? "pinned pin" : "tanpa pin",
      (entry.created ?? 0) > 0 ? "created dibuat" : "",
      (entry.updated ?? 0) > 0 ? "updated update" : "",
      (entry.skipped ?? 0) > 0 ? "skipped skip" : "",
      entry.failed > 0 ? "failed gagal" : "",
      warnings.length > 0 ? "warning peringatan" : "",
      entry.createdAt,
      ...warnings,
      ...entry.errors,
      ...previewRows.flatMap((row) => [
        row.action ?? "",
        ...(Array.isArray(row.messages) ? row.messages : []),
        ...(Array.isArray(row.warnings) ? row.warnings : []),
        ...(Array.isArray(row.resolutionSteps) ? row.resolutionSteps : []),
      ]),
    ]
      .join(" ")
      .toLowerCase();

    return searchHaystack.includes(normalizedSearchTerm);
  });
}

export function hasHistorySearchTerm(searchTerm: string) {
  return searchTerm.trim().length > 0;
}

export function getHistorySearchSummary(searchTerm: string) {
  const normalizedSearchTerm = searchTerm.trim();
  if (!normalizedSearchTerm) {
    return "";
  }

  return `Keyword: "${normalizedSearchTerm}"`;
}

export function getHistoryEntityFilterOptions(entries: DataToolsImportHistoryEntry[]) {
  const wpCount = entries.filter((entry) => entry.entity === "wajib-pajak").length;
  const opCount = entries.filter((entry) => entry.entity === "objek-pajak").length;

  return [
    { key: "all" as const, label: `Semua (${entries.length})` },
    { key: "wajib-pajak" as const, label: `WP (${wpCount})` },
    { key: "objek-pajak" as const, label: `OP (${opCount})` },
  ];
}

export function getHistoryModeFilterOptions(entries: DataToolsImportHistoryEntry[]) {
  const previewCount = entries.filter((entry) => entry.mode === "preview").length;
  const importCount = entries.filter((entry) => entry.mode === "import").length;

  return [
    { key: "all" as const, label: `Semua (${entries.length})` },
    { key: "preview" as const, label: `Preview (${previewCount})` },
    { key: "import" as const, label: `Import (${importCount})` },
  ];
}
