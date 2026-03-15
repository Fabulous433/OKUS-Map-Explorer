import assert from "node:assert/strict";

import { createIntegrationServer, requiredNumber, requiredString, type JsonRecord } from "./_helpers";

const PASAR_MUARADUA_POINT = {
  latitude: "-4.5348497",
  longitude: "104.0736724",
};

const BATU_BELANG_JAYA_POINT = {
  latitude: "-4.5934946",
  longitude: "104.0733304",
};

const BANDING_AGUNG_POINT = {
  latitude: "-4.9097972",
  longitude: "103.8542042",
};

const OUTSIDE_OKU_SELATAN_POINT = {
  latitude: "-2.9909300",
  longitude: "104.7565500",
};

function buildCreatePayload(input: {
  suffix: string;
  wpId: number;
  rekPajakId: number;
  kecamatanId: string;
  kelurahanId: string;
  latitude: string;
  longitude: string;
}) {
  return {
    wpId: input.wpId,
    rekPajakId: input.rekPajakId,
    namaOp: `IT Spatial Guard ${input.suffix}`,
    alamatOp: `Jl. Spatial Guard ${input.suffix}`,
    kecamatanId: input.kecamatanId,
    kelurahanId: input.kelurahanId,
    latitude: input.latitude,
    longitude: input.longitude,
    status: "active",
  };
}

async function run() {
  const server = await createIntegrationServer();
  const { requestJson, jsonRequest, loginAs } = server;
  const createdIds: number[] = [];

  try {
    const loginResult = await loginAs("admin", "admin123");
    assert.equal(loginResult.response.status, 200);

    const { body: wpBody } = await requestJson("/api/wajib-pajak");
    assert.ok(Array.isArray((wpBody as JsonRecord).items));
    const wpItems = (wpBody as JsonRecord).items as JsonRecord[];
    assert.ok(wpItems.length > 0);
    const wpId = requiredNumber(wpItems[0]?.id, "wp id wajib ada");

    const { body: rekeningBody } = await requestJson("/api/master/rekening-pajak");
    assert.ok(Array.isArray(rekeningBody));
    const mblbRekening = (rekeningBody as JsonRecord[]).find((item) => item.jenisPajak === "Pajak MBLB");
    assert.ok(mblbRekening, "rekening pajak MBLB wajib tersedia");
    const rekPajakId = requiredNumber(mblbRekening?.id, "rek_pajak_id MBLB wajib ada");

    const { body: kecamatanBody } = await requestJson("/api/master/kecamatan");
    assert.ok(Array.isArray(kecamatanBody));
    const kecamatanItems = kecamatanBody as JsonRecord[];
    const muaradua = kecamatanItems.find((item) => item.cpmKecamatan === "Muaradua");
    const bandingAgung = kecamatanItems.find((item) => item.cpmKecamatan === "Banding Agung");
    assert.ok(muaradua, "master kecamatan Muaradua wajib tersedia");
    assert.ok(bandingAgung, "master kecamatan Banding Agung wajib tersedia");

    const muaraduaKecamatanId = requiredString(muaradua?.cpmKecId, "cpmKecId Muaradua wajib ada");
    const bandingAgungKecamatanId = requiredString(bandingAgung?.cpmKecId, "cpmKecId Banding Agung wajib ada");

    const { body: muaraduaKelurahanBody } = await requestJson(
      `/api/master/kelurahan?kecamatanId=${encodeURIComponent(muaraduaKecamatanId)}`,
    );
    assert.ok(Array.isArray(muaraduaKelurahanBody));
    const muaraduaKelurahanItems = muaraduaKelurahanBody as JsonRecord[];
    const pasarMuaradua = muaraduaKelurahanItems.find((item) => item.cpmKelurahan === "Pasar Muaradua");
    const batuBelangJaya = muaraduaKelurahanItems.find((item) => item.cpmKelurahan === "Batu Belang Jaya");
    assert.ok(pasarMuaradua, "master kelurahan Pasar Muaradua wajib tersedia");
    assert.ok(batuBelangJaya, "master kelurahan Batu Belang Jaya wajib tersedia");

    const pasarMuaraduaKelurahanId = requiredString(
      pasarMuaradua?.cpmKelId,
      "cpmKelId Pasar Muaradua wajib ada",
    );
    const batuBelangJayaKelurahanId = requiredString(
      batuBelangJaya?.cpmKelId,
      "cpmKelId Batu Belang Jaya wajib ada",
    );

    const createInside = await jsonRequest(
      "/api/objek-pajak",
      "POST",
      buildCreatePayload({
        suffix: "inside-ok",
        wpId,
        rekPajakId,
        kecamatanId: muaraduaKecamatanId,
        kelurahanId: pasarMuaraduaKelurahanId,
        ...PASAR_MUARADUA_POINT,
      }),
    );
    assert.equal(createInside.response.status, 201, "create OP dalam OKU Selatan harus sukses");
    const insideId = requiredNumber((createInside.body as JsonRecord).id, "id create inside wajib ada");
    createdIds.push(insideId);

    const createOutsideKabupaten = await jsonRequest(
      "/api/objek-pajak",
      "POST",
      buildCreatePayload({
        suffix: "outside-kabupaten",
        wpId,
        rekPajakId,
        kecamatanId: muaraduaKecamatanId,
        kelurahanId: pasarMuaraduaKelurahanId,
        ...OUTSIDE_OKU_SELATAN_POINT,
      }),
    );
    assert.equal(createOutsideKabupaten.response.status, 400, "create OP di luar OKU Selatan harus ditolak");
    assert.match(
      requiredString((createOutsideKabupaten.body as JsonRecord).message, "message create outside wajib ada"),
      /kabupaten/i,
      "error create luar wilayah harus menyebut kabupaten",
    );

    const updateOutsideKabupaten = await jsonRequest(`/api/objek-pajak/${insideId}`, "PATCH", OUTSIDE_OKU_SELATAN_POINT);
    assert.equal(updateOutsideKabupaten.response.status, 400, "update OP ke luar OKU Selatan harus ditolak");
    assert.match(
      requiredString((updateOutsideKabupaten.body as JsonRecord).message, "message update outside wajib ada"),
      /kabupaten/i,
      "error update luar wilayah harus menyebut kabupaten",
    );

    const createWrongKecamatan = await jsonRequest(
      "/api/objek-pajak",
      "POST",
      buildCreatePayload({
        suffix: "wrong-kecamatan",
        wpId,
        rekPajakId,
        kecamatanId: muaraduaKecamatanId,
        kelurahanId: pasarMuaraduaKelurahanId,
        ...BANDING_AGUNG_POINT,
      }),
    );
    assert.equal(createWrongKecamatan.response.status, 400, "create OP dengan kecamatan tidak cocok harus ditolak");
    assert.match(
      requiredString((createWrongKecamatan.body as JsonRecord).message, "message create kecamatan wajib ada"),
      /kecamatan/i,
      "error create mismatch kecamatan harus menyebut kecamatan",
    );

    const updateWrongKecamatan = await jsonRequest(`/api/objek-pajak/${insideId}`, "PATCH", BANDING_AGUNG_POINT);
    assert.equal(updateWrongKecamatan.response.status, 400, "update OP ke kecamatan lain harus ditolak");
    assert.match(
      requiredString((updateWrongKecamatan.body as JsonRecord).message, "message update kecamatan wajib ada"),
      /kecamatan/i,
      "error update mismatch kecamatan harus menyebut kecamatan",
    );

    const createWrongKelurahan = await jsonRequest(
      "/api/objek-pajak",
      "POST",
      buildCreatePayload({
        suffix: "wrong-kelurahan",
        wpId,
        rekPajakId,
        kecamatanId: muaraduaKecamatanId,
        kelurahanId: pasarMuaraduaKelurahanId,
        ...BATU_BELANG_JAYA_POINT,
      }),
    );
    assert.equal(createWrongKelurahan.response.status, 400, "create OP dengan kelurahan tidak cocok harus ditolak");
    assert.match(
      requiredString((createWrongKelurahan.body as JsonRecord).message, "message create kelurahan wajib ada"),
      /kelurahan/i,
      "error create mismatch kelurahan harus menyebut kelurahan",
    );

    const updateWrongKelurahan = await jsonRequest(`/api/objek-pajak/${insideId}`, "PATCH", BATU_BELANG_JAYA_POINT);
    assert.equal(updateWrongKelurahan.response.status, 400, "update OP ke kelurahan lain harus ditolak");
    assert.match(
      requiredString((updateWrongKelurahan.body as JsonRecord).message, "message update kelurahan wajib ada"),
      /kelurahan/i,
      "error update mismatch kelurahan harus menyebut kelurahan",
    );

    const createBandingAgung = await jsonRequest(
      "/api/objek-pajak",
      "POST",
      buildCreatePayload({
        suffix: "banding-agung-ok",
        wpId,
        rekPajakId,
        kecamatanId: bandingAgungKecamatanId,
        kelurahanId: batuBelangJayaKelurahanId,
        ...BANDING_AGUNG_POINT,
      }),
    );
    assert.equal(
      createBandingAgung.response.status,
      400,
      "tanpa kelurahan yang cocok, point Banding Agung dengan kelurahan Muara Dua harus tetap ditolak",
    );
  } finally {
    for (const id of createdIds) {
      await jsonRequest(`/api/objek-pajak/${id}`, "DELETE");
    }

    await server.close();
  }
}

run()
  .then(() => {
    console.log("[integration] objek-pajak-spatial-guard: PASS");
  })
  .catch((error) => {
    console.error("[integration] objek-pajak-spatial-guard: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
