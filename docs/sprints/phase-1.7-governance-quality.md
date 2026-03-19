# Phase 1.7 — Governance & Quality (MVP, 2 Minggu)

## Tujuan
Mengunci governance layer untuk model data final WP/OP dengan 5 deliverable MVP dalam satu sprint:
1. Docs Lock + Runbook
2. Master Data Management
3. Audit Trail
4. Workflow Verifikasi OP
5. Data Quality Guardrail

## Scope
- Backend API + DB schema + integration test
- FE backoffice safe cutover untuk flow operasional
- Dokumentasi sprint + update docs existing + changelog

## Perubahan DB
- Tambahan kolom verifikasi pada `objek_pajak`:
  - `status_verifikasi` (`draft|verified|rejected`)
  - `catatan_verifikasi`
  - `verified_at`
  - `verified_by`
- Tabel baru `audit_log`:
  - `id, entity_type, entity_id, action, actor_name, before_data, after_data, metadata, created_at`

## API Baru / Diubah

### Master Data
- `GET/POST/PATCH/DELETE /api/master/rekening-pajak`
- `GET/POST/PATCH/DELETE /api/master/kecamatan`
- `GET/POST/PATCH/DELETE /api/master/kelurahan`
- `GET /api/master/kelurahan?kecamatanId=...`

Rule:
- Delete master ditolak bila masih direferensikan OP.
- Rekening mendukung `isActive`.

### Audit
- `GET /api/audit-log?entityType=&entityId=&action=&from=&to=&limit=&cursor=`

### Verifikasi OP
- `PATCH /api/objek-pajak/:id/verification`
- Create OP default `draft`.
- `rejected` wajib catatan.
- `GET /api/objek-pajak` default hanya `verified`.
- Internal mode: `includeUnverified=true`.

### Quality
- `POST /api/quality/check`
- `GET /api/quality/report`

## FE Operasional
- Halaman baru: `Backoffice Master Data` (tab Rekening/Kecamatan/Kelurahan)
- OP Backoffice:
  - filter verifikasi
  - aksi verify/reject
  - consume `includeUnverified=true`
  - warning quality sebelum submit
  - panel audit history
- WP Backoffice:
  - warning quality sebelum submit
  - panel audit history

## Test Matrix

### Unit / Type Safety
- `npm run check`

### Integration
- `tests/integration/final-contract.integration.ts`
- `tests/integration/op-csv-roundtrip.integration.ts`
- `tests/integration/op-detail-validation.integration.ts`
- `tests/integration/governance-quality.integration.ts` (baru)

Run:
```bash
npm run test:integration
```

## Risiko & Mitigasi
- Risiko: `drizzle-kit push` prompt interaktif constraint (blocking CI/local).
  - Mitigasi: one-off SQL migration manual via `script/phase-1.7-governance-quality.sql`, termasuk normalisasi legacy unique constraint name agar state schema tetap cocok dengan Drizzle.
- Risiko: data lama OP otomatis tidak `verified`.
  - Mitigasi: backfill status existing ke `verified` saat migrasi manual.

## Outcome Sprint
- Governance baseline berjalan end-to-end untuk operasi internal.
- Kontrak API final tetap stabil dan teruji integrasi.
