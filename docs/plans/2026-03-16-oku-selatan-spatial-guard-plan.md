# OKU Selatan Spatial Guard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Menambahkan guard spasial berbasis boundary GIS agar pembuatan, pembaruan, dan penayangan data `Objek Pajak` hanya berlaku untuk wilayah Kabupaten OKU Selatan.

**Architecture:** Gunakan pipeline offline untuk mengekstrak shapefile nasional menjadi asset GeoJSON khusus OKU Selatan saja, lalu commit asset turunan itu ke repo. Server memakai asset presisi untuk validasi point-in-polygon dan filter data publik, sedangkan client hanya memakai asset ringan untuk overlay, focus bounds, dan mencegah pemilihan titik di luar kabupaten.

**Tech Stack:** TypeScript, Node 20, `tsx`, Express, React, React-Leaflet, Zod, GeoJSON, shapefile parser Node, Turf geometry helpers.

---

## Current Source Facts

- Sumber boundary kabupaten ada di `docs/batas kabupaten dan propinsi indonesia/Batas Kabupaten.shp`.
- Sumber boundary kecamatan ada di `docs/batas-kecamatan-indonesia/Batas Kecamatan.shp`.
- Sumber boundary desa ada di `docs/batas-desa-indonesia/Batas_Wilayah_KelurahanDesa_10K_AR.shp`.
- Ketiga layer sama-sama `EPSG:4326` dan bisa difilter dengan `WADMKK = Ogan Komering Ulu Selatan`.
- Hasil audit awal file nasional:
  - kabupaten: 1 feature OKU Selatan
  - kecamatan: 19 feature OKU Selatan
  - desa/kelurahan: 259 feature OKU Selatan
- Master wilayah aplikasi saat ini sudah diseed dari dokumen PATDA di `server/seed.ts`, sehingga batch ini tidak perlu mengganti master kecamatan/kelurahan; fokusnya adalah guard koordinat dan scope data.

## Target Deliverables

- Asset region presisi khusus OKU Selatan:
  - `server/data/regions/okus/kabupaten.precise.geojson`
  - `server/data/regions/okus/kecamatan.precise.geojson`
  - `server/data/regions/okus/desa.precise.geojson`
- Asset region ringan untuk frontend:
  - `server/data/regions/okus/kabupaten.light.geojson`
  - `server/data/regions/okus/kecamatan.light.geojson`
- Utility server untuk load boundary dan validasi point-in-polygon.
- Guard create/update `Objek Pajak` agar koordinat di luar OKU Selatan ditolak.
- Scope data publik agar marker/front-end hanya menampilkan data dalam kabupaten aktif.
- UX picker/backoffice agar titik di luar boundary tidak bisa dipilih dengan tenang.

## Non-Goals

- Tidak memuat shapefile nasional mentah ke runtime app.
- Tidak mengganti struktur master wilayah PATDA yang sekarang sudah dipakai form.
- Tidak membangun engine GIS generik seluruh Indonesia pada batch ini.
- Tidak memaksa semua polygon desa dimuat ke frontend pada load awal.

### Task 1: Build OKU Selatan Boundary Assets

**Files:**
- Modify: `D:\Code\OKUS-Map-Explorer\package.json`
- Create: `D:\Code\OKUS-Map-Explorer\script\build-region-boundaries.ts`
- Create: `D:\Code\OKUS-Map-Explorer\tests\integration\region-boundary-build.integration.ts`
- Create: `D:\Code\OKUS-Map-Explorer\server\data\regions\okus\kabupaten.precise.geojson`
- Create: `D:\Code\OKUS-Map-Explorer\server\data\regions\okus\kecamatan.precise.geojson`
- Create: `D:\Code\OKUS-Map-Explorer\server\data\regions\okus\desa.precise.geojson`
- Create: `D:\Code\OKUS-Map-Explorer\server\data\regions\okus\kabupaten.light.geojson`
- Create: `D:\Code\OKUS-Map-Explorer\server\data\regions\okus\kecamatan.light.geojson`

**Step 1: Write the failing boundary-build regression**

Create `tests/integration/region-boundary-build.integration.ts` that expects:
- loader/build helper can produce region bundle `okus`
- `kabupaten.precise` contains exactly 1 feature with `WADMKK = Ogan Komering Ulu Selatan`
- `kecamatan.precise` contains exactly 19 features and every feature has `WADMKK = Ogan Komering Ulu Selatan`
- `desa.precise` contains at least 259 features and every feature has `WADMKK = Ogan Komering Ulu Selatan`
- `kabupaten.light` and `kecamatan.light` have fewer coordinates than the corresponding precise assets

**Step 2: Run test to verify it fails**

Run: `npx tsx tests/integration/region-boundary-build.integration.ts`

Expected:
- FAIL because build script / bundle files do not exist yet

**Step 3: Write the minimal offline asset builder**

Implement `script/build-region-boundaries.ts` to:
- read the three shapefile sources from `docs/`
- filter features by `WADMKK === "Ogan Komering Ulu Selatan"`
- keep precise outputs untouched except for removing irrelevant properties
- derive light outputs by simplifying only `kabupaten` and `kecamatan`
- write deterministic GeoJSON files under `server/data/regions/okus/`

Also update `package.json` to add:
- the minimal parsing/simplification dependencies needed for the script
- a script entry such as `region:build:okus`

**Step 4: Run the builder and verify the test passes**

Run:
- `npm run region:build:okus`
- `npx tsx tests/integration/region-boundary-build.integration.ts`

Expected:
- PASS
- output files created and stable on rerun

**Step 5: Commit**

```bash
git add package.json script/build-region-boundaries.ts tests/integration/region-boundary-build.integration.ts server/data/regions/okus
git commit -m "feat(gis): build oku selatan boundary bundle"
```

### Task 2: Enforce Spatial Guard on Create and Update

**Files:**
- Create: `D:\Code\OKUS-Map-Explorer\server\region-boundaries.ts`
- Create: `D:\Code\OKUS-Map-Explorer\tests\integration\objek-pajak-spatial-guard.integration.ts`
- Modify: `D:\Code\OKUS-Map-Explorer\server\storage.ts`
- Modify: `D:\Code\OKUS-Map-Explorer\server\routes.ts`

**Step 1: Write the failing API regression**

Create `tests/integration/objek-pajak-spatial-guard.integration.ts` covering:
- create OP with point inside OKU Selatan succeeds
- create OP with point outside OKU Selatan fails with `400`
- update OP moving point from in-region to outside-region fails with `400`
- create/update OP with point inside kabupaten but outside selected kecamatan fails
- create/update OP with point inside kecamatan but outside selected kelurahan fails when desa asset is available

**Step 2: Run test to verify it fails**

Run: `npx tsx tests/integration/objek-pajak-spatial-guard.integration.ts`

Expected:
- FAIL because no region guard exists yet

**Step 3: Implement the minimal server guard**

Implement `server/region-boundaries.ts` to:
- lazily load GeoJSON bundle from `server/data/regions/okus/`
- expose helpers for:
  - `isPointInsideActiveKabupaten`
  - `findContainingKecamatan`
  - `findContainingDesa`
  - `getActiveRegionBounds`

Modify `server/storage.ts` to call the guard from `createObjekPajak` and `updateObjekPajak`:
- run only when both `latitude` and `longitude` are present
- reject coordinates outside active kabupaten
- reject mismatch between point and selected `kecamatanId`
- reject mismatch between point and selected `kelurahanId`

Modify `server/routes.ts` only if needed to normalize and surface structured `400` messages cleanly.

**Step 4: Run test to verify it passes**

Run: `npx tsx tests/integration/objek-pajak-spatial-guard.integration.ts`

Expected:
- PASS
- errors mention kabupaten/kecamatan/kelurahan mismatch clearly enough for operator

**Step 5: Commit**

```bash
git add server/region-boundaries.ts server/storage.ts server/routes.ts tests/integration/objek-pajak-spatial-guard.integration.ts
git commit -m "feat(api): enforce oku selatan spatial guard"
```

### Task 3: Scope Public Data and Boundary Responses to Active Region

**Files:**
- Create: `D:\Code\OKUS-Map-Explorer\shared\region-boundary.ts`
- Create: `D:\Code\OKUS-Map-Explorer\tests\integration\public-map-region-scope.integration.ts`
- Modify: `D:\Code\OKUS-Map-Explorer\server\routes.ts`
- Modify: `D:\Code\OKUS-Map-Explorer\server\storage.ts`
- Modify: `D:\Code\OKUS-Map-Explorer\client\src\lib\region-config.ts`
- Create: `D:\Code\OKUS-Map-Explorer\client\src\lib\map\region-boundary-query.ts`
- Modify: `D:\Code\OKUS-Map-Explorer\client\src\pages\map-page.tsx`

**Step 1: Write the failing public-scope regression**

Create `tests/integration/public-map-region-scope.integration.ts` covering:
- boundary endpoint for active region returns OKU Selatan kabupaten light asset
- public map data endpoints do not include OP points outside active kabupaten
- focus / bbox response still works for in-region markers

**Step 2: Run test to verify it fails**

Run: `npx tsx tests/integration/public-map-region-scope.integration.ts`

Expected:
- FAIL because there is no boundary endpoint and no region filtering yet

**Step 3: Implement the smallest region-scoped read layer**

Create `shared/region-boundary.ts` for response types/schemas.

Modify `server/routes.ts` to add lightweight read endpoints such as:
- `GET /api/region-boundaries/active/kabupaten`
- `GET /api/region-boundaries/active/kecamatan`

Modify public map-related reads so out-of-region coordinates are excluded from public results.

Modify `client/src/lib/region-config.ts` only to add the minimum identity needed to request active region boundaries, such as `regionKey`.

Create `client/src/lib/map/region-boundary-query.ts` to fetch boundary JSON without bloating the main bundle.

Modify `client/src/pages/map-page.tsx` to:
- fetch kabupaten light boundary
- fit/anchor the initial public map to active kabupaten bounds
- render a clean kabupaten outline or subtle overlay without changing current UX structure

**Step 4: Run test to verify it passes**

Run:
- `npx tsx tests/integration/public-map-region-scope.integration.ts`
- `npm run check`

Expected:
- PASS
- typecheck stays green

**Step 5: Commit**

```bash
git add shared/region-boundary.ts server/routes.ts server/storage.ts client/src/lib/region-config.ts client/src/lib/map/region-boundary-query.ts client/src/pages/map-page.tsx tests/integration/public-map-region-scope.integration.ts
git commit -m "feat(map): scope public region data to oku selatan"
```

### Task 4: Guard the Backoffice Map Picker and Form UX

**Files:**
- Create: `D:\Code\OKUS-Map-Explorer\client\src\lib\map\region-boundary-client.ts`
- Create: `D:\Code\OKUS-Map-Explorer\tests\integration\region-boundary-client.integration.ts`
- Modify: `D:\Code\OKUS-Map-Explorer\client\src\pages\backoffice\objek-pajak-map-picker.tsx`
- Modify: `D:\Code\OKUS-Map-Explorer\client\src\pages\backoffice\objek-pajak-form-dialog.tsx`

**Step 1: Write the failing client-side helper regression**

Create `tests/integration/region-boundary-client.integration.ts` that verifies:
- bbox/max-bounds are derived from OKU Selatan kabupaten boundary
- helper rejects click coordinates outside kabupaten polygon
- helper accepts click coordinates inside kabupaten polygon

**Step 2: Run test to verify it fails**

Run: `npx tsx tests/integration/region-boundary-client.integration.ts`

Expected:
- FAIL because helper does not exist yet

**Step 3: Implement the minimal picker guard**

Create `client/src/lib/map/region-boundary-client.ts` for pure helper logic:
- normalize GeoJSON for Leaflet polygon rendering
- compute `LatLngBounds` from kabupaten boundary
- test whether clicked point is inside polygon

Modify `objek-pajak-map-picker.tsx` to:
- fetch/load kabupaten light boundary
- set map view to active region bounds
- render kabupaten outline
- ignore or warn on clicks outside kabupaten
- keep the existing basemap switcher and marker UX intact

Modify `objek-pajak-form-dialog.tsx` only to surface operator feedback cleanly when selection is rejected.

**Step 4: Run test to verify it passes**

Run:
- `npx tsx tests/integration/region-boundary-client.integration.ts`
- `npm run check`

Expected:
- PASS
- no regressions in form typings

**Step 5: Commit**

```bash
git add client/src/lib/map/region-boundary-client.ts client/src/pages/backoffice/objek-pajak-map-picker.tsx client/src/pages/backoffice/objek-pajak-form-dialog.tsx tests/integration/region-boundary-client.integration.ts
git commit -m "feat(backoffice): constrain map picker to oku selatan"
```

### Task 5: Verification, Docs, and Rollout Notes

**Files:**
- Modify: `D:\Code\OKUS-Map-Explorer\docs\api-spec.md`
- Modify: `D:\Code\OKUS-Map-Explorer\docs\changelog.md`
- Create: `D:\Code\OKUS-Map-Explorer\docs\uat\oku-selatan-spatial-guard-smoke.md`
- Create: `D:\Code\OKUS-Map-Explorer\tasks\tasks-oku-selatan-spatial-guard.md`

**Step 1: Write the final task checklist**

Create `tasks/tasks-oku-selatan-spatial-guard.md` to mirror the completed implementation order:
- asset build
- API guard
- public scope
- picker UX
- verification and smoke

**Step 2: Update docs**

Document:
- new boundary assets and their ownership
- API behavior when coordinates fall outside active region
- public map now intentionally scoped to active kabupaten
- operational note that national shapefiles remain source material only, never runtime assets

**Step 3: Run the full verification set**

Run:
- `npm run region:build:okus`
- `npx tsx tests/integration/region-boundary-build.integration.ts`
- `npx tsx tests/integration/objek-pajak-spatial-guard.integration.ts`
- `npx tsx tests/integration/public-map-region-scope.integration.ts`
- `npx tsx tests/integration/region-boundary-client.integration.ts`
- `npm run test:integration:performance-hardening`
- `npm run check`
- `npm run build`

Expected:
- all commands PASS

**Step 4: Perform manual smoke**

Use `docs/uat/oku-selatan-spatial-guard-smoke.md` to record:
- picker accepts point in Muaradua
- picker rejects point outside OKU Selatan
- create OP with outside-region coordinates fails
- public map loads only in-region markers
- existing marker deep-link still works for in-region data

**Step 5: Commit**

```bash
git add docs/api-spec.md docs/changelog.md docs/uat/oku-selatan-spatial-guard-smoke.md tasks/tasks-oku-selatan-spatial-guard.md
git commit -m "docs(gis): record oku selatan spatial guard rollout"
```

## Acceptance Criteria

1. Runtime project no longer depends on shapefile nasional mentah.
2. Repo contains committed boundary bundle khusus OKU Selatan saja.
3. `Objek Pajak` cannot be created or updated with coordinates outside OKU Selatan.
4. If coordinates are present, selected kecamatan and kelurahan must match the containing polygon.
5. Public map only serves markers inside OKU Selatan.
6. Backoffice picker no longer allows selecting points outside kabupaten.
7. Boundary overlay/focus aids operator orientation without redesigning the map UI.
8. Verification evidence and docs are recorded in repo.

## Rollout Notes

- Existing out-of-region records, if any, should be identified during manual smoke and corrected or archived separately.
- First delivery should prefer kabupaten and kecamatan overlays on frontend; desa polygons remain server-authoritative unless a later UX truly needs them on the client.
- If future regionization continues, keep this same pattern:
  - national source outside runtime
  - per-region committed bundle inside runtime
  - shared guard utility on server
