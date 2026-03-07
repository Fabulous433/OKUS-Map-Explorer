# Reporting Export Standard (Operational)

## Tujuan
Menstandarkan format output laporan agar konsisten untuk operasional dan manajemen.

## Format Umum
- Format file: CSV UTF-8.
- Delimiter: koma (`,`).
- Header wajib di baris pertama.
- Nilai tanggal: `YYYY-MM-DD` atau ISO timestamp jika butuh jam.

## Field Metadata Wajib
Semua file export wajib menyertakan:
- `export_timestamp`
- `export_source`
- `filter_snapshot`
- `generated_by` (system/user)

## Naming Convention
`<report_name>_<frequency>_<YYYYMMDD-HHMMSS>.csv`

Contoh:
- `dashboard_summary_daily_20260307-060000.csv`
- `wajib_pajak_weekly_20260307-070000.csv`

## Validasi Minimal
- Header sesuai catalog laporan.
- Tidak ada kolom wajib yang hilang.
- Nilai numerik valid parse.
- File tidak kosong (kecuali secara eksplisit laporan zero-data).

## Error Handling
- Jika generation gagal:
  - tulis error log dengan request id,
  - tandai job status gagal,
  - retry sesuai policy schedule.
