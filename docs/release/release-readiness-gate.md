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

## Catatan
- Keputusan GO harus menyertakan versi release dan rencana rollback.
