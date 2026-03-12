import { Eye, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { WajibPajakListItem } from "@shared/schema";

type MobileWpCardProps = {
 wp: WajibPajakListItem;
 canMutate: boolean;
 onEdit: (wp: WajibPajakListItem) => void;
 onView: (wp: WajibPajakListItem) => void;
 onDelete: (id: number) => void;
};

type ActionItem = {
 key: string;
 label: string;
 tooltip: string;
 icon: typeof Pencil;
 className: string;
 onClick: () => void;
};

function compactPeranLabel(peranWp: string) {
 return peranWp === "pengelola" ? "Pengelola" : "Pemilik";
}

function compactStatusLabel(statusAktif: string) {
 return statusAktif === "inactive" ? "Inactive" : "Active";
}

function activeAddress(wp: WajibPajakListItem) {
 return wp.peranWp === "pengelola" ? wp.alamatPengelola : wp.alamatWp;
}

function activeArea(wp: WajibPajakListItem) {
 return wp.peranWp === "pengelola"
 ? [wp.kecamatanPengelola, wp.kelurahanPengelola].filter(Boolean).join(" / ")
 : [wp.kecamatanWp, wp.kelurahanWp].filter(Boolean).join(" / ");
}

function activeNik(wp: WajibPajakListItem) {
 return wp.peranWp === "pengelola" ? wp.nikPengelola : wp.nikKtpWp;
}

function activeContact(wp: WajibPajakListItem) {
 return wp.peranWp === "pengelola" ? wp.teleponWaPengelola : wp.teleponWaWp;
}

export function MobileWpCard({ wp, canMutate, onEdit, onView, onDelete }: MobileWpCardProps) {
 const address = activeAddress(wp);
 const area = activeArea(wp);
 const nik = activeNik(wp);
 const contact = activeContact(wp);

 const actions: ActionItem[] = [{
 key: "view",
 label: "Lihat",
 tooltip: "Lihat detail",
 icon: Eye,
 className:
 "h-12 w-12 rounded-[16px] border border-white/80 bg-[#eef2f5] text-[#49515a] " +
 "shadow-[6px_6px_14px_rgba(148,163,184,0.22),-6px_-6px_14px_rgba(255,255,255,0.92)] " +
 "hover:bg-[#f5f7f9] hover:text-[#22272b]",
 onClick: () => onView(wp),
 }];

 if (canMutate) {
 actions.unshift({
 key: "edit",
 label: "Edit",
 tooltip: "Edit data",
 icon: Pencil,
 className:
 "h-12 w-12 rounded-[16px] border border-white/80 bg-[#eef2f5] text-[#49515a] " +
 "shadow-[6px_6px_14px_rgba(148,163,184,0.22),-6px_-6px_14px_rgba(255,255,255,0.92)] " +
 "hover:bg-[#f5f7f9] hover:text-[#22272b]",
 onClick: () => onEdit(wp),
 });

 if (wp.statusAktif !== "active") {
 actions.push({
 key: "delete",
 label: "Hapus",
 tooltip: "Hapus data",
 icon: Trash2,
 className: "h-12 w-12 rounded-[16px] border border-red-600 bg-white text-red-600 shadow-none hover:bg-red-50",
 onClick: () => onDelete(wp.id),
 });
 }
 }

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

 <div className="mt-4 space-y-3 border-t border-border pt-4">
 <div>
 <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/50">Alamat</p>
 <p className="mt-1 font-sans text-[15px] font-semibold leading-5 text-black">{address || "-"}</p>
 </div>
 <div>
 <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/50">Wilayah</p>
 <p className="mt-1 font-sans text-[13px] font-semibold leading-5 text-black">{area || "-"}</p>
 </div>
 <div className="grid grid-cols-2 gap-3">
 <div className="min-w-0">
 <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/50">NIK</p>
 <p className="mt-1 break-words font-sans text-[13px] font-semibold leading-5 text-black">{nik || "-"}</p>
 </div>
 <div className="min-w-0">
 <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/50">Kontak</p>
 <p className="mt-1 break-words font-sans text-[13px] font-semibold leading-5 text-black">{contact || "-"}</p>
 </div>
 </div>
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
