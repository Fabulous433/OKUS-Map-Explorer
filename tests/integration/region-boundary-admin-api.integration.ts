import assert from "node:assert/strict";

import { and, eq } from "drizzle-orm";
import {
  masterKecamatan,
  masterKelurahan,
  masterRekeningPajak,
  objekPajak,
  wajibPajak,
} from "@shared/schema";
import { db } from "../../server/storage";
import { createIntegrationServer, requiredNumber, requiredString, type JsonRecord } from "./_helpers";

const DRAFT_FEATURE = {
  boundaryKey: "muaradua:batu-belang-jaya",
  level: "desa",
  kecamatanId: "1609040",
  kelurahanId: "1609040001",
  namaDesa: "Batu Belang Jaya",
  geometry: {
    type: "Polygon",
    coordinates: [[[104.0729, -4.5464], [104.0745, -4.5464], [104.0745, -4.5446], [104.0729, -4.5446], [104.0729, -4.5464]]],
  },
};

async function run() {
  const server = await createIntegrationServer();
  let createdOpId: number | null = null;

  try {
    const [muaradua] = await db
      .select()
      .from(masterKecamatan)
      .where(eq(masterKecamatan.cpmKecId, DRAFT_FEATURE.kecamatanId))
      .limit(1);
    assert.ok(muaradua, "master kecamatan Muaradua wajib tersedia");

    const [batuBelangJaya] = await db
      .select()
      .from(masterKelurahan)
      .where(eq(masterKelurahan.cpmKelId, DRAFT_FEATURE.kelurahanId))
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
    assert.ok(batuBelangJaya, "master kelurahan Batu Belang Jaya wajib tersedia");
    assert.ok(bumiAgung, "master kelurahan Bumi Agung Muaradua wajib tersedia");

    const [seededWp] = await db.select().from(wajibPajak).limit(1);
    const [seededRekening] = await db
      .select()
      .from(masterRekeningPajak)
      .where(eq(masterRekeningPajak.jenisPajak, "Pajak MBLB"))
      .limit(1);
    assert.ok(seededWp, "seeded WP wajib tersedia");
    assert.ok(seededRekening, "rekening MBLB wajib tersedia");

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

    const viewerLogin = await server.loginAs("viewer", "viewer123");
    assert.equal(viewerLogin.response.status, 200, "login viewer wajib sukses");

    const forbiddenResponse = await server.requestJson("/api/backoffice/region-boundaries/desa/revisions");
    assert.equal(forbiddenResponse.response.status, 403, "non-admin harus ditolak dari boundary admin api");

    await server.logout();

    const adminLogin = await server.loginAs("admin", "admin123");
    assert.equal(adminLogin.response.status, 200, "login admin wajib sukses");

    const invalidSave = await server.jsonRequest(
      `/api/backoffice/region-boundaries/desa/draft/features/${encodeURIComponent(DRAFT_FEATURE.boundaryKey)}`,
      "PUT",
      {
        ...DRAFT_FEATURE,
        geometry: {
          type: "LineString",
          coordinates: [[104.07, -4.55], [104.08, -4.54]],
        },
      },
    );
    assert.equal(invalidSave.response.status, 400, "geometry invalid harus ditolak");

    const validSave = await server.jsonRequest(
      `/api/backoffice/region-boundaries/desa/draft/features/${encodeURIComponent(DRAFT_FEATURE.boundaryKey)}`,
      "PUT",
      DRAFT_FEATURE,
    );
    assert.equal(validSave.response.status, 200, "draft feature valid harus bisa disimpan");
    const savedDraft = validSave.body as JsonRecord;
    assert.equal(savedDraft.boundaryKey, DRAFT_FEATURE.boundaryKey);
    assert.equal(savedDraft.kecamatanId, DRAFT_FEATURE.kecamatanId);
    assert.equal(savedDraft.kelurahanId, DRAFT_FEATURE.kelurahanId);
    assert.equal((savedDraft.geometry as JsonRecord).type, "Polygon");

    const previewResponse = await server.jsonRequest(
      "/api/backoffice/region-boundaries/desa/preview-impact",
      "POST",
      DRAFT_FEATURE,
    );
    assert.equal(previewResponse.response.status, 200, "preview impact valid harus sukses");
    const previewBody = previewResponse.body as JsonRecord;
    assert.equal(requiredNumber(previewBody.impactedCount, "impactedCount wajib ada"), 1);
    assert.ok(Array.isArray(previewBody.movedItems), "movedItems wajib array");
    const [movedItem] = previewBody.movedItems as JsonRecord[];
    assert.equal(requiredNumber(movedItem?.opId, "opId moved item wajib ada"), createdOpId);
    assert.equal(requiredString(movedItem?.namaOp, "namaOp moved item wajib ada"), "Cemara Homestay");
    assert.equal(requiredString(movedItem?.fromKelurahan, "fromKelurahan wajib ada"), "Bumi Agung");
    assert.equal(requiredString(movedItem?.toKelurahan, "toKelurahan wajib ada"), "Batu Belang Jaya");
  } finally {
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
