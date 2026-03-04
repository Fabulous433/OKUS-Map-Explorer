# Design — Technical Constitution

## Arsitektur
- **Monolith** — satu repo, satu server (Express), satu database (PostgreSQL)
- **Shared types** — `shared/schema.ts` sebagai single source of truth untuk TypeScript types dan database schema
- **Storage pattern** — semua akses database melalui `IStorage` interface, diimplementasikan oleh `DatabaseStorage`
- **SPA** — React frontend dengan client-side routing (wouter), served by Vite dev middleware

## Tech Stack Inti
- TypeScript (full-stack), React 18, Vite 5, Express 4
- PostgreSQL + Drizzle ORM, Zod validation
- Leaflet + react-leaflet v4 (BUKAN v5 — butuh React 19)
- TanStack Query v5 (object form only)
- Tailwind CSS + shadcn/ui
- csv-parse/csv-stringify + multer untuk CSV import/export

## Architecture Decision Records
1. **react-leaflet v4** — kompatibilitas React 18
2. **JSONB untuk detail_pajak** — fleksibel per jenis pajak, validasi di app layer
3. **Tanpa autentikasi** — fase awal, tabel `users` sudah siap untuk future auth
4. **CSV in-memory processing** — cukup untuk dataset kecil-menengah (limit 5MB)
5. **Neo-brutalist design** — identitas visual kuat, high contrast

## Security Guidelines
- Environment variables via Replit Secrets (DATABASE_URL, SESSION_SECRET)
- Input validation di setiap endpoint via Zod
- Drizzle ORM = parameterized queries (no SQL injection)
- File upload max 5MB
- **WAJIB**: tambah autentikasi sebelum production deploy

## Aturan Kode
- Jangan ubah `server/vite.ts`, `vite.config.ts`, `drizzle.config.ts`, `package.json`
- Route `/export` dan `/import` HARUS sebelum `/:id` di Express
- Selalu gunakan `IStorage` interface untuk operasi database
- Types selalu dari `shared/schema.ts` — jangan duplikasi
- TanStack Query: gunakan object form, queryKey = API path
