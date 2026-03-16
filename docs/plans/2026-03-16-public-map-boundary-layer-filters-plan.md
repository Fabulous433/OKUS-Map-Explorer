# Public Map Boundary Layer Filters Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Menambahkan layer control polygon batas `kabupaten`, `kecamatan`, dan `desa/kelurahan` pada map publik, lengkap dengan toggle visibilitas, opacity, dan panel informasi/legenda seperti referensi UI yang diberikan user.

**Architecture:** Bangun fitur ini di atas batch spatial guard OKU Selatan yang sudah menambahkan asset boundary dan endpoint boundary aktif. UI memakai panel atlas bergaya tab `Peta / Informasi / Cari` yang mempertahankan visual language map publik saat ini, tetapi menambah kontrol layer cartographic yang lebih kaya. `Kabupaten` dan `kecamatan` boleh dimuat sebagai asset ringan aktif, sedangkan `desa/kelurahan` wajib lazy dan scoped agar client tidak mengunduh semua 259 polygon pada initial load.

**Tech Stack:** TypeScript, React 18, React Query, React-Leaflet, Leaflet, shadcn `Tabs/Slider/Switch`, Express, GeoJSON, Turf helper yang sudah ada.

---

## Current Source Facts

- Plan ini mengasumsikan batch `2026-03-16-oku-selatan-spatial-guard-plan.md` sudah merged atau sedang dikerjakan di worktree `oku-selatan-spatial-guard`.
- Pada baseline spatial guard:
  - `server/data/regions/okus/kabupaten.light.geojson` sudah ada
  - `server/data/regions/okus/kecamatan.light.geojson` sudah ada
  - `server/data/regions/okus/desa.precise.geojson` sudah ada
  - belum ada `desa.light.geojson`
- Endpoint aktif yang sudah tersedia hanya:
  - `GET /api/region-boundaries/active/kabupaten`
  - `GET /api/region-boundaries/active/kecamatan`
- Contract shared boundary saat ini hanya mengenal `kabupaten|kecamatan`; belum ada `desa`.
- `client/src/pages/map-page.tsx` pada baseline spatial-guard sudah:
  - fit ke kabupaten aktif
  - render outline kabupaten
  - tetap memakai `DesktopMapFilterSheet` dan `MobileMapDrawer` yang saat ini hanya berisi search, filter kecamatan, rekening, dan basemap
- Drawer/filter map publik saat ini belum punya:
  - toggle layer polygon
  - slider opacity per layer
  - legenda warna polygon
  - tab `Peta / Informasi / Cari`
- Non-goal lama “jangan load semua polygon desa ke frontend pada load awal” tetap berlaku dan harus dipertahankan.

## UX Direction

- Pertahankan gaya neumorphic/operational yang sudah dipakai map publik saat ini.
- Ubah drawer filter menjadi panel atlas yang lebih intentional:
  - tab `Peta` untuk layer control
  - tab `Informasi` untuk legenda warna polygon dan penjelasan simbol
  - tab `Cari` untuk search / filter wilayah / rekening yang sudah ada
- `Kabupaten` tetap menjadi konteks dasar, dengan outline halus default.
- `Kecamatan` tampil sebagai fill semi-transparan berwarna berbeda per polygon, lengkap label permanen saat layer aktif.
- `Desa/Kelurahan` tidak langsung di-load semua:
  - layer baru aktif setelah user memilih `kecamatan` tertentu atau sistem punya scope kecamatan yang jelas
  - label desa hanya tampil pada zoom lebih tinggi agar map tidak berubah menjadi noise
- Layer control harus terasa tenang, bukan dashboard GIS generik:
  - toggle jelas
  - slider opacity langsung di bawah layer yang aktif
  - empty state yang jujur bila layer desa belum bisa dimuat karena `kecamatan` belum dipilih

## Non-Goals

- Tidak membangun engine symbology GIS generik lintas Indonesia.
- Tidak mengganti marker/query flow viewport yang sudah ada.
- Tidak memuat semua 259 polygon desa/kelurahan ke initial bundle atau initial request.
- Tidak mendesain ulang total halaman map publik di luar kebutuhan panel atlas/layer control.

### Task 1: Add a Client-Safe Desa Layer Asset and Scoped API Contract

**Files:**
- Modify: `D:\Code\OKUS-Map-Explorer\package.json`
- Modify: `D:\Code\OKUS-Map-Explorer\script\build-region-boundaries.ts`
- Modify: `D:\Code\OKUS-Map-Explorer\tests\integration\region-boundary-build.integration.ts`
- Create: `D:\Code\OKUS-Map-Explorer\server\data\regions\okus\desa.light.geojson`
- Modify: `D:\Code\OKUS-Map-Explorer\shared\region-boundary.ts`
- Modify: `D:\Code\OKUS-Map-Explorer\server\region-boundaries.ts`
- Modify: `D:\Code\OKUS-Map-Explorer\server\routes.ts`
- Create: `D:\Code\OKUS-Map-Explorer\tests\integration\region-boundary-layer-api.integration.ts`

**Step 1: Extend the failing build regression**

Update `tests/integration/region-boundary-build.integration.ts` so it also expects:
- `desa.light.geojson` exists
- `desa.light` has fewer coordinates than `desa.precise`
- build remains deterministic on rerun

**Step 2: Run test to verify it fails**

Run:
- `npx tsx tests/integration/region-boundary-build.integration.ts`

Expected:
- FAIL because `desa.light.geojson` does not exist yet

**Step 3: Add the failing scoped-API regression**

Create `tests/integration/region-boundary-layer-api.integration.ts` covering:
- `GET /api/region-boundaries/active/desa` without `kecamatanId` returns `400`
- `GET /api/region-boundaries/active/desa?kecamatanId=<muaraduaId>` returns only polygon desa/kelurahan untuk kecamatan itu
- `GET /api/region-boundaries/active/kecamatan` tetap backward-compatible

**Step 4: Run test to verify it fails**

Run:
- `npx tsx tests/integration/region-boundary-layer-api.integration.ts`

Expected:
- FAIL because endpoint/contract `desa` belum ada

**Step 5: Implement the minimal asset + API support**

Update `script/build-region-boundaries.ts` to:
- generate `desa.light.geojson`
- keep simplification deterministic dan tetap aman untuk rendering label/fill

Update `shared/region-boundary.ts` to:
- extend `regionBoundaryLevelSchema` menjadi `kabupaten|kecamatan|desa`
- tambahkan schema query/scope bila perlu, misalnya metadata `scope.kecamatanId`

Update `server/region-boundaries.ts` to:
- load `desa.light.geojson`
- expose helper untuk mengambil boundary `desa` scoped by `kecamatanId`
- filter feature `desa` berdasarkan kecamatan yang dipilih, bukan mengirim semua feature ke client

Update `server/routes.ts` to add:
- `GET /api/region-boundaries/active/desa?kecamatanId=<id>`

**Step 6: Run tests to verify they pass**

Run:
- `npm run region:build:okus`
- `npx tsx tests/integration/region-boundary-build.integration.ts`
- `npx tsx tests/integration/region-boundary-layer-api.integration.ts`

Expected:
- PASS
- `desa.light.geojson` committed and stable
- endpoint `desa` only serves scoped polygons

**Step 7: Commit**

```bash
git add package.json script/build-region-boundaries.ts tests/integration/region-boundary-build.integration.ts shared/region-boundary.ts server/region-boundaries.ts server/routes.ts tests/integration/region-boundary-layer-api.integration.ts server/data/regions/okus/desa.light.geojson
git commit -m "feat(gis): add scoped desa boundary layer support"
```

### Task 2: Add Pure Client State for Layer Toggles, Opacity, and Lazy Fetch Rules

**Files:**
- Create: `D:\Code\OKUS-Map-Explorer\client\src\lib\map\region-boundary-layer-state.ts`
- Create: `D:\Code\OKUS-Map-Explorer\client\src\lib\map\region-boundary-layer-style.ts`
- Modify: `D:\Code\OKUS-Map-Explorer\client\src\lib\map\region-boundary-query.ts`
- Create: `D:\Code\OKUS-Map-Explorer\tests\integration\map-boundary-layer-state.integration.ts`

**Step 1: Write the failing layer-state regression**

Create `tests/integration/map-boundary-layer-state.integration.ts` to verify:
- default layer config:
  - `kabupaten`: visible by default, subtle opacity
  - `kecamatan`: hidden by default
  - `desa`: hidden by default
- opacity values are normalized/clamped to `0..100`
- `desa` query only becomes eligible when:
  - layer desa is enabled
  - `kecamatanId !== "all"`
  - zoom threshold minimum terpenuhi
- style helper returns deterministic color per polygon name dan level

**Step 2: Run test to verify it fails**

Run:
- `npx tsx tests/integration/map-boundary-layer-state.integration.ts`

Expected:
- FAIL because helper files do not exist yet

**Step 3: Implement the minimal pure helpers**

Create `region-boundary-layer-state.ts` to hold:
- layer ids: `kabupaten|kecamatan|desa`
- default visibility/opacity
- helper `canLoadDesaLayer`
- helper `normalizeLayerOpacity`
- helper untuk derive human-readable empty state (`Pilih kecamatan untuk memuat batas desa`)

Create `region-boundary-layer-style.ts` to hold:
- deterministic palette generator for kecamatan/desa fills
- stroke/fill defaults per layer
- label display thresholds

Extend `region-boundary-query.ts` to:
- fetch `kabupaten`, `kecamatan`, atau `desa`
- support query params such as `kecamatanId`
- keep fetch logic centralized agar `map-page.tsx` tidak penuh branch kecil

**Step 4: Run test to verify it passes**

Run:
- `npx tsx tests/integration/map-boundary-layer-state.integration.ts`
- `npm run check`

Expected:
- PASS
- pure layer logic can be tested without browser

**Step 5: Commit**

```bash
git add client/src/lib/map/region-boundary-layer-state.ts client/src/lib/map/region-boundary-layer-style.ts client/src/lib/map/region-boundary-query.ts tests/integration/map-boundary-layer-state.integration.ts
git commit -m "feat(map): add boundary layer state primitives"
```

### Task 3: Redesign the Map Control Drawer into an Atlas-Style Panel

**Files:**
- Create: `D:\Code\OKUS-Map-Explorer\client\src\components\map\map-boundary-layer-controls.tsx`
- Create: `D:\Code\OKUS-Map-Explorer\client\src\components\map\map-boundary-legend-panel.tsx`
- Modify: `D:\Code\OKUS-Map-Explorer\client\src\components\map\desktop-map-filter-sheet.tsx`
- Modify: `D:\Code\OKUS-Map-Explorer\client\src\components\map\mobile-map-drawer.tsx`
- Create: `D:\Code\OKUS-Map-Explorer\tests\integration\map-boundary-panel-config.integration.ts`

**Step 1: Write the failing panel regression**

Create `tests/integration/map-boundary-panel-config.integration.ts` covering:
- panel exposes exactly three tabs: `Peta`, `Informasi`, `Cari`
- `Peta` tab model contains toggle + opacity row for `kabupaten`, `kecamatan`, `desa`
- `Informasi` tab can derive legend items from currently visible polygons
- `desa` layer shows helper/empty message when `kecamatanId === "all"`

**Step 2: Run test to verify it fails**

Run:
- `npx tsx tests/integration/map-boundary-panel-config.integration.ts`

Expected:
- FAIL because atlas panel model/components do not exist yet

**Step 3: Implement the atlas panel components**

Create `map-boundary-layer-controls.tsx`:
- list each polygon layer with:
  - toggle/switch
  - opacity slider
  - short helper copy
- preserve operational UI language; no generic GIS admin look

Create `map-boundary-legend-panel.tsx`:
- render color chips + names for visible polygon features
- show different copy for:
  - kecamatan legend active
  - desa legend active
  - no polygon layer active

Modify `desktop-map-filter-sheet.tsx` to:
- switch from one long form into `Tabs`
- tab `Peta`: polygon layers + basemap
- tab `Informasi`: legend + symbol explanation
- tab `Cari`: existing search, filter kecamatan, filter rekening

Modify `mobile-map-drawer.tsx` with the same information architecture, but mobile-first spacing.

**Step 4: Run test to verify it passes**

Run:
- `npx tsx tests/integration/map-boundary-panel-config.integration.ts`
- `npm run check`

Expected:
- PASS
- desktop/mobile control model ready for map integration

**Step 5: Commit**

```bash
git add client/src/components/map/map-boundary-layer-controls.tsx client/src/components/map/map-boundary-legend-panel.tsx client/src/components/map/desktop-map-filter-sheet.tsx client/src/components/map/mobile-map-drawer.tsx tests/integration/map-boundary-panel-config.integration.ts
git commit -m "feat(map): add atlas boundary layer control panel"
```

### Task 4: Render Kecamatan and Desa Polygons with Labels on the Public Map

**Files:**
- Create: `D:\Code\OKUS-Map-Explorer\client\src\components\map\public-boundary-layer.tsx`
- Modify: `D:\Code\OKUS-Map-Explorer\client\src\pages\map-page.tsx`
- Modify: `D:\Code\OKUS-Map-Explorer\tests\integration\map-city-first-config.integration.ts`
- Create: `D:\Code\OKUS-Map-Explorer\tests\integration\public-boundary-layer.integration.ts`

**Step 1: Write the failing render/query regression**

Create `tests/integration/public-boundary-layer.integration.ts` covering:
- `kabupaten` layer stays visible by default
- enabling `kecamatan` triggers load of active kecamatan boundary
- enabling `desa` without selected kecamatan does not issue full desa fetch
- enabling `desa` with selected kecamatan issues scoped desa fetch
- label visibility helper only enables desa labels above zoom threshold

**Step 2: Run test to verify it fails**

Run:
- `npx tsx tests/integration/public-boundary-layer.integration.ts`

Expected:
- FAIL because map page still only knows kabupaten outline

**Step 3: Implement map rendering**

Create `public-boundary-layer.tsx` to:
- render GeoJSON layer for selected boundary level
- apply styles from `region-boundary-layer-style.ts`
- optionally render permanent Leaflet tooltips/labels
- keep interaction passive (`interactive={false}`) unless a future UX needs click behavior

Modify `map-page.tsx` to:
- hold boundary layer state for:
  - `kabupaten`
  - `kecamatan`
  - `desa`
- lazily query:
  - `kabupaten` always
  - `kecamatan` when toggled
  - `desa` only when toggled + kecamatan selected + zoom threshold met
- render fill + labels for active polygon layers
- keep existing marker viewport request flow intact
- keep idle/badge/deep-link behavior intact

Update `map-city-first-config.integration.ts` only if reset/home semantics change because visible polygon layers now participate in default view.

**Step 4: Run test to verify it passes**

Run:
- `npx tsx tests/integration/public-boundary-layer.integration.ts`
- `npx tsx tests/integration/map-focus-params.integration.ts`
- `npx tsx tests/integration/public-map-region-scope.integration.ts`
- `npm run check`

Expected:
- PASS
- polygon layer filters do not regress focus/region scope behavior

**Step 5: Commit**

```bash
git add client/src/components/map/public-boundary-layer.tsx client/src/pages/map-page.tsx tests/integration/public-boundary-layer.integration.ts tests/integration/map-city-first-config.integration.ts
git commit -m "feat(map): render polygon boundary filters on public map"
```

### Task 5: Verification, Docs, and Smoke Evidence

**Files:**
- Modify: `D:\Code\OKUS-Map-Explorer\docs\api-spec.md`
- Modify: `D:\Code\OKUS-Map-Explorer\docs\changelog.md`
- Create: `D:\Code\OKUS-Map-Explorer\docs\uat\public-map-boundary-layer-smoke-2026-03-16.md`
- Create: `D:\Code\OKUS-Map-Explorer\tasks\tasks-public-map-boundary-layer-filters.md`

**Step 1: Write the rollout checklist**

Create `tasks/tasks-public-map-boundary-layer-filters.md` covering:
- desa light asset
- scoped desa endpoint
- layer state helpers
- atlas control panel
- map rendering
- verification and smoke

**Step 2: Update docs**

Document:
- boundary layer endpoints now include scoped desa access
- polygon layers are intentionally lazy and region-scoped
- public map supports atlas panel `Peta / Informasi / Cari`
- operational note that full desa payload is not loaded on initial public map load

**Step 3: Run the full verification set**

Run:
- `npm run region:build:okus`
- `npx tsx tests/integration/region-boundary-build.integration.ts`
- `npx tsx tests/integration/region-boundary-layer-api.integration.ts`
- `npx tsx tests/integration/map-boundary-layer-state.integration.ts`
- `npx tsx tests/integration/map-boundary-panel-config.integration.ts`
- `npx tsx tests/integration/public-boundary-layer.integration.ts`
- `npx tsx tests/integration/map-focus-params.integration.ts`
- `npx tsx tests/integration/public-map-region-scope.integration.ts`
- `npm run check`
- `npm run build`

Expected:
- all commands PASS

**Step 4: Perform manual smoke**

Use `docs/uat/public-map-boundary-layer-smoke-2026-03-16.md` to record:
- tab `Peta / Informasi / Cari` muncul di desktop
- toggle `kecamatan` mewarnai polygon dan menampilkan label
- slider opacity benar-benar mengubah opacity layer aktif
- toggle `desa` tanpa memilih kecamatan menampilkan helper/empty state yang jujur
- toggle `desa` setelah memilih kecamatan memuat polygon scoped desa/kelurahan
- tab `Informasi` menampilkan legend warna polygon yang sedang aktif
- marker/deep-link existing tetap berfungsi

**Step 5: Commit**

```bash
git add docs/api-spec.md docs/changelog.md docs/uat/public-map-boundary-layer-smoke-2026-03-16.md tasks/tasks-public-map-boundary-layer-filters.md
git commit -m "docs(map): record polygon boundary layer rollout"
```

## Acceptance Criteria

1. Public map menyediakan layer control polygon `kabupaten`, `kecamatan`, dan `desa/kelurahan`.
2. UI layer control mengikuti pola atlas panel `Peta / Informasi / Cari`, bukan hanya menambah checkbox mentah di drawer lama.
3. Layer `kecamatan` bisa di-toggle dan opacity-nya bisa diatur.
4. Layer `desa/kelurahan` tidak diunduh penuh saat initial load; fetch tetap lazy dan scoped.
5. Tab `Informasi` menampilkan legend yang sesuai dengan polygon yang sedang visible.
6. Label polygon kecamatan tampil jelas; label desa hanya tampil pada scope/zoom yang pantas.
7. Existing marker viewport query, search, dan deep-link tidak regress.
8. API contract, changelog, task checklist, dan smoke evidence tercatat di repo.

## Rollout Notes

- Jika plan ini dieksekusi dari root branch yang belum memiliki batch spatial guard, merge/rebase batch spatial guard dulu atau kerjakan langsung di worktree `oku-selatan-spatial-guard`.
- Jika performa desa layer terasa berat pada real browser, fallback pertama bukan menghapus fiturnya, tetapi memperketat scope:
  - wajib pilih kecamatan
  - naikkan minimum zoom
  - kurangi label desa pada zoom menengah
- Batch ini sebaiknya tetap public-map first. Jangan campur dulu ke backoffice picker karena kebutuhan UX-nya berbeda.
