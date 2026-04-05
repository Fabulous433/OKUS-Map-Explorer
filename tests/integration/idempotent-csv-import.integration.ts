import assert from "node:assert/strict";
import { stringify } from "csv-stringify/sync";

import { createIntegrationServer, requiredNumber, requiredString, type JsonRecord } from "./_helpers";

async function run() {
  const server = await createIntegrationServer();
  const { jsonRequest, requestJson, loginAs } = server;

  const createdWpIds: number[] = [];
  const createdOpIds: number[] = [];

  try {
    const loginResult = await loginAs("admin", "admin123");
    assert.equal(loginResult.response.status, 200);

    const wpNpwpd = `ITNPWPD${Date.now()}`;
    const wpBaseName = `IT Idempotent WP ${Date.now()}`;
    const wpCreate = await jsonRequest("/api/wajib-pajak", "POST", {
      jenisWp: "orang_pribadi",
      peranWp: "pemilik",
      statusAktif: "active",
      namaWp: wpBaseName,
      nikKtpWp: `1600000000${Date.now().toString().slice(-6)}`,
      alamatWp: "Jl. Basis WP",
      kecamatanWp: "Muaradua",
      kelurahanWp: "Batu Belang Jaya",
      teleponWaWp: "081200000001",
      emailWp: null,
      badanUsaha: null,
    });
    assert.equal(wpCreate.response.status, 201);
    const baseWpId = requiredNumber((wpCreate.body as JsonRecord).id, "id wp dasar wajib ada");
    createdWpIds.push(baseWpId);

    const wpPatchNpwpd = await jsonRequest(`/api/wajib-pajak/${baseWpId}`, "PATCH", {
      npwpd: wpNpwpd,
    });
    assert.equal(wpPatchNpwpd.response.status, 200);

    const wpUpdateCsv = stringify(
      [
        {
          jenis_wp: "orang_pribadi",
          peran_wp: "pemilik",
          npwpd: wpNpwpd,
          status_aktif: "active",
          nama_subjek: wpBaseName,
          nik_subjek: "",
          alamat_subjek: "Jl. Update WP",
          kecamatan_subjek: "Muaradua",
          kelurahan_subjek: "Batu Belang Jaya",
          telepon_wa_subjek: "081200000009",
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

    const wpUpdateDryRunForm = new FormData();
    wpUpdateDryRunForm.append("file", new Blob([wpUpdateCsv], { type: "text/csv" }), "wp-update-dry-run.csv");
    wpUpdateDryRunForm.append("dryRun", "true");

    const wpUpdateDryRun = await requestJson("/api/wajib-pajak/import", {
      method: "POST",
      body: wpUpdateDryRunForm,
    });
    assert.equal(wpUpdateDryRun.response.status, 200);
    assert.equal((wpUpdateDryRun.body as JsonRecord).updated, 1);
    assert.equal((wpUpdateDryRun.body as JsonRecord).created, 0);
    assert.equal((wpUpdateDryRun.body as JsonRecord).skipped, 0);
    assert.equal((wpUpdateDryRun.body as JsonRecord).failed, 0);
    assert.equal((wpUpdateDryRun.body as JsonRecord).previewSummary.updatedRows, 1);
    const wpUpdatePreviewRows = ((wpUpdateDryRun.body as JsonRecord).previewRows ?? []) as JsonRecord[];
    assert.equal(wpUpdatePreviewRows[0]?.action, "updated");

    const wpUpdateForm = new FormData();
    wpUpdateForm.append("file", new Blob([wpUpdateCsv], { type: "text/csv" }), "wp-update.csv");

    const wpUpdateFinal = await requestJson("/api/wajib-pajak/import", {
      method: "POST",
      body: wpUpdateForm,
    });
    assert.equal(wpUpdateFinal.response.status, 200);
    assert.equal((wpUpdateFinal.body as JsonRecord).updated, 1);

    const wpAfterUpdate = await requestJson(`/api/wajib-pajak/detail/${baseWpId}`);
    assert.equal((wpAfterUpdate.body as JsonRecord).alamatWp, "Jl. Update WP");
    assert.equal((wpAfterUpdate.body as JsonRecord).teleponWaWp, "081200000009");

    const wpSkipCsv = stringify(
      [
        {
          jenis_wp: "orang_pribadi",
          peran_wp: "pemilik",
          npwpd: wpNpwpd,
          status_aktif: "active",
          nama_subjek: "",
          nik_subjek: "",
          alamat_subjek: "",
          kecamatan_subjek: "",
          kelurahan_subjek: "",
          telepon_wa_subjek: "",
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
    const wpSkipForm = new FormData();
    wpSkipForm.append("file", new Blob([wpSkipCsv], { type: "text/csv" }), "wp-skip.csv");
    wpSkipForm.append("dryRun", "true");

    const wpSkipDryRun = await requestJson("/api/wajib-pajak/import", {
      method: "POST",
      body: wpSkipForm,
    });
    assert.equal(wpSkipDryRun.response.status, 200);
    assert.equal((wpSkipDryRun.body as JsonRecord).skipped, 1);
    assert.equal((wpSkipDryRun.body as JsonRecord).updated, 0);
    assert.equal((wpSkipDryRun.body as JsonRecord).previewSummary.skippedRows, 1);
    const wpSkipPreviewRows = ((wpSkipDryRun.body as JsonRecord).previewRows ?? []) as JsonRecord[];
    assert.equal(wpSkipPreviewRows[0]?.action, "skipped");

    const wpWarningName = `IT Warning WP ${Date.now()}`;
    const wpWarningCsv = stringify(
      [
        {
          jenis_wp: "orang_pribadi",
          peran_wp: "pemilik",
          npwpd: "",
          status_aktif: "active",
          nama_subjek: wpWarningName,
          nik_subjek: (wpAfterUpdate.body as JsonRecord).nikKtpWp,
          alamat_subjek: "Jl. Warning WP",
          kecamatan_subjek: "Muaradua",
          kelurahan_subjek: "Batu Belang Jaya",
          telepon_wa_subjek: "081200000010",
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
    const wpWarningForm = new FormData();
    wpWarningForm.append("file", new Blob([wpWarningCsv], { type: "text/csv" }), "wp-warning.csv");

    const wpWarningImport = await requestJson("/api/wajib-pajak/import", {
      method: "POST",
      body: wpWarningForm,
    });
    assert.equal(wpWarningImport.response.status, 200);
    assert.equal((wpWarningImport.body as JsonRecord).created, 1);
    assert.ok(Array.isArray((wpWarningImport.body as JsonRecord).warnings));
    assert.ok(((wpWarningImport.body as JsonRecord).warnings as unknown[]).length > 0);
    const wpWarningPreviewRows = ((wpWarningImport.body as JsonRecord).previewRows ?? []) as JsonRecord[];
    assert.ok(Array.isArray(wpWarningPreviewRows[0]?.warnings));
    assert.ok(((wpWarningPreviewRows[0]?.warnings as unknown[]) ?? []).length > 0);

    const wpList = await requestJson("/api/wajib-pajak");
    const wpWarningCreated = (((wpList.body as JsonRecord).items ?? []) as JsonRecord[]).find(
      (item) => item.displayName === wpWarningName,
    );
    assert.ok(wpWarningCreated, "WP warning import harus tetap membuat row baru");
    createdWpIds.push(requiredNumber(wpWarningCreated?.id, "id wp warning wajib ada"));

    const importedWpName = `IT Imported With NPWPD ${Date.now()}`;
    const importedWpNpwpd = `ITNPWPDSTORE${Date.now()}`;
    const wpCreateWithNpwpdCsv = stringify(
      [
        {
          jenis_wp: "orang_pribadi",
          peran_wp: "pemilik",
          npwpd: importedWpNpwpd,
          status_aktif: "active",
          nama_subjek: importedWpName,
          nik_subjek: `1600000000${Date.now().toString().slice(-6)}`,
          alamat_subjek: "Jl. Imported NPWPD",
          kecamatan_subjek: "Muaradua",
          kelurahan_subjek: "Batu Belang Jaya",
          telepon_wa_subjek: "081200000011",
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
    const wpCreateWithNpwpdForm = new FormData();
    wpCreateWithNpwpdForm.append("file", new Blob([wpCreateWithNpwpdCsv], { type: "text/csv" }), "wp-create-with-npwpd.csv");
    const wpCreateWithNpwpdImport = await requestJson("/api/wajib-pajak/import", {
      method: "POST",
      body: wpCreateWithNpwpdForm,
    });
    assert.equal(wpCreateWithNpwpdImport.response.status, 200);
    assert.equal((wpCreateWithNpwpdImport.body as JsonRecord).created, 1);
    const wpCreateWithNpwpdPreviewRows = ((wpCreateWithNpwpdImport.body as JsonRecord).previewRows ?? []) as JsonRecord[];
    assert.equal(wpCreateWithNpwpdPreviewRows[0]?.action, "created");

    const wpListAfterNpwpdImport = await requestJson("/api/wajib-pajak");
    const importedWp = (((wpListAfterNpwpdImport.body as JsonRecord).items ?? []) as JsonRecord[]).find(
      (item) => item.displayName === importedWpName,
    );
    assert.ok(importedWp, "WP create via import dengan NPWPD harus membuat row baru");
    const importedWpId = requiredNumber(importedWp?.id, "id wp imported npwpd wajib ada");
    createdWpIds.push(importedWpId);
    const importedWpDetail = await requestJson(`/api/wajib-pajak/detail/${importedWpId}`);
    assert.equal(importedWpDetail.response.status, 200);
    assert.equal((importedWpDetail.body as JsonRecord).npwpd, importedWpNpwpd);

    const rekeningBody = await requestJson("/api/master/rekening-pajak");
    const rekeningMakanan = ((rekeningBody.body as JsonRecord[]) ?? []).find(
      (item) => item.jenisPajak === "PBJT Makanan dan Minuman",
    );
    assert.ok(rekeningMakanan, "rekening PBJT Makanan dan Minuman wajib tersedia");
    const rekPajakId = requiredNumber(rekeningMakanan?.id, "rekening id wajib ada");
    const kodeRekening = requiredString(rekeningMakanan?.kodeRekening, "kode rekening wajib ada");

    const opName = `IT Idempotent OP ${Date.now()}`;
    const createOp = await jsonRequest("/api/objek-pajak", "POST", {
      wpId: baseWpId,
      rekPajakId,
      namaOp: opName,
      alamatOp: "Jl. Basis OP",
      kecamatanId: "1609040",
      kelurahanId: "1609040001",
      status: "active",
      statusVerifikasi: "draft",
      catatanVerifikasi: null,
      verifiedAt: null,
      verifiedBy: null,
      detailPajak: null,
    });
    assert.equal(createOp.response.status, 201);
    const baseOpId = requiredNumber((createOp.body as JsonRecord).id, "id op dasar wajib ada");
    createdOpIds.push(baseOpId);
    const baseOpNopd = requiredString((createOp.body as JsonRecord).nopd, "nopd op dasar wajib ada");

    const opUpdateCsv = stringify(
      [
        {
          npwpd: wpNpwpd,
          no_rek_pajak: kodeRekening,
          nama_op: opName,
          alamat_op: "Jl. Update OP",
          kecamatan_id: "1609040",
          kelurahan_id: "1609040001",
          status: "inactive",
        },
      ],
      { header: true },
    );

    const opUpdateDryRunForm = new FormData();
    opUpdateDryRunForm.append("file", new Blob([opUpdateCsv], { type: "text/csv" }), "op-update-dry-run.csv");
    opUpdateDryRunForm.append("dryRun", "true");
    const opUpdateDryRun = await requestJson("/api/objek-pajak/import", {
      method: "POST",
      body: opUpdateDryRunForm,
    });
    assert.equal(opUpdateDryRun.response.status, 200);
    assert.equal((opUpdateDryRun.body as JsonRecord).updated, 1);
    assert.equal((opUpdateDryRun.body as JsonRecord).created, 0);
    assert.equal((opUpdateDryRun.body as JsonRecord).skipped, 0);
    assert.equal((opUpdateDryRun.body as JsonRecord).previewSummary.updatedRows, 1);
    const opUpdatePreviewRows = ((opUpdateDryRun.body as JsonRecord).previewRows ?? []) as JsonRecord[];
    assert.equal(opUpdatePreviewRows[0]?.action, "updated");

    const opUpdateForm = new FormData();
    opUpdateForm.append("file", new Blob([opUpdateCsv], { type: "text/csv" }), "op-update.csv");
    const opUpdateFinal = await requestJson("/api/objek-pajak/import", {
      method: "POST",
      body: opUpdateForm,
    });
    assert.equal(opUpdateFinal.response.status, 200);
    assert.equal((opUpdateFinal.body as JsonRecord).updated, 1);

    const opAfterUpdate = await requestJson(`/api/objek-pajak/${baseOpId}`);
    assert.equal((opAfterUpdate.body as JsonRecord).alamatOp, "Jl. Update OP");
    assert.equal((opAfterUpdate.body as JsonRecord).status, "inactive");

    const opSkipCsv = stringify(
      [
        {
          npwpd: wpNpwpd,
          no_rek_pajak: kodeRekening,
          nama_op: opName,
          alamat_op: "",
          kecamatan_id: "",
          kelurahan_id: "",
          status: "inactive",
        },
      ],
      { header: true },
    );
    const opSkipForm = new FormData();
    opSkipForm.append("file", new Blob([opSkipCsv], { type: "text/csv" }), "op-skip.csv");
    opSkipForm.append("dryRun", "true");
    const opSkipDryRun = await requestJson("/api/objek-pajak/import", {
      method: "POST",
      body: opSkipForm,
    });
    assert.equal(opSkipDryRun.response.status, 200);
    assert.equal((opSkipDryRun.body as JsonRecord).skipped, 1);
    const opSkipPreviewRows = ((opSkipDryRun.body as JsonRecord).previewRows ?? []) as JsonRecord[];
    assert.equal(opSkipPreviewRows[0]?.action, "skipped");

    const createConflictOp = await jsonRequest("/api/objek-pajak", "POST", {
      wpId: baseWpId,
      rekPajakId,
      namaOp: `${opName} Conflict`,
      alamatOp: "Jl. Conflict OP",
      kecamatanId: "1609040",
      kelurahanId: "1609040001",
      status: "active",
      statusVerifikasi: "draft",
      catatanVerifikasi: null,
      verifiedAt: null,
      verifiedBy: null,
      detailPajak: null,
    });
    assert.equal(createConflictOp.response.status, 201);
    const conflictOpId = requiredNumber((createConflictOp.body as JsonRecord).id, "id op conflict wajib ada");
    createdOpIds.push(conflictOpId);
    const conflictNopd = requiredString((createConflictOp.body as JsonRecord).nopd, "nopd conflict wajib ada");

    const opConflictCsv = stringify(
      [
        {
          nopd: conflictNopd,
          npwpd: wpNpwpd,
          no_rek_pajak: kodeRekening,
          nama_op: opName,
          alamat_op: "Jl. Konflik",
          kecamatan_id: "1609040",
          kelurahan_id: "1609040001",
          status: "active",
        },
      ],
      { header: true },
    );
    const opConflictForm = new FormData();
    opConflictForm.append("file", new Blob([opConflictCsv], { type: "text/csv" }), "op-conflict.csv");
    opConflictForm.append("dryRun", "true");
    const opConflictDryRun = await requestJson("/api/objek-pajak/import", {
      method: "POST",
      body: opConflictForm,
    });
    assert.equal(opConflictDryRun.response.status, 200);
    assert.equal((opConflictDryRun.body as JsonRecord).failed, 1);
    const opConflictPreviewRows = ((opConflictDryRun.body as JsonRecord).previewRows ?? []) as JsonRecord[];
    assert.equal(opConflictPreviewRows[0]?.action, "failed");
    assert.ok(
      ((opConflictPreviewRows[0]?.messages as unknown[]) ?? []).some(
        (message) => typeof message === "string" && message.includes("NOPD"),
      ),
    );

    const duplicateName = `IT OP Duplicate ${Date.now()}`;
    const createDuplicateOpA = await jsonRequest("/api/objek-pajak", "POST", {
      wpId: baseWpId,
      rekPajakId,
      namaOp: duplicateName,
      alamatOp: "Jl. Duplicate A",
      kecamatanId: "1609040",
      kelurahanId: "1609040001",
      status: "active",
      statusVerifikasi: "draft",
      catatanVerifikasi: null,
      verifiedAt: null,
      verifiedBy: null,
      detailPajak: null,
    });
    assert.equal(createDuplicateOpA.response.status, 201);
    createdOpIds.push(requiredNumber((createDuplicateOpA.body as JsonRecord).id, "id op dup A wajib ada"));

    const createDuplicateOpB = await jsonRequest("/api/objek-pajak", "POST", {
      wpId: baseWpId,
      rekPajakId,
      namaOp: duplicateName,
      alamatOp: "Jl. Duplicate B",
      kecamatanId: "1609040",
      kelurahanId: "1609040001",
      status: "active",
      statusVerifikasi: "draft",
      catatanVerifikasi: null,
      verifiedAt: null,
      verifiedBy: null,
      detailPajak: null,
    });
    assert.equal(createDuplicateOpB.response.status, 201);
    createdOpIds.push(requiredNumber((createDuplicateOpB.body as JsonRecord).id, "id op dup B wajib ada"));

    const opMultiMatchCsv = stringify(
      [
        {
          npwpd: wpNpwpd,
          no_rek_pajak: kodeRekening,
          nama_op: duplicateName,
          alamat_op: "Jl. Duplicate Import",
          kecamatan_id: "1609040",
          kelurahan_id: "1609040001",
          status: "active",
        },
      ],
      { header: true },
    );
    const opMultiMatchForm = new FormData();
    opMultiMatchForm.append("file", new Blob([opMultiMatchCsv], { type: "text/csv" }), "op-multi-match.csv");
    opMultiMatchForm.append("dryRun", "true");
    const opMultiMatchDryRun = await requestJson("/api/objek-pajak/import", {
      method: "POST",
      body: opMultiMatchForm,
    });
    assert.equal(opMultiMatchDryRun.response.status, 200);
    assert.equal((opMultiMatchDryRun.body as JsonRecord).failed, 1);
    const opMultiMatchPreviewRows = ((opMultiMatchDryRun.body as JsonRecord).previewRows ?? []) as JsonRecord[];
    assert.equal(opMultiMatchPreviewRows[0]?.action, "failed");
    assert.ok(
      ((opMultiMatchPreviewRows[0]?.messages as unknown[]) ?? []).some(
        (message) => typeof message === "string" && message.includes("lebih dari satu kandidat"),
      ),
    );

    assert.equal(baseOpNopd.length > 0, true);
  } finally {
    for (const opId of createdOpIds.reverse()) {
      await jsonRequest(`/api/objek-pajak/${opId}`, "DELETE");
    }
    for (const wpId of createdWpIds.reverse()) {
      await jsonRequest(`/api/wajib-pajak/${wpId}`, "DELETE");
    }
    await server.close();
  }
}

run()
  .then(() => {
    console.log("[integration] Idempotent CSV import WP/OP: PASS");
  })
  .catch((error) => {
    console.error("[integration] Idempotent CSV import WP/OP: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
