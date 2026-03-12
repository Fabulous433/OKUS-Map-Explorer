import assert from "node:assert/strict";

async function loadMapViewportQueryModule() {
  try {
    return await import("../../client/src/lib/map/map-viewport-query.ts");
  } catch {
    return null;
  }
}

async function run() {
  const viewportQueryModule = await loadMapViewportQueryModule();
  assert.ok(viewportQueryModule, "helper query viewport map harus tersedia");

  const { loadMapViewportData, shouldActivateViewportData, shouldShowEmptyViewportState } = viewportQueryModule;
  assert.equal(typeof loadMapViewportData, "function", "loader viewport map wajib diexport");
  assert.equal(typeof shouldActivateViewportData, "function", "helper aktivasi query viewport wajib diexport");
  assert.equal(typeof shouldShowEmptyViewportState, "function", "helper empty state viewport wajib diexport");

  assert.equal(
    shouldActivateViewportData({
      bbox: {
        minLng: 104,
        minLat: -4.6,
        maxLng: 104.1,
        maxLat: -4.4,
      },
      searchQuery: "",
      kecamatanId: "all",
      rekPajakId: "all",
      focusId: null,
      focusTarget: null,
    }),
    false,
    "query viewport tidak boleh aktif pada load awal tanpa intent pengguna",
  );

  assert.equal(
    shouldActivateViewportData({
      bbox: {
        minLng: 104,
        minLat: -4.6,
        maxLng: 104.1,
        maxLat: -4.4,
      },
      searchQuery: "warung kopi",
      kecamatanId: "all",
      rekPajakId: "all",
      focusId: null,
      focusTarget: null,
    }),
    true,
    "pencarian teks harus mengaktifkan query viewport",
  );

  assert.equal(
    shouldActivateViewportData({
      bbox: {
        minLng: 104,
        minLat: -4.6,
        maxLng: 104.1,
        maxLat: -4.4,
      },
      searchQuery: "",
      kecamatanId: "327601",
      rekPajakId: "all",
      focusId: null,
      focusTarget: null,
    }),
    true,
    "filter eksplisit harus dihitung sebagai intent pengguna",
  );

  await assert.rejects(
    () =>
      loadMapViewportData({
        request: {
          mode: "backend-proxy",
          url: "/api/objek-pajak/map-wfs?bbox=104,-4.6,104.1,-4.4",
          errorMessage: null,
        },
        fetchImpl: async () =>
          new Response("proxy upstream timeout", {
            status: 502,
            headers: {
              "content-type": "text/plain",
            },
          }),
      }),
    {
      message: "proxy upstream timeout",
    },
    "loader harus meneruskan pesan error dari proxy WFS",
  );

  await assert.rejects(
    () =>
      loadMapViewportData({
        request: {
          mode: "backend-proxy",
          url: "/api/objek-pajak/map-wfs?bbox=104,-4.6,104.1,-4.4",
          errorMessage: null,
        },
        fetchImpl: async () =>
          new Response(
            JSON.stringify({
              type: "FeatureCollection",
              features: null,
            }),
            {
              status: 200,
              headers: {
                "content-type": "application/json",
              },
            },
          ),
      }),
    {
      message: "Payload data peta WFS tidak valid.",
    },
    "loader harus fail fast untuk payload WFS yang tidak valid",
  );

  const emptyViewportResult = await loadMapViewportData({
    request: {
      mode: "backend-proxy",
      url: "/api/objek-pajak/map-wfs?bbox=104,-4.6,104.1,-4.4",
      errorMessage: null,
    },
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          type: "FeatureCollection",
          features: [
            {
              type: "Feature",
              id: 77,
              geometry: null,
              properties: {},
            },
          ],
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      ),
  });

  assert.deepEqual(emptyViewportResult, {
    items: [],
    meta: {
      totalInView: 0,
      isCapped: false,
      primaryLabel: "marker loaded",
    },
  });

  assert.equal(
    shouldShowEmptyViewportState({
      isQueryActive: false,
      bbox: {
        minLng: 104,
        minLat: -4.6,
        maxLng: 104.1,
        maxLat: -4.4,
      },
      isFetching: false,
      error: null,
      markerCount: emptyViewportResult.items.length,
    }),
    false,
    "empty state tidak boleh tampil selama peta masih idle tanpa intent pengguna",
  );

  assert.equal(
    shouldShowEmptyViewportState({
      isQueryActive: true,
      bbox: {
        minLng: 104,
        minLat: -4.6,
        maxLng: 104.1,
        maxLat: -4.4,
      },
      isFetching: false,
      error: null,
      markerCount: emptyViewportResult.items.length,
    }),
    true,
    "empty state harus tampil jika query viewport aktif tetapi adapter tidak menghasilkan marker",
  );

  assert.equal(
    shouldShowEmptyViewportState({
      isQueryActive: true,
      bbox: {
        minLng: 104,
        minLat: -4.6,
        maxLng: 104.1,
        maxLat: -4.4,
      },
      isFetching: false,
      error: new Error("proxy upstream timeout"),
      markerCount: 0,
    }),
    false,
    "empty state tidak boleh menang atas error state",
  );
}

run()
  .then(() => {
    console.log("[integration] map-viewport-query: PASS");
  })
  .catch((error) => {
    console.error("[integration] map-viewport-query: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
