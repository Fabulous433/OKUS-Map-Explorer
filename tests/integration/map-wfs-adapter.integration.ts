import assert from "node:assert/strict";

async function loadWfsAdapterModule() {
  try {
    const adapterModule = await import("../../client/src/lib/map/wfs-adapter.ts");
    const typesModule = await import("../../client/src/lib/map/wfs-types.ts");
    return {
      ...adapterModule,
      ...typesModule,
    };
  } catch {
    return null;
  }
}

async function run() {
  const wfsModule = await loadWfsAdapterModule();
  assert.ok(wfsModule, "helper WFS adapter harus tersedia");

  const {
    buildWfsUrl,
    mapFeatureToViewportMarker,
    mapWfsCollectionToViewportMarkers,
    deriveWfsViewportMeta,
  } = wfsModule;

  assert.equal(typeof buildWfsUrl, "function", "builder URL WFS wajib diexport");
  assert.equal(typeof mapFeatureToViewportMarker, "function", "mapper feature WFS wajib diexport");
  assert.equal(typeof mapWfsCollectionToViewportMarkers, "function", "mapper collection WFS wajib diexport");
  assert.equal(typeof deriveWfsViewportMeta, "function", "helper meta viewport WFS wajib diexport");

  const url = new URL(
    buildWfsUrl(
      {
        endpoint: "https://example.com/geoserver/pajak/wfs",
        typeName: "pajak:bangunan_okus",
        propertyMap: {
          kecamatanId: "kecamatan_id",
          rekPajakId: "rek_pajak_id",
          search: ["nama_op", "nopd"],
        },
      },
      {
        minLng: 104,
        minLat: -4.6,
        maxLng: 104.1,
        maxLat: -4.4,
      },
      {
        kecamatanId: "1609010",
        rekPajakId: "9",
        searchQuery: "pasar pagi",
        limit: 500,
      },
    ),
  );

  assert.equal(url.origin + url.pathname, "https://example.com/geoserver/pajak/wfs");
  assert.equal(url.searchParams.get("service"), "WFS");
  assert.equal(url.searchParams.get("version"), "1.1.0");
  assert.equal(url.searchParams.get("request"), "GetFeature");
  assert.equal(url.searchParams.get("typeName"), "pajak:bangunan_okus");
  assert.equal(url.searchParams.get("srsName"), "EPSG:4326");
  assert.equal(url.searchParams.get("outputFormat"), "application/json");
  assert.equal(url.searchParams.get("bbox"), "104,-4.6,104.1,-4.4,EPSG:4326");
  assert.equal(url.searchParams.get("maxFeatures"), "500");
  assert.equal(
    url.searchParams.get("cql_filter"),
    "kecamatan_id = '1609010' AND rek_pajak_id = '9' AND (nama_op ILIKE '%pasar pagi%' OR nopd ILIKE '%pasar pagi%')",
  );

  const marker = mapFeatureToViewportMarker({
    type: "Feature",
    id: "op-77",
    geometry: {
      type: "Point",
      coordinates: [104.027, -4.525],
    },
    properties: {
      nama_op: "Pasar Pagi",
      nopd: "01.02.03.0001",
      jenis_pajak: "Pajak Parkir",
      alamat: "Jl. Jenderal Sudirman",
      status_verifikasi: "verified",
      pajak_bulanan: "150000",
    },
  });

  assert.deepEqual(marker, {
    id: "op-77",
    focusKey: "op-77",
    namaOp: "Pasar Pagi",
    nopd: "01.02.03.0001",
    jenisPajak: "Pajak Parkir",
    alamatOp: "Jl. Jenderal Sudirman",
    latitude: -4.525,
    longitude: 104.027,
    statusVerifikasi: "verified",
    pajakBulanan: "150000",
  });

  assert.equal(
    mapFeatureToViewportMarker({
      type: "Feature",
      geometry: null,
      properties: {},
    }),
    null,
    "feature tanpa geometry harus dilewati",
  );

  const markers = mapWfsCollectionToViewportMarkers({
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        id: 1,
        geometry: { type: "Point", coordinates: [104.027, -4.525] },
        properties: {
          nama_op: "Objek 1",
          jenis_pajak: "Pajak Daerah",
        },
      },
      {
        type: "Feature",
        id: 2,
        geometry: null,
        properties: {},
      },
    ],
  });
  assert.equal(markers.length, 1, "collection mapper hanya boleh mengembalikan marker valid");

  const metaWithMatchedTotal = deriveWfsViewportMeta(
    {
      type: "FeatureCollection",
      numberMatched: 12,
      features: [],
    },
    5,
  );
  assert.deepEqual(metaWithMatchedTotal, {
    totalInView: 12,
    isCapped: true,
    primaryLabel: "dalam viewport",
    semantics: "matched-features",
  });

  const metaFallback = deriveWfsViewportMeta(
    {
      type: "FeatureCollection",
      features: [],
    },
    3,
  );
  assert.deepEqual(metaFallback, {
    totalInView: 3,
    isCapped: false,
    primaryLabel: "marker loaded",
    semantics: "loaded-markers",
  });
}

run()
  .then(() => {
    console.log("[integration] map-wfs-adapter: PASS");
  })
  .catch((error) => {
    console.error("[integration] map-wfs-adapter: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
