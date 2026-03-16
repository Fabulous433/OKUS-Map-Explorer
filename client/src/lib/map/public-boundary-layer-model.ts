import type { GeoJsonFeature, GeoJsonFeatureCollection, RegionBoundaryLevel } from "@shared/region-boundary";
import type { BoundaryLegendFeature } from "@/components/map/map-boundary-legend-panel";
import { canLoadDesaLayer, type RegionBoundaryLayerState } from "@/lib/map/region-boundary-layer-state";
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
