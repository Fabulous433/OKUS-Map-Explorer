import assert from "node:assert/strict";

import {
  regionBoundaryDraftFeatureSchema,
  regionBoundaryRevisionSchema,
  regionBoundaryTopologyAnalysisSchema,
} from "@shared/region-boundary-admin";
import {
  masterKecamatan,
  masterKelurahan,
  regionBoundaryRevision,
  regionBoundaryRevisionFeature,
  regionBoundaryRevisionFragment,
} from "@shared/schema";
import { and, asc, eq, inArray } from "drizzle-orm";
import { invalidateActiveRegionBoundaryCache } from "../../server/region-boundaries";
import { buildDesaBoundaryKey } from "../../server/region-boundary-overrides";
import { db } from "../../server/storage";
import { createIntegrationServer, type JsonRecord } from "./_helpers";

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
    coordinates: [[
      [minLng, minLat],
      [maxLng, minLat],
      [maxLng, maxLat],
      [minLng, maxLat],
      [minLng, minLat],
    ]],
  };
}

function polygonWithHole(outer: PolygonGeometry, hole: PolygonGeometry): PolygonGeometry {
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

async function deleteDraftRevisions(revisionIds: number[]) {
  const uniqueRevisionIds = Array.from(new Set(revisionIds));
  if (uniqueRevisionIds.length === 0) {
    return;
  }

  await db
    .delete(regionBoundaryRevisionFragment)
    .where(inArray(regionBoundaryRevisionFragment.revisionId, uniqueRevisionIds));
  await db
    .delete(regionBoundaryRevisionFeature)
    .where(inArray(regionBoundaryRevisionFeature.revisionId, uniqueRevisionIds));
  await db.delete(regionBoundaryRevision).where(inArray(regionBoundaryRevision.id, uniqueRevisionIds));
}

function computeBoundsFromCoordinates(coordinates: unknown) {
  let minLng = Number.POSITIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;

  const visit = (value: unknown) => {
    if (!Array.isArray(value)) {
      return;
    }

    if (
      value.length >= 2 &&
      typeof value[0] === "number" &&
      typeof value[1] === "number"
    ) {
      minLng = Math.min(minLng, value[0]);
      minLat = Math.min(minLat, value[1]);
      maxLng = Math.max(maxLng, value[0]);
      maxLat = Math.max(maxLat, value[1]);
      return;
    }

    for (const entry of value) {
      visit(entry);
    }
  };

  visit(coordinates);

  if (![minLng, minLat, maxLng, maxLat].every(Number.isFinite)) {
    throw new Error("Geometry boundary tidak memiliki koordinat polygon yang valid");
  }

  return { minLng, minLat, maxLng, maxLat };
}

async function run() {
  const server = await createIntegrationServer();
  const createdRevisionIds: number[] = [];

  try {
    const existingDraftRevisionIds = await db
      .select({ id: regionBoundaryRevision.id })
      .from(regionBoundaryRevision)
      .where(
        and(
          eq(regionBoundaryRevision.regionKey, "okus"),
          eq(regionBoundaryRevision.level, "desa"),
          eq(regionBoundaryRevision.status, "draft"),
        ),
      );
    await deleteDraftRevisions(existingDraftRevisionIds.map((row) => row.id));
    invalidateActiveRegionBoundaryCache();

    const [muaradua] = await db
      .select()
      .from(masterKecamatan)
      .where(eq(masterKecamatan.cpmKecamatan, "Muaradua"))
      .limit(1);
    assert.ok(muaradua, "master kecamatan Muaradua wajib tersedia");
    const [runjungAgung] = await db
      .select()
      .from(masterKecamatan)
      .where(eq(masterKecamatan.cpmKecamatan, "Runjung Agung"))
      .limit(1);
    assert.ok(runjungAgung, "master kecamatan Runjung Agung wajib tersedia");

    const muaraduaDesaNames = ["Bumi Agung", "Batu Belang Jaya", "Suka Banjar", "Sukaraja II"] as const;
    const muaraduaDesaRows = await db
      .select()
      .from(masterKelurahan)
      .where(
        and(
          eq(masterKelurahan.cpmKodeKec, muaradua.cpmKodeKec),
          inArray(masterKelurahan.cpmKelurahan, [...muaraduaDesaNames]),
        ),
      );
    assert.equal(
      muaraduaDesaRows.length,
      muaraduaDesaNames.length,
      "seluruh desa synthetic topology wajib tersedia di master",
    );
    const [runjungAgungDesa] = await db
      .select()
      .from(masterKelurahan)
      .where(eq(masterKelurahan.cpmKodeKec, runjungAgung.cpmKodeKec))
      .orderBy(asc(masterKelurahan.cpmKelurahan))
      .limit(1);
    assert.ok(runjungAgungDesa, "minimal satu desa Runjung Agung wajib tersedia di master");

    const desaByName = new Map(muaraduaDesaRows.map((row) => [row.cpmKelurahan, row]));
    const targetDesa = desaByName.get("Bumi Agung");
    const eastDesa = desaByName.get("Batu Belang Jaya");
    const northDesa = desaByName.get("Suka Banjar");
    const northEastDesa = desaByName.get("Sukaraja II");
    assert.ok(
      targetDesa && eastDesa && northDesa && northEastDesa && runjungAgungDesa,
      "master desa synthetic wajib lengkap",
    );

    const targetBoundaryKey = buildDesaBoundaryKey({
      kecamatanName: muaradua.cpmKecamatan,
      desaName: targetDesa.cpmKelurahan,
    });
    const eastBoundaryKey = buildDesaBoundaryKey({
      kecamatanName: muaradua.cpmKecamatan,
      desaName: eastDesa.cpmKelurahan,
    });
    const northBoundaryKey = buildDesaBoundaryKey({
      kecamatanName: muaradua.cpmKecamatan,
      desaName: northDesa.cpmKelurahan,
    });
    const northEastBoundaryKey = buildDesaBoundaryKey({
      kecamatanName: muaradua.cpmKecamatan,
      desaName: northEastDesa.cpmKelurahan,
    });
    const westBoundaryKey = buildDesaBoundaryKey({
      kecamatanName: runjungAgung.cpmKecamatan,
      desaName: runjungAgungDesa.cpmKelurahan,
    });

    const [syntheticPublishedRevision] = await db
      .insert(regionBoundaryRevision)
      .values({
        regionKey: "okus",
        level: "desa",
        status: "published",
        topologyStatus: "draft-ready",
        topologySummary: {
          fragmentCount: 0,
          unresolvedFragmentCount: 0,
          autoAssignedFragmentCount: 0,
          manualAssignmentRequiredCount: 0,
        },
        notes: "synthetic topology baseline",
        createdBy: "integration-test",
        publishedBy: "integration-test",
        publishedAt: new Date("2099-03-20T03:00:00.000Z"),
        createdAt: new Date("2099-03-20T03:00:00.000Z"),
        updatedAt: new Date("2099-03-20T03:00:00.000Z"),
      })
      .returning({ id: regionBoundaryRevision.id });
    createdRevisionIds.push(syntheticPublishedRevision.id);

    const syntheticFeatures = [
      {
        boundaryKey: targetBoundaryKey,
        kelurahanId: targetDesa.cpmKelId,
        namaDesa: targetDesa.cpmKelurahan,
        geometry: square(0, 0, 10, 10),
      },
      {
        boundaryKey: eastBoundaryKey,
        kelurahanId: eastDesa.cpmKelId,
        namaDesa: eastDesa.cpmKelurahan,
        geometry: square(10, 2, 14, 8),
      },
      {
        boundaryKey: northBoundaryKey,
        kelurahanId: northDesa.cpmKelId,
        namaDesa: northDesa.cpmKelurahan,
        geometry: square(2, 10, 8, 14),
      },
      {
        boundaryKey: northEastBoundaryKey,
        kelurahanId: northEastDesa.cpmKelId,
        namaDesa: northEastDesa.cpmKelurahan,
        geometry: square(10, 10, 14, 14),
      },
      {
        boundaryKey: westBoundaryKey,
        kelurahanId: runjungAgungDesa.cpmKelId,
        namaDesa: runjungAgungDesa.cpmKelurahan,
        geometry: square(-4, 2, 0, 8),
      },
    ];

    await db.insert(regionBoundaryRevisionFeature).values(
      syntheticFeatures.map((feature) => ({
        revisionId: syntheticPublishedRevision.id,
        boundaryKey: feature.boundaryKey,
        kecamatanId:
          feature.boundaryKey === westBoundaryKey ? runjungAgung.cpmKecId : muaradua.cpmKecId,
        kelurahanId: feature.kelurahanId,
        namaDesa: feature.namaDesa,
        geometry: feature.geometry,
        bounds: computeBoundsFromCoordinates(feature.geometry.coordinates),
        createdAt: new Date("2099-03-20T03:00:00.000Z"),
        updatedAt: new Date("2099-03-20T03:00:00.000Z"),
      })),
    );

    invalidateActiveRegionBoundaryCache();

    const viewerLogin = await server.loginAs("viewer", "viewer123");
    assert.equal(viewerLogin.response.status, 200, "login viewer wajib sukses");

    const forbiddenAnalyze = await server.jsonRequest(
      "/api/backoffice/region-boundaries/desa/draft/analyze",
      "POST",
      {
        boundaryKey: targetBoundaryKey,
        level: "desa",
        kecamatanId: muaradua.cpmKecId,
        kelurahanId: targetDesa.cpmKelId,
        namaDesa: targetDesa.cpmKelurahan,
        geometry: square(0, 0, 9.25, 10),
      },
    );
    assert.equal(forbiddenAnalyze.response.status, 403, "non-admin harus ditolak dari analyze topology");

    const forbiddenTopology = await server.requestJson(
      `/api/backoffice/region-boundaries/desa/draft/topology?kecamatanId=${encodeURIComponent(muaradua.cpmKecId)}`,
    );
    assert.equal(forbiddenTopology.response.status, 403, "non-admin harus ditolak dari draft topology");

    await server.logout();

    const adminLogin = await server.loginAs("admin", "admin123");
    assert.equal(adminLogin.response.status, 200, "login admin wajib sukses");

    const singleCandidateAnalyze = await server.jsonRequest(
      "/api/backoffice/region-boundaries/desa/draft/analyze",
      "POST",
      {
        boundaryKey: targetBoundaryKey,
        level: "desa",
        kecamatanId: muaradua.cpmKecId,
        kelurahanId: targetDesa.cpmKelId,
        namaDesa: targetDesa.cpmKelurahan,
        geometry: square(0, 0, 9.25, 10),
      },
    );
    assert.equal(singleCandidateAnalyze.response.status, 200, "analyze draft valid harus sukses");

    const singleCandidateBody = singleCandidateAnalyze.body as JsonRecord;
    const singleCandidateRevision = regionBoundaryRevisionSchema.parse(singleCandidateBody.revision);
    const singleCandidateAnalysis = regionBoundaryTopologyAnalysisSchema.parse(singleCandidateBody.analysis);
    const singleCandidateFeatures = Array.isArray(singleCandidateBody.features)
      ? singleCandidateBody.features.map((item) => regionBoundaryDraftFeatureSchema.parse(item))
      : [];
    createdRevisionIds.push(singleCandidateRevision.id);

    assert.equal(singleCandidateAnalysis.revisionId, singleCandidateRevision.id);
    assert.equal(singleCandidateAnalysis.topologyStatus, "draft-ready");
    assert.equal(singleCandidateAnalysis.summary.fragmentCount, 1);
    assert.equal(singleCandidateAnalysis.summary.autoAssignedFragmentCount, 1);
    assert.equal(singleCandidateAnalysis.summary.unresolvedFragmentCount, 0);
    assert.equal(singleCandidateAnalysis.fragments[0]?.candidateBoundaryKeys[0], eastBoundaryKey);
    assert.equal(singleCandidateAnalysis.fragments[0]?.assignedBoundaryKey, eastBoundaryKey);
    assert.equal(singleCandidateAnalysis.fragments[0]?.assignmentMode, "auto");
    assert.equal(singleCandidateAnalysis.fragments[0]?.status, "resolved");
    assert.deepEqual(
      singleCandidateFeatures.map((feature) => feature.boundaryKey).sort(),
      [eastBoundaryKey, targetBoundaryKey].sort(),
    );

    const topologyResponse = await server.requestJson(
      `/api/backoffice/region-boundaries/desa/draft/topology?kecamatanId=${encodeURIComponent(muaradua.cpmKecId)}`,
    );
    assert.equal(topologyResponse.response.status, 200, "draft topology harus bisa dibaca admin");
    const topologyBody = topologyResponse.body as JsonRecord;
    const topologyRevision = regionBoundaryRevisionSchema.parse(topologyBody.revision);
    const topologyAnalysis = regionBoundaryTopologyAnalysisSchema.parse(topologyBody.analysis);
    assert.equal(topologyRevision.id, singleCandidateRevision.id);
    assert.equal(topologyAnalysis.fragments[0]?.assignedBoundaryKey, eastBoundaryKey);

    const persistedAutoFragments = await db
      .select()
      .from(regionBoundaryRevisionFragment)
      .where(eq(regionBoundaryRevisionFragment.revisionId, singleCandidateRevision.id));
    assert.equal(persistedAutoFragments.length, 1, "fragment auto-assign harus tersimpan");
    assert.equal(persistedAutoFragments[0]?.assignedBoundaryKey, eastBoundaryKey);
    assert.equal(persistedAutoFragments[0]?.assignmentMode, "auto");
    assert.equal(persistedAutoFragments[0]?.status, "resolved");

    await db.delete(regionBoundaryRevision).where(eq(regionBoundaryRevision.id, singleCandidateRevision.id));

    const crossKecamatanAnalyze = await server.jsonRequest(
      "/api/backoffice/region-boundaries/desa/draft/analyze",
      "POST",
      {
        boundaryKey: targetBoundaryKey,
        level: "desa",
        kecamatanId: muaradua.cpmKecId,
        kelurahanId: targetDesa.cpmKelId,
        namaDesa: targetDesa.cpmKelurahan,
        geometry: square(0.75, 0, 10, 10),
      },
    );
    assert.equal(crossKecamatanAnalyze.response.status, 200, "analyze lintas-kecamatan harus sukses");
    const crossKecamatanBody = crossKecamatanAnalyze.body as JsonRecord;
    const crossKecamatanRevision = regionBoundaryRevisionSchema.parse(crossKecamatanBody.revision);
    const crossKecamatanAnalysis = regionBoundaryTopologyAnalysisSchema.parse(crossKecamatanBody.analysis);
    createdRevisionIds.push(crossKecamatanRevision.id);
    assert.equal(
      crossKecamatanAnalysis.fragments[0]?.candidateBoundaryKeys[0],
      westBoundaryKey,
      "topology lintas-kecamatan harus menemukan kandidat desa dari kecamatan lain",
    );
    assert.equal(
      crossKecamatanAnalysis.fragments[0]?.assignedBoundaryKey,
      westBoundaryKey,
      "fragment kandidat tunggal lintas-kecamatan harus auto-assign",
    );

    await db.delete(regionBoundaryRevision).where(eq(regionBoundaryRevision.id, crossKecamatanRevision.id));

    const tinyFragmentAnalyze = await server.jsonRequest(
      "/api/backoffice/region-boundaries/desa/draft/analyze",
      "POST",
      {
        boundaryKey: targetBoundaryKey,
        level: "desa",
        kecamatanId: muaradua.cpmKecId,
        kelurahanId: targetDesa.cpmKelId,
        namaDesa: targetDesa.cpmKelurahan,
        geometry: multiPolygon(
          square(0, 0, 10, 10),
          {
            type: "Polygon",
            coordinates: [[
              [10, 5],
              [10, 5.0000001],
              [10.0000001, 5.0000001],
              [10, 5],
            ]],
          },
        ),
      },
    );
    assert.equal(
      tinyFragmentAnalyze.response.status,
      200,
      "fragmen takeover yang lebih kecil dari resolusi penyimpanan harus difilter, bukan memecahkan save draft",
    );
    const tinyFragmentBody = tinyFragmentAnalyze.body as JsonRecord;
    const tinyFragmentRevision = regionBoundaryRevisionSchema.parse(tinyFragmentBody.revision);
    const tinyFragmentAnalysis = regionBoundaryTopologyAnalysisSchema.parse(tinyFragmentBody.analysis);
    createdRevisionIds.push(tinyFragmentRevision.id);
    assert.equal(tinyFragmentAnalysis.summary.fragmentCount, 0);
    assert.equal(tinyFragmentAnalysis.topologyStatus, "draft-ready");

    await db.delete(regionBoundaryRevision).where(eq(regionBoundaryRevision.id, tinyFragmentRevision.id));

    const multiCandidateAnalyze = await server.jsonRequest(
      "/api/backoffice/region-boundaries/desa/draft/analyze",
      "POST",
      {
        boundaryKey: targetBoundaryKey,
        level: "desa",
        kecamatanId: muaradua.cpmKecId,
        kelurahanId: targetDesa.cpmKelId,
        namaDesa: targetDesa.cpmKelurahan,
        geometry: polygonWithHole(square(0, 0, 10, 10), square(7.6, 7.6, 10, 10)),
      },
    );
    assert.equal(multiCandidateAnalyze.response.status, 200, "analyze multi-candidate harus sukses");
    const multiCandidateBody = multiCandidateAnalyze.body as JsonRecord;
    const multiCandidateRevision = regionBoundaryRevisionSchema.parse(multiCandidateBody.revision);
    const multiCandidateAnalysis = regionBoundaryTopologyAnalysisSchema.parse(multiCandidateBody.analysis);
    createdRevisionIds.push(multiCandidateRevision.id);
    assert.ok(multiCandidateRevision.id > 0, "revision multi-candidate harus valid");
    assert.equal(multiCandidateAnalysis.topologyStatus, "draft-needs-resolution");
    assert.equal(multiCandidateAnalysis.summary.manualAssignmentRequiredCount, 1);
    assert.equal(multiCandidateAnalysis.fragments[0]?.status, "unresolved");
    assert.deepEqual(
      [...(multiCandidateAnalysis.fragments[0]?.candidateBoundaryKeys ?? [])].sort(),
      [eastBoundaryKey, northBoundaryKey].sort(),
    );

    const assignFragment = await server.jsonRequest(
      `/api/backoffice/region-boundaries/desa/draft/fragments/${encodeURIComponent(multiCandidateAnalysis.fragments[0]!.fragmentId)}/assign`,
      "POST",
      {
        revisionId: multiCandidateRevision.id,
        assignedBoundaryKey: northBoundaryKey,
        assignmentMode: "manual",
      },
    );
    assert.equal(assignFragment.response.status, 200, "assign fragment manual harus sukses");
    const assignBody = assignFragment.body as JsonRecord;
    const assignedAnalysis = regionBoundaryTopologyAnalysisSchema.parse(assignBody.analysis);
    assert.equal(assignedAnalysis.topologyStatus, "draft-ready");
    assert.equal(assignedAnalysis.fragments[0]?.assignedBoundaryKey, northBoundaryKey);
    assert.equal(assignedAnalysis.fragments[0]?.assignmentMode, "manual");
    assert.equal(assignedAnalysis.fragments[0]?.status, "resolved");

    const [persistedManualFragment] = await db
      .select()
      .from(regionBoundaryRevisionFragment)
      .where(
        and(
          eq(regionBoundaryRevisionFragment.revisionId, multiCandidateRevision.id),
          eq(regionBoundaryRevisionFragment.fragmentId, multiCandidateAnalysis.fragments[0]!.fragmentId),
        ),
      )
      .limit(1);
    assert.equal(persistedManualFragment?.assignedBoundaryKey, northBoundaryKey);
    assert.equal(persistedManualFragment?.assignmentMode, "manual");
    assert.equal(persistedManualFragment?.status, "resolved");

    await db.delete(regionBoundaryRevision).where(eq(regionBoundaryRevision.id, multiCandidateRevision.id));

    const invalidAnalyze = await server.jsonRequest(
      "/api/backoffice/region-boundaries/desa/draft/analyze",
      "POST",
      {
        boundaryKey: targetBoundaryKey,
        level: "desa",
        kecamatanId: muaradua.cpmKecId,
        kelurahanId: targetDesa.cpmKelId,
        namaDesa: targetDesa.cpmKelurahan,
        geometry: polygonWithHole(square(0, 0, 10, 10), square(4, 4, 6, 6)),
      },
    );
    assert.equal(invalidAnalyze.response.status, 200, "analyze invalid fragment harus tetap sukses");
    const invalidBody = invalidAnalyze.body as JsonRecord;
    const invalidRevision = regionBoundaryRevisionSchema.parse(invalidBody.revision);
    const invalidAnalysis = regionBoundaryTopologyAnalysisSchema.parse(invalidBody.analysis);
    createdRevisionIds.push(invalidRevision.id);
    assert.equal(invalidAnalysis.topologyStatus, "draft-needs-resolution");
    assert.equal(
      invalidAnalysis.summary.invalidFragmentCount,
      1,
      "fragment tanpa kandidat harus dihitung sebagai invalid secara eksplisit",
    );
    assert.equal(
      invalidAnalysis.fragments[0]?.status,
      "invalid",
      "fragment tanpa kandidat tidak boleh lagi disamarkan sebagai unresolved biasa",
    );
    assert.deepEqual(
      invalidAnalysis.fragments[0]?.candidateBoundaryKeys,
      [],
      "fragment invalid harus mengembalikan daftar kandidat kosong",
    );

    await db.delete(regionBoundaryRevision).where(eq(regionBoundaryRevision.id, invalidRevision.id));

    const takeoverAnalyze = await server.jsonRequest(
      "/api/backoffice/region-boundaries/desa/draft/analyze",
      "POST",
      {
        boundaryKey: targetBoundaryKey,
        level: "desa",
        kecamatanId: muaradua.cpmKecId,
        kelurahanId: targetDesa.cpmKelId,
        namaDesa: targetDesa.cpmKelurahan,
        geometry: multiPolygon(square(0, 0, 10, 10), square(10.1, 4, 11, 5)),
      },
    );
    assert.equal(takeoverAnalyze.response.status, 200, "analyze takeover harus sukses");
    const takeoverBody = takeoverAnalyze.body as JsonRecord;
    const takeoverRevision = regionBoundaryRevisionSchema.parse(takeoverBody.revision);
    const takeoverAnalysis = regionBoundaryTopologyAnalysisSchema.parse(takeoverBody.analysis);
    createdRevisionIds.push(takeoverRevision.id);
    assert.equal(takeoverAnalysis.topologyStatus, "draft-needs-resolution");
    assert.equal(takeoverAnalysis.fragments[0]?.type, "takeover-area");
    assert.equal(takeoverAnalysis.fragments[0]?.status, "resolved");
    assert.equal(takeoverAnalysis.fragments[0]?.assignedBoundaryKey, eastBoundaryKey);
    assert.equal(takeoverRevision.takeoverConfirmedAt, null);
    assert.equal(takeoverRevision.takeoverConfirmedBy, null);

    const confirmTakeover = await server.jsonRequest(
      "/api/backoffice/region-boundaries/desa/draft/takeover/confirm",
      "POST",
      {
        revisionId: takeoverRevision.id,
        takeoverConfirmedBy: "admin",
      },
    );
    assert.equal(confirmTakeover.response.status, 200, "konfirmasi takeover harus sukses");
    const confirmBody = confirmTakeover.body as JsonRecord;
    const confirmedRevision = regionBoundaryRevisionSchema.parse(confirmBody.revision);
    const confirmedAnalysis = regionBoundaryTopologyAnalysisSchema.parse(confirmBody.analysis);
    assert.equal(confirmedRevision.takeoverConfirmedBy, "admin");
    assert.notEqual(confirmedRevision.takeoverConfirmedAt, null);
    assert.equal(confirmedAnalysis.topologyStatus, "draft-ready");

    const persistedFeatureRows = await db
      .select({
        boundaryKey: regionBoundaryRevisionFeature.boundaryKey,
      })
      .from(regionBoundaryRevisionFeature)
      .where(eq(regionBoundaryRevisionFeature.revisionId, takeoverRevision.id));
    assert.deepEqual(
      persistedFeatureRows.map((row) => row.boundaryKey).sort(),
      [eastBoundaryKey, targetBoundaryKey].sort(),
    );

    await db.delete(regionBoundaryRevision).where(eq(regionBoundaryRevision.id, takeoverRevision.id));

    const firstDraftAnalyze = await server.jsonRequest(
      "/api/backoffice/region-boundaries/desa/draft/analyze",
      "POST",
      {
        boundaryKey: targetBoundaryKey,
        level: "desa",
        kecamatanId: muaradua.cpmKecId,
        kelurahanId: targetDesa.cpmKelId,
        namaDesa: targetDesa.cpmKelurahan,
        geometry: polygonWithHole(square(0, 0, 10, 10), square(7.6, 7.6, 10, 10)),
      },
    );
    assert.equal(firstDraftAnalyze.response.status, 200, "draft pertama untuk reset harus sukses");
    const firstDraftBody = firstDraftAnalyze.body as JsonRecord;
    const sharedDraftRevision = regionBoundaryRevisionSchema.parse(firstDraftBody.revision);
    createdRevisionIds.push(sharedDraftRevision.id);

    const secondDraftAnalyze = await server.jsonRequest(
      "/api/backoffice/region-boundaries/desa/draft/analyze",
      "POST",
      {
        boundaryKey: northBoundaryKey,
        level: "desa",
        kecamatanId: muaradua.cpmKecId,
        kelurahanId: northDesa.cpmKelId,
        namaDesa: northDesa.cpmKelurahan,
        geometry: square(2, 10.5, 8, 14),
      },
    );
    assert.equal(secondDraftAnalyze.response.status, 200, "draft kedua untuk reset harus sukses");

    const topologyBeforeReset = await server.requestJson(
      `/api/backoffice/region-boundaries/desa/draft/topology?kecamatanId=${encodeURIComponent(muaradua.cpmKecId)}`,
    );
    assert.equal(topologyBeforeReset.response.status, 200, "topology sebelum reset harus bisa dibaca");
    const topologyBeforeResetBody = topologyBeforeReset.body as JsonRecord;
    const topologyBeforeResetAnalysis = regionBoundaryTopologyAnalysisSchema.parse(topologyBeforeResetBody.analysis);
    assert.equal(
      new Set(topologyBeforeResetAnalysis.fragments.map((fragment) => fragment.sourceBoundaryKey)).has(northBoundaryKey),
      true,
      "revision draft gabungan harus memuat fragment dari desa kedua sebelum reset",
    );

    const resetDraft = await server.requestJson(
      `/api/backoffice/region-boundaries/desa/draft/features/${encodeURIComponent(northBoundaryKey)}`,
      { method: "DELETE" },
    );
    assert.equal(resetDraft.response.status, 200, "reset draft per desa harus tersedia untuk admin");

    const topologyAfterReset = await server.requestJson(
      `/api/backoffice/region-boundaries/desa/draft/topology?kecamatanId=${encodeURIComponent(muaradua.cpmKecId)}`,
    );
    assert.equal(topologyAfterReset.response.status, 200, "topology sesudah reset harus bisa dibaca");
    const topologyAfterResetBody = topologyAfterReset.body as JsonRecord;
    const topologyAfterResetAnalysis = regionBoundaryTopologyAnalysisSchema.parse(topologyAfterResetBody.analysis);
    assert.equal(
      new Set(topologyAfterResetAnalysis.fragments.map((fragment) => fragment.sourceBoundaryKey)).has(northBoundaryKey),
      false,
      "reset draft per desa harus menghapus fragment milik desa yang direset dari revision aktif",
    );
  } finally {
    await deleteDraftRevisions(createdRevisionIds);
    invalidateActiveRegionBoundaryCache();
    await server.close();
  }
}

run()
  .then(() => {
    console.log("[integration] region-boundary-topology-resolution-api: PASS");
  })
  .catch((error) => {
    console.error("[integration] region-boundary-topology-resolution-api: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
