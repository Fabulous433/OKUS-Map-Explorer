import { Badge } from "@/components/ui/badge";

const LABELS: Record<string, string> = {
 ktp: "KTP/NIK",
 npwp: "NPWP",
 surat_kuasa: "Surat Kuasa",
 dokumen_lain: "Dokumen Lain",
 foto_usaha: "Foto Usaha",
 foto_lokasi: "Foto Lokasi",
 izin_usaha: "Izin Usaha",
};

export function AttachmentTypeBadge({ documentType }: { documentType: string }) {
 return (
 <Badge className="bg-primary text-black font-mono text-[10px] uppercase">
 {LABELS[documentType] ?? documentType.replace(/_/g, " ")}
 </Badge>
 );
}
