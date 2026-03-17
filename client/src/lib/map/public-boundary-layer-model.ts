import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import type {
  GeoJsonFeature,
  GeoJsonFeatureCollection,
  RegionBoundaryBounds,
  RegionBoundaryLevel,
} from "@shared/region-boundary";
import type { BoundaryLegendFeature } from "@/components/map/map-boundary-legend-panel";
import { canLoadDesaLayer, type RegionBoundaryLayerState } from "@/lib/map/region-boundary-layer-state";
import type { MapViewportMarker } from "@/lib/map/wfs-types";
import { REGION_BOUNDARY_LABEL_MIN_ZOOM } from "@/lib/map/region-boundary-layer-style";

const WORLD_RING = [
  [-180, -90],
  [180, -90],
  [180, 90],
  [-180, 90],
  [-180, -90],
] as const;

const LABEL_PROPERTY_KEYS: Record<RegionBoundaryLevel, string[]> = {
  kabupaten: ["WADMKK"],
  kecamatan: ["WADMKC"],
  desa: ["WADMKD", "NAMOBJ"],
};

const KECAMATAN_NAME_PROPERTY_KEYS: Record<Exclude<RegionBoundaryLevel, "kabupaten">, string[]> = {
  kecamatan: ["WADMKC"],
  desa: ["WADMKC"],
};

export type BoundaryFeatureSelection = {
  level: "kecamatan" | "desa";
  featureName: string;
  kecamatanName: string;
  bounds: RegionBoundaryBounds;
  feature: GeoJsonFeature;
};

export function createPublicBoundaryLayerQueryPlan(params: {
  layerState: RegionBoundaryLayerState;
  kecamatanId: string;
  zoom: number;
}) {
  const canLoadDesa = canLoadDesaLayer({
    layerState: params.layerState,
    kecamatanId: params.kecamatanId,
    zoom: params.zoom,
  });

  return {
    kabupaten: {
      level: "kabupaten" as const,
      enabled: true,
    },
    kecamatan: {
      level: "kecamatan" as const,
      enabled: params.layerState.kecamatan.visible,
    },
    desa: {
      level: "desa" as const,
      enabled: canLoadDesa,
      kecamatanId: canLoadDesa && params.kecamatanId !== "all" ? params.kecamatanId : undefined,
    },
  };
}

export function shouldShowBoundaryLabels(level: RegionBoundaryLevel, zoom: number) {
  return zoom >= REGION_BOUNDARY_LABEL_MIN_ZOOM[level];
}

export function getBoundaryFeatureName(level: RegionBoundaryLevel, feature: GeoJsonFeature) {
  const propertyKeys = LABEL_PROPERTY_KEYS[level];

  for (const propertyKey of propertyKeys) {
    const value = String(feature.properties[propertyKey] ?? "").trim();
    if (value.length > 0) {
      return value;
    }
  }

  return level.toUpperCase();
}

function getBoundaryFeatureKecamatanName(level: "kecamatan" | "desa", feature: GeoJsonFeature) {
  const propertyKeys = KECAMATAN_NAME_PROPERTY_KEYS[level];

  for (const propertyKey of propertyKeys) {
    const value = String(feature.properties[propertyKey] ?? "").trim();
    if (value.length > 0) {
      return value;
    }
  }

  return getBoundaryFeatureName(level, feature);
}

function collectCoordinatePairs(value: unknown, output: Array<[number, number]>) {
  if (!Array.isArray(value)) {
    return;
  }

  if (value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number") {
    output.push([value[0], value[1]]);
    return;
  }

  for (const child of value) {
    collectCoordinatePairs(child, output);
  }
}

function getBoundaryFeatureBounds(feature: GeoJsonFeature): RegionBoundaryBounds {
  const coordinatePairs: Array<[number, number]> = [];
  collectCoordinatePairs(feature.geometry.coordinates, coordinatePairs);

  if (coordinatePairs.length === 0) {
    throw new Error("Feature boundary tidak memiliki koordinat untuk membuat focus bounds.");
  }

  const lngs = coordinatePairs.map(([lng]) => lng);
  const lats = coordinatePairs.map(([, lat]) => lat);

  return {
    minLng: Math.min(...lngs),
    minLat: Math.min(...lats),
    maxLng: Math.max(...lngs),
    maxLat: Math.max(...lats),
  };
}

export function createBoundaryFeatureSelection(params: {
  level: "kecamatan" | "desa";
  feature: GeoJsonFeature;
}): BoundaryFeatureSelection {
  return {
    level: params.level,
    featureName: getBoundaryFeatureName(params.level, params.feature),
    kecamatanName: getBoundaryFeatureKecamatanName(params.level, params.feature),
    bounds: getBoundaryFeatureBounds(params.feature),
    feature: params.feature,
  };
}

function normalizeRegionName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function resolveBoundarySelectionKecamatanId(params: {
  selection: Pick<BoundaryFeatureSelection, "kecamatanName">;
  kecamatanList: Array<{
    cpmKecId: string;
    cpmKecamatan: string;
  }>;
}) {
  const targetName = normalizeRegionName(params.selection.kecamatanName);
  const matchingKecamatan = params.kecamatanList.find(
    (item) => normalizeRegionName(item.cpmKecamatan) === targetName,
  );

  return matchingKecamatan?.cpmKecId ?? null;
}

export function filterViewportMarkersByBoundarySelection(params: {
  selection: Pick<BoundaryFeatureSelection, "feature">;
  markers: MapViewportMarker[];
}) {
  return params.markers.filter((marker) =>
    booleanPointInPolygon([marker.longitude, marker.latitude], params.selection.feature as never),
  );
}

function collectKabupatenHoleRings(boundary: GeoJsonFeatureCollection) {
  const rings: number[][][] = [];

  for (const feature of boundary.features) {
    const coordinates = feature.geometry.coordinates as unknown[];

    if (feature.geometry.type === "Polygon") {
      const outerRing = Array.isArray(coordinates) ? coordinates[0] : null;
      if (Array.isArray(outerRing)) {
        rings.push(outerRing as number[][]);
      }
      continue;
    }

    if (feature.geometry.type === "MultiPolygon") {
      for (const polygon of coordinates) {
        const outerRing = Array.isArray(polygon) ? polygon[0] : null;
        if (Array.isArray(outerRing)) {
          rings.push(outerRing as number[][]);
        }
      }
    }
  }

  return rings;
}

export function createKabupatenMaskBoundary(boundary: GeoJsonFeatureCollection): GeoJsonFeatureCollection {
  const holeRings = collectKabupatenHoleRings(boundary);
  if (holeRings.length === 0) {
    throw new Error("Boundary kabupaten tidak memiliki polygon untuk membuat mask.");
  }

  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: {
          role: "outside-mask",
        },
        geometry: {
          type: "Polygon",
          coordinates: [WORLD_RING, ...holeRings],
        },
      },
    ],
  };
}

export function extractBoundaryLegendFeatures(params: {
  level: "kecamatan" | "desa";
  boundary: GeoJsonFeatureCollection;
}): BoundaryLegendFeature[] {
  return params.boundary.features.map((feature) => ({
    level: params.level,
    featureName: getBoundaryFeatureName(params.level, feature),
  }));
}
