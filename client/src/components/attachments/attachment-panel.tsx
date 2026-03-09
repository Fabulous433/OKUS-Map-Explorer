import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Eye, FileText, Image as ImageIcon, Paperclip, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
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
    <div className="space-y-3 border-[3px] border-black bg-[#fffaf0] p-4 shadow-[6px_6px_0_#00000010]">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="font-serif text-lg font-black uppercase text-black">{title}</p>
          <p className="font-mono text-[11px] uppercase tracking-wider text-gray-600">Preview, download, dan hapus bukti dokumen</p>
        </div>
        <Button
          type="button"
          className="rounded-none border-[2px] border-black bg-[#FFFF00] text-black font-mono text-xs font-bold"
          onClick={() => setUploadOpen(true)}
        >
          <Upload className="w-4 h-4 mr-2" />
          Upload
        </Button>
      </div>

      {isLoading ? (
        <div className="border-[2px] border-dashed border-black p-4 font-mono text-sm">Memuat attachment...</div>
      ) : rows.length === 0 ? (
        <div className="border-[2px] border-dashed border-black p-4 font-mono text-sm text-gray-600">
          Belum ada attachment untuk data ini.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((item) => {
            const downloadUrl = `${endpointBase}/${item.id}/download`;
            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 border-[2px] border-black bg-white p-3 transition-all duration-150 hover:-translate-y-[1px] hover:shadow-[4px_4px_0_#000]"
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center border-[2px] border-black bg-black text-[#FFFF00]">
                    {isImage(item.mimeType) ? <ImageIcon className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 space-y-1">
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
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-none border-[2px] border-black font-mono text-xs"
                    onClick={() => setPreviewItem(item)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Lihat
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-none border-[2px] border-black font-mono text-xs"
                    onClick={() => window.open(downloadUrl, "_blank", "noopener,noreferrer")}
                  >
                    <Paperclip className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-none border-[2px] border-red-600 text-red-600 font-mono text-xs"
                    onClick={() => deleteMutation.mutate(item.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Hapus
                  </Button>
                </div>
              </div>
            );
          })}
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
