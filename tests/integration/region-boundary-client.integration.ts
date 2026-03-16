import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

import { geoJsonFeatureCollectionSchema } from "@shared/region-boundary";

async function loadRegionBoundaryClientModule() {
  try {
    return await import("../../client/src/lib/map/region-boundary-client.ts");
  } catch {
    return null;
  }
}

async function run() {
  const regionBoundaryClientModule = await loadRegionBoundaryClientModule();
  assert.ok(regionBoundaryClientModule, "helper client boundary region harus tersedia");

  const { createRegionBoundaryClientState, isCoordinateInsideRegionBoundary } = regionBoundaryClientModule as {
    createRegionBoundaryClientState?: (boundary: unknown) => {
      geoJson: unknown;
      bbox: {
        minLng: number;
        minLat: number;
        maxLng: number;
        maxLat: number;
      };
      maxBounds: [[number, number], [number, number]];
    };
    isCoordinateInsideRegionBoundary?: (boundary: unknown, point: { lat: number; lng: number }) => boolean;
  };

  assert.equal(typeof createRegionBoundaryClientState, "function", "factory state boundary client wajib diexport");
  assert.equal(typeof isCoordinateInsideRegionBoundary, "function", "checker point-in-boundary client wajib diexport");

  const rawKabupatenLight = await readFile(
    new URL("../../server/data/regions/okus/kabupaten.light.geojson", import.meta.url),
    "utf-8",
  );
  const kabupatenLightBoundary = geoJsonFeatureCollectionSchema.parse(JSON.parse(rawKabupatenLight));

  const clientState = createRegionBoundaryClientState!(kabupatenLightBoundary);
  const normalizedBoundary = geoJsonFeatureCollectionSchema.parse(clientState.geoJson);

  assert.equal(normalizedBoundary.features.length, 1, "boundary client harus tetap memuat 1 polygon kabupaten");
  assert.deepEqual(
    clientState.maxBounds,
    [
      [clientState.bbox.minLat, clientState.bbox.minLng],
      [clientState.bbox.maxLat, clientState.bbox.maxLng],
    ],
    "max-bounds harus diturunkan langsung dari bbox boundary kabupaten",
  );
  assert.ok(clientState.bbox.minLng < clientState.bbox.maxLng, "bbox longitude kabupaten harus valid");
  assert.ok(clientState.bbox.minLat < clientState.bbox.maxLat, "bbox latitude kabupaten harus valid");

  assert.equal(
    isCoordinateInsideRegionBoundary!(normalizedBoundary, {
      lat: -4.5348497,
      lng: 104.0736724,
    }),
    true,
    "helper boundary client harus menerima titik di dalam OKU Selatan",
  );

  assert.equal(
    isCoordinateInsideRegionBoundary!(normalizedBoundary, {
      lat: -2.99093,
      lng: 104.75655,
    }),
    false,
    "helper boundary client harus menolak titik di luar OKU Selatan",
  );
}

run()
  .then(() => {
    console.log("[integration] region-boundary-client: PASS");
  })
  .catch((error) => {
    console.error("[integration] region-boundary-client: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
