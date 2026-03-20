import assert from "node:assert/strict";

import bbox from "@turf/bbox";
import { booleanPointInPolygon } from "@turf/boolean-point-in-polygon";
import { and, eq } from "drizzle-orm";
import {
  masterKecamatan,
  masterKelurahan,
  masterRekeningPajak,
  objekPajak,
  regionBoundaryRevision,
  wajibPajak,
} from "@shared/schema";
import { getActiveRegionBoundary } from "../../server/region-boundaries";
import { db } from "../../server/storage";
import { createIntegrationServer, requiredNumber, requiredString, type JsonRecord } from "./_helpers";

const TARGET_BOUNDARY_KEY = "muaradua:batu-belang-jaya";
const TARGET_BOUNDARY_NAME = "Batu Belang Jaya";

type GeometryPoint = readonly [number, number];
type BoundaryFeature = {
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: unknown;
  };
  properties?: Record<string, unknown>;
};

function featureName(feature: BoundaryFeature) {
  return String(feature.properties?.WADMKD ?? feature.properties?.NAMOBJ ?? "").trim();
}

function findInteriorPointForFeature(feature: BoundaryFeature): GeometryPoint {
  const [minLng, minLat, maxLng, maxLat] = bbox(feature as never);
  const steps = 12;

  for (let lngStep = 0; lngStep < steps; lngStep++) {
    for (let latStep = 0; latStep < steps; latStep++) {
      const lng = minLng + ((lngStep + 0.5) / steps) * (maxLng - minLng);
      const lat = minLat + ((latStep + 0.5) / steps) * (maxLat - minLat);
      if (booleanPointInPolygon([lng, lat], feature as never)) {
        return [lng, lat];
      }
    }
  }

  throw new Error(`Tidak menemukan titik interior untuk feature ${featureName(feature) || "<unknown>"}`);
}

function createSquarePolygonAroundPoint(point: GeometryPoint, delta: number) {
  const [lng, lat] = point;
  return {
    type: "Polygon" as const,
    coordinates: [[
      [lng - delta, lat - delta],
      [lng + delta, lat - delta],
      [lng + delta, lat + delta],
      [lng - delta, lat + delta],
      [lng - delta, lat - delta],
    ]],
  };
}

function buildExpandedTargetGeometry(
  targetGeometry: BoundaryFeature["geometry"],
  donorPoint: GeometryPoint,
) {
  const donorSquare = createSquarePolygonAroundPoint(donorPoint, 0.00002);

  if (targetGeometry.type === "Polygon") {
    return {
      type: "MultiPolygon" as const,
      coordinates: [targetGeometry.coordinates, donorSquare.coordinates],
    };
  }

  if (targetGeometry.type === "MultiPolygon") {
    return {
      type: "MultiPolygon" as const,
      coordinates: [...targetGeometry.coordinates, donorSquare.coordinates],
    };
  }

  throw new Error(`Geometry target tidak didukung: ${targetGeometry.type}`);
}

function resolveContainingFeatureName(features: BoundaryFeature[], point: GeometryPoint) {
  const containing = features.find((feature) => booleanPointInPolygon(point, feature as never)) as
    | BoundaryFeature
    | undefined;
  return containing ? featureName(containing) : null;
}

function findMoveCandidate(
  features: BoundaryFeature[],
  targetFeature: BoundaryFeature,
  targetIndex: number,
): { point: GeometryPoint; donorVillageName: string } {
  for (const feature of features.slice(targetIndex + 1)) {
    if (featureName(feature) === TARGET_BOUNDARY_NAME) continue;

    const point = findInteriorPointForFeature(feature);
    const currentName = resolveContainingFeatureName(features, point);
    if (!currentName || currentName === TARGET_BOUNDARY_NAME) {
      continue;
    }

    const nextFeatures = features.map((item) =>
      featureName(item) === TARGET_BOUNDARY_NAME
        ? { ...item, geometry: buildExpandedTargetGeometry(targetFeature.geometry as BoundaryFeature["geometry"], point) }
        : item,
    );
    const nextName = resolveContainingFeatureName(nextFeatures, point);
    if (nextName === TARGET_BOUNDARY_NAME) {
      return { point, donorVillageName: currentName };
    }
  }

  throw new Error("Tidak menemukan kandidat donor yang berpindah ke target");
}

async function run() {
  const server = await createIntegrationServer();
  let createdOpId: number | null = null;
  let createdRevisionId: number | null = null;
  let draftRevisionId: number | null = null;

  try {
    const [muaradua] = await db
      .select()
      .from(masterKecamatan)
      .where(eq(masterKecamatan.cpmKecId, "1609040"))
      .limit(1);
    assert.ok(muaradua, "master kecamatan Muaradua wajib tersedia");

    const [batuBelangJaya] = await db
      .select()
      .from(masterKelurahan)
      .where(eq(masterKelurahan.cpmKelId, "1609040001"))
      .limit(1);
    assert.ok(batuBelangJaya, "master kelurahan Batu Belang Jaya wajib tersedia");

    const [seededWp] = await db.select().from(wajibPajak).limit(1);
    const [seededRekening] = await db
      .select()
      .from(masterRekeningPajak)
      .where(eq(masterRekeningPajak.jenisPajak, "Pajak MBLB"))
      .limit(1);
    assert.ok(seededWp, "seeded WP wajib tersedia");
    assert.ok(seededRekening, "rekening MBLB wajib tersedia");

    const activeBoundary = await getActiveRegionBoundary("desa", "precise", {
      kecamatanId: muaradua.cpmKecId,
      kecamatanName: muaradua.cpmKecamatan,
    });
    const targetIndex = activeBoundary.boundary.features.findIndex(
      (feature) => featureName(feature as BoundaryFeature) === TARGET_BOUNDARY_NAME,
    );
    const targetFeature = activeBoundary.boundary.features[targetIndex] as BoundaryFeature | undefined;
    assert.ok(targetFeature, "feature Batu Belang Jaya aktif wajib tersedia");
    assert.ok(targetIndex >= 0, "index feature Batu Belang Jaya aktif wajib tersedia");

    const moveCandidate = findMoveCandidate(
      activeBoundary.boundary.features as BoundaryFeature[],
      targetFeature,
      targetIndex,
    );
    const donorPoint = moveCandidate.point;
    const donorVillageName = moveCandidate.donorVillageName;

    const [donorKelurahan] = await db
      .select()
      .from(masterKelurahan)
      .where(
        and(
          eq(masterKelurahan.cpmKelurahan, donorVillageName),
          eq(masterKelurahan.cpmKodeKec, muaradua.cpmKodeKec),
        ),
      )
      .limit(1);
    assert.ok(donorKelurahan, "kelurahan donor wajib tersedia");

    const draftFeature = {
      boundaryKey: TARGET_BOUNDARY_KEY,
      level: "desa" as const,
      kecamatanId: muaradua.cpmKecId,
      kelurahanId: batuBelangJaya.cpmKelId,
      namaDesa: TARGET_BOUNDARY_NAME,
      geometry: buildExpandedTargetGeometry(targetFeature.geometry as BoundaryFeature["geometry"], donorPoint!),
    };

    const [createdOp] = await db
      .insert(objekPajak)
      .values({
        nopd: `ITBND${Date.now()}`.slice(0, 30),
        wpId: seededWp.id,
        rekPajakId: seededRekening.id,
        namaOp: "Cemara Homestay",
        npwpOp: null,
        alamatOp: "Jl. Cemara Homestay",
        kecamatanId: muaradua.cpmKecId,
        kelurahanId: donorKelurahan.cpmKelId,
        omsetBulanan: null,
        tarifPersen: null,
        pajakBulanan: null,
        latitude: String(donorPoint[1]),
        longitude: String(donorPoint[0]),
        status: "active",
        statusVerifikasi: "verified",
        catatanVerifikasi: null,
        verifiedAt: new Date(),
        verifiedBy: "integration-test",
        updatedAt: new Date(),
      })
      .returning({ id: objekPajak.id });
    createdOpId = createdOp.id;

    const [createdRevision] = await db
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
        },
        takeoverConfirmedAt: new Date("2026-03-20T02:00:00.000Z"),
        takeoverConfirmedBy: "admin",
        notes: "topology revision api mapping",
        createdBy: "integration-test",
        publishedBy: "integration-test",
        publishedAt: new Date("2026-03-20T02:00:00.000Z"),
        impactSummary: null,
        createdAt: new Date("2026-03-20T02:00:00.000Z"),
        updatedAt: new Date("2026-03-20T02:00:00.000Z"),
      })
      .returning({ id: regionBoundaryRevision.id });
    createdRevisionId = createdRevision.id;
    const viewerLogin = await server.loginAs("viewer", "viewer123");
    assert.equal(viewerLogin.response.status, 200, "login viewer wajib sukses");

    const forbiddenResponse = await server.requestJson("/api/backoffice/region-boundaries/desa/revisions");
    assert.equal(forbiddenResponse.response.status, 403, "non-admin harus ditolak dari boundary admin api");

    await server.logout();

    const adminLogin = await server.loginAs("admin", "admin123");
    assert.equal(adminLogin.response.status, 200, "login admin wajib sukses");

    const revisionsResponse = await server.requestJson("/api/backoffice/region-boundaries/desa/revisions");
    assert.equal(revisionsResponse.response.status, 200, "list revisions harus bisa diakses admin");
    const revisions = revisionsResponse.body as JsonRecord[];
    const mappedRevision = revisions.find((item) => item.id === createdRevisionId);
    assert.ok(mappedRevision, "revision dengan topology fields harus ikut terpetakan di response api");
    assert.equal(requiredString(mappedRevision?.topologyStatus, "topologyStatus wajib ada"), "draft-ready");
    assert.deepEqual(mappedRevision?.topologySummary, {
      fragmentCount: 1,
      unresolvedFragmentCount: 0,
      autoAssignedFragmentCount: 1,
      manualAssignmentRequiredCount: 0,
    });
    assert.equal(
      requiredString(mappedRevision?.takeoverConfirmedAt, "takeoverConfirmedAt wajib ada"),
      "2026-03-20T02:00:00.000Z",
    );
    assert.equal(requiredString(mappedRevision?.takeoverConfirmedBy, "takeoverConfirmedBy wajib ada"), "admin");

    const invalidSave = await server.jsonRequest(
      `/api/backoffice/region-boundaries/desa/draft/features/${encodeURIComponent(TARGET_BOUNDARY_KEY)}`,
      "PUT",
      {
        ...draftFeature,
        geometry: {
          type: "LineString",
          coordinates: [[104.07, -4.55], [104.08, -4.54]],
        },
      },
    );
    assert.equal(invalidSave.response.status, 400, "geometry invalid harus ditolak");

    const validSave = await server.jsonRequest(
      `/api/backoffice/region-boundaries/desa/draft/features/${encodeURIComponent(TARGET_BOUNDARY_KEY)}`,
      "PUT",
      draftFeature,
    );
    assert.equal(validSave.response.status, 200, "draft feature valid harus bisa disimpan");
    const savedDraft = validSave.body as JsonRecord;
    const savedFeature = savedDraft.feature as JsonRecord;
    const savedRevision = savedDraft.revision as JsonRecord;
    const savedAnalysis = savedDraft.analysis as JsonRecord;
    draftRevisionId = requiredNumber(savedRevision.id, "draft revision id save draft wajib ada");
    assert.equal(savedFeature.boundaryKey, draftFeature.boundaryKey);
    assert.equal(savedFeature.kecamatanId, draftFeature.kecamatanId);
    assert.equal(savedFeature.kelurahanId, draftFeature.kelurahanId);
    assert.equal((savedFeature.geometry as JsonRecord).type, "MultiPolygon");
    assert.equal(requiredString(savedRevision.topologyStatus, "topologyStatus save draft wajib ada"), "draft-needs-resolution");
    assert.ok(Array.isArray(savedAnalysis.fragments), "save draft wajib mengembalikan fragment queue");
    assert.ok(Array.isArray(savedDraft.features), "save draft wajib mengembalikan feature pack draft");

    const previewResponse = await server.jsonRequest(
      "/api/backoffice/region-boundaries/desa/preview-impact",
      "POST",
      draftFeature,
    );
    assert.equal(previewResponse.response.status, 200, "preview impact valid harus sukses");
    const previewBody = previewResponse.body as JsonRecord;
    assert.ok(requiredNumber(previewBody.impactedCount, "impactedCount wajib ada") >= 1);
    assert.ok(Array.isArray(previewBody.movedItems), "movedItems wajib array");
    const movedCreatedOp = (previewBody.movedItems as JsonRecord[]).find(
      (item) => requiredNumber(item?.opId, "opId moved item wajib ada") === createdOpId,
    );
    assert.ok(movedCreatedOp, "OP yang dibuat test wajib ikut terdeteksi moved");
    assert.equal(requiredString(movedCreatedOp?.namaOp, "namaOp moved item wajib ada"), "Cemara Homestay");
    assert.equal(requiredString(movedCreatedOp?.fromKelurahan, "fromKelurahan wajib ada"), donorVillageName);
    assert.equal(requiredString(movedCreatedOp?.toKelurahan, "toKelurahan wajib ada"), TARGET_BOUNDARY_NAME);
  } finally {
    if (draftRevisionId !== null) {
      await db.delete(regionBoundaryRevision).where(eq(regionBoundaryRevision.id, draftRevisionId));
    }
    if (createdRevisionId !== null) {
      await db.delete(regionBoundaryRevision).where(eq(regionBoundaryRevision.id, createdRevisionId));
    }
    if (createdOpId !== null) {
      await db.delete(objekPajak).where(eq(objekPajak.id, createdOpId));
    }
    await server.close();
  }
}

run()
  .then(() => {
    console.log("[integration] region-boundary-admin-api: PASS");
  })
  .catch((error) => {
    console.error("[integration] region-boundary-admin-api: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
