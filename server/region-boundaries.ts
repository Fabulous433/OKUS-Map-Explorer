import { readFile } from "node:fs/promises";
import path from "node:path";
import { booleanPointInPolygon } from "@turf/boolean-point-in-polygon";
import { and, desc, eq } from "drizzle-orm";
import type {
  GeoJsonFeature,
  GeoJsonFeatureCollection,
  RegionBoundaryBounds,
  RegionBoundaryLevel,
  RegionBoundaryPrecision,
  RegionBoundaryResponse,
  RegionBoundaryScope,
} from "@shared/region-boundary";
import { regionBoundaryRevision, regionBoundaryRevisionFeature } from "@shared/schema";
import { mergePublishedDesaOverrides, type PublishedBoundaryFeature } from "./region-boundary-overrides";

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
let mergedDesaPreciseBoundaryPromise: Promise<GeoJsonFeatureCollection> | null = null;
let mergedDesaLightBoundaryPromise: Promise<GeoJsonFeatureCollection> | null = null;

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

export function invalidateActiveRegionBoundaryCache() {
  activeRegionBundlePromise = null;
  mergedDesaPreciseBoundaryPromise = null;
  mergedDesaLightBoundaryPromise = null;
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
  const boundary = await getMergedDesaBoundary("precise");
  return findContainingFeature(boundary, longitude, latitude, "WADMKD");
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

async function loadPublishedDesaOverrides(): Promise<PublishedBoundaryFeature[]> {
  const { db } = await import("./storage");
  const rows = await db
    .select({
      revisionId: regionBoundaryRevision.id,
      publishedAt: regionBoundaryRevision.publishedAt,
      boundaryKey: regionBoundaryRevisionFeature.boundaryKey,
      kecamatanId: regionBoundaryRevisionFeature.kecamatanId,
      kelurahanId: regionBoundaryRevisionFeature.kelurahanId,
      namaDesa: regionBoundaryRevisionFeature.namaDesa,
      geometry: regionBoundaryRevisionFeature.geometry,
    })
    .from(regionBoundaryRevisionFeature)
    .innerJoin(regionBoundaryRevision, eq(regionBoundaryRevisionFeature.revisionId, regionBoundaryRevision.id))
    .where(
      and(
        eq(regionBoundaryRevision.regionKey, "okus"),
        eq(regionBoundaryRevision.level, "desa"),
        eq(regionBoundaryRevision.status, "published"),
      ),
    )
    .orderBy(desc(regionBoundaryRevision.publishedAt), desc(regionBoundaryRevision.id), desc(regionBoundaryRevisionFeature.id));

  return collectLatestPublishedBoundaryFeatures(rows);
}

function collectLatestPublishedBoundaryFeatures(
  rows: Array<{
    boundaryKey: string;
    kecamatanId: string;
    kelurahanId: string;
    namaDesa: string;
    geometry: unknown;
  }>,
) {
  const overrideByBoundaryKey = new Map<string, PublishedBoundaryFeature>();
  for (const row of rows) {
    if (!overrideByBoundaryKey.has(row.boundaryKey)) {
      overrideByBoundaryKey.set(row.boundaryKey, {
        boundaryKey: row.boundaryKey,
        kecamatanId: row.kecamatanId,
        kelurahanId: row.kelurahanId,
        namaDesa: row.namaDesa,
        geometry: row.geometry as PublishedBoundaryFeature["geometry"],
      });
    }
  }

  return Array.from(overrideByBoundaryKey.values());
}

async function getMergedDesaBoundary(precision: RegionBoundaryPrecision) {
  const cachedPromise =
    precision === "precise" ? mergedDesaPreciseBoundaryPromise : mergedDesaLightBoundaryPromise;
  if (cachedPromise) {
    return cachedPromise;
  }

  const nextPromise = (async () => {
    const bundle = await getActiveRegionBundle();
    const overrides = await loadPublishedDesaOverrides();
    const baseBoundary = precision === "precise" ? bundle.desa.precise : bundle.desa.light;
    return mergePublishedDesaOverrides({
      baseBoundary,
      overrides,
    });
  })();

  if (precision === "precise") {
    mergedDesaPreciseBoundaryPromise = nextPromise;
  } else {
    mergedDesaLightBoundaryPromise = nextPromise;
  }

  return nextPromise;
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
        : scope?.kecamatanName
          ? filterDesaBoundaryByKecamatan(
              await getMergedDesaBoundary(precision),
              String(scope.kecamatanName).trim(),
            )
          : await getMergedDesaBoundary(precision);

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
