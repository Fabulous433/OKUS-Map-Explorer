import assert from "node:assert/strict";

import {
  regionBoundaryFragmentAssignmentModeSchema,
  regionBoundaryFragmentAssignmentPayloadSchema,
  regionBoundaryFragmentStatusSchema,
  regionBoundaryFragmentTypeSchema,
  regionBoundaryPublishPayloadSchema,
  regionBoundaryRevisionSchema,
  regionBoundaryTakeoverConfirmationPayloadSchema,
  regionBoundaryTopologyAnalysisSchema,
  regionBoundaryTopologyStatusSchema,
  regionBoundaryTopologySummarySchema,
} from "@shared/region-boundary-admin";

async function run() {
  const releasedFragment = {
    fragmentId: "frag-bumi-agung-001",
    type: "released-fragment",
    sourceBoundaryKey: "muaradua:bumi-agung",
    candidateBoundaryKeys: ["muaradua:batu-belang-jaya", "runjungagung:desa-contoh"],
    assignedBoundaryKey: null,
    assignmentMode: null,
    status: "unresolved",
    geometry: {
      type: "Polygon",
      coordinates: [[[104.07, -4.55], [104.08, -4.55], [104.08, -4.54], [104.07, -4.55]]],
    },
    areaSqM: 12450.5,
  };

  assert.equal(regionBoundaryTopologyStatusSchema.parse("draft-editing"), "draft-editing");
  assert.equal(regionBoundaryTopologyStatusSchema.parse("draft-needs-resolution"), "draft-needs-resolution");
  assert.equal(regionBoundaryTopologyStatusSchema.parse("draft-ready"), "draft-ready");
  assert.equal(regionBoundaryTopologyStatusSchema.parse("published"), "published");
  assert.equal(regionBoundaryTopologyStatusSchema.parse("superseded"), "superseded");

  assert.equal(regionBoundaryFragmentTypeSchema.parse("released-fragment"), "released-fragment");
  assert.equal(regionBoundaryFragmentTypeSchema.parse("takeover-area"), "takeover-area");
  assert.equal(regionBoundaryFragmentAssignmentModeSchema.parse("auto"), "auto");
  assert.equal(regionBoundaryFragmentAssignmentModeSchema.parse("manual"), "manual");
  assert.equal(regionBoundaryFragmentStatusSchema.parse("unresolved"), "unresolved");
  assert.equal(regionBoundaryFragmentStatusSchema.parse("resolved"), "resolved");

  const topologySummary = regionBoundaryTopologySummarySchema.parse({
    fragmentCount: 1,
    unresolvedFragmentCount: 1,
    autoAssignedFragmentCount: 0,
    manualAssignmentRequiredCount: 1,
  });
  assert.equal(topologySummary.fragmentCount, 1);

  const topologyAnalysis = regionBoundaryTopologyAnalysisSchema.parse({
    revisionId: 101,
    regionKey: "okus",
    level: "desa",
    topologyStatus: "draft-needs-resolution",
    summary: topologySummary,
    fragments: [releasedFragment],
  });
  assert.equal(topologyAnalysis.fragments[0]?.fragmentId, releasedFragment.fragmentId);

  const fragmentAssignment = regionBoundaryFragmentAssignmentPayloadSchema.parse({
    revisionId: 101,
    fragmentId: releasedFragment.fragmentId,
    assignedBoundaryKey: "muaradua:batu-belang-jaya",
    assignmentMode: "manual",
  });
  assert.equal(fragmentAssignment.assignmentMode, "manual");

  const takeoverConfirmation = regionBoundaryTakeoverConfirmationPayloadSchema.parse({
    revisionId: 101,
    takeoverConfirmedBy: "admin",
  });
  assert.equal(takeoverConfirmation.takeoverConfirmedBy, "admin");

  const draftRevision = regionBoundaryRevisionSchema.parse({
    id: 101,
    regionKey: "okus",
    level: "desa",
    status: "draft",
    topologyStatus: "draft-editing",
    topologySummary: topologySummary,
    takeoverConfirmedAt: null,
    takeoverConfirmedBy: null,
    notes: "topology edit draft",
    createdBy: "admin",
    publishedBy: null,
    publishedAt: null,
    impactSummary: null,
    createdAt: "2026-03-20T01:23:45.000Z",
    updatedAt: "2026-03-20T01:23:45.000Z",
  });
  assert.equal(draftRevision.topologyStatus, "draft-editing");

  const publishPayload = regionBoundaryPublishPayloadSchema.parse({
    revisionId: 101,
    mode: "publish-and-reconcile",
    topologyStatus: "draft-ready",
  });
  assert.equal(publishPayload.topologyStatus, "draft-ready");
}

run()
  .then(() => {
    console.log("[integration] region-boundary-topology-contract: PASS");
  })
  .catch((error) => {
    console.error("[integration] region-boundary-topology-contract: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
