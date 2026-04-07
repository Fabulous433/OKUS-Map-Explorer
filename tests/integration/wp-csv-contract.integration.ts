import assert from "node:assert/strict";
import { parse } from "csv-parse/sync";

import { createIntegrationServer, requiredNumber, requiredString, type JsonRecord } from "./_helpers";
import { buildExcelBlob } from "./_excel";

const WP_COMPACT_COLUMNS = [
  "jenis_wp",
  "peran_wp",
  "npwpd",
  "status_aktif",
  "nama_subjek",
  "nik_subjek",
  "alamat_subjek",
  "kecamatan_subjek",
  "kelurahan_subjek",
  "telepon_wa_subjek",
  "email_subjek",
  "lampiran",
  "nama_badan_usaha",
  "npwp_badan_usaha",
  "alamat_badan_usaha",
  "kecamatan_badan_usaha",
  "kelurahan_badan_usaha",
  "telepon_badan_usaha",
  "email_badan_usaha",
] as const;

const WP_LEGACY_COLUMNS = [
  "jenis_wp",
  "peran_wp",
  "npwpd",
  "status_aktif",
  "nama_wp",
  "nik_ktp_wp",
  "alamat_wp",
  "kecamatan_wp",
  "kelurahan_wp",
  "telepon_wa_wp",
  "email_wp",
  "nama_pengelola",
  "nik_pengelola",
  "alamat_pengelola",
  "kecamatan_pengelola",
  "kelurahan_pengelola",
  "telepon_wa_pengelola",
  "nama_badan_usaha",
  "npwp_badan_usaha",
  "alamat_badan_usaha",
  "kecamatan_badan_usaha",
  "kelurahan_badan_usaha",
  "telepon_badan_usaha",
  "email_badan_usaha",
] as const;

async function run() {
  const server = await createIntegrationServer();
  const { loginAs, requestJson, requestText, requestForm, jsonRequest } = server;

  let compactWpId: number | null = null;
  let legacyWpId: number | null = null;
  let compactAttachmentId: string | null = null;

  try {
    const loginResult = await loginAs("admin", "admin123");
    assert.equal(loginResult.response.status, 200);

    const uniq = Date.now();
    const compactName = `IT Compact Pengelola ${uniq}`;
    const compactRow: Record<string, string> = {
      jenis_wp: "orang_pribadi",
      peran_wp: "pengelola",
      npwpd: "",
      status_aktif: "active",
      nama_subjek: compactName,
      nik_subjek: `317401${String(uniq).slice(-10)}`,
      alamat_subjek: "Jl. Compact Pengelola",
      kecamatan_subjek: "Kecamatan Compact",
      kelurahan_subjek: "Kelurahan Compact",
      telepon_wa_subjek: `0813${String(uniq).slice(-8)}`,
      email_subjek: "",
      lampiran: "",
      nama_badan_usaha: "",
      npwp_badan_usaha: "",
      alamat_badan_usaha: "",
      kecamatan_badan_usaha: "",
      kelurahan_badan_usaha: "",
      telepon_badan_usaha: "",
      email_badan_usaha: "",
    };

    const compactForm = new FormData();
    compactForm.append("file", buildExcelBlob([compactRow], [...WP_COMPACT_COLUMNS]), "wp-compact.xlsx");

    const compactImport = await requestForm("/api/wajib-pajak/import", "POST", compactForm);
    assert.equal(compactImport.response.status, 200);
    const compactImportBody = (compactImport.body ?? {}) as JsonRecord;
    assert.equal(compactImportBody.total, 1);
    assert.equal(compactImportBody.success, 1, "Excel WP compact harus bisa di-import");
    assert.equal(compactImportBody.failed, 0);

    const compactList = await requestJson(`/api/wajib-pajak?page=1&limit=50&q=${encodeURIComponent(compactName)}`);
    assert.equal(compactList.response.status, 200);
    const compactItems = ((compactList.body as JsonRecord).items ?? []) as JsonRecord[];
    const compactWp = compactItems.find((item) => item.displayName === compactName);
    assert.ok(compactWp, "WP hasil import compact harus ditemukan");
    compactWpId = requiredNumber(compactWp?.id, "compact wp id wajib ada");
    assert.equal(compactWp?.peranWp, "pengelola");
    assert.equal(compactWp?.namaPengelola, compactName);

    const attachmentForm = new FormData();
    attachmentForm.set("documentType", "surat_kuasa");
    attachmentForm.set("file", new Blob([Buffer.from("%PDF-1.4 compact wp")], { type: "application/pdf" }), "compact-wp.pdf");
    const compactAttachment = await requestForm(`/api/wajib-pajak/${compactWpId}/attachments`, "POST", attachmentForm);
    assert.equal(compactAttachment.response.status, 201);
    compactAttachmentId = String((compactAttachment.body as JsonRecord).id);

    const legacyName = `IT Legacy Pemilik ${uniq}`;
    const legacyRow: Record<string, string> = {
      jenis_wp: "orang_pribadi",
      peran_wp: "pemilik",
      npwpd: "",
      status_aktif: "active",
      nama_wp: legacyName,
      nik_ktp_wp: `317402${String(uniq).slice(-10)}`,
      alamat_wp: "Jl. Legacy Pemilik",
      kecamatan_wp: "Kecamatan Legacy",
      kelurahan_wp: "Kelurahan Legacy",
      telepon_wa_wp: `0814${String(uniq).slice(-8)}`,
      email_wp: "legacy@example.com",
      nama_pengelola: "",
      nik_pengelola: "",
      alamat_pengelola: "",
      kecamatan_pengelola: "",
      kelurahan_pengelola: "",
      telepon_wa_pengelola: "",
      nama_badan_usaha: "",
      npwp_badan_usaha: "",
      alamat_badan_usaha: "",
      kecamatan_badan_usaha: "",
      kelurahan_badan_usaha: "",
      telepon_badan_usaha: "",
      email_badan_usaha: "",
    };

    const legacyForm = new FormData();
    legacyForm.append("file", buildExcelBlob([legacyRow], [...WP_LEGACY_COLUMNS]), "wp-legacy.xlsx");

    const legacyImport = await requestForm("/api/wajib-pajak/import", "POST", legacyForm);
    assert.equal(legacyImport.response.status, 200);
    const legacyImportBody = (legacyImport.body ?? {}) as JsonRecord;
    assert.equal(legacyImportBody.total, 1);
    assert.equal(legacyImportBody.success, 1, "Excel WP legacy tetap harus didukung");
    assert.equal(legacyImportBody.failed, 0);

    const legacyList = await requestJson(`/api/wajib-pajak?page=1&limit=50&q=${encodeURIComponent(legacyName)}`);
    assert.equal(legacyList.response.status, 200);
    const legacyItems = ((legacyList.body as JsonRecord).items ?? []) as JsonRecord[];
    const legacyWp = legacyItems.find((item) => item.displayName === legacyName);
    assert.ok(legacyWp, "WP hasil import legacy harus ditemukan");
    legacyWpId = requiredNumber(legacyWp?.id, "legacy wp id wajib ada");

    const exportCsv = await requestText("/api/wajib-pajak/export");
    assert.equal(exportCsv.response.status, 200);
    const exportRows = parse<Record<string, string>>(exportCsv.body, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });
    assert.ok(exportRows.length > 0);

    const exportHeaders = Object.keys(exportRows[0]);
    assert.ok(exportHeaders.includes("nama_subjek"), "Export WP harus memakai header compact");
    assert.ok(exportHeaders.includes("lampiran"), "Export WP harus memuat status lampiran");
    assert.equal(exportHeaders.includes("nama_pengelola"), false, "Header legacy pengelola tidak boleh ikut di export compact");

    const compactExportRow = exportRows.find((row) => row.nama_subjek === compactName);
    assert.ok(compactExportRow, "Baris compact harus muncul di export");
    assert.equal(compactExportRow?.peran_wp, "pengelola");
    assert.equal(compactExportRow?.lampiran, "ADA");

    const legacyExportRow = exportRows.find((row) => row.nama_subjek === legacyName);
    assert.ok(legacyExportRow, "Baris legacy harus ikut ke format compact baru");
    assert.equal(legacyExportRow?.peran_wp, "pemilik");
  } finally {
    const cleanupWpDependencies = async (wpId: number | null) => {
      if (wpId === null) return;

      const opList = await requestJson("/api/objek-pajak?page=1&limit=200&includeUnverified=true");
      if (opList.response.status !== 200) return;

      const opItems = (((opList.body as JsonRecord).items ?? []) as JsonRecord[]).filter(
        (item) => Number(item.wpId) === wpId,
      );

      for (const item of opItems) {
        const opId = Number(item.id);
        if (Number.isFinite(opId)) {
          await jsonRequest(`/api/objek-pajak/${opId}`, "DELETE");
        }
      }
    };

    await cleanupWpDependencies(compactWpId);
    await cleanupWpDependencies(legacyWpId);

    if (compactAttachmentId !== null && compactWpId !== null) {
      await jsonRequest(`/api/wajib-pajak/${compactWpId}/attachments/${compactAttachmentId}`, "DELETE");
    }

    if (compactWpId !== null) {
      await jsonRequest(`/api/wajib-pajak/${compactWpId}`, "DELETE");
    }

    if (legacyWpId !== null) {
      await jsonRequest(`/api/wajib-pajak/${legacyWpId}`, "DELETE");
    }

    await server.close();
  }
}

run()
  .then(() => {
    console.log("[integration] WP Excel import + compact CSV export contract: PASS");
  })
  .catch((error) => {
    console.error("[integration] WP Excel import + compact CSV export contract: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
