import assert from "node:assert/strict";

import {
  regionBoundaryDraftFeatureSchema,
  regionBoundaryImpactPreviewSchema,
  regionBoundaryPublishPayloadSchema,
  regionBoundaryRevisionSchema,
} from "@shared/region-boundary-admin";

async function run() {
  const draftFeature = {
    boundaryKey: "muaradua:batu-belang-jaya",
    level: "desa",
    kecamatanId: "1609040",
    kelurahanId: "1609040013",
    namaDesa: "Batu Belang Jaya",
    geometry: {
      type: "Polygon",
      coordinates: [[[104.07, -4.55], [104.08, -4.55], [104.08, -4.54], [104.07, -4.55]]],
    },
  };

  const draftRevision = regionBoundaryRevisionSchema.parse({
    id: 11,
    regionKey: "okus",
    level: "desa",
    status: "draft",
    notes: "geser sisi timur",
    createdBy: "admin",
    publishedBy: null,
    publishedAt: null,
    impactSummary: null,
    createdAt: "2026-03-20T01:23:45.000Z",
    updatedAt: "2026-03-20T01:23:45.000Z",
  });
  assert.equal(draftRevision.status, "draft");

  const publishedRevision = regionBoundaryRevisionSchema.parse({
    id: 12,
    regionKey: "okus",
    level: "desa",
    status: "published",
    notes: "publish koreksi Cemara Homestay",
    createdBy: "admin",
    publishedBy: "admin",
    publishedAt: "2026-03-20T02:00:00.000Z",
    impactSummary: {
      impactedCount: 1,
      movedItems: [
        {
          opId: 1,
          namaOp: "Cemara Homestay",
          fromKelurahan: "Bumi Agung",
          toKelurahan: "Batu Belang Jaya",
        },
      ],
    },
    createdAt: "2026-03-20T01:23:45.000Z",
    updatedAt: "2026-03-20T02:00:00.000Z",
  });
  assert.equal(publishedRevision.status, "published");

  const parsedDraftFeature = regionBoundaryDraftFeatureSchema.parse(draftFeature);
  assert.equal(parsedDraftFeature.geometry.type, "Polygon");

  const impactPreview = regionBoundaryImpactPreviewSchema.parse({
    impactedCount: 1,
    movedItems: [
      {
        opId: 1,
        namaOp: "Cemara Homestay",
        fromKelurahan: "Bumi Agung",
        toKelurahan: "Batu Belang Jaya",
      },
    ],
  });
  assert.equal(impactPreview.movedItems[0]?.namaOp, "Cemara Homestay");

  const publishPayload = regionBoundaryPublishPayloadSchema.parse({
    revisionId: 12,
    mode: "publish-and-reconcile",
  });
  assert.equal(publishPayload.mode, "publish-and-reconcile");
}

run()
  .then(() => {
    console.log("[integration] region-boundary-admin-contract: PASS");
  })
  .catch((error) => {
    console.error("[integration] region-boundary-admin-contract: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
