import assert from "node:assert/strict";

async function loadMapDataSourceModule() {
  try {
    return await import("../../client/src/lib/map/map-data-source.ts");
  } catch {
    return null;
  }
}

async function run() {
  const mapDataSourceModule = await loadMapDataSourceModule();
  assert.ok(mapDataSourceModule, "helper map data source harus tersedia");

  const { resolveMapDataSourceConfig, buildInternalApiMapQueryUrl } = mapDataSourceModule;
  assert.equal(typeof resolveMapDataSourceConfig, "function", "resolver config map data source wajib diexport");
  assert.equal(typeof buildInternalApiMapQueryUrl, "function", "builder query internal map wajib diexport");

  const defaultConfig = resolveMapDataSourceConfig({});
  assert.deepEqual(defaultConfig, {
    mode: "internal-api",
    internalApiEndpoint: "/api/objek-pajak/map",
    proxyEndpoint: "/api/objek-pajak/map-wfs",
    wfsEndpoint: null,
  });

  const proxyConfig = resolveMapDataSourceConfig({
    mapDataMode: "backend-proxy",
    mapProxyEndpoint: "/api/map-proxy",
  });
  assert.deepEqual(proxyConfig, {
    mode: "backend-proxy",
    internalApiEndpoint: "/api/objek-pajak/map",
    proxyEndpoint: "/api/map-proxy",
    wfsEndpoint: null,
  });

  const invalidModeFallback = resolveMapDataSourceConfig({
    mapDataMode: "unexpected",
    mapInternalApiEndpoint: "   ",
    mapProxyEndpoint: "   ",
  });
  assert.deepEqual(invalidModeFallback, {
    mode: "internal-api",
    internalApiEndpoint: "/api/objek-pajak/map",
    proxyEndpoint: "/api/objek-pajak/map-wfs",
    wfsEndpoint: null,
  });

  const internalQueryUrl = buildInternalApiMapQueryUrl({
    endpoint: proxyConfig.proxyEndpoint,
    bbox: {
      minLng: 104,
      minLat: -4.6,
      maxLng: 104.1,
      maxLat: -4.4,
    },
    zoom: 13,
    limit: 500,
    searchQuery: "pasar pagi",
    kecamatanId: "1609010",
    rekPajakId: "9",
  });
  assert.equal(
    internalQueryUrl,
    "/api/map-proxy?bbox=104%2C-4.6%2C104.1%2C-4.4&zoom=13&limit=500&q=pasar+pagi&kecamatanId=1609010&rekPajakId=9",
  );
}

run()
  .then(() => {
    console.log("[integration] map-data-source seam: PASS");
  })
  .catch((error) => {
    console.error("[integration] map-data-source seam: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
