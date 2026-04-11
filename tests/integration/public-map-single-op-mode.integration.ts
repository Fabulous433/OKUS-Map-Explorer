import assert from "node:assert/strict";

async function loadSingleOpModeModule() {
  try {
    return await import("../../client/src/lib/map/public-map-single-op-mode.ts");
  } catch {
    return null;
  }
}

async function run() {
  const singleOpModule = await loadSingleOpModeModule();
  assert.ok(singleOpModule, "helper mode single-OP public map harus tersedia");

  const { isPublicMapSingleOpMode, createPublicMapSingleOpUiModel, resolvePublicMapFocusZoom } = singleOpModule as {
    isPublicMapSingleOpMode?: (params: { hasFocusOverride: boolean; focusId: number | null }) => boolean;
    createPublicMapSingleOpUiModel?: (singleOpMode: boolean) => {
      showCompactStageShell: boolean;
      showTaxFilter: boolean;
      showOpRail: boolean;
      showMobileSheet: boolean;
      showResetButton: boolean;
      showZoomControl: boolean;
      lockMapInteractions: boolean;
    };
    resolvePublicMapFocusZoom?: (params: {
      singleOpMode: boolean;
      baseMapMaxZoom: number;
      defaultFocusZoom: number;
    }) => number;
  };

  assert.equal(typeof isPublicMapSingleOpMode, "function", "detektor mode single OP wajib diexport");
  assert.equal(typeof createPublicMapSingleOpUiModel, "function", "helper UI mode single OP wajib diexport");
  assert.equal(typeof resolvePublicMapFocusZoom, "function", "resolver zoom fokus mode single OP wajib diexport");

  assert.equal(
    isPublicMapSingleOpMode!({
      hasFocusOverride: true,
      focusId: 1237,
    }),
    true,
    "mode single OP harus aktif saat deep-link fokus punya focusOpId",
  );

  assert.equal(
    isPublicMapSingleOpMode!({
      hasFocusOverride: true,
      focusId: null,
    }),
    false,
    "mode single OP tidak boleh aktif tanpa focusOpId valid",
  );

  assert.deepEqual(
    createPublicMapSingleOpUiModel!(true),
    {
      showCompactStageShell: false,
      showTaxFilter: false,
      showOpRail: false,
      showMobileSheet: false,
      showResetButton: false,
      showZoomControl: false,
      lockMapInteractions: true,
    },
    "UI mode single OP harus ringkas dan interaction map dikunci",
  );

  assert.equal(
    resolvePublicMapFocusZoom!({
      singleOpMode: true,
      baseMapMaxZoom: 19,
      defaultFocusZoom: 18,
    }),
    19,
    "mode single OP harus pakai zoom maksimum basemap",
  );

  assert.equal(
    resolvePublicMapFocusZoom!({
      singleOpMode: false,
      baseMapMaxZoom: 19,
      defaultFocusZoom: 18,
    }),
    18,
    "mode normal harus tetap pakai zoom default fokus",
  );
}

run()
  .then(() => {
    console.log("[integration] public-map-single-op-mode: PASS");
  })
  .catch((error) => {
    console.error("[integration] public-map-single-op-mode: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
