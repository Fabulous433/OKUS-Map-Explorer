# Restore Drill Evidence Template

Gunakan template ini untuk setiap pelaksanaan restore drill bulanan.

## Metadata
- Tanggal drill:
- Environment:
- Nama pelaksana:
- Reviewer:
- Ticket/incident reference (jika ada):

## Backup Source
- Nama file backup:
- Jenis backup (daily/weekly/monthly):
- Timestamp backup:
- Lokasi storage:
- Ukuran file:

## Eksekusi Restore
- Start time:
- End time:
- Durasi total:
- Target database restore:
- Command utama restore:

## Hasil Validasi
- Validasi tabel inti (`\dt`): Lulus / Gagal
- Count `wajib_pajak`:
- Count `objek_pajak`:
- Count `master_rekening_pajak`:
- Validasi aplikasi (`npm run check` / `npm run test:integration` jika dijalankan):
  - check: Pass / Fail
  - integration: Pass / Fail

## Temuan
- Error/kendala:
- Dampak:
- Workaround:

## Kesimpulan Drill
- Status akhir: Lulus / Gagal
- Jika gagal, RCA target date:
- Action items:
  1.
  2.
  3.

## Approval
- Owner Operasional DB:
- Owner Backend:
- Tanggal approval:
