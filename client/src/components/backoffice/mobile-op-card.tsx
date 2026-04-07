import { CheckCircle2, Edit, Eye, MapPin, Trash2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { ObjekPajakListItem, WajibPajakListItem } from "@shared/schema";
import { jenisPajakColor, shortLabel } from "@/pages/backoffice/objek-pajak-shared";

type MobileOpCardProps = {
 op: ObjekPajakListItem;
 wp?: WajibPajakListItem | null;
 canMutate: boolean;
 onEdit: (id: number) => void;
 onView: (id: number) => void;
 onDelete: (id: number) => void;
 onVerify: (id: number) => void;
 onReject: (id: number) => void;
};

type ActionItem = {
 key: string;
 label: string;
 tooltip: string;
 icon: typeof Edit;
 className: string;
 onClick: () => void;
};

function formatMoney(value?: string | number | null) {
 if (value === null || value === undefined || value === "") return "-";
 return `Rp ${Number(value).toLocaleString("id-ID")}`;
}

export function MobileOpCard({
 op,
 wp,
 canMutate,
 onEdit,
 onView,
 onDelete,
 onVerify,
 onReject,
}: MobileOpCardProps) {
 const wpLabel = wp?.displayName || op.wpDisplayName || "-";

 const actions: ActionItem[] = [
 {
 key: "view",
 label: "Lihat",
 tooltip: "Lihat detail",
 icon: Eye,
 className:
 "h-12 w-12 rounded-[16px] border border-white/80 bg-[#eef2f5] text-[#49515a] " +
 "shadow-[6px_6px_14px_rgba(148,163,184,0.22),-6px_-6px_14px_rgba(255,255,255,0.92)] " +
 "hover:bg-[#f5f7f9] hover:text-[#22272b]",
 onClick: () => onView(op.id),
 },
 ];

 if (canMutate) {
 actions.unshift({
 key: "edit",
 label: "Edit",
 tooltip: "Edit data",
 icon: Edit,
 className:
 "h-12 w-12 rounded-[16px] border border-white/80 bg-[#eef2f5] text-[#49515a] " +
 "shadow-[6px_6px_14px_rgba(148,163,184,0.22),-6px_-6px_14px_rgba(255,255,255,0.92)] " +
 "hover:bg-[#f5f7f9] hover:text-[#22272b]",
 onClick: () => onEdit(op.id),
 });

 actions.push(
 {
 key: "verify",
 label: "Verif",
 tooltip: "Verifikasi",
 icon: CheckCircle2,
 className: "h-12 w-12 rounded-[16px] border border-green-700 bg-white text-green-700 shadow-none hover:bg-green-50",
 onClick: () => onVerify(op.id),
 },
 {
 key: "reject",
 label: "Tolak",
 tooltip: "Tolak data",
 icon: XCircle,
 className: "h-12 w-12 rounded-[16px] border border-red-700 bg-white text-red-700 shadow-none hover:bg-red-50",
 onClick: () => onReject(op.id),
 },
 );

 if (op.status !== "active") {
 actions.push({
 key: "delete",
 label: "Hapus",
 tooltip: "Hapus data",
 icon: Trash2,
 className: "h-12 w-12 rounded-[16px] border border-red-600 bg-white text-red-600 shadow-none hover:bg-red-50",
 onClick: () => onDelete(op.id),
 });
 }
 }

 return (
 <article className="shadow-card bg-white p-4">
 <div className="flex items-start justify-between gap-3">
 <div className="min-w-0 space-y-2">
 <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-black/55">{op.nopd}</p>
 <p className="font-sans text-lg font-black leading-tight">{op.namaOp}</p>
 </div>
 <Badge
 className={`font-mono text-[10px] ${jenisPajakColor(op.jenisPajak)}`}
 >
 {shortLabel(op.jenisPajak)}
 </Badge>
 </div>

 <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
 <div className="col-span-2">
 <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/50">Wajib Pajak</p>
 <p className="mt-1 font-mono text-xs font-bold">{wpLabel}</p>
 </div>
 <div className="col-span-2">
 <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/50">Alamat</p>
 <p className="mt-1 flex items-start gap-2 font-mono text-xs font-bold">
 <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
 <span>{op.alamatOp}</span>
 </p>
 </div>
 <div>
 <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/50">Pajak/Bln</p>
 <p className="mt-1 font-mono text-xs font-bold">{formatMoney(op.pajakBulanan)}</p>
 </div>
 <div>
 <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/50">Detail</p>
 <div className="mt-1">
 {op.hasDetail ? (
 <Badge className="border border-green-600 bg-green-100 font-mono text-[10px] text-green-800">
 Lengkap
 </Badge>
 ) : (
 <Badge className="border border-orange-500 bg-orange-100 font-mono text-[10px] text-orange-700">
 Belum
 </Badge>
 )}
 </div>
 </div>
 </div>

 <div className="mt-4 flex flex-wrap gap-2">
 <Badge
 className={`font-mono text-[10px] ${
 op.status === "active" ? "bg-primary text-black" : "bg-gray-200 text-gray-600"
 }`}
 >
 {op.status.toUpperCase()}
 </Badge>
 <Badge
 className={`border font-mono text-[10px] ${
 op.statusVerifikasi === "verified"
 ? "border-green-700 bg-green-100 text-green-800"
 : op.statusVerifikasi === "rejected"
 ? "border-red-700 bg-red-100 text-red-800"
 : "border-yellow-700 bg-yellow-100 text-yellow-800"
 }`}
 >
 {op.statusVerifikasi.toUpperCase()}
 </Badge>
 </div>

 <div className="mt-4 rounded-[24px] bg-[#edf1f4] px-3 py-3 shadow-[inset_8px_8px_18px_rgba(148,163,184,0.14),inset_-8px_-8px_18px_rgba(255,255,255,0.96)]">
 <div
 className="grid gap-2"
 style={{ gridTemplateColumns: `repeat(${actions.length}, minmax(0, 1fr))` }}
 >
 {actions.map((action) => {
 const Icon = action.icon;
 return (
 <div key={action.key} className="flex min-w-0 flex-col items-center gap-1.5">
 <Tooltip>
 <TooltipTrigger asChild>
 <Button
 type="button"
 size="icon"
 variant="outline"
 className={action.className}
 aria-label={action.tooltip}
 onClick={action.onClick}
 >
 <Icon className="h-4 w-4" />
 </Button>
 </TooltipTrigger>
 <TooltipContent>{action.tooltip}</TooltipContent>
 </Tooltip>
 <span className="text-center font-mono text-[8px] font-bold uppercase tracking-[0.14em] text-black/55">
 {action.label}
 </span>
 </div>
 );
 })}
 </div>
 </div>
 </article>
 );
}
