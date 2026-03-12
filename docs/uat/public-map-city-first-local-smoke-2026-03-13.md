# Public Map City-First Local Smoke — 2026-03-13

## Scope

- Evidence ini diambil dari build statis `dist/public` yang diserve lokal di `http://127.0.0.1:4174`.
- Tujuannya spesifik untuk memverifikasi batch UX city-first terbaru pada frontend:
  - home/reset view kembali ke pusat Muaradua
  - zoom awal city-first sudah lebih dekat (`15`)
  - panel filter desktop besar diganti oleh drawer tipis dari sisi kanan
  - pilihan basemap kini berupa button list, bukan dropdown
  - `ESRI Satellite` tidak lagi dibiarkan melewati zoom aman yang disetujui
- Dokumen ini bukan pengganti smoke staging/API karena server statis tidak menyediakan endpoint `/api/*`.

## Result

- PASS: fresh home load membuka basemap OpenStreetMap pada wilayah Muaradua, bukan `0,0`.
- PASS: sampling tile home menunjukkan zoom awal city-first `15`:
  - `https://c.tile.openstreetmap.org/15/25852/16795.png`
- PASS: kontrol desktop kini ringkas:
  - chip judul tetap kecil di kiri atas
  - tombol `Filter Peta` dan `Backoffice` tampil tanpa wrapper panel besar
- PASS: membuka `Filter Peta` menampilkan drawer desktop tipis dari sisi kanan, bukan panel overlay lebar.
- PASS: drawer desktop dan drawer mobile sama-sama memakai button list basemap:
  - `OSM`
  - `Carto`
  - `ESRI Sat`
- PASS: setelah memilih `ESRI Sat`, attribution berubah ke `Leaflet | © Esri`.
- PASS: zoom berulang pada `ESRI Satellite` berhenti pada zoom `17`, sesuai batas aman yang dikunci:
  - `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/17/67184/103413`

## Expected Static-Only Errors

- `GET /api/master/kecamatan` -> `404`
- `GET /api/master/rekening-pajak` -> `404`

Error di atas expected karena smoke ini hanya memverifikasi frontend build statis tanpa backend/API.

## Artifacts

- Screenshot home city-first:
  - `output/playwright/public-map-city-first-home.png`
- Screenshot drawer desktop:
  - `output/playwright/public-map-city-first-desktop-drawer.png`
- Screenshot ESRI max zoom:
  - `output/playwright/public-map-city-first-esri-maxzoom.png`

## Notes

- Evidence ini melengkapi smoke browse-first sebelumnya di `docs/uat/public-map-browse-first-static-smoke-2026-03-13.md`.
- Smoke staging nyata untuk `backend-proxy` tetap pending dan harus mengikuti `docs/uat/public-map-wfs-staging-handoff.md`.
