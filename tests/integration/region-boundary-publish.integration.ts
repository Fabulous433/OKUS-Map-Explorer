import assert from "node:assert/strict";

import bbox from "@turf/bbox";
import { booleanPointInPolygon } from "@turf/boolean-point-in-polygon";
import { and, eq, inArray } from "drizzle-orm";
import { regionBoundaryResponseSchema } from "@shared/region-boundary";
import {
  masterKecamatan,
  masterKelurahan,
  masterRekeningPajak,
  objekPajak,
  regionBoundaryRevision,
  regionBoundaryRevisionFeature,
  wajibPajak,
} from "@shared/schema";
import { findContainingDesa, getActiveRegionBoundary, invalidateActiveRegionBoundaryCache } from "../../server/region-boundaries";
import { buildDesaBoundaryKey } from "../../server/region-boundary-overrides";
import { db } from "../../server/storage";
import { createIntegrationServer, requiredNumber, requiredString, type JsonRecord } from "./_helpers";

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

function pickDonorFeatureAndPoint(features: BoundaryFeature[], targetFeature: BoundaryFeature, targetIndex: number) {
  for (const feature of features.slice(targetIndex + 1)) {
    if (featureName(feature) === TARGET_BOUNDARY_NAME) continue;

    const point = findInteriorPointForFeature(feature);
    const currentName = resolveContainingFeatureName(features, point);
    if (!currentName || currentName === TARGET_BOUNDARY_NAME) {
      continue;
    }

    const nextFeatures = features.map((item) =>
      featureName(item) === TARGET_BOUNDARY_NAME
        ? { ...item, geometry: buildExpandedTargetGeometry(targetFeature.geometry, point) }
        : item,
    );
    const nextName = resolveContainingFeatureName(nextFeatures, point);
    if (nextName === TARGET_BOUNDARY_NAME) {
      return { point, containingName: currentName };
    }
  }

  throw new Error("Tidak menemukan donor point non-target untuk publish test");
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

  return { minLng, minLat, maxLng, maxLat };
}

async function run() {
  const server = await createIntegrationServer();
  let createdOpId: number | null = null;
  const revisionIds: number[] = [];

  try {
    const [muaradua] = await db
      .select()
      .from(masterKecamatan)
      .where(eq(masterKecamatan.cpmKecamatan, "Muaradua"))
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

    const baseBoundary = await getActiveRegionBoundary("desa", "precise", {
      kecamatanId: muaradua.cpmKecId,
      kecamatanName: muaradua.cpmKecamatan,
    });
    const baseBatuBelang = baseBoundary.boundary.features.find((feature) => {
      return featureName(feature as BoundaryFeature) === TARGET_BOUNDARY_NAME;
    }) as BoundaryFeature | undefined;
    assert.ok(baseBatuBelang, "base feature Batu Belang Jaya wajib tersedia");

    const boundaryKey = buildDesaBoundaryKey({
      kecamatanName: "Muara Dua",
      desaName: TARGET_BOUNDARY_NAME,
    });

    const [previousPublished] = await db
      .insert(regionBoundaryRevision)
      .values({
        regionKey: "okus",
        level: "desa",
        status: "published",
        notes: "previous published revision",
        createdBy: "integration-test",
        publishedBy: "integration-test",
        publishedAt: new Date(Date.now() - 60_000),
        impactSummary: null,
        createdAt: new Date(Date.now() - 60_000),
        updatedAt: new Date(Date.now() - 60_000),
      })
      .returning({ id: regionBoundaryRevision.id });
    revisionIds.push(previousPublished.id);

    await db.insert(regionBoundaryRevisionFeature).values({
      revisionId: previousPublished.id,
      boundaryKey,
      kecamatanId: muaradua.cpmKecId,
      kelurahanId: batuBelangJaya.cpmKelId,
      namaDesa: TARGET_BOUNDARY_NAME,
      geometry: baseBatuBelang.geometry,
      bounds: computeBoundsFromCoordinates(baseBatuBelang.geometry.coordinates),
      createdAt: new Date(Date.now() - 60_000),
      updatedAt: new Date(Date.now() - 60_000),
    });

    invalidateActiveRegionBoundaryCache();

    const activeBoundary = await getActiveRegionBoundary("desa", "precise", {
      kecamatanId: muaradua.cpmKecId,
      kecamatanName: muaradua.cpmKecamatan,
    });
    const targetFeature = activeBoundary.boundary.features.find((feature) => {
      return featureName(feature as BoundaryFeature) === TARGET_BOUNDARY_NAME;
    }) as BoundaryFeature | undefined;
    assert.ok(targetFeature, "feature Batu Belang Jaya aktif wajib tersedia");

    const targetIndex = activeBoundary.boundary.features.findIndex(
      (feature) => featureName(feature as BoundaryFeature) === TARGET_BOUNDARY_NAME,
    );
    assert.ok(targetIndex >= 0, "index feature Batu Belang Jaya aktif wajib tersedia");

    const donorSelection = pickDonorFeatureAndPoint(
      activeBoundary.boundary.features as BoundaryFeature[],
      targetFeature,
      targetIndex,
    );
    const donorVillageName = donorSelection.containingName;
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

    const donorKelurahanId = requiredString(donorKelurahan?.cpmKelId, "kelurahanId donor wajib tersedia");
    assert.notEqual(donorVillageName, TARGET_BOUNDARY_NAME, "titik donor tidak boleh berada di target");

    const draftFeature = {
      boundaryKey,
      level: "desa" as const,
      kecamatanId: muaradua.cpmKecId,
      kelurahanId: batuBelangJaya.cpmKelId,
      namaDesa: TARGET_BOUNDARY_NAME,
      geometry: buildExpandedTargetGeometry(targetFeature.geometry, donorSelection.point),
    };

    const beforePublish = await findContainingDesa(donorSelection.point[0], donorSelection.point[1]);
    assert.equal(beforePublish?.name, donorVillageName, "titik donor harus tetap berada di desa asal sebelum publish");

    const [createdOp] = await db
      .insert(objekPajak)
      .values({
        nopd: `ITPB${Date.now()}`.slice(0, 30),
        wpId: seededWp.id,
        rekPajakId: seededRekening.id,
        namaOp: "Cemara Homestay",
        npwpOp: null,
        alamatOp: "Jl. Cemara Homestay",
        kecamatanId: muaradua.cpmKecId,
        kelurahanId: donorKelurahanId,
        omsetBulanan: null,
        tarifPersen: null,
        pajakBulanan: null,
        latitude: String(donorSelection.point[1]),
        longitude: String(donorSelection.point[0]),
        status: "active",
        statusVerifikasi: "verified",
        catatanVerifikasi: null,
        verifiedAt: new Date(),
        verifiedBy: "integration-test",
        updatedAt: new Date(),
      })
      .returning({ id: objekPajak.id });
    createdOpId = createdOp.id;

    const login = await server.loginAs("admin", "admin123");
    assert.equal(login.response.status, 200, "login admin wajib sukses");

    const draftResponse = await server.requestJson(
      `/api/backoffice/region-boundaries/desa/draft?kecamatanId=${encodeURIComponent(muaradua.cpmKecId)}`,
    );
    assert.equal(draftResponse.response.status, 200);
    const draftRevisionId = requiredNumber(
      (draftResponse.body as JsonRecord).revision && ((draftResponse.body as JsonRecord).revision as JsonRecord).id,
      "revision draft id wajib tersedia",
    );
    revisionIds.push(draftRevisionId);

    const saveDraft = await server.jsonRequest(
      `/api/backoffice/region-boundaries/desa/draft/features/${encodeURIComponent(boundaryKey)}`,
      "PUT",
      draftFeature,
    );
    assert.equal(saveDraft.response.status, 200, "save draft untuk publish test wajib sukses");

    const confirmTakeover = await server.jsonRequest(
      "/api/backoffice/region-boundaries/desa/draft/takeover/confirm",
      "POST",
      {
        revisionId: draftRevisionId,
        takeoverConfirmedBy: "admin",
      },
    );
    assert.equal(confirmTakeover.response.status, 200, "konfirmasi takeover publish test wajib sukses");

    const publishResponse = await server.jsonRequest(
      "/api/backoffice/region-boundaries/desa/publish",
      "POST",
      {
        revisionId: draftRevisionId,
        mode: "publish-and-reconcile",
        topologyStatus: "draft-ready",
      },
    );
    assert.equal(publishResponse.response.status, 200, "publish draft harus sukses");
    assert.ok(requiredNumber((publishResponse.body as JsonRecord).reconciledCount, "reconciledCount wajib ada") >= 1);

    const [publishedDraftRevision] = await db
      .select()
      .from(regionBoundaryRevision)
      .where(eq(regionBoundaryRevision.id, draftRevisionId))
      .limit(1);
    const [supersededPreviousRevision] = await db
      .select()
      .from(regionBoundaryRevision)
      .where(eq(regionBoundaryRevision.id, previousPublished.id))
      .limit(1);
    assert.equal(publishedDraftRevision?.status, "published", "draft revision harus menjadi published");
    assert.equal(supersededPreviousRevision?.status, "superseded", "published lama harus menjadi superseded");

    const afterPublish = await findContainingDesa(donorSelection.point[0], donorSelection.point[1]);
    assert.equal(afterPublish?.name, TARGET_BOUNDARY_NAME, "runtime cache harus mengikuti publish terbaru");

    const [updatedOp] = await db.select().from(objekPajak).where(eq(objekPajak.id, createdOpId)).limit(1);
    assert.equal(updatedOp?.kelurahanId, batuBelangJaya.cpmKelId, "publish-and-reconcile harus memindahkan kelurahanId OP");

    const scopedBoundaryAfterPublish = await server.requestJson(
      `/api/region-boundaries/active/desa?kecamatanId=${encodeURIComponent(muaradua.cpmKecId)}`,
    );
    assert.equal(scopedBoundaryAfterPublish.response.status, 200);
    regionBoundaryResponseSchema.parse(scopedBoundaryAfterPublish.body);

    const rollbackResponse = await server.jsonRequest(
      `/api/backoffice/region-boundaries/desa/revisions/${previousPublished.id}/rollback`,
      "POST",
    );
    assert.equal(rollbackResponse.response.status, 200, "rollback revision lama harus sukses");

    const [rolledBackRevision] = await db
      .select()
      .from(regionBoundaryRevision)
      .where(eq(regionBoundaryRevision.id, previousPublished.id))
      .limit(1);
    const [supersededDraftRevision] = await db
      .select()
      .from(regionBoundaryRevision)
      .where(eq(regionBoundaryRevision.id, draftRevisionId))
      .limit(1);
    assert.equal(rolledBackRevision?.status, "published", "revision target rollback harus kembali published");
    assert.equal(supersededDraftRevision?.status, "superseded", "revision publish terbaru harus disupersede setelah rollback");

    const afterRollback = await findContainingDesa(donorSelection.point[0], donorSelection.point[1]);
    assert.equal(afterRollback?.name, donorVillageName, "runtime cache harus kembali ke geometry revision sebelumnya");
  } finally {
    if (createdOpId !== null) {
      await db.delete(objekPajak).where(eq(objekPajak.id, createdOpId));
    }
    if (revisionIds.length > 0) {
      await db.delete(regionBoundaryRevision).where(inArray(regionBoundaryRevision.id, revisionIds));
    }
    invalidateActiveRegionBoundaryCache();
    await server.close();
  }
}

run()
  .then(() => {
    console.log("[integration] region-boundary-publish: PASS");
  })
  .catch((error) => {
    console.error("[integration] region-boundary-publish: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
