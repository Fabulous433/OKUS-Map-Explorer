import assert from "node:assert/strict";

import {
  analyzeTopologyDraft,
  findCandidateBoundaryKeys,
  splitTopologyFragments,
} from "../../server/region-boundary-topology";
import type { PublishedBoundaryFeature } from "../../server/region-boundary-overrides";

type PolygonGeometry = {
  type: "Polygon";
  coordinates: number[][][];
};

type MultiPolygonGeometry = {
  type: "MultiPolygon";
  coordinates: number[][][][];
};

function square(minLng: number, minLat: number, maxLng: number, maxLat: number): PolygonGeometry {
  return {
    type: "Polygon",
    coordinates: [
      [
        [minLng, minLat],
        [maxLng, minLat],
        [maxLng, maxLat],
        [minLng, maxLat],
        [minLng, minLat],
      ],
    ],
  };
}

function polygonWithHole(
  outer: PolygonGeometry,
  hole: PolygonGeometry,
): PolygonGeometry {
  return {
    type: "Polygon",
    coordinates: [outer.coordinates[0], hole.coordinates[0]],
  };
}

function multiPolygon(...parts: PolygonGeometry[]): MultiPolygonGeometry {
  return {
    type: "MultiPolygon",
    coordinates: parts.map((part) => part.coordinates),
  };
}

function feature(input: {
  boundaryKey: string;
  kecamatanId: string;
  kelurahanId: string;
  namaDesa: string;
  geometry: PolygonGeometry;
}): PublishedBoundaryFeature {
  return {
    boundaryKey: input.boundaryKey,
    kecamatanId: input.kecamatanId,
    kelurahanId: input.kelurahanId,
    namaDesa: input.namaDesa,
    geometry: input.geometry,
  };
}

async function run() {
  const targetBoundaryKey = "okus:target-desa";
  const targetFeature = feature({
    boundaryKey: targetBoundaryKey,
    kecamatanId: "kec-target",
    kelurahanId: "kel-target",
    namaDesa: "Target Desa",
    geometry: square(0, 0, 10, 10),
  });

  const eastNeighbor = feature({
    boundaryKey: "okus:tetangga-timur",
    kecamatanId: "kec-timur",
    kelurahanId: "kel-timur",
    namaDesa: "Tetangga Timur",
    geometry: square(10, 2, 14, 8),
  });
  const northNeighbor = feature({
    boundaryKey: "okus:tetangga-utara",
    kecamatanId: "kec-utara",
    kelurahanId: "kel-utara",
    namaDesa: "Tetangga Utara",
    geometry: square(2, 10, 8, 14),
  });
  const northEastNeighbor = feature({
    boundaryKey: "okus:tetangga-timur-laut",
    kecamatanId: "kec-utara",
    kelurahanId: "kel-timur-laut",
    namaDesa: "Tetangga Timur Laut",
    geometry: square(10, 10, 14, 14),
  });
  const westFar = feature({
    boundaryKey: "okus:tetangga-barat-jauh",
    kecamatanId: "kec-barat",
    kelurahanId: "kel-barat",
    namaDesa: "Tetangga Barat Jauh",
    geometry: square(-14, 2, -10, 8),
  });

  const baseFeatures = [targetFeature, eastNeighbor, northNeighbor, northEastNeighbor, westFar];

  const singleCandidateDraft = square(0, 0, 9.25, 10);
  const singleCandidateResult = await analyzeTopologyDraft({
    targetBoundaryKey,
    targetGeometry: singleCandidateDraft,
    baseFeatures,
  });

  assert.equal(singleCandidateResult.canPublish, true);
  assert.equal(singleCandidateResult.topologyStatus, "draft-ready");
  assert.equal(singleCandidateResult.fragments.length, 1);
  assert.deepEqual(
    {
      fragmentId: singleCandidateResult.fragments[0]?.fragmentId,
      type: singleCandidateResult.fragments[0]?.type,
      candidateBoundaryKeys: singleCandidateResult.fragments[0]?.candidateBoundaryKeys,
      assignedBoundaryKey: singleCandidateResult.fragments[0]?.assignedBoundaryKey,
      assignmentMode: singleCandidateResult.fragments[0]?.assignmentMode,
      status: singleCandidateResult.fragments[0]?.status,
    },
    {
      fragmentId: "frag-001",
      type: "released-fragment",
      candidateBoundaryKeys: ["okus:tetangga-timur"],
      assignedBoundaryKey: "okus:tetangga-timur",
      assignmentMode: "auto",
      status: "resolved",
    },
  );

  const multiCandidateDraft = polygonWithHole(square(0, 0, 10, 10), square(7.6, 7.6, 10, 10));
  const multiCandidateResult = await analyzeTopologyDraft({
    targetBoundaryKey,
    targetGeometry: multiCandidateDraft,
    baseFeatures,
  });

  assert.equal(multiCandidateResult.canPublish, false);
  assert.equal(multiCandidateResult.topologyStatus, "draft-needs-resolution");
  assert.equal(multiCandidateResult.fragments[0]?.type, "released-fragment");
  assert.equal(multiCandidateResult.fragments[0]?.status, "unresolved");
  assert.ok((multiCandidateResult.fragments[0]?.candidateBoundaryKeys ?? []).length > 1);

  const takeoverDraft = multiPolygon(square(0, 0, 10, 10), square(10.1, 4, 11, 5));
  const takeoverResult = await analyzeTopologyDraft({
    targetBoundaryKey,
    targetGeometry: takeoverDraft,
    baseFeatures,
  });

  assert.equal(takeoverResult.requiresTakeoverConfirmation, true);
  assert.equal(takeoverResult.topologyStatus, "draft-needs-resolution");
  assert.equal(takeoverResult.fragments[0]?.type, "takeover-area");
  assert.deepEqual(takeoverResult.fragments[0]?.candidateBoundaryKeys, ["okus:tetangga-timur"]);
  assert.equal(takeoverResult.fragments[0]?.status, "resolved");

  const noCandidateDraft = polygonWithHole(square(0, 0, 10, 10), square(4.2, 4.2, 5.8, 5.8));
  const noCandidateResult = await analyzeTopologyDraft({
    targetBoundaryKey,
    targetGeometry: noCandidateDraft,
    baseFeatures,
  });

  assert.equal(noCandidateResult.canPublish, false);
  assert.equal(noCandidateResult.topologyStatus, "draft-needs-resolution");
  assert.equal(noCandidateResult.fragments[0]?.status, "invalid");
  assert.deepEqual(noCandidateResult.fragments[0]?.candidateBoundaryKeys, []);

  const candidateKeys = findCandidateBoundaryKeys({
    fragment: {
      type: "Feature",
      geometry: square(10.1, 4, 11, 5),
      properties: {},
    },
    neighborFeatures: baseFeatures.slice(1),
  });
  assert.deepEqual(candidateKeys, ["okus:tetangga-timur"]);

  assert.equal(splitTopologyFragments(square(0, 0, 10, 10)).length, 1);
}

run()
  .then(() => {
    console.log("[integration] region-boundary-topology-analysis: PASS");
  })
  .catch((error) => {
    console.error("[integration] region-boundary-topology-analysis: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
