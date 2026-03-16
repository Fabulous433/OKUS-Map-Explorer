import bbox from "@turf/bbox";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import type { GeoJsonFeatureCollection, RegionBoundaryBounds } from "@shared/region-boundary";

export type RegionBoundaryClientState = {
  geoJson: GeoJsonFeatureCollection;
  bbox: RegionBoundaryBounds;
  maxBounds: [[number, number], [number, number]];
};

function normalizeRegionBoundary(boundary: GeoJsonFeatureCollection): GeoJsonFeatureCollection {
  const features = boundary.features
    .filter((feature) => feature.geometry?.type === "Polygon" || feature.geometry?.type === "MultiPolygon")
    .map((feature) => ({
      type: "Feature" as const,
      properties: { ...feature.properties },
      geometry: {
        type: feature.geometry.type,
        coordinates: feature.geometry.coordinates,
      },
    }));

  if (features.length === 0) {
    throw new Error("Boundary kabupaten tidak memiliki polygon yang valid.");
  }

  return {
    type: "FeatureCollection",
    features,
  };
}

export function createRegionBoundaryClientState(boundary: GeoJsonFeatureCollection): RegionBoundaryClientState {
  const geoJson = normalizeRegionBoundary(boundary);
  const [minLng, minLat, maxLng, maxLat] = bbox(geoJson as any);

  return {
    geoJson,
    bbox: {
      minLng,
      minLat,
      maxLng,
      maxLat,
    },
    maxBounds: [
      [minLat, minLng],
      [maxLat, maxLng],
    ],
  };
}

export function isCoordinateInsideRegionBoundary(
  boundary: GeoJsonFeatureCollection,
  point: { lat: number; lng: number },
) {
  const normalizedBoundary = normalizeRegionBoundary(boundary);
  return normalizedBoundary.features.some((feature) =>
    booleanPointInPolygon([point.lng, point.lat], feature as any),
  );
}
