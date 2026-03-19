import { z } from "zod";

export const regionBoundaryRevisionStatusSchema = z.enum(["draft", "published", "superseded"]);
export const regionBoundaryReconciliationModeSchema = z.enum(["publish-only", "publish-and-reconcile"]);
export const regionBoundaryLevelAdminSchema = z.literal("desa");

export const regionBoundaryGeometrySchema = z.object({
  type: z.enum(["Polygon", "MultiPolygon"]),
  coordinates: z.unknown(),
});

export const regionBoundaryBoundsSchema = z.object({
  minLng: z.number(),
  minLat: z.number(),
  maxLng: z.number(),
  maxLat: z.number(),
});

export const regionBoundaryDraftFeatureSchema = z.object({
  boundaryKey: z.string().trim().min(1),
  level: regionBoundaryLevelAdminSchema,
  kecamatanId: z.string().trim().min(1),
  kelurahanId: z.string().trim().min(1),
  namaDesa: z.string().trim().min(1),
  geometry: regionBoundaryGeometrySchema,
});

export const regionBoundaryImpactMovedItemSchema = z.object({
  opId: z.number().int().positive(),
  namaOp: z.string().trim().min(1),
  fromKelurahan: z.string().trim().min(1),
  toKelurahan: z.string().trim().min(1),
});

export const regionBoundaryImpactPreviewSchema = z.object({
  impactedCount: z.number().int().min(0),
  movedItems: z.array(regionBoundaryImpactMovedItemSchema),
});

export const regionBoundaryRevisionSchema = z.object({
  id: z.number().int().positive(),
  regionKey: z.string().trim().min(1),
  level: regionBoundaryLevelAdminSchema,
  status: regionBoundaryRevisionStatusSchema,
  notes: z.string().trim().min(1).nullable(),
  createdBy: z.string().trim().min(1),
  publishedBy: z.string().trim().min(1).nullable(),
  publishedAt: z.string().datetime().nullable(),
  impactSummary: regionBoundaryImpactPreviewSchema.nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export const regionBoundaryPublishedRevisionSchema = regionBoundaryRevisionSchema.extend({
  status: z.literal("published"),
  publishedBy: z.string().trim().min(1),
  publishedAt: z.string().datetime(),
});

export const regionBoundaryPublishPayloadSchema = z.object({
  revisionId: z.number().int().positive(),
  mode: regionBoundaryReconciliationModeSchema,
});

export type RegionBoundaryRevisionStatus = z.infer<typeof regionBoundaryRevisionStatusSchema>;
export type RegionBoundaryReconciliationMode = z.infer<typeof regionBoundaryReconciliationModeSchema>;
export type RegionBoundaryGeometry = z.infer<typeof regionBoundaryGeometrySchema>;
export type RegionBoundaryBounds = z.infer<typeof regionBoundaryBoundsSchema>;
export type RegionBoundaryDraftFeature = z.infer<typeof regionBoundaryDraftFeatureSchema>;
export type RegionBoundaryImpactMovedItem = z.infer<typeof regionBoundaryImpactMovedItemSchema>;
export type RegionBoundaryImpactPreview = z.infer<typeof regionBoundaryImpactPreviewSchema>;
export type RegionBoundaryRevision = z.infer<typeof regionBoundaryRevisionSchema>;
export type RegionBoundaryPublishedRevision = z.infer<typeof regionBoundaryPublishedRevisionSchema>;
export type RegionBoundaryPublishPayload = z.infer<typeof regionBoundaryPublishPayloadSchema>;
