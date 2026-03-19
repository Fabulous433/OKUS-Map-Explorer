import assert from "node:assert/strict";

async function loadPublicMapRouteStateModule() {
  try {
    return await import("../../client/src/lib/map/public-map-route-state.ts");
  } catch {
    return null;
  }
}

async function run() {
  const routeStateModule = await loadPublicMapRouteStateModule();
  assert.ok(routeStateModule, "helper route state public map harus tersedia");

  const {
    createPublicMapDesaKey,
    serializePublicMapRouteState,
    parsePublicMapRouteState,
    applyPublicMapRouteStateToSearch,
  } = routeStateModule as {
    createPublicMapDesaKey?: (params: { kecamatanId: string; desaName: string }) => string;
    serializePublicMapRouteState?: (state: {
      stage: "kabupaten" | "kecamatan" | "desa";
      kecamatanId: string | null;
      desaKey: string | null;
      taxType: string | null;
    }) => string;
    parsePublicMapRouteState?: (search: string) => {
      stage: "kabupaten" | "kecamatan" | "desa";
      kecamatanId: string | null;
      desaKey: string | null;
      taxType: string | null;
    };
    applyPublicMapRouteStateToSearch?: (
      currentSearch: string,
      state: {
        stage: "kabupaten" | "kecamatan" | "desa";
        kecamatanId: string | null;
        desaKey: string | null;
        taxType: string | null;
      },
    ) => string;
  };

  assert.equal(typeof createPublicMapDesaKey, "function", "helper desa key wajib diexport");
  assert.equal(typeof serializePublicMapRouteState, "function", "helper serialize route state wajib diexport");
  assert.equal(typeof parsePublicMapRouteState, "function", "helper parse route state wajib diexport");
  assert.equal(typeof applyPublicMapRouteStateToSearch, "function", "helper merge search route state wajib diexport");

  assert.equal(
    createPublicMapDesaKey!({
      kecamatanId: "1609040",
      desaName: "Batu   Belang Jaya",
    }),
    "1609040:batu-belang-jaya",
    "desa key harus stabil dan menormalkan spasi",
  );

  assert.equal(
    serializePublicMapRouteState!({
      stage: "kabupaten",
      kecamatanId: null,
      desaKey: null,
      taxType: null,
    }),
    "",
    "stage root tidak boleh menambahkan query param wilayah",
  );

  assert.equal(
    serializePublicMapRouteState!({
      stage: "kecamatan",
      kecamatanId: "1609040",
      desaKey: null,
      taxType: null,
    }),
    "stage=kecamatan&kecamatanId=1609040",
    "stage kecamatan harus menyimpan kecamatanId ke URL",
  );

  assert.equal(
    serializePublicMapRouteState!({
      stage: "desa",
      kecamatanId: "1609040",
      desaKey: "1609040:batu-belang-jaya",
      taxType: "Pajak Sarang Burung Walet",
    }),
    "stage=desa&kecamatanId=1609040&desaKey=1609040%3Abatu-belang-jaya&taxType=Pajak+Sarang+Burung+Walet",
    "stage desa harus menyimpan key desa dan filter pajak ke URL",
  );

  assert.deepEqual(
    parsePublicMapRouteState!("?stage=kabupaten"),
    {
      stage: "kabupaten",
      kecamatanId: null,
      desaKey: null,
      taxType: null,
    },
    "query root eksplisit tetap harus normal ke state root",
  );

  assert.deepEqual(
    parsePublicMapRouteState!("?stage=kecamatan&kecamatanId=1609040"),
    {
      stage: "kecamatan",
      kecamatanId: "1609040",
      desaKey: null,
      taxType: null,
    },
    "route state kecamatan harus bisa diparse utuh",
  );

  assert.deepEqual(
    parsePublicMapRouteState!("?stage=desa&kecamatanId=1609040&desaKey=1609040%3Abatu-belang-jaya&taxType=Pajak+Sarang+Burung+Walet"),
    {
      stage: "desa",
      kecamatanId: "1609040",
      desaKey: "1609040:batu-belang-jaya",
      taxType: "Pajak Sarang Burung Walet",
    },
    "route state desa harus bisa diparse utuh",
  );

  assert.deepEqual(
    parsePublicMapRouteState!("?stage=desa&desaKey=1609040%3Abatu-belang-jaya"),
    {
      stage: "kabupaten",
      kecamatanId: null,
      desaKey: null,
      taxType: null,
    },
    "route desa tanpa kecamatanId valid harus jatuh ke root aman",
  );

  assert.deepEqual(
    parsePublicMapRouteState!("?stage=aneh&kecamatanId=1609040"),
    {
      stage: "kabupaten",
      kecamatanId: null,
      desaKey: null,
      taxType: null,
    },
    "stage invalid tidak boleh merusak state map",
  );

  assert.equal(
    applyPublicMapRouteStateToSearch!(
      "?focusLat=-4.5&focusLng=104.02&focusOpId=11",
      {
        stage: "desa",
        kecamatanId: "1609040",
        desaKey: "1609040:batu-belang-jaya",
        taxType: "Pajak Sarang Burung Walet",
      },
    ),
    "?focusLat=-4.5&focusLng=104.02&focusOpId=11&stage=desa&kecamatanId=1609040&desaKey=1609040%3Abatu-belang-jaya&taxType=Pajak+Sarang+Burung+Walet",
    "route state wilayah harus merge tanpa membuang deep-link focus existing",
  );

  assert.equal(
    applyPublicMapRouteStateToSearch!(
      "?focusLat=-4.5&focusLng=104.02&focusOpId=11&stage=desa&kecamatanId=1609040",
      {
        stage: "kabupaten",
        kecamatanId: null,
        desaKey: null,
        taxType: null,
      },
    ),
    "?focusLat=-4.5&focusLng=104.02&focusOpId=11",
    "reset ke root harus menghapus query param wilayah tanpa membuang focus params",
  );
}

run()
  .then(() => {
    console.log("[integration] public-map-route-state: PASS");
  })
  .catch((error) => {
    console.error("[integration] public-map-route-state: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
