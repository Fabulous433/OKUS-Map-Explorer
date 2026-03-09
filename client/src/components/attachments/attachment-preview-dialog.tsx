import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Download } from "lucide-react";
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-none border-[4px] border-black max-w-4xl bg-white p-0 max-h-[90vh] overflow-hidden">
        <DialogHeader className="p-4 border-b-[3px] border-black bg-black">
          <DialogTitle className="font-serif text-xl font-black text-[#FFFF00] uppercase">
            Preview Attachment
          </DialogTitle>
        </DialogHeader>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="font-mono text-sm font-bold text-black">{attachment.fileName}</p>
              <p className="font-mono text-[11px] text-gray-600">{attachment.mimeType}</p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-none border-[2px] border-black font-mono text-xs"
                onClick={() => window.open(downloadUrl, "_blank", "noopener,noreferrer")}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Buka
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-none border-[2px] border-black font-mono text-xs"
                onClick={() => window.open(downloadUrl, "_blank", "noopener,noreferrer")}
              >
                <Download className="w-4 h-4 mr-2" />
                Download
              </Button>
            </div>
          </div>

          <div className="border-[3px] border-black bg-[#f8f8f8] min-h-[420px] max-h-[65vh] overflow-hidden">
            {isImage(attachment.mimeType) ? (
              <img src={downloadUrl} alt={attachment.fileName} className="h-full w-full object-contain bg-white" />
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
