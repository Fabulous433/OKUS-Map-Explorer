import assert from "node:assert/strict";

async function loadModule() {
  try {
    return await import("../../client/src/pages/backoffice/data-tools-error-export.ts");
  } catch {
    return null;
  }
}

async function run() {
  const module = await loadModule();
  assert.ok(module, "helper export error Data Tools harus tersedia");

  const {
    buildImportErrorCsv,
    buildImportErrorFileName,
    buildCorrectionTemplateCsv,
    buildCorrectionTemplateFileName,
    buildImportAuditCsv,
    buildImportAuditFileName,
  } = module;
  assert.equal(typeof buildImportErrorCsv, "function", "builder CSV error wajib diexport");
  assert.equal(typeof buildImportErrorFileName, "function", "builder nama file error wajib diexport");
  assert.equal(typeof buildCorrectionTemplateCsv, "function", "builder CSV koreksi wajib diexport");
  assert.equal(typeof buildCorrectionTemplateFileName, "function", "builder nama file koreksi wajib diexport");
  assert.equal(typeof buildImportAuditCsv, "function", "builder CSV report audit wajib diexport");
  assert.equal(typeof buildImportAuditFileName, "function", "builder nama file report audit wajib diexport");

  const csv = buildImportErrorCsv([
    "Baris 2: NPWPD tidak ditemukan pada data wajib pajak",
    "Baris 7: Format NOPD salah, mohon diperiksa kembali",
    "Header file tidak valid",
  ]);

  assert.match(csv, /baris,pesan/i);
  assert.match(csv, /2,NPWPD tidak ditemukan pada data wajib pajak/i);
  assert.match(csv, /7,"?Format NOPD salah, mohon diperiksa kembali"?/i);
  assert.match(csv, /,Header file tidak valid/i);

  assert.equal(
    buildImportErrorFileName("wajib-pajak", "preview"),
    "wajib_pajak_preview_errors.csv",
    "nama file error preview WP harus stabil",
  );
  assert.equal(
    buildImportErrorFileName("objek-pajak", "import"),
    "objek_pajak_import_errors.csv",
    "nama file error import OP harus stabil",
  );

  const correctionCsv = buildCorrectionTemplateCsv([
    {
      rowNumber: 7,
      messages: ["Format NOPD salah, mohon diperiksa kembali"],
      sourceRow: {
        npwpd: "P10100894001",
        nopd: "07.02.01.0008",
        no_rek_pajak: "",
        nama_op: "LESEHAN PAWON JOGJA",
      },
    },
  ]);
  assert.match(correctionCsv, /error_baris,error_pesan,npwpd,nopd,no_rek_pajak,nama_op/i);
  assert.match(correctionCsv, /7,"?Format NOPD salah, mohon diperiksa kembali"?/i);
  assert.match(correctionCsv, /=""?P10100894001""?/i);
  assert.match(correctionCsv, /=""?07\.02\.01\.0008""?/i);
  assert.match(correctionCsv, /LESEHAN PAWON JOGJA/i);

  assert.equal(
    buildCorrectionTemplateFileName("objek-pajak", "preview"),
    "objek_pajak_preview_corrections.csv",
    "nama file template koreksi preview OP harus stabil",
  );

  const auditCsv = buildImportAuditCsv([
    {
      rowNumber: 2,
      action: "updated",
      status: "valid",
      entityLabel: "Restoran ABC",
      warnings: ["NPWPD cocok ke WP existing"],
      messages: [],
      resolutionSteps: ["NPWPD P001 -> WP #7", "kode rekening 4.1.01.19.01.0001 -> rekening #5"],
      sourceRow: {
        npwpd: "P001",
        no_rek_pajak: "4.1.01.19.01.0001",
        nama_op: "Restoran ABC",
      },
    },
    {
      rowNumber: 3,
      action: "failed",
      status: "invalid",
      entityLabel: "Restoran XYZ",
      warnings: [],
      messages: ["NOPD mengarah ke OP existing yang berbeda"],
      resolutionSteps: ["NPWPD P002 -> WP #8"],
      sourceRow: {
        npwpd: "P002",
        nopd: "07.02.01.0008",
        nama_op: "Restoran XYZ",
      },
    },
  ]);
  assert.match(auditCsv, /row_number,action,status,entity_label,warnings,messages,resolution_steps,npwpd,no_rek_pajak,nama_op,nopd/i);
  assert.match(auditCsv, /2,updated,valid,Restoran ABC/i);
  assert.match(auditCsv, /NPWPD cocok ke WP existing/i);
  assert.match(auditCsv, /3,failed,invalid,Restoran XYZ/i);
  assert.match(auditCsv, /NOPD mengarah ke OP existing yang berbeda/i);
  assert.match(auditCsv, /=""?07\.02\.01\.0008""?/i);

  assert.equal(
    buildImportAuditFileName("objek-pajak", "import"),
    "objek_pajak_import_report.csv",
    "nama file report audit import OP harus stabil",
  );
}

run()
  .then(() => {
    console.log("[integration] Data Tools error export helper: PASS");
  })
  .catch((error) => {
    console.error("[integration] Data Tools error export helper: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
