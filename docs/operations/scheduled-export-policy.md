# Scheduled Export Policy

## Tujuan
Menetapkan jadwal export rutin untuk kebutuhan operasional dan manajemen.

## Jadwal Baseline (Locked)
- Harian (operasional):
  - Jam: 06:00
  - Laporan: dashboard summary, list OP aktif, list WP aktif
- Mingguan (manajemen):
  - Hari: Senin
  - Jam: 07:00
  - Laporan: rekap trend, rekap verifikasi OP, ringkasan kualitas data

## Job Policy
- Retry maksimum: 3 kali.
- Backoff: 5 menit antar percobaan.
- Timeout generation per report: 10 menit.

## Job Status
Setiap job harus mencatat:
- `job_id`
- `report_type`
- `scheduled_at`
- `started_at`
- `finished_at`
- `status` (`success`/`failed`)
- `artifact_path` (jika sukses)

## Monitoring
- Alert jika job gagal 2 kali berturut.
- Alert jika tidak ada artifact harian pada window +2 jam.

## Manual Trigger
- Boleh dijalankan on-demand oleh role internal.
- Wajib mencatat actor dan alasan trigger manual.
