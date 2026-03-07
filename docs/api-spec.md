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

Kolom CSV WP:
`jenis_wp, peran_wp, npwpd, status_aktif, nama_wp, nik_ktp_wp, alamat_wp, kecamatan_wp, kelurahan_wp, telepon_wa_wp, email_wp, nama_pengelola, nik_pengelola, alamat_pengelola, kecamatan_pengelola, kelurahan_pengelola, telepon_wa_pengelola, nama_badan_usaha, npwp_badan_usaha, alamat_badan_usaha, kecamatan_badan_usaha, kelurahan_badan_usaha, telepon_badan_usaha, email_badan_usaha`

---

## Objek Pajak (OP)

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
      "nopd": "OP.321.001.2026",
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

### GET `/api/objek-pajak/:id`
- Detail OP.
- Auth:
  - Public jika OP `verified`.
  - OP non-verified: `admin|editor|viewer`.

### POST `/api/objek-pajak`
- Create OP.
- Verifikasi default: `statusVerifikasi=draft`.
- Auth: `admin|editor`.

### PATCH `/api/objek-pajak/:id`
- Update data OP inti/detail.
- Field verifikasi tidak diubah lewat endpoint ini.
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
