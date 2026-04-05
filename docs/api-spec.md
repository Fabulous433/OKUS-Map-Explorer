# API Specification

Base URL: `http://localhost:5000/api`

## Observability

- Semua response API mengembalikan header `x-request-id`.
- Client bisa mengirim `x-request-id` sendiri untuk correlation tracing lintas service.
- Jika tidak dikirim client, server auto-generate `x-request-id`.
- Saat terjadi error, payload error menyertakan `requestId` agar troubleshooting lebih cepat.

## Conditional Fetch (ETag)

- Endpoint list/master hot-path sekarang mengembalikan header `ETag` + `Cache-Control: private, max-age=0, must-revalidate`.
- Client boleh kirim `If-None-Match` untuk conditional fetch:
  - jika data belum berubah -> `304 Not Modified`
  - jika data berubah -> `200` + payload baru + `ETag` baru
- Endpoint yang sudah aktif ETag MVP:
  - `GET /api/master/kecamatan`
  - `GET /api/master/kelurahan`
  - `GET /api/master/rekening-pajak`
  - `GET /api/wajib-pajak`
  - `GET /api/objek-pajak`
  - `GET /api/objek-pajak/map`
  - `GET /api/dashboard/summary`

## Authentication & RBAC

### Session Auth
- `POST /api/auth/login`
- `POST /api/auth/change-password`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Role aplikasi:
- `admin`
- `editor`
- `viewer`

Rule umum:
- Endpoint mutasi WP/OP: `admin|editor`.
- Endpoint mutasi master: `admin`.
- Endpoint baca internal: minimal login (`admin|editor|viewer`).
- Endpoint OP publik (`GET /api/objek-pajak`) tetap terbuka untuk data `verified` default.

### Login Security Baseline
- `POST /api/auth/login`:
  - rate limit berbasis client IP/fingerprint (`429`, `code=AUTH_RATE_LIMITED`).
  - lockout ringan berbasis kombinasi `client + username` saat gagal berulang (`429`, `code=AUTH_LOCKED`).
  - response lock/rate-limit menyertakan header `Retry-After`.
- `POST /api/auth/change-password`:
  - butuh session login (`admin|editor|viewer`).
  - validasi `oldPassword` + `newPassword`.
  - password policy minimum:
    - panjang 8-72 karakter
    - minimal 1 huruf
    - minimal 1 angka
  - violation -> `400` dengan `code=PASSWORD_POLICY_VIOLATION`.

## Wajib Pajak (WP)

### GET `/api/wajib-pajak`
- Ambil daftar WP paginated (`items + meta`) dengan payload:
  - item: WP + `badanUsaha` (nullable) + `displayName`.
  - meta: `{ page, limit, total, totalPages, hasNext, hasPrev, mode, cursor, nextCursor }`.
- Query:
  - `page` (default `1`, min `1`)
  - `limit` (default `25`, max `100`)
  - `cursor` (opsional, mode cursor pagination)
  - `q` (opsional, trim, max 100 karakter)
  - `jenisWp` (`orang_pribadi|badan_usaha`)
  - `peranWp` (`pemilik|pengelola`)
  - `statusAktif` (`active|inactive`)
- Auth: `admin|editor|viewer`.

### POST `/api/wajib-pajak`
- Create WP baru.
- `npwpd` **ditolak** pada create.
- Validasi conditional `jenisWp` / `peranWp`.
- Auth: `admin|editor`.

### PATCH `/api/wajib-pajak/:id`
- Update WP.
- `npwpd` boleh diisi/diubah.
- Auth: `admin|editor`.

### DELETE `/api/wajib-pajak/:id`
- Hapus WP.
- Auth: `admin|editor`.

### CSV WP
- `GET /api/wajib-pajak/export`
- `POST /api/wajib-pajak/import`
- Auth export: `admin|editor|viewer`
- Auth import: `admin|editor`
- Field `dryRun=true` pada `multipart/form-data` untuk endpoint import WP/OP:
  - parse + klasifikasikan semua baris menjadi `created|updated|skipped|failed`
  - tidak menyimpan data ke database
  - response tetap mengembalikan `created`, `updated`, `skipped`, `success`, `failed`, `total`, `errors`, `warnings`, `dryRun=true`, `previewRows`, dan `previewSummary`
- Import WP bersifat idempotent:
  - jika `npwpd` cocok tepat satu WP existing, row diperlakukan sebagai update parsial
  - jika `npwpd` ada tetapi belum ditemukan, row tetap create-capable dan `npwpd` dari file import akan disimpan ke WP baru
  - field kosong pada CSV tidak menghapus field existing
  - jika tidak ada perubahan efektif, row dikembalikan sebagai `skipped`
  - jika CSV tidak membawa `npwpd`, row tetap create-capable dan warning duplikasi non-blocking bisa muncul dari `nik` / `npwp badan usaha`
- Endpoint maintenance import WP:
  - `POST /api/wajib-pajak/reset-imported`
  - Auth: `admin`
  - body wajib: `{ "confirmationText": "RESET IMPORT WP" }`
  - menghapus WP yang dibuat lewat import CSV dan OP terkait bila ada
- UI `Data Tools` memakai `errors[]` dari response ini untuk menampilkan contoh error dan mengunduh `CSV error` koreksi operator.
- UI `Data Tools` juga bisa mengunduh `report CSV` penuh dari hasil preview/import untuk kebutuhan audit UAT, berisi `action`, `warning`, `messages`, `resolutionSteps`, dan kolom sumber per row.
- Import final dari halaman `Data Tools` sekarang lewat dialog konfirmasi dulu sebelum file benar-benar ditulis ke sistem.
- `previewRows` dipakai UI untuk menampilkan audit 5 baris pertama langsung di layar, termasuk `action`, status valid/gagal, warning non-blocking, dan langkah resolusi per baris.
- `previewRows.sourceRow` dipakai UI untuk menurunkan `template koreksi` berisi kolom sumber asli + pesan error, sehingga operator bisa edit file hasil unduh lalu upload ulang.
- Saat membentuk `template koreksi`, kolom identifier seperti `NPWPD`, `NIK`, `NOPD`, dan `no_rek_pajak` dipaksa ke format text-friendly untuk Excel agar nilainya tidak mudah berubah saat file dibuka di spreadsheet.
- Halaman `Data Tools` juga menyimpan ringkasan preview/import terakhir di `localStorage` browser agar operator bisa melihat histori run ringan tanpa mengulang upload file, memulihkan snapshot ringkasan itu kembali ke panel hasil per entitas, memberi pin pada run penting, memfilter histori berdasarkan entitas atau mode run, mencari histori dengan keyword ringan, menghapus satu run yang sudah tidak relevan, dan menghapus histori lokal per browser saat perlu reset.
- `previewSummary` dipakai UI untuk menampilkan ringkasan mapping, misalnya:
  - WP: `createdRows`, `updatedRows`, `skippedRows`, `failedRows`, `warningRows`, `compactRows`, `legacyRows`
  - OP: `createdRows`, `updatedRows`, `skippedRows`, `failedRows`, `warningRows`, `wpResolvedRows`, `wpUnresolvedRows`, `rekeningResolvedRows`, `rekeningUnresolvedRows`
- `previewRows.resolutionStatus` dan `previewRows.action` dipakai UI untuk quick filter tab:
  - `Semua`
  - `Created`
  - `Updated`
  - `Skipped`
  - `Failed`
  - `Ada Warning`
  - `Gagal Resolusi` untuk OP saat ada baris yang gagal resolve `NPWPD` atau `rekening`
- UI juga menurunkan badge inline dari metadata ini, misalnya:
  - action: `CREATED`, `UPDATED`, `SKIPPED`, `FAILED`
  - warning: `ADA WARNING`
  - WP: `HEADER COMPACT`, `HEADER LEGACY`
  - OP: `NPWPD OK`, `NPWPD GAGAL`, `REKENING OK`, `REKENING GAGAL`

Kolom CSV WP export (compact):
`jenis_wp, peran_wp, npwpd, status_aktif, nama_subjek, nik_subjek, alamat_subjek, kecamatan_subjek, kelurahan_subjek, telepon_wa_subjek, email_subjek, lampiran, nama_badan_usaha, npwp_badan_usaha, alamat_badan_usaha, kecamatan_badan_usaha, kelurahan_badan_usaha, telepon_badan_usaha, email_badan_usaha`

Catatan:
- `peran_wp` menentukan apakah kolom `*_subjek` mewakili pemilik atau pengelola.
- `lampiran` berisi `ADA` jika entity memiliki minimal satu attachment.
- Import WP menerima:
  - header compact baru di atas
  - header legacy lama (`nama_wp`, `nama_pengelola`, dst.) untuk backward compatibility

### Attachment WP
- `GET /api/wajib-pajak/:id/attachments`
- `POST /api/wajib-pajak/:id/attachments`
- `GET /api/wajib-pajak/:id/attachments/:attachmentId/download`
- `DELETE /api/wajib-pajak/:id/attachments/:attachmentId`
- Auth:
  - list/download: `admin|editor|viewer`
  - upload/delete: `admin|editor`

Payload upload (`multipart/form-data`):
- `file`
- `documentType`: `ktp|npwp|surat_kuasa|dokumen_lain`
- `notes` (opsional)

Response item:
```json
{
  "id": "uuid-like-string",
  "entityType": "wajib_pajak",
  "entityId": 21,
  "documentType": "ktp",
  "fileName": "ktp-budi.pdf",
  "mimeType": "application/pdf",
  "fileSize": 182044,
  "storagePath": "wajib_pajak/21/ktp/....pdf",
  "uploadedAt": "2026-03-10T03:00:00.000Z",
  "uploadedBy": "admin",
  "notes": "scan terbaru"
}
```

---

## Objek Pajak (OP)

Aturan `NOPD` final:
- Format resmi: `AA.BB.CC.XXXX`
- Create tanpa `nopd`: server auto-generate berdasarkan rekening pajak
- Create/update/import dengan `nopd` manual: wajib tetap mengikuti format resmi
- `nopd` tetap unique; duplikasi ditolak sebagai hard error

Contract detail OP final:
- `PBJT Makanan dan Minuman`: `jenisUsaha, klasifikasi, kapasitasTempat, jumlahKaryawan, rata2Pengunjung, jamBuka, jamTutup, hargaTermurah, hargaTermahal`
  - `jenisUsaha` controlled option: `Restoran | Jasa Boga/Katering`
  - `klasifikasi` hanya untuk `jenisUsaha = Restoran`
- `PBJT Jasa Perhotelan`: `jenisUsaha, jumlahKamar, klasifikasi, fasilitas[] , rata2PengunjungHarian, hargaTermurah, hargaTermahal`
  - `jenisUsaha` controlled option mengikuti master PBJT hotel
  - `klasifikasi` hanya untuk `Hotel/Hostel` dan `Motel/Losmen`
- `PBJT Jasa Kesenian dan Hiburan`: `jenisHiburan, kapasitas, jamOperasional, jumlahKaryawan`
- `PBJT Jasa Parkir`: `jenisUsaha, jenisLokasi, kapasitasKendaraan, tarifParkir, rata2Pengunjung`
- `PBJT Tenaga Listrik`: `jenisTenagaListrik, dayaListrik, kapasitas`
- `Pajak Reklame`: `jenisReklame, judulReklame, ukuranPanjang, ukuranLebar, ukuranTinggi, masaBerlaku, statusReklame, namaBiroJasa`
- `Pajak Air Tanah`: `jenisAirTanah, rata2UkuranPemakaian, kriteriaAirTanah, kelompokUsaha`
- `Pajak Sarang Burung Walet`: `jenisBurungWalet, panenPerTahun, rata2BeratPanen`
- `Pajak MBLB`: belum punya tabel detail khusus di fase ini

### GET `/api/objek-pajak`
Query:
- `page`
- `limit`
- `cursor`
- `q`
- `status`
- `kecamatanId`
- `rekPajakId`
- `statusVerifikasi` (`draft|verified|rejected`)
- `includeUnverified` (`true|false`)

Perilaku default:
- Response selalu paginated:
  - `items: ObjekPajakListItem[]` (ringkas, tanpa hydrate `detailPajak` penuh)
  - `meta: { page, limit, total, totalPages, hasNext, hasPrev, mode, cursor, nextCursor }`
- Guardrails query:
  - `page` min `1`
  - `limit` max `100` (default `25`)
  - `q` max 100 karakter
- Tanpa `includeUnverified=true`, list hanya menampilkan OP `verified`.
- Semua read publik/list hanya mengembalikan OP yang koordinatnya berada di dalam kabupaten aktif OKU Selatan.
  - Record legacy di luar wilayah aktif boleh tetap ada di DB untuk kebutuhan koreksi/backoffice, tetapi tidak ikut diserve ke map/list publik.
- Auth:
  - Public: allowed saat mode default verified.
  - `includeUnverified=true` atau status non-verified: `admin|editor|viewer`.

### GET `/api/objek-pajak/map`
Query:
- `bbox=minLng,minLat,maxLng,maxLat` (wajib, valid range geo)
- `zoom` (opsional, valid `0..24`)
- `q` (opsional, server-first search)
- `kecamatanId` (opsional)
- `rekPajakId` (opsional)
- `limit` (default `500`, max `1000`)
- `statusVerifikasi` (`draft|verified|rejected`, opsional)
- `includeUnverified` (`true|false`, opsional)

Response:
```json
{
  "items": [
    {
      "id": 1,
      "wpId": 1,
      "nopd": "14.00.00.0001",
      "namaOp": "Contoh OP",
      "jenisPajak": "Pajak MBLB",
      "alamatOp": "Jl. Contoh",
      "pajakBulanan": "150000.00",
      "statusVerifikasi": "verified",
      "latitude": -4.525,
      "longitude": 104.027
    }
  ],
  "meta": {
    "totalInView": 25,
    "isCapped": false
  }
}
```

Perilaku:
- default publik hanya `verified`.
- mode internal (`includeUnverified=true` atau status non-verified) wajib login.
- invalid `bbox` ditolak `400`.
- Response marker dibatasi lagi oleh boundary kabupaten aktif.
  - Jika `bbox` berada di luar OKU Selatan, endpoint tetap mengembalikan hasil kosong walaupun DB memiliki record legacy di luar wilayah aktif.

### GET `/api/objek-pajak/:id`
- Detail OP.
- Auth:
  - Public jika OP `verified`.
  - OP non-verified: `admin|editor|viewer`.

### POST `/api/objek-pajak`
- Create OP.
- Verifikasi default: `statusVerifikasi=draft`.
- Jika `nopd` kosong, server generate otomatis sesuai format resmi `AA.BB.CC.XXXX`.
- Jika `nopd` diisi manual, format wajib valid dan unique.
- Jika `latitude` dan `longitude` diisi, server menjalankan spatial guard berbasis boundary OKU Selatan:
  - titik wajib berada di dalam kabupaten aktif
  - titik wajib cocok dengan `kecamatanId` terpilih
  - titik wajib cocok dengan `kelurahanId` terpilih jika polygon desa/kelurahan aktif tersedia
- Pelanggaran spatial guard ditolak `400` dengan pesan operasional yang menyebut sumber mismatch, misalnya:
  - `Koordinat berada di luar kabupaten aktif OKU Selatan`
  - `Koordinat berada di kecamatan X, bukan kecamatan terpilih Y`
  - `Koordinat berada di kelurahan X, bukan kelurahan terpilih Y`
- Error validasi mengembalikan payload user-friendly:
```json
{
  "message": "Format NOPD salah, mohon diperiksa kembali",
  "fieldErrors": [
    {
      "field": "nopd",
      "message": "Format NOPD salah, mohon diperiksa kembali"
    }
  ]
}
```
- Auth: `admin|editor`.

### PATCH `/api/objek-pajak/:id`
- Update data OP inti/detail.
- Field verifikasi tidak diubah lewat endpoint ini.
- `nopd` tetap editable, tetapi wajib format resmi `AA.BB.CC.XXXX` dan tetap unique.
- Jika koordinat tersimpan/diubah, spatial guard yang sama dengan create tetap dijalankan sebelum update disimpan.
- Auth: `admin|editor`.

### PATCH `/api/objek-pajak/:id/verification`
Payload:
```json
{
  "statusVerifikasi": "verified|rejected|draft",
  "catatanVerifikasi": "opsional, wajib bila rejected",
  "verifierName": "opsional"
}
```
Aturan:
- `rejected` wajib `catatanVerifikasi`.
- `verified` set `verifiedAt` + `verifiedBy`.
- Auth: `admin|editor`.

### DELETE `/api/objek-pajak/:id`
- Hapus OP.
- Auth: `admin|editor`.

### CSV OP
- `GET /api/objek-pajak/export`
- `POST /api/objek-pajak/import`
- Auth export: `admin|editor|viewer`
- Auth import: `admin|editor`
- Query export:
  - default / `mode=template`: template universal yang tetap importable
  - `mode=operational&jenisPajak=<label-jenis>`: export operasional per jenis pajak
- Field `dryRun=true` pada `multipart/form-data` dapat dipakai untuk preview hasil import tanpa menyimpan row baru.
- Import OP sekarang idempotent:
  - identity utama: `npwpd + no_rek_pajak|nama_rek_pajak + nama_op`
  - jika tepat satu OP existing cocok, row diperlakukan sebagai update parsial
  - field kosong pada CSV tidak menghapus field existing
  - jika tidak ada perubahan efektif, row dikembalikan sebagai `skipped`
- `nopd` bukan key utama import OP:
  - jika `nopd` ada dan konsisten dengan hasil pencocokan utama, row tetap boleh update
  - jika `nopd` menunjuk OP existing lain, row gagal dengan conflict identity
- Endpoint maintenance import OP:
  - `POST /api/objek-pajak/reset-imported`
  - Auth: `admin`
  - body wajib: `{ "confirmationText": "RESET IMPORT OP" }`
  - menghapus OP yang dibuat lewat import CSV
- UI `Data Tools` mengekspor ulang `errors[]` ke file `*_preview_errors.csv` atau `*_import_errors.csv` agar operator bisa memperbaiki file sumber secara batch.
- UI `Data Tools` juga dapat menurunkan `*_preview_report.csv` atau `*_import_report.csv` untuk audit semua row selama UAT/import operasional.
- Untuk OP, `previewRows` juga membawa `resolutionSteps` agar operator bisa melihat hasil resolusi `NPWPD` dan `rekening` sebelum import final.
- Untuk baris gagal, UI juga dapat menurunkan `*_preview_corrections.csv` atau `*_import_corrections.csv` yang mempertahankan kolom sumber asli.
- `detail_fasilitas` untuk perhotelan memakai format satu kolom dengan delimiter `|`
- reklame tidak lagi memakai `detail_ukuran_reklame`, tetapi:
  - `detail_ukuran_panjang`
  - `detail_ukuran_lebar`
  - `detail_ukuran_tinggi`
- Import OP menolak `nopd` yang tidak mengikuti format resmi `AA.BB.CC.XXXX`.
- Error import dikembalikan per baris dalam bentuk pesan yang sudah dinormalisasi, misalnya:
  - `Baris 4: Format NOPD salah, mohon diperiksa kembali`
  - `Baris 8: NOPD sudah digunakan oleh objek pajak lain`
  - `Baris 11: NOPD AA.BB.CC.XXXX mengarah ke OP existing yang berbeda dengan hasil pencocokan utama`
  - `Baris 14: Kombinasi NPWPD, rekening, dan nama OP menghasilkan lebih dari satu kandidat existing`
- Import OP mendukung dua mode referensi relasi:
  - mode internal lama: `wp_id` + `rek_pajak_id`
  - mode semantic/minimal: `npwpd` + `no_rek_pajak` (atau `nama_rek_pajak` sebagai fallback)
- Mode semantic diprioritaskan untuk sample import hasil adaptasi dari SIMPATDA agar operator tidak perlu mencari ID internal lebih dulu.

Kolom template export OP:
- kolom basis:
  - `nopd, wp_id, rek_pajak_id, no_rek_pajak, nama_rek_pajak, nama_op, npwp_op, alamat_op, kecamatan_id, kecamatan_nama, kelurahan_id, kelurahan_nama, omset_bulanan, tarif_persen, pajak_bulanan, latitude, longitude, status, lampiran`
- ditambah seluruh kolom `detail_*` lintas jenis pajak

Kolom export operasional OP:
- memakai kolom basis di atas
- hanya menambahkan kolom `detail_*` yang relevan untuk `jenisPajak` yang diminta
- tidak ditujukan sebagai template import utama

Catatan:
- `lampiran` berisi `ADA` jika OP memiliki minimal satu attachment.
- Sample minimal import OP PBJT Makanan dan Minuman yang relevan untuk adaptasi SIMPATDA:
  - `npwpd, no_rek_pajak, nama_op, alamat_op, kecamatan_id, kelurahan_id, status`
  - detail pajak boleh dikosongkan jika data sumber belum punya detail final yang dibutuhkan aplikasi.

### Attachment OP
- `GET /api/objek-pajak/:id/attachments`
- `POST /api/objek-pajak/:id/attachments`
- `GET /api/objek-pajak/:id/attachments/:attachmentId/download`
- `DELETE /api/objek-pajak/:id/attachments/:attachmentId`
- Auth:
  - list/download: `admin|editor|viewer`
  - upload/delete: `admin|editor`

Payload upload (`multipart/form-data`):
- `file`
- `documentType`: `foto_usaha|foto_lokasi|izin_usaha|dokumen_lain`
- `notes` (opsional)

Rule upload attachment WP/OP:
- mime type yang diterima:
  - `application/pdf`
  - `image/jpeg`
  - `image/png`
  - `image/webp`
- ukuran file maksimum: `5 MB`
- error user-facing:
  - `Format file tidak didukung`
  - `Ukuran file melebihi batas 5 MB`
  - `File gagal diunggah. Silakan coba lagi.`

---

## Region Boundaries

### GET `/api/region-boundaries/active/kabupaten`
- Mengembalikan boundary `light` kabupaten aktif untuk orientasi peta frontend.
- Auth: public.

### GET `/api/region-boundaries/active/kecamatan`
- Mengembalikan boundary `light` kecamatan dalam kabupaten aktif untuk kebutuhan overlay/inspection bertahap.
- Auth: public.

### GET `/api/region-boundaries/active/desa`
- Mengembalikan boundary `light` desa/kelurahan secara scoped di dalam kecamatan yang dipilih.
- Query:
  - `kecamatanId` (wajib)
- Jika `kecamatanId` tidak dikirim -> `400 { "message": "kecamatanId wajib diisi untuk memuat batas desa/kelurahan" }`
- Jika `kecamatanId` tidak dikenal di master wilayah aktif -> `400 { "message": "kecamatanId tidak dikenal di master wilayah aktif" }`
- Auth: public.

Contract boundary aktif:
```json
{
  "regionKey": "okus",
  "regionName": "OKU Selatan",
  "level": "desa",
  "precision": "light",
  "bounds": {
    "minLng": 103.433,
    "minLat": -4.932,
    "maxLng": 104.307,
    "maxLat": -4.123
  },
  "boundary": {
    "type": "FeatureCollection",
    "features": []
  },
  "scope": {
    "kecamatanId": "1609040",
    "kecamatanName": "Muaradua"
  }
}
```

Catatan contract:
- `scope` bersifat opsional.
- `scope` saat ini dipakai pada response `desa` untuk mengembalikan konteks kecamatan aktif yang diminta frontend.

Catatan operasional:
- Runtime hanya memuat bundle GeoJSON turunan OKU Selatan yang sudah committed di:
  - `server/data/regions/okus/kabupaten.precise.geojson`
  - `server/data/regions/okus/kecamatan.precise.geojson`
  - `server/data/regions/okus/desa.precise.geojson`
  - `server/data/regions/okus/kabupaten.light.geojson`
  - `server/data/regions/okus/kecamatan.light.geojson`
  - `server/data/regions/okus/desa.light.geojson`
- Shapefile nasional mentah di `docs/` tetap menjadi source material offline untuk proses build saja, bukan asset runtime app.
- Public map memakai panel atlas `Peta / Informasi / Cari` untuk mengontrol overlay polygon:
  - `kabupaten` sebagai konteks dasar + dimming area luar kabupaten
  - `kecamatan` dimuat lazy saat toggle aktif
  - `desa/kelurahan` dimuat lazy dan scoped per `kecamatanId`
- Full payload `desa/kelurahan` tidak pernah diunduh pada initial public map load.

---

## Master Data

### Kecamatan
- `GET /api/master/kecamatan`
- `POST /api/master/kecamatan`
- `PATCH /api/master/kecamatan/:id`
- `DELETE /api/master/kecamatan/:id`
- Auth:
  - `GET`: `admin|editor|viewer`
  - `POST/PATCH/DELETE`: `admin`

### Kelurahan
- `GET /api/master/kelurahan`
- `GET /api/master/kelurahan?kecamatanId=...` (dependent dropdown)
- `POST /api/master/kelurahan`
- `PATCH /api/master/kelurahan/:id`
- `DELETE /api/master/kelurahan/:id`
- Auth:
  - `GET`: `admin|editor|viewer`
  - `POST/PATCH/DELETE`: `admin`

### Rekening Pajak
- `GET /api/master/rekening-pajak`
- `GET /api/master/rekening-pajak?includeInactive=true`
- `POST /api/master/rekening-pajak`
- `PATCH /api/master/rekening-pajak/:id`
- `DELETE /api/master/rekening-pajak/:id`
- Auth:
  - `GET`: `admin|editor|viewer`
  - `POST/PATCH/DELETE`: `admin`

Rules:
- Delete master ditolak bila masih direferensikan OP.
- Rekening pakai `isActive` (soft flag aktif/nonaktif).

---

## Audit Trail

### GET `/api/audit-log`
Query:
- `entityType`
- `entityId`
- `action`
- `from`
- `to`
- `limit`
- `cursor`

Response:
```json
{
  "data": [],
  "nextCursor": 123,
  "hasMore": true
}
```

Audit dicatat untuk mutasi:
- WP (`POST/PATCH/DELETE`)
- OP (`POST/PATCH/DELETE`)
- OP verification (`PATCH verification`)
- Master data (`POST/PATCH/DELETE`)
- Auth: `admin|editor|viewer`

---

## Data Quality Guardrail

### POST `/api/quality/check`
- Pre-check kandidat data.
- Return warning non-blocking.
- Untuk flow OP, warning submit tidak lagi memunculkan `DUPLICATE_NOPD` atau `SIMILAR_NAME_ADDRESS`.
- Auth: `admin|editor`

Contoh response:
```json
{
  "warnings": [
    {
      "level": "warning",
      "code": "DUPLICATE_NIK_WP",
      "message": "NIK pemilik ditemukan pada wajib pajak lain",
      "relatedIds": [1]
    }
  ]
}
```

### GET `/api/quality/report`
- Ringkasan kualitas data:
  - duplicate indicators
  - missing critical fields
  - invalid geo range
- Internal-only signal tambahan:
  - `similarNameAddress`
  - dipakai untuk audit kualitas data, bukan warning submit form OP
- Auth: `admin|editor`

---

## Dashboard Analytics

### GET `/api/dashboard/summary`
- Ringkasan agregat + trend periodik dashboard tanpa load seluruh list OP/WP di frontend.
- Auth: `admin|editor|viewer`.

Query:
- `includeUnverified` (`true|false`, default `false`)
- `from` (`YYYY-MM-DD`, opsional, wajib berpasangan dengan `to`)
- `to` (`YYYY-MM-DD`, opsional, wajib berpasangan dengan `from`)
- `groupBy` (`day|week`, default `day`)

Response:
```json
{
  "generatedAt": "2026-03-07T03:00:00.000Z",
  "includeUnverified": true,
  "filters": {
    "summaryWindow": {
      "from": "2026-02-01",
      "to": "2026-03-07"
    },
    "trendWindow": {
      "from": "2026-02-01",
      "to": "2026-03-07",
      "groupBy": "day"
    }
  },
  "totals": {
    "totalWp": 120,
    "totalOp": 340,
    "totalUpdated": 250,
    "totalPending": 90,
    "overallPercentage": 74
  },
  "byJenis": [
    {
      "jenisPajak": "PBJT Makanan dan Minuman",
      "total": 40,
      "updated": 32,
      "pending": 8,
      "percentage": 80
    }
  ],
  "trend": [
    {
      "periodStart": "2026-03-01",
      "periodEnd": "2026-03-01",
      "createdOp": 4,
      "verifiedOp": 2
    }
  ]
}
```

### GET `/api/dashboard/summary/export`
- Export ringkasan dashboard ke CSV.
- Auth: `admin|editor|viewer`.
- Query sama dengan `GET /api/dashboard/summary`.
- Response: `text/csv` (`dashboard_summary.csv`).

---

## Notes
- NOPD tetap unique.
- NPWPD partial unique saat not null.
- Validasi conditional bisnis kompleks tetap di layer aplikasi (Zod/service).
- Pagination mode:
  - Offset: pakai `page + limit`
  - Cursor: pakai `cursor + limit` (`nextCursor` dipakai untuk request berikutnya)
- **Breaking Phase 1.9**:
  - `GET /api/wajib-pajak` dan `GET /api/objek-pajak` kini wajib baca `items/meta` (bukan array langsung).
- Boundary desa/kelurahan tetap server-authoritative untuk validasi spatial guard; frontend hanya memakai asset ringan `kabupaten/kecamatan` dan `desa` yang sudah di-scope per kecamatan agar payload awal tetap terkontrol.
