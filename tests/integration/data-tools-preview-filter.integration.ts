import assert from "node:assert/strict";

async function loadModule() {
  try {
    return await import("../../client/src/pages/backoffice/data-tools-preview-filter.ts");
  } catch {
    return null;
  }
}

async function run() {
  const module = await loadModule();
  assert.ok(module, "helper filter preview Data Tools harus tersedia");

  const { getPreviewFilterOptions, filterPreviewRows } = module;
  assert.equal(typeof getPreviewFilterOptions, "function", "builder filter options wajib diexport");
  assert.equal(typeof filterPreviewRows, "function", "filter rows wajib diexport");

  const opRows = [
    {
      rowNumber: 2,
      action: "updated",
      status: "valid",
      entityLabel: "Row Valid",
      messages: [],
      warnings: [],
      resolutionSteps: [],
      sourceRow: {},
      resolutionStatus: {
        wpResolved: true,
        rekeningResolved: true,
      },
    },
    {
      rowNumber: 3,
      action: "failed",
      status: "invalid",
      entityLabel: "Row Invalid Relation",
      messages: ["rekening gagal"],
      warnings: ["rekening belum match"],
      resolutionSteps: [],
      sourceRow: {},
      resolutionStatus: {
        wpResolved: true,
        rekeningResolved: false,
      },
    },
  ];

  const opFilters = getPreviewFilterOptions("objek-pajak", opRows);
  assert.deepEqual(
    opFilters.map((item: { key: string }) => item.key),
    ["all", "updated", "failed", "warning", "resolution-failed"],
    "filter OP harus menyediakan tab action, warning, dan resolusi gagal",
  );
  assert.equal(filterPreviewRows("objek-pajak", opRows, "all").length, 2);
  assert.equal(filterPreviewRows("objek-pajak", opRows, "updated").length, 1);
  assert.equal(filterPreviewRows("objek-pajak", opRows, "failed").length, 1);
  assert.equal(filterPreviewRows("objek-pajak", opRows, "warning").length, 1);
  assert.equal(filterPreviewRows("objek-pajak", opRows, "resolution-failed").length, 1);

  const wpRows = [
    {
      rowNumber: 2,
      action: "created",
      status: "valid",
      entityLabel: "WP Valid",
      messages: [],
      warnings: [],
      resolutionSteps: [],
      sourceRow: {},
      resolutionStatus: null,
    },
    {
      rowNumber: 3,
      action: "failed",
      status: "invalid",
      entityLabel: "WP Invalid",
      messages: ["field wajib kosong"],
      warnings: [],
      resolutionSteps: [],
      sourceRow: {},
      resolutionStatus: null,
    },
  ];

  const wpFilters = getPreviewFilterOptions("wajib-pajak", wpRows);
  assert.deepEqual(
    wpFilters.map((item: { key: string }) => item.key),
    ["all", "created", "failed"],
    "filter WP fokus ke action row",
  );
  assert.equal(filterPreviewRows("wajib-pajak", wpRows, "created").length, 1);
  assert.equal(filterPreviewRows("wajib-pajak", wpRows, "failed").length, 1);
}

run()
  .then(() => {
    console.log("[integration] Data Tools preview filter helper: PASS");
  })
  .catch((error) => {
    console.error("[integration] Data Tools preview filter helper: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
