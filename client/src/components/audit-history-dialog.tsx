import { useEffect, useMemo, useState } from "react";
import { Clock3 } from "lucide-react";
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

function formatJson(value: unknown) {
 if (value === null || value === undefined) return "-";
 try {
 return JSON.stringify(value, null, 2);
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

 const canLoad = useMemo(() => open && entityId !== null, [open, entityId]);

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

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="shadow-floating max-w-3xl bg-white p-0 max-h-[90vh] overflow-y-auto">
 <DialogHeader className="p-4 border-b border-border bg-[#2d3436]">
 <DialogTitle className="font-sans text-xl font-black text-white flex items-center gap-2">
 <Clock3 className="w-5 h-5" />
 {title}
 </DialogTitle>
 <DialogDescription className="sr-only">
 Riwayat audit perubahan data beserta nilai sebelum dan sesudah perubahan.
 </DialogDescription>
 </DialogHeader>
 <div className="p-4 space-y-3">
 {isLoading ? (
 <div className="font-mono text-sm">Memuat riwayat...</div>
 ) : items.length === 0 ? (
 <div className="font-mono text-sm text-gray-500">Belum ada data riwayat.</div>
 ) : (
 items.map((item) => (
 <div key={item.id} className="p-3 space-y-2">
 <div className="flex items-center justify-between gap-2 flex-wrap">
 <div className="font-mono text-xs font-bold uppercase">{item.action}</div>
 <div className="font-mono text-[11px] text-gray-600">
 {new Date(item.createdAt).toLocaleString("id-ID")} - {item.actorName}
 </div>
 </div>
 <div className="grid md:grid-cols-2 gap-2">
 <div>
 <div className="font-mono text-[10px] font-bold mb-1">BEFORE</div>
 <pre className="bg-gray-50 border border-gray-300 p-2 text-[10px] overflow-auto max-h-36">{formatJson(item.beforeData)}</pre>
 </div>
 <div>
 <div className="font-mono text-[10px] font-bold mb-1">AFTER</div>
 <pre className="bg-gray-50 border border-gray-300 p-2 text-[10px] overflow-auto max-h-36">{formatJson(item.afterData)}</pre>
 </div>
 </div>
 </div>
 ))
 )}
 {hasMore && (
 <Button
 variant="outline"
 className="font-mono text-xs"
 onClick={loadMore}
 disabled={isLoadingMore}
 >
 {isLoadingMore ? "Memuat..." : "Muat Riwayat Berikutnya"}
 </Button>
 )}
 </div>
 </DialogContent>
 </Dialog>
 );
}
