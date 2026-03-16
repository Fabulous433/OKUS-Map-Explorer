## Relevant Files

- `script/build-region-boundaries.ts` - Builder asset boundary OKU Selatan yang kini juga menghasilkan `desa.light.geojson`.
- `server/data/regions/okus/desa.light.geojson` - Asset runtime ringan untuk layer desa/kelurahan scoped.
- `shared/region-boundary.ts` - Contract typed boundary aktif untuk `kabupaten|kecamatan|desa`.
- `server/region-boundaries.ts` - Loader runtime boundary aktif dan filter scoped desa.
- `server/routes.ts` - Endpoint publik `kabupaten/kecamatan/desa` untuk boundary aktif.
- `client/src/lib/map/region-boundary-query.ts` - Fetch helper boundary aktif dengan dukungan query `kecamatanId`.
- `client/src/lib/map/region-boundary-layer-state.ts` - State pure untuk visibility, opacity, dan lazy eligibility layer polygon.
- `client/src/lib/map/region-boundary-layer-style.ts` - Style/palette deterministic untuk polygon boundary.
- `client/src/lib/map/public-boundary-layer-model.ts` - Query plan, legend extraction, label gating, dan kabupaten mask model.
- `client/src/components/map/map-boundary-layer-controls.tsx` - Kontrol atlas tab `Peta` untuk toggle dan opacity layer.
- `client/src/components/map/map-boundary-legend-panel.tsx` - Panel `Informasi` untuk legend polygon aktif.
- `client/src/components/map/public-boundary-layer.tsx` - Renderer GeoJSON polygon + label + mask luar kabupaten.
- `client/src/components/map/desktop-map-filter-sheet.tsx` - Panel atlas desktop `Peta / Informasi / Cari`.
- `client/src/components/map/mobile-map-drawer.tsx` - Drawer atlas mobile dengan arsitektur informasi yang sama.
- `client/src/pages/map-page.tsx` - Integrasi lazy query, state layer, rendering polygon, dan dimming public map.
- `tests/integration/region-boundary-build.integration.ts` - Regression builder asset `desa.light`.
- `tests/integration/region-boundary-layer-api.integration.ts` - Regression API scoped desa boundary.
- `tests/integration/map-boundary-layer-state.integration.ts` - Regression pure layer state/style.
- `tests/integration/map-boundary-panel-config.integration.ts` - Regression atlas panel tabs/control model.
- `tests/integration/public-boundary-layer.integration.ts` - Regression lazy fetch/render polygon di public map.
- `docs/api-spec.md` - Contract API dan catatan operasional atlas boundary layer.
- `docs/changelog.md` - Catatan rollout user-facing batch ini.
- `docs/uat/public-map-boundary-layer-smoke-2026-03-16.md` - Evidence browser lokal batch ini.

### Notes

- Task file ini merekam implementasi public map boundary atlas layers sesuai plan `docs/plans/2026-03-16-public-map-boundary-layer-filters-plan.md`.
- Runtime tetap hanya memuat asset turunan OKU Selatan; shapefile nasional tetap source offline dan tidak ikut masuk runtime.
- Checklist verifikasi dan smoke hanya boleh ditandai selesai setelah command benar-benar dijalankan dan evidence dibaca.

## Instructions for Completing Tasks

**IMPORTANT:** Saat task selesai, ubah `- [ ]` menjadi `- [x]`. Jangan centang verifikasi atau smoke sebelum command dan artifact hasilnya benar-benar ada.

## Tasks

- [x] 1.0 Add scoped desa boundary asset and API contract
  - [x] 1.1 Kunci regression builder untuk `desa.light.geojson`
  - [x] 1.2 Tambahkan contract `desa` pada shared region boundary schema
  - [x] 1.3 Tambahkan endpoint publik `GET /api/region-boundaries/active/desa?kecamatanId=...`
  - [x] 1.4 Pastikan response `desa` hanya mengembalikan feature scoped kecamatan aktif

- [x] 2.0 Add pure client state for polygon layer controls
  - [x] 2.1 Tambahkan default visibility dan opacity untuk `kabupaten`, `kecamatan`, `desa`
  - [x] 2.2 Tambahkan guard lazy load `desa` berbasis toggle, kecamatan, dan zoom
  - [x] 2.3 Tambahkan palette/style deterministic untuk polygon dan label threshold
  - [x] 2.4 Pusatkan fetch helper boundary aktif di client query helper

- [x] 3.0 Redesign public map filter into atlas panel
  - [x] 3.1 Tambahkan tab `Peta / Informasi / Cari`
  - [x] 3.2 Tambahkan toggle dan opacity row untuk setiap layer polygon
  - [x] 3.3 Tambahkan panel legend untuk polygon aktif
  - [x] 3.4 Pertahankan search/filter wilayah/rekening di tab `Cari` untuk desktop dan mobile

- [x] 4.0 Render polygon layers and outside-kabupaten dimming on public map
  - [x] 4.1 Render `kabupaten` sebagai konteks default
  - [x] 4.2 Tambahkan mask/dimming di luar kabupaten aktif
  - [x] 4.3 Render `kecamatan` secara lazy saat toggle aktif
  - [x] 4.4 Render `desa/kelurahan` secara lazy dan scoped saat kecamatan dipilih
  - [x] 4.5 Tampilkan label polygon sesuai threshold zoom dan scope yang pantas

- [x] 5.0 Final verification, docs, and smoke
  - [x] 5.1 Update `docs/api-spec.md`
  - [x] 5.2 Update `docs/changelog.md`
  - [x] 5.3 Jalankan full verification set plan
  - [x] 5.4 Rekam smoke browser lokal di `docs/uat/public-map-boundary-layer-smoke-2026-03-16.md`
  - [x] 5.5 Pastikan task/docs/changelog konsisten dengan state implementasi final
