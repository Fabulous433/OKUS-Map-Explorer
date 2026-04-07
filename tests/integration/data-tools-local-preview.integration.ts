import assert from "node:assert/strict";
import { buildExcelBlob } from "./_excel";

async function loadModule() {
  try {
    return await import("../../client/src/pages/backoffice/data-tools-local-preview.ts");
  } catch {
    return null;
  }
}

async function run() {
  const module = await loadModule();
  assert.ok(module, "helper local preview Data Tools harus tersedia");

  const { buildLocalSpreadsheetPreview } = module;
  assert.equal(typeof buildLocalSpreadsheetPreview, "function", "builder local preview wajib diexport");

  const file = new File(
    [
      buildExcelBlob([
        {
          jenis_wp: "orang_pribadi",
          peran_wp: "pemilik",
          npwpd: "P001",
          alamat_subjek: "JL. RANAU, DESA BATU BELANG",
        },
        {
          jenis_wp: "orang_pribadi",
          peran_wp: "pemilik",
          npwpd: "P002",
          alamat_subjek: "JL. TANPA KOMA",
        },
      ]),
    ],
    "sample.xlsx",
    { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  );

  const preview = await buildLocalSpreadsheetPreview("wajib-pajak", file);

  assert.equal(preview.entity, "wajib-pajak");
  assert.equal(preview.fileName, "sample.xlsx");
  assert.deepEqual(preview.columns, ["jenis_wp", "peran_wp", "npwpd", "alamat_subjek"]);
  assert.equal(preview.totalRows, 2);
  assert.equal(preview.rows[0]?.npwpd, "P001");
  assert.equal(preview.rows[0]?.alamat_subjek, "JL. RANAU, DESA BATU BELANG");
  assert.equal(preview.rows[1]?.alamat_subjek, "JL. TANPA KOMA");
}

run()
  .then(() => {
    console.log("[integration] Data Tools local preview helper: PASS");
  })
  .catch((error) => {
    console.error("[integration] Data Tools local preview helper: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
