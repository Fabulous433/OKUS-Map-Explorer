import { readFile } from "node:fs/promises";
import path from "node:path";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import type {
  GeoJsonFeature,
  GeoJsonFeatureCollection,
  RegionBoundaryBounds,
  RegionBoundaryLevel,
  RegionBoundaryPrecision,
  RegionBoundaryResponse,
  RegionBoundaryScope,
} from "@shared/region-boundary";

type ActiveRegionBundle = {
  regionKey: "okus";
  regionName: "OKU Selatan";
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

type ContainingFeature = {
  name: string;
  properties: Record<string, unknown>;
};

const regionDataDir = path.join(
  process.cwd(),
  "server",
  "data",
  "regions",
  "okus",
);

let activeRegionBundlePromise: Promise<ActiveRegionBundle> | null = null;

async function readCollection(fileName: string) {
  const raw = await readFile(path.join(regionDataDir, fileName), "utf-8");
  return JSON.parse(raw) as GeoJsonFeatureCollection;
}

async function loadActiveRegionBundle(): Promise<ActiveRegionBundle> {
  return {
    regionKey: "okus",
    regionName: "OKU Selatan",
    kabupaten: {
      precise: await readCollection("kabupaten.precise.geojson"),
      light: await readCollection("kabupaten.light.geojson"),
    },
    kecamatan: {
      precise: await readCollection("kecamatan.precise.geojson"),
      light: await readCollection("kecamatan.light.geojson"),
    },
    desa: {
      precise: await readCollection("desa.precise.geojson"),
      light: await readCollection("desa.light.geojson"),
    },
  };
}

export async function getActiveRegionBundle() {
  if (!activeRegionBundlePromise) {
    activeRegionBundlePromise = loadActiveRegionBundle();
  }

  return activeRegionBundlePromise;
}

export async function isPointInsideActiveKabupaten(longitude: number, latitude: number) {
  const bundle = await getActiveRegionBundle();
  return bundle.kabupaten.precise.features.some((feature) =>
    booleanPointInPolygon([longitude, latitude], feature as any),
  );
}

function findContainingFeature(
  collection: GeoJsonFeatureCollection,
  longitude: number,
  latitude: number,
  propertyKey: string,
): ContainingFeature | null {
  const feature = collection.features.find((item) => booleanPointInPolygon([longitude, latitude], item as any));
  if (!feature) {
    return null;
  }

  const name = String(feature.properties[propertyKey] ?? "").trim();
  return {
    name,
    properties: feature.properties,
  };
}

export async function findContainingKecamatan(longitude: number, latitude: number) {
  const bundle = await getActiveRegionBundle();
  return findContainingFeature(bundle.kecamatan.precise, longitude, latitude, "WADMKC");
}

export async function findContainingDesa(longitude: number, latitude: number) {
  const bundle = await getActiveRegionBundle();
  return findContainingFeature(bundle.desa.precise, longitude, latitude, "WADMKD");
}

export async function getActiveRegionBounds(): Promise<RegionBoundaryBounds> {
  const bundle = await getActiveRegionBundle();
  return getBoundaryBounds(bundle.kabupaten.precise);
}

function getBoundaryBounds(boundary: GeoJsonFeatureCollection): RegionBoundaryBounds {
  let minLng = Number.POSITIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;

  const updateBoundsFromCoordinates = (coordinates: unknown) => {
    if (!Array.isArray(coordinates)) {
      return;
    }

    if (
      coordinates.length >= 2 &&
      typeof coordinates[0] === "number" &&
      typeof coordinates[1] === "number"
    ) {
      const [lng, lat] = coordinates;
      minLng = Math.min(minLng, lng);
      minLat = Math.min(minLat, lat);
      maxLng = Math.max(maxLng, lng);
      maxLat = Math.max(maxLat, lat);
      return;
    }

    for (const entry of coordinates) {
      updateBoundsFromCoordinates(entry);
    }
  };

  for (const feature of boundary.features) {
    updateBoundsFromCoordinates(feature.geometry?.coordinates);
  }

  if (![minLng, minLat, maxLng, maxLat].every(Number.isFinite)) {
    throw new Error("Boundary collection does not contain valid coordinates");
  }

  return {
    minLng,
    minLat,
    maxLng,
    maxLat,
  };
}

function normalizeRegionName(value: string) {
  return value.trim().toLocaleLowerCase("id").replace(/\s+/g, "");
}

function filterDesaBoundaryByKecamatan(
  boundary: GeoJsonFeatureCollection,
  kecamatanName: string,
): GeoJsonFeatureCollection {
  const normalizedKecamatanName = normalizeRegionName(kecamatanName);
  return {
    type: "FeatureCollection",
    features: boundary.features.filter((feature) => {
      return normalizeRegionName(String(feature.properties.WADMKC ?? "")) === normalizedKecamatanName;
    }),
  };
}

export async function getActiveRegionBoundary(
  level: RegionBoundaryLevel,
  precision: RegionBoundaryPrecision,
  scope?: RegionBoundaryScope,
): Promise<RegionBoundaryResponse> {
  const bundle = await getActiveRegionBundle();
  const boundary =
    level === "kabupaten"
      ? precision === "light"
        ? bundle.kabupaten.light
        : bundle.kabupaten.precise
      : level === "kecamatan"
        ? precision === "light"
          ? bundle.kecamatan.light
          : bundle.kecamatan.precise
        : filterDesaBoundaryByKecamatan(
            precision === "light" ? bundle.desa.light : bundle.desa.precise,
            String(scope?.kecamatanName ?? "").trim(),
          );

  return {
    regionKey: bundle.regionKey,
    regionName: bundle.regionName,
    level,
    precision,
    bounds: getBoundaryBounds(boundary),
    boundary,
    scope,
  };
}
