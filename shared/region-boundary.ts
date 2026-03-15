import { z } from "zod";

export const geoJsonFeatureSchema = z.object({
  type: z.literal("Feature"),
  properties: z.record(z.unknown()),
  geometry: z.object({
    type: z.string().min(1),
    coordinates: z.unknown(),
  }),
});

export const geoJsonFeatureCollectionSchema = z.object({
  type: z.literal("FeatureCollection"),
  features: z.array(geoJsonFeatureSchema),
});

export const regionBoundaryLevelSchema = z.enum(["kabupaten", "kecamatan"]);
export const regionBoundaryPrecisionSchema = z.enum(["precise", "light"]);

export const regionBoundaryBoundsSchema = z.object({
  minLng: z.number(),
  minLat: z.number(),
  maxLng: z.number(),
  maxLat: z.number(),
});

export const regionBoundaryResponseSchema = z.object({
  regionKey: z.string().min(1),
  regionName: z.string().min(1),
  level: regionBoundaryLevelSchema,
  precision: regionBoundaryPrecisionSchema,
  bounds: regionBoundaryBoundsSchema,
  boundary: geoJsonFeatureCollectionSchema,
});

export type GeoJsonFeature = z.infer<typeof geoJsonFeatureSchema>;
export type GeoJsonFeatureCollection = z.infer<typeof geoJsonFeatureCollectionSchema>;
export type RegionBoundaryLevel = z.infer<typeof regionBoundaryLevelSchema>;
export type RegionBoundaryPrecision = z.infer<typeof regionBoundaryPrecisionSchema>;
export type RegionBoundaryBounds = z.infer<typeof regionBoundaryBoundsSchema>;
export type RegionBoundaryResponse = z.infer<typeof regionBoundaryResponseSchema>;
