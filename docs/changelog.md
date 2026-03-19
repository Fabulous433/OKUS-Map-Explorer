# Changelog

## Phase 2.16o — Public Map Production Boundary Parity

### Added
- Production-bundle regression coverage for active region boundaries:
  - [tests/integration/region-boundary-production-bundle.integration.ts](/D:/Code/OKUS-Map-Explorer/tests/integration/region-boundary-production-bundle.integration.ts)

### Fixed
- Route `/api/region-boundaries/active/*` tidak lagi gagal hanya pada output server production `dist/index.cjs`.
- Perhitungan `bounds` boundary sekarang tidak lagi bergantung pada jalur import runtime yang sehat di `tsx` dev tetapi pecah di bundle produksi; `server/region-boundaries.ts` kini menghitung bounds langsung dari koordinat GeoJSON.

### Notes
- Root cause mismatch VPS vs localhost: staging/prod bundle gagal memuat boundary kabupaten dengan `500`, sehingga UI jatuh ke fallback center/zoom dan polygon kabupaten/kecamatan tidak muncul walau shell stage header sudah termuat.
- Setelah fix ini, route `GET /api/region-boundaries/active/kabupaten` kembali `200` di mode production lokal yang mem-boot `dist/index.cjs`, sehingga staging perlu redeploy commit terbaru untuk mendapatkan perilaku yang sama.

## Phase 2.16n — Public Map UX Polish

### Added
- Quick-jump wilayah publik untuk `kecamatan` dan `desa`:
  - [client/src/components/map/public-map-region-jump.tsx](/D:/Code/OKUS-Map-Explorer/client/src/components/map/public-map-region-jump.tsx)
  - [client/src/lib/map/public-map-region-search.ts](/D:/Code/OKUS-Map-Explorer/client/src/lib/map/public-map-region-search.ts)
- Route-state helper shareable untuk `stage`, `kecamatanId`, `desaKey`, dan `taxType`:
  - [client/src/lib/map/public-map-route-state.ts](/D:/Code/OKUS-Map-Explorer/client/src/lib/map/public-map-route-state.ts)
- Desktop OP rail baru untuk tahap desa:
  - [client/src/components/map/public-map-op-rail.tsx](/D:/Code/OKUS-Map-Explorer/client/src/components/map/public-map-op-rail.tsx)
  - [client/src/lib/map/public-map-op-list-model.ts](/D:/Code/OKUS-Map-Explorer/client/src/lib/map/public-map-op-list-model.ts)
- Mobile OP bottom sheet baru untuk tahap desa:
  - [client/src/components/map/public-map-op-bottom-sheet.tsx](/D:/Code/OKUS-Map-Explorer/client/src/components/map/public-map-op-bottom-sheet.tsx)
  - [client/src/lib/map/public-map-mobile-op-sheet-model.ts](/D:/Code/OKUS-Map-Explorer/client/src/lib/map/public-map-mobile-op-sheet-model.ts)
- Helper preferensi/public-map polish baru:
  - [client/src/lib/map/public-map-preferences.ts](/D:/Code/OKUS-Map-Explorer/client/src/lib/map/public-map-preferences.ts)
- Regression suites baru:
  - [tests/integration/public-map-route-state.integration.ts](/D:/Code/OKUS-Map-Explorer/tests/integration/public-map-route-state.integration.ts)
  - [tests/integration/public-map-region-search.integration.ts](/D:/Code/OKUS-Map-Explorer/tests/integration/public-map-region-search.integration.ts)
  - [tests/integration/public-map-op-list-model.integration.ts](/D:/Code/OKUS-Map-Explorer/tests/integration/public-map-op-list-model.integration.ts)
  - [tests/integration/public-map-mobile-op-sheet.integration.ts](/D:/Code/OKUS-Map-Explorer/tests/integration/public-map-mobile-op-sheet.integration.ts)
  - [tests/integration/public-map-preferences.integration.ts](/D:/Code/OKUS-Map-Explorer/tests/integration/public-map-preferences.integration.ts)
- Evidence smoke UX polish:
  - [docs/uat/public-map-stage-drilldown-local-smoke-2026-03-18.md](/D:/Code/OKUS-Map-Explorer/docs/uat/public-map-stage-drilldown-local-smoke-2026-03-18.md)

### Improved
- Map publik sekarang bisa dibuka ulang atau dibagikan langsung ke stage `kecamatan`/`desa` yang sama, termasuk filter jenis pajak aktif.
- Quick-jump kini toleran terhadap perbedaan penulisan seperti `Muara Dua` vs `Muaradua`, sehingga search wilayah tetap usable walau master dan boundary berbeda gaya spasi.
- Header desktop sekarang menampilkan status kontekstual ringan seperti jumlah `kecamatan/desa`, `OP aktif`, dan singkatan filter aktif.
- Pilihan basemap publik sekarang diingat via `localStorage`, jadi refresh tidak lagi me-reset preferensi user.
- Saat user masuk `kecamatan`, boundary desa scoped kini diprefetch agar transisi ke desa terasa lebih cepat.

### Fixed
- Reload pada tahap desa tidak lagi menghapus `taxType` aktif sebelum marker scoped selesai dipulihkan dari route-state.
- Surface quick-jump tidak lagi bergantung pada perilaku `cmdk` untuk menampilkan hasil; list hasil sekarang dirender langsung dan stabil untuk smoke browser.

### Notes
- Smoke lokal 2026-03-19 PASS untuk:
  - desktop quick-jump `Muara Dua -> Batu Belang Jaya`
  - desktop OP rail + popup marker
  - URL restore `stage/desa/filter`
  - basemap memory setelah refresh
  - mobile quick-jump sheet + bottom sheet detail
- Noise console `ERR_INSUFFICIENT_RESOURCES` dari tile basemap headless tidak dihitung sebagai error aplikasi saat smoke Playwright lokal.

## Phase 2.16m — Mobile Stage Shell Compaction

### Added
- Evidence smoke mobile tambahan untuk kompaksi stage shell:
  - [docs/uat/public-map-stage-drilldown-local-smoke-2026-03-18.md](/D:/Code/OKUS-Map-Explorer/docs/uat/public-map-stage-drilldown-local-smoke-2026-03-18.md)
- Regression baru:
  - [tests/integration/public-map-mobile-shell.integration.ts](/D:/Code/OKUS-Map-Explorer/tests/integration/public-map-mobile-shell.integration.ts)

### Improved
- Header public map pada viewport mobile sekarang hanya menampilkan judul stage agar chrome atas tidak memakan area peta.
- Ukuran judul stage mobile diturunkan ke `text-lg` sambil mempertahankan ukuran desktop yang lebih besar.
- Chip filter jenis pajak pada tahap desa sekarang memakai label ringkas khusus mobile, misalnya:
  - `Semua`
  - `WLT`
- Marker icon dan chip filter kini memakai compact label helper yang sama agar kode singkatan tetap konsisten.

### Notes
- Smoke lokal 2026-03-19 PASS untuk flow mobile `OKU Selatan -> Muara Dua -> Batu Belang Jaya` dengan header compact dan chip pajak ringkas.

## Phase 2.16l — Desktop Desa Focus Tuning

### Added
- Evidence smoke desktop tambahan untuk tuning desa fokus:
  - [docs/uat/public-map-stage-drilldown-local-smoke-2026-03-18.md](/D:/Code/OKUS-Map-Explorer/docs/uat/public-map-stage-drilldown-local-smoke-2026-03-18.md)

### Improved
- Stage desa sekarang tetap menampilkan seluruh desa scoped dalam kecamatan aktif, tetapi desa yang dipilih dibuat transparan agar citra dasar tidak lagi tertutup fill warna.
- Query marker tahap desa sekarang memakai bounds desa aktif, bukan bbox viewport sempit, sehingga marker OP desa tetap bisa muncul walau stage dibuka pada zoom paling dekat.
- Auto-focus marker desa sekarang menunggu zoom stage desa selesai lalu melakukan pan ringan ke marker awal, sehingga konteks desa dan marker OP sama-sama tetap terlihat.

### Fixed
- Basemap `ESRI Satellite` sekarang dibatasi di zoom `16`, tidak lagi memancing tile `Map data not yet available`.
- Masuk ke stage desa pada desktop sekarang berhenti di zoom aman tertinggi dengan tombol `Zoom in` langsung nonaktif setelah viewport settle.

### Notes
- Smoke desktop final memakai flow `Muara Dua -> Batu Belang Jaya` dan mengunci tiga bukti sekaligus:
  - tile ESRI berhenti di `/16/...`
  - `fillOpacity=0` hanya pada desa aktif
  - marker `WLT` tetap visible

## Phase 2.16k — Stage Drill-Down Smoke Closure

### Added
- Evidence smoke browser lokal baru:
  - [docs/uat/public-map-stage-drilldown-local-smoke-2026-03-18.md](/D:/Code/OKUS-Map-Explorer/docs/uat/public-map-stage-drilldown-local-smoke-2026-03-18.md)

### Fixed
- Klik polygon `kecamatan` kini tetap berfungsi walau `master/kecamatan` selesai load setelah layer boundary terpasang; callback boundary sekarang membaca daftar kecamatan live, bukan closure render awal.
- Marker desa tidak lagi bocor saat user kembali dari stage `desa` ke `kecamatan`, sehingga loop `Maximum update depth exceeded` akibat overlay stale tertutup.
- Chip filter desa di mobile dipindah ke bawah map agar marker aktif tetap bisa disentuh.
- Popup marker mobile tidak lagi memicu loop overlay karena `autoPan` Leaflet dimatikan untuk marker popup stage desa.

### Notes
- Smoke lokal 2026-03-18 PASS untuk desktop dan mobile pada baseline stage baru:
  - root `kabupaten`
  - drill ke `kecamatan`
  - drill ke `desa`
  - popup marker `Walet Budi`
  - back `desa -> kecamatan`

## Phase 2.16j — Public Map Stage Drill-Down

### Added
- State machine baru di map publik untuk tahap navigasi:
  - `kabupaten`
  - `kecamatan`
  - `desa`
- Shell map-first baru di [client/src/pages/map-page.tsx](/D:/Code/OKUS-Map-Explorer/client/src/pages/map-page.tsx) dengan header kiri atas, tombol kembali bertingkat, dan chip filter jenis pajak inline yang hanya tampil pada tahap desa.
- Helper stage model baru:
  - [client/src/lib/map/public-map-stage-model.ts](/D:/Code/OKUS-Map-Explorer/client/src/lib/map/public-map-stage-model.ts)
- Regression suite baru:
  - [tests/integration/public-map-stage-model.integration.ts](/D:/Code/OKUS-Map-Explorer/tests/integration/public-map-stage-model.integration.ts)

### Improved
- Map publik sekarang mulai dari konteks OKU Selatan, bukan city-first Muaradua; zoom default region diturunkan agar load awal langsung terasa seperti overview kabupaten.
- Klik polygon `kecamatan` sekarang masuk ke mode fokus kecamatan:
  - viewport terkunci ke bounds kecamatan
  - polygon kecamatan lain tidak lagi jadi layer aktif
  - polygon desa scoped untuk kecamatan tersebut langsung dimuat
- Klik polygon `desa/kelurahan` sekarang masuk ke mode fokus desa:
  - viewport terkunci ke bounds desa
  - marker `Objek Pajak` baru aktif pada tahap ini
  - filter jenis pajak tampil sebagai chip inline di atas peta
- Tombol kembali sekarang bekerja sesuai hirarki wilayah:
  - `desa -> kecamatan`
  - `kecamatan -> kabupaten`
- Deep-link marker tetap dipertahankan sebagai jalur exception, tetapi interaksi drill-down manual sekarang dapat mengambil alih flow dan mengembalikan pengguna ke mode spasial utama.

### Fixed
- Reset peta publik kini benar-benar mengembalikan viewport ke root OKU Selatan, bukan hanya mereset state internal.
- Kontrol map publik tidak lagi bertumpu pada panel atlas besar untuk membuka boundary; baseline navigasi kini berpindah ke interaksi polygon langsung di atas peta.

### Notes
- Verifikasi batch ini saat ini mencakup `npm run check`, `npm run build`, dan regression integration terkait stage model, boundary interaction, region scope, dan focus params.
- Smoke browser visual khusus stage drill-down masih perlu direkam terpisah bila ingin dijadikan evidence UAT.

## Phase 2.16i — Boundary Drill-Down Closure

### Added
- Regression baru di [tests/integration/public-boundary-layer.integration.ts](/D:/Code/OKUS-Map-Explorer/tests/integration/public-boundary-layer.integration.ts) untuk mengunci normalisasi nama boundary `Muara Dua` -> master `Muaradua`.
- Evidence smoke boundary drill-down diperbarui di [docs/uat/public-map-playwright-local-smoke-2026-03-17.md](/D:/Code/OKUS-Map-Explorer/docs/uat/public-map-playwright-local-smoke-2026-03-17.md).

### Fixed
- Klik polygon `kecamatan` kini resolve konsisten ke filter `kecamatanId` meski penulisan nama pada asset boundary dan master wilayah berbeda format spasi.
- Drill-down `kecamatan -> desa` kini lolos smoke Playwright lokal sampai badge viewport dan marker scoped:
  - `1 dalam kecamatan Muara Dua`
  - `1 dalam desa Batu Belang Jaya`

### Notes
- False negative awal pada layer `desa` berasal dari proses dev server lama yang stale; setelah restart `npm run dev` fresh, endpoint scoped desa kembali menyajikan JSON yang benar.

## Phase 2.16h — Public Map Smoke Hardening

### Added
- Regression baru [tests/integration/map-viewport-tracker.integration.ts](/D:/Code/OKUS-Map-Explorer/tests/integration/map-viewport-tracker.integration.ts) untuk mengunci bootstrap bbox awal map publik.
- Evidence smoke Playwright lokal baru:
  - [docs/uat/public-map-playwright-local-smoke-2026-03-17.md](/D:/Code/OKUS-Map-Explorer/docs/uat/public-map-playwright-local-smoke-2026-03-17.md)

### Fixed
- Map publik tidak lagi menunggu `moveend/zoomend` kebetulan sebelum search/filter pertama bisa memicu query viewport.
- Loop render `Maximum update depth exceeded` pada tracker viewport awal ditutup dengan callback ref stabil di composition root map.

### Notes
- Smoke lokal 2026-03-17 mengamati mode runtime map saat ini masih `internal-api`; konfirmasi staging/fallback tetap harus dilakukan terpisah.

## Phase 2.16g — Public Map Boundary Atlas Layers

### Added
- Endpoint publik baru `GET /api/region-boundaries/active/desa?kecamatanId=...` untuk memuat polygon `desa/kelurahan` secara lazy dan scoped.
- Helper state/style boundary layer baru untuk mengelola toggle, opacity, threshold label, dan palette polygon secara deterministic.
- Panel atlas map publik baru dengan tab:
  - `Peta`
  - `Informasi`
  - `Cari`
- Regression suites baru:
  - `tests/integration/region-boundary-layer-api.integration.ts`
  - `tests/integration/map-boundary-layer-state.integration.ts`
  - `tests/integration/map-boundary-panel-config.integration.ts`
  - `tests/integration/public-boundary-layer.integration.ts`
- Evidence rollout lokal:
  - `docs/uat/public-map-boundary-layer-smoke-2026-03-16.md`

### Improved
- Map publik sekarang menampilkan dimming di luar kabupaten aktif agar fokus visual tetap terkunci ke OKU Selatan.
- Layer `kecamatan` kini bisa di-toggle, diwarnai per polygon, dan opacity-nya bisa diatur langsung dari panel atlas.
- Layer `desa/kelurahan` kini dimuat hanya saat dibutuhkan:
  - toggle aktif
  - kecamatan dipilih
  - zoom cukup
- Tab `Informasi` sekarang menampilkan legend warna polygon yang mengikuti layer yang benar-benar sedang visible.

### Fixed
- Public map tidak lagi membutuhkan full payload `desa/kelurahan` pada initial load untuk menampilkan kontrol polygon.
- Drawer/filter map publik tidak lagi berhenti di outline kabupaten; state panel dan rendering polygon kini terhubung sampai ke map layer.

### Notes
- Emphasis visual luar wilayah memakai mask/dimming vector di atas basemap, bukan blur raster.
- Runtime tetap hanya mengenal asset turunan OKU Selatan; shapefile nasional tetap source offline.

## Phase 2.16f — OKU Selatan Spatial Guard

### Added
- Pipeline offline `npm run region:build:okus` untuk membangun bundle GeoJSON khusus OKU Selatan dari shapefile nasional tanpa membawa source nasional ke runtime app.
- Asset boundary runtime baru di `server/data/regions/okus`:
  - `kabupaten.precise.geojson`
  - `kecamatan.precise.geojson`
  - `desa.precise.geojson`
  - `kabupaten.light.geojson`
  - `kecamatan.light.geojson`
- Endpoint boundary aktif publik:
  - `GET /api/region-boundaries/active/kabupaten`
  - `GET /api/region-boundaries/active/kecamatan`
- Regression suites baru:
  - `tests/integration/region-boundary-build.integration.ts`
  - `tests/integration/objek-pajak-spatial-guard.integration.ts`
  - `tests/integration/public-map-region-scope.integration.ts`
  - `tests/integration/region-boundary-client.integration.ts`
- Evidence rollout lokal:
  - `docs/uat/oku-selatan-spatial-guard-smoke.md`

### Improved
- Map publik sekarang otomatis focus ke boundary kabupaten aktif OKU Selatan dan menampilkan outline ringan agar operator/pengguna punya orientasi wilayah yang jelas.
- Picker lokasi backoffice sekarang memuat boundary kabupaten aktif, membatasi klik ke area sah, dan menampilkan feedback inline saat titik ditolak.
- Kontrak API sekarang mendokumentasikan ownership asset boundary dan rule bahwa shapefile nasional hanya dipakai sebagai source offline.

### Fixed
- Create/update `Objek Pajak` tidak lagi menerima koordinat yang berada di luar kabupaten aktif OKU Selatan.
- Create/update `Objek Pajak` kini menolak mismatch antara titik koordinat dengan `kecamatan` atau `kelurahan` yang dipilih.
- Endpoint marker publik dan WFS tidak lagi membocorkan record legacy yang koordinatnya berada di luar kabupaten aktif.

### Notes
- Batch ini sengaja tidak memperkenalkan engine GIS nasional generik; runtime hanya mengenal bundle region aktif `okus`.

## Phase 2.16e — Data Tools Export Refresh

### Added
- Mode export operasional `Objek Pajak` per jenis pajak dari halaman `Data Tools`, terpisah dari template import universal.
- Kolom `lampiran` pada export `Wajib Pajak` dan `Objek Pajak`, dengan nilai `ADA` jika entity memiliki attachment.
- Regression suite baru `tests/integration/wp-csv-contract.integration.ts` untuk mengunci contract CSV WP compact.

### Improved
- Export `Wajib Pajak` sekarang memakai struktur subjek tunggal yang mengikuti `peran_wp`, sehingga file operasional tidak lagi memecah pemilik vs pengelola ke dua blok kolom terpisah.
- Export default `Objek Pajak` tetap importable sebagai template universal, sementara export operasional hanya membawa kolom detail yang relevan per jenis pajak.
- Halaman `Data Tools` sekarang menjelaskan perbedaan `template import` vs `export operasional` agar operator tidak salah pilih file.

### Fixed
- Import `Wajib Pajak` sekarang backward-compatible terhadap header compact baru dan header legacy lama.
- Export `Objek Pajak` tidak lagi memaksa operator membaca semua kolom `detail_*` lintas jenis pajak dalam satu file operasional.

## Phase 2.16d — Objek Pajak Table Follow-up

### Improved
- Pencarian pada daftar desktop `Objek Pajak` sekarang juga menjangkau nama `Wajib Pajak`, bukan hanya nama objek, `NOPD`, dan alamat.
- Kolom `LOKASI` kini merangkum alamat, kecamatan, dan kelurahan dalam satu lane yang lebih padat dengan susunan tiga baris tetap:
  - alamat
  - kecamatan
  - kelurahan
- Header nominal desktop ditegaskan menjadi `PAJAK/BLN` agar informasi cukup dibaca dari header tabel.

### Fixed
- Kolom `WILAYAH` yang memecah scan line tabel dihapus dan dilebur ke kolom lokasi.
- Wrapper kecil `pajak/bln` di setiap baris dihilangkan agar cell nominal lebih bersih dan tidak terasa bertumpuk.
- Search server-side `Objek Pajak` kini ikut menjangkau kandidat identitas WP yang tampil di operator flow, termasuk nama badan usaha pada record WP badan usaha.

## Phase 2.16b — Desktop OP Table Compaction

### Improved
- Tabel desktop `Objek Pajak` dipadatkan agar muat dalam viewport desktop tanpa scroll horizontal sebagai pola utama.
- Identitas objek sekarang digabung dalam satu lane `OBJEK`:
  - nama objek
  - NOPD
  - wajib pajak
- Kolom `WILAYAH` ditambahkan kembali dalam format yang lebih ringkas lewat kombinasi kecamatan dan kelurahan.
- Informasi `jenis pajak` dan `pajak/bln` sekarang dibaca lebih cepat lewat cell kompak yang menonjolkan nominal.
- State record sekarang diringkas dalam satu kolom:
  - status
  - verifikasi
  - kelengkapan detail

### Fixed
- Kolom desktop yang sebelumnya terlalu terpecah (`NOPD`, `NAMA OBJEK`, `JENIS PAJAK`, `WAJIB PAJAK`, `ALAMAT`, `PAJAK/BLN`, `STATUS`, `VERIFIKASI`, `DETAIL`, `AKSI`) kini dipangkas menjadi layout yang lebih ringkas.
- Baris aksi desktop tidak lagi memaksa lebar tabel membesar; aksi sekunder dipindah ke menu overflow.
- Aksi desktop sekarang punya tombol khusus `lihat lokasi` untuk membuka titik objek langsung ke peta saat koordinat tersedia.

## Phase 2.16c — Desktop WP Table Compaction

### Improved
- Tabel desktop `Wajib Pajak` diratakan tanpa wrapper kartu kecil di dalam cell agar scan line lebih bersih.
- Kolom `Identitas WP` sekarang memuat isi operasional yang langsung dibutuhkan:
  - nama
  - NPWPD
  - NIK
  - kontak aktif dengan ikon telepon
- Kolom `Alamat` sekarang fokus ke lokasi aktif:
  - alamat
  - kecamatan
  - kelurahan
- Header `STATE` diganti menjadi `STATUS` tanpa mengubah cluster badge record yang sudah dipakai.

### Fixed
- Wrapper visual di dalam cell desktop WP dihilangkan agar tabel tidak terasa bertumpuk dan lebih dekat ke pola register operasional.
- Struktur kolom desktop WP sekarang lebih jujur terhadap isi data yang dilihat operator.

## Phase 2.16a — Public Map City-First UX

### Added
- Drawer desktop tipis `Filter Peta` untuk map publik, menggantikan panel filter desktop besar yang sebelumnya menutup area map.
- Komponen button list basemap reusable untuk desktop dan mobile:
  - `OSM`
  - `Carto`
  - `ESRI Sat`
- Regression suite `tests/integration/map-city-first-config.integration.ts` untuk mengunci center/reset Muaradua, zoom city-first, dan batas zoom `ESRI Satellite`.
- Evidence smoke lokal frontend:
  - `docs/uat/public-map-city-first-local-smoke-2026-03-13.md`

### Improved
- Home/reset map publik kini benar-benar city-first di pusat Muaradua dengan default zoom `15`.
- Chrome desktop map dibuat lebih ringkas; judul tetap tampil, tetapi kontrol filter dipindah ke drawer kanan agar viewport lebih lega.
- Pemilihan basemap kini langsung bisa dipilih lewat button list di drawer/filter UI, tanpa dropdown tambahan.

### Fixed
- `ESRI Satellite` sekarang dibatasi ke `maxZoom = 17` agar operator tidak terdorong ke zoom ekstrem yang sering menampilkan placeholder tile.
- Z-index `Sheet` dinaikkan agar drawer desktop selalu tampil di atas layer map dan tidak terlihat seperti gagal render.

### Notes
- Batch ini melengkapi baseline WFS proxy tanpa mengubah keputusan source data aktif `backend-proxy`.
- Smoke staging nyata untuk jalur proxy tetap pending di handoff UAT.

## Phase 2.16 — Public Map WFS Proxy Baseline

### Added
- Endpoint proxy baru `/api/objek-pajak/map-wfs` yang mengembalikan GeoJSON `FeatureCollection` untuk viewport map publik.
- Typed WFS adapter di frontend untuk:
  - mapping `FeatureCollection -> MapViewportMarker`
  - guard geometry point
  - meta viewport yang tetap jujur

### Improved
- Source data map publik sekarang bisa diganti per instance lewat seam `mapDataMode`, dengan baseline aktif `backend-proxy`.
- Filter `search`, `kecamatan`, dan `rekening` tetap berjalan server-side saat map publik memakai proxy WFS.
- Map publik sekarang mulai dalam mode `browse-first`: load awal hanya menampilkan wilayah/basemap, lalu marker objek pajak baru dimuat setelah ada intent pengguna seperti pencarian, filter, atau focus link.
- Badge viewport di desktop dan mobile sekarang memakai label yang mengikuti semantik meta aktual:
  - `dalam viewport`
  - `marker loaded`

### Fixed
- Load awal map publik tidak lagi salah fokus ke koordinat `0,0` saat query string kosong; parser focus kini hanya mengaktifkan deep-link jika parameter memang dikirim eksplisit.
- Focus marker via query param tetap berfungsi setelah marker publik dipetakan ke shape internal stabil.
- Drawer map mobile tetap sinkron dengan status viewport yang sama seperti layout desktop, termasuk idle hint sebelum query marker diaktifkan.

### Breaking
- Default `VITE_MAP_PROXY_ENDPOINT` sekarang mengarah ke `/api/objek-pajak/map-wfs`.
- Mode `direct-wfs` masih belum diaktifkan penuh; memilih mode itu tetap akan fail fast sampai adapter source langsung selesai.

## Phase 2.15 — Mobile Backoffice Refactor

### Added
- Mobile bottom navigation khusus backoffice untuk:
  - Dashboard
  - Wajib Pajak
  - Objek Pajak
  - Peta
- Card layout mobile untuk list:
  - Wajib Pajak
  - Objek Pajak
- Drawer mobile untuk halaman peta yang memuat:
  - search
  - filter kecamatan
  - filter rekening
  - basemap switch
  - legend ringkas
  - status viewport
- UAT checklist khusus mobile/tablet:
  - `docs/uat/mobile-backoffice-smoke-checklist.md`

### Improved
- Shell backoffice di mobile sekarang memakai compact top bar dan bottom spacing yang aman terhadap fixed navigation.
- Halaman WP/OP kini tetap usable pada phone portrait tanpa tabel horizontal sebagai pola utama.
- Dashboard mobile dirapikan dengan spacing yang lebih rapat dan kartu progress jenis pajak khusus mobile.
- Master Data rekening kini tampil sebagai stack cards di mobile, sementara tabel desktop tetap dipertahankan.
- Halaman peta mobile tidak lagi memaksa panel filter desktop; kontrol utama dipindah ke drawer + FAB filter.

### Fixed
- UX mobile sebelumnya yang terlalu desktop-first pada halaman WP, OP, peta, dashboard, dan master data.

### Breaking
- Tidak ada breaking API. Perubahan berada di layer responsive UI backoffice.

## Phase 2.14 — WP/OP Attachments MVP

### Added
- Attachment backend generik untuk `wajib_pajak` dan `objek_pajak`:
  - upload
  - list
  - download
  - delete
- Metadata attachment baru:
  - `entity_type`
  - `entity_id`
  - `document_type`
  - `file_name`
  - `mime_type`
  - `file_size`
  - `storage_path`
  - `uploaded_at`
  - `uploaded_by`
  - `notes`
- Panel lampiran di dialog edit Wajib Pajak:
  - KTP/NIK
  - NPWP
  - Surat Kuasa
  - Dokumen Lain
- Panel lampiran di dialog edit Objek Pajak:
  - Foto Usaha
  - Foto Lokasi
  - Izin Usaha
  - Dokumen Lain
- Preview attachment untuk gambar dan PDF, termasuk zoom in/out/reset pada gambar.
- Health endpoint sekarang juga memverifikasi storage attachment dengan status `attachmentsStorage: ready`.

### Improved
- Flow upload memakai volume/filesystem lokal sebagai baseline staging/production awal.
- Error upload file dinormalisasi ke pesan user-friendly:
  - `Format file tidak didukung`
  - `Ukuran file melebihi batas 5 MB`
  - `File gagal diunggah. Silakan coba lagi.`
- Runbook staging kini mencakup mount volume persisten untuk `/app/uploads`.

### Fixed
- Preview gambar attachment sekarang auto-fit ke box tanpa crop, lalu bisa di-zoom manual.

### Breaking
- Tidak ada breaking API pada flow lama, tetapi environment staging/production sekarang membutuhkan storage persisten untuk attachment jika fitur upload diaktifkan.

## Phase 2.13 — OP Detail FE Hard Sync

### Improved
- Form detail OP mulai hard-sync ke contract final untuk jenis yang sudah ada di UI:
  - Makan Minum
  - Perhotelan
  - Hiburan
  - Parkir
  - Reklame
- Panel detail baru ditambahkan untuk:
  - PBJT Tenaga Listrik
  - Pajak Air Tanah
  - Pajak Sarang Burung Walet
- Detail hotel sekarang memakai `fasilitas[]` dan UI multi-select.
- Detail reklame sekarang memakai tiga ukuran terpisah:
  - `ukuranPanjang`
  - `ukuranLebar`
  - `ukuranTinggi`
- Contract CSV OP mulai disinkronkan dengan shape detail final baru.
- Taksonomi PBJT di form OP mulai dirapikan ke kategori resmi untuk:
  - Makanan Minuman
  - Perhotelan
  - Parkir
  - Hiburan
  - Tenaga Listrik
- Detail parkir sekarang membedakan `jenisUsaha` dan `jenisLokasi`.
- Detail makanan-minuman sekarang mendukung klasifikasi khusus untuk Restoran.
- Halaman backoffice OP dipecah menjadi modul terpisah untuk helper/schema, detail fields, map picker, dan dialog form agar perubahan berikutnya tidak lagi bertumpu pada satu file raksasa.
- Halaman Master Data FE disederhanakan menjadi rekening-only; CRUD kecamatan dan kelurahan disembunyikan dari UI backoffice, tetapi tetap dipakai sebagai data referensi dropdown di form.
- Setelah create/update OP berhasil, list kembali ke halaman pertama agar data yang baru diubah langsung terlihat operator.
- Kolom PAJAK/BLN di list OP sekarang hanya menampilkan Rp, tanpa simbol mata uang ganda.
- Flow quality check WP sekarang menampilkan dialog duplikasi di tengah layar dengan CTA `Perbaiki` dan `Lihat Data Duplikasi`, bukan warning teks polos di dalam form.
- Payload warning duplicate WP sekarang membawa metadata `duplicates[]` berisi nama data bentrok dan nilai yang sama agar FE bisa mengarahkan operator ke record existing.
- Quality check WP mode edit sekarang mendukung `excludeWpId`, sehingga record yang sedang diedit tidak dianggap duplikat terhadap dirinya sendiri.

## Phase 2.12 — OP NOPD + Validation UX Hardening

### Added
- Error payload OP sekarang mendukung `fieldErrors` agar form bisa menandai field yang salah tanpa menampilkan JSON teknis mentah.
- `SIMILAR_NAME_ADDRESS` dipertahankan sebagai signal internal di `GET /api/quality/report`.

### Improved
- Validasi backend OP kini menerjemahkan error Zod/DB ke pesan yang lebih manusiawi untuk field numerik utama dan `NOPD`.
- Pesan error `NOPD` sekarang disederhanakan menjadi `Format NOPD salah, mohon diperiksa kembali`.
- Toast/import OP sekarang merangkum hasil gagal dengan contoh error baris pertama, bukan hanya payload mentah.
- Dokumen API kini lock ke aturan `NOPD` final `AA.BB.CC.XXXX`.

### Fixed
- Warning `DUPLICATE_NOPD` tidak lagi muncul di warning form OP.
- Warning `SIMILAR_NAME_ADDRESS` tidak lagi mengganggu submit form OP.
- Helper text di bawah field `NOPD` dihapus dari form OP.
- Contoh `NOPD` lama `OP.321.XXX.YYYY` dibersihkan dari kontrak API aktif.

### Breaking
- Create, update, dan import OP tidak lagi menerima format `NOPD` lama; semua jalur wajib `AA.BB.CC.XXXX`.

## Phase 2.10 — Production Stabilization + Post-Launch Review (Completed Dry-Run Baseline)

### Added
- Post-launch snapshot automation:
  - `script/ops-post-launch-snapshot.ts`
- npm command:
  - `ops:post-launch:snapshot`
- Integration suite baru:
  - `tests/integration/ops-post-launch.integration.ts`
- Evidence doc:
  - `docs/operations/post-launch-summary-2026-03-07.md`

### Improved
- Wave 5 docs diperkuat agar operasional pasca-launch punya command baseline dan evidence path:
  - `docs/operations/post-launch-monitoring.md`
  - `docs/operations/incident-review-template.md`
  - `docs/operations/post-launch-summary.md`

### Fixed
- Gap monitoring pasca-launch yang sebelumnya hanya template tanpa snapshot automation.

### Breaking
- Tidak ada breaking API; perubahan fokus pada operasi pasca go-live.

## Phase 2.11 — Staging/Production Execution Window Pack (Docs Lock)

### Added
- Bootstrap plan untuk membangun staging dari nol:
  - `docs/release/staging-bootstrap-plan.md`
- Runbook khusus skenario 1 VPS (production + staging):
  - `docs/release/staging-single-vps-runbook.md`
- Runbook eksekusi staging berurutan:
  - `docs/release/staging-execution-window-runbook.md`
- Template approval owner:
  - `docs/release/owner-approval-log-template.md`
- Template decision log:
  - `docs/release/go-no-go-decision-log-template.md`

### Improved
- `docs/release/release-readiness-gate.md` kini menautkan artefak wajib untuk sign-off final.
- Runbook staging diperbarui agar kompatibel format EasyPanel (service-based deploy + panel backup/restore).
- Jalur deploy EasyPanel sekarang direkomendasikan via `Dockerfile` multi-stage, bukan `Nixpacks`.

### Fixed
- Gap handoff eksekusi staging/prod yang sebelumnya belum punya urutan command + approval artifact baku.

### Breaking
- Tidak ada breaking API; perubahan fokus pada governance release execution.

## Phase 2.9 — Release Readiness Gate + Go-Live Rehearsal (Completed Dry-Run Baseline)

### Added
- Smoke automation script:
  - `script/ops-smoke-check.ts`
- npm command:
  - `ops:smoke`
- Integration suite baru:
  - `tests/integration/ops-smoke-check.integration.ts`
- Evidence docs:
  - `docs/release/go-live-rehearsal-report-2026-03-07.md`
  - `docs/release/release-readiness-board-2026-03-07.md`

### Improved
- Dokumen Wave 4 diperkuat dengan command baseline dan evidence board:
  - `docs/release/go-live-rehearsal-checklist.md`
  - `docs/release/release-readiness-gate.md`
  - `docs/release/slo-baseline.md`

### Fixed
- Gap validasi smoke critical path yang sebelumnya belum punya automation command khusus.

### Breaking
- Tidak ada breaking API; perubahan fokus pada governance release.

## Phase 2.8 — Reporting/Export Operasional + Scheduling (Completed)

### Added
- Script scheduled export operasional:
  - `script/ops-report-export.ts`
- npm commands:
  - `ops:report:daily`
  - `ops:report:weekly`
- Integration suite baru:
  - `tests/integration/ops-report-export.integration.ts`
- Evidence report:
  - `docs/operations/reporting-export-evidence-2026-03-07.md`
- Baseline env reporting ops:
  - `REPORT_EXPORT_*` pada `.env.example`

### Improved
- `docs/operations/*` sekarang selaras dengan command runnable (daily/weekly export) dan output directory baseline `reports/<frequency>/YYYY/MM/DD`.
- Katalog laporan operasional kini lock ke artifact naming actual dari script.

### Fixed
- Gap antara policy scheduled export dan implementasi executable untuk generate artifact CSV.

### Breaking
- Tidak ada breaking API; perubahan fokus pada operasional reporting/export.

## Phase 2.7 — UAT Framework + Smoke + Rollback Drill (Completed)

### Added
- Evidence report rehearsal:
  - `docs/uat/release-rehearsal-report-2026-03-07.md`
- Gate lock section pada release readiness:
  - `docs/release/release-readiness-gate.md`
- Penguatan checklist operasional:
  - `docs/uat/uat-checklist.md`
  - `docs/uat/smoke-test-checklist.md`
  - `docs/runbooks/rollback-checklist.md`
  - `docs/uat/release-rehearsal-report-template.md`

### Improved
- Acceptance Wave 2 sekarang punya evidence eksplisit:
  - dry-run rehearsal,
  - smoke pass,
  - rollback simulation pass.

### Fixed
- Gap antara template checklist dan bukti eksekusi rehearsal.

### Breaking
- Tidak ada breaking API; perubahan fokus pada release governance dan operasional.

## Phase 2.6 — Data Lifecycle Hardening (Completed)

### Added
- Baseline runbook data lifecycle:
  - `docs/runbooks/backup-retention-policy.md`
  - `docs/runbooks/restore-drill-runbook.md`
  - `docs/runbooks/data-purge-retention-policy.md`
  - `docs/runbooks/restore-drill-evidence-template.md`
  - `docs/runbooks/restore-drill-evidence-2026-03-07.md`
- Template dokumen eksekusi production readiness:
  - `docs/uat/*` (UAT, smoke, release rehearsal)
  - `docs/release/*` (gate, rehearsal checklist, SLO, escalation)
  - `docs/operations/*` (reporting/export ops, post-launch monitoring/review)
- Script automation Wave 1:
  - `script/ops-backup.ts`
  - `script/ops-backup-prune.ts`
  - `script/ops-restore-drill.ts`
- Integration suite baru:
  - `tests/integration/ops-lifecycle.integration.ts`
- npm command baseline:
  - `ops:backup:*`, `ops:backup:prune*`, `ops:restore:drill`

### Improved
- `docs/local-development.md` sekarang menautkan seluruh runbook production baseline untuk backup/restore/purge.

### Fixed
- Gap dokumentasi operasional untuk backup retention, restore drill, dan purge policy sebelum go-live production.

### Breaking
- Tidak ada breaking API; perubahan fokus di baseline dokumentasi operasional.

## Phase 2.5 — Dashboard Analytics Lanjutan (MVP)

### Added
- Dashboard summary mendukung filter waktu + grouping periodik:
  - query `from`, `to`, `groupBy=day|week` pada `GET /api/dashboard/summary`.
- Payload dashboard kini menyertakan data trend periodik (`trend[]`) + metadata filter window (`filters`).
- Endpoint export ringkasan:
  - `GET /api/dashboard/summary/export` (CSV)
- Integration suite baru:
  - `dashboard-analytics.integration.ts`

### Improved
- Halaman dashboard backoffice kini bisa:
  - filter periode tanggal,
  - switch grouping harian/mingguan,
  - tampilkan chart trend OP dibuat vs diverifikasi,
  - export CSV sesuai filter aktif.

### Fixed
- Keterbatasan dashboard sebelumnya yang hanya menampilkan snapshot agregat tanpa analisis periodik.

### Breaking
- Tidak ada breaking API; endpoint summary bersifat backward-compatible (query baru opsional).

## Phase 2.4 — Security Baseline Login (MVP)

### Added
- Baseline proteksi login:
  - rate limit `POST /api/auth/login`
  - lockout ringan untuk gagal login berulang
- Endpoint baru:
  - `POST /api/auth/change-password`
- Integration suite baru:
  - `auth-security-baseline.integration.ts`

### Improved
- Response auth lock/rate-limit kini menyertakan `Retry-After` + code terstruktur (`AUTH_RATE_LIMITED`, `AUTH_LOCKED`).
- Password policy minimum diterapkan untuk perubahan password user internal.

### Fixed
- Risiko brute-force login pada endpoint auth berkurang lewat kombinasi rate-limit + lockout.

### Breaking
- Tidak ada breaking API; penambahan behavior keamanan di endpoint login.

## Phase 2.3 — Cache Strategy Hot Path (MVP)

### Added
- Conditional fetch `ETag + If-None-Match` untuk endpoint hot-path:
  - `GET /api/master/kecamatan`
  - `GET /api/master/kelurahan`
  - `GET /api/master/rekening-pajak`
  - `GET /api/wajib-pajak`
  - `GET /api/objek-pajak`
  - `GET /api/objek-pajak/map`
  - `GET /api/dashboard/summary`
- Integration suite baru:
  - `cache-etag.integration.ts`

### Improved
- Response cache header distandarkan ke `private, max-age=0, must-revalidate`.
- Backoffice/client dapat melakukan conditional revalidation tanpa download payload berulang.

### Fixed
- Beban transfer payload list/master berulang pada polling/filter yang data-nya belum berubah.

### Breaking
- Tidak ada breaking API; perubahan bersifat additive di level HTTP caching header.

## Phase 2.2 — Observability Query Performance (MVP)

### Added
- Middleware correlation id request (`x-request-id`) untuk semua endpoint API.
- Slow query logging pada PostgreSQL pool dengan threshold env `SLOW_QUERY_MS`.
- Integration suite baru:
  - `observability.integration.ts`

### Improved
- Error response kini menyertakan `requestId` untuk mempercepat trace troubleshooting.
- Log API dan DB lebih mudah dikorelasi lintas request.

### Fixed
- Gap tracing request antar layer app/db pada debugging performa.

### Breaking
- Tidak ada breaking API contract; perubahan observability bersifat additive.

## Phase 2.1 — Dashboard Aggregation Endpoint (MVP)

### Added
- Endpoint agregasi dashboard:
  - `GET /api/dashboard/summary?includeUnverified=`
- Integration suite baru:
  - `dashboard-summary.integration.ts`

### Improved
- Halaman dashboard backoffice tidak lagi fetch-all-pages WP/OP.
- Statistik dan progress per jenis pajak sekarang diambil langsung dari agregasi server.
- Response dashboard dirancang ringkas untuk UI cards + progress table.

### Fixed
- Menghilangkan ketergantungan statistik dashboard pada sampling page list.

### Breaking
- Tidak ada breaking API publik; endpoint baru bersifat additive.

## Phase 2.0 — Cursor Pagination Rollout (WP/OP List)

### Added
- Cursor pagination support di list endpoint:
  - `GET /api/wajib-pajak?cursor=&limit=`
  - `GET /api/objek-pajak?cursor=&limit=`
- Metadata pagination baru:
  - `mode`, `cursor`, `nextCursor` (tetap kompatibel dengan meta offset existing).
- Integrasi UI WP/OP backoffice ke navigasi cursor next/prev (stack cursor lokal).
- Integration test diperluas untuk validasi alur cursor (`performance-query-hardening.integration.ts`).

### Improved
- Order list offset tetap dipertahankan untuk kompatibilitas existing flow.
- Cursor mode memakai path query berbasis `id` desc agar paging stabil dan ringan.
- Kontrak API tetap backward compatible:
  - offset (`page+limit`) masih berjalan,
  - cursor mode bisa dipakai bertahap.

### Fixed
- Inkonistensi test setelah perubahan order list diselesaikan tanpa mematahkan kontrak final WP/OP.

### Breaking
- Tidak ada breaking tambahan; perubahan bersifat additive terhadap contract paginated Phase 1.9.

## Phase 1.9 — Performance & Query Hardening

### Added
- Endpoint map viewport baru:
  - `GET /api/objek-pajak/map?bbox=minLng,minLat,maxLng,maxLat&zoom=&q=&kecamatanId=&rekPajakId=&limit=`
- One-off SQL hardening index + trgm:
  - `script/phase-1.9-performance-query-hardening.sql`
- Integration suite baru:
  - `performance-query-hardening.integration.ts`

### Improved
- `GET /api/wajib-pajak` kini server-side paginated + server-first search/filter.
- `GET /api/objek-pajak` kini server-side paginated + server-first search/filter.
- Query guardrails ditambahkan:
  - `page` min 1
  - `limit` bounded
  - `q` trim + max length
  - `bbox` validasi format/range
- FE backoffice WP/OP:
  - debounced search 300ms
  - keep-previous-data saat pindah page/filter
  - pagination controls + page size selector
- FE map:
  - load marker by viewport (`moveend/zoomend`)
  - request lama otomatis dibatalkan saat viewport berubah
  - marker payload ringan dari endpoint map

### Fixed
- List OP tidak lagi hydrate `detailPajak` penuh pada endpoint list (detail tetap on-demand via `GET /api/objek-pajak/:id`).
- Halaman dashboard/map/backoffice tersinkron dengan contract paginated baru.

### Breaking
- `GET /api/wajib-pajak` dan `GET /api/objek-pajak` tidak lagi return array langsung.
  - Contract baru: `{ items: [...], meta: {...} }`.

## Phase 1.8 — Auth + RBAC

### Added
- Endpoint autentikasi sesi:
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
- Role aplikasi pada user (`admin|editor|viewer`) di schema `users`.
- Seed akun default internal:
  - `admin/admin123`
  - `editor/editor123`
  - `viewer/viewer123`
- Integration suite baru: `auth-rbac.integration.ts`.
- One-off migration SQL: `script/phase-1.8-auth-rbac.sql`.

### Improved
- RBAC backend pada endpoint internal WP/OP/master/audit/quality/verifikasi.
- Akses publik OP diperketat:
  - default list `verified` tetap publik,
  - mode internal (`includeUnverified` / status non-verified) wajib login.
- Backoffice FE sekarang memakai login page + guard sesi + logout.
- UI backoffice role-aware:
  - viewer read-only,
  - menu/halaman master data hanya admin.

### Fixed
- Seluruh integration test existing disesuaikan agar login-aware (session cookie test helper).
- Cleanup integration test tidak lagi gagal karena endpoint delete kini diproteksi role.

### Breaking
- Endpoint internal yang sebelumnya terbuka kini memerlukan autentikasi/otorisasi role.

## Phase 1.7 — Governance & Quality

### Added
- CRUD Master Data untuk rekening pajak, kecamatan, dan kelurahan.
- Tabel `audit_log` + endpoint baca audit dengan filter + cursor pagination.
- Workflow verifikasi OP (`draft|verified|rejected`) + endpoint `PATCH /api/objek-pajak/:id/verification`.
- Endpoint quality guardrail:
  - `POST /api/quality/check`
  - `GET /api/quality/report`
- Halaman backoffice baru `Master Data` (tab Rekening/Kecamatan/Kelurahan).
- Panel riwayat perubahan (audit) di halaman WP dan OP.
- Integration suite baru: `governance-quality.integration.ts`.

### Improved
- List OP default ke data `verified`, dengan mode internal `includeUnverified=true`.
- Dashboard backoffice membaca data internal mode (`includeUnverified=true`).
- Form WP/OP menampilkan warning quality sebelum submit (non-blocking).
- Mutasi WP/OP/Master/Verification kini otomatis menulis audit log.

### Fixed
- Contract-final integration test disesuaikan untuk filter verifikasi default.
- Seed OP dilengkapi status verifikasi agar data contoh tetap tampil di mode publik.

### Breaking
- `GET /api/objek-pajak` default response kini hanya OP `verified`.
  - Untuk kebutuhan internal/backoffice gunakan `?includeUnverified=true`.

