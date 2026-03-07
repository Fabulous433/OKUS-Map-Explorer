# Report Catalog (Operational Baseline)

## Daily Reports

### 1) Dashboard Summary Daily
- Source: `GET /api/dashboard/summary`
- Artifact name: `dashboard_summary_daily_<timestamp>.csv`
- Tujuan: snapshot KPI harian.
- Frequency: daily 06:00.

### 2) Wajib Pajak Active List
- Source: `GET /api/wajib-pajak`
- Artifact name: `wajib_pajak_active_daily_<timestamp>.csv`
- Tujuan: monitoring pertumbuhan/perubahan WP aktif.
- Frequency: daily 06:00.

### 3) Objek Pajak Active/Verification Snapshot
- Source: `GET /api/objek-pajak`
- Artifact name: `objek_pajak_verification_daily_<timestamp>.csv`
- Tujuan: pantau status verifikasi operasional.
- Frequency: daily 06:00.

## Weekly Reports

### 1) Dashboard Trend Weekly
- Source: `GET /api/dashboard/summary?groupBy=week`
- Artifact name: `dashboard_trend_weekly_<timestamp>.csv`
- Tujuan: evaluasi tren created vs verified.
- Frequency: weekly Monday 07:00.

### 2) Verification Backlog Weekly
- Source: list OP + status verifikasi.
- Artifact name: `verification_backlog_weekly_<timestamp>.csv`
- Tujuan: kontrol backlog verifikasi OP.
- Frequency: weekly Monday 07:00.

### 3) Data Quality Weekly
- Source: `GET /api/quality/report`
- Artifact name: `data_quality_weekly_<timestamp>.csv`
- Tujuan: pantau indikator kualitas data.
- Frequency: weekly Monday 07:00.

## Metadata Wajib per Laporan
- export timestamp
- filter snapshot
- report frequency
- generator identity (system/manual actor)
