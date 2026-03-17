# Public Map Playwright Local Smoke — 2026-03-17

## Scope

- Evidence ini diambil dari app lokal di `http://127.0.0.1:5000`.
- Smoke dijalankan dengan Playwright CLI headless untuk menutup checklist browser utama pada stream map publik:
  - desktop positive flow
  - mobile positive flow
  - focus query param
  - empty state
  - error state
  - basemap desktop
  - boundary layer visual smoke
- Smoke ini bukan pengganti staging nyata. Task `7.0` pada `tasks/tasks-map-wfs-refactor.md` tetap belum ditutup karena target staging belum diuji.

## Runtime Mode Observed

- Mode data map yang benar-benar teramati di browser lokal saat smoke ini adalah `internal-api`, bukan `backend-proxy`.
- Evidence network:
  - `GET /api/objek-pajak/map?...&q=Walet` -> `200`
- Ini berarti item `7.3` masih perlu konfirmasi terpisah untuk staging nyata.

## Bug Fixed During Smoke

### Fixed

- Public map sebelumnya tidak selalu memiliki `bbox` awal saat first load.
- Dampaknya:
  - search/filter bisa bergantung pada `moveend` yang kebetulan terjadi
  - forced error smoke tidak konsisten
- Fix yang diterapkan:
  - helper baru [map-viewport-tracker.ts](/D:/Code/OKUS-Map-Explorer/client/src/lib/map/map-viewport-tracker.ts)
  - regression baru [map-viewport-tracker.integration.ts](/D:/Code/OKUS-Map-Explorer/tests/integration/map-viewport-tracker.integration.ts)
  - `MapViewportTracker` sekarang emit snapshot awal viewport sekali saat bind, lalu subscribe `moveend/zoomend`
  - loop render akibat callback inline juga diperbaiki dengan `ref` callback stabil di [map-page.tsx](/D:/Code/OKUS-Map-Explorer/client/src/pages/map-page.tsx)

## API Spot Checks

- PASS: `GET /api/objek-pajak/map-wfs?bbox=103.40621216900011,-4.924159181999924,104.36908989100009,-4.222749527999939&limit=5` -> `200`, `FeatureCollection`, `numberMatched`, `geometry.type = Point`
- PASS: `GET /api/objek-pajak/map-wfs?bbox=invalid` -> `400`, message `bbox tidak valid. Gunakan format minLng,minLat,maxLng,maxLat`

## Result

### Desktop Positive

- PASS: halaman `/` load tanpa runtime error setelah fix viewport bootstrap.
- PASS: idle browse-first tampil:
  - hint `Peta wilayah aktif. Cari OP / NOPD / alamat atau pilih filter untuk menampilkan marker.`
  - badge netral `mode jelajah wilayah`
- PASS: search `Walet` memunculkan tepat `1` marker.
- PASS: filter `kecamatan = Muaradua` dan `rekening = 4.1.01.13.01.0001` sinkron dengan hasil marker:
  - marker visible `1`
  - popup marker berisi `Walet Budi`
  - `NOPD: 13.01.01.0008`
  - `Tebing Gading`
  - `Rp 400.000 / bulan`
- PASS: focus query param bekerja untuk `focusOpId=313&focusLat=-4.5404425&focusLng=104.0686514`

### Desktop Basemap

- PASS: button list basemap desktop tetap aktif.
- PASS: `ESRI Sat` berhasil aktif.
- PASS: zoom berulang tidak melewati `17`.
- Evidence tile zoom yang teramati hanya:
  - `14`
  - `17`

### Desktop Negative

- PASS: empty state tampil untuk query tanpa hasil:
  - search `zzztidakada`
  - text `Tidak ada objek pajak pada viewport ini.`
- PASS: error state tampil saat endpoint map dipaksa `500`:
  - routed request `GET /api/objek-pajak/map?...&q=Walet`
  - banner/error text `forced smoke failure`

### Mobile Positive

- PASS: header mobile tampil normal (`PETA OP`).
- PASS: FAB filter membuka drawer atlas tanpa error.
- PASS: search `Walet` memunculkan `1` marker dan badge info tetap sinkron.
- PASS: basemap mobile bisa pindah ke `Carto`.

### Mobile Negative

- PASS: empty state mobile tampil untuk search `zzztidakada`.
- PASS: error state mobile tampil saat endpoint map dipaksa `500`:
  - text `forced mobile smoke failure`

### Boundary Layer Smoke

- PASS: toggle `Polygon Kecamatan` memuat layer boundary kecamatan:
  - `GET /api/region-boundaries/active/kecamatan` -> `200`
- PASS: setelah zoom in, label kecamatan tampil di map:
  - `Banding Agung`
  - `Kisam Ilir`
  - `Muara Dua`
  - `Sungai Are`
  - dan label lain sesuai 19 kecamatan
- NEEDS FOLLOW-UP: klik polygon kecamatan belum bisa dibuktikan end-to-end lewat Playwright headless.
  - Saya mencoba klik label, klik pusat path SVG, dan brute-force klik semua `19` polygon visible.
  - Tidak ada request viewport baru yang terpicu dari automation headless itu.
  - Karena feature selection untuk boundary sudah punya regression helper di [public-boundary-layer.integration.ts](/D:/Code/OKUS-Map-Explorer/tests/integration/public-boundary-layer.integration.ts), hasil ini saya catat sebagai follow-up UAT manual/headed, bukan saya tandai PASS palsu.

## Drift Notes

- Dokumen [public-map-wfs-staging-handoff.md](/D:/Code/OKUS-Map-Explorer/docs/uat/public-map-wfs-staging-handoff.md) masih membawa asumsi city-first lama:
  - `home/reset` ke Muaradua
  - zoom awal `15`
  - default mode `backend-proxy`
- Baseline lokal saat smoke ini berbeda:
  - viewport awal menyesuaikan boundary kabupaten aktif
  - mode yang teramati `internal-api`

## Artifacts

- Desktop home:
  - [smoke-2026-03-17-desktop-home.png](/D:/Code/OKUS-Map-Explorer/output/playwright/smoke-2026-03-17-desktop-home.png)
- Desktop search:
  - [smoke-2026-03-17-search-walet-fixed.png](/D:/Code/OKUS-Map-Explorer/output/playwright/smoke-2026-03-17-search-walet-fixed.png)
- Desktop filter + popup:
  - [smoke-2026-03-17-desktop-filter-popup.png](/D:/Code/OKUS-Map-Explorer/output/playwright/smoke-2026-03-17-desktop-filter-popup.png)
- Desktop ESRI max zoom:
  - [smoke-2026-03-17-desktop-esri-maxzoom.png](/D:/Code/OKUS-Map-Explorer/output/playwright/smoke-2026-03-17-desktop-esri-maxzoom.png)
- Focus popup:
  - [smoke-2026-03-17-focus-popup.png](/D:/Code/OKUS-Map-Explorer/output/playwright/smoke-2026-03-17-focus-popup.png)
- Desktop empty:
  - [smoke-2026-03-17-empty-state-desktop.png](/D:/Code/OKUS-Map-Explorer/output/playwright/smoke-2026-03-17-empty-state-desktop.png)
- Desktop error:
  - [smoke-2026-03-17-error-state-desktop-fixed.png](/D:/Code/OKUS-Map-Explorer/output/playwright/smoke-2026-03-17-error-state-desktop-fixed.png)
- Mobile positive:
  - [smoke-2026-03-17-mobile-positive.png](/D:/Code/OKUS-Map-Explorer/output/playwright/smoke-2026-03-17-mobile-positive.png)
- Mobile empty:
  - [smoke-2026-03-17-mobile-empty.png](/D:/Code/OKUS-Map-Explorer/output/playwright/smoke-2026-03-17-mobile-empty.png)
- Mobile error:
  - [smoke-2026-03-17-mobile-error.png](/D:/Code/OKUS-Map-Explorer/output/playwright/smoke-2026-03-17-mobile-error.png)
- Boundary visual:
  - [smoke-2026-03-17-boundary-kecamatan-layer.png](/D:/Code/OKUS-Map-Explorer/output/playwright/smoke-2026-03-17-boundary-kecamatan-layer.png)
  - [smoke-2026-03-17-boundary-kecamatan-zoomed.png](/D:/Code/OKUS-Map-Explorer/output/playwright/smoke-2026-03-17-boundary-kecamatan-zoomed.png)
  - [smoke-2026-03-17-boundary-bruteforce.png](/D:/Code/OKUS-Map-Explorer/output/playwright/smoke-2026-03-17-boundary-bruteforce.png)

## Verification

- `npx tsx tests/integration/map-viewport-tracker.integration.ts` -> PASS
- `npm run check` -> PASS
