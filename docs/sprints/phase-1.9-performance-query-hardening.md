# Phase 1.9 — Performance & Query Hardening

## Tujuan
Mengunci performa list/map saat data besar dengan pendekatan:
- hard cutover pagination,
- server-first search/filter,
- viewport query untuk marker peta.

## Scope

### Backend
- Hard cutover contract list:
  - `GET /api/wajib-pajak` -> paginated `{ items, meta }`
  - `GET /api/objek-pajak` -> paginated `{ items, meta }`
- Endpoint map baru:
  - `GET /api/objek-pajak/map`
- Guardrails query:
  - `page` min 1
  - `limit` bounded
  - `q` trim + max 100
  - `bbox` format/range valid
- List OP hanya hydrate kolom ringan; detail full tetap di `GET /api/objek-pajak/:id`.

### Database
- One-off SQL hardening index/trgm:
  - `script/phase-1.9-performance-query-hardening.sql`

### Frontend
- Backoffice WP/OP:
  - server-driven pagination + filter + debounced search (300ms),
  - `keepPreviousData` agar tabel tidak blink.
- Map:
  - fetch marker by viewport (`moveend/zoomend`),
  - request cancel/replace via query signal,
  - payload marker ringan.
- Visual direction tetap plain-first neo-brutalist + micro-motion ringan.

## API Summary

### `GET /api/wajib-pajak`
Query:
- `page`, `limit`, `q`, `jenisWp`, `peranWp`, `statusAktif`

Response:
- `items: WajibPajakListItem[]`
- `meta: { page, limit, total, totalPages, hasNext, hasPrev }`

### `GET /api/objek-pajak`
Query:
- `page`, `limit`, `q`, `status`, `statusVerifikasi`, `kecamatanId`, `rekPajakId`, `includeUnverified`

Response:
- `items: ObjekPajakListItem[]`
- `meta: { page, limit, total, totalPages, hasNext, hasPrev }`

### `GET /api/objek-pajak/map`
Query:
- `bbox`, `zoom`, `q`, `kecamatanId`, `rekPajakId`, `limit`

Response:
- `items: MapObjekPajakItem[]`
- `meta: { totalInView, isCapped }`

## Test Matrix
- `npm run check`
- `npm run test:integration`
  - `final-contract.integration.ts`
  - `op-csv-roundtrip.integration.ts`
  - `op-detail-validation.integration.ts`
  - `governance-quality.integration.ts`
  - `auth-rbac.integration.ts`
  - `performance-query-hardening.integration.ts` (baru)

## Risiko & Mitigasi
- **Breaking contract list**:
  - mitigasi: FE WP/OP/dashboard/map disesuaikan dalam sprint yang sama.
- **Map flood request saat pan/zoom cepat**:
  - mitigasi: debounce viewport + cancel request via signal.
- **Query berat pada search**:
  - mitigasi: index trgm + bounding limit.
