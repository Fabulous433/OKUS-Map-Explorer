import assert from "node:assert/strict";

import { createIntegrationServer } from "./_helpers";

async function run() {
  const server = await createIntegrationServer();
  const { requestJson, close } = server;

  try {
    const publicHealth = await requestJson("/health");
    assert.equal(publicHealth.response.status, 200);
    assert.equal(typeof publicHealth.body, "object");
    assert.equal((publicHealth.body as { status?: string }).status, "healthy");
    assert.equal((publicHealth.body as { database?: string }).database, "up");

    const apiHealth = await requestJson("/api/health");
    assert.equal(apiHealth.response.status, 200);
    assert.equal(typeof apiHealth.body, "object");
    assert.equal((apiHealth.body as { status?: string }).status, "healthy");
    assert.equal((apiHealth.body as { service?: string }).service, "okus-map-explorer");
  } finally {
    await close();
  }
}

run()
  .then(() => {
    console.log("[integration] health endpoint: PASS");
  })
  .catch((error) => {
    console.error("[integration] health endpoint: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
