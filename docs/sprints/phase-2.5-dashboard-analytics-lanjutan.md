# Phase 2.5 — Dashboard Analytics Lanjutan (MVP)

## Tujuan
Meningkatkan dashboard dari snapshot agregat menjadi analitik periodik yang bisa difilter dan diekspor.

## Scope

### Backend
- Extend endpoint:
  - `GET /api/dashboard/summary`
- Query baru:
  - `from=YYYY-MM-DD`
  - `to=YYYY-MM-DD`
  - `groupBy=day|week`
  - `includeUnverified=true|false`
- Payload baru:
  - `filters.summaryWindow`
  - `filters.trendWindow`
  - `trend[]` (`periodStart`, `periodEnd`, `createdOp`, `verifiedOp`)
- Endpoint export:
  - `GET /api/dashboard/summary/export` (CSV)

### Frontend
- Filter tanggal (from/to) + selector grouping.
- Trend chart (OP dibuat vs OP diverifikasi).
- Tombol export CSV mengikuti filter aktif.

### Testing
- Suite baru:
  - `dashboard-analytics.integration.ts`
- Validasi:
  - query invalid ditolak (`groupBy`, partial `from/to`)
  - response analytics memiliki `filters` + `trend`
  - endpoint export mengembalikan `text/csv`

## Verifikasi
```bash
npm run check
npm run test:integration:dashboard-summary
npm run test:integration:dashboard-analytics
```

## Risiko & Mitigasi
- Risiko: query trend membebani DB pada window waktu panjang.
  - Mitigasi: gunakan agregasi SQL + default window trend terbatas.
- Risiko: mismatch ekspektasi timezone bucket.
  - Mitigasi: standardisasi bucket pada format tanggal server-side yang konsisten.
