# Backup Retention Policy (Production Baseline)

## Tujuan
Menjamin data dapat dipulihkan saat incident dengan kebijakan backup yang konsisten dan terukur.

## Scope
- Database utama aplikasi (`okus_map_explorer`).
- Backup logical dump PostgreSQL.
- Berlaku untuk environment staging dan production.

## Retention Baseline (Locked)
- Daily backup: retensi 35 hari.
- Weekly backup: retensi 12 minggu.
- Monthly backup: retensi 12 bulan.

## Jadwal Backup
- Daily: setiap hari pukul 01:00 (waktu server).
- Weekly: setiap Minggu pukul 02:00.
- Monthly: tanggal 1 setiap bulan pukul 03:00.

## Format Nama File
Gunakan pola:
`okus-map-explorer_<env>_<frequency>_<YYYYMMDD-HHMMSS>.sql.gz`

Contoh:
- `okus-map-explorer_prod_daily_20260307-010000.sql.gz`
- `okus-map-explorer_prod_weekly_20260302-020000.sql.gz`
- `okus-map-explorer_prod_monthly_20260301-030000.sql.gz`

## Standar Keamanan Backup
- Backup harus terenkripsi saat tersimpan.
- Backup harus ditransfer melalui kanal aman.
- Akses baca backup dibatasi pada role operasional yang ditunjuk.

## Owner dan Tanggung Jawab
- Owner Operasional DB:
  - Menjalankan monitoring job backup.
  - Menangani alert backup gagal.
- Owner Aplikasi:
  - Verifikasi integritas backup melalui restore drill.
  - Review policy tiap kuartal.

## Health Check Harian
Checklist:
1. File backup terbaru tersedia sesuai jadwal.
2. Ukuran file tidak nol dan tidak anomali ekstrem.
3. Log job backup tidak mengandung error fatal.

## Prosedur Pembersihan Retensi
- Jalankan pruning otomatis berdasarkan retensi.
- Urutan pruning:
  1. Daily > 35 hari
  2. Weekly > 12 minggu
  3. Monthly > 12 bulan
- Pruning harus tercatat di log operasional.

## Failure Handling
Jika backup gagal:
1. Buat incident entry (severity minimal P2).
2. Retry maksimal 3 kali dalam 60 menit.
3. Jika tetap gagal, eskalasi ke owner DB + owner aplikasi.
4. Laporkan dampak pada daily ops report.

## Review Cadence
- Review mingguan: status keberhasilan backup.
- Review bulanan: hasil restore drill.
- Review kuartalan: validasi retensi dan kebutuhan kapasitas storage.
