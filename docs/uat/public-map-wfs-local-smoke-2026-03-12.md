# Public Map WFS Local Smoke Evidence — 2026-03-12

## Scope

- Evidence ini diambil dari instance lokal `http://127.0.0.1:5001`, bukan staging publik.
- Build dijalankan ulang dengan env:
  - `VITE_MAP_DATA_MODE=backend-proxy`
  - `VITE_MAP_PROXY_ENDPOINT=/api/objek-pajak/map-wfs`
- Tujuannya adalah memastikan flow browser WFS proxy sudah cukup stabil sebelum staging smoke nyata dijalankan.
- Dokumen ini mendahului penyesuaian UX `browse-first` pada load awal map. Evidence idle-state baru perlu diambil ulang pada smoke berikutnya.

## API Checks

- PASS: `GET /health` merespons `200`.
- PASS: `GET /api/objek-pajak/map-wfs?bbox=102,-6,106,-3&limit=5` merespons `FeatureCollection` dengan `numberMatched`.
- PASS: `GET /api/objek-pajak/map-wfs?bbox=invalid` merespons `400`.

## Desktop Smoke

- PASS: focus query param membuka marker yang benar untuk sample feature:
  - `id = 16`
  - `nama_op = Sumur Air Dummy`
  - `nopd = OP.321.907.2026`
- PASS: `Reset view` memicu refetch viewport WFS. Evidence network menunjukkan request focus `zoom=18` lalu request baru pada viewport default `zoom=13`.
- PASS: search no-match (`zzzwfsnomatch`) menampilkan empty state `Tidak ada objek pajak pada viewport ini.`.
- PASS: filter `kecamatan` menerjemahkan selection ke request dengan query param `kecamatanId=...`.
- PASS: filter `rekening` menerjemahkan selection ke request dengan query param `rekPajakId=1`.

## Mobile Smoke

- PASS: layout mobile terbuka normal pada viewport `390x844`.
- PASS: drawer filter mobile terbuka dan badge viewport di drawer tetap sinkron.
- PASS: search no-match dari drawer menurunkan viewport ke `0 dalam viewport / 0 marker` dan menampilkan empty state.
- PASS: mocked `502` pada `/api/objek-pajak/map-wfs` menampilkan error state `proxy upstream timeout`.

## Artifacts

- Desktop focus: `output/playwright/desktop-focus.png`
- Desktop empty: `output/playwright/desktop-empty.png`
- Mobile focus: `output/playwright/mobile-focus.png`
- Mobile drawer: `output/playwright/mobile-drawer.png`
- Mobile empty: `output/playwright/mobile-empty.png`
- Mobile error: `output/playwright/mobile-error.png`

## Notes

- Tile basemap OpenStreetMap beberapa kali tercatat `net::ERR_ABORTED` di log Playwright saat viewport berpindah. Ini tidak memblokir request data WFS proxy dan tidak menimbulkan runtime error pada aplikasi.
- Ref dropdown `rekening` di Playwright CLI terbukti sensitif terhadap snapshot stale. Evidence final diambil setelah snapshot segar pada session yang sama.
- Smoke staging nyata masih pending. Dokumen ini hanya menutup kebutuhan pre-staging local browser evidence sebelum idle-state `browse-first` disetel ulang.
