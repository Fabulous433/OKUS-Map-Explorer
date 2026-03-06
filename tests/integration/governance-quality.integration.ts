import assert from "node:assert/strict";

import { createIntegrationServer, requiredNumber, type JsonRecord } from "./_helpers";

async function run() {
  const server = await createIntegrationServer();
  const { requestJson, jsonRequest } = server;

  let createdOpId: number | null = null;
  let createdRekId: number | null = null;
  let createdKecId: string | null = null;
  let createdKelId: string | null = null;

  try {
    const { body: wpBody, response: wpRes } = await requestJson("/api/wajib-pajak");
    assert.equal(wpRes.status, 200);
    assert.ok(Array.isArray(wpBody));
    assert.ok(wpBody.length > 0);
    const wpId = requiredNumber((wpBody[0] as JsonRecord).id, "wp id wajib ada");

    const uniq = Date.now().toString().slice(-6);
    const kodeKec = `9${uniq.slice(0, 3)}`;
    const kodeKel = `${uniq.slice(3, 6) || "001"}`.slice(0, 3).padStart(3, "0");

    const createKec = await jsonRequest("/api/master/kecamatan", "POST", {
      cpmKecamatan: `Kecamatan IT ${uniq}`,
      cpmKodeKec: kodeKec,
    });
    assert.equal(createKec.response.status, 201);
    createdKecId = String((createKec.body as JsonRecord).cpmKecId);

    const createKel = await jsonRequest("/api/master/kelurahan", "POST", {
      cpmKelurahan: `Kelurahan IT ${uniq}`,
      cpmKodeKec: kodeKec,
      cpmKodeKel: kodeKel,
    });
    assert.equal(createKel.response.status, 201);
    createdKelId = String((createKel.body as JsonRecord).cpmKelId);

    const createRek = await jsonRequest("/api/master/rekening-pajak", "POST", {
      kodeRekening: `9.9.${uniq}`,
      namaRekening: `Rekening IT ${uniq}`,
      jenisPajak: "Pajak MBLB",
      isActive: true,
    });
    assert.equal(createRek.response.status, 201);
    createdRekId = requiredNumber((createRek.body as JsonRecord).id, "rek id wajib ada");

    const createOp = await jsonRequest("/api/objek-pajak", "POST", {
      wpId,
      rekPajakId: createdRekId,
      namaOp: `OP IT Governance ${uniq}`,
      alamatOp: "Jl. Integrasi Governance",
      kecamatanId: createdKecId,
      kelurahanId: createdKelId,
      status: "active",
    });
    assert.equal(createOp.response.status, 201);
    createdOpId = requiredNumber((createOp.body as JsonRecord).id, "op id wajib ada");
    assert.equal((createOp.body as JsonRecord).statusVerifikasi, "draft");

    const listPublic = await requestJson("/api/objek-pajak");
    assert.equal(listPublic.response.status, 200);
    assert.ok(Array.isArray(listPublic.body));
    const foundPublic = (listPublic.body as JsonRecord[]).some((row) => Number(row.id) === createdOpId);
    assert.equal(foundPublic, false, "OP draft tidak boleh muncul pada list default");

    const listInternal = await requestJson("/api/objek-pajak?includeUnverified=true");
    assert.equal(listInternal.response.status, 200);
    assert.ok(Array.isArray(listInternal.body));
    const foundInternal = (listInternal.body as JsonRecord[]).some((row) => Number(row.id) === createdOpId);
    assert.equal(foundInternal, true);

    const rejectNoNote = await jsonRequest(`/api/objek-pajak/${createdOpId}/verification`, "PATCH", {
      statusVerifikasi: "rejected",
      verifierName: "integration-tester",
    });
    assert.equal(rejectNoNote.response.status, 400);

    const rejectWithNote = await jsonRequest(`/api/objek-pajak/${createdOpId}/verification`, "PATCH", {
      statusVerifikasi: "rejected",
      catatanVerifikasi: "Data koordinat perlu validasi lapangan",
      verifierName: "integration-tester",
    });
    assert.equal(rejectWithNote.response.status, 200);
    assert.equal((rejectWithNote.body as JsonRecord).statusVerifikasi, "rejected");

    const rejectedList = await requestJson("/api/objek-pajak?statusVerifikasi=rejected&includeUnverified=true");
    assert.equal(rejectedList.response.status, 200);
    assert.ok(Array.isArray(rejectedList.body));
    assert.ok((rejectedList.body as JsonRecord[]).some((row) => Number(row.id) === createdOpId));

    const verifyOp = await jsonRequest(`/api/objek-pajak/${createdOpId}/verification`, "PATCH", {
      statusVerifikasi: "verified",
      verifierName: "integration-tester",
    });
    assert.equal(verifyOp.response.status, 200);
    assert.equal((verifyOp.body as JsonRecord).statusVerifikasi, "verified");
    assert.equal((verifyOp.body as JsonRecord).verifiedBy, "integration-tester");
    assert.ok((verifyOp.body as JsonRecord).verifiedAt);

    const listPublicAfterVerify = await requestJson("/api/objek-pajak");
    assert.equal(listPublicAfterVerify.response.status, 200);
    assert.ok(Array.isArray(listPublicAfterVerify.body));
    assert.ok((listPublicAfterVerify.body as JsonRecord[]).some((row) => Number(row.id) === createdOpId));

    const qualityCheck = await jsonRequest("/api/quality/check", "POST", {
      nopd: (verifyOp.body as JsonRecord).nopd,
      nama: `OP IT Governance ${uniq}`,
      alamat: "Jl. Integrasi Governance",
    });
    assert.equal(qualityCheck.response.status, 200);
    assert.ok(Array.isArray((qualityCheck.body as JsonRecord).warnings));
    assert.ok(
      ((qualityCheck.body as JsonRecord).warnings as JsonRecord[]).some((warning) => warning.code === "DUPLICATE_NOPD"),
    );

    const qualityReport = await requestJson("/api/quality/report");
    assert.equal(qualityReport.response.status, 200);
    assert.ok((qualityReport.body as JsonRecord).duplicateIndicators);
    assert.ok((qualityReport.body as JsonRecord).invalidGeoRange);

    const patchRek = await jsonRequest(`/api/master/rekening-pajak/${createdRekId}`, "PATCH", { isActive: false });
    assert.equal(patchRek.response.status, 200);
    assert.equal((patchRek.body as JsonRecord).isActive, false);

    const deleteRekBlocked = await jsonRequest(`/api/master/rekening-pajak/${createdRekId}`, "DELETE");
    assert.equal(deleteRekBlocked.response.status, 409);
    const deleteKelBlocked = await jsonRequest(`/api/master/kelurahan/${createdKelId}`, "DELETE");
    assert.equal(deleteKelBlocked.response.status, 409);
    const deleteKecBlocked = await jsonRequest(`/api/master/kecamatan/${createdKecId}`, "DELETE");
    assert.equal(deleteKecBlocked.response.status, 409);

    const auditOp = await requestJson(`/api/audit-log?entityType=objek_pajak&entityId=${createdOpId}&limit=20`);
    assert.equal(auditOp.response.status, 200);
    assert.ok(Array.isArray((auditOp.body as JsonRecord).data));
    assert.ok(((auditOp.body as JsonRecord).data as JsonRecord[]).length >= 1);
  } finally {
    if (createdOpId !== null) {
      await fetch(`${server.baseUrl}/api/objek-pajak/${createdOpId}`, { method: "DELETE" });
    }
    if (createdKelId) {
      await fetch(`${server.baseUrl}/api/master/kelurahan/${createdKelId}`, { method: "DELETE" });
    }
    if (createdKecId) {
      await fetch(`${server.baseUrl}/api/master/kecamatan/${createdKecId}`, { method: "DELETE" });
    }
    if (createdRekId !== null) {
      await fetch(`${server.baseUrl}/api/master/rekening-pajak/${createdRekId}`, { method: "DELETE" });
    }

    await server.close();
  }
}

run()
  .then(() => {
    console.log("[integration] governance-quality (master/audit/verification/quality): PASS");
  })
  .catch((error) => {
    console.error("[integration] governance-quality (master/audit/verification/quality): FAIL");
    console.error(error);
    process.exitCode = 1;
  });
