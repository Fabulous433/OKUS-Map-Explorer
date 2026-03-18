# Public Map Stage Drill-Down Local Smoke — 2026-03-18

## Scope

- Evidence ini diambil dari app lokal di `http://127.0.0.1:5000`.
- Smoke fokus pada baseline UI baru `kabupaten -> kecamatan -> desa`, bukan panel atlas lama.
- Tujuan smoke:
  - memastikan klik polygon `kecamatan` benar-benar membuka stage kecamatan
  - memastikan klik polygon `desa/kelurahan` benar-benar membuka stage desa
  - memastikan marker `Objek Pajak` hanya muncul pada stage desa
  - memastikan tombol kembali membersihkan state stage tanpa marker stale
  - memastikan flow mobile tetap usable pada baseline stage baru
- Smoke ini bukan pengganti staging nyata. Task `7.0` di [tasks-map-wfs-refactor.md](/D:/Code/OKUS-Map-Explorer/tasks/tasks-map-wfs-refactor.md) tetap terbuka untuk target staging.

## Runtime

- Runtime lokal yang teramati saat smoke ini tetap `internal-api`.
- Evidence browser diambil dengan Playwright CLI session terpisah untuk desktop dan mobile.
- Wrapper bash skill Playwright tidak bisa dipakai di host ini karena `bash.exe` mengarah ke WSL tanpa distro; eksekusi browser dilakukan lewat `npx --package @playwright/cli playwright-cli` langsung.

## Bugs Found During Smoke

### Fixed

- Klik polygon `kecamatan` sempat tidak bereaksi walau `path.leaflet-interactive` menerima click DOM.
  - Root cause: listener Leaflet terpasang saat `master/kecamatan` belum selesai load, sehingga closure lama masih memegang `kecamatanList=[]`.
  - Fix: `handleBoundaryFeatureSelect` sekarang membaca `kecamatanListRef.current`, bukan closure render awal, di [map-page.tsx](/D:/Code/OKUS-Map-Explorer/client/src/pages/map-page.tsx).
- Marker desa sempat bocor saat tombol kembali `desa -> kecamatan`, lalu memicu error React `Maximum update depth exceeded`.
  - Root cause: `react-query` masih menyimpan `mapData` lama saat query marker dimatikan.
  - Fix: helper baru `createPublicMapVisibleMarkers(...)` di [public-map-stage-model.ts](/D:/Code/OKUS-Map-Explorer/client/src/lib/map/public-map-stage-model.ts) sekarang mengembalikan `[]` saat stage marker inactive, lalu dipakai di [map-page.tsx](/D:/Code/OKUS-Map-Explorer/client/src/pages/map-page.tsx).
- Marker desa di mobile sempat tertutup chip filter atas, sehingga hit target marker terblokir.
  - Fix: chip filter desa mobile dipindah ke bawah map di [map-page.tsx](/D:/Code/OKUS-Map-Explorer/client/src/pages/map-page.tsx).
- Popup marker mobile sempat memicu loop overlay `Maximum update depth exceeded`.
  - Fix: popup marker sekarang `autoPan={false}` di [map-page.tsx](/D:/Code/OKUS-Map-Explorer/client/src/pages/map-page.tsx).

### Regression Coverage Added

- [public-map-stage-model.integration.ts](/D:/Code/OKUS-Map-Explorer/tests/integration/public-map-stage-model.integration.ts) sekarang juga mengunci:
  - marker stale tidak bocor pada stage `kabupaten`
  - marker stale tidak bocor pada stage `kecamatan`
  - padding viewport mobile/desktop untuk stage desa

## Result

### Desktop Positive

- PASS: load awal langsung masuk stage `Kabupaten` dengan judul `OKU Selatan`.
- PASS: marker OP tidak tampil pada root:
  - `markerCount = 0`
  - chip `Semua OP` belum tampil
  - tombol zoom-out sudah berada di batas bawah stage root
- PASS: klik polygon `Simpang` membuka stage `Kecamatan`.
  - judul berubah menjadi `Simpang`
  - marker tetap `0`
  - chip pajak belum tampil
  - desa scoped yang terlihat: `8`
- PASS: tombol kembali dari `Simpang` kembali ke root `OKU Selatan`.
- PASS: klik polygon `Muara Dua` lalu klik `Batu Belang Jaya` membuka stage `Desa / Kelurahan`.
  - judul berubah menjadi `Batu Belang Jaya`
  - marker `1`
  - chip `Semua OP` dan `Pajak Sarang Burung Walet` tampil
  - popup marker membuka detail:
    - `Walet Budi`
    - `NOPD: 13.01.01.0008`
    - `Tebing Gading`
    - `Rp 400.000 / bulan`
- PASS: tombol kembali `desa -> kecamatan` membersihkan marker dan chip.
  - judul kembali `Muara Dua`
  - `markerCount = 0`
  - chip `Semua OP` hilang
  - console error = `0`

### Mobile Positive

- PASS: fresh mobile session load awal masuk `OKU Selatan` tanpa marker.
  - `markerCount = 0`
  - chip `Semua OP` belum tampil
- PASS: klik polygon `Muara Dua` dari root mobile membuka stage `Kecamatan`.
- PASS: klik polygon `Batu Belang Jaya` membuka stage `Desa / Kelurahan`.
  - judul berubah menjadi `Batu Belang Jaya`
  - `markerCount = 1`
  - chip filter desa tampil di bawah, tidak lagi menutup marker aktif
- PASS: klik marker `WLT` di mobile membuka popup detail `Walet Budi`.
  - console error = `0`

## Artifacts

- Desktop root:
  - [smoke-2026-03-18-stage-root-desktop-final.png](/D:/Code/OKUS-Map-Explorer/output/playwright/smoke-2026-03-18-stage-root-desktop-final.png)
- Desktop kecamatan:
  - [smoke-2026-03-18-stage-kecamatan-simpang-final.png](/D:/Code/OKUS-Map-Explorer/output/playwright/smoke-2026-03-18-stage-kecamatan-simpang-final.png)
- Desktop desa + popup:
  - [smoke-2026-03-18-stage-desa-batu-belang-jaya-popup-final.png](/D:/Code/OKUS-Map-Explorer/output/playwright/smoke-2026-03-18-stage-desa-batu-belang-jaya-popup-final.png)
- Mobile root:
  - [smoke-2026-03-18-stage-root-mobile-final.png](/D:/Code/OKUS-Map-Explorer/output/playwright/smoke-2026-03-18-stage-root-mobile-final.png)
- Mobile desa + popup:
  - [smoke-2026-03-18-stage-desa-mobile-popup-final.png](/D:/Code/OKUS-Map-Explorer/output/playwright/smoke-2026-03-18-stage-desa-mobile-popup-final.png)

## Verification

- `npm run check` -> PASS
- `npx tsx tests/integration/public-map-stage-model.integration.ts` -> PASS
- `npx tsx tests/integration/public-boundary-layer.integration.ts` -> PASS
- `npx tsx tests/integration/public-map-region-scope.integration.ts` -> PASS
- `npx tsx tests/integration/map-focus-params.integration.ts` -> PASS
- `npx tsx tests/integration/map-city-first-config.integration.ts` -> PASS
- `npm run build` -> PASS
