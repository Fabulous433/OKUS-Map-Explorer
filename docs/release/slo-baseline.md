# SLO Baseline (Pre-Production)

## Tujuan
Menetapkan baseline SLO minimum untuk monitoring readiness produksi.

## SLO Target (Locked)
- Availability target: 99.5%.
- p95 latency endpoint list/dashboard: < 500ms pada baseline dataset internal.

## SLI Kandidat
- Availability:
  - successful request rate terhadap total request.
- Latency:
  - p95 response time endpoint utama:
    - `GET /api/wajib-pajak`
    - `GET /api/objek-pajak`
    - `GET /api/dashboard/summary`

## Error Budget (Baseline)
- Availability 99.5% per 30 hari:
  - downtime budget ~3 jam 39 menit.

## Data Source
- App logs + request tracing (`x-request-id`).
- Query performance logs (slow query).
- Monitoring dashboard internal.

## Review Cadence
- Weekly review selama 1 bulan pertama production.
- Setelah stabil: review bulanan.

## Baseline Measurement Procedure
1. Jalankan smoke/API critical path:
   - `npm run ops:smoke`
2. Jalankan regression integration:
   - `npm run test:integration`
3. Ambil sampel log `slow-query` dan response timing untuk endpoint SLI kandidat.
4. Catat hasil ke report rehearsal/go-live board.

## Acceptance Rule
- Jika ada indikasi p95 > 500ms konsisten pada endpoint list/dashboard di staging baseline dataset, status release harus `NO-GO` sampai RCA + perbaikan selesai.
