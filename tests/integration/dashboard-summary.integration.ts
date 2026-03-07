import assert from "node:assert/strict";

import { createIntegrationServer, requiredNumber, requiredString, type JsonRecord } from "./_helpers";

async function run() {
  const server = await createIntegrationServer();
  const { requestJson, jsonRequest, loginAs } = server;

  let createdOpId: number | null = null;

  try {
    const unauth = await requestJson("/api/dashboard/summary");
    assert.equal(unauth.response.status, 401, "Dashboard summary wajib login");

    const loginResult = await loginAs("admin", "admin123");
    assert.equal(loginResult.response.status, 200);

    const baseline = await requestJson("/api/dashboard/summary?includeUnverified=true");
    assert.equal(baseline.response.status, 200);
    const baselineBody = baseline.body as JsonRecord;
    assert.ok(baselineBody.totals, "totals wajib ada");
    assert.ok(Array.isArray(baselineBody.byJenis), "byJenis wajib array");

    const wpResult = await requestJson("/api/wajib-pajak?page=1&limit=100");
    assert.equal(wpResult.response.status, 200);
    const wpItems = ((wpResult.body as JsonRecord).items ?? []) as JsonRecord[];
    assert.ok(wpItems.length > 0);
    const wpId = requiredNumber(wpItems[0]?.id, "wp id wajib ada");

    const rekeningResult = await requestJson("/api/master/rekening-pajak");
    assert.equal(rekeningResult.response.status, 200);
    assert.ok(Array.isArray(rekeningResult.body));
    const rekMblb = (rekeningResult.body as JsonRecord[]).find((item) => item.jenisPajak === "Pajak MBLB");
    assert.ok(rekMblb);
    const rekPajakId = requiredNumber(rekMblb?.id, "rek id wajib ada");

    const kecResult = await requestJson("/api/master/kecamatan");
    assert.equal(kecResult.response.status, 200);
    assert.ok(Array.isArray(kecResult.body));
    const kecamatanId = requiredString((kecResult.body[0] as JsonRecord).cpmKecId, "kecamatan id wajib ada");

    const kelResult = await requestJson(`/api/master/kelurahan?kecamatanId=${encodeURIComponent(kecamatanId)}`);
    assert.equal(kelResult.response.status, 200);
    assert.ok(Array.isArray(kelResult.body));
    const kelurahanId = requiredString((kelResult.body[0] as JsonRecord).cpmKelId, "kelurahan id wajib ada");

    const create = await jsonRequest("/api/objek-pajak", "POST", {
      wpId,
      rekPajakId,
      namaOp: `IT Dashboard Summary ${Date.now()}`,
      alamatOp: "Jl. Dashboard Summary",
      kecamatanId,
      kelurahanId,
      status: "active",
    });
    assert.equal(create.response.status, 201);
    createdOpId = requiredNumber((create.body as JsonRecord).id, "op id wajib ada");

    const includeUnverifiedSummary = await requestJson("/api/dashboard/summary?includeUnverified=true");
    assert.equal(includeUnverifiedSummary.response.status, 200);
    const includeBody = includeUnverifiedSummary.body as JsonRecord;
    const includeTotals = includeBody.totals as JsonRecord;

    const verifiedOnlySummary = await requestJson("/api/dashboard/summary?includeUnverified=false");
    assert.equal(verifiedOnlySummary.response.status, 200);
    const verifiedBody = verifiedOnlySummary.body as JsonRecord;
    const verifiedTotals = verifiedBody.totals as JsonRecord;

    assert.ok(
      requiredNumber(includeTotals.totalOp, "totalOp include wajib number") >=
        requiredNumber(verifiedTotals.totalOp, "totalOp verified wajib number"),
      "Summary includeUnverified harus >= verified-only",
    );

    const verify = await jsonRequest(`/api/objek-pajak/${createdOpId}/verification`, "PATCH", {
      statusVerifikasi: "verified",
      verifierName: "integration-tester",
    });
    assert.equal(verify.response.status, 200);

    const verifiedAfter = await requestJson("/api/dashboard/summary?includeUnverified=false");
    assert.equal(verifiedAfter.response.status, 200);
    const verifiedAfterTotals = ((verifiedAfter.body as JsonRecord).totals ?? {}) as JsonRecord;

    assert.ok(
      requiredNumber(verifiedAfterTotals.totalOp, "verified total setelah verify wajib number") >=
        requiredNumber(verifiedTotals.totalOp, "verified total sebelum verify wajib number"),
      "Total verified-only tidak boleh turun setelah OP diverifikasi",
    );
  } finally {
    if (createdOpId !== null) {
      await jsonRequest(`/api/objek-pajak/${createdOpId}`, "DELETE");
    }
    await server.close();
  }
}

run()
  .then(() => {
    console.log("[integration] dashboard summary aggregation: PASS");
  })
  .catch((error) => {
    console.error("[integration] dashboard summary aggregation: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
