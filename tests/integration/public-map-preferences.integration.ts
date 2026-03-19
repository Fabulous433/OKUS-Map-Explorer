import assert from "node:assert/strict";

async function loadPublicMapPreferencesModule() {
  try {
    return await import("../../client/src/lib/map/public-map-preferences.ts");
  } catch {
    return null;
  }
}

async function loadPublicMapStageModelModule() {
  try {
    return await import("../../client/src/lib/map/public-map-stage-model.ts");
  } catch {
    return null;
  }
}

async function run() {
  const preferencesModule = await loadPublicMapPreferencesModule();
  assert.ok(preferencesModule, "helper preferensi public map harus tersedia");

  const stageModelModule = await loadPublicMapStageModelModule();
  assert.ok(stageModelModule, "helper stage public map harus tersedia");

  const { loadPublicMapBaseMapPreference, savePublicMapBaseMapPreference } = preferencesModule as {
    loadPublicMapBaseMapPreference?: () => "osm" | "carto" | "esri" | null;
    savePublicMapBaseMapPreference?: (value: "osm" | "carto" | "esri") => void;
  };
  const {
    createPublicMapStageStatusModel,
    shouldPrefetchScopedDesaBoundary,
  } = stageModelModule as {
    createPublicMapStageStatusModel?: (params: {
      stageState: {
        stage: "kabupaten" | "kecamatan" | "desa";
        selectedKecamatan: { id: string; name: string; bounds: { minLat: number; minLng: number; maxLat: number; maxLng: number }; feature: unknown } | null;
        selectedDesa: { key: string; name: string; bounds: { minLat: number; minLng: number; maxLat: number; maxLng: number }; feature: unknown } | null;
        selectedTaxType: string;
      };
      scopeFeatureCount: number;
      markerCount: number;
    }) => {
      primary: string | null;
      secondary: string | null;
      filter: string | null;
    };
    shouldPrefetchScopedDesaBoundary?: (params: {
      stageState: {
        stage: "kabupaten" | "kecamatan" | "desa";
        selectedKecamatan: { id: string } | null;
      };
      prefetchedKecamatanId: string | null;
    }) => boolean;
  };

  assert.equal(typeof loadPublicMapBaseMapPreference, "function", "loader preferensi basemap wajib diexport");
  assert.equal(typeof savePublicMapBaseMapPreference, "function", "saver preferensi basemap wajib diexport");
  assert.equal(typeof createPublicMapStageStatusModel, "function", "helper status stage wajib diexport");
  assert.equal(typeof shouldPrefetchScopedDesaBoundary, "function", "helper prefetch desa wajib diexport");

  const store = new Map<string, string>();
  (
    globalThis as {
      localStorage?: {
        getItem: (key: string) => string | null;
        setItem: (key: string, value: string) => void;
      };
    }
  ).localStorage = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => {
      store.set(key, value);
    },
  };

  assert.equal(loadPublicMapBaseMapPreference!(), null, "tanpa preferensi tersimpan, loader harus mengembalikan null");

  savePublicMapBaseMapPreference!("esri");
  assert.equal(loadPublicMapBaseMapPreference!(), "esri", "preferensi basemap harus round-trip via localStorage");

  assert.deepEqual(
    createPublicMapStageStatusModel!({
      stageState: {
        stage: "desa",
        selectedKecamatan: {
          id: "1609040",
          name: "Muara Dua",
          bounds: { minLat: -4.2, minLng: 104, maxLat: -4, maxLng: 104.2 },
          feature: {},
        },
        selectedDesa: {
          key: "1609040:batu-belang-jaya",
          name: "Batu Belang Jaya",
          bounds: { minLat: -4.2, minLng: 104, maxLat: -4, maxLng: 104.2 },
          feature: {},
        },
        selectedTaxType: "Pajak Sarang Burung Walet",
      },
      scopeFeatureCount: 19,
      markerCount: 1,
    }),
    {
      primary: "19 desa",
      secondary: "1 OP aktif",
      filter: "WLT",
    },
    "status stage harus memberi konteks wilayah, OP aktif, dan singkatan filter",
  );

  assert.equal(
    shouldPrefetchScopedDesaBoundary!({
      stageState: {
        stage: "kabupaten",
        selectedKecamatan: null,
      },
      prefetchedKecamatanId: null,
    }),
    false,
    "prefetch scoped desa tidak perlu di root kabupaten",
  );

  assert.equal(
    shouldPrefetchScopedDesaBoundary!({
      stageState: {
        stage: "kecamatan",
        selectedKecamatan: { id: "1609040" },
      },
      prefetchedKecamatanId: null,
    }),
    true,
    "masuk kecamatan baru harus memicu prefetch desa scoped",
  );

  assert.equal(
    shouldPrefetchScopedDesaBoundary!({
      stageState: {
        stage: "desa",
        selectedKecamatan: { id: "1609040" },
      },
      prefetchedKecamatanId: "1609040",
    }),
    false,
    "jangan prefetch ulang bila kecamatan yang sama sudah diprefetch",
  );
}

run()
  .then(() => {
    console.log("[integration] public-map-preferences: PASS");
  })
  .catch((error) => {
    console.error("[integration] public-map-preferences: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
