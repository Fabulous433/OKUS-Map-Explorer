# Go-Live Rehearsal Report — 2026-03-07

## Metadata
- Tanggal rehearsal: 2026-03-07
- Environment: local dry-run
- Executor: Codex agent
- Scope: Wave 4 release readiness rehearsal baseline

## Eksekusi
- Smoke check:
  - `npm run test:integration:ops-smoke` -> PASS
- Rollback simulation:
  - `tsx script/ops-restore-drill.ts --file backups/daily/okus-map-explorer_local_daily_20260307-141244.sql.gz --cleanup` -> PASS
- Regression gate:
  - `npm run check` -> PASS
  - `npm run test:integration` -> PASS

## Hasil
- Status smoke: PASS
- Status rollback simulation: PASS
- Status regression gate: PASS
- Status rehearsal: NOT READY (staging rehearsal belum dijalankan)

## Simulasi Incident Ringan
- Scenario: restore flow sebagai prosedur recovery saat terjadi issue pasca deploy.
- Outcome: recovery drill berhasil dan cleanup DB drill berjalan.

## Action Items
1. Jalankan rehearsal yang sama di staging dengan window release sebenarnya.
2. Isi approval matrix oleh Engineering Lead, Product Owner, dan Release Manager.
3. Lampirkan bukti metrik p95 staging untuk endpoint list/dashboard.
