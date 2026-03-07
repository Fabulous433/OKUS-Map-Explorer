# EasyPanel Single VPS Runbook (Production + Staging, Dockerfile)

## Tujuan
Menjalankan production dan staging di 1 VPS berbasis EasyPanel, dengan isolasi yang aman dan alur release yang tetap disiplin.

## Prinsip Isolasi (Wajib)
1. Service app terpisah (`okus-prod-app`, `okus-stg-app`).
2. Service DB terpisah (`okus-prod-db`, `okus-stg-db`).
3. Domain terpisah (`map...` vs `staging-map...`).
4. Environment variables terpisah.
5. Backup evidence terpisah.

## Struktur di EasyPanel (Recommended)
Di 1 project EasyPanel, buat:
1. PostgreSQL service production.
2. PostgreSQL service staging.
3. App service production (repo ini).
4. App service staging (repo ini).

Nama contoh:
- `okus-prod-db`
- `okus-stg-db`
- `okus-prod-app`
- `okus-stg-app`

## Step 1 — Buat Database Service di EasyPanel
1. Buat PostgreSQL `okus-stg-db`.
2. Catat credential internal dari EasyPanel:
   - host
   - port
   - database
   - username
   - password
3. Ulangi untuk `okus-prod-db`.

Catatan:
- Jangan share DB prod dan staging.

## Step 2 — Buat App Service Staging
Di EasyPanel:
1. Create app service dari GitHub repo `OKUS-Map-Explorer`.
2. Branch: `main` (atau release branch khusus jika kamu pakai).
3. Build method: pilih `Dockerfile`.
4. EasyPanel akan build dari file:
   - `Dockerfile`
   - `.dockerignore`
5. Internal port: `5000`.

Catatan:
- Jalur `Dockerfile` lebih stabil untuk repo ini dibanding `Nixpacks`.
- Tidak perlu isi build command/start command manual jika EasyPanel memakai Dockerfile standar repo.

## Step 3 — Isi Environment Variable Staging
Masukkan di service `okus-stg-app`:
```env
NODE_ENV=production
PORT=5000
ENABLE_STARTUP_SEED=false
DATABASE_URL=postgresql://<stg_user>:<stg_pass>@<stg_host>:<stg_port>/<stg_db>
SESSION_SECRET=<SECRET_STAGING_PANJANG>
SLOW_QUERY_MS=300

REPORT_EXPORT_BASE_URL=https://staging-map.domainkamu.com
REPORT_EXPORT_OUTPUT_DIR=/app/reports/staging
REPORT_EXPORT_USERNAME=admin
REPORT_EXPORT_PASSWORD=admin123
REPORT_EXPORT_GENERATED_BY=staging-system

SMOKE_BASE_URL=https://staging-map.domainkamu.com
SMOKE_USERNAME=admin
SMOKE_PASSWORD=admin123
SMOKE_TIMEOUT_MS=30000

POST_LAUNCH_BASE_URL=https://staging-map.domainkamu.com
POST_LAUNCH_OUTPUT_DIR=/app/reports/staging
POST_LAUNCH_USERNAME=admin
POST_LAUNCH_PASSWORD=admin123
POST_LAUNCH_TIMEOUT_MS=30000
POST_LAUNCH_GENERATED_BY=staging-system
```

Catatan penting:
- `ops:backup`/`ops:restore:drill` saat ini diasumsikan Docker container lokal.
- Untuk EasyPanel, backup/restore pakai fitur backup DB EasyPanel (lihat Step 6).

## Step 4 — Hubungkan Domain Staging
Di EasyPanel:
1. Tambah domain `staging-map.domainkamu.com` ke `okus-stg-app`.
2. Pastikan DNS A record mengarah ke VPS.
3. Aktifkan SSL di EasyPanel.

Exit check:
- URL staging terbuka.
- `/backoffice/login` tampil.
- `/health` mengembalikan status `healthy`.

## Step 5 — Inisialisasi Schema Staging
Dari terminal/console service staging (EasyPanel):
```bash
npm run db:push
```

Catatan:
- Script ini sekarang explicit memakai `drizzle.config.ts`, jadi tidak lagi fallback ke `drizzle.config.json`.

Lalu restart service staging jika diperlukan.

## Step 6 — Validasi Operasional Staging
Masih dari terminal service staging:
```bash
npm run check
npm run test:integration
npm run ops:smoke -- --base-url https://staging-map.domainkamu.com
npm run ops:report:daily -- --base-url https://staging-map.domainkamu.com
npm run ops:post-launch:snapshot -- --base-url https://staging-map.domainkamu.com
```

### Backup & Restore Drill (EasyPanel style)
1. Buat backup/snapshot dari `okus-stg-db` via UI EasyPanel.
2. Buat DB sementara `okus-stg-db-restore`.
3. Restore backup ke DB sementara.
4. Verifikasi query count tabel inti.
5. Hapus DB restore sementara setelah validasi.

## Step 7 — Isi Evidence dan Keputusan
Isi dokumen:
1. `docs/release/release-readiness-board-2026-03-07.md` (atau file tanggal baru).
2. `docs/release/owner-approval-log-template.md` -> salin jadi file dated.
3. `docs/release/go-no-go-decision-log-template.md` -> salin jadi file dated.

## Step 8 — Buat Production Service (Setelah Staging Hijau)
Ulangi pola yang sama untuk `okus-prod-app` + `okus-prod-db`:
1. Domain production: `map.domainkamu.com`
2. Env production pakai DB/secret production.
3. Jangan copy credential staging ke production.

## Update Deploy Rutin (Staging/Production)
Di EasyPanel:
1. Pull latest commit / redeploy.
2. Build ulang.
3. Run `npm run db:push` jika ada perubahan schema.
4. Jalankan gate command sesuai environment.

## Catatan Penting
1. Satu VPS boleh, asal service staging/prod benar-benar dipisah.
2. Jangan expose DB ke publik internet.
3. Simpan secret hanya di EasyPanel env secret manager.
4. Status release tetap ditentukan oleh readiness board + owner approval.
5. Image runtime sekarang dibangun dari `Dockerfile` multi-stage dan start dengan `node dist/index.cjs`.
