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

export const regionBoundaryLevelSchema = z.enum(["kabupaten", "kecamatan", "desa"]);
export const regionBoundaryPrecisionSchema = z.enum(["precise", "light"]);
export const activeRegionDesaQuerySchema = z.object({
  kecamatanId: z.string().trim().min(1, "kecamatanId wajib diisi untuk memuat batas desa/kelurahan"),
});

export const regionBoundaryBoundsSchema = z.object({
  minLng: z.number(),
  minLat: z.number(),
  maxLng: z.number(),
  maxLat: z.number(),
});

export const regionBoundaryScopeSchema = z.object({
  kecamatanId: z.string().trim().min(1).optional(),
  kecamatanName: z.string().trim().min(1).optional(),
});

export const regionBoundaryResponseSchema = z.object({
  regionKey: z.string().min(1),
  regionName: z.string().min(1),
  level: regionBoundaryLevelSchema,
  precision: regionBoundaryPrecisionSchema,
  bounds: regionBoundaryBoundsSchema,
  boundary: geoJsonFeatureCollectionSchema,
  scope: regionBoundaryScopeSchema.optional(),
});

export type GeoJsonFeature = z.infer<typeof geoJsonFeatureSchema>;
export type GeoJsonFeatureCollection = z.infer<typeof geoJsonFeatureCollectionSchema>;
export type RegionBoundaryLevel = z.infer<typeof regionBoundaryLevelSchema>;
export type RegionBoundaryPrecision = z.infer<typeof regionBoundaryPrecisionSchema>;
export type RegionBoundaryBounds = z.infer<typeof regionBoundaryBoundsSchema>;
export type RegionBoundaryResponse = z.infer<typeof regionBoundaryResponseSchema>;
export type RegionBoundaryScope = z.infer<typeof regionBoundaryScopeSchema>;
export type ActiveRegionDesaQuery = z.infer<typeof activeRegionDesaQuerySchema>;
