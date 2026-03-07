# Phase 2.2 — Observability Query Performance (MVP)

## Tujuan
Meningkatkan kemampuan investigasi performa query dan error API lewat correlation id request dan slow query logging.

## Scope

### Backend
- Middleware request context:
  - baca `x-request-id` dari header incoming.
  - auto-generate bila header tidak ada/invalid.
  - inject `x-request-id` ke seluruh response.
- Error payload API menyertakan `requestId`.
- Instrumentasi `pg.Pool`:
  - slow query log dengan threshold `SLOW_QUERY_MS`.
  - query error log yang menyertakan `request_id`.

### Konfigurasi
- Env baru:
  - `SLOW_QUERY_MS` (default `300`).

### Testing
- Integration suite:
  - `observability.integration.ts`.
- Validasi:
  - response selalu punya header `x-request-id`.
  - request id custom dari client di-echo oleh server.

## Operasional
- Untuk trace insiden, kirim request dengan header:
  - `x-request-id: incident-<id>`
- Gunakan nilai sama untuk baca log app + db agar korelasi cepat.

## Verifikasi
```bash
npm run check
npm run test:integration:observability
```

## Risiko & Mitigasi
- Risiko: noisy log bila threshold terlalu kecil.
  - Mitigasi: set `SLOW_QUERY_MS` lebih tinggi di environment sibuk.
- Risiko: request id liar dari client.
  - Mitigasi: validasi sederhana + fallback auto-generate UUID.
