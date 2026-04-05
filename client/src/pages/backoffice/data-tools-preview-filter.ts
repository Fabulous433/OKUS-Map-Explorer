import type { DataToolsEntity } from "./data-tools-config";

export type PreviewRowAction = "created" | "updated" | "skipped" | "failed";
export type PreviewFilterKey = "all" | PreviewRowAction | "warning" | "resolution-failed";

export type PreviewRowFilterable = {
  action?: PreviewRowAction;
  status?: "valid" | "invalid";
  warnings?: string[];
  resolutionStatus: {
    wpResolved: boolean | null;
    rekeningResolved: boolean | null;
  } | null;
};

function resolveRowAction(row: PreviewRowFilterable): PreviewRowAction {
  if (row.action === "created" || row.action === "updated" || row.action === "skipped" || row.action === "failed") {
    return row.action;
  }

  return row.status === "invalid" ? "failed" : "updated";
}

function getRowWarnings(row: PreviewRowFilterable) {
  return Array.isArray(row.warnings) ? row.warnings : [];
}

export function getPreviewFilterOptions(entity: DataToolsEntity, rows: PreviewRowFilterable[]) {
  const base = [{ key: "all" as const, label: "Semua" }];
  const actionOptions = [
    { key: "created" as const, label: "Created" },
    { key: "updated" as const, label: "Updated" },
    { key: "skipped" as const, label: "Skipped" },
    { key: "failed" as const, label: "Failed" },
  ].filter((option) => rows.some((row) => resolveRowAction(row) === option.key));

  const warningOptions = rows.some((row) => getRowWarnings(row).length > 0)
    ? [{ key: "warning" as const, label: "Ada Warning" }]
    : [];

  const resolutionOptions =
    entity === "objek-pajak" &&
    rows.some(
      (row) =>
        row.resolutionStatus !== null &&
        (row.resolutionStatus.wpResolved === false || row.resolutionStatus.rekeningResolved === false),
    )
      ? [{ key: "resolution-failed" as const, label: "Gagal Resolusi" }]
      : [];

  return [...base, ...actionOptions, ...warningOptions, ...resolutionOptions];
}

export function filterPreviewRows<T extends PreviewRowFilterable>(
  entity: DataToolsEntity,
  rows: T[],
  filter: PreviewFilterKey,
) {
  if (filter === "all") return rows;
  if (filter === "warning") {
    return rows.filter((row) => getRowWarnings(row).length > 0);
  }
  if (filter === "created" || filter === "updated" || filter === "skipped" || filter === "failed") {
    return rows.filter((row) => resolveRowAction(row) === filter);
  }
  if (filter === "resolution-failed" && entity === "objek-pajak") {
    return rows.filter(
      (row) =>
        row.resolutionStatus !== null &&
        (row.resolutionStatus.wpResolved === false || row.resolutionStatus.rekeningResolved === false),
    );
  }
  return rows;
}
