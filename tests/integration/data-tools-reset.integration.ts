import assert from "node:assert/strict";
import { stringify } from "csv-stringify/sync";

import { createIntegrationServer, requiredNumber, type JsonRecord } from "./_helpers";

async function run() {
  const server = await createIntegrationServer();
  const { loginAs, requestJson, jsonRequest } = server;

  let manualWpId: number | null = null;

  try {
    const loginResult = await loginAs("admin", "admin123");
    assert.equal(loginResult.response.status, 200);

    const manualWp = await jsonRequest("/api/wajib-pajak", "POST", {
      jenisWp: "orang_pribadi",
      peranWp: "pemilik",
      statusAktif: "active",
      namaWp: `IT Reset Manual WP ${Date.now()}`,
      nikKtpWp: `1600000000${Date.now().toString().slice(-6)}`,
      alamatWp: "Jl. Manual Reset",
      kecamatanWp: "Muaradua",
      kelurahanWp: "Batu Belang Jaya",
      teleponWaWp: "081200000101",
      emailWp: null,
      badanUsaha: null,
    });
    assert.equal(manualWp.response.status, 201);
    manualWpId = requiredNumber((manualWp.body as JsonRecord).id, "manual wp id wajib ada");

    const importedWpName = `IT Reset Imported WP ${Date.now()}`;
    const importedWpNpwpd = `ITRESETWP${Date.now()}`;
    const importedWpCsv = stringify(
      [
        {
          jenis_wp: "orang_pribadi",
          peran_wp: "pemilik",
          npwpd: importedWpNpwpd,
          status_aktif: "active",
          nama_subjek: importedWpName,
          nik_subjek: `1600000000${Date.now().toString().slice(-6)}`,
          alamat_subjek: "Jl. Imported Reset WP",
          kecamatan_subjek: "Muaradua",
          kelurahan_subjek: "Batu Belang Jaya",
          telepon_wa_subjek: "081200000102",
          email_subjek: "",
          nama_badan_usaha: "",
          npwp_badan_usaha: "",
          alamat_badan_usaha: "",
          kecamatan_badan_usaha: "",
          kelurahan_badan_usaha: "",
          telepon_badan_usaha: "",
          email_badan_usaha: "",
        },
      ],
      { header: true },
    );
    const importedWpForm = new FormData();
    importedWpForm.append("file", new Blob([importedWpCsv], { type: "text/csv" }), "reset-imported-wp.csv");
    const importedWpResult = await requestJson("/api/wajib-pajak/import", {
      method: "POST",
      body: importedWpForm,
    });
    assert.equal(importedWpResult.response.status, 200);
    assert.equal((importedWpResult.body as JsonRecord).created, 1);

    const wpListBeforeReset = await requestJson("/api/wajib-pajak");
    const wpItemsBeforeReset = ((wpListBeforeReset.body as JsonRecord).items ?? []) as JsonRecord[];
    const importedWp = wpItemsBeforeReset.find((item) => item.displayName === importedWpName);
    assert.ok(importedWp, "WP imported untuk reset harus ada sebelum reset");
    const importedWpId = requiredNumber(importedWp?.id, "imported wp id wajib ada");

    const rekeningBody = await requestJson("/api/master/rekening-pajak");
    const rekeningMakanan = ((rekeningBody.body as JsonRecord[]) ?? []).find(
      (item) => item.jenisPajak === "PBJT Makanan dan Minuman",
    );
    assert.ok(rekeningMakanan, "rekening PBJT wajib ada untuk reset import OP");
    const kodeRekening = String(rekeningMakanan?.kodeRekening ?? "");

    const importedOpName = `IT Reset Imported OP ${Date.now()}`;
    const importedOpCsv = stringify(
      [
        {
          npwpd: importedWpNpwpd,
          no_rek_pajak: kodeRekening,
          nama_op: importedOpName,
          alamat_op: "Jl. Imported Reset OP",
          kecamatan_id: "1609040",
          kelurahan_id: "1609040001",
          status: "active",
        },
      ],
      { header: true },
    );
    const importedOpForm = new FormData();
    importedOpForm.append("file", new Blob([importedOpCsv], { type: "text/csv" }), "reset-imported-op.csv");
    const importedOpResult = await requestJson("/api/objek-pajak/import", {
      method: "POST",
      body: importedOpForm,
    });
    assert.equal(importedOpResult.response.status, 200);
    assert.equal((importedOpResult.body as JsonRecord).created, 1);

    const opListBeforeReset = await requestJson("/api/objek-pajak?includeUnverified=true");
    const opItemsBeforeReset = ((opListBeforeReset.body as JsonRecord).items ?? []) as JsonRecord[];
    assert.equal(
      opItemsBeforeReset.some((item) => item.namaOp === importedOpName),
      true,
      "OP imported untuk reset harus ada sebelum reset",
    );

    const resetOpWithoutConfirm = await jsonRequest("/api/objek-pajak/reset-imported", "POST", {});
    assert.equal(resetOpWithoutConfirm.response.status, 400);

    const resetOp = await jsonRequest("/api/objek-pajak/reset-imported", "POST", {
      confirmationText: "RESET IMPORT OP",
    });
    assert.equal(resetOp.response.status, 200);
    assert.ok(Number((resetOp.body as JsonRecord).deletedCount) >= 1);

    const opListAfterReset = await requestJson("/api/objek-pajak?includeUnverified=true");
    const opItemsAfterReset = ((opListAfterReset.body as JsonRecord).items ?? []) as JsonRecord[];
    assert.equal(
      opItemsAfterReset.some((item) => item.namaOp === importedOpName),
      false,
      "reset import OP harus menghapus OP hasil import",
    );

    const wpAfterOpReset = await requestJson(`/api/wajib-pajak/detail/${importedWpId}`);
    assert.equal(wpAfterOpReset.response.status, 200, "reset OP tidak boleh menghapus WP imported");

    const resetWpWithoutConfirm = await jsonRequest("/api/wajib-pajak/reset-imported", "POST", {});
    assert.equal(resetWpWithoutConfirm.response.status, 400);

    const resetWp = await jsonRequest("/api/wajib-pajak/reset-imported", "POST", {
      confirmationText: "RESET IMPORT WP",
    });
    assert.equal(resetWp.response.status, 200);
    assert.ok(Number((resetWp.body as JsonRecord).deletedCount) >= 1);

    const wpListAfterReset = await requestJson("/api/wajib-pajak");
    const wpItemsAfterReset = ((wpListAfterReset.body as JsonRecord).items ?? []) as JsonRecord[];
    assert.equal(
      wpItemsAfterReset.some((item) => item.displayName === importedWpName),
      false,
      "reset import WP harus menghapus WP hasil import",
    );
    assert.equal(
      wpItemsAfterReset.some((item) => item.id === manualWpId),
      true,
      "reset import WP tidak boleh menghapus WP manual/non-import",
    );
  } finally {
    if (manualWpId !== null) {
      await jsonRequest(`/api/wajib-pajak/${manualWpId}`, "DELETE");
    }
    await server.close();
  }
}

run()
  .then(() => {
    console.log("[integration] Data Tools reset imported data: PASS");
  })
  .catch((error) => {
    console.error("[integration] Data Tools reset imported data: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
