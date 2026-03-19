# Public Map WFS Staging Handoff

## Scope

- Batch ini membawa map publik ke UX stage drill-down:
  - `kabupaten -> kecamatan -> desa/kelurahan -> marker OP`
- Typed WFS adapter tetap menjadi jalur parsing resmi saat mode runtime aktif adalah `backend-proxy`.
- Mode `internal-api` tetap dipertahankan sebagai fallback sah jika proxy WFS staging bermasalah.
- Dokumen ini adalah panduan handoff staging untuk baseline UX terbaru. Smoke browser lokal sudah PASS, tetapi smoke staging nyata belum dijalankan saat dokumen ini diperbarui.
- Evidence lokal yang relevan:
  - `docs/uat/public-map-wfs-local-smoke-2026-03-12.md`
  - `docs/uat/public-map-playwright-local-smoke-2026-03-17.md`
  - `docs/uat/public-map-stage-drilldown-local-smoke-2026-03-18.md`

## Pre-Smoke Context

- Branch kerja: `codex/map-wfs-refactor`
- Workspace validasi: `D:\Code\OKUS-Map-Explorer`
- Default env lokal saat terakhir diverifikasi:
  - `VITE_MAP_DATA_MODE=backend-proxy`
  - `VITE_MAP_PROXY_ENDPOINT=/api/objek-pajak/map-wfs`
- Baseline UI yang sekarang harus terlihat di staging:
  - load awal hanya memperlihatkan konteks OKU Selatan, bukan world overview
  - viewport terkunci ke wilayah kabupaten aktif
  - klik `kecamatan` masuk ke stage kecamatan dan menampilkan daftar/batas desa scoped
  - klik `desa/kelurahan` masuk ke stage desa dan baru di tahap ini marker OP aktif
  - desktop memakai stage header + quick jump + OP rail, bukan atlas panel lama
  - mobile memakai compact stage header + bottom sheet OP, bukan drawer filter lama
  - `ESRI Satellite` harus berhenti di zoom aman `16`
  - desa yang dipilih harus transparan, sementara desa lain tetap berwarna
- Cara konfirmasi mode runtime di staging:
  - jika marker dimuat dari `/api/objek-pajak/map-wfs`, mode final = `backend-proxy`
  - jika marker dimuat dari `/api/objek-pajak/map`, mode final = `internal-api`
- Blocker administrasi saat dokumen ini diperbarui:
  - repo dan env lokal belum menyimpan URL staging riil; placeholder di runbook masih `staging-map.domainkamu.com`
  - Task `7.0` tidak boleh ditutup sampai base URL staging nyata tersedia dan smoke dijalankan pada target itu

## Smoke Steps

### API Spot Checks

- [ ] `GET /api/objek-pajak/map-wfs?bbox=104,-4.6,104.1,-4.4&limit=50` merespons `200` dengan `type = FeatureCollection`.
- [ ] `GET /api/objek-pajak/map-wfs?bbox=invalid` merespons `400`.
- [ ] Response sukses memuat:
  - `features[]`
  - `numberMatched`
  - `geometry.type = Point`
  - koordinat GeoJSON `[lng, lat]`

### Desktop Browser Smoke

- [ ] Halaman `/` membuka map publik tanpa runtime error.
- [ ] Load awal terkunci pada konteks OKU Selatan; user tidak bisa zoom-out ke peta dunia.
- [ ] Stage root tidak langsung menampilkan marker OP.
- [ ] Klik salah satu `kecamatan`:
  - mengubah header ke stage kecamatan
  - melakukan transition/focus ke kecamatan itu
  - menghilangkan kecamatan lain dari fokus layar
  - memuat daftar/batas `desa` scoped untuk kecamatan aktif
- [ ] Klik salah satu `desa/kelurahan`:
  - mengubah header ke stage desa
  - melakukan transition/focus ke desa itu
  - membuat desa terpilih transparan agar citra dasar dan marker mudah dilihat
  - baru memunculkan marker OP di desa aktif
- [ ] Quick jump wilayah bisa langsung membawa user ke `kecamatan` atau `desa` target.
- [ ] Desktop OP rail muncul pada stage desa dan tetap sinkron dengan marker di peta.
- [ ] Chip filter jenis pajak hanya muncul pada stage desa dan memfilter marker tanpa merusak state wilayah aktif.
- [ ] Tombol `Kembali` kiri atas bekerja berjenjang:
  - `desa -> kecamatan`
  - `kecamatan -> kabupaten`
- [ ] Pilihan basemap tetap bekerja:
  - `OSM`
  - `Carto`
  - `ESRI Sat`
- [ ] `ESRI Satellite` berhenti pada zoom maksimum `16` tanpa memunculkan `Map data not yet available`.
- [ ] Popup marker masih menampilkan:
  - nama OP
  - jenis pajak
  - NOPD
  - alamat
  - pajak bulanan
- [ ] Refresh pada stage desa mempertahankan URL state yang jujur:
  - stage
  - `kecamatanId`
  - `desaId`
  - `taxType`
  - basemap terakhir
- [ ] Focus query param existing tetap bekerja:
  - `focusOpId`
  - `focusLat`
  - `focusLng`

### Mobile Browser Smoke

- [ ] Header map mobile tampil ringkas:
  - hanya title stage/wilayah
  - tanpa subtitle/helper panjang desktop
- [ ] Flow drill-down `kabupaten -> kecamatan -> desa` tetap bisa dijalankan penuh lewat tap polygon atau quick jump.
- [ ] Stage desa mobile menampilkan chip filter ringkas (`Semua`, inisial jenis pajak seperti `WLT`) tanpa overflow.
- [ ] Bottom sheet OP mobile muncul saat stage desa aktif dan tetap sinkron dengan marker terpilih.
- [ ] Tombol `Kembali` mobile juga bekerja berjenjang tanpa loop render.
- [ ] Empty state tampil saat desa valid tidak punya marker untuk filter aktif.
- [ ] Error state tampil bila request map gagal.

## Fallback Plan

### Jika proxy WFS bermasalah di staging

1. Ubah `VITE_MAP_DATA_MODE` ke `internal-api`.
2. Deploy ulang FE dengan mode fallback itu.
3. Verifikasi endpoint lama `/api/objek-pajak/map` masih sehat.
4. Catat mode rollback yang dipakai di changelog/deployment note.

### Jika payload upstream berubah

1. Cek shape payload `/api/objek-pajak/map-wfs`.
2. Bandingkan field aktual dengan alias mapping di adapter WFS.
3. Jika mismatch hanya pada alias properti, perbaiki adapter lalu rerun test:
   - `tests/integration/map-wfs-adapter.integration.ts`
   - `tests/integration/map-viewport-query.integration.ts`
4. Jika identity feature tidak stabil, turunkan severity feature focus dan dokumentasikan degradasinya sebelum deploy lanjut.

## UAT Watchpoints

- Konfirmasi mode runtime final (`backend-proxy` vs `internal-api`) harus berdasarkan request nyata yang teramati di browser/network, bukan asumsi env lama.
- Marker tetap mati pada stage `kabupaten` dan `kecamatan`; kebocoran marker sebelum stage desa adalah FAIL.
- Selected desa harus transparan; jika polygon aktif kembali menutup citra/marker, itu regression.
- `ESRI Sat` tidak boleh masuk ke tile level yang memunculkan area abu-abu `Map data not yet available`.
- Quick jump, back navigation, dan refresh route state tidak boleh saling mereset stage/filter secara salah.
- Error dari proxy harus muncul sebagai error state, bukan empty state palsu.
- Focus marker tidak hilang untuk link-entry yang mengandalkan query param.

## Evidence to Capture

- Screenshot desktop:
  - root `OKU Selatan`
  - stage `kecamatan`
  - stage `desa` dengan selected polygon transparan
  - OP rail aktif
  - empty state
  - error state bila sempat diuji
- Screenshot mobile:
  - root compact header
  - stage desa dengan compact chips
  - bottom sheet OP/detail
- Catatan hasil:
  - PASS / FAIL
  - issue yang ditemukan
  - mode final yang dipakai saat smoke (`backend-proxy` atau fallback `internal-api`)
  - URL staging yang diuji
