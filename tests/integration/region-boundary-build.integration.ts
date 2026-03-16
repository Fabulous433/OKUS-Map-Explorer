import assert from "node:assert/strict";

type GeoJsonFeature = {
  type: "Feature";
  properties?: Record<string, unknown> | null;
  geometry?: {
    type: string;
    coordinates?: unknown;
  } | null;
};

type GeoJsonFeatureCollection = {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
};

type RegionBoundaryBundle = {
  regionKey: string;
  assets: {
    kabupaten: {
      precise: GeoJsonFeatureCollection;
      light: GeoJsonFeatureCollection;
    };
    kecamatan: {
      precise: GeoJsonFeatureCollection;
      light: GeoJsonFeatureCollection;
    };
    desa: {
      precise: GeoJsonFeatureCollection;
      light: GeoJsonFeatureCollection;
    };
  };
};

async function loadRegionBoundaryBuildModule() {
  try {
    return await import("../../script/build-region-boundaries.ts");
  } catch {
    return null;
  }
}

function countCoordinatePairs(coordinates: unknown): number {
  if (!Array.isArray(coordinates)) {
    return 0;
  }

  if (
    coordinates.length >= 2 &&
    typeof coordinates[0] === "number" &&
    typeof coordinates[1] === "number"
  ) {
    return 1;
  }

  return coordinates.reduce((total, entry) => total + countCoordinatePairs(entry), 0);
}

function countFeatureCollectionCoordinates(collection: GeoJsonFeatureCollection) {
  return collection.features.reduce((total, feature) => {
    return total + countCoordinatePairs(feature.geometry?.coordinates);
  }, 0);
}

function assertAllInOkuSelatan(collection: GeoJsonFeatureCollection, message: string) {
  for (const feature of collection.features) {
    assert.equal(feature.properties?.WADMKK, "Ogan Komering Ulu Selatan", message);
  }
}

async function run() {
  const boundaryBuildModule = await loadRegionBoundaryBuildModule();
  assert.ok(boundaryBuildModule, "builder boundary region harus tersedia");

  const { buildRegionBoundaryBundle, loadRegionBoundaryBundle } = boundaryBuildModule as {
    buildRegionBoundaryBundle?: (input: { regionKey: string; writeFiles?: boolean }) => Promise<RegionBoundaryBundle>;
    loadRegionBoundaryBundle?: (regionKey: string) => Promise<RegionBoundaryBundle>;
  };

  assert.equal(typeof buildRegionBoundaryBundle, "function", "builder boundary region wajib diexport");
  assert.equal(typeof loadRegionBoundaryBundle, "function", "loader bundle boundary region wajib diexport");

  const builtBundle = await buildRegionBoundaryBundle!({
    regionKey: "okus",
    writeFiles: false,
  });
  assert.equal(builtBundle.regionKey, "okus", "builder harus mendukung region bundle okus");

  const loadedBundle = await loadRegionBoundaryBundle!("okus");
  assert.equal(loadedBundle.regionKey, "okus", "loader harus membaca region bundle okus dari disk");

  assert.equal(
    loadedBundle.assets.kabupaten.precise.features.length,
    1,
    "kabupaten.precise harus berisi tepat 1 feature OKU Selatan",
  );
  assert.equal(
    loadedBundle.assets.kecamatan.precise.features.length,
    19,
    "kecamatan.precise harus berisi tepat 19 feature OKU Selatan",
  );
  assert.ok(
    loadedBundle.assets.desa.precise.features.length >= 259,
    "desa.precise harus berisi minimal 259 feature OKU Selatan",
  );
  assert.ok(
    loadedBundle.assets.desa.light.features.length >= 259,
    "desa.light harus tetap memuat seluruh feature desa/kelurahan OKU Selatan",
  );

  assertAllInOkuSelatan(loadedBundle.assets.kabupaten.precise, "kabupaten.precise hanya boleh memuat OKU Selatan");
  assertAllInOkuSelatan(loadedBundle.assets.kecamatan.precise, "kecamatan.precise hanya boleh memuat OKU Selatan");
  assertAllInOkuSelatan(loadedBundle.assets.desa.precise, "desa.precise hanya boleh memuat OKU Selatan");
  assertAllInOkuSelatan(loadedBundle.assets.desa.light, "desa.light hanya boleh memuat OKU Selatan");

  assert.ok(
    countFeatureCollectionCoordinates(loadedBundle.assets.kabupaten.light) <
      countFeatureCollectionCoordinates(loadedBundle.assets.kabupaten.precise),
    "kabupaten.light harus lebih ringan dari kabupaten.precise",
  );
  assert.ok(
    countFeatureCollectionCoordinates(loadedBundle.assets.kecamatan.light) <
      countFeatureCollectionCoordinates(loadedBundle.assets.kecamatan.precise),
    "kecamatan.light harus lebih ringan dari kecamatan.precise",
  );
  assert.ok(
    countFeatureCollectionCoordinates(loadedBundle.assets.desa.light) <
      countFeatureCollectionCoordinates(loadedBundle.assets.desa.precise),
    "desa.light harus lebih ringan dari desa.precise",
  );

  assert.deepEqual(
    loadedBundle.assets.kabupaten.precise,
    builtBundle.assets.kabupaten.precise,
    "kabupaten.precise di disk harus deterministik terhadap hasil builder",
  );
  assert.deepEqual(
    loadedBundle.assets.kecamatan.precise,
    builtBundle.assets.kecamatan.precise,
    "kecamatan.precise di disk harus deterministik terhadap hasil builder",
  );
  assert.deepEqual(
    loadedBundle.assets.desa.precise,
    builtBundle.assets.desa.precise,
    "desa.precise di disk harus deterministik terhadap hasil builder",
  );
  assert.deepEqual(
    loadedBundle.assets.kabupaten.light,
    builtBundle.assets.kabupaten.light,
    "kabupaten.light di disk harus deterministik terhadap hasil builder",
  );
  assert.deepEqual(
    loadedBundle.assets.kecamatan.light,
    builtBundle.assets.kecamatan.light,
    "kecamatan.light di disk harus deterministik terhadap hasil builder",
  );
  assert.deepEqual(
    loadedBundle.assets.desa.light,
    builtBundle.assets.desa.light,
    "desa.light di disk harus deterministik terhadap hasil builder",
  );
}

run()
  .then(() => {
    console.log("[integration] region-boundary-build: PASS");
  })
  .catch((error) => {
    console.error("[integration] region-boundary-build: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
