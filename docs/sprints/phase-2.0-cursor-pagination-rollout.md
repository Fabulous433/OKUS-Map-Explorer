# Phase 2.0 — Cursor Pagination Rollout (WP/OP List)

## Tujuan
Mengadopsi cursor pagination untuk listing WP/OP agar paging lebih stabil pada data besar, sambil tetap menjaga kompatibilitas mode offset yang sudah dipakai.

## Scope

### Backend
- Tambah dukungan query `cursor` pada:
  - `GET /api/wajib-pajak`
  - `GET /api/objek-pajak`
- Meta pagination ditambah:
  - `mode`, `cursor`, `nextCursor`
- Mode offset (`page + limit`) tetap aktif.

### Frontend
- Halaman backoffice WP/OP menggunakan flow cursor next/prev.
- Cursor history disimpan lokal pada state untuk navigasi balik.
- Filter/search reset akan reset cursor stack ke awal.

### Testing
- Suite integration existing tetap jalan.
- Suite performance-hardening ditambah validasi:
  - cursor first page,
  - next cursor,
  - urutan id menurun antar page.

## API Ringkas

### Offset mode
- Query: `page`, `limit`
- Meta utama: `page`, `total`, `totalPages`

### Cursor mode
- Query: `cursor`, `limit`
- Meta utama: `mode="cursor"`, `cursor`, `nextCursor`

Contoh:
```http
GET /api/objek-pajak?limit=25&cursor=12345&includeUnverified=true
```

## Verifikasi
```bash
npm run check
npm run test:integration
```

## Risiko & Mitigasi
- Risiko: inkonsistensi urutan data jika sort berbeda antar mode.
  - Mitigasi: cursor mode dikunci ke order `id DESC`.
- Risiko: UX balik page pada cursor.
  - Mitigasi: simpan stack cursor di FE untuk tombol Previous.
