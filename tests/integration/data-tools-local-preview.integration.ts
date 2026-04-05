import assert from "node:assert/strict";

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

  const { buildLocalCsvPreview } = module;
  assert.equal(typeof buildLocalCsvPreview, "function", "builder local preview wajib diexport");

  const file = new File(
    [
      "jenis_wp,peran_wp,npwpd,alamat_subjek\norang_pribadi,pemilik,P001,\"JL. RANAU, DESA BATU BELANG\"\norang_pribadi,pemilik,P002,JL. TANPA KOMA",
    ],
    "sample.csv",
    { type: "text/csv" },
  );

  const preview = buildLocalCsvPreview(
    "wajib-pajak",
    file,
    "jenis_wp,peran_wp,npwpd,alamat_subjek\norang_pribadi,pemilik,P001,\"JL. RANAU, DESA BATU BELANG\"\norang_pribadi,pemilik,P002,JL. TANPA KOMA",
  );

  assert.equal(preview.entity, "wajib-pajak");
  assert.equal(preview.fileName, "sample.csv");
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
