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

Verifikasi endpoint cepat:
- `GET /api/master/rekening-pajak?includeInactive=true`
- `GET /api/objek-pajak?includeUnverified=true`
- `GET /api/audit-log?limit=5`
- `GET /api/quality/report`

---

## Operasional DB
```bash
npm run db:logs
npm run db:down
npm run db:reset
```

`db:reset` bersifat destruktif (hapus volume).
