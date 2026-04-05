import assert from "node:assert/strict";

async function loadModule() {
  try {
    return await import("../../client/src/pages/backoffice/data-tools-history.ts");
  } catch {
    return null;
  }
}

async function run() {
  const module = await loadModule();
  assert.ok(module, "helper history Data Tools harus tersedia");

  const {
    appendImportHistoryEntry,
    clearDataToolsImportHistory,
    loadDataToolsImportHistory,
    normalizeImportHistoryEntries,
    removeDataToolsImportHistoryEntry,
    removeImportHistoryEntry,
    togglePinnedDataToolsImportHistoryEntry,
    togglePinnedImportHistoryEntry,
  } = module;
  assert.equal(typeof appendImportHistoryEntry, "function", "append history wajib diexport");
  assert.equal(typeof clearDataToolsImportHistory, "function", "clear history wajib diexport");
  assert.equal(typeof loadDataToolsImportHistory, "function", "loader history wajib diexport");
  assert.equal(typeof normalizeImportHistoryEntries, "function", "normalizer history wajib diexport");
  assert.equal(typeof removeDataToolsImportHistoryEntry, "function", "remove history storage wajib diexport");
  assert.equal(typeof removeImportHistoryEntry, "function", "remove history helper wajib diexport");
  assert.equal(typeof togglePinnedDataToolsImportHistoryEntry, "function", "toggle pin storage wajib diexport");
  assert.equal(typeof togglePinnedImportHistoryEntry, "function", "toggle pin helper wajib diexport");

  const storage = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem(key: string) {
        return storage.has(key) ? storage.get(key)! : null;
      },
      setItem(key: string, value: string) {
        storage.set(key, value);
      },
      removeItem(key: string) {
        storage.delete(key);
      },
    },
  });

  const baseEntries = Array.from({ length: 12 }, (_, index) => ({
    id: `entry-${index}`,
    entity: index % 2 === 0 ? "wajib-pajak" : "objek-pajak",
    mode: index % 3 === 0 ? "preview" : "import",
    pinned: index === 4,
    total: 10,
    created: index % 2 === 0 ? 1 : 0,
    updated: index % 2 === 1 ? 1 : 0,
    skipped: 0,
    success: 8,
    failed: 2,
    warnings: index % 2 === 0 ? ["warning sample"] : [],
    createdAt: `2026-04-02T10:${String(index).padStart(2, "0")}:00.000Z`,
    errors: [`baris ${index} gagal`],
    previewSummary: { validRows: 8, invalidRows: 2 },
    previewRows: [
      {
        rowNumber: index + 1,
        action: index % 2 === 0 ? "updated" : "failed",
        status: index % 2 === 0 ? "valid" : "invalid",
        entityLabel: "Sample Row",
        messages: index % 2 === 0 ? [] : [`error ${index}`],
        warnings: index % 2 === 0 ? ["warning row"] : [],
        resolutionSteps: ["NPWPD OK"],
        resolutionStatus: { wpResolved: true, rekeningResolved: null },
      },
    ],
  }));

  const next = appendImportHistoryEntry(baseEntries, {
    id: "latest",
    entity: "objek-pajak",
    mode: "preview",
    pinned: false,
    total: 5,
    created: 1,
    updated: 0,
    skipped: 0,
    success: 4,
    failed: 1,
    warnings: ["baris terbaru warning"],
    createdAt: "2026-04-02T12:00:00.000Z",
    errors: ["baris terbaru gagal"],
    previewSummary: { validRows: 4, invalidRows: 1 },
    previewRows: [
      {
        rowNumber: 99,
        action: "failed",
        status: "invalid",
        entityLabel: "Restoran ABC",
        messages: ["rekening gagal resolve"],
        warnings: ["rekening warning"],
        resolutionSteps: ["NPWPD OK", "REKENING GAGAL"],
        resolutionStatus: { wpResolved: true, rekeningResolved: false },
      },
    ],
  });

  assert.equal(next.length, 10, "history hanya menyimpan 10 run terakhir");
  assert.equal(next[0].id, "entry-4", "run pinned harus naik ke urutan pertama");
  assert.equal(next[1].id, "latest", "run terbaru non-pinned harus mengikuti setelah pinned");
  assert.equal(next[1].entity, "objek-pajak");
  assert.equal(next[1].mode, "preview");
  assert.equal(next[9].id, "entry-3", "entry paling lama non-pinned harus terpangkas");

  const normalized = normalizeImportHistoryEntries([
    ...next,
    { id: 123, entity: "invalid", createdAt: null },
  ]);
  assert.equal(normalized.length, 10, "normalizer harus membuang entry invalid");
  assert.equal(normalized[0].id, "entry-4");
  assert.equal(normalized[1].id, "latest");
  assert.equal(normalized[1].previewRows[0]?.entityLabel, "Restoran ABC");
  assert.equal(normalized[1].previewRows[0]?.action, "failed");
  assert.equal(normalized[1].errors[0], "baris terbaru gagal");
  assert.equal(normalized[1].warnings[0], "baris terbaru warning");

  const toggled = togglePinnedImportHistoryEntry(normalized, "latest");
  assert.equal(toggled[0].id, "latest", "run yang dipin harus pindah ke paling atas");
  assert.equal(toggled[0].pinned, true);

  const removed = removeImportHistoryEntry(toggled, "latest");
  assert.equal(removed.some((entry) => entry.id === "latest"), false, "run yang dihapus harus hilang dari helper");
  assert.equal(removed[0].id, "entry-4", "urutan pinned lain harus tetap stabil setelah delete");

  storage.set("okus-data-tools-import-history", JSON.stringify(normalized));
  const persistedPinned = togglePinnedDataToolsImportHistoryEntry("latest");
  assert.equal(persistedPinned[0].id, "latest");
  assert.equal(loadDataToolsImportHistory()[0].id, "latest");

  const persistedRemoved = removeDataToolsImportHistoryEntry("latest");
  assert.equal(persistedRemoved.some((entry) => entry.id === "latest"), false);
  assert.equal(loadDataToolsImportHistory().some((entry) => entry.id === "latest"), false);

  clearDataToolsImportHistory();
  assert.equal(loadDataToolsImportHistory().length, 0, "clear history harus mengosongkan storage");
}

run()
  .then(() => {
    console.log("[integration] Data Tools history helper: PASS");
  })
  .catch((error) => {
    console.error("[integration] Data Tools history helper: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
