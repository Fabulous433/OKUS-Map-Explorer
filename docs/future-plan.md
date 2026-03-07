# Future Plan — Roadmap Pengembangan

## Phase 1.5: Local DevEx Baseline (Completed)
- Docker Compose PostgreSQL + Adminer
- Environment local standar
- Runbook dasar operasi DB

## Phase 1.6: Data Alignment Sprint (Completed)
- Refactor kontrak WP/OP final
- Master wilayah/rekening terhubung FK
- CSV WP/OP final contract + integration test baseline

## Phase 1.7: Governance & Quality (Completed)
Output sprint:
- Docs lock + runbook update
- Master Data Management (CRUD kecamatan/kelurahan/rekening)
- Audit Trail (`audit_log` + endpoint baca)
- Workflow verifikasi OP (`draft|verified|rejected`)
- Data Quality Guardrail (`/api/quality/check`, `/api/quality/report`)
- FE backoffice safe cutover:
  - halaman Master Data
  - OP verification action + filter
  - panel riwayat perubahan (WP/OP)
  - warning quality sebelum submit
- Integration suite ditambah untuk skenario governance-quality

## Phase 1.8: Auth + RBAC Hardening (Completed)
Output sprint:
- Session auth endpoint: `login/logout/me`.
- RBAC backend untuk endpoint mutasi dan endpoint internal:
  - `admin`: full access.
  - `editor`: mutasi WP/OP + verification, baca master/audit.
  - `viewer`: read-only.
- Guard backoffice FE + halaman login + logout.
- UI role-aware:
  - `viewer` read-only di halaman WP/OP.
  - menu Master Data hanya untuk `admin`.
- Integration suite auth matrix: `auth-rbac.integration.ts`.
- One-off SQL migration `script/phase-1.8-auth-rbac.sql`.

## Phase 1.9: Performance & Query Hardening (Completed)
Output sprint:
- Hard cutover list WP/OP ke paginated response (`items + meta`).
- Server-first search/filter untuk WP/OP.
- Endpoint viewport map:
  - `GET /api/objek-pajak/map?bbox=...`
- Guardrails query:
  - `page` min 1, `limit` bounded, `q` bounded, `bbox` validasi range.
- FE backoffice WP/OP:
  - server-driven pagination + filter + debounced search + keep-previous-data.
- FE map:
  - viewport query + debounced move/zoom + request cancel/replace.
- One-off SQL index hardening:
  - `script/phase-1.9-performance-query-hardening.sql`.
- Integration suite tambahan:
  - `performance-query-hardening.integration.ts`.

## Next Priority (Phase 2.0)
1. Cursor-based pagination migration untuk list WP/OP (pengganti offset).
2. Endpoint agregasi dashboard (counter/stat) agar tidak bergantung page sampling.
3. Observability query performance (slow query log + tracing id request).
4. Cache strategy master + list query hot-path (ETag/conditional fetch).
5. Security baseline lanjutan (rate limit login, password policy, lockout ringan).

## Catatan
- Perubahan 1.7 bersifat operasional internal (MVP governance).
- Optimasi performa lanjutan berlanjut ke cursor pagination + observability.
