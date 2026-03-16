# OKU Selatan Spatial Guard Smoke — 2026-03-16

## Scope

- Smoke ini dijalankan terhadap worktree `oku-selatan-spatial-guard` pada server lokal `http://127.0.0.1:5010`.
- Port `5000` sedang dipakai proses lain, sehingga smoke browser diisolasi ke port `5010` agar evidence tetap berasal dari build/runtime worktree ini.
- Verifikasi browser memakai Playwright CLI terhadap flow backoffice dan public map.
- Verifikasi API memakai request HTTP langsung ke server lokal yang sama.

## Result

- PASS: picker menerima titik in-region di Muaradua.
  - Koordinat klik terkontrol: `-4.5348497, 104.0736724`
  - Field form setelah klik:
    - `latitude = -4.5348497`
    - `longitude = 104.0736724`
- PASS: picker menolak titik di luar OKU Selatan.
  - Koordinat klik terkontrol: `-2.9909300, 104.7565500`
  - Feedback operator tampil: `Titik harus berada di dalam Kabupaten OKU Selatan.`
  - Koordinat valid sebelumnya tetap dipertahankan:
    - `latitude = -4.5348497`
    - `longitude = 104.0736724`
- PASS: create OP dengan koordinat luar wilayah ditolak server.
  - Authenticated `POST /api/objek-pajak` mengembalikan `400`
  - Pesan error: `Koordinat berada di luar kabupaten aktif OKU Selatan`
- PASS: map publik hanya memuat marker in-region.
  - `GET /api/objek-pajak/map?bbox=104.70,-3.05,104.80,-2.95&limit=50`
    - `totalInView = 0`
    - `items = 0`
  - `GET /api/objek-pajak/map?bbox=104.06,-4.55,104.09,-4.52&limit=50`
    - `totalInView = 2`
    - `items = 2`
- PASS: deep-link marker existing tetap bekerja untuk data in-region.
  - URL smoke:
    - `/?focusOpId=16&focusLat=-4.5335917&focusLng=104.0720511`
  - Result pada map publik:
    - `1 dalam viewport`
    - `1 marker`
    - popup marker tampil untuk `Sumur Air Dummy`

## Artifacts

- Screenshot picker menerima titik in-region:
  - `output/playwright/oku-spatial-guard-picker-inside.png`
- Screenshot picker menolak titik luar wilayah:
  - `output/playwright/oku-spatial-guard-picker-outside-reject.png`
- Screenshot public map deep-link in-region:
  - `output/playwright/oku-spatial-guard-public-map-deeplink.png`

## Notes

- Smoke ini sengaja memverifikasi deep-link memakai record in-region yang sudah lolos scope boundary aktif.
- Evidence API dan browser konsisten dengan regression suite:
  - `region-boundary-client.integration.ts`
  - `objek-pajak-spatial-guard.integration.ts`
  - `public-map-region-scope.integration.ts`
