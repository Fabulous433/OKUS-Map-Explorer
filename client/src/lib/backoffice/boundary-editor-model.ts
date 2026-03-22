import booleanIntersects from "@turf/boolean-intersects";
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

export type BoundaryResolutionBlock = {
  blockId: string;
  fragmentIds: string[];
  candidateBoundaryKeys: string[];
  type: DraftTopologyFragment["type"];
  sourceBoundaryKey: string;
  status: "unresolved" | "invalid";
  canAssign: boolean;
  resolutionMessage: string;
  areaSqM: number;
};

function isFragmentRelevantToBoundary(fragment: DraftTopologyFragment, selectedBoundaryKey?: string) {
  if (!selectedBoundaryKey) {
    return true;
  }

  return (
    fragment.sourceBoundaryKey === selectedBoundaryKey ||
    fragment.assignedBoundaryKey === selectedBoundaryKey ||
    fragment.candidateBoundaryKeys.includes(selectedBoundaryKey)
  );
}

function summarizeTopologyFragments(fragments: DraftTopologyFragment[]) {
  return {
    fragmentCount: fragments.length,
    unresolvedFragmentCount: fragments.filter((fragment) => fragment.status === "unresolved").length,
    autoAssignedFragmentCount: fragments.filter(
      (fragment) => fragment.status === "resolved" && fragment.assignmentMode === "auto",
    ).length,
    manualAssignmentRequiredCount: fragments.filter(
      (fragment) => fragment.status === "unresolved" && fragment.assignmentMode !== "auto",
    ).length,
    invalidFragmentCount: fragments.filter((fragment) => fragment.status === "invalid").length,
  };
}

function getTopologyStatusLabel(input: DraftTopologySummary) {
  if (input.topologyStatus === "draft-editing") {
    return "SEDANG DIEDIT";
  }

  if (input.topologyStatus === "draft-needs-resolution") {
    return "PERLU DITUNTASKAN";
  }

  if (input.topologyStatus === "draft-ready") {
    return "SIAP DIPROSES";
  }

  if (input.topologyStatus === "published") {
    return "AKTIF";
  }

  return "ARSIP";
}

function requiresTakeoverConfirmation(input: DraftTopologySummary) {
  if (typeof input.requiresTakeoverConfirmation === "boolean") {
    return input.requiresTakeoverConfirmation;
  }

  return input.topologyStatus !== "draft-ready" && input.fragments.some((fragment) => fragment.type === "takeover-area");
}

function buildInvalidFragmentMessage(fragment: DraftTopologyFragment) {
  if (fragment.areaSqM <= 50) {
    return "Ada sisa area kecil yang belum jelas masuk ke desa mana. Rapikan garis edit atau batalkan bagian ini.";
  }

  return "Ada area yang belum jelas harus masuk ke desa mana. Rapikan garis edit di area ini atau batalkan bagian yang salah.";
}

function toGeometryFeature(fragment: DraftTopologyFragment) {
  return {
    type: "Feature" as const,
    properties: {
      fragmentId: fragment.fragmentId,
    },
    geometry: fragment.geometry,
  };
}

function getCandidateSignature(fragment: DraftTopologyFragment) {
  return [...fragment.candidateBoundaryKeys].sort().join("|");
}

function canMergeResolutionFragment(seed: DraftTopologyFragment, candidate: DraftTopologyFragment) {
  return (
    seed.sourceBoundaryKey === candidate.sourceBoundaryKey &&
    seed.type === candidate.type &&
    seed.status === candidate.status &&
    getCandidateSignature(seed) === getCandidateSignature(candidate) &&
    booleanIntersects(toGeometryFeature(seed) as never, toGeometryFeature(candidate) as never)
  );
}

export function createBoundaryResolutionBlocks(input: DraftTopologySummary) {
  const blockingFragments = input.fragments.filter(
    (fragment): fragment is DraftTopologyFragment & { status: "unresolved" | "invalid" } =>
      fragment.status === "unresolved" || fragment.status === "invalid",
  );
  const visited = new Set<string>();
  const blocks: BoundaryResolutionBlock[] = [];

  for (const fragment of blockingFragments) {
    if (visited.has(fragment.fragmentId)) {
      continue;
    }

    const queue = [fragment];
    const memberFragments: DraftTopologyFragment[] = [];

    while (queue.length > 0) {
      const current = queue.shift();
      if (!current || visited.has(current.fragmentId)) {
        continue;
      }

      visited.add(current.fragmentId);
      memberFragments.push(current);

      for (const candidate of blockingFragments) {
        if (visited.has(candidate.fragmentId)) {
          continue;
        }

        if (canMergeResolutionFragment(current, candidate)) {
          queue.push(candidate);
        }
      }
    }

    const blockNumber = String(blocks.length + 1).padStart(3, "0");
    blocks.push({
      blockId: `${fragment.sourceBoundaryKey}:block-${blockNumber}`,
      fragmentIds: memberFragments.map((item) => item.fragmentId),
      candidateBoundaryKeys: [...fragment.candidateBoundaryKeys],
      type: fragment.type,
      sourceBoundaryKey: fragment.sourceBoundaryKey,
      status: fragment.status,
      canAssign:
        fragment.type !== "takeover-area" &&
        fragment.status !== "invalid" &&
        fragment.candidateBoundaryKeys.length > 0,
      resolutionMessage:
        fragment.status === "invalid"
          ? buildInvalidFragmentMessage(fragment)
          : fragment.type === "takeover-area"
            ? "Area ini akan menambah wilayah desa aktif. Periksa dampaknya di peta lalu lanjutkan lewat konfirmasi pengambilan wilayah."
            : "Pilih desa yang berbatasan dengan area ini.",
      areaSqM: memberFragments.reduce((total, item) => total + item.areaSqM, 0),
    });
  }

  return blocks;
}

function buildTopologyModel(input: DraftTopologySummary) {
  const takeoverDetected = requiresTakeoverConfirmation(input);
  const resolutionBlocks = createBoundaryResolutionBlocks(input);
  const blockingFragments = input.fragments.filter((fragment) => fragment.status !== "resolved");
  const autoAssignedFragments = input.fragments.filter(
    (fragment) => fragment.status === "resolved" && fragment.assignmentMode === "auto",
  );
  const uniqueSourceBoundaryKeys = Array.from(new Set(input.fragments.map((fragment) => fragment.sourceBoundaryKey)));
  const invalidBlocks = resolutionBlocks.filter((block) => block.status === "invalid");
  const unresolvedBlocks = resolutionBlocks.filter((block) => block.status === "unresolved");

  return {
    badgeLabel: getTopologyStatusLabel(input),
    headline:
      input.topologyStatus === "draft-ready"
        ? "Wilayah siap dipreview"
        : takeoverDetected
          ? "Ada pengambilan area desa lain yang perlu dikonfirmasi"
          : resolutionBlocks.length > 0
            ? `${resolutionBlocks.length} blok area menunggu keputusan`
            : "Draf wilayah sedang diproses",
    canPreview: input.topologyStatus === "draft-ready" && !takeoverDetected && blockingFragments.length === 0,
    canPublish: false,
    resolutionBlockLabel: `${resolutionBlocks.length} blok area perlu dituntaskan`,
    manualResolutionQueue: resolutionBlocks,
    informationalRows:
      autoAssignedFragments.length > 0
        ? [`${autoAssignedFragments.length} area kecil sudah diarahkan otomatis oleh sistem.`]
        : [],
    takeoverDetected,
    summaryLabel: `${resolutionBlocks.length + autoAssignedFragments.length} blok area total`,
    unresolvedLabel: `${unresolvedBlocks.length} perlu dipilih`,
    autoAssignedLabel: `${autoAssignedFragments.length} otomatis`,
    manualAssignmentLabel: `${input.summary.manualAssignmentRequiredCount} manual`,
    invalidLabel: `${invalidBlocks.length} invalid`,
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
    title: "Peringatan Pengambilan Wilayah",
    message: `${takeoverFragments.length} area terdeteksi mengambil wilayah desa lain. Konfirmasi pengambilan wilayah diperlukan sebelum publish.`,
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

export function filterTopologyAnalysisForBoundary(
  input: DraftTopologySummary | null | undefined,
  selectedBoundaryKey?: string,
): DraftTopologySummary | null {
  if (!input) {
    return null;
  }

  if (!selectedBoundaryKey) {
    return input;
  }

  const filteredFragments = input.fragments.filter((fragment) =>
    isFragmentRelevantToBoundary(fragment, selectedBoundaryKey),
  );

  return {
    ...input,
    summary: summarizeTopologyFragments(filteredFragments),
    fragments: filteredFragments,
  };
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

function isCoordinatePair(input: unknown): input is [number, number] {
  return (
    Array.isArray(input) &&
    input.length >= 2 &&
    typeof input[0] === "number" &&
    Number.isFinite(input[0]) &&
    typeof input[1] === "number" &&
    Number.isFinite(input[1])
  );
}

function areCoordinatePairsEqual(left: [number, number], right: [number, number]) {
  return left[0] === right[0] && left[1] === right[1];
}

function normalizeLinearRing(input: unknown) {
  if (!Array.isArray(input)) {
    return null;
  }

  const coordinates: Array<[number, number]> = [];
  for (const point of input) {
    if (!isCoordinatePair(point)) {
      continue;
    }

    const normalizedPoint: [number, number] = [point[0], point[1]];
    if (
      coordinates.length === 0 ||
      !areCoordinatePairsEqual(coordinates[coordinates.length - 1]!, normalizedPoint)
    ) {
      coordinates.push(normalizedPoint);
    }
  }

  if (coordinates.length < 3) {
    return null;
  }

  const firstPoint = coordinates[0]!;
  const lastPoint = coordinates[coordinates.length - 1]!;
  if (!areCoordinatePairsEqual(firstPoint, lastPoint)) {
    coordinates.push([firstPoint[0], firstPoint[1]]);
  }

  return coordinates.length >= 4 ? coordinates : null;
}

function normalizePolygonCoordinates(input: unknown) {
  if (!Array.isArray(input)) {
    return null;
  }

  const rings = input
    .map((ring) => normalizeLinearRing(ring))
    .filter((ring): ring is Array<[number, number]> => Boolean(ring));

  if (rings.length === 0) {
    return null;
  }

  return rings;
}

function normalizePolygonGeometryPart(input: unknown) {
  const coordinates = normalizePolygonCoordinates(input);
  if (!coordinates) {
    return null;
  }

  return {
    type: "Polygon" as const,
    coordinates,
  };
}

function toPolygonGeometryParts(
  geometry: RegionBoundaryGeometry | null | undefined,
): Array<{
  type: "Polygon";
  coordinates: Array<Array<[number, number]>>;
}> {
  if (!geometry) {
    return [];
  }

  if (geometry.type === "Polygon") {
    const polygon = normalizePolygonGeometryPart(geometry.coordinates);
    return polygon ? [polygon] : [];
  }

  if (geometry.type !== "MultiPolygon" || !Array.isArray(geometry.coordinates)) {
    return [];
  }

  return geometry.coordinates
    .map((coordinates) => normalizePolygonGeometryPart(coordinates))
    .filter(
      (
        polygon,
      ): polygon is {
        type: "Polygon";
        coordinates: Array<Array<[number, number]>>;
      } => Boolean(polygon),
    );
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

export function createEditableBoundaryGeometryParts(
  geometry: RegionBoundaryGeometry | null | undefined,
) {
  const simplifiedGeometry = simplifyBoundaryEditingGeometry(geometry);
  const simplifiedParts = toPolygonGeometryParts(simplifiedGeometry);
  if (simplifiedParts.length > 0) {
    return simplifiedParts;
  }

  return toPolygonGeometryParts(geometry);
}

export function mergeEditableBoundaryGeometryParts(
  parts: Array<{
    type: "Polygon";
    coordinates: unknown;
  }>,
): RegionBoundaryGeometry | null {
  const normalizedParts = parts
    .map((part) => normalizePolygonGeometryPart(part.coordinates))
    .filter(
      (
        polygon,
      ): polygon is {
        type: "Polygon";
        coordinates: Array<Array<[number, number]>>;
      } => Boolean(polygon),
    );

  if (normalizedParts.length === 0) {
    return null;
  }

  if (normalizedParts.length === 1) {
    return normalizedParts[0];
  }

  return {
    type: "MultiPolygon",
    coordinates: normalizedParts.map((part) => part.coordinates),
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
