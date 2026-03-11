import { CheckCircle2, Edit, History, MapPin, Trash2, XCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { ObjekPajakListItem, WajibPajakListItem } from "@shared/schema";
import { jenisPajakColor, shortLabel } from "@/pages/backoffice/objek-pajak-shared";

type MobileOpCardProps = {
 op: ObjekPajakListItem;
 wp?: WajibPajakListItem | null;
 canMutate: boolean;
 onEdit: (id: number) => void;
 onAudit: (id: number) => void;
 onDelete: (id: number) => void;
 onVerify: (id: number) => void;
 onReject: (id: number) => void;
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
 onAudit,
 onDelete,
 onVerify,
 onReject,
}: MobileOpCardProps) {
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
 <p className="mt-1 font-mono text-xs font-bold">{wp?.displayName || "-"}</p>
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

 <div className="mt-4 grid grid-cols-2 gap-2">
 {canMutate ? (
 <Button
 type="button"
 variant="outline"
 className="font-mono text-[11px] font-bold"
 onClick={() => onEdit(op.id)}
 >
 <Edit className="mr-2 h-4 w-4" />
 Edit
 </Button>
 ) : null}
 <Button
 type="button"
 variant="outline"
 className="font-mono text-[11px] font-bold"
 onClick={() => onAudit(op.id)}
 >
 <History className="mr-2 h-4 w-4" />
 Riwayat
 </Button>
 {canMutate ? (
 <Button
 type="button"
 variant="outline"
 className="border border-green-700 font-mono text-[11px] font-bold text-green-700"
 onClick={() => onVerify(op.id)}
 >
 <CheckCircle2 className="mr-2 h-4 w-4" />
 Verifikasi
 </Button>
 ) : null}
 {canMutate ? (
 <Button
 type="button"
 variant="outline"
 className="border border-red-700 font-mono text-[11px] font-bold text-red-700"
 onClick={() => onReject(op.id)}
 >
 <XCircle className="mr-2 h-4 w-4" />
 Tolak
 </Button>
 ) : null}
 {canMutate ? (
 <Button
 type="button"
 variant="outline"
 className="col-span-2 border border-red-600 font-mono text-[11px] font-bold text-red-600"
 onClick={() => onDelete(op.id)}
 >
 <Trash2 className="mr-2 h-4 w-4" />
 Hapus
 </Button>
 ) : null}
 </div>
 </article>
 );
}
