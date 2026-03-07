import assert from "node:assert/strict";

import { createIntegrationServer, requiredNumber, type JsonRecord } from "./_helpers";

async function run() {
  const server = await createIntegrationServer();
  const { requestJson, jsonRequest, loginAs } = server;

  let createdWpId: number | null = null;

  try {
    const loginResult = await loginAs("admin", "admin123");
    assert.equal(loginResult.response.status, 200);

    const kecFirst = await requestJson("/api/master/kecamatan");
    assert.equal(kecFirst.response.status, 200);
    const kecEtag = kecFirst.response.headers.get("etag");
    assert.ok(kecEtag, "GET master kecamatan harus mengembalikan ETag");

    const kecNotModified = await requestJson("/api/master/kecamatan", {
      headers: { "if-none-match": kecEtag! },
    });
    assert.equal(kecNotModified.response.status, 304, "If-None-Match valid harus return 304");

    const wpListFirst = await requestJson("/api/wajib-pajak?page=1&limit=5");
    assert.equal(wpListFirst.response.status, 200);
    const wpListEtag = wpListFirst.response.headers.get("etag");
    assert.ok(wpListEtag, "GET list WP harus mengembalikan ETag");

    const wpListNotModified = await requestJson("/api/wajib-pajak?page=1&limit=5", {
      headers: { "if-none-match": wpListEtag! },
    });
    assert.equal(wpListNotModified.response.status, 304, "List WP harus support conditional fetch");

    const createWp = await jsonRequest("/api/wajib-pajak", "POST", {
      jenisWp: "orang_pribadi",
      peranWp: "pemilik",
      statusAktif: "active",
      namaWp: `IT-ETAG-${Date.now()}`,
      nikKtpWp: "3174000000009999",
      alamatWp: "Jl. Integrasi ETag",
      kecamatanWp: "Kec Integrasi",
      kelurahanWp: "Kel Integrasi",
      teleponWaWp: "081299990000",
      emailWp: null,
    });
    assert.equal(createWp.response.status, 201);
    createdWpId = requiredNumber((createWp.body as JsonRecord).id, "ID WP hasil create wajib ada");

    const wpListAfterCreate = await requestJson("/api/wajib-pajak?page=1&limit=5", {
      headers: { "if-none-match": wpListEtag! },
    });
    assert.equal(wpListAfterCreate.response.status, 200, "ETag lama harus invalid setelah data berubah");
    const wpListEtagAfter = wpListAfterCreate.response.headers.get("etag");
    assert.ok(wpListEtagAfter && wpListEtagAfter !== wpListEtag, "ETag baru harus berubah setelah mutasi");

    const opListFirst = await requestJson("/api/objek-pajak?page=1&limit=5&includeUnverified=true");
    assert.equal(opListFirst.response.status, 200);
    const opListEtag = opListFirst.response.headers.get("etag");
    assert.ok(opListEtag, "GET list OP harus mengembalikan ETag");

    const opListNotModified = await requestJson("/api/objek-pajak?page=1&limit=5&includeUnverified=true", {
      headers: { "if-none-match": opListEtag! },
    });
    assert.equal(opListNotModified.response.status, 304, "List OP harus support conditional fetch");

    const dashboardFirst = await requestJson("/api/dashboard/summary?includeUnverified=true");
    assert.equal(dashboardFirst.response.status, 200);
    const dashboardEtag = dashboardFirst.response.headers.get("etag");
    assert.ok(dashboardEtag, "Dashboard summary harus mengembalikan ETag");

    const dashboardNotModified = await requestJson("/api/dashboard/summary?includeUnverified=true", {
      headers: { "if-none-match": dashboardEtag! },
    });
    assert.equal(dashboardNotModified.response.status, 304, "Dashboard summary harus support conditional fetch");
  } finally {
    if (createdWpId !== null) {
      await jsonRequest(`/api/wajib-pajak/${createdWpId}`, "DELETE");
    }
    await server.close();
  }
}

run()
  .then(() => {
    console.log("[integration] cache etag conditional fetch: PASS");
  })
  .catch((error) => {
    console.error("[integration] cache etag conditional fetch: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
