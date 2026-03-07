# Report Delivery Runbook

## Tujuan
Memastikan file export terjadwal dikirim ke lokasi tujuan yang disepakati dan bisa dikonsumsi tim operasional.

## Delivery Mode (Baseline)
- File drop ke storage internal terstruktur per tanggal dan jenis laporan.

Struktur path contoh:
- `reports/daily/YYYY/MM/DD/`
- `reports/weekly/YYYY/MM/DD/`

## Langkah Delivery
1. Generate file report sesuai standard.
2. Validasi header + ukuran file.
3. Upload/move file ke path target.
4. Catat metadata delivery (timestamp, file path, status).
5. Kirim notifikasi internal sederhana (log/board) jika diperlukan.

Command baseline:
```bash
npm run ops:report:daily
npm run ops:report:weekly
```

## Validasi Pasca Delivery
- File dapat diakses oleh tim yang berwenang.
- Nama file sesuai naming convention.
- File dapat dibuka dan diparse.

## Failure Handling
- Jika upload gagal:
  - retry sesuai policy schedule.
  - jika tetap gagal, tandai failed dan eskalasi.
- Jika file corrupt:
  - regenerate report,
  - replace artifact,
  - catat insiden.

## Ownership
- Owner Operasional Reporting:
  - memonitor hasil delivery harian/mingguan.
- Owner Engineering:
  - menangani bug generation atau delivery pipeline.
