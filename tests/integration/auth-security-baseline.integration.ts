import assert from "node:assert/strict";

import { createIntegrationServer, type JsonRecord } from "./_helpers";

async function run() {
  const server = await createIntegrationServer();
  const { jsonRequest, loginAs, logout } = server;

  try {
    for (let i = 0; i < 4; i += 1) {
      const failedLogin = await loginAs("viewer", "wrong-pass");
      assert.equal(failedLogin.response.status, 401, "Percobaan gagal sebelum threshold harus 401");
    }

    const lockTrigger = await loginAs("viewer", "wrong-pass");
    assert.equal(lockTrigger.response.status, 429, "Percobaan gagal pada threshold harus lock");
    assert.equal((lockTrigger.body as JsonRecord).code, "AUTH_LOCKED");

    const loginWhileLocked = await loginAs("viewer", "viewer123");
    assert.equal(loginWhileLocked.response.status, 429, "User terkunci harus belum bisa login");
    assert.equal((loginWhileLocked.body as JsonRecord).code, "AUTH_LOCKED");

    const adminLogin = await loginAs("admin", "admin123");
    assert.equal(adminLogin.response.status, 200);

    const weakPasswordChange = await jsonRequest("/api/auth/change-password", "POST", {
      oldPassword: "admin123",
      newPassword: "short1",
    });
    assert.equal(weakPasswordChange.response.status, 400);
    assert.equal((weakPasswordChange.body as JsonRecord).code, "PASSWORD_POLICY_VIOLATION");

    const newStrongPassword = "Admin56789";
    const applyPasswordChange = await jsonRequest("/api/auth/change-password", "POST", {
      oldPassword: "admin123",
      newPassword: newStrongPassword,
    });
    assert.equal(applyPasswordChange.response.status, 200, "Password valid harus bisa diubah");

    await logout();

    const loginOldPassword = await loginAs("admin", "admin123");
    assert.equal(loginOldPassword.response.status, 401, "Password lama tidak boleh berlaku setelah change");

    const loginNewPassword = await loginAs("admin", newStrongPassword);
    assert.equal(loginNewPassword.response.status, 200, "Password baru harus berlaku");

    const restorePassword = await jsonRequest("/api/auth/change-password", "POST", {
      oldPassword: newStrongPassword,
      newPassword: "admin123",
    });
    assert.equal(restorePassword.response.status, 200, "Restore password default harus sukses");

    await logout();

    let rateLimitHit = false;
    for (let i = 0; i < 100; i += 1) {
      const noisyLogin = await jsonRequest("/api/auth/login", "POST", {});
      if (noisyLogin.response.status === 429 && (noisyLogin.body as JsonRecord)?.code === "AUTH_RATE_LIMITED") {
        rateLimitHit = true;
        break;
      }
    }
    assert.equal(rateLimitHit, true, "Rate limit login harus aktif");
  } finally {
    await server.close();
  }
}

run()
  .then(() => {
    console.log("[integration] auth security baseline: PASS");
  })
  .catch((error) => {
    console.error("[integration] auth security baseline: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
