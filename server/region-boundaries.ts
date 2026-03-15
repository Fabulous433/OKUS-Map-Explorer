import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import bbox from "@turf/bbox";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";

type GeoJsonGeometry = {
  type: string;
  coordinates: unknown;
};

type GeoJsonFeature = {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: GeoJsonGeometry;
};

type GeoJsonFeatureCollection = {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
};

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

type ActiveRegionBounds = {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
};

type ContainingFeature = {
  name: string;
  properties: Record<string, unknown>;
};

const regionDataDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
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
  return bundle.kabupaten.precise.features.some((feature) => booleanPointInPolygon([longitude, latitude], feature));
}

function findContainingFeature(
  collection: GeoJsonFeatureCollection,
  longitude: number,
  latitude: number,
  propertyKey: string,
): ContainingFeature | null {
  const feature = collection.features.find((item) => booleanPointInPolygon([longitude, latitude], item));
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

export async function getActiveRegionBounds(): Promise<ActiveRegionBounds> {
  const bundle = await getActiveRegionBundle();
  const [minLng, minLat, maxLng, maxLat] = bbox(bundle.kabupaten.precise);
  return {
    minLng,
    minLat,
    maxLng,
    maxLat,
  };
}
