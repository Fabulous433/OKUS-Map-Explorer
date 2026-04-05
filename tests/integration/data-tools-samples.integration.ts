import assert from "node:assert/strict";

import { createIntegrationServer } from "./_helpers";

async function run() {
  const server = await createIntegrationServer();
  const { loginAs, requestText } = server;

  try {
    const loginResult = await loginAs("admin", "admin123");
    assert.equal(loginResult.response.status, 200);

    const wpSample = await requestText("/api/data-tools/samples/wp");
    assert.equal(wpSample.response.status, 200);
    assert.match(wpSample.response.headers.get("content-type") ?? "", /text\/csv/i);
    assert.match(
      wpSample.response.headers.get("content-disposition") ?? "",
      /simpatda-wp-import-sample\.csv/i,
    );
    assert.ok(wpSample.body.includes("jenis_wp,peran_wp,npwpd,status_aktif"));

    const opSample = await requestText("/api/data-tools/samples/op-pbjt-makanan");
    assert.equal(opSample.response.status, 200);
    assert.match(opSample.response.headers.get("content-type") ?? "", /text\/csv/i);
    assert.match(
      opSample.response.headers.get("content-disposition") ?? "",
      /simpatda-op-pbjt-makanan-import-sample\.csv/i,
    );
    assert.ok(opSample.body.includes("npwpd,no_rek_pajak,nama_op,alamat_op"));
  } finally {
    await server.close();
  }
}

run()
  .then(() => {
    console.log("[integration] Data Tools sample downloads: PASS");
  })
  .catch((error) => {
    console.error("[integration] Data Tools sample downloads: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
