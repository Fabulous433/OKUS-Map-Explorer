import assert from "node:assert/strict";
import { ZodError } from "zod";

async function loadRoutesModule() {
  try {
    return await import("../../server/routes");
  } catch {
    return null;
  }
}

async function run() {
  const routesModule = await loadRoutesModule();
  assert.ok(routesModule, "routes module harus tersedia untuk normalisasi error boundary editor");

  const { normalizeBoundaryDraftMutationError } = routesModule as {
    normalizeBoundaryDraftMutationError?: (error: unknown, fallbackMessage: string) => {
      status: number;
      message: string;
    };
  };

  assert.equal(
    typeof normalizeBoundaryDraftMutationError,
    "function",
    "normalizer error boundary editor wajib diexport",
  );

  const normalizedTinyFragment = normalizeBoundaryDraftMutationError!(
    new ZodError([
      {
        code: "too_small",
        minimum: 0,
        type: "number",
        inclusive: false,
        exact: false,
        message: "Number must be greater than 0",
        path: ["fragments", 4, "areaSqM"],
      },
    ]),
    "Gagal menyimpan draft boundary",
  );

  assert.equal(normalizedTinyFragment.status, 400);
  assert.equal(
    normalizedTinyFragment.message,
    "Hasil edit menghasilkan fragmen sangat kecil. Rapikan vertex atau reset draft desa ini, lalu simpan ulang.",
    "error areaSqM nol harus diterjemahkan menjadi pesan yang bisa dipahami admin",
  );

  const normalizedGeneric = normalizeBoundaryDraftMutationError!(
    new Error("Revision boundary belum topology-ready untuk publish"),
    "Gagal menyimpan draft boundary",
  );
  assert.equal(
    normalizedGeneric.message,
    "Revision boundary belum topology-ready untuk publish",
    "error non-zod tidak boleh diubah secara agresif",
  );
}

run()
  .then(() => {
    console.log("[integration] boundary-editor-error-normalization: PASS");
  })
  .catch((error) => {
    console.error("[integration] boundary-editor-error-normalization: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
