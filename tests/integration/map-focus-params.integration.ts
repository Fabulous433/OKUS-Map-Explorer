import assert from "node:assert/strict";

async function loadMapFocusParamsModule() {
  try {
    return await import("../../client/src/lib/map/map-focus-params.ts");
  } catch {
    return null;
  }
}

async function run() {
  const focusParamsModule = await loadMapFocusParamsModule();
  assert.ok(focusParamsModule, "helper parse focus param map harus tersedia");

  const { parseMapFocusParams } = focusParamsModule;
  assert.equal(typeof parseMapFocusParams, "function", "parser focus param map wajib diexport");

  assert.deepEqual(
    parseMapFocusParams(""),
    {
      id: null,
      target: null,
    },
    "query string kosong tidak boleh diparse sebagai focus 0,0",
  );

  assert.deepEqual(
    parseMapFocusParams("?focusLat=-4.525&focusLng=104.027&focusOpId=17"),
    {
      id: 17,
      target: {
        lat: -4.525,
        lng: 104.027,
      },
    },
    "focus param yang valid harus tetap diparse untuk deep link marker",
  );

  assert.deepEqual(
    parseMapFocusParams("?focusLat=0&focusLng=0"),
    {
      id: null,
      target: {
        lat: 0,
        lng: 0,
      },
    },
    "nilai nol tetap valid jika parameter memang dikirim eksplisit",
  );
}

run()
  .then(() => {
    console.log("[integration] map-focus-params: PASS");
  })
  .catch((error) => {
    console.error("[integration] map-focus-params: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
