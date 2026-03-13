## Relevant Files

- `docs/plans/2026-03-13-data-tools-export-refactor-plan.md` - Plan implementasi batch export/import Data Tools.
- `client/src/pages/backoffice/data-tools.tsx` - UI Data Tools yang harus menampilkan mode export baru.
- `server/routes.ts` - Endpoint export/import CSV WP dan OP.
- `tests/integration/wp-csv-contract.integration.ts` - Regression contract untuk WP compact export/import.
- `tests/integration/op-csv-roundtrip.integration.ts` - Regression export template/import dan varian export OP.
- `docs/api-spec.md` - Dokumen kontrak CSV dan attachment.
- `docs/changelog.md` - Catatan perubahan user-facing dan operasional.

### Notes

- Export OP tidak boleh kehilangan template universal karena itu masih dipakai sebagai baseline import.
- Header compact WP harus tetap backward-compatible terhadap CSV lama.
- Semua task baru dicentang hanya setelah verifikasi batch dibaca hasilnya.

## Instructions for Completing Tasks

**IMPORTANT:** Saat task selesai, ubah `- [ ]` menjadi `- [x]`. Jangan centang implementasi sebelum command verifikasi dijalankan dan hasilnya dibaca.

## Tasks

- [x] 0.0 Write docs-first baseline
  - [x] 0.1 Simpan plan implementasi export/import Data Tools
  - [x] 0.2 Buat task checklist sebagai log eksekusi batch

- [x] 1.0 Add regression coverage before implementation
  - [x] 1.1 Tambahkan failing integration test untuk export/import WP compact
  - [x] 1.2 Tambahkan failing regression di OP CSV untuk:
    - kolom `lampiran`
    - mode export operasional per jenis pajak
  - [x] 1.3 Jalankan test target untuk memastikan RED

- [x] 2.0 Refactor WP CSV contract
  - [x] 2.1 Ganti header export WP dari split `pemilik/pengelola` menjadi kolom subjek tunggal
  - [x] 2.2 Tambahkan kolom `lampiran` pada export WP
  - [x] 2.3 Jadikan import WP backward-compatible:
    - header compact baru
    - header legacy lama

- [x] 3.0 Refactor OP export modes
  - [x] 3.1 Pertahankan export template universal untuk kebutuhan import
  - [x] 3.2 Tambahkan mode export operasional per jenis pajak
  - [x] 3.3 Tambahkan kolom `lampiran` pada export template dan export operasional
  - [x] 3.4 Pastikan file name export menjelaskan mode/jenis yang dipilih

- [x] 4.0 Update Data Tools UI
  - [x] 4.1 Pisahkan aksi export WP compact vs import WP
  - [x] 4.2 Tambahkan selector export OP:
    - template import
    - operasional per jenis pajak
  - [x] 4.3 Jaga layout tetap rapi dan tidak ambigu untuk operator desktop

- [x] 5.0 Sync docs and verification
  - [x] 5.1 Update `docs/api-spec.md` dengan kontrak CSV baru
  - [x] 5.2 Tambahkan changelog user-facing/operasional
  - [x] 5.3 Jalankan verifikasi:
    - `npx tsx tests/integration/wp-csv-contract.integration.ts`
    - `npx tsx tests/integration/op-csv-roundtrip.integration.ts`
    - `npm run check`
    - `npm run build`
