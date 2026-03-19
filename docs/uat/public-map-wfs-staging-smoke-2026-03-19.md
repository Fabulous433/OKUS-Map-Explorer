# Public Map WFS Staging Smoke — 2026-03-19

## Scope

- Target yang diuji: `https://staging-map.ucup.me`
- Evidence diambil dari staging nyata setelah parity fix bundle produksi masuk ke `codex/staging`.
- Smoke memakai Playwright CLI session terpisah:
  - `stg7` untuk desktop
  - `stg7m` untuk mobile
- Tujuan smoke:
  - memastikan baseline UX stage drill-down hidup di staging, bukan hanya di localhost
  - memastikan boundary aktif, stage wilayah, marker OP, dan route-state bekerja pada deploy VPS
  - memastikan hasil network jujur tentang mode runtime final yang dipakai staging

## Runtime

- Mode runtime final yang teramati saat smoke ini adalah `internal-api`.
- Evidence network menunjukkan marker dimuat dari:
  - `/api/objek-pajak/map`
- Typed WFS proxy tetap sehat, tetapi tidak menjadi jalur marker aktif saat smoke ini:
  - `/api/objek-pajak/map-wfs?bbox=104,-4.6,104.1,-4.4&limit=50` -> `200`
  - `/api/objek-pajak/map-wfs?bbox=invalid` -> `400`
- Evidence network utama:
  - [desktop-desa-bumi-agung-network.log](/D:/Code/OKUS-Map-Explorer/output/playwright/2026-03-19-staging-smoke/desktop-desa-bumi-agung-network.log)
  - [mobile-route-restore-network.log](/D:/Code/OKUS-Map-Explorer/output/playwright/2026-03-19-staging-smoke/mobile-route-restore-network.log)

## API Spot Checks

- PASS: `GET /api/objek-pajak/map-wfs?bbox=104,-4.6,104.1,-4.4&limit=50` -> `200`
- PASS: `GET /api/objek-pajak/map-wfs?bbox=invalid` -> `400`
- PASS: payload sample `map-wfs` tetap berbentuk `FeatureCollection` dengan field:
  - `numberMatched`
  - `numberReturned`
  - `features[]`
  - `geometry.type = Point`
  - koordinat GeoJSON `[lng, lat]`
- Payload sample yang teramati di staging:
  - `id = 1`
  - `nama_op = Cemara Homestay`
  - `jenis_pajak = PBJT Jasa Perhotelan`
  - `coordinates = [104.0736256, -4.5455788]`

## Result Matrix

### Desktop

- PASS: root load langsung masuk stage `Kabupaten` dengan konteks `OKU Selatan`.
  - zoom-out root sudah disabled, jadi user tidak bisa keluar ke world overview
  - screenshot:
    - [desktop-root-oku-selatan.png](/D:/Code/OKUS-Map-Explorer/output/playwright/2026-03-19-staging-smoke/desktop-root-oku-selatan.png)
- PASS: quick-jump/route entry ke stage `Kecamatan` bekerja untuk `Muara Dua`.
  - header berubah ke `Muara Dua`
  - desa scoped terlihat
  - screenshot:
    - [desktop-kecamatan-muara-dua.png](/D:/Code/OKUS-Map-Explorer/output/playwright/2026-03-19-staging-smoke/desktop-kecamatan-muara-dua.png)
- PASS: stage `Desa` positif bekerja untuk `Bumi Agung`.
  - header `Bumi Agung`
  - status `1 OP aktif`
  - chip pajak tampil
  - OP rail tampil sinkron
  - screenshot:
    - [desktop-desa-bumi-agung.png](/D:/Code/OKUS-Map-Explorer/output/playwright/2026-03-19-staging-smoke/desktop-desa-bumi-agung.png)
- PASS: popup marker/detail OP tetap hidup di staging.
  - item yang terbuka: `Cemara Homestay`
  - detail yang terlihat:
    - `PBJT Jasa Perhotelan`
    - `NOPD: OP.321.001.2026`
    - `Tebing Gading`
    - `Rp 1.500.000 / bulan`
  - screenshot:
    - [desktop-desa-bumi-agung-popup.png](/D:/Code/OKUS-Map-Explorer/output/playwright/2026-03-19-staging-smoke/desktop-desa-bumi-agung-popup.png)
- PASS: negative/empty state valid untuk `Batu Belang Jaya`.
  - status `0 OP aktif`
  - rail menampilkan empty state jujur
  - toast bawah juga tampil
  - screenshot:
    - [desktop-desa-batu-belang-jaya-empty.png](/D:/Code/OKUS-Map-Explorer/output/playwright/2026-03-19-staging-smoke/desktop-desa-batu-belang-jaya-empty.png)
- PASS: existing focus-link entry masih bekerja.
  - URL yang diuji:
    - `/?focusOpId=1&focusLat=-4.5455788&focusLng=104.0736256`
  - popup `Cemara Homestay` langsung terbuka
  - screenshot:
    - [desktop-focus-link-cemara-homestay.png](/D:/Code/OKUS-Map-Explorer/output/playwright/2026-03-19-staging-smoke/desktop-focus-link-cemara-homestay.png)
- PASS: cycle basemap desktop tetap sehat untuk `OSM -> Carto -> ESRI Sat`.
  - pada `ESRI Sat`, state yang diamati tidak memunculkan `Map data not yet available`
  - tombol `Zoom in` observed disabled pada state fokus yang diuji, konsisten dengan zoom-safe cap
  - screenshot:
    - [desktop-focus-link-esri-safe.png](/D:/Code/OKUS-Map-Explorer/output/playwright/2026-03-19-staging-smoke/desktop-focus-link-esri-safe.png)

### Mobile

- PASS: root mobile tampil ringkas dan compact.
  - hanya title `OKU Selatan`
  - quick jump ringkas `Cari Kecamatan`
  - screenshot:
    - [mobile-root-oku-selatan.png](/D:/Code/OKUS-Map-Explorer/output/playwright/2026-03-19-staging-smoke/mobile-root-oku-selatan.png)
- PASS: stage `Desa` positif di mobile bekerja untuk `Bumi Agung`.
  - title compact `Bumi Agung`
  - polygon aktif transparan
  - bottom sheet OP mobile tampil
  - item `Cemara Homestay` terlihat
  - screenshot:
    - [mobile-desa-bumi-agung-sheet.png](/D:/Code/OKUS-Map-Explorer/output/playwright/2026-03-19-staging-smoke/mobile-desa-bumi-agung-sheet.png)
- PASS: negative/empty state mobile valid untuk `Batu Belang Jaya`.
  - bottom sheet empty state tampil
  - screenshot:
    - [mobile-desa-batu-belang-jaya-empty.png](/D:/Code/OKUS-Map-Explorer/output/playwright/2026-03-19-staging-smoke/mobile-desa-batu-belang-jaya-empty.png)

### Error State

- NOT EXERCISED on real staging.
- Alasan:
  - staging saat smoke ini sehat
  - app tidak punya trigger UI aman untuk memaksa request map gagal
  - Playwright CLI yang tersedia di host ini tidak menyediakan network mocking/intercept yang stabil untuk memaksa failure path secara jujur
- Status ini dicatat eksplisit agar tidak tercatat PASS palsu.

## Observations

- Production parity issue yang sebelumnya membedakan staging vs localhost sudah tertutup:
  - boundary aktif staging kembali `200`
  - internal marker route staging kembali `200`
- Noise console yang masih terlihat tidak berasal dari app map:
  - `static.cloudflareinsights.com` beacon DNS failure
  - pada salah satu mobile load awal, font CDN `fonts.gstatic.com` sempat `ERR_CONNECTION_CLOSED`
- Snapshot YAML Playwright untuk mobile kadang tertinggal dari visual screen yang sebenarnya. Untuk mobile, screenshot PNG dijadikan source of truth utama.

## Conclusion

- PASS untuk smoke staging utama desktop dan mobile:
  - idle/root state
  - stage `kecamatan`
  - stage `desa`
  - positive OP state
  - empty state
  - focus-link
  - basemap cycle sampai `ESRI Sat`
- Runtime final yang benar-benar dipakai staging saat smoke ini adalah `internal-api`, bukan `backend-proxy`.
- Typed WFS proxy tetap sehat dan siap dipakai, tetapi belum menjadi jalur marker aktif pada deploy staging yang diuji.
- Satu item yang masih tersisa untuk coverage staging murni adalah forced error-state browser; itu belum bisa diexercise dengan tool/hook yang tersedia saat sesi ini.
