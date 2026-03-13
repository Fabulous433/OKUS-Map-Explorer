# Map WFS Refactor Plan

## Goal

Merefactor halaman map publik agar source data marker bisa berpindah dari endpoint internal ke GeoServer WFS berbasis `bbox`, tanpa merusak UX, bahasa visual, dan kontrak interaksi map yang sudah berjalan.

## Decision Lock

1. Strategi default adalah `hybrid adapter`.
2. `map-page.tsx` tetap menjadi composition root, bukan tempat semua parsing WFS.
3. Refactor boleh lintas file, tetapi harus kecil dan terkontrol.
4. `bbox` wajib menjadi filter server-side.
5. `kecamatan` dan `rekPajak` diusahakan ikut server-side filter atau adapter.
6. `search` boleh fallback ke client-side jika properti WFS tidak cukup stabil, tetapi keputusan itu wajib dinyatakan eksplisit.
7. Marker harus dirender dari shape internal stabil seperti `MapViewportMarker`, bukan langsung dari raw `feature.properties`.
8. `buildMarkerIcon(jenisPajak)` tetap dipakai.
9. `MobileMapDrawer` tidak diubah sebagai default, kecuali memang ada kebutuhan nyata yang harus dijelaskan.
10. `totalInView` dan `isCapped` tidak boleh dipalsukan; bila makna meta berubah, label UI harus ikut disesuaikan.
11. Bahasa visual map mobile dan desktop harus dipertahankan.

## Relevant Files

- [client/src/pages/map-page.tsx](D:/Code/OKUS-Map-Explorer/client/src/pages/map-page.tsx) - Composition root map, state filter, viewport query, render marker, layout mobile/desktop.
- [client/src/components/map/mobile-map-drawer.tsx](D:/Code/OKUS-Map-Explorer/client/src/components/map/mobile-map-drawer.tsx) - Drawer filter mobile yang harus tetap sinkron dengan state map.
- [client/src/lib/queryClient.ts](D:/Code/OKUS-Map-Explorer/client/src/lib/queryClient.ts) - Pola utility fetch internal yang menjadi baseline perubahan lapisan data.
- [shared/schema.ts](D:/Code/OKUS-Map-Explorer/shared/schema.ts) - Source of truth tipe internal yang sekarang dipakai app.
- [server/storage.ts](D:/Code/OKUS-Map-Explorer/server/storage.ts) - Referensi semantik `totalInView` dan `isCapped` pada source data lama.
- [docs/prompt-refactor-map-wfs.md](D:/Code/OKUS-Map-Explorer/docs/prompt-refactor-map-wfs.md) - Dokumen prompt dan keputusan arsitektur yang harus diikuti.
- [docs/changelog.md](D:/Code/OKUS-Map-Explorer/docs/changelog.md) - Catatan perubahan dokumentasi dan persiapan refactor.

## Scope of Work

- Audit fondasi map saat ini:
  - state filter
  - viewport tracker
  - focus query param
  - popup marker
  - meta viewport
- Tambahkan adapter/helper kecil untuk:
  - build URL WFS
  - parse `FeatureCollection`
  - map `Feature -> MapViewportMarker`
  - hitung meta UI yang masih relevan
- Integrasikan adapter ke `map-page.tsx` tanpa menurunkan kualitas layout mobile dan desktop.
- Jaga agar perilaku drawer filter, empty state, error state, loading state, dan focus marker tetap konsisten.
- Dokumentasikan keputusan `direct-wfs` vs `backend-proxy` saat implementasi nyata dilakukan.

## Acceptance Criteria

1. Pan dan zoom memicu pembaruan `bbox` dan refetch tanpa loop render.
2. Marker tampil pada koordinat benar setelah konversi GeoJSON `[lng, lat] -> [lat, lng]`.
3. Filter `kecamatan` dan `rekening` tetap sinkron di desktop dan mobile drawer.
4. `search` tetap berfungsi sesuai strategi yang dipilih dan didokumentasikan.
5. Focus marker via query param tetap bekerja, atau keterbatasannya dijelaskan secara eksplisit.
6. `buildMarkerIcon(jenisPajak)` tetap menjadi source marker icon.
7. Empty state, loading state, error state, dan viewport badge tidak misleading.
8. Layout mobile/desktop, drawer, popup, dan kontrol basemap tidak regress.
9. Output implementasi memuat catatan keputusan arsitektur singkat:
   - `strategy`
   - mode `search`
   - perlakuan meta viewport

## Notes

- Dokumen ini adalah paket persiapan implementasi, bukan bukti bahwa integrasi WFS sudah dikerjakan.
- Sub-task detail untuk implementasi diturunkan di `tasks/tasks-map-wfs-refactor.md`.
- Catatan koordinasi branch (2026-03-13): commit backoffice untuk compaction tabel operator dan refactor export/import `Data Tools` sudah ikut berada di branch ini agar alur kerja tetap satu cabang aktif. Prioritas eksekusi tidak berubah: map publik harus ditutup dulu lewat smoke staging sebelum batch export/import dilanjutkan sebagai stream kerja aktif.

## Execution Notes (2026-03-12)

### Current Audit Lock

- `map-page.tsx` saat ini memegang state dan flow query berikut:
  - `bbox`
  - `zoom`
  - `searchQuery`
  - `kecamatanId`
  - `rekPajakId`
  - `focusParams`
- Dependency UI yang tidak boleh regress saat refactor:
  - desktop controls
  - mobile drawer
  - viewport badges
  - loading state
  - error state
  - empty state
  - popup marker
- Kontrak marker internal yang harus dipertahankan untuk hasil adapter:
  - `id`
  - `focusKey`
  - `namaOp`
  - `nopd`
  - `jenisPajak`
  - `alamatOp`
  - `latitude`
  - `longitude`

### Strategy Lock for Current Sprint

- `strategy`: `backend-proxy`
- Alasan:
  - repo saat ini belum memberi bukti bahwa endpoint GeoServer bisa diakses langsung dari browser dengan CORS, auth, dan env yang aman
  - jalur proxy lebih mudah menjaga kontrak `bbox`, filter, dan meta viewport tetap jujur
  - typed WFS adapter tetap dibuat di frontend agar parsing GeoJSON dan shape marker bisa dites tanpa menunggu proxy final

### Search and Viewport Meta

- `search` untuk integrasi WFS saat ini dikunci sebagai `server-side via proxy translation`.
- Fallback `client-side` tetap diperbolehkan nanti bila payload upstream GeoServer ternyata tidak stabil, tetapi itu bukan jalur sprint saat ini.
- `kecamatan` dan `rekPajak` tetap diasumsikan sebagai kandidat server-side filter jika field/property source atau translation proxy sudah jelas.
- Meta viewport diperlakukan dengan aturan ini:
  - gunakan `numberMatched` / `totalFeatures` jika source WFS atau proxy menyediakannya
  - bila tidak ada angka total yang kredibel, UI harus memakai label fallback jujur seperti `marker loaded`, bukan memalsukan `totalInView`

### Temporary Mapping Contract

- Karena sample payload layer nyata belum disimpan di repo, adapter sprint ini memakai alias mapping eksplisit dan terdokumentasi, bukan asumsi satu nama field tunggal.
- Alias awal yang wajib dicakup:
  - identity: `feature.id`, `id`, `objectid`, `gid`, `op_id`
  - `namaOp`: `namaOp`, `nama_op`, `nama_objek_pajak`, `nama_objek`
  - `nopd`: `nopd`, `NOPD`
  - `jenisPajak`: `jenisPajak`, `jenis_pajak`, `jenis_rekening`, `nm_rek`
  - `alamatOp`: `alamatOp`, `alamat_op`, `alamat`
- Saat payload layer nyata sudah tersedia, alias ini harus dipersempit ke mapping final yang benar-benar dipakai di instance target.

### Batch Status (2026-03-12)

- Selesai pada batch ini:
  - `map-page.tsx` sekarang mengonsumsi `MapViewportMarker` dari typed WFS adapter saat mode aktif adalah `backend-proxy`
  - backend menyediakan endpoint `/api/objek-pajak/map-wfs` yang menerjemahkan filter `bbox`, `q`, `kecamatanId`, dan `rekPajakId` ke query map server-side yang sudah ada
  - map publik kini default ke mode `browse-first`: load awal hanya menampilkan wilayah/basemap, lalu marker viewport baru dimuat setelah ada intent pengguna (`search`, filter, atau focus link)
  - parser `focus` URL kini membedakan parameter yang hilang vs nilai `0`, sehingga load awal tidak lagi salah fokus ke koordinat `0,0`
  - badge viewport desktop dan mobile sekarang memakai label meta yang jujur (`dalam viewport` atau `marker loaded`)
  - focus marker via query param tetap berjalan memakai `id/focusKey`
- Verifikasi batch yang sudah dibaca hasilnya:
  - `npx tsx tests/integration/map-data-source.integration.ts`
  - `npx tsx tests/integration/map-focus-params.integration.ts`
  - `npx tsx tests/integration/map-wfs-adapter.integration.ts`
  - `npx tsx tests/integration/map-viewport-query.integration.ts`
  - `DATABASE_URL=... SESSION_SECRET=... PORT=5000 npx tsx tests/integration/performance-query-hardening.integration.ts`
  - `npm run check`
  - `npm run build`
  - local browser smoke evidence di `docs/uat/public-map-wfs-local-smoke-2026-03-12.md`
  - static frontend smoke evidence di `docs/uat/public-map-browse-first-static-smoke-2026-03-13.md`
- Yang masih pending sebelum handoff final:
  - browser smoke map publik pada target staging nyata
  - capture evidence staging sesuai `docs/uat/public-map-wfs-staging-handoff.md`

## City-First UX Follow-up (2026-03-13)

- Batch UX lanjutan ini dilacak terpisah di `tasks/tasks-public-map-city-first-ux.md`.
- Hasil implementasi aktual pada worktree aktif:
  - home/reset view tetap berpusat di Muaradua
  - default zoom map publik dinaikkan dari `13` ke `15` agar home map benar-benar city-first
  - panel filter desktop besar diganti oleh drawer tipis dari sisi kanan dengan trigger `Filter Peta`
  - pilihan basemap tidak lagi memakai dropdown; desktop dan mobile sekarang memakai button list langsung pilih
  - `ESRI Satellite` dibatasi ke `maxZoom = 17` agar user tidak terdorong ke zoom placeholder yang misleading
  - komponen `Sheet` diberi z-index lebih tinggi agar drawer desktop tidak tenggelam di bawah layer map
- Verifikasi batch yang sudah dibaca hasilnya:
  - `npx tsx tests/integration/map-city-first-config.integration.ts`
  - `npx tsx tests/integration/map-focus-params.integration.ts`
  - `npx tsx tests/integration/map-viewport-query.integration.ts`
  - `npm run check`
  - `npm run build`
  - local static smoke evidence di `docs/uat/public-map-city-first-local-smoke-2026-03-13.md`
- Yang masih pending setelah follow-up ini:
  - browser smoke pada target staging nyata untuk jalur `backend-proxy`
  - evidence browser staging yang mengikuti alur drawer desktop, browse-first idle state, dan batas zoom `ESRI Satellite`

## Coordination Note (2026-03-13)

- Batch backoffice yang sudah ikut berada di branch ini:
  - `Phase 2.16d — Objek Pajak Table Follow-up`
  - `Phase 2.16e — Data Tools Export Refresh`
- Alasan:
  - menjaga rule satu branch aktif agar tidak ada cabang task baru yang menggantung di atas branch map
  - menghindari merge order yang membingungkan antara task map dan task export/import
- Status:
  - implementasi dan test batch backoffice sudah masuk branch
  - validasi manual dan keputusan rollout batch export/import sengaja ditunda
  - follow-up kerja sesudah map selesai dilacak di `docs/plans/2026-03-13-post-map-data-tools-rollout-plan.md`
