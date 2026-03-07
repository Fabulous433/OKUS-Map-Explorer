# Restore Drill Runbook (Bulanan)

## Tujuan
Membuktikan backup dapat dipulihkan dan data hasil restore valid dipakai.

## Frekuensi
- Minimal 1 kali per bulan.
- Disarankan minggu pertama setiap bulan.

## Prasyarat
- Backup file tersedia sesuai policy.
- Akses ke host Docker/staging DB.
- Waktu maintenance window untuk drill.

## Environment Contoh (Local/Staging)
- Container PostgreSQL: `okus-postgres`
- DB user: `okus_dev`
- DB source: `okus_map_explorer`
- DB target drill: `okus_restore_drill`

## Langkah Eksekusi

### 1) Pilih file backup
- Pilih backup terbaru yang sukses (daily/weekly sesuai target drill).
- Catat nama file yang dipakai pada evidence template.

### 2) Buat database target drill
```bash
docker exec -i okus-postgres psql -U okus_dev -d postgres -c "DROP DATABASE IF EXISTS okus_restore_drill;"
docker exec -i okus-postgres psql -U okus_dev -d postgres -c "CREATE DATABASE okus_restore_drill;"
```

### 3) Restore backup ke database target
Contoh:
```bash
gzip -dc backups/okus-map-explorer_staging_daily_20260307-010000.sql.gz | docker exec -i okus-postgres psql -U okus_dev -d okus_restore_drill
```

### 4) Validasi struktural dasar
```bash
docker exec -i okus-postgres psql -U okus_dev -d okus_restore_drill -c "\dt"
```

Expected:
- Tabel inti tersedia (`wajib_pajak`, `objek_pajak`, `master_*`, `audit_log`, detail tables).

### 5) Validasi data minimum
```bash
docker exec -i okus-postgres psql -U okus_dev -d okus_restore_drill -c "SELECT count(*) FROM wajib_pajak;"
docker exec -i okus-postgres psql -U okus_dev -d okus_restore_drill -c "SELECT count(*) FROM objek_pajak;"
docker exec -i okus-postgres psql -U okus_dev -d okus_restore_drill -c "SELECT count(*) FROM master_rekening_pajak;"
```

Expected:
- Semua query berhasil.
- Nilai count masuk akal dibanding baseline backup.

### 6) Validasi aplikasi (opsional kuat)
- Arahkan sementara app ke DB target drill.
- Jalankan:
```bash
npm run check
npm run test:integration
```

### 7) Cleanup
```bash
docker exec -i okus-postgres psql -U okus_dev -d postgres -c "DROP DATABASE IF EXISTS okus_restore_drill;"
```

## Kriteria Lulus Drill
- Restore selesai tanpa error fatal.
- Validasi tabel dan data minimum lolos.
- Evidence template terisi lengkap.
- Jika gagal, RCA dicatat maksimal H+1.

## Eskalasi Saat Gagal
1. Owner Operasional DB
2. Owner Backend
3. PIC Release Manager (jika mendekati jadwal release)

## Output Wajib
- File evidence bulanan terisi.
- Link ke log command/screenshot hasil validasi.
