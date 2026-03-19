import assert from "node:assert/strict";

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
import { createIntegrationServer, requiredNumber, type JsonRecord } from "./_helpers";

const CEMARA_HOMESTAY_POINT = [104.0736256, -4.5455788];

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
    const [bumiAgung] = await db
      .select()
      .from(masterKelurahan)
      .where(
        and(
          eq(masterKelurahan.cpmKelurahan, "Bumi Agung"),
          eq(masterKelurahan.cpmKodeKec, muaradua.cpmKodeKec),
        ),
      )
      .limit(1);
    const [seededWp] = await db.select().from(wajibPajak).limit(1);
    const [seededRekening] = await db
      .select()
      .from(masterRekeningPajak)
      .where(eq(masterRekeningPajak.jenisPajak, "Pajak MBLB"))
      .limit(1);
    assert.ok(batuBelangJaya && bumiAgung && seededWp && seededRekening, "fixture master wajib tersedia");

    const boundaryKey = buildDesaBoundaryKey({
      kecamatanName: "Muara Dua",
      desaName: "Batu Belang Jaya",
    });

    const baseBoundary = await getActiveRegionBoundary("desa", "precise", {
      kecamatanId: muaradua.cpmKecId,
      kecamatanName: muaradua.cpmKecamatan,
    });
    const baseBatuBelang = baseBoundary.boundary.features.find((feature) => {
      return String(feature.properties.WADMKD ?? "").trim() === "Batu Belang Jaya";
    });
    assert.ok(baseBatuBelang, "base feature Batu Belang Jaya wajib tersedia");

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
      namaDesa: "Batu Belang Jaya",
      geometry: baseBatuBelang.geometry,
      bounds: computeBoundsFromCoordinates(baseBatuBelang.geometry.coordinates),
      createdAt: new Date(Date.now() - 60_000),
      updatedAt: new Date(Date.now() - 60_000),
    });

    invalidateActiveRegionBoundaryCache();
    const beforePublish = await findContainingDesa(CEMARA_HOMESTAY_POINT[0], CEMARA_HOMESTAY_POINT[1]);
    assert.equal(beforePublish?.name, "Bumi Agung", "published revision awal harus tetap menghasilkan Bumi Agung");

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
        kelurahanId: bumiAgung.cpmKelId,
        omsetBulanan: null,
        tarifPersen: null,
        pajakBulanan: null,
        latitude: "-4.5455788",
        longitude: "104.0736256",
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
      {
        boundaryKey,
        level: "desa",
        kecamatanId: muaradua.cpmKecId,
        kelurahanId: batuBelangJaya.cpmKelId,
        namaDesa: "Batu Belang Jaya",
        geometry: {
          type: "Polygon",
          coordinates: [[[104.0729, -4.5464], [104.0745, -4.5464], [104.0745, -4.5446], [104.0729, -4.5446], [104.0729, -4.5464]]],
        },
      },
    );
    assert.equal(saveDraft.response.status, 200, "save draft untuk publish test wajib sukses");

    const publishResponse = await server.jsonRequest(
      "/api/backoffice/region-boundaries/desa/publish",
      "POST",
      {
        revisionId: draftRevisionId,
        mode: "publish-and-reconcile",
      },
    );
    assert.equal(publishResponse.response.status, 200, "publish draft harus sukses");
    assert.equal(requiredNumber((publishResponse.body as JsonRecord).reconciledCount, "reconciledCount wajib ada"), 1);

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

    const afterPublish = await findContainingDesa(CEMARA_HOMESTAY_POINT[0], CEMARA_HOMESTAY_POINT[1]);
    assert.equal(afterPublish?.name, "Batu Belang Jaya", "runtime cache harus mengikuti publish terbaru");

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

    const afterRollback = await findContainingDesa(CEMARA_HOMESTAY_POINT[0], CEMARA_HOMESTAY_POINT[1]);
    assert.equal(afterRollback?.name, "Bumi Agung", "runtime cache harus kembali ke geometry revision sebelumnya");
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
