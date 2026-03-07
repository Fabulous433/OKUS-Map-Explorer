# Release Rehearsal Report — 2026-03-07

## Metadata
- Tanggal rehearsal: 2026-03-07
- Environment: local (dry-run rehearsal)
- Kandidat release: current working tree (Wave 1 + Wave 2 docs/ops hardening)
- Tim pelaksana: Codex agent
- Ticket rehearsal: N/A

## Scope Rehearsal
- [x] Deploy kandidat release (simulasi local runtime)
- [x] Smoke test
- [x] Rollback simulation
- [x] Recovery verification

## Hasil Eksekusi
- Start time: 2026-03-07 14:02 WIB
- End time: 2026-03-07 14:13 WIB
- Durasi total: ~11 menit
- Evidence commands:
  - `npm run test:integration` -> PASS (12 suite termasuk `ops-lifecycle`)
  - `npm run ops:backup:daily` -> PASS, file `okus-map-explorer_local_daily_20260307-141244.sql.gz`
  - `tsx script/ops-restore-drill.ts --file backups/daily/okus-map-explorer_local_daily_20260307-141244.sql.gz --cleanup` -> PASS

## Hasil Smoke
- Status: PASS
- Temuan utama:
  - Tidak ada failure pada endpoint critical path melalui integration suite.
  - Request observability (`x-request-id`) tervalidasi.
  - Dashboard summary/export, map viewport, WP/OP list/filter lulus.
- Referensi smoke checklist:
  - `docs/uat/smoke-test-checklist.md`

## Hasil Rollback Simulation
- Status: PASS
- Durasi rollback: 1 detik (restore drill)
- Temuan utama:
  - Restore berhasil.
  - Validasi row count:
    - `wajib_pajak: 12`
    - `objek_pajak: 10`
    - `master_rekening_pajak: 9`
  - Cleanup DB drill berhasil (`--cleanup`).
- Referensi rollback checklist:
  - `docs/runbooks/rollback-checklist.md`
  - `docs/runbooks/restore-drill-runbook.md`

## Risiko yang Terdeteksi
1. Rehearsal masih berbasis local dry-run, belum staging dengan trafik realistis.
2. Monitoring p95 runtime butuh verifikasi environment staging untuk confidence SLO.
3. Approval owner operasional/release manager belum terisi.

## Action Items
1. Item: Jalankan rehearsal ulang di staging dengan checklist yang sama.
   Owner: Engineering Lead + Release Manager
   Due date: sebelum start Wave 4
2. Item: Isi approval matrix dan decision log go/no-go setelah staging rehearsal.
   Owner: Product Owner + Engineering Lead
   Due date: sebelum cut release production

## Keputusan Rehearsal
- Ready for go-live: NO (karena baru local dry-run; staging rehearsal wajib)
- Catatan persetujuan: lanjut ke Wave 3 sambil menyiapkan rehearsal staging untuk Wave 4 gate.
