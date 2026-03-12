import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Plus, Minus, RotateCcw } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
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
  const isMobile = useIsMobile();

 useEffect(() => {
 if (open) {
 setZoom(1);
 }
 }, [open, attachment?.id]);

  const canZoom = isImage(attachment.mimeType);
  const isMobilePdf = isMobile && isPdf(attachment.mimeType);
  const actionGroupClass = isMobile ? "grid grid-cols-2 gap-2" : "flex flex-wrap gap-2";
 const actionButtonClass = isMobile
 ? "h-10 justify-center rounded-[16px] px-2 py-0.5 font-mono text-[11px] uppercase"
 : "font-mono text-xs";

 return (
 <Dialog open={open} onOpenChange={onOpenChange}>
 <DialogContent className="shadow-floating grid h-[calc(100dvh-12px)] w-[calc(100vw-12px)] max-w-[calc(100vw-12px)] grid-rows-[auto_1fr] overflow-hidden bg-white p-0 sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-4xl">
 <DialogHeader className="border-b border-border bg-[#2d3436] p-4">
 <DialogTitle className="font-sans text-xl font-black text-white uppercase">
 Preview Attachment
 </DialogTitle>
 <DialogDescription className="sr-only">
 Preview file attachment dengan opsi zoom untuk gambar dan tindakan buka atau download.
 </DialogDescription>
 </DialogHeader>

 <div className="flex min-h-0 flex-1 flex-col gap-4 p-4">
 <div className="flex flex-wrap items-start justify-between gap-3">
 <div className="min-w-0">
 <p className="truncate font-mono text-sm font-bold text-black">{attachment.fileName}</p>
 <p className="font-mono text-[11px] text-gray-600">{attachment.mimeType}</p>
 </div>
 </div>

 <div className="min-h-0 flex-1 overflow-hidden rounded-[22px] bg-[#f8f8f8] shadow-card">
      {isImage(attachment.mimeType) ? (
        <div className="flex h-full items-center justify-center overflow-auto bg-white p-3 sm:p-4">
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
      ) : isMobilePdf ? (
        <div className="flex h-full min-h-[240px] flex-col items-center justify-center gap-4 bg-white p-6 text-center">
          <div className="space-y-2">
            <p className="font-sans text-base font-black text-black">Preview PDF belum tersedia di mobile</p>
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-black/55">
              Buka file untuk melihat dokumen PDF penuh.
            </p>
          </div>
          <Button
            type="button"
            className="h-11 rounded-[16px] bg-[#2d3436] px-4 font-mono text-[11px] uppercase text-white"
            onClick={() => window.open(downloadUrl, "_blank", "noopener,noreferrer")}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            Buka PDF
          </Button>
        </div>
      ) : isPdf(attachment.mimeType) ? (
        <iframe src={downloadUrl} title={attachment.fileName} className="h-full min-h-0 w-full bg-white" />
      ) : (
        <div className="flex h-full min-h-[240px] items-center justify-center p-6 text-center font-mono text-sm text-gray-600">
 Preview tidak tersedia untuk file ini. Gunakan tombol buka atau download.
 </div>
 )}
 </div>

 <div className={actionGroupClass}>
 {canZoom ? (
 <>
 <Button
 type="button"
 variant="outline"
 className={actionButtonClass}
 onClick={() => setZoom((current) => Math.max(0.5, Number((current - 0.25).toFixed(2))))}
 >
 <Minus className="mr-2 h-4 w-4" />
 Zoom Out
 </Button>
 <Button
 type="button"
 variant="outline"
 className={actionButtonClass}
 onClick={() => setZoom(1)}
 >
 <RotateCcw className="mr-2 h-4 w-4" />
 Reset
 </Button>
 <Button
 type="button"
 variant="outline"
 className={actionButtonClass}
 onClick={() => setZoom((current) => Math.min(3, Number((current + 0.25).toFixed(2))))}
 >
 <Plus className="mr-2 h-4 w-4" />
 Zoom In
 </Button>
 </>
 ) : null}
 <Button
 type="button"
 variant="outline"
 className={actionButtonClass}
 onClick={() => window.open(downloadUrl, "_blank", "noopener,noreferrer")}
 >
 <ExternalLink className="mr-2 h-4 w-4" />
 Buka
 </Button>
 </div>
 </div>
 </DialogContent>
 </Dialog>
 );
}
