# Phase 2.4 — Security Baseline Login (MVP)

## Tujuan
Menambah baseline proteksi endpoint auth agar lebih tahan brute-force dengan effort implementasi ringan.

## Scope

### Backend
- `POST /api/auth/login`:
  - rate limit per client window.
  - lockout sementara per kombinasi `client + username` saat gagal berulang.
  - response `429` dengan `Retry-After`.
- `POST /api/auth/change-password`:
  - wajib login.
  - verifikasi password lama.
  - validasi password baru sesuai policy.

### Password Policy (MVP)
- Panjang 8-72 karakter.
- Minimal 1 huruf.
- Minimal 1 angka.

### Testing
- Tambahan suite:
  - `auth-security-baseline.integration.ts`
- Validasi:
  - lockout aktif setelah gagal login berulang.
  - rate limit login aktif saat request beruntun.
  - password policy ditolak untuk password lemah.
  - password change valid sukses dan bisa dipakai login.

## Verifikasi
```bash
npm run check
npm run test:integration:auth-security-baseline
```

## Risiko & Mitigasi
- Risiko: false-positive lockout untuk user legit.
  - Mitigasi: lockout durasi pendek (`AUTH_LOGIN_LOCKOUT_MS`) + `Retry-After`.
- Risiko: konfigurasi limit terlalu ketat.
  - Mitigasi: semua parameter threshold configurable via env.
