# WP/OP Attachments Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Menambahkan upload, preview, list, dan delete attachment untuk Wajib Pajak dan Objek Pajak agar data verifikasi memiliki bukti dokumen dan foto.

**Architecture:** Gunakan satu tabel attachment generik untuk `wajib_pajak` dan `objek_pajak`, dengan metadata file lengkap dan penyimpanan file di volume server lokal lebih dulu. Backend Express memakai `multer` yang sudah ada, file ditulis ke direktori attachment terstruktur, dan FE backoffice menampilkan panel attachment per entitas dengan preview gambar/PDF dan audit trail upload/delete.

**Tech Stack:** Express 5, Drizzle ORM, PostgreSQL, multer, React 18, TanStack Query, existing shadcn dialog/button/input components.

---

## Delivery Order
1. Backend schema + storage file abstraction
2. API upload/list/download/delete + audit log
3. UI attachment panel WP
4. UI attachment panel OP
5. Integration tests + docs + staging runbook

## Execution Status
- [x] Task 1: Define Attachment Contract
- [x] Task 2: Build File Storage Adapter
- [x] Task 3: Implement Backend Attachment CRUD
- [x] Task 4: Build Shared Attachment UI Components
- [x] Task 5: Integrate Attachments into Wajib Pajak UI
- [x] Task 6: Integrate Attachments into Objek Pajak UI
- [x] Task 7: Documentation, Release Notes, and Staging Runbook
- [x] Manual smoke via `docs/uat/attachments-smoke-checklist.md`
- [x] Final branch verification before merge

## Assumptions Locked
- Storage awal: local filesystem / mounted volume server, bukan object storage.
- Maksimum ukuran file per attachment: `5 MB`.
- Format yang diterima:
  - dokumen: `application/pdf`
  - gambar: `image/jpeg`, `image/png`, `image/webp`
- History file dipertahankan; delete bersifat hard delete file + row metadata.
- Tipe attachment minimal:
  - WP: `ktp`, `npwp`, `surat_kuasa`, `dokumen_lain`
  - OP: `foto_usaha`, `foto_lokasi`, `izin_usaha`, `dokumen_lain`
- Satu attachment boleh diberi catatan singkat opsional.

### Task 1: Define Attachment Contract

**Files:**
- Create: `shared/attachments.ts`
- Modify: `shared/schema.ts`
- Test: `tests/integration/final-contract.integration.ts`

**Step 1: Write the failing contract assertions**

Tambahkan assertion baru di `tests/integration/final-contract.integration.ts` untuk memastikan payload attachment punya bentuk berikut:

```ts
expect(item).toMatchObject({
  id: expect.any(String),
  entityType: expect.stringMatching(/wajib_pajak|objek_pajak/),
  entityId: expect.any(Number),
  documentType: expect.any(String),
  fileName: expect.any(String),
  mimeType: expect.any(String),
  fileSize: expect.any(Number),
  storagePath: expect.any(String),
  uploadedAt: expect.any(String),
  uploadedBy: expect.any(String),
});
```

**Step 2: Run test to verify it fails**

Run: `npm run test:integration:final-contract`
Expected: FAIL karena schema attachment belum ada.

**Step 3: Write minimal shared contract**

Tambahkan ke `shared/attachments.ts`:
- `ATTACHMENT_ENTITY_TYPES`
- `WP_ATTACHMENT_TYPES`
- `OP_ATTACHMENT_TYPES`
- Zod schema untuk upload request metadata dan attachment response

Tambahkan ke `shared/schema.ts`:
- tabel `entity_attachment`
- type export untuk attachment

**Step 4: Run test to verify contract compiles**

Run: `npm run check`
Expected: PASS.

**Step 5: Commit**

```bash
git add shared/attachments.ts shared/schema.ts tests/integration/final-contract.integration.ts
git commit -m "feat: define wp op attachment contract"
```

### Task 2: Build File Storage Adapter

**Files:**
- Create: `server/file-storage.ts`
- Modify: `server/env.ts`
- Modify: `.env.example`
- Test: `tests/integration/health.integration.ts`

**Step 1: Write the failing health/storage expectation**

Tambahkan assertion di `tests/integration/health.integration.ts` bahwa health payload tetap sehat saat `ATTACHMENTS_STORAGE_ROOT` tersedia.

**Step 2: Run test to verify baseline**

Run: `npm run test:integration:health`
Expected: PASS baseline; lalu lanjut implementasi tanpa regresi.

**Step 3: Implement file storage adapter**

Buat `server/file-storage.ts` dengan fungsi:
- `ensureAttachmentStorageRoot()`
- `saveAttachmentBuffer()`
- `deleteAttachmentFile()`
- `buildAttachmentDownloadPath()`

Tambahkan env di `.env.example`:
- `ATTACHMENTS_STORAGE_ROOT=./uploads`

Validasi env di `server/env.ts` dengan default aman untuk local dev.

**Step 4: Run check/build**

Run:
- `npm run check`
- `npm run build`
Expected: PASS.

**Step 5: Commit**

```bash
git add server/file-storage.ts server/env.ts .env.example tests/integration/health.integration.ts
git commit -m "feat: add local attachment storage adapter"
```

### Task 3: Implement Backend Attachment CRUD

**Files:**
- Modify: `server/storage.ts`
- Modify: `server/routes.ts`
- Modify: `shared/schema.ts`
- Test: `tests/integration/wp-op-attachments.integration.ts`

**Step 1: Write the failing integration tests**

Create `tests/integration/wp-op-attachments.integration.ts` untuk skenario:
- upload attachment WP sukses
- upload attachment OP sukses
- list attachment latest-first
- delete attachment menghapus metadata
- download attachment mengembalikan file sesuai mime type
- reject mime type invalid
- reject file > 5 MB

**Step 2: Run test to verify it fails**

Run: `npm run test:integration:wp-op-attachments`
Expected: FAIL karena route belum ada.

**Step 3: Write minimal backend implementation**

Di `server/storage.ts` tambahkan method:
- `createEntityAttachment`
- `listEntityAttachments`
- `getEntityAttachment`
- `deleteEntityAttachment`

Di `server/routes.ts` tambahkan endpoint:
- `GET /api/wajib-pajak/:id/attachments`
- `POST /api/wajib-pajak/:id/attachments`
- `GET /api/wajib-pajak/:id/attachments/:attachmentId/download`
- `DELETE /api/wajib-pajak/:id/attachments/:attachmentId`
- `GET /api/objek-pajak/:id/attachments`
- `POST /api/objek-pajak/:id/attachments`
- `GET /api/objek-pajak/:id/attachments/:attachmentId/download`
- `DELETE /api/objek-pajak/:id/attachments/:attachmentId`

Gunakan `multer` memory storage yang sudah ada, lalu simpan ke adapter filesystem.

**Step 4: Add audit logging**

Di jalur upload/delete, tulis `audit_log` action:
- `ATTACHMENT_UPLOAD`
- `ATTACHMENT_DELETE`

**Step 5: Run tests**

Run:
- `npm run test:integration:wp-op-attachments`
- `npm run test:integration:governance-quality`
Expected: PASS.

**Step 6: Commit**

```bash
git add server/storage.ts server/routes.ts shared/schema.ts tests/integration/wp-op-attachments.integration.ts
git commit -m "feat: add wp op attachment api"
```

### Task 4: Build Shared Attachment UI Components

**Files:**
- Create: `client/src/components/attachments/attachment-panel.tsx`
- Create: `client/src/components/attachments/attachment-upload-dialog.tsx`
- Create: `client/src/components/attachments/attachment-preview-dialog.tsx`
- Create: `client/src/components/attachments/attachment-type-badge.tsx`
- Modify: `client/src/lib/queryClient.ts`
- Test: manual smoke checklist in `docs/uat/attachments-smoke-checklist.md`

**Step 1: Write manual acceptance checklist**

Create `docs/uat/attachments-smoke-checklist.md` dengan acceptance:
- upload PDF WP
- upload foto OP
- preview gambar
- download PDF
- delete attachment
- invalid mime ditolak
- file terlalu besar ditolak

**Step 2: Implement shared UI components**

Buat panel reusable dengan fitur:
- daftar attachment latest-first
- tombol upload
- tombol preview/download
- tombol hapus
- badge type + ukuran file + uploader + waktu upload

**Step 3: Integrate error handling**

Pastikan `client/src/lib/queryClient.ts` meneruskan pesan umum yang mudah dibaca untuk upload failure:
- `Format file tidak didukung`
- `Ukuran file melebihi batas 5 MB`
- `File gagal diunggah. Silakan coba lagi.`

**Step 4: Run checks**

Run:
- `npm run check`
- `npm run build`
Expected: PASS.

**Step 5: Commit**

```bash
git add client/src/components/attachments client/src/lib/queryClient.ts docs/uat/attachments-smoke-checklist.md
git commit -m "feat: add shared attachment ui components"
```

### Task 5: Integrate Attachments into Wajib Pajak UI

**Files:**
- Modify: `client/src/pages/backoffice/wajib-pajak.tsx`
- Modify: `shared/attachments.ts`
- Test: `docs/uat/attachments-smoke-checklist.md`

**Step 1: Add WP attachment section**

Tempatkan panel attachment di dialog detail/edit WP, dengan kategori:
- KTP/NIK
- NPWP
- Surat Kuasa
- Dokumen Lain

**Step 2: Gate the UI by record existence**

Untuk create dialog WP baru, tampilkan info:
- attachment aktif setelah data WP berhasil dibuat

Untuk edit/detail WP existing, panel aktif penuh.

**Step 3: Run manual smoke for WP**

Gunakan checklist:
- upload dokumen KTP
- upload NPWP
- preview/download
- delete
Expected: semua skenario PASS.

**Step 4: Commit**

```bash
git add client/src/pages/backoffice/wajib-pajak.tsx
git commit -m "feat: add wajib pajak attachment panel"
```

### Task 6: Integrate Attachments into Objek Pajak UI

**Files:**
- Modify: `client/src/pages/backoffice/objek-pajak-form-dialog.tsx`
- Modify: `client/src/pages/backoffice/objek-pajak.tsx`
- Test: `docs/uat/attachments-smoke-checklist.md`

**Step 1: Add OP attachment section**

Tempatkan panel attachment di dialog edit/detail OP dengan kategori:
- Foto Usaha
- Foto Lokasi
- Izin Usaha
- Dokumen Lain

**Step 2: Add image-first preview behavior**

Jika mime type gambar, preview di dialog; jika PDF, tampilkan tombol buka/download.

**Step 3: Run manual smoke for OP**

Gunakan checklist:
- upload foto usaha
- upload foto lokasi
- upload PDF izin usaha
- hapus salah satu file
Expected: semua skenario PASS.

**Step 4: Commit**

```bash
git add client/src/pages/backoffice/objek-pajak-form-dialog.tsx client/src/pages/backoffice/objek-pajak.tsx
git commit -m "feat: add objek pajak attachment panel"
```

### Task 7: Documentation, Release Notes, and Staging Runbook

**Files:**
- Modify: `docs/api-spec.md`
- Modify: `docs/erd.md`
- Modify: `docs/local-development.md`
- Modify: `docs/release/staging-single-vps-runbook.md`
- Modify: `docs/changelog.md`

**Step 1: Update API spec**

Dokumentasikan endpoint attachment WP/OP, payload upload metadata, response list, dan aturan mime/ukuran file.

**Step 2: Update ERD and local dev docs**

Tambahkan tabel `entity_attachment`, relasi ke WP/OP, dan setup `ATTACHMENTS_STORAGE_ROOT` untuk local/staging.

**Step 3: Update staging runbook**

Tuliskan kebutuhan volume path yang persisten di EasyPanel untuk attachment storage.

**Step 4: Run final verification**

Run:
- `npm run check`
- `npm run test:integration`
Expected: PASS.

**Step 5: Commit**

```bash
git add docs/api-spec.md docs/erd.md docs/local-development.md docs/release/staging-single-vps-runbook.md docs/changelog.md
git commit -m "docs: document wp op attachments"
```

## Final Verification
- `npm run check`
- `npm run build`
- `npm run test:integration`
- Manual smoke: `docs/uat/attachments-smoke-checklist.md`
- Staging validation:
  - upload 1 PDF WP
  - upload 1 foto OP
  - preview/download/delete sukses
  - attachment file tetap ada setelah redeploy
