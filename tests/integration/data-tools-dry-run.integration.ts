import assert from "node:assert/strict";
import { stringify } from "csv-stringify/sync";

import { createIntegrationServer, requiredNumber, type JsonRecord } from "./_helpers";

async function run() {
  const server = await createIntegrationServer();
  const { loginAs, requestJson, jsonRequest } = server;

  let wpIdForOp: number | null = null;

  try {
    const loginResult = await loginAs("admin", "admin123");
    assert.equal(loginResult.response.status, 200);
    const semanticNpwpd = `ITNPWPD${Date.now()}`;

    const wpImportName = `IT Dry Run WP ${Date.now()}`;
    const wpCsv = stringify(
      [
        {
          jenis_wp: "orang_pribadi",
          peran_wp: "pemilik",
          npwpd: "",
          status_aktif: "active",
          nama_subjek: wpImportName,
          nik_subjek: "1600000000000101",
          alamat_subjek: "Jl. Dry Run WP",
          kecamatan_subjek: "Muaradua",
          kelurahan_subjek: "Batu Belang Jaya",
          telepon_wa_subjek: "081234567801",
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
      {
        header: true,
      },
    );
    const wpForm = new FormData();
    wpForm.append("file", new Blob([wpCsv], { type: "text/csv" }), "wp-dry-run.csv");
    wpForm.append("dryRun", "true");

    const wpDryRun = await requestJson("/api/wajib-pajak/import", {
      method: "POST",
      body: wpForm,
    });
    assert.equal(wpDryRun.response.status, 200);
    assert.equal((wpDryRun.body as JsonRecord).dryRun, true);
    assert.equal((wpDryRun.body as JsonRecord).created, 1);
    assert.equal((wpDryRun.body as JsonRecord).updated, 0);
    assert.equal((wpDryRun.body as JsonRecord).skipped, 0);
    assert.equal((wpDryRun.body as JsonRecord).success, 1);
    assert.equal((wpDryRun.body as JsonRecord).failed, 0);
    assert.ok((wpDryRun.body as JsonRecord).previewSummary, "dry-run WP harus mengembalikan previewSummary");
    assert.equal((wpDryRun.body as JsonRecord).previewSummary.validRows, 1);
    assert.equal((wpDryRun.body as JsonRecord).previewSummary.invalidRows, 0);
    assert.equal((wpDryRun.body as JsonRecord).previewSummary.createdRows, 1);
    assert.equal((wpDryRun.body as JsonRecord).previewSummary.compactRows, 1);
    assert.equal((wpDryRun.body as JsonRecord).previewSummary.legacyRows, 0);
    assert.ok(Array.isArray((wpDryRun.body as JsonRecord).previewRows), "dry-run WP harus mengembalikan previewRows");
    const wpPreviewRows = ((wpDryRun.body as JsonRecord).previewRows ?? []) as JsonRecord[];
    assert.equal(wpPreviewRows.length, 1);
    assert.equal(wpPreviewRows[0].rowNumber, 2);
    assert.equal(wpPreviewRows[0].action, "created");
    assert.equal(wpPreviewRows[0].status, "valid");
    assert.equal(wpPreviewRows[0].entityLabel, wpImportName);

    const wpListAfterDryRun = await requestJson("/api/wajib-pajak");
    const wpItemsAfterDryRun = ((wpListAfterDryRun.body as JsonRecord).items ?? []) as JsonRecord[];
    assert.equal(
      wpItemsAfterDryRun.some((item) => item.displayName === wpImportName),
      false,
      "dry-run WP tidak boleh menyimpan record baru",
    );

    const createWpForOp = await jsonRequest("/api/wajib-pajak", "POST", {
      jenisWp: "orang_pribadi",
      peranWp: "pemilik",
      statusAktif: "active",
      namaWp: `IT Dry Run OP WP ${Date.now()}`,
      nikKtpWp: "1600000000000102",
      alamatWp: "Jl. Dry Run OP WP",
      kecamatanWp: "Muaradua",
      kelurahanWp: "Batu Belang Jaya",
      teleponWaWp: "081234567802",
      emailWp: null,
      badanUsaha: null,
    });
    assert.equal(createWpForOp.response.status, 201);
    wpIdForOp = requiredNumber((createWpForOp.body as JsonRecord).id, "wp dry-run op id wajib ada");

    const patchNpwpd = await jsonRequest(`/api/wajib-pajak/${wpIdForOp}`, "PATCH", {
      npwpd: semanticNpwpd,
    });
    assert.equal(patchNpwpd.response.status, 200);

    const rekeningBody = await requestJson("/api/master/rekening-pajak");
    const rekeningMakanan = ((rekeningBody.body as JsonRecord[]) ?? []).find(
      (item) => item.jenisPajak === "PBJT Makanan dan Minuman",
    );
    assert.ok(rekeningMakanan, "rekening PBJT Makanan dan Minuman wajib tersedia");

    const opImportName = `IT Dry Run OP ${Date.now()}`;
    const opCsv = stringify(
      [
        {
          npwpd: semanticNpwpd,
          no_rek_pajak: String(rekeningMakanan?.kodeRekening ?? ""),
          nama_op: opImportName,
          alamat_op: "Batu Belang Jaya",
          kecamatan_id: "1609040",
          kelurahan_id: "1609040001",
          status: "active",
        },
      ],
      {
        header: true,
      },
    );
    const opForm = new FormData();
    opForm.append("file", new Blob([opCsv], { type: "text/csv" }), "op-dry-run.csv");
    opForm.append("dryRun", "true");

    const opDryRun = await requestJson("/api/objek-pajak/import", {
      method: "POST",
      body: opForm,
    });
    assert.equal(opDryRun.response.status, 200);
    assert.equal((opDryRun.body as JsonRecord).dryRun, true);
    assert.equal((opDryRun.body as JsonRecord).created, 1);
    assert.equal((opDryRun.body as JsonRecord).updated, 0);
    assert.equal((opDryRun.body as JsonRecord).skipped, 0);
    assert.equal((opDryRun.body as JsonRecord).success, 1);
    assert.equal((opDryRun.body as JsonRecord).failed, 0);
    assert.ok((opDryRun.body as JsonRecord).previewSummary, "dry-run OP harus mengembalikan previewSummary");
    assert.equal((opDryRun.body as JsonRecord).previewSummary.validRows, 1);
    assert.equal((opDryRun.body as JsonRecord).previewSummary.invalidRows, 0);
    assert.equal((opDryRun.body as JsonRecord).previewSummary.createdRows, 1);
    assert.equal((opDryRun.body as JsonRecord).previewSummary.wpResolvedRows, 1);
    assert.equal((opDryRun.body as JsonRecord).previewSummary.wpUnresolvedRows, 0);
    assert.equal((opDryRun.body as JsonRecord).previewSummary.rekeningResolvedRows, 1);
    assert.equal((opDryRun.body as JsonRecord).previewSummary.rekeningUnresolvedRows, 0);
    assert.ok(Array.isArray((opDryRun.body as JsonRecord).previewRows), "dry-run OP harus mengembalikan previewRows");
    const opPreviewRows = ((opDryRun.body as JsonRecord).previewRows ?? []) as JsonRecord[];
    assert.equal(opPreviewRows.length, 1);
    assert.equal(opPreviewRows[0].rowNumber, 2);
    assert.equal(opPreviewRows[0].action, "created");
    assert.equal(opPreviewRows[0].status, "valid");
    assert.equal(opPreviewRows[0].entityLabel, opImportName);
    assert.ok(opPreviewRows[0].resolutionStatus && typeof opPreviewRows[0].resolutionStatus === "object");
    assert.equal((opPreviewRows[0].resolutionStatus as JsonRecord).wpResolved, true);
    assert.equal((opPreviewRows[0].resolutionStatus as JsonRecord).rekeningResolved, true);
    assert.ok(Array.isArray(opPreviewRows[0].resolutionSteps));
    assert.ok(
      ((opPreviewRows[0].resolutionSteps as unknown[]) ?? []).some(
        (step) => typeof step === "string" && step.includes("NPWPD"),
      ),
      "preview OP harus menampilkan hasil resolusi NPWPD",
    );
    assert.ok(
      ((opPreviewRows[0].resolutionSteps as unknown[]) ?? []).some(
        (step) => typeof step === "string" && step.includes("rekening"),
      ),
      "preview OP harus menampilkan hasil resolusi rekening",
    );

    const opListAfterDryRun = await requestJson("/api/objek-pajak?includeUnverified=true");
    const opItemsAfterDryRun = ((opListAfterDryRun.body as JsonRecord).items ?? []) as JsonRecord[];
    assert.equal(
      opItemsAfterDryRun.some((item) => item.namaOp === opImportName),
      false,
      "dry-run OP tidak boleh menyimpan record baru",
    );

    const invalidOpCsv = stringify(
      [
        {
          npwpd: semanticNpwpd,
          no_rek_pajak: "",
          nama_op: "IT Dry Run OP Invalid",
          alamat_op: "Batu Belang Jaya",
          kecamatan_id: "1609040",
          kelurahan_id: "1609040001",
          status: "active",
        },
      ],
      {
        header: true,
      },
    );
    const invalidOpForm = new FormData();
    invalidOpForm.append("file", new Blob([invalidOpCsv], { type: "text/csv" }), "op-dry-run-invalid.csv");
    invalidOpForm.append("dryRun", "true");

    const invalidOpDryRun = await requestJson("/api/objek-pajak/import", {
      method: "POST",
      body: invalidOpForm,
    });
    assert.equal(invalidOpDryRun.response.status, 200);
    assert.equal((invalidOpDryRun.body as JsonRecord).dryRun, true);
    assert.equal((invalidOpDryRun.body as JsonRecord).created, 0);
    assert.equal((invalidOpDryRun.body as JsonRecord).updated, 0);
    assert.equal((invalidOpDryRun.body as JsonRecord).skipped, 0);
    assert.equal((invalidOpDryRun.body as JsonRecord).success, 0);
    assert.equal((invalidOpDryRun.body as JsonRecord).failed, 1);
    assert.ok((invalidOpDryRun.body as JsonRecord).previewSummary, "dry-run OP invalid harus tetap mengembalikan previewSummary");
    assert.equal((invalidOpDryRun.body as JsonRecord).previewSummary.validRows, 0);
    assert.equal((invalidOpDryRun.body as JsonRecord).previewSummary.invalidRows, 1);
    assert.equal((invalidOpDryRun.body as JsonRecord).previewSummary.failedRows, 1);
    assert.equal((invalidOpDryRun.body as JsonRecord).previewSummary.wpResolvedRows, 1);
    assert.equal((invalidOpDryRun.body as JsonRecord).previewSummary.rekeningResolvedRows, 0);
    assert.equal((invalidOpDryRun.body as JsonRecord).previewSummary.rekeningUnresolvedRows, 1);
    const invalidOpPreviewRows = ((invalidOpDryRun.body as JsonRecord).previewRows ?? []) as JsonRecord[];
    assert.equal(invalidOpPreviewRows.length, 1);
    assert.equal(invalidOpPreviewRows[0].action, "failed");
    assert.equal(invalidOpPreviewRows[0].status, "invalid");
    assert.equal(invalidOpPreviewRows[0].entityLabel, "IT Dry Run OP Invalid");
    assert.ok(invalidOpPreviewRows[0].resolutionStatus && typeof invalidOpPreviewRows[0].resolutionStatus === "object");
    assert.equal((invalidOpPreviewRows[0].resolutionStatus as JsonRecord).wpResolved, true);
    assert.equal((invalidOpPreviewRows[0].resolutionStatus as JsonRecord).rekeningResolved, false);
    assert.ok(invalidOpPreviewRows[0].sourceRow && typeof invalidOpPreviewRows[0].sourceRow === "object");
    assert.equal((invalidOpPreviewRows[0].sourceRow as JsonRecord).nama_op, "IT Dry Run OP Invalid");
    assert.equal((invalidOpPreviewRows[0].sourceRow as JsonRecord).npwpd, semanticNpwpd);
    assert.equal((invalidOpPreviewRows[0].sourceRow as JsonRecord).no_rek_pajak, "");
  } finally {
    if (wpIdForOp !== null) {
      await jsonRequest(`/api/wajib-pajak/${wpIdForOp}`, "DELETE");
    }
    await server.close();
  }
}

run()
  .then(() => {
    console.log("[integration] Data Tools dry-run import: PASS");
  })
  .catch((error) => {
    console.error("[integration] Data Tools dry-run import: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
