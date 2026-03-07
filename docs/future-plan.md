# Future Plan — Roadmap Menuju Production (8-10 Minggu)

## Current Baseline (Completed)
Ringkasan fase yang sudah selesai sampai saat ini:
- Phase 1.5-1.9: local DevEx, final contract WP/OP, governance, auth+RBAC, performance hardening.
- Phase 2.0-2.5: cursor pagination rollout (offset tetap aktif), dashboard aggregation+analytics, observability, cache strategy, security baseline login.
- Evidence utama: changelog sprint dan integration suite aktif di repository.

## Prioritas Program (Decision Locked)
- `P0 / Must Do Before Production`:
  - Hardening data lifecycle production.
  - UAT + release readiness checklist.
- `P1 / Should Do`:
  - Reporting/export lanjutan (scheduled export + format operasional).
- `Backlog (Post-Production)`:
  - Deprecation plan offset pagination setelah stabil di production.

## Status Eksekusi Saat Ini
- Active now: Wave 1 (Data Lifecycle Hardening).
- Completed in this wave (docs baseline):
  - backup retention policy,
  - restore drill runbook,
  - purge & retention policy,
  - restore drill evidence template.
- Prepared templates for next waves:
  - UAT/smoke/rollback/rehearsal report.
  - Release gate, SLO baseline, escalation matrix.
  - Reporting/export operations and post-launch monitoring/review.

## Roadmap 5 Gelombang (8-10 Minggu)

### Wave 1 (Week 1-2) — Data Lifecycle Hardening (`Must Do`)
Objective:
- Menutup risiko kehilangan data dan memastikan recoverability terukur.

Deliverables:
- Kebijakan backup retention final:
  - daily 35 hari, weekly 12 minggu, monthly 12 bulan.
- Runbook restore drill bulanan + template bukti hasil restore.
- Purge policy terdokumentasi:
  - soft-delete/archival policy,
  - audit log retention minimal 365 hari.

Exit Criteria:
- Dokumen runbook backup/restore/purge disetujui.
- Simulasi restore drill 1 siklus berhasil dan tercatat.
- Owner operasional dan frekuensi eksekusi jelas.

Dependency:
- Akses environment staging/DB backup tooling.
- Naming convention storage backup ditetapkan.

Defer Candidates:
- Otomasi lifecycle lintas region/multi-cloud.
- Retention differential per jenis data non-kritis.

### Wave 2 (Week 3-4) — UAT Framework + Smoke + Rollback Drill (`Must Do`)
Objective:
- Membuat kualitas rilis bisa dieksekusi berulang dengan checklist baku.

Deliverables:
- UAT checklist per domain (WP, OP, Master, Dashboard, Auth).
- Smoke test checklist pre/post deploy.
- Rollback checklist yang tervalidasi di staging.
- Definisi release gate:
  - `npm run check` pass,
  - seluruh integration suite pass,
  - smoke pass,
  - rollback step tervalidasi.

Exit Criteria:
- 1 dry-run release rehearsal end-to-end selesai.
- Semua checklist punya owner dan SLA tindak lanjut.

Dependency:
- Stabilitas staging environment.
- Seed data UAT representatif.

Defer Candidates:
- E2E browser automation penuh untuk semua alur.
- Chaos test lanjutan.

### Wave 3 (Week 5-6) — Reporting/Export Operasional + Scheduling (`Should Do`)
Objective:
- Memastikan kebutuhan laporan operasional rutin bisa berjalan tanpa manual berat.

Deliverables:
- Standar format CSV operasional:
  - header baku,
  - timestamp export,
  - identitas filter.
- Kebijakan scheduled export:
  - harian (operasional),
  - mingguan (rekap manajemen).
- Delivery mode:
  - file drop terjadwal ke storage internal,
  - runbook konsumsi laporan.

Exit Criteria:
- Simulasi 1 minggu schedule berjalan tanpa error kritis.
- Format output tervalidasi oleh stakeholder operasional.

Dependency:
- Kejelasan lokasi storage internal tujuan.
- Daftar laporan prioritas yang disepakati.

Defer Candidates:
- Integrasi notifikasi eksternal kompleks (email gateway/third-party workflow).

### Wave 4 (Week 7-8) — Release Readiness Gate + Go-Live Rehearsal (`Must Do`)
Objective:
- Menutup gap terakhir sebelum go-live produksi.

Deliverables:
- Release readiness board final (go/no-go).
- SLO baseline:
  - availability 99.5%,
  - p95 endpoint list/dashboard < 500ms pada baseline dataset internal.
- Go-live rehearsal dengan skenario incident ringan.

Exit Criteria:
- Keputusan go/no-go terdokumentasi.
- SLO baseline terukur dan disetujui.
- Escalation path incident jelas.

Dependency:
- Data observability dari staging stabil.
- Kesepakatan ownership on-call internal.

Defer Candidates:
- SLO per endpoint granular level lanjut.
- Multi-channel incident management automation.

### Wave 5 (Week 9-10) — Production Stabilization + Post-Launch Review (`Must Do`)
Objective:
- Menjaga kestabilan pasca go-live dan menyiapkan backlog iterasi berikutnya.

Deliverables:
- Monitoring harian minggu awal produksi.
- Post-launch review:
  - incident log,
  - kapasitas,
  - kualitas data.
- Re-prioritization backlog termasuk item post-production.

Exit Criteria:
- Tidak ada incident P0/P1 berulang tanpa RCA.
- Daftar perbaikan iterasi berikutnya disetujui.

Dependency:
- Data operasional produksi minimal 2 minggu.
- Ketersediaan owner untuk review lintas fungsi.

Defer Candidates:
- Deprecation offset pagination (tetap backlog sampai stabil production).

## Klasifikasi Inisiatif
- `Must Do Before Production`:
  - Data lifecycle hardening.
  - UAT + release readiness + rollback validation.
  - Release gate + go-live rehearsal + stabilization.
- `Should Do`:
  - Reporting/export lanjutan (scheduled + format operasional).
- `Backlog (Post-Production)`:
  - Deprecation offset pagination.

## Catatan
- Roadmap ini fokus ke kesiapan operasional produksi, bukan fitur domain baru.
- Detail task-level dan scoring matrix ada di:
  - `docs/plans/2026-03-07-production-readiness-master-plan.md`
  - `docs/plans/2026-03-07-priority-defer-matrix.md`
