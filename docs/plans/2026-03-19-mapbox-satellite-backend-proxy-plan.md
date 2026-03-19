# Mapbox Satellite Backend Proxy Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Menambahkan 1 basemap baru `Mapbox Satellite` ke public map dengan token disimpan di backend dan tile diambil lewat proxy server lokal.

**Architecture:** Frontend tetap memakai `react-leaflet` dan `TileLayer`, tetapi URL tile baru tidak menunjuk langsung ke `api.mapbox.com`. Sebagai gantinya, frontend memanggil route lokal Express seperti `/api/basemaps/mapbox-satellite/:z/:x/:y`, lalu server meneruskan request ke Mapbox Raster Tiles API memakai token dari env backend, sambil meneruskan header cache yang aman. Pendekatan ini menjaga token keluar dari browser, mempertahankan model basemap yang sudah ada, dan membuka ruang untuk throttling/cache di sisi server.

**Tech Stack:** React, TypeScript, React Leaflet, Express, Node `fetch`, environment config `.env.local`, Playwright smoke, integration tests `tsx`.

---

### Task 1: Lock token strategy and document env contract

**Files:**
- Create: `D:\Code\OKUS-Map-Explorer\docs\plans\2026-03-19-mapbox-satellite-backend-proxy-plan.md`
- Modify: `D:\Code\OKUS-Map-Explorer\server\env.ts`
- Modify: `D:\Code\OKUS-Map-Explorer\docs\changelog.md`

**Step 1: Write the failing test**

Add a new integration test file `D:\Code\OKUS-Map-Explorer\tests\integration\mapbox-satellite-proxy.integration.ts` that asserts:
- `env` exposes `MAPBOX_SATELLITE_TOKEN` as an optional string
- `env` exposes `MAPBOX_SATELLITE_ENABLED` as a boolean-like toggle or normalized flag helper
- missing token disables Mapbox basemap rather than crashing boot

**Step 2: Run test to verify it fails**

Run: `npx tsx tests/integration/mapbox-satellite-proxy.integration.ts`
Expected: FAIL because env fields/helper do not exist yet.

**Step 3: Write minimal implementation**

In `server/env.ts`:
- add optional parser for `MAPBOX_SATELLITE_TOKEN`
- add optional parser for `MAPBOX_SATELLITE_ENABLED`
- default to disabled when token is missing

Implementation target:

```ts
function parseOptionalBoolean(rawValue: string | undefined, fallback: boolean): boolean {
  if (!rawValue || rawValue.trim().length === 0) return fallback;
  const normalized = rawValue.trim().toLowerCase();
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  throw new Error(`Invalid boolean env value: ${rawValue}`);
}
```

```ts
MAPBOX_SATELLITE_TOKEN: parseOptionalNonEmptyString(process.env.MAPBOX_SATELLITE_TOKEN, ""),
MAPBOX_SATELLITE_ENABLED: parseOptionalBoolean(process.env.MAPBOX_SATELLITE_ENABLED, false),
```

**Step 4: Run test to verify it passes**

Run: `npx tsx tests/integration/mapbox-satellite-proxy.integration.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add server/env.ts tests/integration/mapbox-satellite-proxy.integration.ts docs/changelog.md
git commit -m "test(env): lock mapbox satellite proxy config"
```

### Task 2: Add pure backend helpers for Mapbox raster tile proxy

**Files:**
- Create: `D:\Code\OKUS-Map-Explorer\server\mapbox-satellite-proxy.ts`
- Test: `D:\Code\OKUS-Map-Explorer\tests\integration\mapbox-satellite-proxy.integration.ts`

**Step 1: Write the failing test**

Extend `tests/integration/mapbox-satellite-proxy.integration.ts` to cover:
- tile URL builder produces `https://api.mapbox.com/v4/mapbox.satellite/{z}/{x}/{y}@2x.jpg90?access_token=...`
- invalid tile params are rejected:
  - negative `z/x/y`
  - zoom > configured ceiling
  - non-integer values
- response header filter preserves safe cache/content headers and strips dangerous hop-by-hop headers

**Step 2: Run test to verify it fails**

Run: `npx tsx tests/integration/mapbox-satellite-proxy.integration.ts`
Expected: FAIL because helper module does not exist yet.

**Step 3: Write minimal implementation**

Implement in `server/mapbox-satellite-proxy.ts`:
- `MAPBOX_SATELLITE_TILESET_ID = "mapbox.satellite"`
- `MAPBOX_SATELLITE_MAX_ZOOM = 16`
- `parseMapboxTileParams(params)`
- `buildMapboxSatelliteTileUrl({ z, x, y, token, retina })`
- `pickMapboxTileResponseHeaders(headers)`

Implementation target:

```ts
export function buildMapboxSatelliteTileUrl(params: {
  z: number;
  x: number;
  y: number;
  token: string;
  retina?: boolean;
}) {
  const scaleSuffix = params.retina ? "@2x" : "";
  return `https://api.mapbox.com/v4/mapbox.satellite/${params.z}/${params.x}/${params.y}${scaleSuffix}.jpg90?access_token=${params.token}`;
}
```

**Step 4: Run test to verify it passes**

Run: `npx tsx tests/integration/mapbox-satellite-proxy.integration.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add server/mapbox-satellite-proxy.ts tests/integration/mapbox-satellite-proxy.integration.ts
git commit -m "feat(server): add mapbox satellite proxy helpers"
```

### Task 3: Expose backend tile proxy route with safe validation and cache behavior

**Files:**
- Modify: `D:\Code\OKUS-Map-Explorer\server\routes.ts`
- Modify: `D:\Code\OKUS-Map-Explorer\server\mapbox-satellite-proxy.ts`
- Test: `D:\Code\OKUS-Map-Explorer\tests\integration\mapbox-satellite-proxy.integration.ts`

**Step 1: Write the failing test**

Extend integration test to verify route behavior:
- `GET /api/basemaps/mapbox-satellite/16/33599/51714`
  - returns `502` or `503` with honest message when feature disabled or token missing
- `GET /api/basemaps/mapbox-satellite/16/33599/51714`
  - proxies binary tile body when enabled with fake fetch
  - forwards `content-type`, `cache-control`, `etag`, `last-modified` when present
- invalid params return `400`

Use a minimal Express app harness in the test, mirroring existing server route style.

**Step 2: Run test to verify it fails**

Run: `npx tsx tests/integration/mapbox-satellite-proxy.integration.ts`
Expected: FAIL because route does not exist yet.

**Step 3: Write minimal implementation**

In `server/routes.ts` add route:

```ts
app.get("/api/basemaps/mapbox-satellite/:z/:x/:y", async (req, res) => {
  // validate params
  // reject if env disabled or token missing
  // fetch Mapbox tile
  // stream response body
  // set safe cache/content headers
});
```

Implementation notes:
- support optional `retina=1` query param if desired, but keep v1 simple if not needed
- return `503` when feature disabled
- return `502` when upstream fails unexpectedly
- do not cache tile bytes in app memory yet unless needed; first rely on upstream cache headers

**Step 4: Run test to verify it passes**

Run: `npx tsx tests/integration/mapbox-satellite-proxy.integration.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add server/routes.ts server/mapbox-satellite-proxy.ts tests/integration/mapbox-satellite-proxy.integration.ts
git commit -m "feat(server): proxy mapbox satellite tiles"
```

### Task 4: Add frontend basemap entry and graceful fallback

**Files:**
- Modify: `D:\Code\OKUS-Map-Explorer\client\src\lib\map\map-basemap-config.ts`
- Modify: `D:\Code\OKUS-Map-Explorer\client\src\pages\map-page.tsx`
- Test: `D:\Code\OKUS-Map-Explorer\tests\integration\map-city-first-config.integration.ts`

**Step 1: Write the failing test**

Extend `map-city-first-config.integration.ts` to assert:
- `PUBLIC_BASE_MAPS.mapboxSatellite` exists
- `name` is stable, e.g. `Mapbox Satellite`
- `url` points to `/api/basemaps/mapbox-satellite/{z}/{x}/{y}`
- `maxZoom` starts at `16`

**Step 2: Run test to verify it fails**

Run: `npx tsx tests/integration/map-city-first-config.integration.ts`
Expected: FAIL because basemap entry does not exist.

**Step 3: Write minimal implementation**

In `map-basemap-config.ts` add:

```ts
mapboxSatellite: {
  name: "Mapbox Satellite",
  buttonLabel: "MBX Sat",
  url: "/api/basemaps/mapbox-satellite/{z}/{x}/{y}",
  attribution: "&copy; Mapbox",
  maxZoom: 16,
},
```

In `map-page.tsx`:
- no structural rewrite needed because basemap cycling already uses `PUBLIC_BASE_MAPS`
- confirm `TileLayer` and `MapBaseMapZoomController` consume new config without special casing

**Step 4: Run test to verify it passes**

Run: `npx tsx tests/integration/map-city-first-config.integration.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add client/src/lib/map/map-basemap-config.ts client/src/pages/map-page.tsx tests/integration/map-city-first-config.integration.ts
git commit -m "feat(map): add mapbox satellite basemap option"
```

### Task 5: Harden UI behavior for unavailable Mapbox proxy

**Files:**
- Modify: `D:\Code\OKUS-Map-Explorer\client\src\pages\map-page.tsx`
- Test: `D:\Code\OKUS-Map-Explorer\tests\integration\public-map-stage-model.integration.ts`
- Test: `D:\Code\OKUS-Map-Explorer\tests\integration\map-city-first-config.integration.ts`

**Step 1: Write the failing test**

Add a focused test for degraded behavior:
- if Mapbox proxy tile route returns 4xx/5xx, map UI must not crash
- current basemap button label still renders
- stage drill-down controls remain functional

If current integration harness cannot observe tile load failures directly, add a pure helper for basemap availability label or fallback message and test that instead.

**Step 2: Run test to verify it fails**

Run: `npx tsx tests/integration/map-city-first-config.integration.ts`
Expected: FAIL because helper/fallback does not exist.

**Step 3: Write minimal implementation**

Keep this YAGNI:
- prefer no automatic basemap fallback for v1
- optionally add a compact non-blocking toast/banner only if tile errors can be detected cleanly
- do not add heavy retry logic yet

**Step 4: Run test to verify it passes**

Run: `npx tsx tests/integration/map-city-first-config.integration.ts`
Expected: PASS

**Step 5: Commit**

```bash
git add client/src/pages/map-page.tsx tests/integration/map-city-first-config.integration.ts tests/integration/public-map-stage-model.integration.ts
git commit -m "test(map): harden mapbox basemap failure handling"
```

### Task 6: Smoke test Mapbox tile proxy locally

**Files:**
- Modify: `D:\Code\OKUS-Map-Explorer\docs\uat\public-map-stage-drilldown-local-smoke-2026-03-18.md`
- Modify: `D:\Code\OKUS-Map-Explorer\docs\changelog.md`
- Modify: `D:\Code\OKUS-Map-Explorer\tasks\tasks-map-wfs-refactor.md`
- Artifact: `D:\Code\OKUS-Map-Explorer\output\playwright\`

**Step 1: Write the failing test**

No new automated test first here. Instead, define the smoke acceptance checklist in the doc before running browser automation:
- basemap cycle reaches `Mapbox Satellite`
- selected desa tetap transparan
- stage desa tetap menunjukkan marker OP
- tile requests berasal dari `/api/basemaps/mapbox-satellite/...`
- tile content tampil, bukan blank/error overlay

**Step 2: Run smoke to verify current state fails or is missing**

Run Playwright smoke after implementation:
- open local app
- switch to `Mapbox Satellite`
- drill `Muara Dua -> Batu Belang Jaya`
- capture screenshot and network evidence

Expected before feature complete: no Mapbox basemap option or tile route unavailable.

**Step 3: Write minimal implementation**

Only if smoke reveals gaps:
- adjust `maxZoom`
- adjust attribution
- fix route path formatting
- fix cache/content-type forwarding

**Step 4: Run smoke to verify it passes**

Run:
- `npx tsx tests/integration/mapbox-satellite-proxy.integration.ts`
- `npx tsx tests/integration/map-city-first-config.integration.ts`
- `npm run check`
- `npm run build`
- Playwright local smoke

Expected:
- PASS

**Step 5: Commit**

```bash
git add docs/uat/public-map-stage-drilldown-local-smoke-2026-03-18.md docs/changelog.md tasks/tasks-map-wfs-refactor.md output/playwright
git commit -m "docs(map): record mapbox satellite proxy smoke"
```

### Task 7: Final verification batch

**Files:**
- Verify only

**Step 1: Run focused backend/frontend integration**

Run:

```bash
npx tsx tests/integration/mapbox-satellite-proxy.integration.ts
npx tsx tests/integration/map-city-first-config.integration.ts
npx tsx tests/integration/public-map-stage-model.integration.ts
npx tsx tests/integration/public-boundary-layer.integration.ts
```

Expected: PASS

**Step 2: Run project verification**

Run:

```bash
npm run check
npm run build
```

Expected: PASS

**Step 3: Inspect worktree**

Run:

```bash
git status --short
```

Expected:
- only intended tracked files changed
- unrelated untracked docs/data remain untouched

**Step 4: Commit**

```bash
git add .
git commit -m "feat(map): add mapbox satellite backend proxy basemap"
```

**Step 5: Handoff note**

Document in final report:
- which token class was used
- whether URL restrictions were used or intentionally skipped
- effective `maxZoom`
- whether local smoke showed acceptable imagery coverage for OKU Selatan
