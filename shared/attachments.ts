import { z } from "zod";

export const ATTACHMENT_ENTITY_TYPES = ["wajib_pajak", "objek_pajak"] as const;
export const WP_ATTACHMENT_TYPES = ["ktp", "npwp", "surat_kuasa", "dokumen_lain"] as const;
export const OP_ATTACHMENT_TYPES = ["foto_usaha", "foto_lokasi", "izin_usaha", "dokumen_lain"] as const;
export const ATTACHMENT_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const ATTACHMENT_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

export const attachmentEntityTypeSchema = z.enum(ATTACHMENT_ENTITY_TYPES);
export const wpAttachmentTypeSchema = z.enum(WP_ATTACHMENT_TYPES);
export const opAttachmentTypeSchema = z.enum(OP_ATTACHMENT_TYPES);
export const attachmentDocumentTypeSchema = z.string().trim().min(1).max(40);

export const entityAttachmentUploadMetadataSchema = z.object({
  documentType: attachmentDocumentTypeSchema,
  notes: z.string().trim().max(500).nullable().optional(),
});

export const entityAttachmentResponseSchema = z.object({
  id: z.string().trim().min(1).max(64),
  entityType: attachmentEntityTypeSchema,
  entityId: z.number().int().positive(),
  documentType: attachmentDocumentTypeSchema,
  fileName: z.string().trim().min(1).max(255),
  mimeType: z.string().trim().min(1).max(120),
  fileSize: z.number().int().nonnegative(),
  storagePath: z.string().trim().min(1).max(500),
  uploadedAt: z.union([z.string().datetime(), z.date()]),
  uploadedBy: z.string().trim().min(1).max(120),
  notes: z.string().trim().max(500).nullable().optional(),
});

export type AttachmentEntityType = z.infer<typeof attachmentEntityTypeSchema>;
export type WpAttachmentType = z.infer<typeof wpAttachmentTypeSchema>;
export type OpAttachmentType = z.infer<typeof opAttachmentTypeSchema>;
export type EntityAttachmentUploadMetadata = z.infer<typeof entityAttachmentUploadMetadataSchema>;
export type EntityAttachmentResponse = z.infer<typeof entityAttachmentResponseSchema>;
