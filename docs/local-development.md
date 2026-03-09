# Local Development (Docker + Host App)

## Prasyarat
- Docker Desktop aktif
- Node.js 20+
- npm

## 1) Start database lokal
```bash
npm run db:up
```

Service:
- PostgreSQL: `localhost:55432`
- Adminer: `http://localhost:8080`

Credential default Adminer:
- System: `PostgreSQL`
- Server: `postgres`
- Username: `okus_dev`
- Password: `okus_dev`
- Database: `okus_map_explorer`

## 2) Environment
```bash
Copy-Item .env.example .env.local
```

Tambahan observability:
- `SLOW_QUERY_MS` (default `300`) untuk threshold logging slow query.
- `ENABLE_STARTUP_SEED` (default `true` di local) untuk seed otomatis saat boot aplikasi.
- `ATTACHMENTS_STORAGE_ROOT` (default `./uploads`) untuk root file attachment WP/OP.

Tambahan security baseline login:
- `AUTH_LOGIN_RATE_LIMIT_WINDOW_MS` (default `60000`)
- `AUTH_LOGIN_RATE_LIMIT_MAX_REQUESTS` (default `40`)
- `AUTH_LOGIN_LOCKOUT_THRESHOLD` (default `5`)
- `AUTH_LOGIN_LOCKOUT_MS` (default `300000`)

Tambahan data lifecycle ops:
- `BACKUP_DIR` (default `backups`)
- `BACKUP_ENV` (default `local`)
- `BACKUP_CONTAINER` (default `okus-postgres`)
- `BACKUP_DB_NAME` (default `okus_map_explorer`)
- `BACKUP_DB_USER` (default `okus_dev`)
- `BACKUP_RETENTION_DAYS_DAILY` (default `35`)
- `BACKUP_RETENTION_WEEKS_WEEKLY` (default `12`)
- `BACKUP_RETENTION_MONTHS_MONTHLY` (default `12`)
- `RESTORE_DRILL_DB_NAME` (default `okus_restore_drill`)

Tambahan reporting/export ops:
- `REPORT_EXPORT_BASE_URL` (default `http://127.0.0.1:5000`)
- `REPORT_EXPORT_OUTPUT_DIR` (default `reports`)
- `REPORT_EXPORT_USERNAME` (default `admin`)
- `REPORT_EXPORT_PASSWORD` (default `admin123`)
- `REPORT_EXPORT_GENERATED_BY` (default `system`)
- `REPORT_EXPORT_RETRY_ATTEMPTS` (default `3`)
- `REPORT_EXPORT_RETRY_DELAY_MS` (default `300000`)
- `REPORT_EXPORT_TIMEOUT_MS` (default `600000`)

## 3) Install dependency
```bash
npm install
```

## 4) Apply schema
Prioritas:
```bash
npm run db:push
```

Catatan:
- Jika `drizzle-kit push` terhenti di prompt interaktif constraint, jalankan fallback SQL:
```bash
docker exec -i okus-postgres psql -U okus_dev -d okus_map_explorer < script/phase-1.7-governance-quality.sql
```
- Jika DB lama belum punya kolom role untuk auth:
```bash
docker exec -i okus-postgres psql -U okus_dev -d okus_map_explorer < script/phase-1.8-auth-rbac.sql
```
- Jika butuh hardening performa list/map (Phase 1.9):
```bash
docker exec -i okus-postgres psql -U okus_dev -d okus_map_explorer < script/phase-1.9-performance-query-hardening.sql
```

## 5) Jalankan app
```bash
npm run dev
```
Aplikasi: `http://localhost:5000`

Health check:
- `http://localhost:5000/health`
- `http://localhost:5000/api/health`

---

## Runbook Migrasi (Phase 1.7)

### Backup penuh sebelum perubahan destruktif
```bash
docker exec -t okus-postgres pg_dump -U okus_dev -d okus_map_explorer > backups/pre-phase-1.7.sql
```

### Rollback manual
```bash
cat backups/pre-phase-1.7.sql | docker exec -i okus-postgres psql -U okus_dev -d okus_map_explorer
```

### Smoke test pasca migrasi
```bash
npm run check
npm run test:integration
```

Verifikasi observability cepat:
- Kirim request dengan header `x-request-id: local-debug-001` lalu cek response header sama.
- Cek log backend untuk event:
  - `slow-query request_id=...`
  - `query-error request_id=...`

Verifikasi conditional fetch (ETag):
- Request pertama ambil ETag:
```bash
curl -i "http://localhost:5000/api/wajib-pajak?page=1&limit=25" -H "Cookie: connect.sid=<session>"
```
- Request kedua dengan `If-None-Match` dari response sebelumnya:
```bash
curl -i "http://localhost:5000/api/wajib-pajak?page=1&limit=25" -H "Cookie: connect.sid=<session>" -H "If-None-Match: W/\"...\""
```
- Expected: `304 Not Modified` saat data belum berubah.

Verifikasi endpoint cepat:
- `POST /api/auth/change-password`
- `GET /api/wajib-pajak?page=1&limit=25`
- `GET /api/wajib-pajak?limit=25&cursor=2147483647`
- `GET /api/objek-pajak?page=1&limit=25&includeUnverified=true`
- `GET /api/objek-pajak?limit=25&cursor=2147483647&includeUnverified=true`
- `GET /api/objek-pajak/map?bbox=104,-4.6,104.1,-4.4&limit=100`
- `GET /api/master/rekening-pajak?includeInactive=true`
- `GET /api/dashboard/summary?includeUnverified=true&from=2026-01-01&to=2026-12-31&groupBy=week`
- `GET /api/dashboard/summary/export?includeUnverified=true&from=2026-01-01&to=2026-12-31&groupBy=week`
- `GET /api/audit-log?limit=5`
- `GET /api/quality/report`
- `GET /api/wajib-pajak/:id/attachments`
- `GET /api/objek-pajak/:id/attachments`

Verifikasi attachment lokal:
- root storage default akan dibuat otomatis di direktori `uploads/`
- upload hanya menerima `PDF/JPG/PNG/WebP`
- maksimum file `5 MB`
- setelah test lokal, folder `uploads/` bisa dibersihkan manual bila hanya berisi file smoke test

---

## Login Backoffice (Phase 1.8)
- URL: `http://localhost:5000/backoffice/login`
- Seed akun default:
  - `admin / admin123`
  - `editor / editor123`
  - `viewer / viewer123`

---

## Operasional DB
```bash
npm run db:logs
npm run db:down
npm run db:reset
```

`db:reset` bersifat destruktif (hapus volume).

Operasional backup/restore baseline:
```bash
npm run ops:backup:daily
npm run ops:backup:prune:dry
npm run ops:restore:drill
```

Operasional smoke checklist baseline:
```bash
npm run ops:smoke
```

Operasional post-launch monitoring baseline:
```bash
npm run ops:post-launch:snapshot
```

Operasional reporting/export baseline:
```bash
npm run ops:report:daily
npm run ops:report:weekly
```

---

## Runbook Production Baseline
- Backup retention policy:
  - `docs/runbooks/backup-retention-policy.md`
- Restore drill runbook:
  - `docs/runbooks/restore-drill-runbook.md`
- Data purge & retention policy:
  - `docs/runbooks/data-purge-retention-policy.md`
- Restore drill evidence template:
  - `docs/runbooks/restore-drill-evidence-template.md`
- Release rehearsal report template:
  - `docs/uat/release-rehearsal-report-template.md`
- Release rehearsal evidence sample:
  - `docs/uat/release-rehearsal-report-2026-03-07.md`
- Reporting export standard:
  - `docs/operations/reporting-export-standard.md`
- Scheduled export policy:
  - `docs/operations/scheduled-export-policy.md`
- Report delivery runbook:
  - `docs/operations/report-delivery-runbook.md`
- Reporting export evidence sample:
  - `docs/operations/reporting-export-evidence-2026-03-07.md`
- Go-live rehearsal checklist:
  - `docs/release/go-live-rehearsal-checklist.md`
- Go-live rehearsal report sample:
  - `docs/release/go-live-rehearsal-report-2026-03-07.md`
- Release readiness board sample:
  - `docs/release/release-readiness-board-2026-03-07.md`
- Staging execution window runbook:
  - `docs/release/staging-execution-window-runbook.md`
- Staging bootstrap plan:
  - `docs/release/staging-bootstrap-plan.md`
- Single VPS + EasyPanel runbook:
  - `docs/release/staging-single-vps-runbook.md`
- Local -> staging -> production flow:
  - `docs/release/local-to-deploy-flow.md`
- Owner approval log template:
  - `docs/release/owner-approval-log-template.md`
- GO/NO-GO decision log template:
  - `docs/release/go-no-go-decision-log-template.md`
- Post-launch monitoring guide:
  - `docs/operations/post-launch-monitoring.md`
- Post-launch summary template:
  - `docs/operations/post-launch-summary.md`
- Post-launch summary evidence sample:
  - `docs/operations/post-launch-summary-2026-03-07.md`
