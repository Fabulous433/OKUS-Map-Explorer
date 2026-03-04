# API Specification

Base URL: `http://localhost:5000/api`

## Wajib Pajak (WP)

### GET /api/wajib-pajak
Mengambil semua data Wajib Pajak.

**Response**: `200 OK`
```json
[
  {
    "id": 1,
    "npwpd": "WP-001",
    "nama": "H. Ahmad Syarif",
    "namaUsaha": "RM Pindang Meranjat",
    "alamat": "Jl. Lintas Sumatera No. 45",
    "kelurahan": "Muaradua",
    "kecamatan": "Muaradua",
    "telepon": "0735-321456",
    "email": null,
    "jenisPajak": "PBJT Makanan dan Minuman",
    "latitude": "-4.5334000",
    "longitude": "103.9393000",
    "status": "active",
    "createdAt": "2026-03-04T09:00:00.000Z"
  }
]
```

### POST /api/wajib-pajak
Membuat Wajib Pajak baru.

**Request Body**:
```json
{
  "npwpd": "WP-010",
  "nama": "Nama WP",
  "namaUsaha": "Nama Usaha",
  "alamat": "Alamat lengkap",
  "kelurahan": "Kelurahan",
  "kecamatan": "Kecamatan",
  "telepon": "08123456789",
  "email": "email@example.com",
  "jenisPajak": "PBJT Makanan dan Minuman",
  "latitude": "-4.5334",
  "longitude": "103.9393",
  "status": "active"
}
```

**Response**: `201 Created` — objek WP yang baru dibuat

**Error**: `400 Bad Request` — validasi Zod gagal
```json
{ "message": "Validation error details" }
```

### PATCH /api/wajib-pajak/:id
Update sebagian data Wajib Pajak.

**Request Body**: Subset dari field POST (partial schema)

**Response**: `200 OK` — objek WP yang di-update

**Error**: `404 Not Found`
```json
{ "message": "Wajib Pajak tidak ditemukan" }
```

### DELETE /api/wajib-pajak/:id
Hapus Wajib Pajak.

**Response**: `204 No Content`

### GET /api/wajib-pajak/export
Export seluruh WP ke file CSV.

**Response**: `200 OK`
- Content-Type: `text/csv`
- Content-Disposition: `attachment; filename=wajib_pajak.csv`

**Kolom CSV**: npwpd, nama, nama_usaha, alamat, kelurahan, kecamatan, telepon, email, jenis_pajak, latitude, longitude, status

### POST /api/wajib-pajak/import
Import WP dari file CSV.

**Request**: `multipart/form-data`
- Field: `file` (CSV file, max 5MB)

**Response**: `200 OK`
```json
{
  "success": 8,
  "failed": 2,
  "total": 10,
  "errors": ["Baris 4: npwpd is required", "Baris 7: Invalid jenis_pajak"]
}
```

---

## Objek Pajak (OP)

### GET /api/objek-pajak
Mengambil semua data Objek Pajak.

**Response**: `200 OK` — array of ObjekPajak objects

### GET /api/objek-pajak/:id
Mengambil satu Objek Pajak berdasarkan ID.

**Response**: `200 OK` — single ObjekPajak object

**Error**: `404 Not Found`
```json
{ "message": "Objek Pajak tidak ditemukan" }
```

### POST /api/objek-pajak
Membuat Objek Pajak baru.

**Request Body**:
```json
{
  "nopd": "OP-001",
  "wpId": 1,
  "jenisPajak": "PBJT Makanan dan Minuman",
  "namaObjek": "RM Pindang Meranjat",
  "alamat": "Jl. Lintas Sumatera No. 45",
  "kelurahan": "Muaradua",
  "kecamatan": "Muaradua",
  "omsetBulanan": "15000000",
  "tarifPersen": "10",
  "pajakBulanan": "1500000",
  "rating": "4.5",
  "reviewCount": 120,
  "detailPajak": {
    "jenisUsaha": "Rumah Makan",
    "kapasitasTempat": 50,
    "jamOperasi": "08:00-21:00"
  },
  "latitude": "-4.5334",
  "longitude": "103.9393",
  "status": "active"
}
```

**Response**: `201 Created`

### PATCH /api/objek-pajak/:id
Update sebagian data Objek Pajak.

**Request Body**: Subset dari field POST (partial schema)

**Response**: `200 OK`

### DELETE /api/objek-pajak/:id
Hapus Objek Pajak.

**Response**: `204 No Content`

### GET /api/objek-pajak/export
Export seluruh OP ke file CSV.

**Response**: `200 OK`
- Content-Type: `text/csv`
- Content-Disposition: `attachment; filename=objek_pajak.csv`

**Kolom CSV**: nopd, wp_id, jenis_pajak, nama_objek, alamat, kelurahan, kecamatan, omset_bulanan, tarif_persen, pajak_bulanan, rating, review_count, detail_pajak (JSON string), latitude, longitude, status

### POST /api/objek-pajak/import
Import OP dari file CSV.

**Request**: `multipart/form-data`
- Field: `file` (CSV file, max 5MB)

**Response**: `200 OK`
```json
{
  "success": 5,
  "failed": 1,
  "total": 6,
  "errors": ["Baris 3: nopd is required"]
}
```

---

## Catatan Teknis
- Semua endpoint menggunakan JSON kecuali CSV export (text/csv) dan import (multipart/form-data)
- Validasi input menggunakan Zod schema (`insertWajibPajakSchema`, `insertObjekPajakSchema`)
- Route `/export` dan `/import` didefinisikan SEBELUM `/:id` untuk menghindari konflik routing
- Decimal fields (latitude, longitude, omset, tarif, pajak) dikirim sebagai string dalam JSON response
