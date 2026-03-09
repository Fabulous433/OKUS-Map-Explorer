import assert from "node:assert/strict";

import { createIntegrationServer, requiredNumber, requiredString, type JsonRecord } from "./_helpers";

type DetailScenario = {
  jenisPajak: string;
  validDetail: Record<string, unknown>;
};

const DETAIL_SCENARIOS: DetailScenario[] = [
  {
    jenisPajak: "PBJT Makanan dan Minuman",
    validDetail: {
      jenisUsaha: "Rumah Makan",
      kapasitasTempat: 40,
    },
  },
  {
    jenisPajak: "PBJT Jasa Perhotelan",
    validDetail: {
      jenisUsaha: "Hotel",
      jumlahKamar: 20,
    },
  },
  {
    jenisPajak: "PBJT Jasa Parkir",
    validDetail: {
      jenisLokasi: "Lahan Terbuka",
      kapasitasKendaraan: 25,
    },
  },
  {
    jenisPajak: "PBJT Jasa Kesenian dan Hiburan",
    validDetail: {
      jenisHiburan: "Karaoke",
      kapasitas: 50,
    },
  },
  {
    jenisPajak: "PBJT Tenaga Listrik",
    validDetail: {
      jenisTenagaListrik: "PLN",
      dayaListrik: 4400,
    },
  },
  {
    jenisPajak: "Pajak Reklame",
    validDetail: {
      jenisReklame: "Billboard",
      ukuranReklame: 24,
      statusReklame: "baru",
    },
  },
  {
    jenisPajak: "Pajak Air Tanah",
    validDetail: {
      jenisAirTanah: "Sumur Bor",
      rata2UkuranPemakaian: 10,
    },
  },
  {
    jenisPajak: "Pajak Sarang Burung Walet",
    validDetail: {
      jenisBurungWalet: "Walet Linchi",
      panenPerTahun: 4,
    },
  },
];

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
    const wpId = requiredNumber((wpItems[0] as JsonRecord).id, "wp id wajib ada");

    const { body: rekeningBody } = await requestJson("/api/master/rekening-pajak");
    assert.ok(Array.isArray(rekeningBody));
    assert.ok(rekeningBody.length > 0);
    const rekeningList = rekeningBody as JsonRecord[];

    const { body: kecBody } = await requestJson("/api/master/kecamatan");
    assert.ok(Array.isArray(kecBody));
    assert.ok(kecBody.length > 0);
    const kecamatanId = requiredString((kecBody[0] as JsonRecord).cpmKecId, "kecamatan id wajib ada");

    const { body: kelBody } = await requestJson(`/api/master/kelurahan?kecamatanId=${encodeURIComponent(kecamatanId)}`);
    assert.ok(Array.isArray(kelBody));
    assert.ok(kelBody.length > 0);
    const kelurahanId = requiredString((kelBody[0] as JsonRecord).cpmKelId, "kelurahan id wajib ada");

    for (const scenario of DETAIL_SCENARIOS) {
      const rekening = rekeningList.find((item) => item.jenisPajak === scenario.jenisPajak);
      assert.ok(rekening, `Master rekening untuk ${scenario.jenisPajak} wajib ada`);
      const rekPajakId = requiredNumber(rekening!.id, `rek_pajak_id ${scenario.jenisPajak} wajib number`);

      const invalidResult = await jsonRequest("/api/objek-pajak", "POST", {
        wpId,
        rekPajakId,
        namaOp: `IT Invalid ${scenario.jenisPajak} ${Date.now()}`,
        alamatOp: "Jl. Invalid Detail",
        kecamatanId,
        kelurahanId,
        status: "active",
        detailPajak: {},
      });

      assert.equal(
        invalidResult.response.status,
        400,
        `Detail kosong untuk ${scenario.jenisPajak} harus ditolak`,
      );

      const validResult = await jsonRequest("/api/objek-pajak", "POST", {
        wpId,
        rekPajakId,
        namaOp: `IT Valid ${scenario.jenisPajak} ${Date.now()}`,
        alamatOp: "Jl. Valid Detail",
        kecamatanId,
        kelurahanId,
        status: "active",
        detailPajak: scenario.validDetail,
      });

      assert.equal(validResult.response.status, 201, `Detail valid untuk ${scenario.jenisPajak} harus sukses`);
      const createdId = requiredNumber((validResult.body as JsonRecord).id, "id hasil create wajib ada");
      createdIds.push(createdId);
    }

    const mblbRekening = rekeningList.find((item) => item.jenisPajak === "Pajak MBLB");
    assert.ok(mblbRekening, "Master rekening MBLB wajib ada");

    const mblbCreate = await jsonRequest("/api/objek-pajak", "POST", {
      wpId,
      rekPajakId: requiredNumber(mblbRekening!.id, "rek_pajak_id MBLB wajib number"),
      namaOp: `IT MBLB No Detail ${Date.now()}`,
      alamatOp: "Jl. MBLB No Detail",
      kecamatanId,
      kelurahanId,
      status: "active",
    });

    assert.equal(mblbCreate.response.status, 201, "MBLB tanpa detail harus bisa disimpan");
    const mblbId = requiredNumber((mblbCreate.body as JsonRecord).id, "id MBLB wajib ada");
    createdIds.push(mblbId);

    const rekeningParkir = rekeningList.find((item) => item.jenisPajak === "PBJT Jasa Parkir");
    assert.ok(rekeningParkir, "Master rekening parkir wajib ada");

    const invalidNumericDetail = await jsonRequest("/api/objek-pajak", "POST", {
      wpId,
      rekPajakId: requiredNumber(rekeningParkir!.id, "rek_pajak_id parkir wajib number"),
      namaOp: `IT Invalid Numeric Parkir ${Date.now()}`,
      alamatOp: "Jl. Invalid Numeric",
      kecamatanId,
      kelurahanId,
      status: "active",
      detailPajak: {
        jenisLokasi: "Gedung",
        kapasitasKendaraan: 15,
        tarifParkir: "abc",
      },
    });
    assert.equal(invalidNumericDetail.response.status, 400, "Tarif parkir non-numeric harus ditolak");
    assert.equal(
      (invalidNumericDetail.body as JsonRecord).message,
      "Tarif parkir harus berupa angka",
    );
    assert.ok(Array.isArray((invalidNumericDetail.body as JsonRecord).fieldErrors));
    assert.ok(
      ((invalidNumericDetail.body as JsonRecord).fieldErrors as JsonRecord[]).some(
        (item) =>
          item.field === "tarifParkir" || item.field === "detailPajak.tarifParkir",
      ),
      "fieldErrors harus menunjuk field numerik yang salah",
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
    console.log("[integration] OP detail validation per jenis + MBLB no-detail: PASS");
  })
  .catch((error) => {
    console.error("[integration] OP detail validation per jenis + MBLB no-detail: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
