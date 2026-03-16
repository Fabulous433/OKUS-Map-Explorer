import assert from "node:assert/strict";

import { eq } from "drizzle-orm";
import { regionBoundaryResponseSchema } from "@shared/region-boundary";
import { masterKecamatan } from "@shared/schema";
import { db } from "../../server/storage";
import { createIntegrationServer } from "./_helpers";

function normalizeRegionName(value: string) {
  return value.trim().toLocaleLowerCase("id").replace(/\s+/g, "");
}

async function run() {
  const server = await createIntegrationServer();
  const { requestJson } = server;

  try {
    const missingScopeResponse = await requestJson("/api/region-boundaries/active/desa");
    assert.equal(
      missingScopeResponse.response.status,
      400,
      "endpoint desa aktif harus menolak request tanpa kecamatanId",
    );
    assert.deepEqual(missingScopeResponse.body, {
      message: "kecamatanId wajib diisi untuk memuat batas desa/kelurahan",
    });

    const [muaradua] = await db
      .select()
      .from(masterKecamatan)
      .where(eq(masterKecamatan.cpmKecamatan, "Muaradua"))
      .limit(1);
    assert.ok(muaradua, "master kecamatan Muaradua wajib tersedia");

    const scopedResponse = await requestJson(
      `/api/region-boundaries/active/desa?kecamatanId=${encodeURIComponent(muaradua.cpmKecId)}`,
    );
    assert.equal(scopedResponse.response.status, 200, "endpoint desa aktif harus menerima kecamatanId valid");

    const scopedBoundary = regionBoundaryResponseSchema.parse(scopedResponse.body);
    assert.equal(scopedBoundary.regionKey, "okus");
    assert.equal(scopedBoundary.level, "desa");
    assert.equal(scopedBoundary.precision, "light");
    assert.equal(scopedBoundary.scope?.kecamatanId, muaradua.cpmKecId);
    assert.equal(scopedBoundary.scope?.kecamatanName, muaradua.cpmKecamatan);
    assert.ok(scopedBoundary.boundary.features.length > 0, "scope Muaradua harus memuat polygon desa/kelurahan");
    assert.ok(
      scopedBoundary.boundary.features.every((feature) => {
        return normalizeRegionName(String(feature.properties.WADMKC ?? "")) === normalizeRegionName(muaradua.cpmKecamatan);
      }),
      "endpoint desa aktif hanya boleh mengirim polygon dari kecamatan yang dipilih",
    );

    const kecamatanResponse = await requestJson("/api/region-boundaries/active/kecamatan");
    assert.equal(kecamatanResponse.response.status, 200, "endpoint kecamatan aktif harus tetap tersedia");

    const kecamatanBoundary = regionBoundaryResponseSchema.parse(kecamatanResponse.body);
    assert.equal(kecamatanBoundary.level, "kecamatan");
    assert.equal(kecamatanBoundary.precision, "light");
    assert.equal(kecamatanBoundary.boundary.features.length, 19);
  } finally {
    await server.close();
  }
}

run()
  .then(() => {
    console.log("[integration] region-boundary-layer-api: PASS");
  })
  .catch((error) => {
    console.error("[integration] region-boundary-layer-api: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
