# Changelog

## Phase 1.9 — Performance & Query Hardening

### Added
- Endpoint map viewport baru:
  - `GET /api/objek-pajak/map?bbox=minLng,minLat,maxLng,maxLat&zoom=&q=&kecamatanId=&rekPajakId=&limit=`
- One-off SQL hardening index + trgm:
  - `script/phase-1.9-performance-query-hardening.sql`
- Integration suite baru:
  - `performance-query-hardening.integration.ts`

### Improved
- `GET /api/wajib-pajak` kini server-side paginated + server-first search/filter.
- `GET /api/objek-pajak` kini server-side paginated + server-first search/filter.
- Query guardrails ditambahkan:
  - `page` min 1
  - `limit` bounded
  - `q` trim + max length
  - `bbox` validasi format/range
- FE backoffice WP/OP:
  - debounced search 300ms
  - keep-previous-data saat pindah page/filter
  - pagination controls + page size selector
- FE map:
  - load marker by viewport (`moveend/zoomend`)
  - request lama otomatis dibatalkan saat viewport berubah
  - marker payload ringan dari endpoint map

### Fixed
- List OP tidak lagi hydrate `detailPajak` penuh pada endpoint list (detail tetap on-demand via `GET /api/objek-pajak/:id`).
- Halaman dashboard/map/backoffice tersinkron dengan contract paginated baru.

### Breaking
- `GET /api/wajib-pajak` dan `GET /api/objek-pajak` tidak lagi return array langsung.
  - Contract baru: `{ items: [...], meta: {...} }`.

## Phase 1.8 — Auth + RBAC

### Added
- Endpoint autentikasi sesi:
  - `POST /api/auth/login`
  - `POST /api/auth/logout`
  - `GET /api/auth/me`
- Role aplikasi pada user (`admin|editor|viewer`) di schema `users`.
- Seed akun default internal:
  - `admin/admin123`
  - `editor/editor123`
  - `viewer/viewer123`
- Integration suite baru: `auth-rbac.integration.ts`.
- One-off migration SQL: `script/phase-1.8-auth-rbac.sql`.

### Improved
- RBAC backend pada endpoint internal WP/OP/master/audit/quality/verifikasi.
- Akses publik OP diperketat:
  - default list `verified` tetap publik,
  - mode internal (`includeUnverified` / status non-verified) wajib login.
- Backoffice FE sekarang memakai login page + guard sesi + logout.
- UI backoffice role-aware:
  - viewer read-only,
  - menu/halaman master data hanya admin.

### Fixed
- Seluruh integration test existing disesuaikan agar login-aware (session cookie test helper).
- Cleanup integration test tidak lagi gagal karena endpoint delete kini diproteksi role.

### Breaking
- Endpoint internal yang sebelumnya terbuka kini memerlukan autentikasi/otorisasi role.

## Phase 1.7 — Governance & Quality

### Added
- CRUD Master Data untuk rekening pajak, kecamatan, dan kelurahan.
- Tabel `audit_log` + endpoint baca audit dengan filter + cursor pagination.
- Workflow verifikasi OP (`draft|verified|rejected`) + endpoint `PATCH /api/objek-pajak/:id/verification`.
- Endpoint quality guardrail:
  - `POST /api/quality/check`
  - `GET /api/quality/report`
- Halaman backoffice baru `Master Data` (tab Rekening/Kecamatan/Kelurahan).
- Panel riwayat perubahan (audit) di halaman WP dan OP.
- Integration suite baru: `governance-quality.integration.ts`.

### Improved
- List OP default ke data `verified`, dengan mode internal `includeUnverified=true`.
- Dashboard backoffice membaca data internal mode (`includeUnverified=true`).
- Form WP/OP menampilkan warning quality sebelum submit (non-blocking).
- Mutasi WP/OP/Master/Verification kini otomatis menulis audit log.

### Fixed
- Contract-final integration test disesuaikan untuk filter verifikasi default.
- Seed OP dilengkapi status verifikasi agar data contoh tetap tampil di mode publik.

### Breaking
- `GET /api/objek-pajak` default response kini hanya OP `verified`.
  - Untuk kebutuhan internal/backoffice gunakan `?includeUnverified=true`.
