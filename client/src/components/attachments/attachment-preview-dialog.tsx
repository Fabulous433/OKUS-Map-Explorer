import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Download, Plus, Minus, RotateCcw } from "lucide-react";
import type { EntityAttachmentResponse } from "@shared/schema";

function isImage(mimeType: string) {
 return mimeType.startsWith("image/");
}

function isPdf(mimeType: string) {
 return mimeType === "application/pdf";
}

export function AttachmentPreviewDialog({
 open,
 onOpenChange,
 attachment,
 downloadUrl,
}: {
 open: boolean;
 onOpenChange: (open: boolean) => void;
 attachment: EntityAttachmentResponse | null;
 downloadUrl: string | null;
}) {
 if (!attachment || !downloadUrl) {
 return null;
 }

 const [zoom, setZoom] = useState(1);

 useEffect(() => {
 if (open) {
 setZoom(1);
 }
 }, [open, attachment?.id]);

 const canZoom = isImage(attachment.mimeType);

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="shadow-floating max-w-4xl bg-white p-0 max-h-[90vh] overflow-hidden">
 <DialogHeader className="p-4 border-b border-border bg-[#2d3436]">
 <DialogTitle className="font-sans text-xl font-black text-white uppercase">
 Preview Attachment
 </DialogTitle>
 <DialogDescription className="sr-only">
 Preview file attachment dengan opsi zoom untuk gambar dan tindakan buka atau download.
 </DialogDescription>
 </DialogHeader>
 <div className="p-4 space-y-4">
 <div className="flex items-center justify-between gap-3 flex-wrap">
 <div>
 <p className="font-mono text-sm font-bold text-black">{attachment.fileName}</p>
 <p className="font-mono text-[11px] text-gray-600">{attachment.mimeType}</p>
 </div>
 <div className="flex gap-2">
 {canZoom ? (
 <>
 <Button
 type="button"
 variant="outline"
 className="font-mono text-xs"
 onClick={() => setZoom((current) => Math.max(0.5, Number((current - 0.25).toFixed(2))))}
 >
 <Minus className="w-4 h-4 mr-2" />
 Zoom Out
 </Button>
 <Button
 type="button"
 variant="outline"
 className="font-mono text-xs"
 onClick={() => setZoom(1)}
 >
 <RotateCcw className="w-4 h-4 mr-2" />
 Reset
 </Button>
 <Button
 type="button"
 variant="outline"
 className="font-mono text-xs"
 onClick={() => setZoom((current) => Math.min(3, Number((current + 0.25).toFixed(2))))}
 >
 <Plus className="w-4 h-4 mr-2" />
 Zoom In
 </Button>
 </>
 ) : null}
 <Button
 type="button"
 variant="outline"
 className="font-mono text-xs"
 onClick={() => window.open(downloadUrl, "_blank", "noopener,noreferrer")}
 >
 <ExternalLink className="w-4 h-4 mr-2" />
 Buka
 </Button>
 <Button
 type="button"
 variant="outline"
 className="font-mono text-xs"
 onClick={() => window.open(downloadUrl, "_blank", "noopener,noreferrer")}
 >
 <Download className="w-4 h-4 mr-2" />
 Download
 </Button>
 </div>
 </div>

 <div className="shadow-card bg-[#f8f8f8] h-[65vh] overflow-auto">
 {isImage(attachment.mimeType) ? (
 <div className="flex min-h-full min-w-full items-center justify-center bg-white p-4">
 <img
 src={downloadUrl}
 alt={attachment.fileName}
 className="block max-h-full max-w-full object-contain"
 style={{
 transform: `scale(${zoom})`,
 transformOrigin: "center center",
 transition: "transform 180ms ease",
 }}
 />
 </div>
 ) : isPdf(attachment.mimeType) ? (
 <iframe src={downloadUrl} title={attachment.fileName} className="h-[65vh] w-full bg-white" />
 ) : (
 <div className="flex h-[420px] items-center justify-center p-6 text-center font-mono text-sm text-gray-600">
 Preview tidak tersedia untuk file ini. Gunakan tombol buka atau download.
 </div>
 )}
 </div>
 </div>
 </DialogContent>
 </Dialog>
 );
}
