import type { DataToolsEntity } from "./data-tools-config";
import type { PreviewRowAction } from "./data-tools-preview-filter";

type PreviewRowBadgeInput = {
  action?: PreviewRowAction;
  status?: "valid" | "invalid";
  warnings?: string[];
  resolutionSteps: string[];
  resolutionStatus: {
    wpResolved: boolean | null;
    rekeningResolved: boolean | null;
  } | null;
};

export type PreviewRowBadge = {
  label: string;
  tone: "neutral" | "success" | "warning";
};

function resolvePreviewAction(row: PreviewRowBadgeInput): PreviewRowAction {
  if (row.action === "created" || row.action === "updated" || row.action === "skipped" || row.action === "failed") {
    return row.action;
  }

  return row.status === "invalid" ? "failed" : "updated";
}

export function buildPreviewRowBadges(entity: DataToolsEntity, row: PreviewRowBadgeInput): PreviewRowBadge[] {
  const action = resolvePreviewAction(row);
  const actionBadge: PreviewRowBadge =
    action === "created"
      ? { label: "CREATED", tone: "success" }
      : action === "updated"
        ? { label: "UPDATED", tone: "success" }
        : action === "skipped"
          ? { label: "SKIPPED", tone: "neutral" }
          : { label: "FAILED", tone: "warning" };
  const badges: PreviewRowBadge[] = [actionBadge];

  if (Array.isArray(row.warnings) && row.warnings.length > 0) {
    badges.push({ label: "ADA WARNING", tone: "warning" });
  }

  if (entity === "wajib-pajak") {
    const usesCompact = row.resolutionSteps.some((step) => step.toLowerCase().includes("header compact"));
    badges.push({
      label: usesCompact ? "HEADER COMPACT" : "HEADER LEGACY",
      tone: "neutral",
    });
    return badges;
  }

  if (row.resolutionStatus?.wpResolved === true) {
    badges.push({ label: "NPWPD OK", tone: "success" });
  } else if (row.resolutionStatus?.wpResolved === false) {
    badges.push({ label: "NPWPD GAGAL", tone: "warning" });
  }

  if (row.resolutionStatus?.rekeningResolved === true) {
    badges.push({ label: "REKENING OK", tone: "success" });
  } else if (row.resolutionStatus?.rekeningResolved === false) {
    badges.push({ label: "REKENING GAGAL", tone: "warning" });
  }

  return badges;
}
