## Relevant Files

- `script/build-region-boundaries.ts` - Builder offline untuk menurunkan shapefile nasional menjadi bundle GeoJSON OKU Selatan yang deterministic.
- `server/data/regions/okus/*` - Asset runtime boundary khusus OKU Selatan; kabupaten/kecamatan light untuk frontend, precise untuk validasi server.
- `server/region-boundaries.ts` - Loader boundary aktif + helper point-in-polygon dan bounds.
- `server/storage.ts` - Spatial guard create/update OP dan filter marker publik berdasarkan kabupaten aktif.
- `server/routes.ts` - Endpoint boundary aktif + normalisasi read API terkait region scope.
- `shared/region-boundary.ts` - Contract typed untuk response boundary aktif.
- `client/src/lib/map/region-boundary-query.ts` - Fetch boundary aktif dari frontend.
- `client/src/lib/map/region-boundary-client.ts` - Helper client untuk bounds dan validasi klik di picker.
- `client/src/pages/map-page.tsx` - Overlay/focus map publik ke kabupaten aktif.
- `client/src/pages/backoffice/objek-pajak-map-picker.tsx` - Picker OP yang dibatasi boundary OKU Selatan.
- `client/src/pages/backoffice/objek-pajak-form-dialog.tsx` - Feedback operator saat titik ditolak.
- `tests/integration/region-boundary-build.integration.ts` - Regression bundle builder OKU Selatan.
- `tests/integration/objek-pajak-spatial-guard.integration.ts` - Regression spatial guard create/update OP.
- `tests/integration/public-map-region-scope.integration.ts` - Regression scope marker/boundary region aktif.
- `tests/integration/region-boundary-client.integration.ts` - Regression helper client-side picker.
- `docs/api-spec.md` - Contract API dan catatan operasional spatial guard.
- `docs/changelog.md` - Catatan rollout user-facing batch ini.
- `docs/uat/oku-selatan-spatial-guard-smoke.md` - Evidence verification/smoke lokal batch ini.

### Notes

- Task file ini merekam implementasi spatial guard khusus Kabupaten OKU Selatan sesuai plan `docs/plans/2026-03-16-oku-selatan-spatial-guard-plan.md`.
- Bundle runtime sengaja hanya berisi asset turunan OKU Selatan; shapefile nasional tetap source offline dan tidak dimuat ke runtime app.
- Checklist verifikasi baru boleh ditandai selesai setelah command batch akhir benar-benar dijalankan dan hasilnya dibaca.

## Instructions for Completing Tasks

**IMPORTANT:** Saat task selesai, ubah `- [ ]` menjadi `- [x]`. Jangan centang checklist verifikasi/smoke sebelum command benar-benar dijalankan dan evidence dicatat.

## Tasks

- [x] 1.0 Build bundle boundary OKU Selatan
  - [x] 1.1 Tambahkan regression `region-boundary-build.integration.ts` untuk mengunci jumlah feature kabupaten, kecamatan, desa, dan perbedaan asset `precise` vs `light`
  - [x] 1.2 Implementasikan builder offline `region:build:okus` untuk memfilter shapefile nasional berdasarkan `WADMKK = Ogan Komering Ulu Selatan`
  - [x] 1.3 Commit asset runtime turunan `kabupaten/kecamatan/desa` khusus OKU Selatan ke `server/data/regions/okus`

- [x] 2.0 Enforce spatial guard pada create/update OP
  - [x] 2.1 Tambahkan loader/helper boundary aktif di server
  - [x] 2.2 Tolak koordinat di luar kabupaten aktif
  - [x] 2.3 Tolak mismatch kecamatan dan kelurahan terhadap polygon yang mengandung titik
  - [x] 2.4 Tambahkan regression API untuk create/update inside vs outside region

- [x] 3.0 Scope data publik dan response boundary ke region aktif
  - [x] 3.1 Tambahkan contract shared dan endpoint `GET /api/region-boundaries/active/kabupaten`
  - [x] 3.2 Tambahkan endpoint `GET /api/region-boundaries/active/kecamatan`
  - [x] 3.3 Filter marker/list publik agar record di luar kabupaten aktif tidak ikut diserve
  - [x] 3.4 Tampilkan overlay/focus kabupaten aktif di map publik

- [x] 4.0 Guard backoffice picker dan feedback operator
  - [x] 4.1 Tambahkan helper client untuk bounds dan validasi click point
  - [x] 4.2 Batasi picker agar hanya menerima titik di dalam kabupaten aktif
  - [x] 4.3 Tampilkan feedback form saat operator memilih titik di luar boundary

- [x] 5.0 Final verification, docs, dan smoke
  - [x] 5.1 Update `docs/api-spec.md` dengan contract boundary aktif dan perilaku spatial guard
  - [x] 5.2 Update `docs/changelog.md` dengan rollout spatial guard OKU Selatan
  - [x] 5.3 Jalankan full verification set plan Task 5
  - [x] 5.4 Catat smoke lokal di `docs/uat/oku-selatan-spatial-guard-smoke.md`
  - [x] 5.5 Review final task/docs/changelog agar status implementasi konsisten
