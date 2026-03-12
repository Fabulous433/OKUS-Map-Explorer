# Prompt Refactor Map WFS

Dokumen ini merapikan prompt refactor map agar selaras dengan struktur `OKUS-Map-Explorer` yang sekarang. Tujuannya bukan mengubah implementasi map langsung, tetapi menghasilkan prompt kerja yang lebih aman, lebih spesifik, dan lebih cocok dengan codebase saat ini.

## Dokumen Turunan

- `docs/plans/2026-03-12-map-wfs-refactor-plan.md` untuk ringkasan keputusan implementasi, acceptance criteria, dan file yang terdampak.
- `tasks/tasks-map-wfs-refactor.md` untuk daftar task parent-level yang siap diturunkan menjadi sub-task saat eksekusi dimulai.

## Current Execution Note (2026-03-12)

- Sprint implementasi yang sedang berjalan mengunci jalur eksekusi aktual sebagai `backend-proxy`.
- Alasan utama: belum ada bukti lokal bahwa GeoServer target aman dan stabil untuk direct browser fetch.
- Konsekuensinya:
  - typed WFS adapter tetap dibuat di frontend
  - parsing `FeatureCollection -> MapViewportMarker` tetap ditest di client
  - keputusan `search` saat ini adalah `server-side via proxy translation`
  - meta viewport harus memakai total yang kredibel dari source/proxy, atau turun ke label UI yang jujur
  - implementasi aktif kini memakai endpoint proxy `/api/objek-pajak/map-wfs` sebagai source mode default untuk batch WFS ini
  - pending berikutnya tinggal regression test untuk error/empty state dan browser smoke

## Ringkasan

- Arah dasar prompt lama sudah benar: refactor incremental, tetap mempertahankan UX map yang sudah ada, dan memanfaatkan `bbox` viewport sebagai trigger fetch data.
- Masalah utamanya ada pada batasan yang terlalu sempit di `map-page.tsx` dan asumsi bahwa integrasi WFS harus dilakukan langsung dari browser tanpa mempertimbangkan arsitektur data yang sekarang sudah tertata.
- Keputusan default untuk penyelarasan prompt ini:
  - Strategi integrasi: `hybrid adapter`
  - Cakupan refactor: `lintas file`, tetapi tetap kecil dan terkontrol
  - `bbox` wajib server-side
  - `kecamatan` dan `rekPajak` diusahakan ikut server-side filter
  - `search` boleh fallback ke client-side jika properti WFS tidak cukup stabil
  - `totalInView` dan `isCapped` tidak boleh dipalsukan; harus diproduksi ulang secara jujur atau label UI-nya disesuaikan

## Snapshot Codebase Saat Ini

Prompt revisi ini disusun berdasarkan kondisi codebase yang sekarang aktif.

### Frontend map saat ini

- File utama publik map ada di `client/src/pages/map-page.tsx`.
- `map-page.tsx` saat ini bukan sekadar file render marker. File ini juga menangani:
  - layout mobile dan desktop
  - pengaturan basemap
  - filter `search`, `kecamatan`, `rekPajak`
  - integrasi drawer mobile
  - badge viewport
  - loading state dan error state
  - query param focus marker
  - sinkronisasi `bbox` dan `zoom` dari Leaflet ke React Query
- Map saat ini memakai:
  - `MapContainer`, `TileLayer`, `Marker`, `Popup`
  - `useMapEvents` dan `useMap`
  - marker custom dari `buildMarkerIcon(jenisPajak)`

### Kontrak data saat ini

- Marker publik saat ini tidak datang langsung dari GeoServer, tetapi dari endpoint internal:
  - `/api/objek-pajak/map`
- Endpoint ini menghasilkan shape internal:
  - `MapResponse`
  - `items: MapObjekPajakItem[]`
  - `meta.totalInView`
  - `meta.isCapped`
- Tipe `MapObjekPajakItem` saat ini memuat minimal:
  - `id`
  - `wpId`
  - `nopd`
  - `namaOp`
  - `jenisPajak`
  - `alamatOp`
  - `pajakBulanan`
  - `statusVerifikasi`
  - `latitude`
  - `longitude`

### Integrasi data saat ini

- Frontend memakai React Query langsung di `map-page.tsx`.
- Utility fetch internal berada di `client/src/lib/queryClient.ts`.
- Server saat ini sudah punya logic query map yang menghitung:
  - `totalInView`
  - `isCapped`
  - filter `bbox`
  - filter `q`
  - filter `kecamatanId`
  - filter `rekPajakId`
  - filter `statusVerifikasi`

### Implikasi arsitektur

- Mengganti source map ke WFS bukan sekadar mengganti `queryFn`.
- Perubahan itu menyentuh lapisan:
  - kontrak data
  - pemetaan properti GeoJSON
  - meta viewport
  - asumsi UI yang bergantung pada meta tersebut
- Karena itu prompt tidak boleh memaksa semua logic baru ditumpuk di `map-page.tsx`.

## Plus Prompt Lama

- Sudah menegaskan refactor, bukan rewrite total.
- Sudah sadar bahwa `bbox` adalah fondasi query viewport.
- Sudah mempertahankan `buildMarkerIcon`, jadi identitas visual marker tidak hilang.
- Sudah mempertahankan struktur UX map saat ini.
- Sudah cocok dengan state yang memang sudah ada di file map.
- Sudah menyebut filter `kecamatan` dan `rekening`, jadi tidak buta terhadap kebutuhan operasional aplikasi.

## Minus Prompt Lama

- Terlalu menargetkan `map-page.tsx` sebagai pusat semua perubahan.
- Terlalu mendorong direct fetch WFS dari browser sebagai default tunggal.
- Belum mengunci mapping antara `feature.properties` GeoServer dan shape UI internal yang sekarang dipakai.
- Belum mengakui bahwa `map-page.tsx` juga memegang layout mobile/desktop dan focus handling, bukan cuma data fetch.
- Membiarkan pilihan filter terlalu longgar:
  - `CQL_FILTER` atau client filter dipersilakan tanpa prioritas yang jelas
- Menganggap `totalInView` dan `isCapped` bisa diganti mentah dengan `features.length`, padahal makna keduanya sekarang lebih spesifik.
- Output yang diminta berupa "satu blok `map-page.tsx` final" justru mendorong file menjadi lebih gemuk dan kurang maintainable.
- Belum memaksa adanya catatan keputusan arsitektur, padahal reviewer perlu tahu jalur yang diambil:
  - direct WFS
  - adapter
  - backend proxy fallback

## Keputusan Arsitektur yang Dipakai di Dokumen Ini

### 1. Strategi utama: hybrid adapter

- Pilihan pertama: adapter frontend yang konsumsi WFS secara langsung jika CORS, auth, dan environment aman.
- Pilihan fallback: backend proxy jika akses browser ke GeoServer tidak stabil, tidak aman, atau terlalu rumit untuk di-hardcode di frontend.
- Prompt harus mengizinkan fallback ini secara eksplisit supaya implementer tidak terjebak pada satu jalur yang rapuh.

### 2. Cakupan refactor: lintas file, tetap kecil

- `map-page.tsx` tetap menjadi composition root.
- Logic baru yang sebaiknya diekstrak:
  - builder URL WFS
  - type GeoJSON/WFS
  - mapper `Feature -> MapViewportMarker`
  - helper filter/meta
- Dengan pola ini, perubahan tetap incremental tetapi tidak membuat `map-page.tsx` makin padat.

### 3. Kontrak marker internal harus dipertahankan

- UI tidak boleh bergantung langsung pada raw `feature.properties`.
- Buat shape internal stabil, misalnya `MapViewportMarker`, agar rendering marker, popup, focus, dan badge tetap konsisten.

### 4. Meta viewport harus jujur

- Jika adapter bisa menghasilkan `totalInView` dan `isCapped` yang setara, gunakan itu.
- Jika tidak bisa, prompt harus menginstruksikan penyesuaian label UI agar jujur terhadap sumber data baru.
- Dilarang memakai label lama bila maknanya sudah berubah.

### 5. Bahasa visual map wajib dipertahankan

- Implementer tidak boleh menjadikan refactor data sebagai alasan untuk mengubah chrome UI map menjadi layout generik.
- Drawer, badge, header, kontrol basemap, popup, dan marker style harus tetap terasa seperti produk ini, bukan contoh map demo biasa.

## Kontrak Mapping yang Harus Dikunci

Sebelum implementasi, properti WFS wajib dipetakan ke shape internal yang stabil. Dokumen prompt harus memaksa implementer menuliskan mapping ini secara eksplisit.

| Kebutuhan UI | Shape internal | Sumber WFS yang harus dipastikan |
| --- | --- | --- |
| Identity marker | `id` | properti feature yang stabil, atau fallback yang terdokumentasi |
| Focus dari query param | `id` atau `focusKey` | harus bisa direkonsiliasi dengan query param yang ada |
| Nama objek pajak | `namaOp` | `feature.properties` |
| NOPD | `nopd` | `feature.properties` |
| Jenis pajak | `jenisPajak` | `feature.properties` |
| Alamat | `alamatOp` | `feature.properties` |
| Latitude | `latitude` | `feature.geometry.coordinates[1]` |
| Longitude | `longitude` | `feature.geometry.coordinates[0]` |
| Meta marker | `statusVerifikasi`, `pajakBulanan`, dll. | opsional, tergantung ketersediaan properti |

## Struktur Type yang Disarankan

Prompt revisi sebaiknya meminta type terpisah dari kontrak internal saat ini.

Contoh shape yang boleh dipakai:

```ts
type WfsFeatureCollection = {
  type: "FeatureCollection";
  features: WfsFeature[];
};

type WfsFeature = {
  type: "Feature";
  id?: string | number;
  geometry: {
    type: string;
    coordinates: [number, number] | number[][] | number[][][];
  } | null;
  properties: WfsProperties;
};

type WfsProperties = Record<string, unknown>;

type MapViewportMarker = {
  id: string | number;
  namaOp: string;
  nopd: string | null;
  jenisPajak: string;
  alamatOp: string | null;
  latitude: number;
  longitude: number;
  pajakBulanan?: string | null;
  statusVerifikasi?: string | null;
};
```

Catatan:

- `MapViewportMarker` sengaja dipisah dari `MapObjekPajakItem`.
- Prompt tidak perlu memaksa nama properti persis sama, tetapi harus memaksa adanya shape internal yang stabil.

## Prompt Revisi Siap Pakai

Gunakan prompt di bawah ini untuk pekerjaan refactor map WFS berikutnya.

```md
Kamu adalah frontend engineer senior yang sudah berpengalaman dengan React, React Query, React-Leaflet, dan integrasi GeoServer WFS (GeoJSON). Fokus tugasmu adalah **merefactor alur data peta yang sudah ada**, bukan menulis ulang halaman map dari nol.

## Konteks aplikasi

- Aplikasi ini dipakai untuk pendataan objek pajak di Kabupaten OKU Selatan.
- Halaman publik map ada di `client/src/pages/map-page.tsx`.
- Saat ini `map-page.tsx` bukan cuma file render marker. File ini juga memegang:
  - layout desktop dan mobile
  - kontrol basemap
  - filter search, kecamatan, rekening pajak
  - badge viewport
  - integrasi `mobile-map-drawer.tsx`
  - focus marker via query param
  - loading dan error state
- Marker saat ini diambil dari endpoint internal `/api/objek-pajak/map` melalui React Query, dengan kontrak internal `items + meta`.

## Tujuan refactor

- Ganti sumber data marker dari backend internal menjadi GeoServer WFS (GeoJSON) berbasis `bbox`.
- Pertahankan UX, struktur layout, interaksi, dan marker style yang sekarang.
- Jangan ubah halaman map menjadi demo generik. Bahasa visual yang ada harus tetap dipertahankan.
- `map-page.tsx` harus tetap menjadi composition root, tetapi logic baru boleh diekstrak ke helper, hook, atau type file kecil yang relevan.

## Strategi arsitektur yang harus diikuti

Gunakan urutan preferensi ini:

1. Adapter frontend yang fetch WFS langsung jika CORS, auth, dan env aman.
2. Jika direct WFS tidak aman atau tidak stabil, gunakan fallback backend proxy.

Kamu wajib menuliskan keputusan yang diambil dalam catatan singkat di output akhir:

- `strategy: direct-wfs`
- atau `strategy: backend-proxy`

## Batasan penting

- Jangan menumpuk semua logic parsing WFS langsung di `map-page.tsx`.
- Jangan render marker langsung dari raw `feature.properties`.
- Jangan menghapus atau mengganti `buildMarkerIcon(jenisPajak)` kecuali adaptasi input.
- Jangan mengubah prop `MobileMapDrawer` kecuali benar-benar perlu. Jika perlu, tunjukkan perubahan kecilnya secara eksplisit.
- Jangan memalsukan `totalInView` dan `isCapped`. Jika makna meta berubah, sesuaikan label UI agar tetap jujur.

## Spesifikasi WFS

- Base URL contoh:
  - `https://server-kami/geoserver/pajak/wfs`
- Parameter dasar:
  - `service=WFS`
  - `version=1.1.0`
  - `request=GetFeature`
  - `typeName=pajak:bangunan_okus`
  - `srsName=EPSG:4326`
  - `outputFormat=application/json`
  - `bbox=minx,miny,maxx,maxy,EPSG:4326`

## Refactor yang diharapkan

### 1. Pertahankan fondasi map yang sudah ada

Identifikasi dan pertahankan bagian berikut:

- tipe `Bbox`
- state viewport dan debounce bbox
- `useMapEvents` atau tracker bounds
- state `search`, `kecamatan`, `rekPajak`, `baseMap`
- popup marker
- focus marker dari query param
- drawer mobile dan badge viewport

### 2. Tambahkan lapisan adapter WFS

Buat helper atau modul kecil untuk:

- membangun URL WFS dari `bbox` dan filter
- memetakan `FeatureCollection` menjadi shape internal marker
- menghitung meta yang masih relevan untuk UI

Jangan jadikan `map-page.tsx` tempat semua detail parsing.

### 3. Type dan kontrak data

Buat type terpisah dari `MapObjekPajakItem`, minimal:

- `WfsFeatureCollection`
- `WfsFeature`
- `WfsProperties`
- `MapViewportMarker`

`map-page.tsx` harus merender marker dari shape internal stabil seperti `MapViewportMarker`.

### 4. Aturan filter

Aturan default yang harus kamu pakai:

- `bbox` wajib menjadi filter server-side
- `kecamatan` diusahakan masuk ke server-side filter atau adapter
- `rekPajak` diusahakan masuk ke server-side filter atau adapter
- `search` boleh fallback ke client-side jika properti WFS untuk search tidak cukup stabil, tetapi keputusan itu harus dinyatakan eksplisit di output akhir

Jika kamu memakai filter server-side tambahan, jelaskan apakah bentuknya:

- `CQL_FILTER`
- query param adapter
- atau backend proxy translation

### 5. Mapping yang harus dikunci

Sebelum render marker, pastikan mapping berikut jelas:

- `id/focusKey`
- `namaOp`
- `nopd`
- `jenisPajak`
- `alamatOp`
- `latitude`
- `longitude`

Jika properti GeoServer tidak identik dengan nama field app saat ini, buat mapper eksplisit dan beri komentar singkat.

### 6. Render marker

Render `<Marker>` dari hasil adapter:

- posisi Leaflet = `[lat, lng]`
- sumber GeoJSON = `[lng, lat]`
- popup tetap memakai data bisnis yang relevan
- `buildMarkerIcon(jenisPajak)` tetap dipakai

### 7. Meta viewport

Karena sebelumnya UI memakai `totalInView` dan `isCapped` dari backend internal, kamu harus memilih salah satu:

- adapter menghasilkan meta serupa dengan makna yang tetap konsisten
- atau label UI diubah agar jujur terhadap data baru, misalnya “marker loaded”

Jika memilih opsi kedua, jangan biarkan label lama tetap tampil.

### 8. Komentar dan kebersihan kode

Beri komentar singkat hanya pada area penting:

- builder URL WFS
- mapper GeoJSON ke marker internal
- sinkronisasi `bbox` ke query
- keputusan meta viewport bila berubah

Hapus import yang tidak dipakai dan rapikan bagian yang sekarang redundant.

## Output yang diharapkan

Berikan output akhir dalam urutan ini:

1. Catatan singkat keputusan arsitektur:
   - `strategy`
   - apakah `search` server-side atau client-side
   - bagaimana meta viewport diperlakukan
2. Kode final yang relevan:
   - `map-page.tsx`
   - helper/hook/type tambahan jika memang diperlukan
3. Diff singkat untuk file lain hanya jika ada perubahan nyata yang diperlukan

## Test dan acceptance criteria

Pastikan hasil refactor memenuhi ini:

- pan/zoom memicu update `bbox` dan refetch tanpa loop render
- marker muncul di posisi benar setelah konversi `[lng, lat] -> [lat, lng]`
- filter `kecamatan` dan `rekening` tetap sinkron di desktop dan mobile drawer
- `search` tetap bekerja sesuai keputusan yang diambil
- focus marker dari query param tetap jalan, atau dijelaskan jujur jika tidak bisa dipertahankan
- empty state, loading state, dan error state tetap jelas
- marker icon tetap menggunakan `buildMarkerIcon`
- layout mobile/desktop tidak regress

Gunakan codebase yang ada sebagai baseline. Lakukan refactor incremental yang membuat perubahan berikutnya lebih mudah, bukan sekali ubah menjadi file yang lebih kompleks.
```

## Catatan Penggunaan Prompt

- Prompt revisi ini sengaja tidak meminta "satu file final saja".
- Prompt revisi ini sengaja meminta catatan keputusan arsitektur di output akhir.
- Prompt revisi ini lebih cocok untuk codebase yang sudah punya:
  - React Query
  - shared types
  - adapter/helper pattern
  - UI map yang sudah matang

## Checklist Review Saat Prompt Ini Dipakai

- Apakah implementer membuat adapter/helper, bukan menumpuk semuanya di `map-page.tsx`?
- Apakah mapping properti WFS dinyatakan jelas?
- Apakah label meta viewport tetap jujur?
- Apakah `buildMarkerIcon` tetap dipakai?
- Apakah mobile drawer tetap utuh?
- Apakah query param focus tetap dipertahankan atau dijelaskan?
- Apakah output menyebut jalur `direct-wfs` atau `backend-proxy`?

## Kesimpulan

Prompt lama sudah cukup baik untuk membuka arah refactor, tetapi terlalu sempit dan terlalu optimistis terhadap direct WFS. Versi revisi di dokumen ini lebih cocok dengan struktur sistem OKUS sekarang karena:

- menghormati lapisan data yang sudah ada
- menjaga `map-page.tsx` tetap menjadi composition root, bukan dumping ground
- memaksa kontrak mapping yang eksplisit
- menjaga kejujuran meta viewport
- mempertahankan kualitas UI yang sudah dibangun

Dengan prompt revisi ini, implementer punya ruang yang cukup untuk bekerja benar, tetapi tetap dibatasi secara arsitektural agar hasilnya sejalan dengan codebase.
