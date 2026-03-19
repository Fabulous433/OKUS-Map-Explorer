import type { GeoJsonFeature, GeoJsonFeatureCollection } from "@shared/region-boundary";
import type { RegionBoundaryGeometry } from "@shared/region-boundary-admin";

export type PublishedBoundaryFeature = {
  boundaryKey: string;
  kecamatanId: string;
  kelurahanId: string;
  namaDesa: string;
  geometry: RegionBoundaryGeometry;
};

function normalizeBoundarySegment(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("id")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeCompactSegment(value: string) {
  return normalizeBoundarySegment(value).replace(/-/g, "");
}

export function buildDesaBoundaryKey(params: { kecamatanName: string; desaName: string }) {
  return `${normalizeCompactSegment(params.kecamatanName)}:${normalizeBoundarySegment(params.desaName)}`;
}

function withStableBoundaryProperties(
  feature: GeoJsonFeature,
  override?: PublishedBoundaryFeature,
): GeoJsonFeature {
  const properties = {
    ...feature.properties,
    __boundaryKey: buildDesaBoundaryKey({
      kecamatanName: String(feature.properties.WADMKC ?? ""),
      desaName: String(feature.properties.WADMKD ?? ""),
    }),
  } as Record<string, unknown>;

  if (override) {
    properties.__kecamatanId = override.kecamatanId;
    properties.__kelurahanId = override.kelurahanId;
  }

  return {
    ...feature,
    properties,
  };
}

export function mergePublishedDesaOverrides(params: {
  baseBoundary: GeoJsonFeatureCollection;
  overrides: PublishedBoundaryFeature[];
}) {
  const overrideByBoundaryKey = new Map(params.overrides.map((item) => [item.boundaryKey, item]));

  return {
    type: "FeatureCollection" as const,
    features: params.baseBoundary.features.map((feature) => {
      const boundaryKey = buildDesaBoundaryKey({
        kecamatanName: String(feature.properties.WADMKC ?? ""),
        desaName: String(feature.properties.WADMKD ?? ""),
      });
      const override = overrideByBoundaryKey.get(boundaryKey);
      if (!override) {
        return withStableBoundaryProperties(feature);
      }

      return withStableBoundaryProperties(
        {
          ...feature,
          geometry: override.geometry,
        },
        override,
      );
    }),
  };
}
