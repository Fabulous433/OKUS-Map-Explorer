# Restore Drill Evidence — 2026-03-07

## Metadata
- Tanggal drill: 2026-03-07
- Environment: local (baseline simulasi staging procedure)
- Nama pelaksana: Codex agent
- Reviewer: pending owner backend/ops
- Ticket/incident reference (jika ada): N/A

## Backup Source
- Nama file backup: `okus-map-explorer_local_daily_20260307-133922.sql.gz`
- Jenis backup (daily/weekly/monthly): daily
- Timestamp backup: 2026-03-07 13:39:22 WIB
- Lokasi storage: `backups/daily/`
- Ukuran file: 48,121 bytes

## Eksekusi Restore
- Start time: 2026-03-07T06:39:48.146Z
- End time: 2026-03-07T06:39:49.233Z
- Durasi total: 1 detik
- Target database restore: `okus_restore_drill`
- Command utama restore:
```bash
tsx script/ops-restore-drill.ts --file backups/daily/okus-map-explorer_local_daily_20260307-133922.sql.gz --cleanup
```

## Hasil Validasi
- Validasi tabel inti (`\dt`): Lulus (dari restore script dan query count pasca-restore)
- Count `wajib_pajak`: 12
- Count `objek_pajak`: 10
- Count `master_rekening_pajak`: 9
- Validasi aplikasi (`npm run check` / `npm run test:integration` jika dijalankan):
  - check: Pass (`npm run check` pada 2026-03-07)
  - integration: Not run (di luar scope drill ini)

## Temuan
- Error/kendala: Tidak ada error restore.
- Dampak: N/A
- Workaround: N/A

## Kesimpulan Drill
- Status akhir: Lulus
- Jika gagal, RCA target date: N/A
- Action items:
  1. Jalankan drill bulanan berikutnya di staging dan isi evidence baru.
  2. Tambahkan reviewer sign-off operasional setelah drill.
  3. Jadwalkan prune non-dry-run sesuai window operasional.

## Approval
- Owner Operasional DB: pending
- Owner Backend: pending
- Tanggal approval: pending
