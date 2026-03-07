# Release Readiness Gate

## Tujuan
Menentukan keputusan go/no-go release berdasarkan evidence teknis dan operasional.

## Gate Checklist (Wajib)
- [ ] `npm run check` pass.
- [ ] `npm run test:integration` pass.
- [ ] Smoke test checklist pass.
- [ ] Rollback checklist tervalidasi di staging.
- [ ] Observability baseline aktif (`x-request-id`, slow query logs, health checks).
- [ ] Backup terbaru tersedia dan tervalidasi.

## Gate Baseline Lock (2026-03-07)
- Gate wajib di atas bersifat non-negotiable untuk keputusan GO.
- Evidence minimum yang diterima:
  - Report rehearsal terbaru.
  - Hasil smoke test terbaru.
  - Hasil rollback simulation/restore drill terbaru.
- Jika salah satu evidence belum ada, status gate otomatis `NO-GO`.
- Untuk environment EasyPanel, evidence backup/restore boleh menggunakan bukti snapshot + restore dari panel database service.

## Gate Checklist (Disarankan)
- [ ] UAT critical path pass.
- [ ] Rehearsal report latest status: ready.
- [ ] Open defect severity tinggi = 0.

## Keputusan
- GO jika semua gate wajib pass.
- NO-GO jika satu atau lebih gate wajib fail.

## Approval Matrix
- Engineering Lead:
- Product Owner:
- Release Manager:
- Tanggal keputusan:

## Evidence Board
- Gunakan file board per rehearsal date, contoh:
  - `docs/release/release-readiness-board-2026-03-07.md`
- Gunakan runbook eksekusi staging:
  - `docs/release/staging-execution-window-runbook.md`
- Jika belum ada environment staging:
  - `docs/release/staging-bootstrap-plan.md`
- Jika memakai 1 VPS:
  - `docs/release/staging-single-vps-runbook.md`
- Gunakan approval log + decision log:
  - `docs/release/owner-approval-log-template.md`
  - `docs/release/go-no-go-decision-log-template.md`

## Catatan
- Keputusan GO harus menyertakan versi release dan rencana rollback.
