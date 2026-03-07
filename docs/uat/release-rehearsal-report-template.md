# Release Rehearsal Report Template

## Metadata
- Tanggal rehearsal:
- Environment:
- Kandidat release:
- Tim pelaksana:
- Ticket rehearsal:

## Scope Rehearsal
- [ ] Deploy kandidat release
- [ ] Smoke test
- [ ] Rollback simulation
- [ ] Recovery verification

## Hasil Eksekusi
- Start time:
- End time:
- Durasi total:
- Evidence commands:
  - `npm run check`
  - `npm run test:integration`
  - `npm run ops:backup:daily`
  - `tsx script/ops-restore-drill.ts --file ... --cleanup`

## Hasil Smoke
- Status: PASS / FAIL
- Temuan utama:
- Referensi smoke checklist:

## Hasil Rollback Simulation
- Status: PASS / FAIL
- Durasi rollback:
- Temuan utama:
- Referensi rollback checklist:

## Risiko yang Terdeteksi
1.
2.
3.

## Action Items
1. Item:
   Owner:
   Due date:
2. Item:
   Owner:
   Due date:

## Keputusan Rehearsal
- Ready for go-live: YES / NO
- Catatan persetujuan:
