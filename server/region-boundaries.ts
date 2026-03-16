import { readFile } from "node:fs/promises";
import path from "node:path";
import bbox from "@turf/bbox";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import type {
  GeoJsonFeature,
  GeoJsonFeatureCollection,
  RegionBoundaryBounds,
  RegionBoundaryLevel,
  RegionBoundaryPrecision,
  RegionBoundaryResponse,
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
  const [minLng, minLat, maxLng, maxLat] = bbox(bundle.kabupaten.precise as any);
  return {
    minLng,
    minLat,
    maxLng,
    maxLat,
  };
}

export async function getActiveRegionBoundary(
  level: RegionBoundaryLevel,
  precision: RegionBoundaryPrecision,
): Promise<RegionBoundaryResponse> {
  const bundle = await getActiveRegionBundle();
  const bounds = await getActiveRegionBounds();

  const boundary =
    level === "kabupaten"
      ? precision === "light"
        ? bundle.kabupaten.light
        : bundle.kabupaten.precise
      : precision === "light"
        ? bundle.kecamatan.light
        : bundle.kecamatan.precise;

  return {
    regionKey: bundle.regionKey,
    regionName: bundle.regionName,
    level,
    precision,
    bounds,
    boundary,
  };
}
