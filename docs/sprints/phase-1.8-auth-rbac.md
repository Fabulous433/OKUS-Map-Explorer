# Phase 1.8 — Auth + RBAC (Hardening)

## Tujuan
Menambahkan autentikasi sesi dan role-based access control (`admin`, `editor`, `viewer`) untuk mengamankan endpoint backoffice tanpa mengubah kontrak final WP/OP.

## Scope
- Backend:
  - Session login/logout/me
  - RBAC enforcement per endpoint
  - Seed akun default berbasis role
  - One-off migration kolom `users.role`
- Frontend:
  - Halaman login backoffice
  - Guard halaman backoffice + logout
  - UI read-only untuk role `viewer`
  - Menu backoffice sesuai role
- Testing:
  - Update integration existing agar login-aware
  - Tambahan integration matrix auth+rbac

## Endpoint Auth
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Role matrix ringkas:
- `admin`: full access WP/OP/master/audit/quality/verification.
- `editor`: mutasi WP/OP + verification + quality; read master/audit.
- `viewer`: read-only internal endpoints.

Catatan publik:
- `GET /api/objek-pajak` tetap publik untuk data `verified` default.
- Akses internal OP (`includeUnverified=true` atau status non-verified) wajib login.

## Migration
File SQL one-off:
- `script/phase-1.8-auth-rbac.sql`

Isi utama:
- Tambah kolom `users.role` (default `viewer`)
- Normalisasi nilai role invalid ke `viewer`
- Tambah check constraint role valid

## Seed Akun Default
- `admin / admin123`
- `editor / editor123`
- `viewer / viewer123`

## Test Matrix
- Existing suites:
  - `final-contract.integration.ts`
  - `op-csv-roundtrip.integration.ts`
  - `op-detail-validation.integration.ts`
  - `governance-quality.integration.ts`
- New suite:
  - `auth-rbac.integration.ts`

Perintah:
```bash
npm run test:integration
```
