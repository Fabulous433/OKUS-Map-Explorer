# Data Purge & Retention Policy (Production Baseline)

## Tujuan
Mengontrol pertumbuhan data dan memenuhi kebutuhan audit tanpa mengorbankan recoverability.

## Prinsip
- Default: non-destruktif terlebih dahulu (soft-delete/archive).
- Hard delete hanya untuk data yang melewati masa retensi dan tidak dibutuhkan audit.
- Semua purge wajib tercatat (siapa, kapan, ruang lingkup, hasil).

## Kategori Data

### 1) Data Operasional Inti
Contoh:
- `wajib_pajak`
- `objek_pajak`
- `master_*`

Kebijakan:
- Tidak dipurge otomatis pada fase baseline.
- Perubahan mengikuti aturan bisnis dan audit trail.

### 2) Data Audit
Contoh:
- `audit_log`

Kebijakan:
- Retensi minimum: 365 hari.
- Data > 365 hari:
  - dipindahkan ke arsip (disarankan), atau
  - dihapus terkontrol jika storage menekan dan arsip tersedia.

### 3) Artefak Ekspor/Laporan
Contoh:
- file CSV operasional terjadwal

Kebijakan default:
- Retensi aktif: 180 hari.
- Arsip bulanan: sampai 12 bulan.

## Purge Window
- Purge job dijalankan di luar jam sibuk (disarankan 02:00-04:00).
- Purge tidak dijalankan bersamaan dengan restore drill.

## Prosedur Purge (Baseline)
1. Identifikasi data kandidat purge berdasarkan retensi.
2. Buat snapshot/backup sebelum purge batch besar.
3. Jalankan purge bertahap (batch kecil).
4. Verifikasi row affected sesuai ekspektasi.
5. Catat hasil purge pada log operasional.

## Guardrails
- Batasi jumlah baris per batch untuk mencegah lock panjang.
- Wajib ada query preview (count kandidat) sebelum execute delete/archive.
- Wajib ada rollback option (backup pra-purge).

## Approval Matrix
- Purge rutin sesuai policy: approval owner operasional.
- Purge non-rutin/massal: approval owner backend + release manager.

## KPI Monitoring
- Growth rate tabel audit/log.
- Storage consumption per bulan.
- Durasi purge job.
- Jumlah kegagalan purge.

## Review Cadence
- Review policy tiap 3 bulan.
- Revisi retensi bila:
  - ada perubahan regulasi,
  - ada lonjakan volume signifikan,
  - ada kebutuhan audit tambahan.
