import assert from "node:assert/strict";

async function loadModule() {
  try {
    return await import("../../client/src/pages/backoffice/data-tools-excel-safe.ts");
  } catch {
    return null;
  }
}

async function run() {
  const module = await loadModule();
  assert.ok(module, "helper excel-safe Data Tools harus tersedia");

  const { toExcelSafeCell, shouldForceExcelText } = module;
  assert.equal(typeof toExcelSafeCell, "function", "formatter excel-safe wajib diexport");
  assert.equal(typeof shouldForceExcelText, "function", "detector excel-safe wajib diexport");

  assert.equal(shouldForceExcelText("npwpd"), true);
  assert.equal(shouldForceExcelText("nik_subjek"), true);
  assert.equal(shouldForceExcelText("nopd"), true);
  assert.equal(shouldForceExcelText("no_rek_pajak"), true);
  assert.equal(shouldForceExcelText("nama_op"), false);

  assert.equal(toExcelSafeCell("npwpd", "001234567890"), '="001234567890"');
  assert.equal(toExcelSafeCell("nopd", "07.02.01.0008"), '="07.02.01.0008"');
  assert.equal(toExcelSafeCell("no_rek_pajak", "4.1.01.19.01.0001"), '="4.1.01.19.01.0001"');
  assert.equal(toExcelSafeCell("nama_op", "LESEHAN PAWON JOGJA"), "LESEHAN PAWON JOGJA");
  assert.equal(toExcelSafeCell("npwpd", ""), "");
}

run()
  .then(() => {
    console.log("[integration] Data Tools excel-safe helper: PASS");
  })
  .catch((error) => {
    console.error("[integration] Data Tools excel-safe helper: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
