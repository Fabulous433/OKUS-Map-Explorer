# Staging Bootstrap Plan (Execution-Ready)

## Tujuan
Membangun environment staging pertama yang stabil dan mirip production, supaya semua gate release bisa dijalankan nyata (bukan local dry-run).

## Definisi Selesai
Staging dianggap "siap pakai" jika:
- URL staging bisa diakses.
- Login backoffice berhasil.
- `npm run ops:smoke -- --base-url <staging-url>` lulus.
- `ops:report:daily` dan `ops:post-launch:snapshot` bisa jalan ke staging.
- Evidence bisa diisi ke readiness board + approval log.

## Scope
- Setup infra staging.
- Setup database staging.
- Setup app deploy staging.
- Setup env & secret staging.
- Validasi operasional baseline.

## Out of Scope
- High availability (multi node).
- Auto-scaling production grade.
- Hardening enterprise network lanjutan.

## Prasyarat
- 1 VM/server staging (Linux) dengan akses SSH.
- Domain/subdomain staging (contoh: `staging-map.okuselatan.go.id`).
- Akses DNS untuk pointing domain ke IP server.
- PIC owner:
  - Engineering Lead
  - Product Owner
  - Release Manager

## Arsitektur Minimal (Recommended)
1. Reverse proxy: Nginx.
2. App service: Node.js app (`npm run build` + `npm run start`) via `pm2` atau `systemd`.
3. DB staging: PostgreSQL terpisah dari local/dev.
4. Optional: Adminer staging dibatasi IP/VPN.

## Langkah Eksekusi

### Step 1 — Siapkan Server
1. Install dependency server: `git`, `node`, `npm`, `postgresql-client`, `nginx`.
2. Buat direktori deploy, contoh: `/opt/okus-map-explorer`.
3. Clone repo ke server staging branch `main` (atau release candidate branch).

Exit check:
- Server bisa `npm ci`.
- Reverse proxy ready.

### Step 2 — Siapkan Database Staging
1. Provision database staging terpisah.
2. Buat user/password khusus staging.
3. Simpan connection string ke secret manager/server env.
4. Jalankan schema:
   - `npm run db:push`
5. Seed data baseline:
   - start app sekali, biarkan seed awal berjalan.

Exit check:
- Tabel inti ada.
- Login default tersedia (admin/editor/viewer) atau akun staging disiapkan manual.

### Step 3 — Siapkan Environment Variable Staging
Set minimal:
- `NODE_ENV=production`
- `PORT=5000`
- `DATABASE_URL=<staging-db-url>`
- `SESSION_SECRET=<secret-kuat>`
- `SLOW_QUERY_MS=300`
- `REPORT_EXPORT_BASE_URL=https://<staging-domain>`
- `SMOKE_BASE_URL=https://<staging-domain>`
- `POST_LAUNCH_BASE_URL=https://<staging-domain>`

Dan parameter ops lainnya sesuai `.env.example`.

Exit check:
- App bisa start tanpa error env.

### Step 4 — Deploy App Staging
1. Build:
   - `npm ci`
   - `npm run build`
2. Start service:
   - `npm run start` (dibungkus process manager)
3. Konfigurasi Nginx:
   - reverse proxy `443 -> localhost:5000`
   - aktifkan TLS certificate.

Exit check:
- `GET /api/auth/me` merespons (dengan sesi valid).
- UI `/backoffice/login` terbuka.

### Step 5 — Jalankan Operational Gate di Staging
Urutan perintah:
1. `npm run check`
2. `npm run test:integration`
3. Backup baseline DB staging via platform hosting (untuk EasyPanel: snapshot/backup DB service).
4. `npm run ops:smoke -- --base-url https://<staging-domain>`
5. `npm run ops:report:daily -- --base-url https://<staging-domain>`
6. `npm run ops:post-launch:snapshot -- --base-url https://<staging-domain>`
7. Restore drill ke DB sementara menggunakan backup platform, lalu verifikasi count tabel inti.

Exit check:
- Semua command pass.
- Artifact reports/snapshot terbentuk.

### Step 6 — Isi Dokumen Evidence
1. Update board:
   - `docs/release/release-readiness-board-2026-03-07.md` (atau file board tanggal baru)
2. Isi approval:
   - `docs/release/owner-approval-log-template.md` -> salin jadi file dated.
3. Isi decision:
   - `docs/release/go-no-go-decision-log-template.md` -> salin jadi file dated.

Exit check:
- Status final GO/NO-GO tertulis.
- Semua owner sign-off tercatat.

## Risiko Umum + Mitigasi
1. Secret salah -> app gagal start.
   - Mitigasi: validasi env sebelum start service.
2. DB migration gagal.
   - Mitigasi: backup sebelum `db:push`, rollback sesuai runbook.
3. Smoke fail di staging.
   - Mitigasi: stop release, RCA, rerun gate.

## Handoff Setelah Staging Siap
Lanjut pakai:
- `docs/release/staging-execution-window-runbook.md`
- `docs/release/release-readiness-gate.md`
- `docs/release/go-live-rehearsal-checklist.md`

## Jalur Cepat (Jika Staging + Production 1 VPS)
Gunakan runbook khusus:
- `docs/release/staging-single-vps-runbook.md`
