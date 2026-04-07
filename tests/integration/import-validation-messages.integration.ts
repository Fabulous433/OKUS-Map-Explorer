import assert from "node:assert/strict";

import { eq } from "drizzle-orm";

import { objekPajak } from "../../shared/schema";
import { db } from "../../server/storage";
import { createIntegrationServer, requiredNumber, requiredString, type JsonRecord } from "./_helpers";
import { buildExcelBlob } from "./_excel";

async function run() {
  const server = await createIntegrationServer();
  const { jsonRequest, requestJson, loginAs } = server;
  const createdWpIds: number[] = [];
  const createdOpIds: number[] = [];

  try {
    const loginResult = await loginAs("admin", "admin123");
    assert.equal(loginResult.response.status, 200);

    const wpNpwpd = `ITMSG${Date.now()}`;
    const wpCreate = await jsonRequest("/api/wajib-pajak", "POST", {
      jenisWp: "orang_pribadi",
      peranWp: "pemilik",
      statusAktif: "active",
      namaWp: `IT Verify Message ${Date.now()}`,
      nikKtpWp: `1600000000${Date.now().toString().slice(-6)}`,
      alamatWp: "Jl. Verify Message",
      kecamatanWp: "Muaradua",
      kelurahanWp: "Batu Belang Jaya",
      teleponWaWp: "081200001111",
      emailWp: null,
      badanUsaha: null,
    });
    assert.equal(wpCreate.response.status, 201);
    const wpId = requiredNumber((wpCreate.body as JsonRecord).id, "wp id wajib ada");
    createdWpIds.push(wpId);

    const wpPatch = await jsonRequest(`/api/wajib-pajak/${wpId}`, "PATCH", { npwpd: wpNpwpd });
    assert.equal(wpPatch.response.status, 200);

    const wpInvalidSheet = [
      {
        jenis_wp: "orang_pribadi",
        peran_wp: "pemilik",
        status_aktif: "active",
        nama_subjek: "WP Invalid",
        nik_subjek: "1600000000123456",
        alamat_subjek: "Jl. Invalid",
        kecamatan_subjek: "Muaradua",
        kelurahan_subjek: "Batu Belang Jaya",
        telepon_wa_subjek: "081200001112",
        nama_badan_usaha: "PT Salah Isi",
        npwp_badan_usaha: "0102030405",
      },
    ];
    const wpInvalidForm = new FormData();
    wpInvalidForm.append("file", buildExcelBlob(wpInvalidSheet), "wp-invalid.xlsx");
    wpInvalidForm.append("dryRun", "true");

    const wpInvalid = await requestJson("/api/wajib-pajak/import", {
      method: "POST",
      body: wpInvalidForm,
    });
    assert.equal(wpInvalid.response.status, 200);
    const wpMessages = ((((wpInvalid.body as JsonRecord).previewRows ?? []) as JsonRecord[])[0]?.messages ?? []) as string[];
    assert.ok(
      wpMessages.some(
        (message) =>
          typeof message === "string" &&
          message.includes("nama_badan_usaha") &&
          message.includes("npwp_badan_usaha") &&
          message.includes("orang_pribadi"),
      ),
      "pesan WP harus menyebut kolom badan usaha yang harus dikosongkan",
    );

    const wpInvalidFinalForm = new FormData();
    wpInvalidFinalForm.append("file", buildExcelBlob(wpInvalidSheet), "wp-invalid-final.xlsx");
    const wpInvalidFinal = await requestJson("/api/wajib-pajak/import", {
      method: "POST",
      body: wpInvalidFinalForm,
    });
    assert.equal(wpInvalidFinal.response.status, 409);
    assert.equal((wpInvalidFinal.body as JsonRecord).failed, 1);
    assert.match(
      requiredString((wpInvalidFinal.body as JsonRecord).message, "message wajib ada"),
      /Preview validasi belum bersih/i,
    );

    const rekeningBody = await requestJson("/api/master/rekening-pajak");
    const rekeningMakanan = (((rekeningBody.body as JsonRecord[]) ?? []) as JsonRecord[]).find(
      (item) => item.jenisPajak === "PBJT Makanan dan Minuman",
    );
    assert.ok(rekeningMakanan, "rekening PBJT Makanan dan Minuman wajib tersedia");
    const kodeRekening = requiredString(rekeningMakanan?.kodeRekening, "kode rekening wajib ada");

    const opInvalidSheet = [
      {
        npwpd: wpNpwpd,
        no_rek_pajak: kodeRekening,
        nama_op: `OP Invalid ${Date.now()}`,
        alamat_op: "Jl. Invalid OP",
        kecamatan_id: "1609040",
        kelurahan_id: "1609040001",
        status: "active",
        detail_jenis_usaha: "Restoran",
        detail_kapasitas_tempat: "20",
      },
    ];
    const opInvalidForm = new FormData();
    opInvalidForm.append("file", buildExcelBlob(opInvalidSheet), "op-invalid.xlsx");
    opInvalidForm.append("dryRun", "true");

    const opInvalid = await requestJson("/api/objek-pajak/import", {
      method: "POST",
      body: opInvalidForm,
    });
    assert.equal(opInvalid.response.status, 200);
    const opMessages = ((((opInvalid.body as JsonRecord).previewRows ?? []) as JsonRecord[])[0]?.messages ?? []) as string[];
    assert.ok(
      opMessages.some(
        (message) =>
          typeof message === "string" &&
          message.includes("detail_klasifikasi") &&
          message.includes("detail_jenis_usaha") &&
          message.includes("Restoran"),
      ),
      "pesan OP harus menyebut kolom detail_klasifikasi dan kondisi Restoran",
    );

    const opInvalidMasterSheet = [
      {
        npwpd: wpNpwpd,
        no_rek_pajak: kodeRekening,
        nama_op: `OP Invalid Kecamatan ${Date.now()}`,
        alamat_op: "Jl. Invalid Kecamatan",
        kecamatan_id: "9999999999",
        kelurahan_id: "1609040001",
        status: "active",
      },
    ];
    const opInvalidMasterForm = new FormData();
    opInvalidMasterForm.append("file", buildExcelBlob(opInvalidMasterSheet), "op-invalid-master.xlsx");
    opInvalidMasterForm.append("dryRun", "true");

    const opInvalidMaster = await requestJson("/api/objek-pajak/import", {
      method: "POST",
      body: opInvalidMasterForm,
    });
    assert.equal(opInvalidMaster.response.status, 200);
    const opInvalidMasterMessages = ((((opInvalidMaster.body as JsonRecord).previewRows ?? []) as JsonRecord[])[0]?.messages ??
      []) as string[];
    assert.ok(
      opInvalidMasterMessages.some(
        (message) =>
          typeof message === "string" &&
          message.includes("kecamatan_id") &&
          message.includes("master kecamatan aktif"),
      ),
      "preview OP harus sudah menangkap kecamatan_id invalid sebelum import final",
    );

    const legacyImportedNopd = "07.01.01.0024";
    const opLegacyNopdSheet = [
      {
        npwpd: wpNpwpd,
        no_rek_pajak: kodeRekening,
        nama_op: `OP Legacy NOPD ${Date.now()}`,
        alamat_op: "Jl. Legacy NOPD",
        kecamatan_id: "1609040",
        kelurahan_id: "1609040001",
        status: "active",
        nopd: legacyImportedNopd,
      },
    ];
    const opLegacyNopdForm = new FormData();
    opLegacyNopdForm.append("file", buildExcelBlob(opLegacyNopdSheet), "op-legacy-nopd.xlsx");

    const opLegacyNopdImport = await requestJson("/api/objek-pajak/import", {
      method: "POST",
      body: opLegacyNopdForm,
    });
    assert.equal(opLegacyNopdImport.response.status, 200);
    assert.equal((opLegacyNopdImport.body as JsonRecord).created, 1);

    const [storedLegacyOp] = await db
      .select()
      .from(objekPajak)
      .where(eq(objekPajak.namaOp, opLegacyNopdSheet[0].nama_op))
      .limit(1);
    assert.ok(storedLegacyOp, "OP import legacy NOPD harus tersimpan");
    createdOpIds.push(storedLegacyOp.id);
    assert.equal(
      storedLegacyOp.nopd,
      legacyImportedNopd,
      "NOPD legacy dari file import harus disimpan apa adanya",
    );

    const opInvalidFinalForm = new FormData();
    opInvalidFinalForm.append("file", buildExcelBlob(opInvalidSheet), "op-invalid-final.xlsx");
    const opInvalidFinal = await requestJson("/api/objek-pajak/import", {
      method: "POST",
      body: opInvalidFinalForm,
    });
    assert.equal(opInvalidFinal.response.status, 409);
    assert.equal((opInvalidFinal.body as JsonRecord).failed, 1);
    assert.match(
      requiredString((opInvalidFinal.body as JsonRecord).message, "message wajib ada"),
      /Preview validasi belum bersih/i,
    );
  } finally {
    for (const id of createdOpIds) {
      await jsonRequest(`/api/objek-pajak/${id}`, "DELETE");
    }
    for (const id of createdWpIds) {
      await jsonRequest(`/api/wajib-pajak/${id}`, "DELETE");
    }
    await server.close();
  }
}

run()
  .then(() => {
    console.log("[integration] Import validation messages: PASS");
  })
  .catch((error) => {
    console.error("[integration] Import validation messages: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
