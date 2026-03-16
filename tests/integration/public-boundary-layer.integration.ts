import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { geoJsonFeatureCollectionSchema } from "@shared/region-boundary";
import { loadActiveRegionBoundary } from "../../client/src/lib/map/region-boundary-query";
import { createDefaultRegionBoundaryLayerState } from "../../client/src/lib/map/region-boundary-layer-state";

async function loadPublicBoundaryLayerModule() {
  try {
    return await import("../../client/src/lib/map/public-boundary-layer-model.ts");
  } catch {
    return null;
  }
}

function createBoundaryResponse(level: "kabupaten" | "kecamatan" | "desa") {
  return new Response(
    JSON.stringify({
      regionKey: "okus",
      regionName: "OKU Selatan",
      level,
      precision: "light",
      bounds: {
        minLng: 104,
        minLat: -4.6,
        maxLng: 104.1,
        maxLat: -4.5,
      },
      boundary: {
        type: "FeatureCollection",
        features: [],
      },
    }),
    {
      status: 200,
      headers: {
        "content-type": "application/json",
      },
    },
  );
}

async function run() {
  const publicBoundaryLayerModule = await loadPublicBoundaryLayerModule();
  assert.ok(publicBoundaryLayerModule, "komponen public boundary layer harus tersedia");

  const {
    createPublicBoundaryLayerQueryPlan,
    shouldShowBoundaryLabels,
    createKabupatenMaskBoundary,
    extractBoundaryLegendFeatures,
  } = publicBoundaryLayerModule as {
    createPublicBoundaryLayerQueryPlan?: (params: {
      layerState: ReturnType<typeof createDefaultRegionBoundaryLayerState>;
      kecamatanId: string;
      zoom: number;
    }) => {
      kabupaten: { level: "kabupaten"; enabled: boolean };
      kecamatan: { level: "kecamatan"; enabled: boolean };
      desa: { level: "desa"; enabled: boolean; kecamatanId?: string };
    };
    shouldShowBoundaryLabels?: (level: "kabupaten" | "kecamatan" | "desa", zoom: number) => boolean;
    createKabupatenMaskBoundary?: (boundary: unknown) => unknown;
    extractBoundaryLegendFeatures?: (params: {
      level: "kecamatan" | "desa";
      boundary: unknown;
    }) => Array<{ level: "kecamatan" | "desa"; featureName: string }>;
  };

  assert.equal(typeof createPublicBoundaryLayerQueryPlan, "function", "query-plan boundary layer wajib diexport");
  assert.equal(typeof shouldShowBoundaryLabels, "function", "helper threshold label boundary wajib diexport");
  assert.equal(typeof createKabupatenMaskBoundary, "function", "helper mask kabupaten wajib diexport");
  assert.equal(typeof extractBoundaryLegendFeatures, "function", "helper legend boundary wajib diexport");

  const defaultLayerState = createDefaultRegionBoundaryLayerState();
  const defaultPlan = createPublicBoundaryLayerQueryPlan!({
    layerState: defaultLayerState,
    kecamatanId: "all",
    zoom: 15,
  });
  assert.equal(defaultPlan.kabupaten.enabled, true, "layer kabupaten harus tetap aktif secara default");
  assert.equal(defaultPlan.kecamatan.enabled, false, "layer kecamatan default harus off");
  assert.equal(defaultPlan.desa.enabled, false, "layer desa default harus off");

  const kecamatanPlan = createPublicBoundaryLayerQueryPlan!({
    layerState: {
      ...defaultLayerState,
      kecamatan: {
        ...defaultLayerState.kecamatan,
        visible: true,
      },
    },
    kecamatanId: "all",
    zoom: 15,
  });
  assert.equal(kecamatanPlan.kecamatan.enabled, true, "toggle kecamatan harus mengaktifkan query boundary kecamatan");

  let requestedKecamatanUrl = "";
  await loadActiveRegionBoundary({
    level: kecamatanPlan.kecamatan.level,
    fetchImpl: async (input) => {
      requestedKecamatanUrl = String(input);
      return createBoundaryResponse("kecamatan");
    },
  });
  assert.equal(
    requestedKecamatanUrl,
    "/api/region-boundaries/active/kecamatan",
    "query boundary kecamatan harus menuju endpoint aktif kecamatan",
  );

  const desaNoScopePlan = createPublicBoundaryLayerQueryPlan!({
    layerState: {
      ...defaultLayerState,
      desa: {
        ...defaultLayerState.desa,
        visible: true,
      },
    },
    kecamatanId: "all",
    zoom: 15,
  });
  assert.equal(
    desaNoScopePlan.desa.enabled,
    false,
    "toggle desa tanpa kecamatan terpilih tidak boleh memicu full fetch desa",
  );
  assert.equal(desaNoScopePlan.desa.kecamatanId, undefined, "query desa tanpa scope tidak boleh membawa kecamatanId palsu");

  const desaScopedPlan = createPublicBoundaryLayerQueryPlan!({
    layerState: {
      ...defaultLayerState,
      desa: {
        ...defaultLayerState.desa,
        visible: true,
      },
    },
    kecamatanId: "1609040",
    zoom: 12,
  });
  assert.equal(
    desaScopedPlan.desa.enabled,
    true,
    "toggle desa dengan kecamatan terpilih dan zoom cukup harus mengaktifkan query scoped desa",
  );

  let requestedDesaUrl = "";
  await loadActiveRegionBoundary({
    level: desaScopedPlan.desa.level,
    kecamatanId: desaScopedPlan.desa.kecamatanId,
    fetchImpl: async (input) => {
      requestedDesaUrl = String(input);
      return createBoundaryResponse("desa");
    },
  });
  assert.equal(
    requestedDesaUrl,
    "/api/region-boundaries/active/desa?kecamatanId=1609040",
    "query desa harus tetap scoped ke kecamatan yang dipilih",
  );

  assert.equal(
    shouldShowBoundaryLabels!("desa", 12),
    false,
    "label desa tidak boleh tampil di bawah threshold zoom",
  );
  assert.equal(
    shouldShowBoundaryLabels!("desa", 13),
    true,
    "label desa harus tampil saat threshold zoom terpenuhi",
  );

  const rawKabupatenLight = await readFile(
    new URL("../../server/data/regions/okus/kabupaten.light.geojson", import.meta.url),
    "utf-8",
  );
  const kabupatenLightBoundary = geoJsonFeatureCollectionSchema.parse(JSON.parse(rawKabupatenLight));
  const kabupatenMask = geoJsonFeatureCollectionSchema.parse(createKabupatenMaskBoundary!(kabupatenLightBoundary));
  assert.equal(kabupatenMask.features.length, 1, "mask luar kabupaten cukup direpresentasikan oleh satu polygon dunia berlubang");
  assert.equal(kabupatenMask.features[0]?.geometry.type, "Polygon", "mask luar kabupaten harus berupa polygon berlubang");

  const rawKecamatanLight = await readFile(
    new URL("../../server/data/regions/okus/kecamatan.light.geojson", import.meta.url),
    "utf-8",
  );
  const kecamatanLightBoundary = geoJsonFeatureCollectionSchema.parse(JSON.parse(rawKecamatanLight));
  const legendFeatures = extractBoundaryLegendFeatures!({
    level: "kecamatan",
    boundary: kecamatanLightBoundary,
  });
  assert.ok(legendFeatures.length >= 19, "legend feature extraction harus memetakan polygon visible");
  assert.equal(legendFeatures[0]?.level, "kecamatan");
  assert.ok(typeof legendFeatures[0]?.featureName === "string" && legendFeatures[0].featureName.length > 0);
}

run()
  .then(() => {
    console.log("[integration] public-boundary-layer: PASS");
  })
  .catch((error) => {
    console.error("[integration] public-boundary-layer: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
