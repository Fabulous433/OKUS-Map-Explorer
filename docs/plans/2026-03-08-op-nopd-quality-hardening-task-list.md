# OP NOPD + Data Quality Hardening — Task List

> **For Claude/Codex:** Use [$executing-plans](C:\Users\NB - MBA\.agents\skills\executing-plans\SKILL.md) to implement this plan in batches, with review checkpoints after each batch.

## Goal
Merapikan validasi dan UX input `Objek Pajak` agar:
- warning tidak noisy,
- format `NOPD` mengikuti dokumen resmi project,
- duplicate `NOPD` ditolak sebagai hard error, bukan warning,
- pesan error mudah dipahami user awam,
- flow create/update/import konsisten.

## Decision Lock
1. `DUPLICATE_NOPD` dihapus dari warning form.
2. `SIMILAR_NAME_ADDRESS` dipindah ke report internal saja, bukan warning form submit.
3. Semua `NOPD` wajib format baru `AA.BB.CC.XXXX`.
4. Format legacy lama tidak diterima, termasuk import.
5. `NOPD` auto-generate saat create jika kosong.
6. `NOPD` tetap editable saat update.
7. Reklame dan MBLB mengikuti rule dokumen:
   - Reklame: `09.00.00.XXXX`
   - MBLB: `14.00.00.XXXX`

## Relevant Files
- [docs/format-nopd.md](D:/Code/OKUS-Map-Explorer/docs/format-nopd.md) - Sumber aturan format NOPD resmi.
- [server/storage.ts](D:/Code/OKUS-Map-Explorer/server/storage.ts) - Validasi/generator `NOPD` dan alur create/update OP.
- [server/routes.ts](D:/Code/OKUS-Map-Explorer/server/routes.ts) - `quality/check`, `quality/report`, mapping error API.
- [shared/schema.ts](D:/Code/OKUS-Map-Explorer/shared/schema.ts) - Zod schema OP dan detail pajak.
- [client/src/pages/backoffice/objek-pajak.tsx](D:/Code/OKUS-Map-Explorer/client/src/pages/backoffice/objek-pajak.tsx) - Warning panel, submit flow, error toast, helper text `NOPD`.
- [client/src/lib/queryClient.ts](D:/Code/OKUS-Map-Explorer/client/src/lib/queryClient.ts) - Normalisasi error response jika saat ini masih memunculkan JSON mentah.
- [tests/integration/final-contract.integration.ts](D:/Code/OKUS-Map-Explorer/tests/integration/final-contract.integration.ts) - Regression contract OP.
- [tests/integration/op-detail-validation.integration.ts](D:/Code/OKUS-Map-Explorer/tests/integration/op-detail-validation.integration.ts) - Validasi detail pajak yang terdampak error messaging.
- [tests/integration/governance-quality.integration.ts](D:/Code/OKUS-Map-Explorer/tests/integration/governance-quality.integration.ts) - Quality warning/report regression.
- [tests/integration/op-csv-roundtrip.integration.ts](D:/Code/OKUS-Map-Explorer/tests/integration/op-csv-roundtrip.integration.ts) - Import/export regression untuk `NOPD`.
- [docs/api-spec.md](D:/Code/OKUS-Map-Explorer/docs/api-spec.md) - Dokumentasi contract API/error jika berubah.
- [docs/changelog.md](D:/Code/OKUS-Map-Explorer/docs/changelog.md) - Ringkasan perubahan user-facing.

## Notes
- Jalur implementasi default: branch fitur dibuat dari `codex/staging`.
- Batch eksekusi disarankan 3 parent task pertama, lalu review.
- Setelah implementasi selesai, verifikasi minimal wajib dilakukan di local sebelum push ke staging.

## Instructions for Completing Tasks
**IMPORTANT:** Saat task selesai, ubah `- [ ]` menjadi `- [x]`. Jangan centang sub-task sebelum command verifikasi batch dijalankan dan hasilnya dibaca.

## Tasks

- [x] 0.0 Create feature branch
  - [x] 0.1 Checkout dari branch dasar `codex/staging`
  - [x] 0.2 Buat branch fitur, contoh: `codex/op-nopd-hardening`
  - [x] 0.3 Pastikan worktree bersih sebelum implementasi dimulai

- [x] 1.0 Implement official NOPD parsing, validation, and generation rules
  - [x] 1.1 Baca ulang [docs/format-nopd.md](D:/Code/OKUS-Map-Explorer/docs/format-nopd.md) dan petakan aturan `AA.BB.CC.XXXX` ke kode rekening aktif
  - [x] 1.2 Refactor validator `NOPD` di [server/storage.ts](D:/Code/OKUS-Map-Explorer/server/storage.ts) agar tidak lagi menerima pola `OP.321.XXX.YYYY`
  - [x] 1.3 Implement helper untuk derive prefix `AA.BB.CC` dari `kodeRekening`
  - [x] 1.4 Implement rule khusus reklame dan MBLB (`09.00.00`, `14.00.00`)
  - [x] 1.5 Update generator `NOPD` agar sequence `XXXX` bersifat 4 digit per prefix
  - [x] 1.6 Pastikan create tanpa `NOPD` menghasilkan auto-generated code baru
  - [x] 1.7 Pastikan update manual `NOPD` tetap diizinkan hanya bila format baru valid dan unique

- [x] 2.0 Remove noisy OP form warnings and keep only meaningful quality checks
  - [x] 2.1 Hapus `DUPLICATE_NOPD` dari hasil `POST /api/quality/check` di [server/routes.ts](D:/Code/OKUS-Map-Explorer/server/routes.ts)
  - [x] 2.2 Hapus `SIMILAR_NAME_ADDRESS` dari flow warning form OP
  - [x] 2.3 Pindahkan logika `SIMILAR_NAME_ADDRESS` agar hanya muncul di `GET /api/quality/report`
  - [x] 2.4 Pastikan duplicate `NOPD` tetap ditolak sebagai hard error dari create/update/import path
  - [x] 2.5 Review ulang payload `quality/check` agar warning panel OP hanya berisi warning yang benar-benar operasional

- [x] 3.0 Normalize backend validation errors into user-friendly messages
  - [x] 3.1 Audit error teknis yang saat ini bocor ke UI dari Zod/DB/API
  - [x] 3.2 Tambahkan mapper error di backend untuk field numerik umum:
    - `tarifParkir`
    - `latitude`
    - `longitude`
    - field detail pajak numerik lain yang sering diisi manual
  - [x] 3.3 Ubah error format `NOPD` menjadi pesan bisnis yang jelas dan konsisten
  - [x] 3.4 Ubah error duplicate unique `NOPD` menjadi pesan user-facing yang mudah dipahami
  - [x] 3.5 Pastikan API tidak lagi mengirim stringified JSON Zod mentah ke frontend

- [x] 4.0 Update OP form UX for NOPD and submit error handling
  - [x] 4.1 Update warning panel di [objek-pajak.tsx](D:/Code/OKUS-Map-Explorer/client/src/pages/backoffice/objek-pajak.tsx) agar tidak lagi menampilkan `DUPLICATE_NOPD`
  - [x] 4.2 Pastikan `SIMILAR_NAME_ADDRESS` tidak tampil di form submit OP
  - [x] 4.3 Tambahkan helper text `NOPD` yang menjelaskan format resmi `AA.BB.CC.XXXX`
  - [x] 4.4 Rapikan toast/destructive notification agar menampilkan pesan ringkas dan manusiawi
  - [x] 4.5 Jika perlu, normalisasi layer `apiRequest`/query client agar error field bisa dibaca form tanpa JSON mentah

- [x] 5.0 Align import, update, and report behavior with the new NOPD rule
  - [x] 5.1 Update path import CSV OP agar `NOPD` lama/non-format baru ditolak
  - [x] 5.2 Pastikan export CSV tetap mengeluarkan `NOPD` final yang tersimpan
  - [x] 5.3 Pastikan `quality/report` tetap menampilkan `SIMILAR_NAME_ADDRESS` sebagai internal-only signal
  - [x] 5.4 Update contract docs di [docs/api-spec.md](D:/Code/OKUS-Map-Explorer/docs/api-spec.md)
  - [x] 5.5 Tambahkan catatan perubahan user-facing di [docs/changelog.md](D:/Code/OKUS-Map-Explorer/docs/changelog.md)

- [x] 6.0 Add and update automated tests for NOPD, warnings, and user-facing validation
  - [x] 6.1 Tambahkan integration test create OP tanpa `NOPD` -> auto-generate format baru
  - [x] 6.2 Tambahkan integration test create/update duplicate `NOPD` -> ditolak
  - [x] 6.3 Tambahkan integration test create/import dengan format `NOPD` lama -> ditolak
  - [x] 6.4 Tambahkan integration test reklame -> generated prefix `09.00.00`
  - [x] 6.5 Tambahkan integration test MBLB -> generated prefix `14.00.00`
  - [x] 6.6 Tambahkan regression test bahwa `quality/check` OP tidak lagi memunculkan `DUPLICATE_NOPD` dan `SIMILAR_NAME_ADDRESS`
  - [x] 6.7 Tambahkan regression test untuk error message user-friendly pada field numerik invalid

- [x] 7.0 Run local verification and prepare for staging promotion
  - [x] 7.1 Jalankan `npm run check`
  - [x] 7.2 Jalankan integration tests yang terdampak:
    - `npm run test:integration:final-contract`
    - `npm run test:integration:detail-validation`
    - `npm run test:integration:governance-quality`
    - `npm run test:integration:csv-roundtrip`
  - [x] 7.3 Jalankan `npm run test:integration` jika perubahan sudah stabil
  - [x] 7.4 Uji manual local minimal:
    - create OP tanpa `NOPD`
    - edit OP dengan `NOPD` valid
    - submit angka invalid dan cek pesan error
    - cek warning panel tidak noisy
  - [x] 7.5 Siapkan ringkasan hasil verifikasi sebelum push ke `codex/staging`

## Batch 3 Verification Note
- 2026-03-09: `npm run check` dan `npm run build` lulus.
- 2026-03-09: `npm run test:integration:final-contract` lulus.
- 2026-03-09: `npm run test:integration:detail-validation` lulus.
- 2026-03-09: `npm run test:integration:governance-quality` lulus.
- 2026-03-09: `npm run test:integration:csv-roundtrip` lulus.
- 2026-03-09: `npm run test:integration` full suite lulus.
- Catatan investigasi: sempat ada blocker PostgreSQL local timeout; setelah Docker/Postgres lokal sehat kembali, seluruh suite berhasil dijalankan.

## Batch Execution Recommendation

### Batch 1
- `0.0` Create feature branch
- `1.0` Implement official NOPD parsing, validation, and generation rules
- `2.0` Remove noisy OP form warnings

Checkpoint:
- Review regex/validator/generator `NOPD`
- Review behavior `quality/check`

### Batch 2
- `3.0` Normalize backend validation errors
- `4.0` Update OP form UX
- `5.0` Align import, update, and report behavior

Checkpoint:
- Review API error payload
- Review UX error/warning state di form OP

### Batch 3
- `6.0` Add/update automated tests
- `7.0` Run local verification and prepare staging promotion

Checkpoint:
- Review hasil test lokal
- Review readiness untuk push ke `codex/staging`

## Acceptance Criteria
1. `NOPD` baru mengikuti format `AA.BB.CC.XXXX`.
2. Duplicate `NOPD` ditolak sebagai hard error di create/update/import.
3. Warning form OP tidak lagi menampilkan `DUPLICATE_NOPD`.
4. `SIMILAR_NAME_ADDRESS` tidak tampil di form submit, hanya di report internal.
5. User tidak lagi melihat pesan error JSON teknis mentah.
6. Reklame dan MBLB memakai prefix generik sesuai dokumen.
7. Integration test dan verifikasi local lulus sebelum code dipromosikan ke staging.
