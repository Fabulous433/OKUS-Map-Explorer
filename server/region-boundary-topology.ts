import { area } from "@turf/area";
import { booleanIntersects } from "@turf/boolean-intersects";
import { booleanPointInPolygon } from "@turf/boolean-point-in-polygon";
import { difference } from "@turf/difference";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import type { RegionBoundaryGeometry, RegionBoundaryTopologyStatus } from "@shared/region-boundary-admin";
import type { PublishedBoundaryFeature } from "./region-boundary-overrides";

type TurfGeometryFeature = Feature<Polygon | MultiPolygon, Record<string, unknown>>;
type PolygonFeature = Feature<Polygon, Record<string, unknown>>;
type TurfFeatureCollection = FeatureCollection<Polygon | MultiPolygon, Record<string, unknown>>;

export type TopologyFragmentType = "released-fragment" | "takeover-area";
export type TopologyFragmentStatus = "resolved" | "unresolved" | "invalid";
export type TopologyFragmentAssignmentMode = "auto" | "manual" | null;

export type TopologyFragment = {
  fragmentId: string;
  type: TopologyFragmentType;
  sourceBoundaryKey: string;
  candidateBoundaryKeys: string[];
  assignedBoundaryKey: string | null;
  assignmentMode: TopologyFragmentAssignmentMode;
  status: TopologyFragmentStatus;
  geometry: RegionBoundaryGeometry;
  areaSqM: number;
};

export type TopologySummary = {
  fragmentCount: number;
  unresolvedFragmentCount: number;
  autoAssignedFragmentCount: number;
  manualAssignmentRequiredCount: number;
  invalidFragmentCount: number;
};

export type TopologyAnalysisResult = {
  revisionId: number;
  regionKey: string;
  level: "desa";
  topologyStatus: RegionBoundaryTopologyStatus;
  summary: TopologySummary;
  fragments: TopologyFragment[];
  canPublish: boolean;
  requiresTakeoverConfirmation: boolean;
};

type BoundaryAnalysisInput = {
  targetBoundaryKey: string;
  targetGeometry: RegionBoundaryGeometry;
  baseFeatures?: PublishedBoundaryFeature[];
};

function cloneValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function toTurfFeature(geometry: RegionBoundaryGeometry): TurfGeometryFeature {
  return {
    type: "Feature",
    geometry: cloneValue(geometry) as Polygon | MultiPolygon,
    properties: {},
  };
}

function toPolygonFeatures(geometry: RegionBoundaryGeometry): PolygonFeature[] {
  const polygons: Polygon["coordinates"][] =
    geometry.type === "Polygon"
      ? [cloneValue(geometry.coordinates as Polygon["coordinates"])]
      : (geometry.coordinates as MultiPolygon["coordinates"]).map((coordinates) =>
          cloneValue(coordinates),
        );

  return polygons.map((coordinates) => ({
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates,
    },
    properties: {},
  }));
}

function collectBoundarySamplePoints(coordinates: Polygon["coordinates"]) {
  const points: Array<[number, number]> = [];
  const sampleFractions = [0.1, 0.3, 0.5, 0.7, 0.9];

  for (const ring of coordinates) {
    if (ring.length < 2) {
      continue;
    }

    for (let index = 0; index < ring.length - 1; index++) {
      const start = ring[index];
      const end = ring[index + 1];
      if (
        !start ||
        !end ||
        typeof start[0] !== "number" ||
        typeof start[1] !== "number" ||
        typeof end[0] !== "number" ||
        typeof end[1] !== "number"
      ) {
        continue;
      }

      for (const fraction of sampleFractions) {
        points.push([
          start[0] + (end[0] - start[0]) * fraction,
          start[1] + (end[1] - start[1]) * fraction,
        ]);
      }
    }
  }

  return points;
}

function uniqueStrings(values: string[]) {
  return Array.from(new Set(values));
}

function geometryArea(geometry: RegionBoundaryGeometry) {
  return area(toTurfFeature(geometry));
}

function splitGeometryFragments(geometry: RegionBoundaryGeometry): PolygonFeature[] {
  return toPolygonFeatures(geometry);
}

function isFragmentTouchingNeighbor(fragment: PolygonFeature, neighbor: TurfGeometryFeature) {
  if (!booleanIntersects(fragment as TurfGeometryFeature, neighbor)) {
    return false;
  }

  const samplePoints = collectBoundarySamplePoints(fragment.geometry.coordinates);
  return samplePoints.some((point) =>
    booleanPointInPolygon([point[0], point[1]], neighbor as TurfGeometryFeature),
  );
}

function findBoundaryKey(feature: PublishedBoundaryFeature) {
  return feature.boundaryKey;
}

function classifyFragment(params: {
  fragmentId: string;
  sourceBoundaryKey: string;
  type: TopologyFragmentType;
  geometry: RegionBoundaryGeometry;
  candidateBoundaryKeys: string[];
}): TopologyFragment {
  const candidates = uniqueStrings(params.candidateBoundaryKeys);

  if (candidates.length === 0) {
    return {
      fragmentId: params.fragmentId,
      type: params.type,
      sourceBoundaryKey: params.sourceBoundaryKey,
      candidateBoundaryKeys: [],
      assignedBoundaryKey: null,
      assignmentMode: null,
      status: "invalid",
      geometry: params.geometry,
      areaSqM: geometryArea(params.geometry),
    };
  }

  if (candidates.length === 1) {
    return {
      fragmentId: params.fragmentId,
      type: params.type,
      sourceBoundaryKey: params.sourceBoundaryKey,
      candidateBoundaryKeys: candidates,
      assignedBoundaryKey: candidates[0] ?? null,
      assignmentMode: "auto",
      status: "resolved",
      geometry: params.geometry,
      areaSqM: geometryArea(params.geometry),
    };
  }

  return {
    fragmentId: params.fragmentId,
    type: params.type,
    sourceBoundaryKey: params.sourceBoundaryKey,
    candidateBoundaryKeys: candidates,
    assignedBoundaryKey: null,
    assignmentMode: "manual",
    status: "unresolved",
    geometry: params.geometry,
    areaSqM: geometryArea(params.geometry),
  };
}

function discoverCandidateBoundaryKeys(params: {
  fragment: PolygonFeature;
  neighborFeatures: PublishedBoundaryFeature[];
}) {
  const candidateBoundaryKeys: string[] = [];

  for (const neighbor of params.neighborFeatures) {
    const neighborFeature = toTurfFeature(neighbor.geometry);
    if (isFragmentTouchingNeighbor(params.fragment, neighborFeature)) {
      candidateBoundaryKeys.push(findBoundaryKey(neighbor));
    }
  }

  return uniqueStrings(candidateBoundaryKeys);
}

function differenceGeometry(
  left: TurfGeometryFeature,
  right: TurfGeometryFeature,
): RegionBoundaryGeometry | null {
  const result = difference({
    type: "FeatureCollection",
    features: [left, right],
  } satisfies TurfFeatureCollection);

  if (!result) {
    return null;
  }

  return cloneValue(result.geometry) as RegionBoundaryGeometry;
}

function resolveFragmentAssignments(params: {
  sourceBoundaryKey: string;
  fragmentType: TopologyFragmentType;
  fragments: PolygonFeature[];
  neighborFeatures: PublishedBoundaryFeature[];
}) {
  return params.fragments.map((fragment, index) =>
    classifyFragment({
      fragmentId: `frag-${String(index + 1).padStart(3, "0")}`,
      sourceBoundaryKey: params.sourceBoundaryKey,
      type: params.fragmentType,
      geometry: fragment.geometry,
        candidateBoundaryKeys: discoverCandidateBoundaryKeys({
          fragment,
          neighborFeatures: params.neighborFeatures,
        }),
    }),
  );
}

function summarizeAssignments(assignments: TopologyFragment[]): TopologySummary {
  const unresolvedFragmentCount = assignments.filter((item) => item.status === "unresolved").length;
  const invalidFragmentCount = assignments.filter((item) => item.status === "invalid").length;
  const autoAssignedFragmentCount = assignments.filter(
    (item) => item.status === "resolved" && item.assignmentMode === "auto",
  ).length;
  const manualAssignmentRequiredCount = assignments.filter(
    (item) => item.status !== "resolved",
  ).length;

  return {
    fragmentCount: assignments.length,
    unresolvedFragmentCount,
    autoAssignedFragmentCount,
    manualAssignmentRequiredCount,
    invalidFragmentCount,
  };
}

function buildDraftStatus(params: {
  summary: TopologySummary;
  requiresTakeoverConfirmation: boolean;
}): RegionBoundaryTopologyStatus {
  if (params.requiresTakeoverConfirmation) {
    return "draft-needs-resolution";
  }

  if (params.summary.unresolvedFragmentCount > 0 || params.summary.invalidFragmentCount > 0) {
    return "draft-needs-resolution";
  }

  return "draft-ready";
}

export function splitTopologyFragments(geometry: RegionBoundaryGeometry) {
  return splitGeometryFragments(geometry);
}

export function findCandidateBoundaryKeys(params: {
  fragment: PolygonFeature;
  neighborFeatures: PublishedBoundaryFeature[];
}) {
  return discoverCandidateBoundaryKeys(params);
}

export async function analyzeTopologyDraft(params: BoundaryAnalysisInput): Promise<TopologyAnalysisResult> {
  const baseFeatures = params.baseFeatures ?? [];
  const targetFeature = baseFeatures.find((feature) => feature.boundaryKey === params.targetBoundaryKey);
  if (!targetFeature) {
    throw new Error(`Target boundary ${params.targetBoundaryKey} tidak ditemukan`);
  }

  const sourceFeature = toTurfFeature(targetFeature.geometry);
  const nextFeature = toTurfFeature(params.targetGeometry);

  const releasedGeometry = differenceGeometry(sourceFeature, nextFeature);
  const takeoverGeometry = differenceGeometry(nextFeature, sourceFeature);

  const releasedFragments = releasedGeometry ? splitGeometryFragments(releasedGeometry) : [];
  const takeoverFragments = takeoverGeometry ? splitGeometryFragments(takeoverGeometry) : [];

  const neighborFeatures = baseFeatures.filter((feature) => feature.boundaryKey !== params.targetBoundaryKey);
  const releasedAssignments = resolveFragmentAssignments({
    sourceBoundaryKey: params.targetBoundaryKey,
    fragmentType: "released-fragment",
    fragments: releasedFragments,
    neighborFeatures,
  });
  const takeoverAssignments = resolveFragmentAssignments({
    sourceBoundaryKey: params.targetBoundaryKey,
    fragmentType: "takeover-area",
    fragments: takeoverFragments,
    neighborFeatures,
  });

  const fragments = [...releasedAssignments, ...takeoverAssignments];
  const summary = summarizeAssignments(fragments);
  const requiresTakeoverConfirmation = takeoverAssignments.length > 0;
  const topologyStatus = buildDraftStatus({ summary, requiresTakeoverConfirmation });
  const canPublish =
    topologyStatus === "draft-ready" &&
    summary.unresolvedFragmentCount === 0 &&
    summary.invalidFragmentCount === 0 &&
    !requiresTakeoverConfirmation;

  return {
    revisionId: 0,
    regionKey: "okus",
    level: "desa",
    topologyStatus,
    summary,
    fragments,
    canPublish,
    requiresTakeoverConfirmation,
  };
}

export function materializeAffectedGeometryPack(params: {
  targetBoundaryKey: string;
  targetGeometry: RegionBoundaryGeometry;
  assignments: TopologyFragment[];
  baseFeatures: PublishedBoundaryFeature[];
}) {
  return {
    targetBoundaryKey: params.targetBoundaryKey,
    targetGeometry: params.targetGeometry,
    assignments: params.assignments,
    baseFeatureCount: params.baseFeatures.length,
    requiresTakeoverConfirmation: params.assignments.some((assignment) => assignment.type === "takeover-area"),
    affectedBoundaryKeys: uniqueStrings(
      params.assignments.flatMap((assignment) => assignment.candidateBoundaryKeys),
    ),
  };
}
