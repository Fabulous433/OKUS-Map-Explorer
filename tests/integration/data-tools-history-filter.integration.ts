import assert from "node:assert/strict";

async function loadModule() {
  try {
    return await import("../../client/src/pages/backoffice/data-tools-history-filter.ts");
  } catch {
    return null;
  }
}

async function run() {
  const module = await loadModule();
  assert.ok(module, "helper filter history Data Tools harus tersedia");

  const {
    filterImportHistoryEntries,
    getHistorySearchSummary,
    getHistoryEntityFilterOptions,
    getHistoryModeFilterOptions,
    hasHistorySearchTerm,
  } = module;

  assert.equal(typeof filterImportHistoryEntries, "function", "filter history wajib diexport");
  assert.equal(typeof getHistorySearchSummary, "function", "summary search history wajib diexport");
  assert.equal(typeof getHistoryEntityFilterOptions, "function", "opsi filter entity wajib diexport");
  assert.equal(typeof getHistoryModeFilterOptions, "function", "opsi filter mode wajib diexport");
  assert.equal(typeof hasHistorySearchTerm, "function", "deteksi search history wajib diexport");

  const entries = [
    {
      id: "a",
      entity: "wajib-pajak",
      mode: "preview",
      pinned: true,
      total: 10,
      success: 8,
      failed: 2,
      createdAt: "2026-04-02T10:00:00.000Z",
      errors: [],
      previewSummary: {},
      previewRows: [],
    },
    {
      id: "b",
      entity: "objek-pajak",
      mode: "import",
      pinned: false,
      total: 5,
      success: 5,
      failed: 0,
      createdAt: "2026-04-02T11:00:00.000Z",
      errors: [],
      previewSummary: {},
      previewRows: [],
    },
    {
      id: "c",
      entity: "objek-pajak",
      mode: "preview",
      pinned: false,
      total: 7,
      success: 6,
      failed: 1,
      createdAt: "2026-04-02T12:00:00.000Z",
      errors: [],
      previewSummary: {},
      previewRows: [],
    },
  ];

  const opPreviewOnly = filterImportHistoryEntries(entries, "objek-pajak", "preview");
  assert.equal(opPreviewOnly.length, 1);
  assert.equal(opPreviewOnly[0].id, "c");

  const keywordPinned = filterImportHistoryEntries(entries, "all", "all", "pinned");
  assert.equal(keywordPinned.length, 1);
  assert.equal(keywordPinned[0].id, "a");

  const keywordEntity = filterImportHistoryEntries(entries, "all", "all", "objek pajak");
  assert.equal(keywordEntity.length, 2);

  const keywordError = filterImportHistoryEntries(
    [
      {
        ...entries[2],
        errors: ["rekening gagal resolve"],
      },
    ],
    "all",
    "all",
    "rekening",
  );
  assert.equal(keywordError.length, 1);

  const entityOptions = getHistoryEntityFilterOptions(entries);
  assert.deepEqual(entityOptions, [
    { key: "all", label: "Semua (3)" },
    { key: "wajib-pajak", label: "WP (1)" },
    { key: "objek-pajak", label: "OP (2)" },
  ]);

  const modeOptions = getHistoryModeFilterOptions(entries);
  assert.deepEqual(modeOptions, [
    { key: "all", label: "Semua (3)" },
    { key: "preview", label: "Preview (2)" },
    { key: "import", label: "Import (1)" },
  ]);

  assert.equal(hasHistorySearchTerm("   "), false);
  assert.equal(hasHistorySearchTerm("preview"), true);
  assert.equal(getHistorySearchSummary("  preview  "), 'Keyword: "preview"');
  assert.equal(getHistorySearchSummary(""), "");
}

run()
  .then(() => {
    console.log("[integration] Data Tools history filter helper: PASS");
  })
  .catch((error) => {
    console.error("[integration] Data Tools history filter helper: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
