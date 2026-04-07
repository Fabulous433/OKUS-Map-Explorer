import assert from "node:assert/strict";

import { createIntegrationServer, requiredNumber, requiredString, type JsonRecord } from "./_helpers";
import { buildExcelBlob } from "./_excel";

async function run() {
  const server = await createIntegrationServer();
  const { jsonRequest, requestJson, loginAs } = server;

  let wpId: number | null = null;
  let importedId: number | null = null;

  try {
    const loginResult = await loginAs("admin", "admin123");
    assert.equal(loginResult.response.status, 200);
    const semanticNpwpd = `P${Date.now()}`;

    const wpName = `IT Semantic WP ${Date.now()}`;
    const createWp = await jsonRequest("/api/wajib-pajak", "POST", {
      jenisWp: "orang_pribadi",
      peranWp: "pemilik",
      statusAktif: "active",
      namaWp: wpName,
      nikKtpWp: "1600000000000001",
      alamatWp: "Jl. Semantic WP",
      kecamatanWp: "Muaradua",
      kelurahanWp: "Batu Belang Jaya",
      teleponWaWp: "081234567890",
      emailWp: null,
      badanUsaha: null,
    });
    assert.equal(createWp.response.status, 201);
    wpId = requiredNumber((createWp.body as JsonRecord).id, "wp id wajib ada");

    const patchedWp = await jsonRequest(`/api/wajib-pajak/${wpId}`, "PATCH", {
      npwpd: semanticNpwpd,
    });
    assert.equal(patchedWp.response.status, 200);

    const { body: rekeningBody } = await requestJson("/api/master/rekening-pajak");
    assert.ok(Array.isArray(rekeningBody));
    const rekeningMakanan = (rekeningBody as JsonRecord[]).find(
      (item) => item.jenisPajak === "PBJT Makanan dan Minuman",
    );
    assert.ok(rekeningMakanan, "Rekening PBJT Makanan dan Minuman harus tersedia");
    const rekPajakId = requiredNumber(rekeningMakanan?.id, "rek_pajak_id wajib ada");
    const kodeRekening = requiredString(rekeningMakanan?.kodeRekening, "kode rekening wajib ada");

    const importName = `IT Semantic OP ${Date.now()}`;
    const form = new FormData();
    form.append(
      "file",
      buildExcelBlob(
        [
          {
            npwpd: semanticNpwpd,
            no_rek_pajak: kodeRekening,
            nama_op: importName,
            alamat_op: "Batu Belang Jaya",
            kecamatan_id: "1609040",
            kelurahan_id: "1609040001",
            status: "active",
          },
        ],
        [
          "npwpd",
          "no_rek_pajak",
          "nama_op",
          "alamat_op",
          "kecamatan_id",
          "kelurahan_id",
          "status",
        ],
      ),
      "op-semantic-import.xlsx",
    );

    const { response: importResponse, body: importBodyRaw } = await requestJson("/api/objek-pajak/import", {
      method: "POST",
      body: form,
    });
    const importBody = (importBodyRaw ?? {}) as JsonRecord;

    assert.equal(importResponse.status, 200);
    assert.equal(importBody.total, 1);
    assert.equal(importBody.created, 1);
    assert.equal(importBody.updated, 0);
    assert.equal(importBody.skipped, 0);
    assert.equal(importBody.success, 1);
    assert.equal(importBody.failed, 0);

    const { body: listBody } = await requestJson("/api/objek-pajak?includeUnverified=true");
    assert.ok(Array.isArray((listBody as JsonRecord).items));
    const imported = ((listBody as JsonRecord).items as JsonRecord[]).find(
      (item) => item.namaOp === importName,
    );
    assert.ok(imported, "Objek pajak hasil semantic import harus tersimpan");
    importedId = requiredNumber(imported?.id, "imported id wajib ada");
    assert.equal(requiredNumber(imported?.wpId, "wpId wajib ada"), wpId);
    assert.equal(requiredNumber(imported?.rekPajakId, "rekPajakId wajib ada"), rekPajakId);
    assert.match(requiredString(imported?.nopd, "NOPD wajib tergenerate"), /^\d{2}\.\d{2}\.\d{2}\.\d{4}$/);
  } finally {
    if (importedId !== null) {
      await jsonRequest(`/api/objek-pajak/${importedId}`, "DELETE");
    }

    if (wpId !== null) {
      await jsonRequest(`/api/wajib-pajak/${wpId}`, "DELETE");
    }

    await server.close();
  }
}

run()
  .then(() => {
    console.log("[integration] OP CSV semantic import: PASS");
  })
  .catch((error) => {
    console.error("[integration] OP CSV semantic import: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
