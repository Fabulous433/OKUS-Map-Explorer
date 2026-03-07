# Phase 2.3 — Cache Strategy Hot Path (MVP)

## Tujuan
Mengurangi transfer payload berulang pada endpoint list/master melalui conditional fetch HTTP.

## Scope

### Backend
- Implementasi helper `ETag` dan evaluasi `If-None-Match`.
- Endpoint target:
  - `GET /api/master/kecamatan`
  - `GET /api/master/kelurahan`
  - `GET /api/master/rekening-pajak`
  - `GET /api/wajib-pajak`
  - `GET /api/objek-pajak`
  - `GET /api/objek-pajak/map`
  - `GET /api/dashboard/summary`
- Header cache:
  - `Cache-Control: private, max-age=0, must-revalidate`
  - `ETag: W/"..."`

### Testing
- Tambahan suite:
  - `cache-etag.integration.ts`
- Validasi:
  - request pertama -> `200` + `ETag`.
  - request ulang dengan `If-None-Match` yang sama -> `304`.
  - setelah mutasi data -> `ETag` berubah, response kembali `200`.

## Verifikasi
```bash
npm run check
npm run test:integration:cache-etag
```

## Risiko & Mitigasi
- Risiko: hash payload menambah CPU pada payload besar.
  - Mitigasi: rollout fokus endpoint hot-path saja (bukan semua endpoint).
- Risiko: ETag lama tetap dipakai saat data sudah berubah.
  - Mitigasi: ETag dihitung dari payload response terbaru di setiap request.
