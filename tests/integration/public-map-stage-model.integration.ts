import assert from "node:assert/strict";

import type { BoundaryFeatureSelection } from "../../client/src/lib/map/public-boundary-layer-model";
import type { MapViewportMarker } from "../../client/src/lib/map/wfs-types";

async function loadPublicMapStageModelModule() {
  try {
    return await import("../../client/src/lib/map/public-map-stage-model.ts");
  } catch {
    return null;
  }
}

function createSelection(params: {
  level: "kecamatan" | "desa";
  featureName: string;
  kecamatanName?: string;
}): BoundaryFeatureSelection {
  return {
    level: params.level,
    featureName: params.featureName,
    kecamatanName: params.kecamatanName ?? params.featureName,
    bounds: {
      minLng: 104,
      minLat: -4.6,
      maxLng: 104.1,
      maxLat: -4.5,
    },
    feature: {
      type: "Feature",
      properties: {
        WADMKC: params.kecamatanName ?? params.featureName,
        WADMKD: params.level === "desa" ? params.featureName : undefined,
      },
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [104, -4.6],
            [104.1, -4.6],
            [104.1, -4.5],
            [104, -4.5],
            [104, -4.6],
          ],
        ],
      },
    },
  };
}

async function run() {
  const stageModelModule = await loadPublicMapStageModelModule();
  assert.ok(stageModelModule, "helper stage model public map harus tersedia");

  const {
    createDefaultPublicMapStageState,
    drillIntoKecamatanStage,
    drillIntoDesaStage,
    stepBackPublicMapStage,
    createPublicMapStageHeaderModel,
    createPublicMapVisibleMarkers,
    shouldActivatePublicMapMarkers,
    extractPublicMapTaxTypeOptions,
    createPublicMapTaxFilterLabelModel,
    shouldResetPublicMapTaxType,
    filterPublicMapMarkersByTaxType,
    createSingleFeatureCollection,
    getPublicMapMarkerQueryBounds,
    getPublicMapBoundaryPresentation,
    getPublicMapDesaMarkerFocusTarget,
    getPublicMapStageConstraintBounds,
    getPublicMapStageViewportPadding,
    getPublicMapStageViewportPlan,
  } = stageModelModule as {
    createDefaultPublicMapStageState?: () => {
      stage: "kabupaten" | "kecamatan" | "desa";
      selectedKecamatan: null | { id: string; name: string };
      selectedDesa: null | { key: string; name: string };
      selectedTaxType: string;
    };
    drillIntoKecamatanStage?: (params: {
      current: ReturnType<NonNullable<typeof createDefaultPublicMapStageState>>;
      selection: BoundaryFeatureSelection;
      kecamatanId: string;
    }) => ReturnType<NonNullable<typeof createDefaultPublicMapStageState>>;
    drillIntoDesaStage?: (params: {
      current: ReturnType<NonNullable<typeof createDefaultPublicMapStageState>>;
      selection: BoundaryFeatureSelection;
    }) => ReturnType<NonNullable<typeof createDefaultPublicMapStageState>>;
    stepBackPublicMapStage?: (
      current: ReturnType<NonNullable<typeof createDefaultPublicMapStageState>>,
    ) => ReturnType<NonNullable<typeof createDefaultPublicMapStageState>>;
    createPublicMapStageHeaderModel?: (params: {
      stageState: ReturnType<NonNullable<typeof createDefaultPublicMapStageState>>;
      regionName: string;
      markerCount: number;
    }) => {
      title: string;
      subtitle: string;
      helperText: string;
      backVisible: boolean;
    };
    createPublicMapVisibleMarkers?: (params: {
      stageState: ReturnType<NonNullable<typeof createDefaultPublicMapStageState>>;
      hasFocusOverride: boolean;
      markers: MapViewportMarker[];
    }) => MapViewportMarker[];
    shouldActivatePublicMapMarkers?: (params: {
      stageState: ReturnType<NonNullable<typeof createDefaultPublicMapStageState>>;
      hasFocusOverride: boolean;
    }) => boolean;
    extractPublicMapTaxTypeOptions?: (markers: MapViewportMarker[]) => string[];
    createPublicMapTaxFilterLabelModel?: (taxType: string) => {
      full: string;
      compact: string;
    };
    shouldResetPublicMapTaxType?: (params: {
      selectedTaxType: string;
      availableTaxTypeOptions: string[];
      stageScopedMarkerCount: number;
    }) => boolean;
    filterPublicMapMarkersByTaxType?: (params: {
      markers: MapViewportMarker[];
      selectedTaxType: string;
    }) => MapViewportMarker[];
    createSingleFeatureCollection?: (selection: BoundaryFeatureSelection) => {
      type: "FeatureCollection";
      features: unknown[];
    };
    getPublicMapMarkerQueryBounds?: (params: {
      stageState: ReturnType<NonNullable<typeof createDefaultPublicMapStageState>>;
      viewportBbox: {
        minLng: number;
        minLat: number;
        maxLng: number;
        maxLat: number;
      } | null;
      hasFocusOverride: boolean;
    }) => {
      minLng: number;
      minLat: number;
      maxLng: number;
      maxLat: number;
    } | null;
    getPublicMapBoundaryPresentation?: (params: {
      stageState: ReturnType<NonNullable<typeof createDefaultPublicMapStageState>>;
      hasKabupatenBoundary: boolean;
      hasKecamatanBoundary: boolean;
      hasDesaBoundary: boolean;
    }) => {
      showKabupaten: boolean;
      showKecamatan: boolean;
      showDesa: boolean;
      desaMode: "none" | "scoped" | "focused-scoped";
    };
    getPublicMapStageConstraintBounds?: (params: {
      stageState: ReturnType<NonNullable<typeof createDefaultPublicMapStageState>>;
      kabupatenBounds: {
        minLng: number;
        minLat: number;
        maxLng: number;
        maxLat: number;
      } | null;
    }) => {
      minLng: number;
      minLat: number;
      maxLng: number;
      maxLat: number;
    } | null;
    getPublicMapStageViewportPadding?: (
      stage: "kabupaten" | "kecamatan" | "desa",
      compactViewport: boolean,
    ) => {
      paddingTopLeft: [number, number];
      paddingBottomRight: [number, number];
    };
    getPublicMapStageViewportPlan?: (params: {
      stage: "kabupaten" | "kecamatan" | "desa";
      baseMapMaxZoom: number;
    }) => {
      mode: "bounds" | "center";
      maxZoom: number;
    };
    getPublicMapDesaMarkerFocusTarget?: (params: {
      stageState: ReturnType<NonNullable<typeof createDefaultPublicMapStageState>>;
      markers: MapViewportMarker[];
    }) => { lat: number; lng: number } | null;
  };

  assert.equal(typeof createDefaultPublicMapStageState, "function", "factory state stage public map wajib diexport");
  assert.equal(typeof drillIntoKecamatanStage, "function", "helper drill kecamatan wajib diexport");
  assert.equal(typeof drillIntoDesaStage, "function", "helper drill desa wajib diexport");
  assert.equal(typeof stepBackPublicMapStage, "function", "helper tombol kembali wajib diexport");
  assert.equal(typeof createPublicMapStageHeaderModel, "function", "helper header stage wajib diexport");
  assert.equal(typeof createPublicMapVisibleMarkers, "function", "helper visible marker per stage wajib diexport");
  assert.equal(typeof shouldActivatePublicMapMarkers, "function", "helper gating marker wajib diexport");
  assert.equal(typeof extractPublicMapTaxTypeOptions, "function", "helper opsi jenis pajak wajib diexport");
  assert.equal(typeof createPublicMapTaxFilterLabelModel, "function", "helper label chip pajak publik wajib diexport");
  assert.equal(typeof shouldResetPublicMapTaxType, "function", "helper reset filter pajak wajib diexport");
  assert.equal(typeof filterPublicMapMarkersByTaxType, "function", "helper filter jenis pajak wajib diexport");
  assert.equal(typeof createSingleFeatureCollection, "function", "helper selected feature collection wajib diexport");
  assert.equal(typeof getPublicMapMarkerQueryBounds, "function", "helper bbox query marker per stage wajib diexport");
  assert.equal(typeof getPublicMapBoundaryPresentation, "function", "helper presentasi boundary per stage wajib diexport");
  assert.equal(typeof getPublicMapDesaMarkerFocusTarget, "function", "helper fokus marker desa wajib diexport");
  assert.equal(typeof getPublicMapStageConstraintBounds, "function", "helper bounds constraint per stage wajib diexport");
  assert.equal(typeof getPublicMapStageViewportPadding, "function", "helper padding viewport per stage wajib diexport");
  assert.equal(typeof getPublicMapStageViewportPlan, "function", "helper plan viewport per stage wajib diexport");

  const initialState = createDefaultPublicMapStageState!();
  assert.deepEqual(initialState, {
    stage: "kabupaten",
    selectedKecamatan: null,
    selectedDesa: null,
    selectedTaxType: "all",
  });

  const kecamatanSelection = createSelection({
    level: "kecamatan",
    featureName: "Simpang",
  });
  const afterKecamatan = drillIntoKecamatanStage!({
    current: initialState,
    selection: kecamatanSelection,
    kecamatanId: "1609050",
  });
  assert.equal(afterKecamatan.stage, "kecamatan");
  assert.equal(afterKecamatan.selectedKecamatan?.id, "1609050");
  assert.equal(afterKecamatan.selectedKecamatan?.name, "Simpang");
  assert.equal(afterKecamatan.selectedDesa, null);
  assert.equal(afterKecamatan.selectedTaxType, "all");

  const desaSelection = createSelection({
    level: "desa",
    featureName: "Pelangki",
    kecamatanName: "Simpang",
  });
  const afterDesa = drillIntoDesaStage!({
    current: afterKecamatan,
    selection: desaSelection,
  });
  assert.equal(afterDesa.stage, "desa");
  assert.equal(afterDesa.selectedKecamatan?.name, "Simpang");
  assert.equal(afterDesa.selectedDesa?.key, "1609050:pelangki");
  assert.equal(afterDesa.selectedDesa?.name, "Pelangki");

  const afterBackToKecamatan = stepBackPublicMapStage!(afterDesa);
  assert.equal(afterBackToKecamatan.stage, "kecamatan");
  assert.equal(afterBackToKecamatan.selectedKecamatan?.name, "Simpang");
  assert.equal(afterBackToKecamatan.selectedDesa, null);

  const afterBackToKabupaten = stepBackPublicMapStage!(afterBackToKecamatan);
  assert.deepEqual(afterBackToKabupaten, initialState);

  assert.deepEqual(
    createPublicMapTaxFilterLabelModel!("all"),
    {
      full: "Semua OP",
      compact: "Semua",
    },
    "chip all mobile harus disingkat tanpa mengubah label desktop",
  );
  assert.deepEqual(
    createPublicMapTaxFilterLabelModel!("Pajak Sarang Burung Walet"),
    {
      full: "Pajak Sarang Burung Walet",
      compact: "WLT",
    },
    "chip jenis pajak mobile harus memakai singkatan ringkas yang konsisten dengan marker",
  );
  assert.deepEqual(
    createPublicMapTaxFilterLabelModel!("Pajak Baru Contoh"),
    {
      full: "Pajak Baru Contoh",
      compact: "PBC",
    },
    "jenis pajak yang belum punya mapping khusus harus tetap dipendekkan dengan inisial",
  );
  assert.equal(
    shouldResetPublicMapTaxType!({
      selectedTaxType: "Pajak Sarang Burung Walet",
      availableTaxTypeOptions: [],
      stageScopedMarkerCount: 0,
    }),
    false,
    "reload stage desa tidak boleh menghapus filter aktif hanya karena marker scoped belum selesai dimuat",
  );
  assert.equal(
    shouldResetPublicMapTaxType!({
      selectedTaxType: "Pajak Sarang Burung Walet",
      availableTaxTypeOptions: ["Pajak Reklame"],
      stageScopedMarkerCount: 2,
    }),
    true,
    "filter aktif boleh direset bila marker scoped sudah ada tetapi jenis pajaknya memang tidak tersedia",
  );

  assert.deepEqual(
    createPublicMapStageHeaderModel!({
      stageState: initialState,
      regionName: "OKU Selatan",
      markerCount: 0,
    }),
    {
      title: "OKU Selatan",
      subtitle: "Tahap Kabupaten",
      helperText: "Pilih satu kecamatan untuk masuk ke wilayahnya",
      backVisible: false,
    },
    "header root harus mengarahkan user memilih kecamatan",
  );
  assert.deepEqual(
    createPublicMapStageHeaderModel!({
      stageState: afterKecamatan,
      regionName: "OKU Selatan",
      markerCount: 0,
    }),
    {
      title: "Simpang",
      subtitle: "Tahap Kecamatan",
      helperText: "Pilih desa/kelurahan untuk membuka detail wilayah",
      backVisible: true,
    },
    "header kecamatan harus mengarahkan user memilih desa",
  );
  assert.deepEqual(
    createPublicMapStageHeaderModel!({
      stageState: afterDesa,
      regionName: "OKU Selatan",
      markerCount: 3,
    }),
    {
      title: "Pelangki",
      subtitle: "Tahap Desa / Kelurahan",
      helperText: "Filter jenis pajak lalu pilih marker OP yang ingin dilihat",
      backVisible: true,
    },
    "header desa harus mengarahkan user memfilter marker OP",
  );

  assert.equal(
    shouldActivatePublicMapMarkers!({
      stageState: initialState,
      hasFocusOverride: false,
    }),
    false,
    "marker root tidak boleh aktif",
  );
  assert.equal(
    shouldActivatePublicMapMarkers!({
      stageState: afterKecamatan,
      hasFocusOverride: false,
    }),
    false,
    "marker pada tahap kecamatan tidak boleh aktif",
  );
  assert.equal(
    shouldActivatePublicMapMarkers!({
      stageState: afterDesa,
      hasFocusOverride: false,
    }),
    true,
    "marker baru boleh aktif pada tahap desa",
  );
  assert.equal(
    shouldActivatePublicMapMarkers!({
      stageState: initialState,
      hasFocusOverride: true,
    }),
    true,
    "deep link fokus tetap boleh mengaktifkan marker meski belum masuk tahap desa",
  );

  const markerList: MapViewportMarker[] = [
    {
      id: 1,
      focusKey: "1",
      namaOp: "OP Walet",
      nopd: "13.01.01.0008",
      jenisPajak: "Pajak Sarang Burung Walet",
      alamatOp: "Pelangki",
      latitude: -4.54,
      longitude: 104.06,
    },
    {
      id: 2,
      focusKey: "2",
      namaOp: "OP Reklame",
      nopd: "13.01.01.0009",
      jenisPajak: "Pajak Reklame",
      alamatOp: "Pelangki",
      latitude: -4.541,
      longitude: 104.061,
    },
    {
      id: 3,
      focusKey: "3",
      namaOp: "OP Walet 2",
      nopd: "13.01.01.0010",
      jenisPajak: "Pajak Sarang Burung Walet",
      alamatOp: "Pelangki",
      latitude: -4.542,
      longitude: 104.062,
    },
  ];

  assert.deepEqual(extractPublicMapTaxTypeOptions!(markerList), ["Pajak Reklame", "Pajak Sarang Burung Walet"]);
  assert.deepEqual(
    filterPublicMapMarkersByTaxType!({
      markers: markerList,
      selectedTaxType: "Pajak Sarang Burung Walet",
    }).map((item) => item.id),
    [1, 3],
    "filter jenis pajak desa harus membatasi marker sesuai chip yang dipilih",
  );
  assert.equal(
    filterPublicMapMarkersByTaxType!({
      markers: markerList,
      selectedTaxType: "all",
    }).length,
    3,
    "chip all tidak boleh membuang marker",
  );
  assert.equal(
    createPublicMapVisibleMarkers!({
      stageState: initialState,
      hasFocusOverride: false,
      markers: markerList,
    }).length,
    0,
    "marker stale tidak boleh bocor pada tahap kabupaten saat query marker off",
  );
  assert.equal(
    createPublicMapVisibleMarkers!({
      stageState: afterKecamatan,
      hasFocusOverride: false,
      markers: markerList,
    }).length,
    0,
    "marker stale tidak boleh bocor pada tahap kecamatan saat query marker off",
  );
  assert.deepEqual(
    createPublicMapVisibleMarkers!({
      stageState: {
        ...afterDesa,
        selectedTaxType: "Pajak Sarang Burung Walet",
      },
      hasFocusOverride: false,
      markers: markerList,
    }).map((item) => item.id),
    [1, 3],
    "marker visible pada tahap desa harus tetap mematuhi filter jenis pajak aktif",
  );
  assert.equal(
    createPublicMapVisibleMarkers!({
      stageState: afterDesa,
      hasFocusOverride: true,
      markers: [
        {
          id: 99,
          focusKey: "99",
          namaOp: "OP Fokus",
          nopd: "13.01.01.0099",
          jenisPajak: "Pajak Reklame",
          alamatOp: "Luar polygon desa",
          latitude: -4.3,
          longitude: 104.8,
        },
      ],
    }).length,
    1,
    "deep-link fokus tidak boleh menyembunyikan marker target hanya karena filter polygon desa",
  );
  assert.equal(
    createPublicMapVisibleMarkers!({
      stageState: initialState,
      hasFocusOverride: true,
      markers: markerList,
    }).length,
    3,
    "deep-link fokus tetap boleh menampilkan marker meski user belum masuk tahap desa",
  );
  assert.deepEqual(
    getPublicMapMarkerQueryBounds!({
      stageState: afterDesa,
      viewportBbox: {
        minLng: 104.5,
        minLat: -4.3,
        maxLng: 104.6,
        maxLat: -4.2,
      },
      hasFocusOverride: false,
    }),
    afterDesa.selectedDesa?.bounds ?? null,
    "query marker tahap desa harus memakai bounds desa aktif, bukan viewport sempit saat zoom paling dekat",
  );
  assert.deepEqual(
    getPublicMapMarkerQueryBounds!({
      stageState: afterDesa,
      viewportBbox: {
        minLng: 104.5,
        minLat: -4.3,
        maxLng: 104.6,
        maxLat: -4.2,
      },
      hasFocusOverride: true,
    }),
    {
      minLng: 104.5,
      minLat: -4.3,
      maxLng: 104.6,
      maxLat: -4.2,
    },
    "deep-link fokus harus tetap memakai viewport aktual agar marker target tetap bisa terambil",
  );
  assert.deepEqual(
    getPublicMapMarkerQueryBounds!({
      stageState: afterKecamatan,
      viewportBbox: {
        minLng: 104.5,
        minLat: -4.3,
        maxLng: 104.6,
        maxLat: -4.2,
      },
      hasFocusOverride: false,
    }),
    {
      minLng: 104.5,
      minLat: -4.3,
      maxLng: 104.6,
      maxLat: -4.2,
    },
    "tahap selain desa harus tetap memakai viewport bbox biasa",
  );
  assert.deepEqual(
    getPublicMapDesaMarkerFocusTarget!({
      stageState: afterDesa,
      markers: markerList,
    }),
    {
      lat: markerList[0]!.latitude,
      lng: markerList[0]!.longitude,
    },
    "fokus tahap desa harus boleh snap ke marker pertama agar OP tetap terlihat setelah zoom maksimal",
  );

  const singleFeatureCollection = createSingleFeatureCollection!(desaSelection);
  assert.equal(singleFeatureCollection.features.length, 1, "stage desa harus bisa merender hanya feature desa aktif");
  assert.deepEqual(
    getPublicMapStageConstraintBounds!({
      stageState: afterDesa,
      kabupatenBounds: {
        minLng: 103.8,
        minLat: -4.8,
        maxLng: 104.4,
        maxLat: -4.2,
      },
    }),
    afterKecamatan.selectedKecamatan?.bounds ?? null,
    "constraint tahap desa harus memakai bounds kecamatan induk agar zoom fokus desa tidak dipaksa melebar",
  );

  assert.deepEqual(
    getPublicMapBoundaryPresentation!({
      stageState: initialState,
      hasKabupatenBoundary: true,
      hasKecamatanBoundary: true,
      hasDesaBoundary: false,
    }),
    {
      showKabupaten: true,
      showKecamatan: true,
      showDesa: false,
      desaMode: "none",
    },
    "root map harus menampilkan konteks kabupaten dan kecamatan",
  );
  assert.deepEqual(
    getPublicMapBoundaryPresentation!({
      stageState: afterKecamatan,
      hasKabupatenBoundary: true,
      hasKecamatanBoundary: true,
      hasDesaBoundary: true,
    }),
    {
      showKabupaten: true,
      showKecamatan: false,
      showDesa: true,
      desaMode: "scoped",
    },
    "tahap kecamatan harus memfokuskan polygon desa scoped",
  );
  assert.deepEqual(
    getPublicMapBoundaryPresentation!({
      stageState: afterDesa,
      hasKabupatenBoundary: true,
      hasKecamatanBoundary: true,
      hasDesaBoundary: true,
    }),
    {
      showKabupaten: true,
      showKecamatan: false,
      showDesa: true,
      desaMode: "focused-scoped",
    },
    "tahap desa harus tetap merender desa scoped dengan desa aktif transparan",
  );
  assert.deepEqual(
    getPublicMapStageViewportPlan!({
      stage: "kabupaten",
      baseMapMaxZoom: 19,
    }),
    {
      mode: "bounds",
      maxZoom: 11,
    },
    "tahap kabupaten harus tetap memakai fit bounds biasa",
  );
  assert.deepEqual(
    getPublicMapStageViewportPlan!({
      stage: "desa",
      baseMapMaxZoom: 16,
    }),
    {
      mode: "center",
      maxZoom: 16,
    },
    "tahap desa harus masuk langsung ke zoom paling dekat yang diizinkan basemap",
  );
  assert.deepEqual(
    getPublicMapStageViewportPadding!("kabupaten", true),
    {
      paddingTopLeft: [20, 120],
      paddingBottomRight: [20, 56],
    },
    "viewport mobile root harus memberi ruang untuk header tanpa mendorong user ke peta dunia",
  );
  assert.deepEqual(
    getPublicMapStageViewportPadding!("desa", true),
    {
      paddingTopLeft: [24, 320],
      paddingBottomRight: [24, 96],
    },
    "viewport mobile desa harus memberi ruang lebih besar agar marker tidak tertutup overlay atas",
  );
  assert.deepEqual(
    getPublicMapStageViewportPadding!("desa", false),
    {
      paddingTopLeft: [44, 148],
      paddingBottomRight: [44, 52],
    },
    "viewport desktop desa tetap perlu offset top agar popup dan marker tidak mentok shell",
  );
}

run()
  .then(() => {
    console.log("[integration] public-map-stage-model: PASS");
  })
  .catch((error) => {
    console.error("[integration] public-map-stage-model: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
