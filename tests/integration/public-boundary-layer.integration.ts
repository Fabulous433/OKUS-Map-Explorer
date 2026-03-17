import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { geoJsonFeatureCollectionSchema } from "@shared/region-boundary";
import { loadActiveRegionBoundary } from "../../client/src/lib/map/region-boundary-query";
import { createDefaultRegionBoundaryLayerState } from "../../client/src/lib/map/region-boundary-layer-state";
import type { MapViewportMarker } from "../../client/src/lib/map/wfs-types";

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
    createBoundaryFeatureSelection,
    resolveBoundarySelectionKecamatanId,
    filterViewportMarkersByBoundarySelection,
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
    createBoundaryFeatureSelection?: (params: {
      level: "kecamatan" | "desa";
      feature: unknown;
    }) => {
      level: "kecamatan" | "desa";
      featureName: string;
      kecamatanName: string;
      bounds: {
        minLng: number;
        minLat: number;
        maxLng: number;
        maxLat: number;
      };
    };
    resolveBoundarySelectionKecamatanId?: (params: {
      selection: {
        level: "kecamatan" | "desa";
        featureName: string;
        kecamatanName: string;
      };
      kecamatanList: Array<{
        cpmKecId: string;
        cpmKecamatan: string;
      }>;
    }) => string | null;
    filterViewportMarkersByBoundarySelection?: (params: {
      selection: {
        level: "kecamatan" | "desa";
        featureName: string;
        kecamatanName: string;
        bounds: {
          minLng: number;
          minLat: number;
          maxLng: number;
          maxLat: number;
        };
        feature: unknown;
      };
      markers: MapViewportMarker[];
    }) => MapViewportMarker[];
  };

  assert.equal(typeof createPublicBoundaryLayerQueryPlan, "function", "query-plan boundary layer wajib diexport");
  assert.equal(typeof shouldShowBoundaryLabels, "function", "helper threshold label boundary wajib diexport");
  assert.equal(typeof createKabupatenMaskBoundary, "function", "helper mask kabupaten wajib diexport");
  assert.equal(typeof extractBoundaryLegendFeatures, "function", "helper legend boundary wajib diexport");
  assert.equal(typeof createBoundaryFeatureSelection, "function", "helper selection polygon wajib diexport");
  assert.equal(typeof resolveBoundarySelectionKecamatanId, "function", "helper resolve kecamatanId polygon wajib diexport");
  assert.equal(
    typeof filterViewportMarkersByBoundarySelection,
    "function",
    "helper filter marker berdasarkan polygon selection wajib diexport",
  );

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

  const kecamatanFeature = kecamatanLightBoundary.features.find((feature) => String(feature.properties.WADMKC ?? "").trim() === "Kisam Ilir");
  assert.ok(kecamatanFeature, "fixture kecamatan Kisam Ilir harus tersedia untuk regression klik polygon");
  const kecamatanSelection = createBoundaryFeatureSelection!({
    level: "kecamatan",
    feature: kecamatanFeature,
  });
  assert.equal(kecamatanSelection.featureName, "Kisam Ilir", "klik kecamatan harus membawa nama feature yang benar");
  assert.equal(kecamatanSelection.kecamatanName, "Kisam Ilir", "klik kecamatan harus resolve konteks kecamatan sendiri");
  assert.ok(
    kecamatanSelection.bounds.minLng < kecamatanSelection.bounds.maxLng &&
      kecamatanSelection.bounds.minLat < kecamatanSelection.bounds.maxLat,
    "klik kecamatan harus menghasilkan bounds focus yang valid",
  );
  assert.equal(
    resolveBoundarySelectionKecamatanId!({
      selection: kecamatanSelection,
      kecamatanList: [
        { cpmKecId: "1609011", cpmKecamatan: "Kisam Ilir" },
        { cpmKecId: "1609012", cpmKecamatan: "Sungai Are" },
      ],
    }),
    "1609011",
    "klik kecamatan harus bisa dipetakan ke kecamatanId filter map",
  );
  const muaraDuaFeature = kecamatanLightBoundary.features.find(
    (feature) => String(feature.properties.WADMKC ?? "").trim() === "Muara Dua",
  );
  assert.ok(muaraDuaFeature, "fixture kecamatan Muara Dua harus tersedia untuk regression normalisasi nama");
  const muaraDuaSelection = createBoundaryFeatureSelection!({
    level: "kecamatan",
    feature: muaraDuaFeature,
  });
  assert.equal(
    resolveBoundarySelectionKecamatanId!({
      selection: muaraDuaSelection,
      kecamatanList: [
        { cpmKecId: "1609040", cpmKecamatan: "Muaradua" },
        { cpmKecId: "1609030", cpmKecamatan: "Muaradua Kisam" },
      ],
    }),
    "1609040",
    "klik kecamatan harus tahan terhadap variasi penulisan spasi seperti Muara Dua vs Muaradua",
  );

  const rawDesaLight = await readFile(
    new URL("../../server/data/regions/okus/desa.light.geojson", import.meta.url),
    "utf-8",
  );
  const desaLightBoundary = geoJsonFeatureCollectionSchema.parse(JSON.parse(rawDesaLight));
  const desaFeature = desaLightBoundary.features.find((feature) => String(feature.properties.WADMKD ?? "").trim() === "Campang Jaya");
  assert.ok(desaFeature, "fixture desa Campang Jaya harus tersedia untuk regression klik polygon");
  const desaSelection = createBoundaryFeatureSelection!({
    level: "desa",
    feature: desaFeature,
  });
  assert.equal(desaSelection.featureName, "Campang Jaya", "klik desa harus membawa nama desa yang benar");
  assert.equal(desaSelection.kecamatanName, "Kisam Ilir", "klik desa harus tetap membawa konteks kecamatan induk");
  assert.equal(
    resolveBoundarySelectionKecamatanId!({
      selection: desaSelection,
      kecamatanList: [
        { cpmKecId: "1609011", cpmKecamatan: "Kisam Ilir" },
        { cpmKecId: "1609012", cpmKecamatan: "Sungai Are" },
      ],
    }),
    "1609011",
    "klik desa harus tetap bisa mengaktifkan filter kecamatan pada viewport query",
  );
  const insideDesaPoint = findPointInsideFeature(desaSelection);

  const markers: MapViewportMarker[] = [
    {
      id: 1,
      focusKey: "1",
      namaOp: "OP Campang Jaya",
      nopd: "11.11.11.0001",
      jenisPajak: "Pajak Air Tanah",
      alamatOp: "Campang Jaya",
      latitude: insideDesaPoint.latitude,
      longitude: insideDesaPoint.longitude,
    },
    {
      id: 2,
      focusKey: "2",
      namaOp: "OP Tetangga",
      nopd: "11.11.11.0002",
      jenisPajak: "Pajak Air Tanah",
      alamatOp: "Tetangga desa lain",
      latitude: -4.475,
      longitude: 103.79,
    },
  ];

  const filteredDesaMarkers = filterViewportMarkersByBoundarySelection!({
    selection: desaSelection,
    markers,
  });
  assert.deepEqual(
    filteredDesaMarkers.map((item) => item.id),
    [1],
    "klik desa harus membatasi marker ke polygon desa yang dipilih",
  );

  const filteredKecamatanMarkers = filterViewportMarkersByBoundarySelection!({
    selection: kecamatanSelection,
    markers,
  });
  assert.ok(
    filteredKecamatanMarkers.some((item) => item.id === 1),
    "klik kecamatan harus tetap mempertahankan marker yang berada di dalam polygon kecamatan",
  );
}

function findPointInsideFeature(selection: {
  bounds: {
    minLng: number;
    minLat: number;
    maxLng: number;
    maxLat: number;
  };
  feature: unknown;
}) {
  const gridSize = 32;

  for (let lngStep = 0; lngStep <= gridSize; lngStep += 1) {
    for (let latStep = 0; latStep <= gridSize; latStep += 1) {
      const lng =
        selection.bounds.minLng +
        ((selection.bounds.maxLng - selection.bounds.minLng) * lngStep) / gridSize;
      const lat =
        selection.bounds.minLat +
        ((selection.bounds.maxLat - selection.bounds.minLat) * latStep) / gridSize;

      if (booleanPointInPolygon([lng, lat], selection.feature as never)) {
        return { longitude: lng, latitude: lat };
      }
    }
  }

  throw new Error("Fixture polygon tidak memiliki titik interior yang bisa dipakai regression.");
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
