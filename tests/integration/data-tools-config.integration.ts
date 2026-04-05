import assert from "node:assert/strict";

async function loadDataToolsConfigModule() {
  try {
    return await import("../../client/src/pages/backoffice/data-tools-config.ts");
  } catch {
    return null;
  }
}

async function run() {
  const configModule = await loadDataToolsConfigModule();
  assert.ok(configModule, "config Data Tools harus tersedia");

  const { DATA_TOOLS_ENTITY_CONFIG } = configModule;
  assert.ok(Array.isArray(DATA_TOOLS_ENTITY_CONFIG), "entity config Data Tools harus berupa array");
  assert.equal(DATA_TOOLS_ENTITY_CONFIG.length, 2, "harus tetap ada dua lane utama: WP dan OP");

  const wpConfig = DATA_TOOLS_ENTITY_CONFIG.find((item: { entity: string }) => item.entity === "wajib-pajak");
  const opConfig = DATA_TOOLS_ENTITY_CONFIG.find((item: { entity: string }) => item.entity === "objek-pajak");

  assert.ok(wpConfig, "config WP harus tersedia");
  assert.ok(opConfig, "config OP harus tersedia");

  assert.equal(wpConfig.groups[0].title, "Format Internal");
  assert.equal(wpConfig.groups[1].title, "Adaptasi SIMPATDA");
  assert.equal(opConfig.groups[0].title, "Format Internal");
  assert.equal(opConfig.groups[1].title, "Adaptasi SIMPATDA");
  assert.ok(
    wpConfig.groups[0].actions.some(
      (action: { label: string; kind: string }) => action.label === "Pilih File CSV" && action.kind === "import",
    ),
    "lane internal WP harus mulai dari pilih file CSV",
  );
  assert.ok(
    opConfig.groups[0].actions.some(
      (action: { label: string; kind: string }) => action.label === "Pilih File CSV" && action.kind === "import",
    ),
    "lane internal OP harus mulai dari pilih file CSV",
  );

  assert.equal(wpConfig.sampleHref, "/api/data-tools/samples/wp");
  assert.equal(opConfig.sampleHref, "/api/data-tools/samples/op-pbjt-makanan");
  assert.ok(
    wpConfig.groups[1].actions.some((action: { label: string }) => action.label === "Download Sample SIMPATDA"),
    "lane sample WP harus tetap menyediakan download sample",
  );
  assert.ok(
    opConfig.groups[1].actions.some((action: { label: string }) => action.label === "Download Sample SIMPATDA PBJT"),
    "lane sample OP harus tetap menyediakan download sample",
  );
}

run()
  .then(() => {
    console.log("[integration] Data Tools config: PASS");
  })
  .catch((error) => {
    console.error("[integration] Data Tools config: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
