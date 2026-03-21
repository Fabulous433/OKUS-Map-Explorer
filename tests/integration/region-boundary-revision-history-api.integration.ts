import assert from "node:assert/strict";

import { eq, inArray } from "drizzle-orm";
import {
  regionBoundaryRevision,
  regionBoundaryRevisionFeature,
  regionBoundaryRevisionFragment,
} from "@shared/schema";
import { db } from "../../server/storage";
import { createIntegrationServer, requiredString, type JsonRecord } from "./_helpers";

function createSquareGeometry(offset: number) {
  return {
    type: "Polygon" as const,
    coordinates: [[
      [104 + offset, -4.5],
      [104.01 + offset, -4.5],
      [104.01 + offset, -4.49],
      [104 + offset, -4.49],
      [104 + offset, -4.5],
    ]],
  };
}

async function run() {
  const server = await createIntegrationServer();
  const revisionIds: number[] = [];

  try {
    const [shrinkRevision] = await db
      .insert(regionBoundaryRevision)
      .values({
        regionKey: "okus",
        level: "desa",
        status: "published",
        topologyStatus: "draft-ready",
        topologySummary: {
          fragmentCount: 1,
          unresolvedFragmentCount: 0,
          autoAssignedFragmentCount: 1,
          manualAssignmentRequiredCount: 0,
          invalidFragmentCount: 0,
        },
        notes: "Riwayat Desa A",
        createdBy: "integration-test",
        publishedBy: "integration-test",
        publishedAt: new Date("2026-03-20T03:00:00.000Z"),
        createdAt: new Date("2026-03-20T03:00:00.000Z"),
        updatedAt: new Date("2026-03-20T03:00:00.000Z"),
      })
      .returning({ id: regionBoundaryRevision.id });
    revisionIds.push(shrinkRevision.id);

    await db.insert(regionBoundaryRevisionFeature).values([
      {
        revisionId: shrinkRevision.id,
        boundaryKey: "muaradua:desa-a",
        kecamatanId: "1609040",
        kelurahanId: "1609040001",
        namaDesa: "Desa A",
        geometry: createSquareGeometry(0),
        bounds: { minLng: 104, minLat: -4.5, maxLng: 104.01, maxLat: -4.49 },
      },
      {
        revisionId: shrinkRevision.id,
        boundaryKey: "muaradua:desa-b",
        kecamatanId: "1609040",
        kelurahanId: "1609040002",
        namaDesa: "Desa B",
        geometry: createSquareGeometry(0.02),
        bounds: { minLng: 104.02, minLat: -4.5, maxLng: 104.03, maxLat: -4.49 },
      },
    ]);
    await db.insert(regionBoundaryRevisionFragment).values({
      revisionId: shrinkRevision.id,
      fragmentId: "frag-001",
      type: "released-fragment",
      sourceBoundaryKey: "muaradua:desa-a",
      candidateBoundaryKeys: ["muaradua:desa-b"],
      assignedBoundaryKey: "muaradua:desa-b",
      assignmentMode: "auto",
      status: "resolved",
      geometry: createSquareGeometry(0.001),
      areaSqM: "120.50",
    });

    const [expandDraftRevision] = await db
      .insert(regionBoundaryRevision)
      .values({
        regionKey: "okus",
        level: "desa",
        status: "draft",
        topologyStatus: "draft-needs-resolution",
        topologySummary: {
          fragmentCount: 1,
          unresolvedFragmentCount: 1,
          autoAssignedFragmentCount: 0,
          manualAssignmentRequiredCount: 1,
          invalidFragmentCount: 0,
        },
        notes: "Riwayat Desa C",
        createdBy: "integration-test",
        publishedBy: null,
        publishedAt: null,
        createdAt: new Date("2026-03-21T04:00:00.000Z"),
        updatedAt: new Date("2026-03-21T04:00:00.000Z"),
      })
      .returning({ id: regionBoundaryRevision.id });
    revisionIds.push(expandDraftRevision.id);

    await db.insert(regionBoundaryRevisionFeature).values([
      {
        revisionId: expandDraftRevision.id,
        boundaryKey: "pulauberingin:desa-c",
        kecamatanId: "1609010",
        kelurahanId: "1609010001",
        namaDesa: "Desa C",
        geometry: createSquareGeometry(0.05),
        bounds: { minLng: 104.05, minLat: -4.5, maxLng: 104.06, maxLat: -4.49 },
      },
      {
        revisionId: expandDraftRevision.id,
        boundaryKey: "pulauberingin:desa-d",
        kecamatanId: "1609010",
        kelurahanId: "1609010002",
        namaDesa: "Desa D",
        geometry: createSquareGeometry(0.07),
        bounds: { minLng: 104.07, minLat: -4.5, maxLng: 104.08, maxLat: -4.49 },
      },
    ]);
    await db.insert(regionBoundaryRevisionFragment).values({
      revisionId: expandDraftRevision.id,
      fragmentId: "frag-002",
      type: "takeover-area",
      sourceBoundaryKey: "pulauberingin:desa-c",
      candidateBoundaryKeys: ["pulauberingin:desa-d"],
      assignedBoundaryKey: "pulauberingin:desa-d",
      assignmentMode: "manual",
      status: "unresolved",
      geometry: createSquareGeometry(0.051),
      areaSqM: "250.00",
    });

    const adminLogin = await server.loginAs("admin", "admin123");
    assert.equal(adminLogin.response.status, 200, "login admin wajib sukses");

    const desaAHistoryResponse = await server.requestJson(
      `/api/backoffice/region-boundaries/desa/revision-history?boundaryKey=${encodeURIComponent("muaradua:desa-a")}`,
    );
    assert.equal(desaAHistoryResponse.response.status, 200, "riwayat revisi per desa harus bisa diakses admin");
    const desaAHistory = desaAHistoryResponse.body as JsonRecord[];
    assert.equal(desaAHistory.length, 1, "riwayat desa A hanya boleh memuat desa yang benar-benar diedit");
    assert.equal(requiredString(desaAHistory[0]?.boundaryKey, "boundaryKey riwayat desa A wajib ada"), "muaradua:desa-a");
    assert.equal(requiredString(desaAHistory[0]?.boundaryName, "boundaryName riwayat desa A wajib ada"), "Desa A");
    assert.equal(requiredString(desaAHistory[0]?.changeType, "changeType riwayat desa A wajib ada"), "penyusutan");

    const desaCHistoryResponse = await server.requestJson(
      `/api/backoffice/region-boundaries/desa/revision-history?boundaryKey=${encodeURIComponent("pulauberingin:desa-c")}`,
    );
    assert.equal(desaCHistoryResponse.response.status, 200, "riwayat revisi desa C harus bisa diakses admin");
    const desaCHistory = desaCHistoryResponse.body as JsonRecord[];
    assert.equal(desaCHistory.length, 1, "riwayat desa C tidak boleh memuat revisi desa lain");
    assert.equal(requiredString(desaCHistory[0]?.boundaryKey, "boundaryKey riwayat desa C wajib ada"), "pulauberingin:desa-c");
    assert.equal(requiredString(desaCHistory[0]?.changeType, "changeType riwayat desa C wajib ada"), "perluasan");
    assert.equal(requiredString(desaCHistory[0]?.status, "status riwayat desa C wajib ada"), "draft");

    const desaBHistoryResponse = await server.requestJson(
      `/api/backoffice/region-boundaries/desa/revision-history?boundaryKey=${encodeURIComponent("muaradua:desa-b")}`,
    );
    assert.equal(desaBHistoryResponse.response.status, 200, "riwayat desa terdampak harus tetap bisa diminta");
    assert.deepEqual(
      desaBHistoryResponse.body,
      [],
      "desa terdampak tidak boleh mewarisi riwayat revisi jika bukan desa yang diedit langsung",
    );
  } finally {
    if (revisionIds.length > 0) {
      await db
        .delete(regionBoundaryRevision)
        .where(inArray(regionBoundaryRevision.id, revisionIds));
    }
    await server.close();
  }
}

run()
  .then(() => {
    console.log("[integration] region-boundary-revision-history-api: PASS");
  })
  .catch((error) => {
    console.error("[integration] region-boundary-revision-history-api: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
