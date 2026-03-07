# Phase 2.1 — Dashboard Aggregation Endpoint (MVP)

## Tujuan
Menyediakan ringkasan dashboard dari backend agar frontend tidak lagi melakukan fetch semua halaman WP/OP untuk menghitung statistik.

## Scope

### Backend
- Endpoint baru:
  - `GET /api/dashboard/summary`
- Dukungan query:
  - `includeUnverified=true|false`
- Payload:
  - `totals` (total WP/OP, updated/pending, overall%)
  - `byJenis` (total, updated, pending, percentage per jenis pajak)

### Frontend
- Halaman dashboard backoffice diganti konsumsi endpoint agregasi.
- UI tetap menampilkan:
  - summary cards
  - progress table per jenis pajak

### Testing
- Tambahan suite:
  - `dashboard-summary.integration.ts`
- Validasi:
  - endpoint butuh auth
  - shape response valid
  - behavior `includeUnverified` vs verified-only

## Endpoint Contract
`GET /api/dashboard/summary?includeUnverified=true`

Contoh response:
```json
{
  "generatedAt": "2026-03-07T04:00:00.000Z",
  "includeUnverified": true,
  "totals": {
    "totalWp": 120,
    "totalOp": 340,
    "totalUpdated": 250,
    "totalPending": 90,
    "overallPercentage": 74
  },
  "byJenis": []
}
```

## Verifikasi
```bash
npm run check
npm run test:integration
```

## Risiko & Mitigasi
- Risiko: agregasi salah karena gap join jenis/detail.
  - Mitigasi: integration test dengan create+verify flow.
- Risiko: query agregasi berat saat data sangat besar.
  - Mitigasi: lanjut phase 2.2 observability + tuning query plan.
