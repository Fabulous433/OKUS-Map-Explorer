# API Specification

Base URL: `http://localhost:5000/api`

## Wajib Pajak (WP)

### GET `/api/wajib-pajak`
- Ambil daftar WP + `badanUsaha` (nullable) + `displayName`.

### POST `/api/wajib-pajak`
- Create WP baru.
- `npwpd` **ditolak** pada create.
- Validasi conditional `jenisWp` / `peranWp`.

### PATCH `/api/wajib-pajak/:id`
- Update WP.
- `npwpd` boleh diisi/diubah.

### DELETE `/api/wajib-pajak/:id`
- Hapus WP.

### CSV WP
- `GET /api/wajib-pajak/export`
- `POST /api/wajib-pajak/import`

Kolom CSV WP:
`jenis_wp, peran_wp, npwpd, status_aktif, nama_wp, nik_ktp_wp, alamat_wp, kecamatan_wp, kelurahan_wp, telepon_wa_wp, email_wp, nama_pengelola, nik_pengelola, alamat_pengelola, kecamatan_pengelola, kelurahan_pengelola, telepon_wa_pengelola, nama_badan_usaha, npwp_badan_usaha, alamat_badan_usaha, kecamatan_badan_usaha, kelurahan_badan_usaha, telepon_badan_usaha, email_badan_usaha`

---

## Objek Pajak (OP)

### GET `/api/objek-pajak`
Query:
- `jenisPajak`
- `status`
- `kecamatanId`
- `statusVerifikasi` (`draft|verified|rejected`)
- `includeUnverified` (`true|false`)

Perilaku default:
- Tanpa `includeUnverified=true`, list hanya menampilkan OP `verified`.

### GET `/api/objek-pajak/:id`
- Detail OP.

### POST `/api/objek-pajak`
- Create OP.
- Verifikasi default: `statusVerifikasi=draft`.

### PATCH `/api/objek-pajak/:id`
- Update data OP inti/detail.
- Field verifikasi tidak diubah lewat endpoint ini.

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

### DELETE `/api/objek-pajak/:id`
- Hapus OP.

### CSV OP
- `GET /api/objek-pajak/export`
- `POST /api/objek-pajak/import`

---

## Master Data

### Kecamatan
- `GET /api/master/kecamatan`
- `POST /api/master/kecamatan`
- `PATCH /api/master/kecamatan/:id`
- `DELETE /api/master/kecamatan/:id`

### Kelurahan
- `GET /api/master/kelurahan`
- `GET /api/master/kelurahan?kecamatanId=...` (dependent dropdown)
- `POST /api/master/kelurahan`
- `PATCH /api/master/kelurahan/:id`
- `DELETE /api/master/kelurahan/:id`

### Rekening Pajak
- `GET /api/master/rekening-pajak`
- `GET /api/master/rekening-pajak?includeInactive=true`
- `POST /api/master/rekening-pajak`
- `PATCH /api/master/rekening-pajak/:id`
- `DELETE /api/master/rekening-pajak/:id`

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

---

## Data Quality Guardrail

### POST `/api/quality/check`
- Pre-check kandidat data.
- Return warning non-blocking.

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

---

## Notes
- NOPD tetap unique.
- NPWPD partial unique saat not null.
- Validasi conditional bisnis kompleks tetap di layer aplikasi (Zod/service).
