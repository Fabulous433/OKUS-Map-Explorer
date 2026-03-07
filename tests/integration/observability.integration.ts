import assert from "node:assert/strict";

import { createIntegrationServer } from "./_helpers";

async function run() {
  const server = await createIntegrationServer();
  const { requestJson, close } = server;

  try {
    const customRequestId = `it-observability-${Date.now()}`;
    const withCustomHeader = await requestJson("/api/objek-pajak?limit=1", {
      headers: {
        "x-request-id": customRequestId,
      },
    });
    assert.equal(withCustomHeader.response.status, 200);
    assert.equal(
      withCustomHeader.response.headers.get("x-request-id"),
      customRequestId,
      "Response harus echo request id dari header",
    );

    const generatedRequestId = await requestJson("/api/objek-pajak?limit=1");
    assert.equal(generatedRequestId.response.status, 200);
    const requestIdFromResponse = generatedRequestId.response.headers.get("x-request-id");
    assert.equal(typeof requestIdFromResponse, "string");
    assert.ok(requestIdFromResponse && requestIdFromResponse.trim().length > 0, "Response harus berisi request id");
  } finally {
    await close();
  }
}

run()
  .then(() => {
    console.log("[integration] observability request-id header: PASS");
  })
  .catch((error) => {
    console.error("[integration] observability request-id header: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
