# Public Map WFS Staging Handoff

## Scope

- Batch ini mengaktifkan baseline `backend-proxy` untuk map publik melalui endpoint `/api/objek-pajak/map-wfs`.
- Typed WFS adapter di frontend sekarang menjadi jalur parsing resmi untuk marker viewport saat mode proxy aktif.
- Dokumen ini adalah panduan handoff staging. Browser smoke belum dijalankan saat dokumen ini ditulis.
- Evidence local pre-staging yang sudah tersedia dicatat di `docs/uat/public-map-wfs-local-smoke-2026-03-12.md`.
- Evidence frontend city-first yang lebih baru dicatat di `docs/uat/public-map-city-first-local-smoke-2026-03-13.md`.

## Pre-Smoke Context

- Branch kerja: `codex/map-wfs-refactor`
- Worktree: `D:\Code\OKUS-Map-Explorer\.worktrees\map-wfs-refactor`
- Endpoint aktif default:
  - `VITE_MAP_DATA_MODE=backend-proxy`
  - `VITE_MAP_PROXY_ENDPOINT=/api/objek-pajak/map-wfs`
- UX map publik yang sekarang harus terlihat di staging:
  - home/reset view kembali ke pusat Muaradua
  - default zoom awal `15`
  - desktop memakai tombol `Filter Peta` + drawer kanan tipis, bukan panel filter besar
  - pilihan basemap memakai button list langsung pilih, bukan dropdown
  - `ESRI Satellite` tidak boleh melewati `maxZoom = 17`
- Fallback konfigurasi paling aman jika proxy WFS bermasalah:
  - `VITE_MAP_DATA_MODE=internal-api`
  - `VITE_MAP_PROXY_ENDPOINT` bisa dikosongkan atau dibiarkan default karena mode internal tidak memakainya

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
- [ ] Home/reset view langsung terbuka pada pusat Muaradua dengan zoom awal `15`.
- [ ] Pan dan zoom memicu refetch viewport tanpa loop render atau marker duplikat.
- [ ] Search `nama OP / NOPD / alamat` tetap mengubah hasil viewport.
- [ ] Filter `kecamatan` dan `rekening` tetap sinkron dengan hasil marker.
- [ ] Tombol `Filter Peta` membuka drawer desktop tipis dari sisi kanan; tidak ada wrapper filter besar yang menutup area map.
- [ ] Button list basemap di drawer desktop bisa langsung memilih:
  - `OSM`
  - `Carto`
  - `ESRI Sat`
- [ ] `ESRI Satellite` berhenti pada zoom maksimum `17`.
- [ ] Badge kanan bawah tetap jujur:
  - `dalam viewport` bila total dari proxy tersedia
  - `marker loaded` bila hanya jumlah marker hasil adapter yang kredibel
- [ ] Popup marker masih menampilkan:
  - nama OP
  - jenis pajak
  - NOPD
  - alamat
  - pajak bulanan
- [ ] Focus query param tetap bekerja:
  - `focusOpId`
  - `focusLat`
  - `focusLng`

### Mobile Browser Smoke

- [ ] Header map mobile tampil normal.
- [ ] FAB filter membuka drawer tanpa error.
- [ ] Drawer mobile tetap sinkron untuk:
  - search
  - filter kecamatan
  - filter rekening
  - button list basemap
  - badge viewport
- [ ] Empty state tampil saat viewport valid tetapi tidak ada marker.
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

- Badge viewport tidak misleading ketika `numberMatched` tidak tersedia.
- Search server-side tetap terasa konsisten dibanding endpoint lama.
- Marker tanpa geometry valid tidak membuat page crash; hasilnya harus turun ke empty state yang normal.
- Error dari proxy harus muncul sebagai error state, bukan empty state palsu.
- Focus marker tidak hilang untuk link-entry yang mengandalkan query param.

## Evidence to Capture

- Screenshot desktop:
  - home city-first default
  - drawer `Filter Peta` terbuka
  - hasil viewport normal
  - empty state
  - error state bila sempat diuji
- Screenshot mobile:
  - drawer terbuka
  - viewport badge sinkron
- Catatan hasil:
  - PASS / FAIL
  - issue yang ditemukan
  - mode final yang dipakai saat smoke (`backend-proxy` atau fallback `internal-api`)
