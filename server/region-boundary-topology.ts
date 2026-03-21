import { area } from "@turf/area";
import { difference } from "@turf/difference";
import { featureCollection } from "@turf/helpers";
import { intersect } from "@turf/intersect";
import { union } from "@turf/union";
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

const MIN_PERSISTABLE_FRAGMENT_AREA_SQM = 0.01;

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

  const coordinates = geometry.coordinates as MultiPolygon["coordinates"];

  return coordinates.map((coordinates) => ({
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

function collectPolygonBounds(geometry: Polygon["coordinates"]) {
  let minLng = Number.POSITIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;

  for (const ring of geometry) {
    for (const coordinate of ring) {
      const [lng, lat] = coordinate;
      if (lng < minLng) {
        minLng = lng;
      }
      if (lat < minLat) {
        minLat = lat;
      }
      if (lng > maxLng) {
        maxLng = lng;
      }
      if (lat > maxLat) {
        maxLat = lat;
      }
    }
  }

  return { minLng, minLat, maxLng, maxLat };
}

function collectGeometryBounds(geometry: RegionBoundaryGeometry) {
  const polygons =
    geometry.type === "Polygon"
      ? [geometry.coordinates as Polygon["coordinates"]]
      : (geometry.coordinates as MultiPolygon["coordinates"]);

  return polygons.reduce(
    (bounds, coordinates) => {
      const polygonBounds = collectPolygonBounds(coordinates);
      return {
        minLng: Math.min(bounds.minLng, polygonBounds.minLng),
        minLat: Math.min(bounds.minLat, polygonBounds.minLat),
        maxLng: Math.max(bounds.maxLng, polygonBounds.maxLng),
        maxLat: Math.max(bounds.maxLat, polygonBounds.maxLat),
      };
    },
    {
      minLng: Number.POSITIVE_INFINITY,
      minLat: Number.POSITIVE_INFINITY,
      maxLng: Number.NEGATIVE_INFINITY,
      maxLat: Number.NEGATIVE_INFINITY,
    },
  );
}

function nearlyEqual(left: number, right: number, epsilon = 1e-9) {
  return Math.abs(left - right) <= epsilon;
}

function touchesAlongSharedEdge(fragmentBounds: ReturnType<typeof collectGeometryBounds>, neighborBounds: ReturnType<typeof collectGeometryBounds>) {
  const verticalOverlap = Math.min(fragmentBounds.maxLat, neighborBounds.maxLat) - Math.max(
    fragmentBounds.minLat,
    neighborBounds.minLat,
  );
  const horizontalOverlap = Math.min(fragmentBounds.maxLng, neighborBounds.maxLng) - Math.max(
    fragmentBounds.minLng,
    neighborBounds.minLng,
  );

  const touchesEastWest =
    (nearlyEqual(fragmentBounds.maxLng, neighborBounds.minLng) ||
      nearlyEqual(fragmentBounds.minLng, neighborBounds.maxLng)) &&
    verticalOverlap > 0;
  const touchesNorthSouth =
    (nearlyEqual(fragmentBounds.maxLat, neighborBounds.minLat) ||
      nearlyEqual(fragmentBounds.minLat, neighborBounds.maxLat)) &&
    horizontalOverlap > 0;

  return touchesEastWest || touchesNorthSouth;
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
  const fragmentBounds = collectGeometryBounds(params.fragment.geometry);

  for (const neighbor of params.neighborFeatures) {
    const neighborFeature = toTurfFeature(neighbor.geometry);
    const intersection = intersect(featureCollection([params.fragment, neighborFeature]));
    const hasPositiveAreaOverlap = intersection ? area(intersection) > 0 : false;
    const neighborBounds = collectGeometryBounds(neighbor.geometry);
    const hasSharedEdge = touchesAlongSharedEdge(fragmentBounds, neighborBounds);

    if (!hasPositiveAreaOverlap && !hasSharedEdge) {
      continue;
    }

    candidateBoundaryKeys.push(findBoundaryKey(neighbor));
  }

  return uniqueStrings(candidateBoundaryKeys);
}

function classifyFragment(params: {
  fragmentId: string;
  sourceBoundaryKey: string;
  type: TopologyFragmentType;
  geometry: RegionBoundaryGeometry;
  candidateBoundaryKeys: string[];
  areaSqM: number;
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
      areaSqM: params.areaSqM,
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
      areaSqM: params.areaSqM,
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
    areaSqM: params.areaSqM,
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

function unionGeometry(left: RegionBoundaryGeometry, right: RegionBoundaryGeometry): RegionBoundaryGeometry {
  const result = union(featureCollection([toTurfFeature(left), toTurfFeature(right)]));
  if (!result) {
    return cloneValue(left);
  }

  return cloneValue(result.geometry) as RegionBoundaryGeometry;
}

function resolveFragmentAssignments(params: {
  sourceBoundaryKey: string;
  fragmentType: TopologyFragmentType;
  fragments: PolygonFeature[];
  neighborFeatures: PublishedBoundaryFeature[];
}) {
  return params.fragments.flatMap((fragment, index) => {
    const areaSqM = geometryArea(fragment.geometry);
    if (!Number.isFinite(areaSqM) || areaSqM < MIN_PERSISTABLE_FRAGMENT_AREA_SQM) {
      return [];
    }

    return [
      classifyFragment({
        fragmentId: `frag-${String(index + 1).padStart(3, "0")}`,
        sourceBoundaryKey: params.sourceBoundaryKey,
        type: params.fragmentType,
        geometry: fragment.geometry,
        candidateBoundaryKeys: discoverCandidateBoundaryKeys({
          fragment,
          neighborFeatures: params.neighborFeatures,
        }),
        areaSqM,
      }),
    ];
  });
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

  const fragments = [...releasedAssignments, ...takeoverAssignments].map((fragment, index) => ({
    ...fragment,
    fragmentId: `frag-${String(index + 1).padStart(3, "0")}`,
  }));
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
  const baseFeatureByBoundaryKey = new Map(
    params.baseFeatures.map((feature) => [
      feature.boundaryKey,
      {
        ...feature,
        geometry: cloneValue(feature.geometry),
      },
    ]),
  );
  const targetFeature = baseFeatureByBoundaryKey.get(params.targetBoundaryKey);
  if (!targetFeature) {
    throw new Error(`Target boundary ${params.targetBoundaryKey} tidak ditemukan untuk materialisasi geometry pack`);
  }

  const affectedBoundaryKeys = new Set<string>([params.targetBoundaryKey]);
  const nextFeatureByBoundaryKey = new Map<string, PublishedBoundaryFeature>();
  nextFeatureByBoundaryKey.set(params.targetBoundaryKey, {
    ...targetFeature,
    geometry: cloneValue(params.targetGeometry),
  });

  for (const assignment of params.assignments) {
    if (assignment.type === "released-fragment" && assignment.assignedBoundaryKey && assignment.status === "resolved") {
      const assignedFeature = baseFeatureByBoundaryKey.get(assignment.assignedBoundaryKey);
      if (!assignedFeature) {
        continue;
      }

      const currentFeature = nextFeatureByBoundaryKey.get(assignment.assignedBoundaryKey) ?? {
        ...assignedFeature,
        geometry: cloneValue(assignedFeature.geometry),
      };
      currentFeature.geometry = unionGeometry(currentFeature.geometry, assignment.geometry);
      nextFeatureByBoundaryKey.set(assignment.assignedBoundaryKey, currentFeature);
      affectedBoundaryKeys.add(assignment.assignedBoundaryKey);
      continue;
    }

    if (assignment.type === "takeover-area") {
      for (const boundaryKey of assignment.candidateBoundaryKeys) {
        const affectedFeature = baseFeatureByBoundaryKey.get(boundaryKey);
        if (!affectedFeature) {
          continue;
        }

        const currentFeature = nextFeatureByBoundaryKey.get(boundaryKey) ?? {
          ...affectedFeature,
          geometry: cloneValue(affectedFeature.geometry),
        };
        const nextGeometry = differenceGeometry(toTurfFeature(currentFeature.geometry), toTurfFeature(assignment.geometry));
        if (nextGeometry) {
          currentFeature.geometry = nextGeometry;
        }
        nextFeatureByBoundaryKey.set(boundaryKey, currentFeature);
        affectedBoundaryKeys.add(boundaryKey);
      }
    }
  }

  return {
    targetBoundaryKey: params.targetBoundaryKey,
    targetGeometry: params.targetGeometry,
    assignments: params.assignments,
    requiresTakeoverConfirmation: params.assignments.some((assignment) => assignment.type === "takeover-area"),
    affectedBoundaryKeys: Array.from(affectedBoundaryKeys),
    features: Array.from(nextFeatureByBoundaryKey.values()).filter((feature) => affectedBoundaryKeys.has(feature.boundaryKey)),
  };
}
