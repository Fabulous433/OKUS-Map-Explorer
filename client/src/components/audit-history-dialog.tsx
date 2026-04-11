import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Clock3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type AuditItem = {
  id: number;
  entityType: string;
  entityId: string;
  action: string;
  actorName: string;
  beforeData: unknown;
  afterData: unknown;
  metadata: unknown;
  createdAt: string;
};

type AuditResponse = {
  data: AuditItem[];
  nextCursor: number | null;
  hasMore: boolean;
};

type ChangeColumns = {
  added: string[];
  changed: string[];
};

type AuditChangeEntry = {
  path: string;
  type: "added" | "changed" | "removed";
  beforeValue: unknown;
  afterValue: unknown;
};

const AUDIT_FIELD_LABELS: Record<string, string> = {
  id: "ID",
  nopd: "NOPD",
  wpId: "Wajib Pajak",
  rekPajakId: "Rekening Pajak",
  namaOp: "Nama Objek Pajak",
  npwpOp: "NPWPD Objek Pajak",
  status: "Status",
  alamatOp: "Alamat Objek Pajak",
  kecamatanId: "Kecamatan",
  kelurahanId: "Kelurahan",
  omsetBulanan: "Omset/Bulan",
  tarifPersen: "Tarif (%)",
  pajakBulanan: "Pajak/Bulan",
  detailPajak: "Detail Pajak",
  latitude: "Latitude",
  longitude: "Longitude",
  createdAt: "Waktu Dibuat",
  updatedAt: "Waktu Update",
  createdBy: "Dibuat Oleh",
  updatedBy: "Diubah Oleh",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function areComparableValuesEqual(left: unknown, right: unknown) {
  if (Object.is(left, right)) return true;

  if (Array.isArray(left) || Array.isArray(right)) {
    try {
      return JSON.stringify(left) === JSON.stringify(right);
    } catch {
      return false;
    }
  }

  return false;
}

function collectChangedColumns(beforeData: unknown, afterData: unknown, basePath = ""): ChangeColumns {
  const added: string[] = [];
  const changed: string[] = [];

  if (!isRecord(beforeData) && !isRecord(afterData)) {
    if (!areComparableValuesEqual(beforeData, afterData) && basePath) {
      changed.push(basePath);
    }
    return { added, changed };
  }

  const beforeRecord = isRecord(beforeData) ? beforeData : {};
  const afterRecord = isRecord(afterData) ? afterData : {};
  const keys = Array.from(new Set([...Object.keys(beforeRecord), ...Object.keys(afterRecord)]));

  for (const key of keys) {
    const path = basePath ? `${basePath}.${key}` : key;
    const hasBefore = Object.prototype.hasOwnProperty.call(beforeRecord, key);
    const hasAfter = Object.prototype.hasOwnProperty.call(afterRecord, key);
    const beforeValue = beforeRecord[key];
    const afterValue = afterRecord[key];

    if (!hasBefore && hasAfter) {
      added.push(path);
      continue;
    }

    if (hasBefore && !hasAfter) {
      changed.push(path);
      continue;
    }

    if (isRecord(beforeValue) || isRecord(afterValue)) {
      const nested = collectChangedColumns(beforeValue, afterValue, path);
      added.push(...nested.added);
      changed.push(...nested.changed);
      continue;
    }

    if (!areComparableValuesEqual(beforeValue, afterValue)) {
      changed.push(path);
    }
  }

  return { added, changed };
}

function formatColumnList(columns: string[]) {
  const uniqueColumns = Array.from(new Set(columns));
  if (uniqueColumns.length === 0) return "";
  if (uniqueColumns.length <= 12) return uniqueColumns.join(", ");
  return `${uniqueColumns.slice(0, 12).join(", ")}, +${uniqueColumns.length - 12} kolom lain`;
}

function humanizeIdentifier(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function toAuditLabel(path: string) {
  if (AUDIT_FIELD_LABELS[path]) {
    return AUDIT_FIELD_LABELS[path];
  }

  const segments = path.split(".");
  return segments
    .map((segment) => AUDIT_FIELD_LABELS[segment] ?? humanizeIdentifier(segment))
    .join(" > ");
}

function collectAuditChangeEntries(beforeData: unknown, afterData: unknown, basePath = ""): AuditChangeEntry[] {
  if (!isRecord(beforeData) && !isRecord(afterData)) {
    if (!areComparableValuesEqual(beforeData, afterData) && basePath) {
      return [
        {
          path: basePath,
          type: "changed",
          beforeValue: beforeData,
          afterValue: afterData,
        },
      ];
    }
    return [];
  }

  const beforeRecord = isRecord(beforeData) ? beforeData : {};
  const afterRecord = isRecord(afterData) ? afterData : {};
  const keys = Array.from(new Set([...Object.keys(beforeRecord), ...Object.keys(afterRecord)]));
  const entries: AuditChangeEntry[] = [];

  for (const key of keys) {
    const path = basePath ? `${basePath}.${key}` : key;
    const hasBefore = Object.prototype.hasOwnProperty.call(beforeRecord, key);
    const hasAfter = Object.prototype.hasOwnProperty.call(afterRecord, key);
    const beforeValue = beforeRecord[key];
    const afterValue = afterRecord[key];

    if (!hasBefore && hasAfter) {
      entries.push({
        path,
        type: "added",
        beforeValue: undefined,
        afterValue,
      });
      continue;
    }

    if (hasBefore && !hasAfter) {
      entries.push({
        path,
        type: "removed",
        beforeValue,
        afterValue: undefined,
      });
      continue;
    }

    if (isRecord(beforeValue) || isRecord(afterValue)) {
      entries.push(...collectAuditChangeEntries(beforeValue, afterValue, path));
      continue;
    }

    if (!areComparableValuesEqual(beforeValue, afterValue)) {
      entries.push({
        path,
        type: "changed",
        beforeValue,
        afterValue,
      });
    }
  }

  return entries;
}

function buildAuditSummary(item: AuditItem, entries: AuditChangeEntry[]) {
  if (item.action === "delete") {
    return "menghapus data objek pajak";
  }

  const { added, changed } = collectChangedColumns(item.beforeData, item.afterData);
  const addedLabels = added.map((column) => toAuditLabel(column));
  const changedLabels = changed.map((column) => toAuditLabel(column));

  if (entries.length === 0 && addedLabels.length === 0 && changedLabels.length === 0) {
    return "tidak ada perubahan kolom";
  }

  const addedText = formatColumnList(addedLabels);
  const changedText = formatColumnList(changedLabels);

  if (addedText && changedText) {
    return `menambah kolom ${addedText}; mengubah kolom ${changedText}`;
  }

  if (addedText) {
    return `menambah kolom ${addedText}`;
  }

  if (changedText) {
    return `mengubah kolom ${changedText}`;
  }

  return "tidak ada perubahan kolom";
}

function formatAuditValue(value: unknown) {
  if (value === undefined) return "(kosong)";
  if (value === null) return "(null)";

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "(kosong)";

    const timestamp = Date.parse(trimmed);
    if (!Number.isNaN(timestamp) && /^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
      return new Date(timestamp).toLocaleString("id-ID");
    }

    return trimmed;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export default function AuditHistoryDialog({
  open,
  onOpenChange,
  entityType,
  entityId,
  title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entityType: string;
  entityId: string | number | null;
  title: string;
}) {
  const [items, setItems] = useState<AuditItem[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [expandedItemIds, setExpandedItemIds] = useState<number[]>([]);

  const canLoad = useMemo(() => open && entityId !== null, [open, entityId]);

  const orderedItems = useMemo(() => {
    const clone = [...items];
    clone.sort((left, right) => {
      const leftTime = new Date(left.createdAt).getTime();
      const rightTime = new Date(right.createdAt).getTime();
      if (leftTime !== rightTime) return rightTime - leftTime;
      return right.id - left.id;
    });
    return clone;
  }, [items]);

  const itemModels = useMemo(
    () =>
      orderedItems.map((item) => {
        const entries = collectAuditChangeEntries(item.beforeData, item.afterData);
        return {
          item,
          entries,
          summary: buildAuditSummary(item, entries),
        };
      }),
    [orderedItems],
  );

  const fetchAudit = async (cursor?: number | null) => {
    if (!canLoad) return;
    const params = new URLSearchParams({
      entityType,
      entityId: String(entityId),
      limit: "10",
    });
    if (cursor) params.set("cursor", String(cursor));

    const res = await fetch(`/api/audit-log?${params.toString()}`);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(text || "Gagal memuat audit log");
    }

    return (await res.json()) as AuditResponse;
  };

  useEffect(() => {
    if (!canLoad) return;
    setIsLoading(true);
    setExpandedItemIds([]);
    fetchAudit()
      .then((result) => {
        if (!result) return;
        setItems(result.data || []);
        setNextCursor(result.nextCursor);
        setHasMore(Boolean(result.hasMore));
      })
      .catch(() => {
        setItems([]);
        setNextCursor(null);
        setHasMore(false);
      })
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canLoad, entityType, entityId]);

  const loadMore = async () => {
    if (!nextCursor || !hasMore) return;
    setIsLoadingMore(true);
    try {
      const result = await fetchAudit(nextCursor);
      if (!result) return;
      setItems((prev) => [...prev, ...(result.data || [])]);
      setNextCursor(result.nextCursor);
      setHasMore(Boolean(result.hasMore));
    } finally {
      setIsLoadingMore(false);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedItemIds((prev) => (prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto bg-white p-0 shadow-floating">
        <DialogHeader className="border-b border-border bg-[#2d3436] p-4">
          <DialogTitle className="flex items-center gap-2 font-sans text-xl font-black text-white">
            <Clock3 className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription className="sr-only">Riwayat audit perubahan data dalam format ringkas.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 p-4">
          {isLoading ? (
            <div className="font-mono text-sm">Memuat riwayat...</div>
          ) : items.length === 0 ? (
            <div className="font-mono text-sm text-gray-500">Belum ada data riwayat.</div>
          ) : (
            itemModels.map((model, index) => {
              const isExpanded = expandedItemIds.includes(model.item.id);
              return (
                <div key={model.item.id} className="rounded-xl border border-black/10 bg-white p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-mono text-[12px] leading-5 text-[#1f2937]">
                      {`Perubahan ke - ${index + 1} --- ${new Date(model.item.createdAt).toLocaleString("id-ID")} --- ${model.summary} --- oleh ${model.item.actorName || "-"}`}
                    </p>
                    {model.entries.length > 0 ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-8 shrink-0 px-2 font-mono text-[10px] uppercase tracking-[0.14em]"
                        onClick={() => toggleExpand(model.item.id)}
                      >
                        {isExpanded ? <ChevronUp className="mr-1 h-3.5 w-3.5" /> : <ChevronDown className="mr-1 h-3.5 w-3.5" />}
                        {isExpanded ? "Tutup" : "Detail"}
                      </Button>
                    ) : null}
                  </div>

                  {isExpanded ? (
                    <div className="mt-3 space-y-2 border-t border-black/10 pt-3">
                      {model.entries.map((entry) => (
                        <div key={`${model.item.id}-${entry.path}-${entry.type}`} className="rounded-lg border border-black/10 bg-[#f7f8fb] p-2">
                          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-black/55">{toAuditLabel(entry.path)}</p>
                          <p className="mt-1 font-mono text-[11px] text-black/65">{formatAuditValue(entry.beforeValue)}</p>
                          <p className="font-mono text-[11px] font-bold text-black">{`→ ${formatAuditValue(entry.afterValue)}`}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })
          )}

          {hasMore ? (
            <Button variant="outline" className="font-mono text-xs" onClick={loadMore} disabled={isLoadingMore}>
              {isLoadingMore ? "Memuat..." : "Muat Riwayat Berikutnya"}
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
