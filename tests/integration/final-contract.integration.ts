import assert from "node:assert/strict";

import { createIntegrationServer, requiredNumber, requiredString, type JsonRecord } from "./_helpers";

async function run() {
  const server = await createIntegrationServer();

  const { requestJson, jsonRequest, loginAs } = server;

  try {
    const loginResult = await loginAs("admin", "admin123");
    assert.equal(loginResult.response.status, 200);

    const { body: rekeningBody, response: rekeningRes } = await requestJson("/api/master/rekening-pajak");
    assert.equal(rekeningRes.status, 200);
    assert.ok(Array.isArray(rekeningBody));
    assert.ok(rekeningBody.length > 0);

    const { body: kecBody, response: kecRes } = await requestJson("/api/master/kecamatan");
    assert.equal(kecRes.status, 200);
    assert.ok(Array.isArray(kecBody));
    assert.ok(kecBody.length > 0);

    const kecamatanId = requiredString((kecBody[0] as JsonRecord).cpmKecId, "cpmKecId wajib ada");
    const { body: kelBody, response: kelRes } = await requestJson(`/api/master/kelurahan?kecamatanId=${encodeURIComponent(kecamatanId)}`);
    assert.equal(kelRes.status, 200);
    assert.ok(Array.isArray(kelBody));
    assert.ok(kelBody.length > 0);

    const kelurahanId = requiredString((kelBody[0] as JsonRecord).cpmKelId, "cpmKelId wajib ada");

    const { body: wpBody, response: wpRes } = await requestJson("/api/wajib-pajak");
    assert.equal(wpRes.status, 200);
    assert.ok(Array.isArray((wpBody as JsonRecord).items));
    const wpItems = (wpBody as JsonRecord).items as JsonRecord[];
    assert.ok(wpItems.length > 0);

    const targetWp = wpItems[0] as JsonRecord;
    const wpId = requiredNumber(targetWp.id, "wp.id wajib number");
    const oldNpwpd = targetWp.npwpd === null || targetWp.npwpd === undefined ? null : String(targetWp.npwpd);

    const rekeningTarget =
      (rekeningBody as JsonRecord[]).find((item) => item.jenisPajak === "Pajak MBLB") ??
      (rekeningBody as JsonRecord[])[0];
    const rekPajakId = requiredNumber(rekeningTarget.id, "rek_pajak.id wajib number");

    let createdOpId: number | null = null;

    try {
      const legacyCreate = await jsonRequest("/api/objek-pajak", "POST", {
        wpId,
        jenisPajak: "Pajak MBLB",
        namaObjek: "Legacy Payload",
        alamat: "Alamat Legacy",
        kecamatan: "Legacy",
        kelurahan: "Legacy",
        status: "active",
      });
      assert.equal(legacyCreate.response.status, 400, "Legacy OP payload harus ditolak");

      const finalCreate = await jsonRequest("/api/objek-pajak", "POST", {
        wpId,
        rekPajakId,
        namaOp: "IT Contract Final OP",
        alamatOp: "Jl. Integration Test 1",
        kecamatanId,
        kelurahanId,
        status: "active",
      });
      assert.equal(finalCreate.response.status, 201);

      assert.ok(finalCreate.body);
      const created = finalCreate.body as JsonRecord;
      createdOpId = requiredNumber(created.id, "created.id wajib number");
      assert.equal(created.namaOp, "IT Contract Final OP");
      assert.equal("namaObjek" in created, false);
      assert.equal("alamat" in created, false);
      assert.equal("detail_pajak" in created, false);

      const updateFinal = await jsonRequest(`/api/objek-pajak/${createdOpId}`, "PATCH", {
        namaOp: "IT Contract Final OP Updated",
        alamatOp: "Jl. Integration Test 2",
        kecamatanId,
        kelurahanId,
      });
      assert.equal(updateFinal.response.status, 200);
      assert.equal((updateFinal.body as JsonRecord).namaOp, "IT Contract Final OP Updated");

      const wpCreateWithNpwpd = await jsonRequest("/api/wajib-pajak", "POST", {
        jenisWp: "orang_pribadi",
        peranWp: "pemilik",
        npwpd: "12.34.56.78",
        statusAktif: "active",
        namaWp: "Uji NPWPD Create",
        nikKtpWp: "3174010000000001",
        alamatWp: "Alamat",
        kecamatanWp: "Kecamatan",
        kelurahanWp: "Kelurahan",
        teleponWaWp: "081200000001",
      });
      assert.equal(wpCreateWithNpwpd.response.status, 400, "Create WP dengan NPWPD harus ditolak");

      const newNpwpd = `IT-${Date.now()}`;
      const wpPatch = await jsonRequest(`/api/wajib-pajak/${wpId}`, "PATCH", { npwpd: newNpwpd });
      assert.equal(wpPatch.response.status, 200);
      assert.equal((wpPatch.body as JsonRecord).npwpd, newNpwpd);

      const wpRestore = await jsonRequest(`/api/wajib-pajak/${wpId}`, "PATCH", { npwpd: oldNpwpd });
      assert.equal(wpRestore.response.status, 200);
      assert.equal((wpRestore.body as JsonRecord).npwpd, oldNpwpd);

      const listAfter = await requestJson("/api/objek-pajak?includeUnverified=true");
      assert.equal(listAfter.response.status, 200);
      assert.ok(Array.isArray((listAfter.body as JsonRecord).items));
      const inserted = ((listAfter.body as JsonRecord).items as JsonRecord[]).find((item) => Number(item.id) === createdOpId);
      assert.ok(inserted);
      assert.equal("namaObjek" in inserted, false);
      assert.equal("alamat" in inserted, false);
    } finally {
      if (createdOpId !== null) {
        await jsonRequest(`/api/objek-pajak/${createdOpId}`, "DELETE");
      }

      await jsonRequest(`/api/wajib-pajak/${wpId}`, "PATCH", { npwpd: oldNpwpd });
    }
  } finally {
    await server.close();
  }
}

run()
  .then(() => {
    console.log("[integration] final contract WP/OP: PASS");
  })
  .catch((error) => {
    console.error("[integration] final contract WP/OP: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
