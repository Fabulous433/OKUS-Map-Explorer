## Relevant Files

- `docs/prompt-refactor-map-wfs.md` - Prompt revisi, analisis plus-minus, dan keputusan arsitektur yang harus dijadikan baseline.
- `docs/plans/2026-03-12-map-wfs-refactor-plan.md` - Ringkasan goal, decision lock, acceptance criteria, dan file yang terdampak.
- `client/src/pages/map-page.tsx` - Halaman map publik yang menjadi composition root refactor.
- `client/src/components/map/mobile-map-drawer.tsx` - Drawer filter mobile yang harus tetap sinkron setelah perubahan lapisan data.
- `client/src/lib/map/wfs-adapter.ts` - Helper baru untuk builder URL WFS, mapping `FeatureCollection`, dan meta viewport.
- `client/src/lib/map/wfs-types.ts` - Tipe WFS dan shape internal marker yang stabil.
- `client/src/lib/queryClient.ts` - Referensi pola fetch/query app saat ini.
- `client/src/hooks/use-debounced-value.ts` - Referensi debounce `bbox` dan search yang harus tetap dipertahankan.
- `shared/schema.ts` - Source of truth kontrak tipe internal yang dipakai app.
- `server/storage.ts` - Referensi semantik source data lama, terutama `totalInView` dan `isCapped`.
- `tests/integration/performance-query-hardening.integration.ts` - Baseline regression viewport query dan perilaku endpoint map lama.
- `tests/integration/map-wfs-adapter.integration.ts` - Test baru untuk validasi builder URL WFS, mapping koordinat, dan meta adapter.
- `docs/changelog.md` - Catatan perubahan dokumentasi dan persiapan refactor.

### Notes

- Unit test dan integration test harus mengikuti file/code path implementasi aktual saat sub-task dipecah.
- Branch default untuk eksekusi nyata sebaiknya dibuat dari `codex/staging`.
- Task file ini baru berisi parent task. Siap dipecah menjadi sub-task saat eksekusi dimulai.
- Jika workspace utama masih dirty atau branch aktif bukan baseline WFS, selesaikan dulu `tasks/tasks-map-wfs-clean-start.md` sebelum menjalankan task ini.
- Follow-up UX city-first untuk home map, drawer desktop, dan perilaku basemap sekarang dilacak terpisah di `tasks/tasks-public-map-city-first-ux.md`.
- Catatan koordinasi branch (2026-03-13): branch aktif `codex/map-wfs-refactor` sekarang juga memuat batch backoffice `Phase 2.16d` dan `Phase 2.16e` agar hanya ada satu cabang kerja aktif. Fokus eksekusi tetap map sampai task `7.0` staging validation selesai; review lanjutan export/import diparkir di `docs/plans/2026-03-13-post-map-data-tools-rollout-plan.md`.

## Instructions for Completing Tasks

**IMPORTANT:** Saat task selesai, ubah `- [ ]` menjadi `- [x]`. Jangan centang task implementasi sebelum verifikasi batch dijalankan dan hasilnya dibaca.

## Tasks

- [x] 0.0 Create feature branch
  - [x] 0.1 Checkout branch dasar `codex/staging`
  - [x] 0.2 Buat dan checkout branch fitur `codex/map-wfs-refactor`
  - [x] 0.3 Pastikan worktree bersih sebelum implementasi dimulai

- [x] 1.0 Audit current map data flow and lock WFS adapter contract
  - [x] 1.1 Inventaris state dan flow query di `client/src/pages/map-page.tsx`:
    - `bbox`
    - `zoom`
    - `searchQuery`
    - `kecamatanId`
    - `rekPajakId`
    - `focusParams`
  - [x] 1.2 Petakan dependency UI yang tidak boleh regress:
    - desktop controls
    - mobile drawer
    - viewport badges
    - loading state
    - error state
    - empty state
    - popup marker
  - [x] 1.3 Lock mapping field WFS ke shape internal marker untuk:
    - `id/focusKey`
    - `namaOp`
    - `nopd`
    - `jenisPajak`
    - `alamatOp`
    - `latitude`
    - `longitude`
  - [x] 1.4 Putuskan jalur implementasi aktual:
    - `direct-wfs` jika CORS/auth/env aman
    - `backend-proxy` jika direct fetch tidak layak
  - [x] 1.5 Dokumentasikan keputusan `strategy`, mode `search`, dan perlakuan `totalInView/isCapped` di docs implementasi

- [x] 2.0 Extract typed WFS adapter and internal marker mapping
  - [x] 2.1 Buat `client/src/lib/map/wfs-types.ts` untuk type:
    - `WfsFeatureCollection`
    - `WfsFeature`
    - `WfsProperties`
    - `MapViewportMarker`
  - [x] 2.2 Buat `client/src/lib/map/wfs-adapter.ts` untuk helper `buildWfsUrl(bbox, filters)`
  - [x] 2.3 Tambahkan mapper `Feature -> MapViewportMarker` dengan guard untuk geometry null dan urutan koordinat GeoJSON
  - [x] 2.4 Tambahkan helper untuk menghitung meta viewport yang masih relevan atau menghasilkan label fallback yang jujur
  - [x] 2.5 Tambahkan komentar singkat pada builder URL, mapper feature, dan helper meta

- [x] 3.0 Integrate WFS data flow into `map-page.tsx` without UI regression
  - [x] 3.1 Ganti assembly query map lama dengan query key berbasis adapter WFS dan `bbox` ter-debounce
  - [x] 3.2 Ganti `queryFn` map agar memakai adapter WFS sesuai `strategy` yang dipilih, sambil mempertahankan:
    - `keepPreviousData`
    - loading state
    - error handling
  - [x] 3.3 Ganti render marker agar membaca `MapViewportMarker`, bukan `MapObjekPajakItem`
  - [x] 3.4 Pastikan popup tetap menampilkan data bisnis utama dan `buildMarkerIcon(jenisPajak)` tetap dipakai
  - [x] 3.5 Hapus import, type, dan code path map lama yang sudah tidak terpakai setelah integrasi adapter
    - Catatan: branch `internal-api` tetap dipertahankan sebagai fallback sah untuk seam `mapDataMode`; yang dihapus adalah hardcode lama di composition root map.

- [x] 4.0 Preserve viewport meta, filter semantics, and focus behavior
  - [x] 4.1 Pertahankan update `bbox` hanya dari event viewport yang stabil (`moveend` dan `zoomend`)
  - [x] 4.2 Pastikan `kecamatan` dan `rekPajak` diterjemahkan ke server-side filter atau adapter sesuai decision lock
  - [x] 4.3 Terapkan `search` sesuai keputusan:
    - server-side jika properti WFS stabil
    - client-side fallback jika properti tidak stabil
  - [x] 4.4 Pertahankan focus marker via query param dengan `id/focusKey`, atau dokumentasikan degradasi yang jujur jika WFS tidak menyediakan identity stabil
    - Catatan: parser focus param sekarang membedakan parameter yang hilang vs nilai `0`, sehingga load awal map tidak lagi otomatis `flyTo(0,0)` saat query string kosong.
  - [x] 4.5 Sesuaikan badge `totalInView` dan `isCapped` agar maknanya tetap benar atau ubah label UI ke istilah yang lebih jujur
    - Catatan: map publik kini default ke mode `browse-first`; load awal hanya menampilkan wilayah/basemap, sedangkan badge marker dan empty state baru aktif setelah ada intent pengguna (`search`, filter, atau focus link).
  - [x] 4.6 Verifikasi `MobileMapDrawer` tetap sinkron dengan state map tanpa perubahan prop yang tidak perlu
    - Catatan: prop baru `viewportLabel` ditambahkan karena memang diperlukan agar badge mobile dan desktop memakai semantik meta yang sama.

- [x] 5.0 Add verification coverage for bbox refetch, marker mapping, and UX states
  - [x] 5.1 Tambahkan `tests/integration/map-wfs-adapter.integration.ts` untuk menguji:
    - builder URL WFS
    - mapping koordinat `[lng, lat] -> [lat, lng]`
    - mapping properti ke `MapViewportMarker`
    - meta viewport adapter
  - [x] 5.2 Update `tests/integration/performance-query-hardening.integration.ts` atau test terkait agar semantik `bbox` tetap tervalidasi
  - [x] 5.3 Verifikasi error state saat response WFS gagal atau payload feature tidak valid
    - Catatan: tercakup di `tests/integration/map-viewport-query.integration.ts` melalui failure proxy dan payload `FeatureCollection` yang rusak.
  - [x] 5.4 Verifikasi empty state saat viewport valid tetapi marker hasil adapter kosong
    - Catatan: tercakup di `tests/integration/map-viewport-query.integration.ts` melalui helper `shouldShowEmptyViewportState`.
  - [x] 5.5 Jalankan command verifikasi yang relevan:
    - `npm run check`
    - `npm run build`
    - `tsx tests/integration/map-wfs-adapter.integration.ts`
    - integration suite terdampak bila ada perubahan backend/proxy

- [x] 6.0 Finalize implementation docs, rollout notes, and staging handoff
  - [x] 6.1 Update `docs/prompt-refactor-map-wfs.md` bila keputusan implementasi aktual menyimpang dari default docs
  - [x] 6.2 Update `docs/plans/2026-03-12-map-wfs-refactor-plan.md` dengan hasil akhir:
    - strategy yang dipakai
    - mode search
    - perlakuan meta viewport
  - [x] 6.3 Tambahkan entri `docs/changelog.md` yang menjelaskan perubahan user-facing jika perilaku map publik berubah
  - [x] 6.4 Siapkan ringkasan handoff staging:
    - langkah smoke test map
    - fallback plan bila direct WFS gagal
    - area yang perlu diamati saat UAT
    - Output: `docs/uat/public-map-wfs-staging-handoff.md`

- [ ] 7.0 Execute manual staging validation
  - Catatan: local pre-staging smoke sudah direkam di `docs/uat/public-map-wfs-local-smoke-2026-03-12.md`, lalu dilengkapi evidence frontend baru di `docs/uat/public-map-browse-first-static-smoke-2026-03-13.md`, `docs/uat/public-map-city-first-local-smoke-2026-03-13.md`, dan smoke Playwright lokal terbaru di `docs/uat/public-map-playwright-local-smoke-2026-03-17.md`.
  - Update 2026-03-17: smoke lokal boundary drill-down sudah PASS untuk klik `kecamatan` (`Muara Dua`) dan `desa` (`Batu Belang Jaya`); task ini tetap terbuka karena target staging nyata belum dijalankan.
- Update 2026-03-18: baseline UI publik sekarang sudah bergeser ke model stage drill-down `kabupaten -> kecamatan -> desa` dengan marker OP hanya aktif pada tahap desa. Smoke browser untuk baseline baru ini masih pending dan harus menggantikan asumsi atlas panel lama saat UAT staging dijalankan.
- Update 2026-03-18 (local smoke pass): evidence final stage drill-down desktop/mobile sekarang ada di `docs/uat/public-map-stage-drilldown-local-smoke-2026-03-18.md`. Task ini tetap terbuka karena target staging nyata belum dijalankan.
- Update 2026-03-18 (desktop tuning pass): evidence yang sama sekarang juga memuat addendum desktop untuk selected-desa-clear, ESRI zoom-safe `16`, dan marker-visible flow `Muara Dua -> Batu Belang Jaya`.
  - [ ] 7.1 Jalankan browser smoke berdasarkan `docs/uat/public-map-wfs-staging-handoff.md`
  - [ ] 7.2 Simpan evidence PASS/FAIL untuk desktop, mobile, idle browse-first state, empty state, dan error state
  - [ ] 7.3 Konfirmasi apakah staging tetap memakai `backend-proxy` atau rollback sementara ke `internal-api`
