# Local Development (Docker + Host App)

## Prasyarat
- Docker Desktop aktif
- Node.js 20+
- npm

## 1) Start database lokal
```bash
npm run db:up
```

Service yang berjalan:
- PostgreSQL: `localhost:55432`
- Adminer: `http://localhost:8080`

Kredensial default:
- System: `PostgreSQL`
- Server: `postgres`
- Username: `okus_dev`
- Password: `okus_dev`
- Database: `okus_map_explorer`

## 2) Setup environment
```bash
Copy-Item .env.example .env.local
```

`server/env.ts` memuat `.env.local` terlebih dahulu, lalu fallback ke `.env`.

## 3) Install dependency dan push schema
```bash
npm install
npm run db:push
```

## 4) Jalankan aplikasi
```bash
npm run dev
```

Aplikasi: `http://localhost:5000`

## Operasional DB
```bash
npm run db:logs    # Lihat log postgres + adminer
npm run db:down    # Stop container
npm run db:reset   # Hapus volume lalu start ulang (destructive)
```

## Backup / Restore dasar
Backup:
```bash
docker exec -t okus-postgres pg_dump -U okus_dev -d okus_map_explorer > backup.sql
```

Restore:
```bash
cat backup.sql | docker exec -i okus-postgres psql -U okus_dev -d okus_map_explorer
```

