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

Tambahan security baseline login:
- `AUTH_LOGIN_RATE_LIMIT_WINDOW_MS` (default `60000`)
- `AUTH_LOGIN_RATE_LIMIT_MAX_REQUESTS` (default `40`)
- `AUTH_LOGIN_LOCKOUT_THRESHOLD` (default `5`)
- `AUTH_LOGIN_LOCKOUT_MS` (default `300000`)

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
