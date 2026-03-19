# Public Map UX Polish Batch Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Memoles public map OKU Selatan agar navigasi `kabupaten -> kecamatan -> desa -> OP` jauh lebih cepat, lebih shareable, dan lebih nyaman dipakai di desktop maupun mobile.

**Architecture:** Pertahankan state machine drill-down yang sudah ada sebagai source of truth utama, lalu tambahkan lapisan UX baru di atasnya: quick-jump wilayah, URL state yang bisa dibagikan, daftar/detail OP yang sinkron dengan stage aktif, dan beberapa polish performa/interaksi. Fitur baru harus tetap memakai boundary aktif OKU Selatan dan endpoint marker/boundary yang sudah ada, tanpa menambah payload nasional atau mengembalikan layout ke panel atlas besar.

**Tech Stack:** TypeScript, React 18, React Query, React Leaflet, Framer Motion, Wouter, localStorage, `tsx` integration tests, Playwright smoke lokal.

---

## Current Source Facts

- `D:\Code\OKUS-Map-Explorer\client\src\pages\map-page.tsx` sudah menjadi composition root public map dengan stage drill-down `kabupaten -> kecamatan -> desa`.
- `D:\Code\OKUS-Map-Explorer\client\src\lib\map\public-map-stage-model.ts` sudah memegang state stage, header model, gating marker, tax filter, dan viewport plan.
- `selectedDesa` saat ini baru menyimpan `name`, `bounds`, dan `feature`; belum ada route-state helper yang stabil untuk shareable URL.
- `D:\Code\OKUS-Map-Explorer\client\src\components\map\public-map-stage-header.tsx` dan `D:\Code\OKUS-Map-Explorer\client\src\components\map\public-map-tax-filter-chips.tsx` sudah di-compact untuk mobile.
- Map publik saat ini masih mengandalkan popup marker Leaflet sebagai surface detail utama, baik desktop maupun mobile.
- Belum ada quick-jump wilayah lintas `kecamatan/desa`, belum ada OP list rail di desktop, dan belum ada bottom sheet detail/list khusus mobile.
- Evidence smoke lokal terakhir ada di `D:\Code\OKUS-Map-Explorer\docs\uat\public-map-stage-drilldown-local-smoke-2026-03-18.md`.

## UX Direction

- Tetap `map-first`; jangan kembali ke shell panel berat yang memakan area peta.
- Desktop:
  - header stage tetap di kiri atas
  - quick-jump hadir sebagai control ringan, bukan sidebar permanen
  - saat stage `desa`, OP explorer pindah ke rail tipis di kanan
- Mobile:
  - header tetap ringkas title-only
  - quick-jump dibuka sebagai sheet/dialog ringan
  - OP explorer utama memakai bottom sheet, bukan popup kecil
- Navigasi harus:
  - bisa dibagikan via URL
  - bisa dipulihkan saat refresh
  - tetap reversible lewat tombol kembali stage
- Jangan load semua `desa/kelurahan` atau semua marker tanpa intent user yang jelas.

## Non-Goals

- Tidak menambah asset GIS nasional baru atau layer nasional lain.
- Tidak mengubah kontrak spatial guard OKU Selatan.
- Tidak mengerjakan Mapbox Satellite pada batch ini.
- Tidak menambah clustering marker kecuali smoke nanti membuktikan desa tertentu sudah terlalu padat.
- Tidak mendesain ulang total visual identity map; batch ini fokus pada workflow dan usability.

## Future Backlog After This Batch

- Hover/tap preview dua langkah sebelum masuk polygon.
- Cluster marker untuk desa sangat padat.
- Per-bandingan basemap lebih lanjut atau provider baru.

### Task 1: Lock Shareable Route State for Stage, Region, and Tax Filter

**Files:**
- Create: `D:\Code\OKUS-Map-Explorer\client\src\lib\map\public-map-route-state.ts`
- Modify: `D:\Code\OKUS-Map-Explorer\client\src\lib\map\public-map-stage-model.ts`
- Modify: `D:\Code\OKUS-Map-Explorer\client\src\pages\map-page.tsx`
- Create: `D:\Code\OKUS-Map-Explorer\tests\integration\public-map-route-state.integration.ts`
- Modify: `D:\Code\OKUS-Map-Explorer\tests\integration\public-map-stage-model.integration.ts`

**Step 1: Write the failing route-state regression**

Create `tests/integration/public-map-route-state.integration.ts` covering:
- root state serializes to URL tanpa param region tambahan
- stage `kecamatan` serializes to:

```ts
{
  stage: "kecamatan",
  kecamatanId: "1609040",
}
```

and becomes query params like:

```txt
?stage=kecamatan&kecamatanId=1609040
```

- stage `desa` serializes to:

```ts
{
  stage: "desa",
  kecamatanId: "1609040",
  desaKey: "1609040:batu-belang-jaya",
  taxType: "Pajak Sarang Burung Walet",
}
```

- invalid query params fall back safely to root state
- route helper never breaks existing deep-link `focusLat/focusLng/focusOpId`

**Step 2: Run test to verify it fails**

Run:
- `npx tsx tests/integration/public-map-route-state.integration.ts`

Expected:
- FAIL because route-state helper does not exist yet

**Step 3: Write minimal implementation**

Create `client/src/lib/map/public-map-route-state.ts` with helpers:

```ts
export type PublicMapRouteState = {
  stage: "kabupaten" | "kecamatan" | "desa";
  kecamatanId: string | null;
  desaKey: string | null;
  taxType: string | null;
};

export function createPublicMapDesaKey(params: { kecamatanId: string; desaName: string }) {
  return `${params.kecamatanId}:${params.desaName.trim().toLowerCase().replace(/\s+/g, "-")}`;
}

export function serializePublicMapRouteState(state: PublicMapRouteState): string {
  // root -> ""
  // kecamatan/desa -> URLSearchParams
}

export function parsePublicMapRouteState(search: string): PublicMapRouteState {
  // invalid values => kabupaten root
}
```

Update `public-map-stage-model.ts` so `selectedDesa` includes:

```ts
type SelectedDesa = {
  key: string;
  name: string;
  bounds: RegionBoundaryBounds;
  feature: BoundaryFeatureSelection["feature"];
};
```

Update `map-page.tsx` so stage change can:
- push/replace route state when user drill-down
- restore stage from URL on first load when params valid
- clear stage route state when user returns to root

**Step 4: Run tests to verify they pass**

Run:
- `npx tsx tests/integration/public-map-route-state.integration.ts`
- `npx tsx tests/integration/public-map-stage-model.integration.ts`

Expected:
- PASS
- stage and tax filter state can round-trip through URL

**Step 5: Commit**

```bash
git add client/src/lib/map/public-map-route-state.ts client/src/lib/map/public-map-stage-model.ts client/src/pages/map-page.tsx tests/integration/public-map-route-state.integration.ts tests/integration/public-map-stage-model.integration.ts
git commit -m "feat(map): add shareable public map route state"
```

### Task 2: Add a Quick-Jump Region Search for Kecamatan and Desa

**Files:**
- Create: `D:\Code\OKUS-Map-Explorer\client\src\components\map\public-map-region-jump.tsx`
- Create: `D:\Code\OKUS-Map-Explorer\client\src\lib\map\public-map-region-search.ts`
- Modify: `D:\Code\OKUS-Map-Explorer\client\src\pages\map-page.tsx`
- Create: `D:\Code\OKUS-Map-Explorer\tests\integration\public-map-region-search.integration.ts`

**Step 1: Write the failing search-model regression**

Create `tests/integration/public-map-region-search.integration.ts` covering:
- search results can merge:
  - `kecamatan`
  - `desa/kelurahan`
- result groups are stable:

```ts
[
  { group: "Kecamatan", items: [...] },
  { group: "Desa / Kelurahan", items: [...] },
]
```

- selecting a `kecamatan` target returns a navigation action:

```ts
{
  type: "kecamatan",
  kecamatanId: "1609040",
  label: "Muara Dua",
}
```

- selecting a `desa` target returns:

```ts
{
  type: "desa",
  kecamatanId: "1609040",
  desaKey: "1609040:batu-belang-jaya",
  label: "Batu Belang Jaya",
}
```

- empty query returns no result groups

**Step 2: Run test to verify it fails**

Run:
- `npx tsx tests/integration/public-map-region-search.integration.ts`

Expected:
- FAIL because search model does not exist yet

**Step 3: Write minimal implementation**

Create `public-map-region-search.ts` with helpers:

```ts
export type PublicMapRegionJumpItem =
  | { type: "kecamatan"; kecamatanId: string; label: string }
  | { type: "desa"; kecamatanId: string; desaKey: string; label: string; parentLabel: string };

export function buildPublicMapRegionJumpGroups(params: {
  query: string;
  kecamatan: Array<{ id: string; nama: string }>;
  desa: Array<{ kecamatanId: string; nama: string }>;
}): Array<{ group: string; items: PublicMapRegionJumpItem[] }> {
  // trim query
  // match case-insensitively
  // cap results per group
}
```

Create `public-map-region-jump.tsx`:
- desktop: command-palette-like popover anchored near header/action row
- mobile: full-width sheet/dialog with search input and grouped results
- show recent helper copy:
  - `Cari kecamatan atau desa`
  - `Masuk langsung ke wilayah tujuan`

Update `map-page.tsx` to:
- lazily load master `kecamatan`
- lazily load master `kelurahan/desa` only when search UI opens or query length `>= 2`
- on selection:
  - enter stage `kecamatan` or `desa`
  - reuse existing viewport stage logic
  - sync URL state from Task 1

**Step 4: Run tests to verify they pass**

Run:
- `npx tsx tests/integration/public-map-region-search.integration.ts`
- `npm run check`

Expected:
- PASS
- quick-jump search can drive region navigation without polygon click

**Step 5: Commit**

```bash
git add client/src/components/map/public-map-region-jump.tsx client/src/lib/map/public-map-region-search.ts client/src/pages/map-page.tsx tests/integration/public-map-region-search.integration.ts
git commit -m "feat(map): add public map region quick jump"
```

### Task 3: Add a Desktop OP Explorer Rail for Desa Stage

**Files:**
- Create: `D:\Code\OKUS-Map-Explorer\client\src\components\map\public-map-op-rail.tsx`
- Create: `D:\Code\OKUS-Map-Explorer\client\src\lib\map\public-map-op-list-model.ts`
- Modify: `D:\Code\OKUS-Map-Explorer\client\src\pages\map-page.tsx`
- Create: `D:\Code\OKUS-Map-Explorer\tests\integration\public-map-op-list-model.integration.ts`

**Step 1: Write the failing OP list regression**

Create `tests/integration/public-map-op-list-model.integration.ts` covering:
- rail only becomes visible when:
  - viewport is desktop
  - stage is `desa`
- list items are sorted deterministically by:
  - `jenisPajak`
  - `namaOp`
- selected tax chip filters the rail list the same way it filters markers
- row model contains:

```ts
{
  id: 1,
  title: "Walet Budi",
  subtitle: "Pajak Sarang Burung Walet",
  meta: "NOPD 13.01.01.0008",
}
```

- empty rail state uses honest copy when no OP matches filter

**Step 2: Run test to verify it fails**

Run:
- `npx tsx tests/integration/public-map-op-list-model.integration.ts`

Expected:
- FAIL because desktop rail model does not exist yet

**Step 3: Write minimal implementation**

Create `public-map-op-list-model.ts` with helpers:

```ts
export function createPublicMapOpRailModel(params: {
  stage: "kabupaten" | "kecamatan" | "desa";
  markers: MapViewportMarker[];
  selectedTaxType: string;
  compactViewport: boolean;
}) {
  // visible only on desktop desa stage
  // sorted rows
  // count badge
  // empty state copy
}
```

Create `public-map-op-rail.tsx`:
- slim floating rail on desktop right side
- includes:
  - title `Objek Pajak di Desa Ini`
  - count badge
  - searchable-free list (keep v1 simple)
  - selected-row state

Update `map-page.tsx` so clicking a row:
- pans/focuses marker
- opens marker popup
- keeps current stage and tax filter unchanged

**Step 4: Run tests to verify they pass**

Run:
- `npx tsx tests/integration/public-map-op-list-model.integration.ts`
- `npm run check`

Expected:
- PASS
- desktop desa stage gets a synchronized OP explorer rail

**Step 5: Commit**

```bash
git add client/src/components/map/public-map-op-rail.tsx client/src/lib/map/public-map-op-list-model.ts client/src/pages/map-page.tsx tests/integration/public-map-op-list-model.integration.ts
git commit -m "feat(map): add desktop desa op explorer rail"
```

### Task 4: Replace Mobile Popup-First Flow with a Bottom Sheet OP Explorer

**Files:**
- Create: `D:\Code\OKUS-Map-Explorer\client\src\components\map\public-map-op-bottom-sheet.tsx`
- Create: `D:\Code\OKUS-Map-Explorer\client\src\lib\map\public-map-mobile-op-sheet-model.ts`
- Modify: `D:\Code\OKUS-Map-Explorer\client\src\pages\map-page.tsx`
- Modify: `D:\Code\OKUS-Map-Explorer\tests\integration\public-map-mobile-shell.integration.ts`
- Create: `D:\Code\OKUS-Map-Explorer\tests\integration\public-map-mobile-op-sheet.integration.ts`

**Step 1: Write the failing mobile-sheet regression**

Create `tests/integration/public-map-mobile-op-sheet.integration.ts` covering:
- sheet only becomes active when:
  - viewport is mobile
  - stage is `desa`
- collapsed state shows:
  - OP count
  - desa name
  - active filter summary
- tapping marker creates detail model:

```ts
{
  mode: "detail",
  title: "Walet Budi",
  subtitle: "Pajak Sarang Burung Walet",
  amountLabel: "Rp 400.000 / bulan",
}
```

- back from detail returns to list, not out of stage desa

**Step 2: Run test to verify it fails**

Run:
- `npx tsx tests/integration/public-map-mobile-op-sheet.integration.ts`

Expected:
- FAIL because bottom sheet model does not exist yet

**Step 3: Write minimal implementation**

Create `public-map-mobile-op-sheet-model.ts` with:

```ts
export type PublicMapMobileOpSheetState =
  | { mode: "hidden" }
  | { mode: "list" }
  | { mode: "detail"; markerId: number };
```

Create `public-map-op-bottom-sheet.tsx`:
- collapsed grab handle
- list mode for visible OP rows
- detail mode for selected marker
- no desktop render path

Update `map-page.tsx`:
- on mobile desa stage:
  - marker tap opens bottom-sheet detail
  - popup can remain as technical fallback, but mobile primary surface becomes sheet
- on desktop:
  - existing popup behavior stays intact

**Step 4: Run tests to verify they pass**

Run:
- `npx tsx tests/integration/public-map-mobile-op-sheet.integration.ts`
- `npx tsx tests/integration/public-map-mobile-shell.integration.ts`

Expected:
- PASS
- mobile OP exploration no longer depends on tiny popup as primary UI

**Step 5: Commit**

```bash
git add client/src/components/map/public-map-op-bottom-sheet.tsx client/src/lib/map/public-map-mobile-op-sheet-model.ts client/src/pages/map-page.tsx tests/integration/public-map-mobile-op-sheet.integration.ts tests/integration/public-map-mobile-shell.integration.ts
git commit -m "feat(map): add mobile desa op bottom sheet"
```

### Task 5: Add Perceived-Performance and Context Polish

**Files:**
- Create: `D:\Code\OKUS-Map-Explorer\client\src\lib\map\public-map-preferences.ts`
- Modify: `D:\Code\OKUS-Map-Explorer\client\src\lib\map\public-map-stage-model.ts`
- Modify: `D:\Code\OKUS-Map-Explorer\client\src\pages\map-page.tsx`
- Modify: `D:\Code\OKUS-Map-Explorer\client\src\components\map\public-map-stage-header.tsx`
- Modify: `D:\Code\OKUS-Map-Explorer\client\src\components\map\public-map-op-rail.tsx`
- Create: `D:\Code\OKUS-Map-Explorer\tests\integration\public-map-preferences.integration.ts`

**Step 1: Write the failing polish regression**

Create `tests/integration/public-map-preferences.integration.ts` covering:
- basemap preference round-trips via localStorage
- status model returns contextual labels like:

```ts
{
  primary: "19 desa",
  secondary: "1 OP aktif",
  filter: "WLT",
}
```

- helper can decide when to prefetch scoped desa boundary:
  - after entering `kecamatan`
  - after selecting jump target in same `kecamatan`

**Step 2: Run test to verify it fails**

Run:
- `npx tsx tests/integration/public-map-preferences.integration.ts`

Expected:
- FAIL because preference/polish helpers do not exist yet

**Step 3: Write minimal implementation**

Create `public-map-preferences.ts`:

```ts
const PUBLIC_MAP_BASEMAP_STORAGE_KEY = "okus-public-map-basemap";

export function loadPublicMapBaseMapPreference(): BaseMapKey | null {
  // safe localStorage read
}

export function savePublicMapBaseMapPreference(value: BaseMapKey) {
  // safe localStorage write
}
```

Extend `public-map-stage-model.ts` with:
- contextual status helper for:
  - active desa count
  - active OP count
  - active tax filter short label
- helper `shouldPrefetchScopedDesaBoundary(...)`

Update `map-page.tsx` and `public-map-stage-header.tsx`:
- persist basemap selection
- show tiny contextual status chips without bloating mobile header
- prefetch next scoped desa boundary via React Query when user enters a kecamatan or chooses a jump target

**Step 4: Run tests to verify they pass**

Run:
- `npx tsx tests/integration/public-map-preferences.integration.ts`
- `npm run check`

Expected:
- PASS
- basemap memory and contextual status no longer depend on ad-hoc state

**Step 5: Commit**

```bash
git add client/src/lib/map/public-map-preferences.ts client/src/lib/map/public-map-stage-model.ts client/src/pages/map-page.tsx client/src/components/map/public-map-stage-header.tsx client/src/components/map/public-map-op-rail.tsx tests/integration/public-map-preferences.integration.ts
git commit -m "feat(map): add public map ux polish helpers"
```

### Task 6: Update Docs and Record End-to-End Smoke Evidence

**Files:**
- Modify: `D:\Code\OKUS-Map-Explorer\docs\uat\public-map-stage-drilldown-local-smoke-2026-03-18.md`
- Modify: `D:\Code\OKUS-Map-Explorer\docs\changelog.md`
- Modify: `D:\Code\OKUS-Map-Explorer\tasks\tasks-map-wfs-refactor.md`
- Artifact: `D:\Code\OKUS-Map-Explorer\output\playwright\`

**Step 1: Write the smoke acceptance checklist in docs first**

Before running browser automation, extend the smoke doc with required pass conditions:
- desktop:
  - quick-jump can open a target `kecamatan`
  - quick-jump can open a target `desa`
  - OP rail appears only on stage desa
  - clicking OP row opens the correct marker popup
- mobile:
  - quick-jump opens as sheet/dialog
  - stage desa opens bottom-sheet explorer
  - tapping marker updates detail sheet
- URL:
  - reload keeps stage, desa, and tax filter
- preferences:
  - basemap choice survives refresh

**Step 2: Run smoke to verify gaps before finalizing**

Run Playwright/local browser smoke on:
- desktop flow `OKU Selatan -> quick-jump Muara Dua -> quick-jump Batu Belang Jaya -> OP rail -> marker popup`
- mobile flow `OKU Selatan -> quick-jump Muara Dua -> Batu Belang Jaya -> bottom sheet detail`
- reload while staying on desa + tax filter

Expected before fixes:
- some flows may still be missing or not yet wired

**Step 3: Write minimal implementation fixes only if smoke exposes gaps**

Allowed fixes in this task:
- selector stability
- focus timing
- sheet stacking/z-index
- route restore edge cases
- prefetch race conditions

Avoid:
- redesigning shell again
- adding new data contracts unless smoke proves a hard blocker

**Step 4: Run smoke and verification to confirm PASS**

Run:
- `npx tsx tests/integration/public-map-route-state.integration.ts`
- `npx tsx tests/integration/public-map-region-search.integration.ts`
- `npx tsx tests/integration/public-map-op-list-model.integration.ts`
- `npx tsx tests/integration/public-map-mobile-op-sheet.integration.ts`
- `npx tsx tests/integration/public-map-mobile-shell.integration.ts`
- `npm run check`
- `npm run build`
- Playwright smoke desktop/mobile

Expected:
- PASS
- smoke doc updated with screenshots and explicit PASS/FAIL notes

**Step 5: Commit**

```bash
git add docs/uat/public-map-stage-drilldown-local-smoke-2026-03-18.md docs/changelog.md tasks/tasks-map-wfs-refactor.md output/playwright
git commit -m "docs(map): record public map ux polish smoke"
```

### Task 7: Final Verification Batch

**Files:**
- Verify only

**Step 1: Run focused integration coverage**

Run:

```bash
npx tsx tests/integration/public-map-route-state.integration.ts
npx tsx tests/integration/public-map-region-search.integration.ts
npx tsx tests/integration/public-map-op-list-model.integration.ts
npx tsx tests/integration/public-map-mobile-op-sheet.integration.ts
npx tsx tests/integration/public-map-mobile-shell.integration.ts
npx tsx tests/integration/public-map-stage-model.integration.ts
```

Expected:
- PASS

**Step 2: Run project verification**

Run:

```bash
npm run check
npm run build
```

Expected:
- PASS

**Step 3: Manual smoke spot-check**

Confirm manually:
- desktop quick-jump
- desktop OP rail
- mobile bottom sheet
- URL restore after refresh
- basemap memory after refresh

Expected:
- PASS

**Step 4: Confirm worktree state**

Run:

```bash
git status --short
```

Expected:
- only intentional tracked changes remain

**Step 5: Final commit**

```bash
git add .
git commit -m "feat(map): polish public map exploration flow"
```
