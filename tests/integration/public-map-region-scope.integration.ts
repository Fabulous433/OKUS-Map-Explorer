import assert from "node:assert/strict";

import { eq } from "drizzle-orm";
import { regionBoundaryResponseSchema } from "@shared/region-boundary";
import { objekPajak } from "@shared/schema";
import { db } from "../../server/storage";
import { createIntegrationServer, type JsonRecord } from "./_helpers";

const OUTSIDE_BBOX = "104.70,-3.05,104.80,-2.95";
const INSIDE_BBOX = "104.06,-4.55,104.09,-4.52";

async function run() {
  const server = await createIntegrationServer();
  const { requestJson } = server;
  let outsideRegionId: number | null = null;

  try {
    const [seededOp] = await db.select().from(objekPajak).where(eq(objekPajak.nopd, "19.01.01.0001")).limit(1);
    assert.ok(seededOp, "seeded OP referensi wajib tersedia");

    const [insertedOutsideRegion] = await db
      .insert(objekPajak)
      .values({
        nopd: `ITRG${Date.now()}`,
        wpId: seededOp.wpId,
        rekPajakId: seededOp.rekPajakId,
        namaOp: "IT Legacy Outside Region",
        npwpOp: null,
        alamatOp: "Jl. Sudirman Palembang",
        kecamatanId: seededOp.kecamatanId,
        kelurahanId: seededOp.kelurahanId,
        omsetBulanan: null,
        tarifPersen: null,
        pajakBulanan: null,
        latitude: "-2.9909300",
        longitude: "104.7565500",
        status: "active",
        statusVerifikasi: "verified",
        catatanVerifikasi: null,
        verifiedAt: new Date(),
        verifiedBy: "integration-test",
        updatedAt: new Date(),
      })
      .returning({ id: objekPajak.id });
    outsideRegionId = insertedOutsideRegion.id;

    const boundaryResponse = await requestJson("/api/region-boundaries/active/kabupaten");
    assert.equal(boundaryResponse.response.status, 200, "endpoint boundary kabupaten aktif harus tersedia");
    const activeKabupatenBoundary = regionBoundaryResponseSchema.parse(boundaryResponse.body);
    assert.equal(activeKabupatenBoundary.regionKey, "okus");
    assert.equal(activeKabupatenBoundary.level, "kabupaten");
    assert.equal(activeKabupatenBoundary.precision, "light");
    assert.equal(activeKabupatenBoundary.boundary.features.length, 1);
    assert.equal(
      activeKabupatenBoundary.boundary.features[0]?.properties?.WADMKK,
      "Ogan Komering Ulu Selatan",
      "boundary kabupaten aktif harus memuat asset OKU Selatan",
    );

    const mapOutsideResponse = await requestJson(`/api/objek-pajak/map?bbox=${encodeURIComponent(OUTSIDE_BBOX)}&limit=50`);
    assert.equal(mapOutsideResponse.response.status, 200);
    const mapOutsideBody = mapOutsideResponse.body as JsonRecord;
    assert.ok(Array.isArray(mapOutsideBody.items));
    assert.equal(
      (mapOutsideBody.items as JsonRecord[]).some((item) => Number(item.id) === outsideRegionId),
      false,
      "endpoint map internal tidak boleh memuat OP di luar kabupaten aktif",
    );

    const mapWfsOutsideResponse = await requestJson(
      `/api/objek-pajak/map-wfs?bbox=${encodeURIComponent(OUTSIDE_BBOX)}&limit=50`,
    );
    assert.equal(mapWfsOutsideResponse.response.status, 200);
    const mapWfsOutsideBody = mapWfsOutsideResponse.body as JsonRecord;
    assert.ok(Array.isArray(mapWfsOutsideBody.features));
    assert.equal(
      (mapWfsOutsideBody.features as JsonRecord[]).some((item) => Number(item.id) === outsideRegionId),
      false,
      "endpoint map WFS tidak boleh memuat OP di luar kabupaten aktif",
    );
    assert.equal(mapWfsOutsideBody.numberReturned, 0, "bbox luar wilayah harus kosong walau ada data legacy di DB");

    const mapInsideResponse = await requestJson(`/api/objek-pajak/map?bbox=${encodeURIComponent(INSIDE_BBOX)}&limit=50`);
    assert.equal(mapInsideResponse.response.status, 200);
    const mapInsideBody = mapInsideResponse.body as JsonRecord;
    assert.ok(Array.isArray(mapInsideBody.items));
    assert.ok(
      (mapInsideBody.items as JsonRecord[]).length > 0,
      "bbox di dalam OKU Selatan harus tetap mengembalikan marker in-region",
    );
  } finally {
    if (outsideRegionId !== null) {
      await db.delete(objekPajak).where(eq(objekPajak.id, outsideRegionId));
    }

    await server.close();
  }
}

run()
  .then(() => {
    console.log("[integration] public-map-region-scope: PASS");
  })
  .catch((error) => {
    console.error("[integration] public-map-region-scope: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
