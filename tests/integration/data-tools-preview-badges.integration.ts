import assert from "node:assert/strict";

async function loadModule() {
  try {
    return await import("../../client/src/pages/backoffice/data-tools-preview-badges.ts");
  } catch {
    return null;
  }
}

async function run() {
  const module = await loadModule();
  assert.ok(module, "helper badge preview Data Tools harus tersedia");

  const { buildPreviewRowBadges } = module;
  assert.equal(typeof buildPreviewRowBadges, "function", "builder badge preview wajib diexport");

  const wpBadges = buildPreviewRowBadges("wajib-pajak", {
    action: "created",
    status: "valid",
    warnings: ["npwpd belum disimpan historis"],
    resolutionSteps: ["header compact -> dipetakan ke subjek tunggal"],
    resolutionStatus: null,
  });
  assert.ok(
    wpBadges.some((badge: { label: string }) => badge.label === "HEADER COMPACT"),
    "WP compact harus punya badge header compact",
  );
  assert.ok(
    wpBadges.some((badge: { label: string }) => badge.label === "CREATED"),
    "baris created harus punya badge created",
  );
  assert.ok(
    wpBadges.some((badge: { label: string }) => badge.label === "ADA WARNING"),
    "baris dengan warning harus punya badge warning",
  );

  const opBadges = buildPreviewRowBadges("objek-pajak", {
    action: "failed",
    status: "invalid",
    warnings: [],
    resolutionSteps: ["NPWPD P001 -> WP #1", "rekening tidak diisi; backend mengharapkan rek_pajak_id, no_rek_pajak, atau nama_rek_pajak"],
    resolutionStatus: {
      wpResolved: true,
      rekeningResolved: false,
    },
  });
  assert.ok(
    opBadges.some((badge: { label: string }) => badge.label === "NPWPD OK"),
    "OP harus punya badge NPWPD OK saat wpResolved=true",
  );
  assert.ok(
    opBadges.some((badge: { label: string }) => badge.label === "REKENING GAGAL"),
    "OP harus punya badge rekening gagal saat rekeningResolved=false",
  );
  assert.ok(
    opBadges.some((badge: { label: string }) => badge.label === "FAILED"),
    "baris failed harus punya badge failed",
  );
}

run()
  .then(() => {
    console.log("[integration] Data Tools preview badges helper: PASS");
  })
  .catch((error) => {
    console.error("[integration] Data Tools preview badges helper: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
