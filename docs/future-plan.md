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

## Next Priority (Phase 1.8)
1. Auth + RBAC (admin/editor/viewer) untuk mutasi master/WP/OP/verifikasi.
2. Hardening audit (actor dari session, bukan input UI).
3. UAT packaging + seed profile (dev/staging/prod).
4. Observability (structured logging + request id + error tracking).
5. Performance pass untuk listing besar (pagination server-side + index review).

## Catatan
- Perubahan 1.7 bersifat operasional internal (MVP governance).
- Optimasi performa lanjutan tetap masuk sprint berikutnya.
