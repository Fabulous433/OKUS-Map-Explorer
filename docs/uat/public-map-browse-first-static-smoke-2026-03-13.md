# Public Map Browse-First Static Smoke — 2026-03-13

## Scope

- Evidence ini diambil dari build statis `dist/public` yang diserve lokal di `http://127.0.0.1:4173`.
- Tujuannya spesifik untuk memverifikasi perilaku frontend pada load awal:
  - map tidak lagi salah fokus ke `0,0`
  - basemap jalan tampil pada center wilayah default
  - idle hint tampil tanpa marker
- Dokumen ini bukan pengganti smoke staging/API karena server statis tidak menyediakan endpoint `/api/*`.

## Result

- PASS: load awal map berada pada wilayah OKU Selatan sekitar Muaradua, bukan koordinat `0,0`.
- PASS: basemap OpenStreetMap termuat pada load awal. Sampling browser menunjukkan `24` tile aktif dengan `naturalWidth = 256`.
- PASS: idle hint tampil pada sudut kiri bawah:
  - `Peta wilayah aktif. Cari OP / NOPD / alamat atau pilih filter untuk menampilkan marker.`
- PASS: badge kanan bawah tampil dalam mode netral:
  - `MODE JELAJAH WILAYAH`

## Expected Static-Only Errors

- `GET /api/master/kecamatan` -> `404`
- `GET /api/master/rekening-pajak` -> `404`

Error di atas expected karena smoke ini hanya memverifikasi frontend build statis tanpa backend/API.

## Artifacts

- Screenshot viewport:
  - `.playwright-cli/page-2026-03-12T18-31-08-347Z.png`

## Notes

- Root cause bug yang diperbaiki pada batch ini adalah parser focus param yang sebelumnya memaknai query string kosong sebagai `focusLat=0` dan `focusLng=0`.
- Smoke staging nyata tetap pending dan harus mengikuti `docs/uat/public-map-wfs-staging-handoff.md`.
