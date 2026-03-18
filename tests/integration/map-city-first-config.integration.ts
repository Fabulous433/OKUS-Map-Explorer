import assert from "node:assert/strict";

async function loadRegionConfigModule() {
  try {
    return await import("../../client/src/lib/region-config.ts");
  } catch {
    return null;
  }
}

async function loadBaseMapConfigModule() {
  try {
    return await import("../../client/src/lib/map/map-basemap-config.ts");
  } catch {
    return null;
  }
}

async function run() {
  const regionConfigModule = await loadRegionConfigModule();
  assert.ok(regionConfigModule, "helper config region map harus tersedia");

  const baseMapConfigModule = await loadBaseMapConfigModule();
  assert.ok(baseMapConfigModule, "config basemap publik harus tersedia");

  const { createRegionConfig } = regionConfigModule;
  const { PUBLIC_BASE_MAPS } = baseMapConfigModule;

  assert.equal(typeof createRegionConfig, "function", "factory region config wajib diexport");
  assert.equal(typeof PUBLIC_BASE_MAPS, "object", "konfigurasi basemap publik wajib diexport");

  const defaultRegionConfig = createRegionConfig({});
  assert.deepEqual(
    defaultRegionConfig.map.center,
    [-4.525, 104.027],
    "center default harus tetap di sekitar pusat Muaradua",
  );
  assert.equal(
    defaultRegionConfig.map.defaultZoom,
    10,
    "zoom default publik harus mulai dari konteks OKU Selatan, bukan city-first",
  );

  assert.equal(PUBLIC_BASE_MAPS.osm.maxZoom, 19, "OSM harus tetap mendukung zoom 19");
  assert.equal(PUBLIC_BASE_MAPS.carto.maxZoom, 20, "Carto harus tetap mendukung zoom 20");
  assert.equal(PUBLIC_BASE_MAPS.esri.maxZoom, 16, "ESRI Satellite harus dibatasi satu level lebih aman agar tile kosong tidak muncul");
  assert.equal(PUBLIC_BASE_MAPS.esri.name, "ESRI Satellite", "label basemap ESRI harus tetap stabil");
}

run()
  .then(() => {
    console.log("[integration] map-region-root-config: PASS");
  })
  .catch((error) => {
    console.error("[integration] map-region-root-config: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
