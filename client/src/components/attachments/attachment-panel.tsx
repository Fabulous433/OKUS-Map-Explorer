import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Eye, FileText, Image as ImageIcon, Paperclip, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import type { EntityAttachmentResponse } from "@shared/schema";
import { AttachmentPreviewDialog } from "./attachment-preview-dialog";
import { AttachmentUploadDialog } from "./attachment-upload-dialog";
import { AttachmentTypeBadge } from "./attachment-type-badge";

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function isImage(mimeType: string) {
  return mimeType.startsWith("image/");
}

function buildQueryKey(entityType: "wajib_pajak" | "objek_pajak", entityId: number) {
  return [`/api/${entityType === "wajib_pajak" ? "wajib-pajak" : "objek-pajak"}/${entityId}/attachments`];
}

export function AttachmentPanel({
  entityType,
  entityId,
  title,
  documentTypeOptions,
}: {
  entityType: "wajib_pajak" | "objek_pajak";
  entityId: number;
  title: string;
  documentTypeOptions: Array<{ value: string; label: string }>;
}) {
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [previewItem, setPreviewItem] = useState<EntityAttachmentResponse | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const endpointBase = `/api/${entityType === "wajib_pajak" ? "wajib-pajak" : "objek-pajak"}/${entityId}/attachments`;
  const queryKey = useMemo(() => buildQueryKey(entityType, entityId), [entityType, entityId]);

  const { data, isLoading } = useQuery<EntityAttachmentResponse[]>({
    queryKey,
    enabled: entityId > 0,
  });

  const deleteMutation = useMutation({
    mutationFn: async (attachmentId: string) => {
      const response = await apiRequest("DELETE", `${endpointBase}/${attachmentId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast({ title: "Berhasil", description: "Attachment berhasil dihapus" });
    },
    onError: (error: Error) => {
      toast({ title: "Gagal", description: error.message, variant: "destructive" });
    },
  });

  const rows = data ?? [];

  return (
    <div className="space-y-3 bg-background p-4 shadow-card">
      <div className="space-y-1">
        <p className="font-sans text-lg font-black uppercase text-black">{title}</p>
        <p className="font-mono text-[11px] uppercase tracking-wider text-gray-600">
          Preview, download, dan hapus bukti dokumen
        </p>
      </div>

      {isLoading ? (
        <div className="border border-dashed border-border p-4 font-mono text-sm">Memuat attachment...</div>
      ) : rows.length === 0 ? (
        <div className="space-y-3">
          <div className="border border-dashed border-border p-4 font-mono text-sm text-gray-600">
            Belum ada attachment untuk data ini.
          </div>
          <div className={`flex ${isMobile ? "justify-end" : "justify-start"}`}>
            <Button
              type="button"
              className="bg-primary text-black font-mono text-xs font-bold"
              onClick={() => setUploadOpen(true)}
              aria-label="Upload attachment"
            >
              <Upload className="h-4 w-4" />
              {!isMobile ? <span className="ml-2">Upload</span> : null}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((item) => {
            const downloadUrl = `${endpointBase}/${item.id}/download`;
            return (
              <div
                key={item.id}
                className="bg-white p-3 transition-all duration-150 hover:-translate-y-0.5 hover:shadow-floating"
              >
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center bg-[#2d3436] text-white">
                    {isImage(item.mimeType) ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <AttachmentTypeBadge documentType={item.documentType} />
                      <span className="font-mono text-[11px] text-gray-600">{formatBytes(item.fileSize)}</span>
                    </div>
                    <p className="truncate font-mono text-sm font-bold text-black">{item.fileName}</p>
                    <p className="font-mono text-[11px] text-gray-600">
                      {item.uploadedBy} • {formatDate(item.uploadedAt)}
                    </p>
                    {item.notes ? <p className="font-mono text-[11px] text-black/75">{item.notes}</p> : null}
                  </div>
                </div>
                <div className={`mt-3 flex flex-wrap gap-2 ${isMobile ? "justify-end" : "items-center"}`}>
                  <Button
                    type="button"
                    variant="outline"
                    className="font-mono text-xs"
                    onClick={() => setPreviewItem(item)}
                    aria-label="Lihat attachment"
                  >
                    <Eye className="h-4 w-4" />
                    {!isMobile ? <span className="ml-2">Lihat</span> : null}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="font-mono text-xs"
                    onClick={() => window.open(downloadUrl, "_blank", "noopener,noreferrer")}
                    aria-label="Download attachment"
                  >
                    <Paperclip className="h-4 w-4" />
                    {!isMobile ? <span className="ml-2">Download</span> : null}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="border border-red-600 text-red-600 font-mono text-xs"
                    onClick={() => deleteMutation.mutate(item.id)}
                    aria-label="Hapus attachment"
                  >
                    <Trash2 className="h-4 w-4" />
                    {!isMobile ? <span className="ml-2">Hapus</span> : null}
                  </Button>
                </div>
              </div>
            );
          })}
          <div className={`flex ${isMobile ? "justify-end" : "justify-start"}`}>
            <Button
              type="button"
              className="bg-primary text-black font-mono text-xs font-bold"
              onClick={() => setUploadOpen(true)}
              aria-label="Upload attachment"
            >
              <Upload className="h-4 w-4" />
              {!isMobile ? <span className="ml-2">Upload</span> : null}
            </Button>
          </div>
        </div>
      )}

      <AttachmentUploadDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        endpoint={endpointBase}
        title={`Upload ${title}`}
        documentTypeOptions={documentTypeOptions}
        onUploaded={() => queryClient.invalidateQueries({ queryKey })}
      />

      <AttachmentPreviewDialog
        open={!!previewItem}
        onOpenChange={(open) => {
          if (!open) setPreviewItem(null);
        }}
        attachment={previewItem}
        downloadUrl={previewItem ? `${endpointBase}/${previewItem.id}/download` : null}
      />
    </div>
  );
}
