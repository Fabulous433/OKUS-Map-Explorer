import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { env } from "./env";

function sanitizeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "") || "file";
}

function resolveStorageRoot() {
  return path.resolve(process.cwd(), env.ATTACHMENTS_STORAGE_ROOT);
}

export async function ensureAttachmentStorageRoot() {
  const root = resolveStorageRoot();
  await mkdir(root, { recursive: true });
  return root;
}

export async function saveAttachmentBuffer(params: {
  entityType: "wajib_pajak" | "objek_pajak";
  entityId: number;
  documentType: string;
  originalFileName: string;
  buffer: Buffer;
}) {
  const root = await ensureAttachmentStorageRoot();
  const safeEntityType = sanitizeSegment(params.entityType);
  const safeDocumentType = sanitizeSegment(params.documentType);
  const safeOriginalName = sanitizeSegment(path.basename(params.originalFileName));
  const attachmentId = randomUUID();
  const dir = path.join(root, safeEntityType, String(params.entityId), safeDocumentType);
  await mkdir(dir, { recursive: true });

  const fileName = `${attachmentId}-${safeOriginalName}`;
  const absolutePath = path.join(dir, fileName);
  await writeFile(absolutePath, params.buffer);

  const storagePath = path.relative(root, absolutePath).split(path.sep).join("/");

  return {
    id: attachmentId,
    fileName: params.originalFileName,
    storagePath,
    absolutePath,
  };
}

export function buildAttachmentDownloadPath(storagePath: string) {
  return path.join(resolveStorageRoot(), ...storagePath.split("/"));
}

export async function deleteAttachmentFile(storagePath: string) {
  await rm(buildAttachmentDownloadPath(storagePath), { force: true });
}
