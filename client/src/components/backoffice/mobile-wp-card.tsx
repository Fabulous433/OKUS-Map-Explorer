import { History, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { WajibPajakListItem } from "@shared/schema";

type MobileWpCardProps = {
 wp: WajibPajakListItem;
 canMutate: boolean;
 onEdit: (wp: WajibPajakListItem) => void;
 onHistory: (wp: WajibPajakListItem) => void;
 onDelete: (id: number) => void;
};

function compactJenisLabel(jenisWp: string) {
 return jenisWp === "badan_usaha" ? "Badan Usaha" : "Orang Pribadi";
}

function compactPeranLabel(peranWp: string) {
 return peranWp === "pengelola" ? "Pengelola" : "Pemilik";
}

function compactStatusLabel(statusAktif: string) {
 return statusAktif === "inactive" ? "Inactive" : "Active";
}

export function MobileWpCard({ wp, canMutate, onEdit, onHistory, onDelete }: MobileWpCardProps) {
 const contact = wp.peranWp === "pengelola" ? wp.teleponWaPengelola : wp.teleponWaWp;
 const area = wp.peranWp === "pengelola"
 ? [wp.kecamatanPengelola, wp.kelurahanPengelola].filter(Boolean).join(" / ")
 : [wp.kecamatanWp, wp.kelurahanWp].filter(Boolean).join(" / ");

 return (
 <article className="shadow-card bg-white p-4">
 <div className="flex items-start justify-between gap-3">
 <div className="min-w-0 space-y-2">
 <p className="font-sans text-lg font-black leading-tight">{wp.displayName}</p>
 <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-black/55">
 NPWPD {wp.npwpd || "-"}
 </p>
 </div>
 <div className="flex flex-col items-end gap-2">
 <Badge className="bg-primary font-mono text-[10px] text-black">
 {compactStatusLabel(wp.statusAktif)}
 </Badge>
 <Badge className="bg-primary font-mono text-[10px] text-white">
 {compactPeranLabel(wp.peranWp)}
 </Badge>
 </div>
 </div>

 <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
 <div>
 <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/50">Jenis</p>
 <p className="mt-1 font-mono text-xs font-bold">{compactJenisLabel(wp.jenisWp)}</p>
 </div>
 <div>
 <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/50">Kontak</p>
 <p className="mt-1 font-mono text-xs font-bold">{contact || "-"}</p>
 </div>
 <div className="col-span-2">
 <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/50">Wilayah</p>
 <p className="mt-1 font-mono text-xs font-bold">{area || "-"}</p>
 </div>
 </div>

 <div className="mt-4 flex gap-2">
 {canMutate ? (
 <Button
 type="button"
 variant="outline"
 className="flex-1 font-mono text-[11px] font-bold"
 onClick={() => onEdit(wp)}
 >
 <Pencil className="mr-2 h-4 w-4" />
 Edit
 </Button>
 ) : null}
 <Button
 type="button"
 variant="outline"
 className="flex-1 font-mono text-[11px] font-bold"
 onClick={() => onHistory(wp)}
 >
 <History className="mr-2 h-4 w-4" />
 Riwayat
 </Button>
 {canMutate ? (
 <Button
 type="button"
 variant="outline"
 className="border border-red-600 px-3 font-mono text-[11px] font-bold text-red-600"
 onClick={() => onDelete(wp.id)}
 >
 <Trash2 className="h-4 w-4" />
 </Button>
 ) : null}
 </div>
 </article>
 );
}
