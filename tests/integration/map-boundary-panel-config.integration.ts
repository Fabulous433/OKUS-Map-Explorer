import assert from "node:assert/strict";

async function loadMapBoundaryLayerControlsModule() {
  try {
    return await import("../../client/src/components/map/map-boundary-layer-controls.tsx");
  } catch {
    return null;
  }
}

async function loadMapBoundaryLegendPanelModule() {
  try {
    return await import("../../client/src/components/map/map-boundary-legend-panel.tsx");
  } catch {
    return null;
  }
}

async function loadRegionBoundaryLayerStateModule() {
  try {
    return await import("../../client/src/lib/map/region-boundary-layer-state.ts");
  } catch {
    return null;
  }
}

async function run() {
  const layerControlsModule = await loadMapBoundaryLayerControlsModule();
  assert.ok(layerControlsModule, "komponen atlas layer control boundary harus tersedia");

  const legendPanelModule = await loadMapBoundaryLegendPanelModule();
  assert.ok(legendPanelModule, "komponen panel legenda boundary harus tersedia");

  const layerStateModule = await loadRegionBoundaryLayerStateModule();
  assert.ok(layerStateModule, "helper state boundary layer harus tersedia");

  const { MAP_ATLAS_PANEL_TABS, createMapBoundaryLayerControlRows } = layerControlsModule as {
    MAP_ATLAS_PANEL_TABS?: Array<{ id: string; label: string }>;
    createMapBoundaryLayerControlRows?: (params: {
      layerState: Record<string, { visible: boolean; opacity: number }>;
      kecamatanId: string;
      zoom: number;
    }) => Array<{
      id: string;
      label: string;
      helperText: string;
      hasToggle: boolean;
      hasOpacity: boolean;
    }>;
  };
  const { createDefaultRegionBoundaryLayerState } = layerStateModule as {
    createDefaultRegionBoundaryLayerState?: () => Record<string, { visible: boolean; opacity: number }>;
  };
  const { createBoundaryLegendModel } = legendPanelModule as {
    createBoundaryLegendModel?: (params: {
      layerState: Record<string, { visible: boolean; opacity: number }>;
      visibleFeatures: Array<{ level: "kecamatan" | "desa"; featureName: string }>;
    }) => {
      heading: string;
      description: string;
      items: Array<{ label: string; tone: string }>;
    };
  };

  assert.deepEqual(
    MAP_ATLAS_PANEL_TABS,
    [
      { id: "map", label: "Peta" },
      { id: "info", label: "Informasi" },
      { id: "search", label: "Cari" },
    ],
    "panel atlas harus expose tepat tiga tab: Peta, Informasi, Cari",
  );

  const defaultLayerState = createDefaultRegionBoundaryLayerState!();
  const layerRows = createMapBoundaryLayerControlRows!({
    layerState: {
      ...defaultLayerState,
      kecamatan: {
        visible: true,
        opacity: 72,
      },
      desa: {
        visible: true,
        opacity: 64,
      },
    },
    kecamatanId: "all",
    zoom: 12,
  });

  assert.deepEqual(
    layerRows.map((row) => ({
      id: row.id,
      hasToggle: row.hasToggle,
      hasOpacity: row.hasOpacity,
    })),
    [
      { id: "kabupaten", hasToggle: true, hasOpacity: true },
      { id: "kecamatan", hasToggle: true, hasOpacity: true },
      { id: "desa", hasToggle: true, hasOpacity: true },
    ],
    "tab Peta harus memodelkan tiga row polygon dengan toggle dan opacity",
  );
  assert.equal(
    layerRows.find((row) => row.id === "desa")?.helperText,
    "Pilih kecamatan untuk memuat batas desa",
    "row desa harus menampilkan helper saat scope kecamatan belum dipilih",
  );

  const legendModel = createBoundaryLegendModel!({
    layerState: {
      ...defaultLayerState,
      kecamatan: {
        visible: true,
        opacity: 72,
      },
    },
    visibleFeatures: [
      { level: "kecamatan", featureName: "Banding Agung" },
      { level: "kecamatan", featureName: "Muara Dua" },
      { level: "kecamatan", featureName: "Banding Agung" },
    ],
  });
  assert.equal(legendModel.heading, "Data Polygon Kecamatan");
  assert.ok(
    legendModel.description.length > 0,
    "panel informasi harus memberi penjelasan saat legenda polygon aktif",
  );
  assert.deepEqual(
    legendModel.items.map((item) => item.label),
    ["Banding Agung", "Muara Dua"],
    "panel informasi harus menurunkan legenda unik dari polygon yang visible",
  );
  assert.ok(
    legendModel.items.every((item) => item.tone.startsWith("#")),
    "legenda polygon harus membawa tone warna untuk setiap item",
  );
}

run()
  .then(() => {
    console.log("[integration] map-boundary-panel-config: PASS");
  })
  .catch((error) => {
    console.error("[integration] map-boundary-panel-config: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
