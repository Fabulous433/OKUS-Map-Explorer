import simplify from "@turf/simplify";
import {
  regionBoundaryDraftFeatureSchema,
  type RegionBoundaryDraftFeature,
  type RegionBoundaryGeometry,
  type RegionBoundaryImpactMovedItem,
  type RegionBoundaryTopologyAnalysis,
  type RegionBoundaryTopologyFragment,
} from "@shared/region-boundary-admin";
import type { GeoJsonFeatureCollection } from "@shared/region-boundary";
import { PUBLIC_BASE_MAPS, type BaseMapKey } from "@/lib/map/map-basemap-config";

type GeoJsonFeatureInput = {
  type: "Feature";
  properties?: Record<string, unknown>;
  geometry?: {
    type?: string;
    coordinates?: unknown;
  } | null;
};

type GeoJsonUploadResult =
  | {
      success: true;
      geometry: RegionBoundaryGeometry;
    }
  | {
      success: false;
      message: string;
    };

export const BOUNDARY_EDITOR_BASE_MAPS = {
  esri: PUBLIC_BASE_MAPS.esri,
  osm: PUBLIC_BASE_MAPS.osm,
  carto: PUBLIC_BASE_MAPS.carto,
} as const satisfies Record<BaseMapKey, (typeof PUBLIC_BASE_MAPS)[BaseMapKey]>;

export const DEFAULT_BOUNDARY_EDITOR_BASE_MAP_KEY = "esri" as const;

export type DraftTopologySummary = RegionBoundaryTopologyAnalysis & {
  requiresTakeoverConfirmation?: boolean;
};

type DraftTopologyFragment = RegionBoundaryTopologyFragment;

function getTopologyStatusLabel(input: DraftTopologySummary) {
  if (input.topologyStatus === "draft-editing") {
    return "DRAFT EDITING";
  }

  if (input.topologyStatus === "draft-needs-resolution") {
    return "NEEDS RESOLUTION";
  }

  if (input.topologyStatus === "draft-ready") {
    return "TOPOLOGY CLEAN";
  }

  if (input.topologyStatus === "published") {
    return "PUBLISHED";
  }

  return "SUPERSEDED";
}

function requiresTakeoverConfirmation(input: DraftTopologySummary) {
  if (typeof input.requiresTakeoverConfirmation === "boolean") {
    return input.requiresTakeoverConfirmation;
  }

  return input.topologyStatus !== "draft-ready" && input.fragments.some((fragment) => fragment.type === "takeover-area");
}

function buildInvalidFragmentMessage(fragment: DraftTopologyFragment) {
  if (fragment.areaSqM <= 50) {
    return "Tidak ada kandidat desa terdeteksi. Fragmen ini sangat kecil; rapikan geometry atau reset draft desa ini.";
  }

  return "Tidak ada kandidat desa terdeteksi. Rapikan geometry agar menyentuh desa tujuan atau reset draft desa ini.";
}

function getFragmentDisplayLabel(fragment: DraftTopologyFragment) {
  const assignmentLabel =
    fragment.assignmentMode === "auto"
      ? "auto"
      : fragment.assignmentMode === "manual"
        ? "manual"
        : "unassigned";

  if (fragment.type === "takeover-area") {
    return `${fragment.fragmentId} takeover ${assignmentLabel} -> ${fragment.assignedBoundaryKey ?? "n/a"}`;
  }

  return `${fragment.fragmentId} released ${assignmentLabel} -> ${fragment.assignedBoundaryKey ?? "n/a"}`;
}

function buildTopologyModel(input: DraftTopologySummary) {
  const takeoverDetected = requiresTakeoverConfirmation(input);
  const blockingFragments = input.fragments.filter((fragment) => fragment.status !== "resolved");
  const autoAssignedFragments = input.fragments.filter(
    (fragment) => fragment.status === "resolved" && fragment.assignmentMode === "auto",
  );
  const uniqueSourceBoundaryKeys = Array.from(new Set(input.fragments.map((fragment) => fragment.sourceBoundaryKey)));
  const manualResolutionQueue = blockingFragments.map((fragment) => ({
    fragmentId: fragment.fragmentId,
    candidateBoundaryKeys: fragment.candidateBoundaryKeys,
    type: fragment.type,
    sourceBoundaryKey: fragment.sourceBoundaryKey,
    status: fragment.status,
    canAssign: fragment.status !== "invalid" && fragment.candidateBoundaryKeys.length > 0,
    resolutionMessage:
      fragment.status === "invalid"
        ? buildInvalidFragmentMessage(fragment)
        : "Pilih salah satu desa kandidat untuk fragmen ini.",
  }));

  return {
    badgeLabel: getTopologyStatusLabel(input),
    headline:
      input.topologyStatus === "draft-ready"
        ? "Topology clean and ready for preview"
        : takeoverDetected
          ? "Takeover confirmation required before publish"
          : blockingFragments.length > 0
            ? `${blockingFragments.length} fragment menunggu resolusi manual`
            : "Topology draft sedang diproses",
    canPreview: input.topologyStatus === "draft-ready" && !takeoverDetected && blockingFragments.length === 0,
    canPublish: false,
    manualResolutionQueue,
    informationalRows: autoAssignedFragments.map((fragment) => getFragmentDisplayLabel(fragment)),
    takeoverDetected,
    summaryLabel: `${input.summary.fragmentCount} fragment total`,
    unresolvedLabel: `${input.summary.unresolvedFragmentCount} unresolved`,
    autoAssignedLabel: `${input.summary.autoAssignedFragmentCount} auto-assigned`,
    manualAssignmentLabel: `${input.summary.manualAssignmentRequiredCount} manual`,
    invalidLabel: `${input.summary.invalidFragmentCount} invalid`,
    sharedDraftLabel:
      uniqueSourceBoundaryKeys.length > 1
        ? `Revision draft ini mencakup ${uniqueSourceBoundaryKeys.length} desa draft.`
        : "Revision draft ini fokus pada 1 desa.",
  };
}

export function createBoundaryTopologyPanelModel(input: DraftTopologySummary) {
  return buildTopologyModel(input);
}

export function createTakeoverWarningModel(input: DraftTopologySummary) {
  const takeoverDetected = requiresTakeoverConfirmation(input);
  const takeoverFragments = input.fragments.filter((fragment) => fragment.type === "takeover-area");

  if (!takeoverDetected) {
    return {
      visible: false,
      title: "",
      message: "",
    };
  }

  return {
    visible: true,
    title: "Peringatan Takeover",
    message: `${takeoverFragments.length} takeover area terdeteksi. Konfirmasi pengambilan wilayah diperlukan sebelum publish.`,
  };
}

export function canPreviewBoundaryRevision(input: DraftTopologySummary) {
  return buildTopologyModel(input).canPreview;
}

export function canPublishBoundaryRevision(input: DraftTopologySummary, previewReady: boolean) {
  const takeoverDetected = requiresTakeoverConfirmation(input);
  const unresolvedFragments = input.fragments.some((fragment) => fragment.status !== "resolved");

  return previewReady && input.topologyStatus === "draft-ready" && !takeoverDetected && !unresolvedFragments;
}

function isPolygonGeometry(
  geometry: GeoJsonFeatureInput["geometry"],
): geometry is RegionBoundaryGeometry {
  return Boolean(
    geometry &&
      (geometry.type === "Polygon" || geometry.type === "MultiPolygon") &&
      geometry.coordinates !== undefined,
  );
}

function getSingleUploadFeature(payload: unknown): GeoJsonFeatureInput | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  if ((payload as { type?: unknown }).type === "Feature") {
    return payload as GeoJsonFeatureInput;
  }

  if ((payload as { type?: unknown }).type === "FeatureCollection") {
    const features = (payload as { features?: unknown }).features;
    if (!Array.isArray(features) || features.length !== 1) {
      return null;
    }

    return features[0] as GeoJsonFeatureInput;
  }

  return null;
}

export function parseBoundaryUpload(fileText: string): GeoJsonUploadResult {
  let payload: unknown;

  try {
    payload = JSON.parse(fileText);
  } catch {
    return {
      success: false,
      message: "File GeoJSON tidak valid",
    };
  }

  const feature = getSingleUploadFeature(payload);
  if (!feature) {
    return {
      success: false,
      message: "File GeoJSON harus berisi tepat satu polygon desa/kelurahan",
    };
  }

  if (!isPolygonGeometry(feature.geometry)) {
    return {
      success: false,
      message: "Geometry boundary harus bertipe Polygon atau MultiPolygon",
    };
  }

  return {
    success: true,
    geometry: {
      type: feature.geometry.type,
      coordinates: feature.geometry.coordinates,
    },
  };
}

export function buildDraftFeaturePayload(params: {
  boundaryKey: string;
  kecamatanId: string;
  kelurahanId: string;
  namaDesa: string;
  geometry: RegionBoundaryGeometry;
}): RegionBoundaryDraftFeature {
  return regionBoundaryDraftFeatureSchema.parse({
    boundaryKey: params.boundaryKey,
    level: "desa",
    kecamatanId: params.kecamatanId,
    kelurahanId: params.kelurahanId,
    namaDesa: params.namaDesa,
    geometry: params.geometry,
  });
}

export function createBoundaryImpactPanelModel(params: {
  impactedCount: number;
  sampleMoves: RegionBoundaryImpactMovedItem[];
  hasPreview: boolean;
  hasDraftChanges: boolean;
  publishedRevisionCount: number;
}) {
  const historyLabel = `${params.publishedRevisionCount} published revision`;

  if (!params.hasDraftChanges) {
    return {
      headline: "Belum ada draft boundary",
      badgeLabel: "IDLE",
      canPublish: false,
      canPreview: false,
      sampleRows: [],
      historyLabel,
    };
  }

  if (!params.hasPreview) {
    return {
      headline: "Draft siap dipreview",
      badgeLabel: "DRAFT",
      canPublish: false,
      canPreview: true,
      sampleRows: [],
      historyLabel,
    };
  }

  return {
    headline: `${params.impactedCount} OP terdampak`,
    badgeLabel: "READY",
    canPublish: true,
    canPreview: true,
    sampleRows: params.sampleMoves.map(
      (item) => `${item.namaOp}: ${item.fromKelurahan} -> ${item.toKelurahan}`,
    ),
    historyLabel,
  };
}

export function createBoundaryPublishSuccessDescription(params: {
  movedCount: number;
  mode: "publish-only" | "publish-and-reconcile";
}) {
  if (params.mode === "publish-and-reconcile") {
    return `Boundary berhasil dipublish. ${params.movedCount} OP ikut direkonsiliasi ke desa baru.`;
  }

  return `Boundary berhasil dipublish. ${params.movedCount} OP terdampak tercatat pada preview.`;
}

function collectVertexPairs(input: unknown, points: number[][]) {
  if (!Array.isArray(input)) {
    return;
  }

  if (
    input.length >= 2 &&
    typeof input[0] === "number" &&
    typeof input[1] === "number"
  ) {
    points.push([input[0], input[1]]);
    return;
  }

  for (const item of input) {
    collectVertexPairs(item, points);
  }
}

export function countBoundaryGeometryVertices(geometry: RegionBoundaryGeometry | null | undefined) {
  if (!geometry) {
    return 0;
  }

  const points: number[][] = [];
  collectVertexPairs(geometry.coordinates, points);
  return points.length;
}

function collectBounds(input: unknown, acc: { minLng: number; maxLng: number; minLat: number; maxLat: number }) {
  if (!Array.isArray(input)) {
    return;
  }

  if (
    input.length >= 2 &&
    typeof input[0] === "number" &&
    typeof input[1] === "number"
  ) {
    acc.minLng = Math.min(acc.minLng, input[0]);
    acc.maxLng = Math.max(acc.maxLng, input[0]);
    acc.minLat = Math.min(acc.minLat, input[1]);
    acc.maxLat = Math.max(acc.maxLat, input[1]);
    return;
  }

  for (const item of input) {
    collectBounds(item, acc);
  }
}

export function simplifyBoundaryEditingGeometry(
  geometry: RegionBoundaryGeometry | null | undefined,
): RegionBoundaryGeometry | null {
  if (!geometry) {
    return null;
  }

  const vertexCount = countBoundaryGeometryVertices(geometry);
  if (vertexCount <= 40) {
    return geometry;
  }

  const bounds = {
    minLng: Number.POSITIVE_INFINITY,
    maxLng: Number.NEGATIVE_INFINITY,
    minLat: Number.POSITIVE_INFINITY,
    maxLat: Number.NEGATIVE_INFINITY,
  };
  collectBounds(geometry.coordinates, bounds);

  const spanLng = Number.isFinite(bounds.maxLng - bounds.minLng) ? bounds.maxLng - bounds.minLng : 0;
  const spanLat = Number.isFinite(bounds.maxLat - bounds.minLat) ? bounds.maxLat - bounds.minLat : 0;
  const tolerance = Math.min(0.0002, Math.max(0.00002, Math.max(spanLng, spanLat) * 0.0025));

  const simplifiedFeature = simplify(
    {
      type: "Feature",
      properties: {},
      geometry,
    } as GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.MultiPolygon>,
    {
      tolerance,
      highQuality: true,
      mutate: false,
    },
  );

  const simplifiedGeometry = simplifiedFeature.geometry;
  if (simplifiedGeometry.type !== "Polygon" && simplifiedGeometry.type !== "MultiPolygon") {
    return geometry;
  }

  if (countBoundaryGeometryVertices(simplifiedGeometry) >= vertexCount) {
    return geometry;
  }

  return {
    type: simplifiedGeometry.type,
    coordinates: simplifiedGeometry.coordinates,
  };
}

export function findBoundaryFeatureByKey(
  boundary: GeoJsonFeatureCollection | null | undefined,
  boundaryKey: string,
) {
  if (!boundary) {
    return null;
  }

  return (
    boundary.features.find(
      (feature) => String((feature.properties as Record<string, unknown> | undefined)?.__boundaryKey ?? "") === boundaryKey,
    ) ?? null
  );
}

export function areBoundaryGeometriesEqual(
  left: RegionBoundaryGeometry | null | undefined,
  right: RegionBoundaryGeometry | null | undefined,
) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}
