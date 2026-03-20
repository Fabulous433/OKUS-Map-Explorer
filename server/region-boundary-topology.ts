import { area } from "@turf/area";
import { booleanIntersects } from "@turf/boolean-intersects";
import { difference } from "@turf/difference";
import type { Feature, FeatureCollection, MultiPolygon, Polygon } from "geojson";
import type { RegionBoundaryGeometry, RegionBoundaryTopologyStatus } from "@shared/region-boundary-admin";
import type { PublishedBoundaryFeature } from "./region-boundary-overrides";

type TurfFeature = Feature<Polygon | MultiPolygon, Record<string, unknown>>;
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

function toTurfFeature(geometry: RegionBoundaryGeometry): TurfFeature {
  return {
    type: "Feature",
    geometry: cloneValue(geometry) as Polygon | MultiPolygon,
    properties: {},
  };
}

function toPolygonFeatures(geometry: RegionBoundaryGeometry): PolygonFeature[] {
  if (geometry.type === "Polygon") {
    return [
      {
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: cloneValue(geometry.coordinates) as Polygon["coordinates"],
        },
        properties: {},
      },
    ];
  }

  return geometry.coordinates.map((coordinates) => ({
    type: "Feature",
    geometry: {
      type: "Polygon",
      coordinates: cloneValue(coordinates) as Polygon["coordinates"],
    },
    properties: {},
  }));
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

function findBoundaryKey(feature: PublishedBoundaryFeature) {
  return feature.boundaryKey;
}

function discoverCandidateBoundaryKeys(params: {
  fragment: PolygonFeature;
  neighborFeatures: PublishedBoundaryFeature[];
}) {
  const candidateBoundaryKeys: string[] = [];

  for (const neighbor of params.neighborFeatures) {
    const neighborFeature = toTurfFeature(neighbor.geometry);
    if (booleanIntersects(params.fragment, neighborFeature)) {
      candidateBoundaryKeys.push(findBoundaryKey(neighbor));
    }
  }

  return uniqueStrings(candidateBoundaryKeys);
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

function differenceGeometry(left: TurfFeature, right: TurfFeature): RegionBoundaryGeometry | null {
  const result = difference({
    type: "FeatureCollection",
    features: [left, right],
  } as TurfFeatureCollection);

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
  const manualAssignmentRequiredCount = assignments.filter((item) => item.status !== "resolved").length;

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
    revisionId: 1,
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
