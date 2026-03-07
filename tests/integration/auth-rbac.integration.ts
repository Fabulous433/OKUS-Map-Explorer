import assert from "node:assert/strict";

import { createIntegrationServer, requiredNumber, requiredString, type JsonRecord } from "./_helpers";

async function run() {
  const server = await createIntegrationServer();
  const { requestJson, jsonRequest, loginAs, logout } = server;

  let editorWpId: number | null = null;
  let editorOpId: number | null = null;
  let adminKecId: string | null = null;
  let adminKelId: string | null = null;
  let adminRekId: number | null = null;

  try {
    const publicOpList = await requestJson("/api/objek-pajak");
    assert.equal(publicOpList.response.status, 200, "Public list OP verified harus bisa diakses");

    const publicInternalList = await requestJson("/api/objek-pajak?includeUnverified=true");
    assert.equal(publicInternalList.response.status, 401, "Internal OP list harus butuh login");

    const unauthMutate = await jsonRequest("/api/master/kecamatan", "POST", {
      cpmKecamatan: "Kecamatan Unauthorized",
      cpmKodeKec: "991",
    });
    assert.equal(unauthMutate.response.status, 401, "Mutasi master tanpa login harus ditolak");

    const viewerLogin = await loginAs("viewer", "viewer123");
    assert.equal(viewerLogin.response.status, 200);

    const viewerRead = await requestJson("/api/master/kecamatan");
    assert.equal(viewerRead.response.status, 200, "Viewer harus bisa baca master");

    const viewerMutateWp = await jsonRequest("/api/wajib-pajak", "POST", {
      jenisWp: "orang_pribadi",
      peranWp: "pemilik",
      statusAktif: "active",
      namaWp: "Viewer Tidak Boleh Mutasi",
      nikKtpWp: "3174010000000999",
      alamatWp: "Alamat Viewer",
      kecamatanWp: "Kecamatan Viewer",
      kelurahanWp: "Kelurahan Viewer",
      teleponWaWp: "081200000999",
    });
    assert.equal(viewerMutateWp.response.status, 403, "Viewer tidak boleh mutasi WP");

    await logout();

    const editorLogin = await loginAs("editor", "editor123");
    assert.equal(editorLogin.response.status, 200);

    const uniq = Date.now().toString();
    const createWpByEditor = await jsonRequest("/api/wajib-pajak", "POST", {
      jenisWp: "orang_pribadi",
      peranWp: "pemilik",
      statusAktif: "active",
      namaWp: `Editor WP ${uniq}`,
      nikKtpWp: `317401${uniq.slice(-10)}`,
      alamatWp: "Alamat Editor",
      kecamatanWp: "Kecamatan Editor",
      kelurahanWp: "Kelurahan Editor",
      teleponWaWp: `0812${uniq.slice(-8)}`,
    });
    assert.equal(createWpByEditor.response.status, 201, "Editor harus bisa create WP");
    editorWpId = requiredNumber((createWpByEditor.body as JsonRecord).id, "WP editor id wajib ada");

    const rekeningResult = await requestJson("/api/master/rekening-pajak");
    assert.equal(rekeningResult.response.status, 200);
    assert.ok(Array.isArray(rekeningResult.body));
    const rekMblb = (rekeningResult.body as JsonRecord[]).find((item) => item.jenisPajak === "Pajak MBLB");
    assert.ok(rekMblb, "Rekening MBLB wajib tersedia");
    const rekPajakId = requiredNumber(rekMblb?.id, "rek_pajak_id MBLB wajib ada");

    const kecResult = await requestJson("/api/master/kecamatan");
    assert.equal(kecResult.response.status, 200);
    assert.ok(Array.isArray(kecResult.body));
    const kecamatanId = requiredString((kecResult.body[0] as JsonRecord).cpmKecId, "kecamatan id wajib ada");

    const kelResult = await requestJson(`/api/master/kelurahan?kecamatanId=${encodeURIComponent(kecamatanId)}`);
    assert.equal(kelResult.response.status, 200);
    assert.ok(Array.isArray(kelResult.body));
    const kelurahanId = requiredString((kelResult.body[0] as JsonRecord).cpmKelId, "kelurahan id wajib ada");

    const createOpByEditor = await jsonRequest("/api/objek-pajak", "POST", {
      wpId: editorWpId,
      rekPajakId,
      namaOp: `Editor OP ${uniq}`,
      alamatOp: "Alamat OP Editor",
      kecamatanId,
      kelurahanId,
      status: "active",
    });
    assert.equal(createOpByEditor.response.status, 201, "Editor harus bisa create OP");
    editorOpId = requiredNumber((createOpByEditor.body as JsonRecord).id, "OP editor id wajib ada");

    const verifyByEditor = await jsonRequest(`/api/objek-pajak/${editorOpId}/verification`, "PATCH", {
      statusVerifikasi: "verified",
      verifierName: "editor-tester",
    });
    assert.equal(verifyByEditor.response.status, 200, "Editor harus bisa verify OP");

    const editorMasterMutate = await jsonRequest("/api/master/rekening-pajak", "POST", {
      kodeRekening: `9.9.${uniq.slice(-6)}`,
      namaRekening: `Editor Should Fail ${uniq}`,
      jenisPajak: "Pajak MBLB",
      isActive: true,
    });
    assert.equal(editorMasterMutate.response.status, 403, "Editor tidak boleh mutasi master");

    await jsonRequest(`/api/objek-pajak/${editorOpId}`, "DELETE");
    editorOpId = null;
    await jsonRequest(`/api/wajib-pajak/${editorWpId}`, "DELETE");
    editorWpId = null;

    await logout();

    const adminLogin = await loginAs("admin", "admin123");
    assert.equal(adminLogin.response.status, 200);

    const uniqAdmin = Date.now().toString().slice(-6);
    const kodeKec = `8${uniqAdmin.slice(0, 2)}${uniqAdmin.slice(2, 3)}`.slice(0, 3);
    const kodeKel = `${uniqAdmin.slice(3, 6)}`.padStart(3, "0");

    const createKecByAdmin = await jsonRequest("/api/master/kecamatan", "POST", {
      cpmKecamatan: `Kecamatan Admin ${uniqAdmin}`,
      cpmKodeKec: kodeKec,
    });
    assert.equal(createKecByAdmin.response.status, 201, "Admin harus bisa create kecamatan");
    adminKecId = requiredString((createKecByAdmin.body as JsonRecord).cpmKecId, "admin kec id wajib ada");

    const createKelByAdmin = await jsonRequest("/api/master/kelurahan", "POST", {
      cpmKelurahan: `Kelurahan Admin ${uniqAdmin}`,
      cpmKodeKec: kodeKec,
      cpmKodeKel: kodeKel,
    });
    assert.equal(createKelByAdmin.response.status, 201, "Admin harus bisa create kelurahan");
    adminKelId = requiredString((createKelByAdmin.body as JsonRecord).cpmKelId, "admin kel id wajib ada");

    const createRekByAdmin = await jsonRequest("/api/master/rekening-pajak", "POST", {
      kodeRekening: `8.8.${uniqAdmin}`,
      namaRekening: `Admin Rek ${uniqAdmin}`,
      jenisPajak: "Pajak MBLB",
      isActive: true,
    });
    assert.equal(createRekByAdmin.response.status, 201, "Admin harus bisa create rekening");
    adminRekId = requiredNumber((createRekByAdmin.body as JsonRecord).id, "admin rek id wajib ada");

    const deleteRek = await jsonRequest(`/api/master/rekening-pajak/${adminRekId}`, "DELETE");
    assert.equal(deleteRek.response.status, 204, "Admin harus bisa delete rekening");
    adminRekId = null;

    const deleteKel = await jsonRequest(`/api/master/kelurahan/${adminKelId}`, "DELETE");
    assert.equal(deleteKel.response.status, 204, "Admin harus bisa delete kelurahan");
    adminKelId = null;

    const deleteKec = await jsonRequest(`/api/master/kecamatan/${adminKecId}`, "DELETE");
    assert.equal(deleteKec.response.status, 204, "Admin harus bisa delete kecamatan");
    adminKecId = null;
  } finally {
    try {
      await loginAs("admin", "admin123");

      if (editorOpId !== null) {
        await jsonRequest(`/api/objek-pajak/${editorOpId}`, "DELETE");
      }
      if (editorWpId !== null) {
        await jsonRequest(`/api/wajib-pajak/${editorWpId}`, "DELETE");
      }
      if (adminRekId !== null) {
        await jsonRequest(`/api/master/rekening-pajak/${adminRekId}`, "DELETE");
      }
      if (adminKelId) {
        await jsonRequest(`/api/master/kelurahan/${adminKelId}`, "DELETE");
      }
      if (adminKecId) {
        await jsonRequest(`/api/master/kecamatan/${adminKecId}`, "DELETE");
      }
    } finally {
      await server.close();
    }
  }
}

run()
  .then(() => {
    console.log("[integration] auth + rbac matrix: PASS");
  })
  .catch((error) => {
    console.error("[integration] auth + rbac matrix: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
