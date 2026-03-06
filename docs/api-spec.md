# API Specification

Base URL: `http://localhost:5000/api`

## Wajib Pajak (WP) - Model Baru

### GET /api/wajib-pajak
Mengambil semua data WP dengan nested `badanUsaha` dan `displayName`.

### POST /api/wajib-pajak
Membuat WP baru.

Catatan:
- `npwpd` **tidak boleh dikirim** saat create.
- Validasi conditional berlaku untuk `peranWp` dan `jenisWp`.

Contoh body minimal (`peranWp=pemilik`, `jenisWp=orang_pribadi`):
```json
{
  "jenisWp": "orang_pribadi",
  "peranWp": "pemilik",
  "statusAktif": "active",
  "namaWp": "Nama Pemilik",
  "nikKtpWp": "1601...",
  "alamatWp": "Alamat",
  "kecamatanWp": "Muaradua",
  "kelurahanWp": "Pasar Muaradua",
  "teleponWaWp": "0812...",
  "emailWp": "opsional@email.com"
}
```

### PATCH /api/wajib-pajak/:id
Update data WP.

Catatan:
- `npwpd` boleh diisi/diubah di endpoint ini.
- Jika `jenisWp` berubah menjadi `orang_pribadi`, data `badanUsaha` dibersihkan.

### DELETE /api/wajib-pajak/:id
Hapus WP.

### GET /api/wajib-pajak/export
Export WP ke CSV.

Kolom CSV model baru:
`jenis_wp, peran_wp, npwpd, status_aktif, nama_wp, nik_ktp_wp, alamat_wp, kecamatan_wp, kelurahan_wp, telepon_wa_wp, email_wp, nama_pengelola, nik_pengelola, alamat_pengelola, kecamatan_pengelola, kelurahan_pengelola, telepon_wa_pengelola, nama_badan_usaha, npwp_badan_usaha, alamat_badan_usaha, kecamatan_badan_usaha, kelurahan_badan_usaha, telepon_badan_usaha, email_badan_usaha`

### POST /api/wajib-pajak/import
Import WP dari CSV model baru.

Catatan:
- `npwpd` pada import create harus kosong.

---

## Objek Pajak (OP)

Endpoint OP tetap:
- `GET /api/objek-pajak`
- `GET /api/objek-pajak/:id`
- `POST /api/objek-pajak`
- `PATCH /api/objek-pajak/:id`
- `DELETE /api/objek-pajak/:id`
- `GET /api/objek-pajak/export`
- `POST /api/objek-pajak/import`

`wp_id` tetap mereferensikan `wajib_pajak.id`.

---

## Catatan Teknis
- Validasi WP menggunakan schema conditional Zod (`createWajibPajakSchema`, `updateWajibPajakPayloadSchema`, `wajibPajakResolvedSchema`).
- Validasi OP tetap menggunakan `insertObjekPajakSchema` + `validateDetailByJenis`.
- Route `export/import` tetap didefinisikan sebelum route `/:id`.
