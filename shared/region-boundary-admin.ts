import { z } from "zod";

export const regionBoundaryRevisionStatusSchema = z.enum(["draft", "published", "superseded"]);
export const regionBoundaryReconciliationModeSchema = z.enum(["publish-only", "publish-and-reconcile"]);
export const regionBoundaryLevelAdminSchema = z.literal("desa");
export const regionBoundaryTopologyStatusSchema = z.enum([
  "draft-editing",
  "draft-needs-resolution",
  "draft-ready",
  "published",
  "superseded",
]);
export const regionBoundaryFragmentTypeSchema = z.enum(["released-fragment", "takeover-area"]);
export const regionBoundaryFragmentAssignmentModeSchema = z.enum(["auto", "manual"]);
export const regionBoundaryFragmentStatusSchema = z.enum(["unresolved", "resolved"]);

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

export const regionBoundaryTopologySummarySchema = z.object({
  fragmentCount: z.number().int().min(0),
  unresolvedFragmentCount: z.number().int().min(0),
  autoAssignedFragmentCount: z.number().int().min(0),
  manualAssignmentRequiredCount: z.number().int().min(0),
});

export const regionBoundaryTopologyFragmentSchema = z.object({
  fragmentId: z.string().trim().min(1),
  type: regionBoundaryFragmentTypeSchema,
  sourceBoundaryKey: z.string().trim().min(1),
  candidateBoundaryKeys: z.array(z.string().trim().min(1)),
  assignedBoundaryKey: z.string().trim().min(1).nullable().default(null),
  assignmentMode: regionBoundaryFragmentAssignmentModeSchema.nullable().default(null),
  status: regionBoundaryFragmentStatusSchema,
  geometry: regionBoundaryGeometrySchema,
  areaSqM: z.number().positive(),
});

export const regionBoundaryTopologyAnalysisSchema = z.object({
  revisionId: z.number().int().positive(),
  regionKey: z.string().trim().min(1),
  level: regionBoundaryLevelAdminSchema,
  topologyStatus: regionBoundaryTopologyStatusSchema,
  summary: regionBoundaryTopologySummarySchema,
  fragments: z.array(regionBoundaryTopologyFragmentSchema),
});

export const regionBoundaryFragmentAssignmentPayloadSchema = z.object({
  revisionId: z.number().int().positive(),
  fragmentId: z.string().trim().min(1),
  assignedBoundaryKey: z.string().trim().min(1),
  assignmentMode: regionBoundaryFragmentAssignmentModeSchema,
});

export const regionBoundaryTakeoverConfirmationPayloadSchema = z.object({
  revisionId: z.number().int().positive(),
  takeoverConfirmedBy: z.string().trim().min(1),
});

export const regionBoundaryRevisionSchema = z.object({
  id: z.number().int().positive(),
  regionKey: z.string().trim().min(1),
  level: regionBoundaryLevelAdminSchema,
  status: regionBoundaryRevisionStatusSchema,
  topologyStatus: regionBoundaryTopologyStatusSchema.default("draft-editing"),
  topologySummary: regionBoundaryTopologySummarySchema.nullable().default(null),
  takeoverConfirmedAt: z.string().datetime().nullable().default(null),
  takeoverConfirmedBy: z.string().trim().min(1).nullable().default(null),
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
  topologyStatus: z.literal("draft-ready").default("draft-ready"),
});

export type RegionBoundaryRevisionStatus = z.infer<typeof regionBoundaryRevisionStatusSchema>;
export type RegionBoundaryReconciliationMode = z.infer<typeof regionBoundaryReconciliationModeSchema>;
export type RegionBoundaryTopologyStatus = z.infer<typeof regionBoundaryTopologyStatusSchema>;
export type RegionBoundaryFragmentType = z.infer<typeof regionBoundaryFragmentTypeSchema>;
export type RegionBoundaryFragmentAssignmentMode = z.infer<typeof regionBoundaryFragmentAssignmentModeSchema>;
export type RegionBoundaryFragmentStatus = z.infer<typeof regionBoundaryFragmentStatusSchema>;
export type RegionBoundaryGeometry = z.infer<typeof regionBoundaryGeometrySchema>;
export type RegionBoundaryBounds = z.infer<typeof regionBoundaryBoundsSchema>;
export type RegionBoundaryDraftFeature = z.infer<typeof regionBoundaryDraftFeatureSchema>;
export type RegionBoundaryImpactMovedItem = z.infer<typeof regionBoundaryImpactMovedItemSchema>;
export type RegionBoundaryImpactPreview = z.infer<typeof regionBoundaryImpactPreviewSchema>;
export type RegionBoundaryTopologySummary = z.infer<typeof regionBoundaryTopologySummarySchema>;
export type RegionBoundaryTopologyFragment = z.infer<typeof regionBoundaryTopologyFragmentSchema>;
export type RegionBoundaryTopologyAnalysis = z.infer<typeof regionBoundaryTopologyAnalysisSchema>;
export type RegionBoundaryFragmentAssignmentPayload = z.infer<typeof regionBoundaryFragmentAssignmentPayloadSchema>;
export type RegionBoundaryTakeoverConfirmationPayload = z.infer<typeof regionBoundaryTakeoverConfirmationPayloadSchema>;
export type RegionBoundaryRevision = z.infer<typeof regionBoundaryRevisionSchema>;
export type RegionBoundaryPublishedRevision = z.infer<typeof regionBoundaryPublishedRevisionSchema>;
export type RegionBoundaryPublishPayload = z.infer<typeof regionBoundaryPublishPayloadSchema>;
