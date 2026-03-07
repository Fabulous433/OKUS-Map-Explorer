# Release Readiness Board — 2026-03-07

## Gate Wajib
- `npm run check` -> PASS
- `npm run test:integration` -> PASS
- Smoke critical path -> PASS (`tests/integration/ops-smoke-check.integration.ts`)
- Rollback checklist tervalidasi -> PASS (restore drill evidence tersedia)
- Observability baseline aktif -> PASS (`x-request-id`, slow-query log teramati)
- Backup terbaru tervalidasi -> PASS (`backup` + restore drill evidence)

## Gate Disarankan
- UAT critical path pass -> PASS (Wave 2 checklist baseline)
- Rehearsal latest status ready -> FAIL (baru local dry-run)
- Open defect severity tinggi = 0 -> pending konfirmasi release owner

## Keputusan
- Decision: **NO-GO untuk production**
- Alasan:
  1. Rehearsal staging belum dilakukan.
  2. Approval matrix lintas owner belum terisi.

## Next Required Before GO
1. Jalankan go-live rehearsal di staging.
2. Kunci evidence p95 list/dashboard pada baseline dataset staging.
3. Isi approval matrix final.

## Referensi Evidence
- `docs/uat/release-rehearsal-report-2026-03-07.md`
- `docs/release/go-live-rehearsal-report-2026-03-07.md`
- `docs/runbooks/restore-drill-evidence-2026-03-07.md`
- `docs/operations/reporting-export-evidence-2026-03-07.md`
