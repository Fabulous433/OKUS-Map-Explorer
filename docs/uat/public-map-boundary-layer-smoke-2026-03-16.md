# Public Map Boundary Layer Smoke — 2026-03-16

## Scope

- Smoke ini dijalankan terhadap worktree `map-wfs-boundary-layer-filters` pada server lokal `http://127.0.0.1:5010`.
- Port `5000` sengaja tidak dipakai agar root checkout dan worktree feature tidak saling berebut runtime.
- Verifikasi browser memakai Playwright lokal dengan artifact di `output/playwright`.
- Regression suite tetap menjadi baseline utama; smoke ini merekam perilaku UI atlas panel dan lazy boundary fetch pada runtime browser.

## Result

- PASS: public map default hanya menampilkan konteks kabupaten aktif.
  - Boundary aktif yang dimuat saat initial load:
    - `GET /api/region-boundaries/active/kabupaten`
  - Evidence visual menunjukkan area luar kabupaten dibuat redup dengan vector mask/dimming, bukan blur raster.
- PASS: panel atlas desktop menampilkan tiga tab operasional.
  - Tab visible:
    - `Peta`
    - `Informasi`
    - `Cari`
- PASS: toggle `kecamatan` memuat polygon berwarna dan label.
  - Request terpicu:
    - `GET /api/region-boundaries/active/kecamatan`
  - Tooltip/label setelah layer aktif:
    - `20`
- PASS: slider opacity `kecamatan` benar-benar mengubah nilai layer aktif.
  - `opacityBefore = 72`
  - `opacityAfter = 71`
- PASS: toggle `desa/kelurahan` tanpa scope kecamatan tidak melakukan full fetch dan menampilkan helper yang jujur.
  - Helper copy:
    - `Pilih kecamatan untuk memuat batas desa`
  - Request `desa` sebelum memilih kecamatan:
    - `0`
- PASS: setelah memilih kecamatan, layer `desa/kelurahan` dimuat secara scoped.
  - Kecamatan smoke terpilih:
    - `Kisam Ilir`
  - Request scoped:
    - `GET /api/region-boundaries/active/desa?kecamatanId=1609001`
  - Tooltip/label setelah scope desa aktif:
    - `29`
- PASS: tab `Informasi` menampilkan legend polygon sesuai layer aktif.
  - Legend `kecamatan` tampil saat layer kecamatan aktif.
  - Legend `desa/kelurahan` tampil setelah scope desa aktif.
- PASS: deep-link marker existing tetap berfungsi.
  - API viewport smoke menemukan record:
    - `id = 16`
    - `namaOp = Sumur Air Dummy`
    - `latitude = -4.5335917`
    - `longitude = 104.0720511`
  - URL deep-link:
    - `/?focusOpId=16&focusLat=-4.5335917&focusLng=104.0720511`
  - Result browser:
    - `markerCount = 1`
    - popup visible = `true`

## Artifacts

- Screenshot default public map dengan dimming luar kabupaten:
  - `output/playwright/public-map-boundary-default.png`
- Screenshot atlas panel dengan legend polygon aktif:
  - `output/playwright/public-map-boundary-layers.png`
- Screenshot deep-link marker existing:
  - `output/playwright/public-map-boundary-deeplink.png`
- JSON result smoke:
  - `output/playwright/public-map-boundary-smoke.json`

## Notes

- Smoke ini mengunci satu prinsip rollout penting:
  - `kabupaten` boleh tampil sebagai konteks default,
  - `kecamatan` dan `desa/kelurahan` tetap lazy,
  - payload `desa` tidak pernah diunduh penuh pada initial load.
- Port `5010` sudah dibersihkan setelah smoke; state `TIME_WAIT` yang tersisa berasal dari koneksi loopback biasa, bukan server yang masih listen.
