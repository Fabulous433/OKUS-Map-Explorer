import assert from "node:assert/strict";

import { loadActiveRegionBoundary } from "../../client/src/lib/map/region-boundary-query";

async function loadRegionBoundaryLayerStateModule() {
  try {
    return await import("../../client/src/lib/map/region-boundary-layer-state.ts");
  } catch {
    return null;
  }
}

async function loadRegionBoundaryLayerStyleModule() {
  try {
    return await import("../../client/src/lib/map/region-boundary-layer-style.ts");
  } catch {
    return null;
  }
}

async function run() {
  const stateModule = await loadRegionBoundaryLayerStateModule();
  assert.ok(stateModule, "helper state layer boundary region harus tersedia");

  const styleModule = await loadRegionBoundaryLayerStyleModule();
  assert.ok(styleModule, "helper style layer boundary region harus tersedia");

  const {
    REGION_BOUNDARY_LAYER_DEFAULTS,
    DESA_LAYER_MIN_ZOOM,
    createDefaultRegionBoundaryLayerState,
    canLoadDesaLayer,
    normalizeLayerOpacity,
    getDesaLayerEmptyState,
  } = stateModule as {
    REGION_BOUNDARY_LAYER_DEFAULTS?: Record<string, { visible: boolean; opacity: number }>;
    DESA_LAYER_MIN_ZOOM?: number;
    createDefaultRegionBoundaryLayerState?: () => Record<string, { visible: boolean; opacity: number }>;
    canLoadDesaLayer?: (params: {
      layerState: Record<string, { visible: boolean; opacity: number }>;
      kecamatanId: string;
      zoom: number;
      minZoom?: number;
    }) => boolean;
    normalizeLayerOpacity?: (value: number) => number;
    getDesaLayerEmptyState?: (params: {
      layerState: Record<string, { visible: boolean; opacity: number }>;
      kecamatanId: string;
      zoom: number;
      minZoom?: number;
    }) => string | null;
  };

  const {
    REGION_BOUNDARY_LABEL_MIN_ZOOM,
    getRegionBoundaryLayerStyle,
    getFocusedDesaBoundaryLayerStyle,
  } = styleModule as {
    REGION_BOUNDARY_LABEL_MIN_ZOOM?: Record<string, number>;
    getRegionBoundaryLayerStyle?: (params: {
      level: "kabupaten" | "kecamatan" | "desa";
      featureName: string;
      opacity: number;
    }) => Record<string, unknown>;
    getFocusedDesaBoundaryLayerStyle?: (params: {
      featureName: string;
      selectedFeatureName: string;
      opacity: number;
    }) => Record<string, unknown>;
  };

  assert.deepEqual(REGION_BOUNDARY_LAYER_DEFAULTS, {
    kabupaten: {
      visible: true,
      opacity: 24,
    },
    kecamatan: {
      visible: false,
      opacity: 72,
    },
    desa: {
      visible: false,
      opacity: 64,
    },
  });

  const defaultState = createDefaultRegionBoundaryLayerState!();
  assert.deepEqual(defaultState, REGION_BOUNDARY_LAYER_DEFAULTS);

  assert.equal(normalizeLayerOpacity!(-15), 0, "opacity tidak boleh kurang dari 0");
  assert.equal(normalizeLayerOpacity!(33.6), 34, "opacity desimal harus dibulatkan stabil");
  assert.equal(normalizeLayerOpacity!(180), 100, "opacity tidak boleh lebih dari 100");

  assert.equal(DESA_LAYER_MIN_ZOOM, 12, "threshold lazy load desa harus eksplisit");
  assert.equal(
    canLoadDesaLayer!({
      layerState: defaultState,
      kecamatanId: "1609040",
      zoom: 12,
    }),
    false,
    "layer desa tidak boleh load bila toggle belum aktif",
  );

  const desaVisibleState = {
    ...defaultState,
    desa: {
      ...defaultState.desa,
      visible: true,
    },
  };

  assert.equal(
    canLoadDesaLayer!({
      layerState: desaVisibleState,
      kecamatanId: "all",
      zoom: 14,
    }),
    false,
    "layer desa tidak boleh load tanpa scope kecamatan",
  );
  assert.equal(
    getDesaLayerEmptyState!({
      layerState: desaVisibleState,
      kecamatanId: "all",
      zoom: 14,
    }),
    "Pilih kecamatan untuk memuat batas desa",
    "empty state desa harus menjelaskan kebutuhan scope kecamatan",
  );

  assert.equal(
    canLoadDesaLayer!({
      layerState: desaVisibleState,
      kecamatanId: "1609040",
      zoom: 11,
    }),
    false,
    "layer desa tidak boleh load sebelum threshold zoom terpenuhi",
  );
  assert.equal(
    getDesaLayerEmptyState!({
      layerState: desaVisibleState,
      kecamatanId: "1609040",
      zoom: 11,
    }),
    "Perbesar peta ke zoom 12+ untuk memuat batas desa",
    "empty state desa harus jujur saat zoom belum cukup",
  );
  assert.equal(
    canLoadDesaLayer!({
      layerState: desaVisibleState,
      kecamatanId: "1609040",
      zoom: 12,
    }),
    true,
    "layer desa boleh load bila toggle aktif, scope ada, dan zoom cukup",
  );
  assert.equal(
    getDesaLayerEmptyState!({
      layerState: desaVisibleState,
      kecamatanId: "1609040",
      zoom: 12,
    }),
    null,
    "empty state desa harus hilang saat layer sudah eligible",
  );

  assert.ok(REGION_BOUNDARY_LABEL_MIN_ZOOM, "threshold label layer boundary harus tersedia");
  assert.equal(REGION_BOUNDARY_LABEL_MIN_ZOOM?.kabupaten, 9);
  assert.equal(REGION_BOUNDARY_LABEL_MIN_ZOOM?.kecamatan, 11);
  assert.equal(REGION_BOUNDARY_LABEL_MIN_ZOOM?.desa, 13);
  assert.equal(typeof getFocusedDesaBoundaryLayerStyle, "function", "helper style fokus desa wajib diexport");

  const kecamatanStyle = getRegionBoundaryLayerStyle!({
    level: "kecamatan",
    featureName: "Muaradua",
    opacity: 72,
  });
  assert.deepEqual(
    kecamatanStyle,
    getRegionBoundaryLayerStyle!({
      level: "kecamatan",
      featureName: "Muaradua",
      opacity: 72,
    }),
    "style kecamatan harus deterministik untuk nama polygon yang sama",
  );
  assert.notEqual(
    kecamatanStyle.fillColor,
    getRegionBoundaryLayerStyle!({
      level: "desa",
      featureName: "Pasar Muaradua",
      opacity: 64,
    }).fillColor,
    "palette desa harus dibedakan dari palette kecamatan",
  );
  assert.deepEqual(
    getFocusedDesaBoundaryLayerStyle!({
      featureName: "Batu Belang Jaya",
      selectedFeatureName: "Suka Nanti",
      opacity: 68,
    }),
    getRegionBoundaryLayerStyle!({
      level: "desa",
      featureName: "Batu Belang Jaya",
      opacity: 68,
    }),
    "desa non-aktif harus tetap memakai warna polygon normal",
  );
  const selectedFocusedDesaStyle = getFocusedDesaBoundaryLayerStyle!({
    featureName: "Batu Belang Jaya",
    selectedFeatureName: "Batu Belang Jaya",
    opacity: 68,
  });
  assert.equal(selectedFocusedDesaStyle.fillOpacity, 0, "desa aktif harus transparan agar citra dasar tetap terlihat");
  assert.equal(selectedFocusedDesaStyle.opacity, 0.96, "desa aktif harus tetap punya outline tegas");
  assert.equal(selectedFocusedDesaStyle.weight, 2.3, "desa aktif harus mempertahankan outline yang mudah dikenali");

  let requestedUrl = "";
  const response = await loadActiveRegionBoundary({
    level: "desa",
    kecamatanId: "1609040",
    fetchImpl: async (input, init) => {
      requestedUrl = String(input);
      assert.equal(init?.credentials, "include", "boundary query harus tetap membawa kredensial");
      return new Response(
        JSON.stringify({
          regionKey: "okus",
          regionName: "OKU Selatan",
          level: "desa",
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
          scope: {
            kecamatanId: "1609040",
            kecamatanName: "Muaradua",
          },
        }),
        {
          status: 200,
          headers: {
            "content-type": "application/json",
          },
        },
      );
    },
  });
  assert.equal(
    requestedUrl,
    "/api/region-boundaries/active/desa?kecamatanId=1609040",
    "helper query boundary harus meneruskan scope kecamatan ke endpoint desa",
  );
  assert.equal(response.scope?.kecamatanId, "1609040");
  assert.equal(response.level, "desa");
}

run()
  .then(() => {
    console.log("[integration] map-boundary-layer-state: PASS");
  })
  .catch((error) => {
    console.error("[integration] map-boundary-layer-state: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
