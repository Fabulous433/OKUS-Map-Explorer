import assert from "node:assert/strict";

import { createIntegrationServer, requiredNumber, requiredString, type JsonRecord } from "./_helpers";

const PERFORMANCE_QUERY_POINT = {
  latitude: "-4.5348497",
  longitude: "104.0736724",
};

async function run() {
  const server = await createIntegrationServer();
  const { requestJson, jsonRequest, loginAs } = server;

  let createdOpId: number | null = null;

  try {
    const unauthInternalMap = await requestJson(
      "/api/objek-pajak/map?bbox=104,-4.6,104.1,-4.4&includeUnverified=true",
    );
    assert.equal(unauthInternalMap.response.status, 401, "Map includeUnverified harus butuh login");

    const loginResult = await loginAs("admin", "admin123");
    assert.equal(loginResult.response.status, 200);

    const wpResult = await requestJson("/api/wajib-pajak?page=1&limit=100");
    assert.equal(wpResult.response.status, 200);
    assert.ok(Array.isArray((wpResult.body as JsonRecord).items));
    assert.ok((wpResult.body as JsonRecord).meta);
    const wpItems = (wpResult.body as JsonRecord).items as JsonRecord[];
    assert.ok(wpItems.length > 0);
    const wpId = requiredNumber(wpItems[0]?.id, "wp id wajib ada");
    const wpSearchTerm = requiredString(
      wpItems[0]?.displayName ?? wpItems[0]?.namaWp ?? wpItems[0]?.namaPengelola,
      "nama wajib pajak wajib ada",
    );

    const seededGinaWp = await requestJson("/api/wajib-pajak?page=1&limit=25&q=Gina");
    assert.equal(seededGinaWp.response.status, 200);
    const seededGinaWpItems = ((seededGinaWp.body as JsonRecord).items as JsonRecord[]);
    const ginaWp = seededGinaWpItems.find((item) => item.displayName === "Gina Pemilik BU");
    assert.ok(ginaWp, "seed Gina Pemilik BU wajib tersedia untuk regression search");

    const wpLimited = await requestJson("/api/wajib-pajak?page=1&limit=999");
    assert.equal(wpLimited.response.status, 200);
    assert.equal((wpLimited.body as JsonRecord).meta && ((wpLimited.body as JsonRecord).meta as JsonRecord).limit, 100);

    const wpCursorFirst = await requestJson("/api/wajib-pajak?limit=2&cursor=999999999");
    assert.equal(wpCursorFirst.response.status, 200);
    const wpCursorFirstBody = wpCursorFirst.body as JsonRecord;
    assert.equal(((wpCursorFirstBody.meta as JsonRecord).mode), "cursor");
    const wpCursorFirstItems = wpCursorFirstBody.items as JsonRecord[];
    assert.ok(wpCursorFirstItems.length >= 1, "Cursor page pertama WP harus berisi data");
    const wpNextCursor = (wpCursorFirstBody.meta as JsonRecord).nextCursor;
    if (typeof wpNextCursor === "number") {
      const wpCursorSecond = await requestJson(`/api/wajib-pajak?limit=2&cursor=${wpNextCursor}`);
      assert.equal(wpCursorSecond.response.status, 200);
      const wpCursorSecondItems = ((wpCursorSecond.body as JsonRecord).items as JsonRecord[]);
      if (wpCursorSecondItems.length > 0) {
        const firstId = requiredNumber(wpCursorFirstItems[0]?.id, "id WP cursor pertama wajib ada");
        const secondId = requiredNumber(wpCursorSecondItems[0]?.id, "id WP cursor kedua wajib ada");
        assert.ok(secondId < firstId, "Cursor WP harus bergerak ke id yang lebih kecil");
      }
    }

    const rekeningResult = await requestJson("/api/master/rekening-pajak");
    assert.equal(rekeningResult.response.status, 200);
    assert.ok(Array.isArray(rekeningResult.body));
    const rekMblb = (rekeningResult.body as JsonRecord[]).find((item) => item.jenisPajak === "Pajak MBLB");
    assert.ok(rekMblb, "Rekening MBLB wajib tersedia");
    const rekPajakId = requiredNumber(rekMblb?.id, "rek_pajak_id MBLB wajib ada");

    const kecResult = await requestJson("/api/master/kecamatan");
    assert.equal(kecResult.response.status, 200);
    assert.ok(Array.isArray(kecResult.body));
    const kecamatanItems = kecResult.body as JsonRecord[];
    const muaraDua = kecamatanItems.find((item) => item.cpmKecamatan === "Muaradua");
    assert.ok(muaraDua, "master kecamatan Muaradua wajib tersedia");
    const kecamatanId = requiredString(muaraDua?.cpmKecId, "kecamatan id wajib ada");

    const kelResult = await requestJson(`/api/master/kelurahan?kecamatanId=${encodeURIComponent(kecamatanId)}`);
    assert.equal(kelResult.response.status, 200);
    assert.ok(Array.isArray(kelResult.body));
    const kelurahanItems = kelResult.body as JsonRecord[];
    const pasarMuaradua = kelurahanItems.find((item) => item.cpmKelurahan === "Pasar Muaradua");
    assert.ok(pasarMuaradua, "master kelurahan Pasar Muaradua wajib tersedia");
    const kelurahanId = requiredString(pasarMuaradua?.cpmKelId, "kelurahan id wajib ada");

    const uniq = `IT-PH19-${Date.now()}`;
    const createOp = await jsonRequest("/api/objek-pajak", "POST", {
      wpId,
      rekPajakId,
      namaOp: uniq,
      alamatOp: "Jl. Performance Query",
      kecamatanId,
      kelurahanId,
      ...PERFORMANCE_QUERY_POINT,
      status: "active",
    });
    assert.equal(createOp.response.status, 201);
    createdOpId = requiredNumber((createOp.body as JsonRecord).id, "id OP wajib ada");

    const verifyOp = await jsonRequest(`/api/objek-pajak/${createdOpId}/verification`, "PATCH", {
      statusVerifikasi: "verified",
      verifierName: "integration-tester",
    });
    assert.equal(verifyOp.response.status, 200);

    const listResult = await requestJson(`/api/objek-pajak?page=1&limit=25&includeUnverified=true&q=${encodeURIComponent(uniq)}`);
    assert.equal(listResult.response.status, 200);
    const listBody = listResult.body as JsonRecord;
    assert.ok(Array.isArray(listBody.items), "items harus array");
    assert.ok(listBody.meta, "meta wajib ada");
    const opItems = listBody.items as JsonRecord[];
    const found = opItems.find((item) => Number(item.id) === createdOpId);
    assert.ok(found, "hasil search server-first harus menemukan OP");
    assert.equal("detailPajak" in (found as JsonRecord), false, "list tidak boleh hydrate detailPajak penuh");
    assert.equal(typeof (found as JsonRecord).hasDetail, "boolean");

    const wpSearchResult = await requestJson(
      `/api/objek-pajak?page=1&limit=25&includeUnverified=true&q=${encodeURIComponent(wpSearchTerm)}`,
    );
    assert.equal(wpSearchResult.response.status, 200);
    const wpSearchItems = ((wpSearchResult.body as JsonRecord).items as JsonRecord[]);
    assert.ok(
      wpSearchItems.some((item) => Number(item.id) === createdOpId),
      "hasil search OP harus bisa ditemukan lewat nama wajib pajak",
    );

    const ginaSearchResult = await requestJson("/api/objek-pajak?page=1&limit=25&includeUnverified=true&q=Gina");
    assert.equal(ginaSearchResult.response.status, 200);
    const ginaSearchItems = ((ginaSearchResult.body as JsonRecord).items as JsonRecord[]);
    assert.ok(
      ginaSearchItems.some((item) => Number(item.wpId) === Number(ginaWp?.id)),
      "search OP dengan nama WP seeded `Gina` harus tetap menemukan data terkait",
    );

    const opCursorFirst = await requestJson("/api/objek-pajak?limit=2&cursor=999999999&includeUnverified=true");
    assert.equal(opCursorFirst.response.status, 200);
    const opCursorFirstBody = opCursorFirst.body as JsonRecord;
    assert.equal(((opCursorFirstBody.meta as JsonRecord).mode), "cursor");
    const opCursorFirstItems = opCursorFirstBody.items as JsonRecord[];
    assert.ok(opCursorFirstItems.length >= 1, "Cursor page pertama OP harus berisi data");
    const opNextCursor = (opCursorFirstBody.meta as JsonRecord).nextCursor;
    if (typeof opNextCursor === "number") {
      const opCursorSecond = await requestJson(`/api/objek-pajak?limit=2&cursor=${opNextCursor}&includeUnverified=true`);
      assert.equal(opCursorSecond.response.status, 200);
      const opCursorSecondItems = ((opCursorSecond.body as JsonRecord).items as JsonRecord[]);
      if (opCursorSecondItems.length > 0) {
        const firstId = requiredNumber(opCursorFirstItems[0]?.id, "id OP cursor pertama wajib ada");
        const secondId = requiredNumber(opCursorSecondItems[0]?.id, "id OP cursor kedua wajib ada");
        assert.ok(secondId < firstId, "Cursor OP harus bergerak ke id yang lebih kecil");
      }
    }

    const mapResult = await requestJson(
      `/api/objek-pajak/map?bbox=104.0000,-4.6000,104.1000,-4.4000&q=${encodeURIComponent(uniq)}&limit=50`,
    );
    assert.equal(mapResult.response.status, 200);
    const mapBody = mapResult.body as JsonRecord;
    assert.ok(Array.isArray(mapBody.items), "map items harus array");
    assert.ok(mapBody.meta, "map meta wajib ada");
    const mapItems = mapBody.items as JsonRecord[];
    assert.ok(mapItems.some((item) => Number(item.id) === createdOpId), "OP harus muncul di viewport map query");
    assert.equal(typeof ((mapBody.meta as JsonRecord).totalInView), "number");
    assert.equal(typeof ((mapBody.meta as JsonRecord).isCapped), "boolean");

    const mapInvalidBbox = await requestJson("/api/objek-pajak/map?bbox=invalid");
    assert.equal(mapInvalidBbox.response.status, 400, "bbox invalid harus ditolak");

    const mapWfsResult = await requestJson(
      `/api/objek-pajak/map-wfs?bbox=104.0000,-4.6000,104.1000,-4.4000&q=${encodeURIComponent(uniq)}&limit=50`,
    );
    assert.equal(mapWfsResult.response.status, 200);
    const mapWfsBody = mapWfsResult.body as JsonRecord;
    assert.equal(mapWfsBody.type, "FeatureCollection");
    assert.ok(Array.isArray(mapWfsBody.features), "map-wfs features harus array");
    assert.equal(typeof mapWfsBody.numberMatched, "number");
    const mapWfsFeatures = mapWfsBody.features as JsonRecord[];
    const matchingFeature = mapWfsFeatures.find((feature) => Number(feature.id) === createdOpId);
    assert.ok(matchingFeature, "OP harus muncul di proxy WFS");
    assert.equal((matchingFeature?.type), "Feature");
    assert.equal(((matchingFeature?.geometry as JsonRecord | undefined)?.type), "Point");
    const coordinates = ((matchingFeature?.geometry as JsonRecord | undefined)?.coordinates) as unknown[];
    assert.ok(Array.isArray(coordinates), "coordinates WFS harus array");
    assert.equal(coordinates[0], 104.0736724);
    assert.equal(coordinates[1], -4.5348497);
    const properties = (matchingFeature?.properties as JsonRecord | undefined) ?? {};
    assert.equal(properties.nama_op, uniq);
    assert.equal(properties.alamat_op, "Jl. Performance Query");

    const mapWfsInvalidBbox = await requestJson("/api/objek-pajak/map-wfs?bbox=invalid");
    assert.equal(mapWfsInvalidBbox.response.status, 400, "bbox invalid harus ditolak pada proxy WFS");
  } finally {
    if (createdOpId !== null) {
      await jsonRequest(`/api/objek-pajak/${createdOpId}`, "DELETE");
    }
    await server.close();
  }
}

run()
  .then(() => {
    console.log("[integration] performance-query-hardening pagination/map: PASS");
  })
  .catch((error) => {
    console.error("[integration] performance-query-hardening pagination/map: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
