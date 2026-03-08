# Staging Execution Window Runbook

## Tujuan
Menjalankan evidence collection final di staging secara terstruktur sebelum keputusan GO/NO-GO production.

## Scope
- Smoke critical path.
- Rollback simulation.
- Reporting/export operational check.
- Post-launch snapshot baseline.
- Pengisian readiness board + approval log.

## Referensi Sebelum Mulai
- Flow promosi code:
  - `docs/release/local-to-deploy-flow.md`
- Jika staging belum ada, jalankan dulu:
  - `docs/release/staging-bootstrap-plan.md`
- Jika pakai 1 VPS untuk production+staging:
  - `docs/release/staging-single-vps-runbook.md`

## Prasyarat
- Akses staging application + database.
- Akun internal untuk smoke (`admin/editor`).
- Backup storage staging aktif.
- Window waktu disetujui release manager.

## Run Order (Wajib)
1. Validasi build gate:
   - `npm run check` (local/CI sebelum deploy)
   - `npm run test:integration` (local/CI sebelum deploy)
2. Backup baseline:
   - backup DB via platform hosting (EasyPanel DB backup/snapshot).
3. Smoke critical path:
   - `npm run ops:smoke -- --base-url <staging-url>`
4. Rollback simulation:
   - restore backup ke DB sementara (platform method), verifikasi data, lalu cleanup DB sementara.
5. Reporting/export check:
   - `npm run ops:report:daily -- --base-url <staging-url>`
6. Post-launch snapshot:
   - `npm run ops:post-launch:snapshot -- --base-url <staging-url>`
7. Isi evidence docs:
   - `docs/release/go-live-rehearsal-report-<date>.md`
   - `docs/release/release-readiness-board-<date>.md`
   - `docs/release/owner-approval-log-<date>.md`

## Fail-Fast Rule
- Jika langkah 3 atau 4 gagal: stop eksekusi dan status otomatis `NO-GO`.
- Jika langkah 5 gagal: lanjut investigasi, status minimum `HOLD` sampai RCA.
- Jika approval matrix belum lengkap: status tetap `NO-GO`.

## Evidence Minimum per Window
- Output command `ops:smoke`.
- Bukti backup dan restore drill dari platform hosting.
- Output command `ops:report:daily`.
- Output command `ops:post-launch:snapshot`.
- Readiness board terisi dan ditandatangani owner.

## Exit Criteria
- Semua langkah selesai tanpa blocker.
- Evidence tersimpan dan bisa diaudit.
- Keputusan GO/NO-GO tercatat di decision log.
