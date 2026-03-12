## Relevant Files

- `client/src/lib/region-config.ts` - Source of truth center Muaradua, default zoom, dan baseline region map config.
- `client/src/pages/map-page.tsx` - Composition root public map, reset view, desktop controls, basemap switch, dan layout utama.
- `client/src/components/map/desktop-map-filter-sheet.tsx` - Komponen baru untuk drawer desktop tipis yang menggantikan panel filter besar overlay.
- `client/src/components/map/map-basemap-button-list.tsx` - Komponen baru untuk daftar tombol basemap yang bisa dipakai desktop dan mobile.
- `client/src/components/map/mobile-map-drawer.tsx` - Referensi pola drawer/filter map yang sudah ada di mobile.
- `client/src/components/ui/sheet.tsx` - Primitive drawer desktop tipis dari sisi kanan yang bisa dipakai ulang.
- `.env.example` - Referensi override zoom/center per instance agar perubahan default tetap terdokumentasi.
- `tests/integration/map-city-first-config.integration.ts` - Test baru untuk mengunci default center/reset dan zoom city-first.
- `tests/integration/map-focus-params.integration.ts` - Regression untuk perilaku initial focus/home map.
- `docs/uat/public-map-city-first-local-smoke-2026-03-13.md` - Evidence browser baru untuk home city-first, drawer desktop, dan basemap button list.
- `docs/plans/2026-03-12-map-wfs-refactor-plan.md` - Plan utama yang harus menaut ke follow-up UX ini.
- `docs/uat/public-map-wfs-staging-handoff.md` - Handoff staging yang harus diselaraskan jika perilaku desktop filter dan ESRI berubah.
- `docs/changelog.md` - Catatan perubahan docs lock dan implementasi user-facing berikutnya.
- `docs/uat/public-map-browse-first-static-smoke-2026-03-13.md` - Evidence frontend statis yang menunjukkan home map sudah kembali ke Muaradua.

### Notes

- Task file ini khusus follow-up UX city-first untuk map publik, terpisah dari batch WFS inti di `tasks/tasks-map-wfs-refactor.md`.
- Batch ini sudah diimplementasikan di worktree aktif `codex/map-wfs-refactor`; branch follow-up terpisah tidak dibuat, jadi task `0.0` tetap terbaca parsial.
- Jika batch ini dikerjakan setelah WFS merge, branch dasar sebaiknya kembali dari `codex/staging`.
- Jika batch ini tetap dikerjakan di worktree WFS saat ini, pastikan status pending staging validation pada task WFS lama tetap jujur.

## Instructions for Completing Tasks

**IMPORTANT:** Saat task selesai, ubah `- [ ]` menjadi `- [x]`. Jangan centang task implementasi sebelum verifikasi batch dijalankan dan hasilnya dibaca.

## Tasks

- [ ] 0.0 Create feature branch
  - [x] 0.1 Checkout branch dasar `codex/staging` atau pastikan worktree aktif tetap menjadi baseline yang disetujui
  - [ ] 0.2 Buat branch fitur terpisah untuk batch city-first UX
  - [x] 0.3 Pastikan status task WFS lama tetap terbaca dan tidak tertimpa oleh batch UX ini

- [x] 1.0 Lock city-first default map view around Muaradua
  - [x] 1.1 Konfirmasi center default tetap di pusat Muaradua lewat `region-config.ts`
  - [x] 1.2 Ubah default zoom dari baseline saat ini `13` ke zoom city-first yang lebih dekat sesuai keputusan final batch
  - [x] 1.3 Pastikan tombol `Reset view` tetap memakai `regionConfig.map.center` dan `regionConfig.map.defaultZoom`, bukan hardcode baru di komponen
  - [x] 1.4 Review `.env.example` agar override `VITE_MAP_CENTER_*` dan `VITE_MAP_DEFAULT_ZOOM` tetap terdokumentasi setelah perubahan default
  - [x] 1.5 Verifikasi focus deep-link tidak merusak home city-first ketika query string kosong

- [x] 2.0 Replace desktop inline filter panel with a slim right-side drawer
  - [x] 2.1 Pisahkan branding/title chip desktop dari form filter agar header map tetap ringkas di layar utama
  - [x] 2.2 Buat komponen drawer desktop tipis berbasis `Sheet` dari sisi kanan dengan lebar yang tidak memakan terlalu banyak viewport
  - [x] 2.3 Tambahkan tombol pemicu `Filter Peta` yang jelas pada layout desktop tanpa mengganggu area map
  - [x] 2.4 Pindahkan search, filter kecamatan, dan filter rekening ke dalam drawer desktop baru
  - [x] 2.5 Pastikan state filter desktop tetap memakai source state yang sama dengan mobile dan query map
  - [x] 2.6 Pertahankan akses keyboard, focus trap, dan close behavior drawer desktop

- [x] 3.0 Convert basemap selection into a button list at the bottom of the filter UI
  - [x] 3.1 Buat komponen daftar tombol basemap yang reusable untuk desktop dan mobile
  - [x] 3.2 Ganti dropdown basemap desktop menjadi button list pada bagian bawah drawer/filter UI
  - [x] 3.3 Ganti dropdown basemap mobile menjadi button list yang semantik dan visualnya konsisten dengan desktop
  - [x] 3.4 Tampilkan state aktif yang jelas untuk `OpenStreetMap`, `CartoDB Positron`, dan `ESRI Satellite`
  - [x] 3.5 Pastikan perubahan basemap tetap sinkron dengan state `baseMap` tunggal di `map-page.tsx`

- [x] 4.0 Review and constrain ESRI Satellite zoom behavior to avoid misleading placeholder tiles
  - [x] 4.1 Reproduksi perilaku `Map data not yet available` pada zoom mentok dengan center city-first yang baru
  - [x] 4.2 Validasi imagery ESRI di sekitar Muaradua untuk zoom tinggi yang masih realistis dipakai operator
  - [x] 4.3 Putuskan apakah `ESRI Satellite` tetap `maxZoom=18` atau diturunkan ke batas yang lebih aman
  - [x] 4.4 Terapkan guard atau batas zoom yang dipilih tanpa mengubah perilaku OSM/Carto yang tidak terkait
  - [x] 4.5 Dokumentasikan keputusan final `ESRI Satellite` agar tidak dibaca sebagai bug data OP

- [x] 5.0 Add verification coverage and browser evidence for city-first initial load plus new desktop filter workflow
  - [x] 5.1 Tambahkan test untuk mengunci center/reset dan zoom city-first default
  - [x] 5.2 Update regression yang relevan bila perpindahan drawer/filter desktop memengaruhi semantik idle state atau basemap state
    - Catatan: suite `map-focus-params` dan `map-viewport-query` tetap hijau, sehingga perubahan UI tidak merusak idle/focus semantics yang sudah ada.
  - [x] 5.3 Jalankan verifikasi minimum:
    - `npx tsx tests/integration/map-city-first-config.integration.ts`
    - `npx tsx tests/integration/map-focus-params.integration.ts`
    - `npm run check`
    - `npm run build`
  - [x] 5.4 Ambil evidence browser lokal untuk:
    - home load city-first di Muaradua
    - open/close drawer desktop
    - pemilihan basemap via button list
    - perilaku ESRI pada zoom tertinggi yang disetujui
  - [x] 5.5 Simpan hasilnya di `docs/uat/public-map-city-first-local-smoke-2026-03-13.md`

- [x] 6.0 Sync docs, changelog, and rollout notes after implementation
  - [x] 6.1 Update plan utama WFS dengan hasil implementasi actual dari batch city-first UX
  - [x] 6.2 Update `docs/changelog.md` dari status `planned/docs lock` menjadi perubahan user-facing yang benar-benar selesai
  - [x] 6.3 Update handoff staging jika alur desktop filter, default zoom, atau batas ESRI berubah
  - [x] 6.4 Pastikan task file ini, task WFS utama, dan evidence docs sama-sama menunjukkan status done/pending yang konsisten
