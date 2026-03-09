import assert from "node:assert/strict";
import { parse } from "csv-parse/sync";
import { stringify } from "csv-stringify/sync";

import { createIntegrationServer, requiredNumber, requiredString, type JsonRecord } from "./_helpers";

const OP_CSV_COLUMNS = [
  "nopd",
  "wp_id",
  "rek_pajak_id",
  "no_rek_pajak",
  "nama_rek_pajak",
  "nama_op",
  "npwp_op",
  "alamat_op",
  "kecamatan_id",
  "kecamatan_nama",
  "kelurahan_id",
  "kelurahan_nama",
  "omset_bulanan",
  "tarif_persen",
  "pajak_bulanan",
  "latitude",
  "longitude",
  "status",
  "detail_jenis_usaha",
  "detail_kapasitas_tempat",
  "detail_jumlah_karyawan",
  "detail_rata2_pengunjung",
  "detail_jam_buka",
  "detail_jam_tutup",
  "detail_harga_termurah",
  "detail_harga_termahal",
  "detail_jumlah_kamar",
  "detail_klasifikasi",
  "detail_fasilitas",
  "detail_rata2_pengunjung_harian",
  "detail_jenis_hiburan",
  "detail_kapasitas",
  "detail_jam_operasional",
  "detail_jenis_lokasi",
  "detail_kapasitas_kendaraan",
  "detail_tarif_parkir",
  "detail_jenis_tenaga_listrik",
  "detail_daya_listrik",
  "detail_jenis_reklame",
  "detail_ukuran_panjang",
  "detail_ukuran_lebar",
  "detail_ukuran_tinggi",
  "detail_judul_reklame",
  "detail_masa_berlaku",
  "detail_status_reklame",
  "detail_nama_biro_jasa",
  "detail_jenis_air_tanah",
  "detail_rata2_ukuran_pemakaian",
  "detail_kriteria_air_tanah",
  "detail_kelompok_usaha",
  "detail_jenis_burung_walet",
  "detail_panen_per_tahun",
  "detail_rata2_berat_panen",
] as const;

async function run() {
  const server = await createIntegrationServer();
  const { requestJson, requestText, jsonRequest, loginAs } = server;

  let sourceId: number | null = null;
  let importedId: number | null = null;

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
    const rekeningTarget =
      (rekeningBody as JsonRecord[]).find((item) => item.jenisPajak === "Pajak MBLB") ??
      (rekeningBody as JsonRecord[])[0];
    const rekPajakId = requiredNumber(rekeningTarget.id, "rek_pajak_id wajib ada");

    const { body: kecBody } = await requestJson("/api/master/kecamatan");
    assert.ok(Array.isArray(kecBody));
    assert.ok(kecBody.length > 0);
    const kecamatanId = requiredString((kecBody[0] as JsonRecord).cpmKecId, "kecamatan id wajib ada");

    const { body: kelBody } = await requestJson(`/api/master/kelurahan?kecamatanId=${encodeURIComponent(kecamatanId)}`);
    assert.ok(Array.isArray(kelBody));
    assert.ok(kelBody.length > 0);
    const kelurahanId = requiredString((kelBody[0] as JsonRecord).cpmKelId, "kelurahan id wajib ada");

    const sourceName = `IT CSV Source ${Date.now()}`;
    const createSource = await jsonRequest("/api/objek-pajak", "POST", {
      wpId,
      rekPajakId,
      namaOp: sourceName,
      alamatOp: "Jl. CSV Source",
      kecamatanId,
      kelurahanId,
      status: "active",
    });

    assert.equal(createSource.response.status, 201);
    sourceId = requiredNumber((createSource.body as JsonRecord).id, "source id wajib ada");

    const exportCsv = await requestText("/api/objek-pajak/export");
    assert.equal(exportCsv.response.status, 200);

    const rows = parse<Record<string, string>>(exportCsv.body, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    assert.ok(rows.length > 0);
    const firstRowKeys = Object.keys(rows[0]);
    assert.ok(firstRowKeys.includes("nama_op"));
    assert.ok(firstRowKeys.includes("rek_pajak_id"));
    assert.ok(firstRowKeys.includes("kecamatan_id"));
    assert.ok(firstRowKeys.includes("kelurahan_id"));
    assert.equal(firstRowKeys.includes("detail_pajak"), false, "Kolom legacy detail_pajak tidak boleh ada");

    const sourceRow = rows.find((row) => row.nama_op === sourceName);
    assert.ok(sourceRow, "Row sumber harus muncul di hasil export");

    const importName = `IT CSV Imported ${Date.now()}`;
    const importRow: Record<string, string> = {
      ...sourceRow,
      nopd: "",
      nama_op: importName,
      alamat_op: "Jl. CSV Imported",
    };

    const csvPayload = stringify([importRow], {
      header: true,
      columns: [...OP_CSV_COLUMNS],
    });

    const form = new FormData();
    form.append("file", new Blob([csvPayload], { type: "text/csv" }), "op-import.csv");

    const { response: importResponse, body: importBodyRaw } = await requestJson("/api/objek-pajak/import", {
      method: "POST",
      body: form,
    });
    const importBody = (importBodyRaw ?? {}) as JsonRecord;

    assert.equal(importResponse.status, 200);
    assert.equal(importBody.total, 1);
    assert.equal(importBody.success, 1);
    assert.equal(importBody.failed, 0);

    const listAfter = await requestJson("/api/objek-pajak?includeUnverified=true");
    assert.equal(listAfter.response.status, 200);
    assert.ok(Array.isArray((listAfter.body as JsonRecord).items));

    const imported = ((listAfter.body as JsonRecord).items as JsonRecord[]).find((item) => item.namaOp === importName);
    assert.ok(imported, "Data hasil import harus ada");
    importedId = requiredNumber(imported.id, "imported id wajib ada");
    assert.equal(imported.rekPajakId, rekPajakId);
    assert.match(requiredString(imported.nopd, "NOPD hasil import wajib ada"), /^\d{2}\.\d{2}\.\d{2}\.\d{4}$/);
    assert.equal("namaObjek" in imported, false);
    assert.equal("alamat" in imported, false);

    const invalidLegacyRow: Record<string, string> = {
      ...sourceRow,
      nopd: "OP.321.001.2026",
      nama_op: `IT CSV Invalid Legacy ${Date.now()}`,
      alamat_op: "Jl. CSV Invalid Legacy",
    };

    const invalidCsvPayload = stringify([invalidLegacyRow], {
      header: true,
      columns: [...OP_CSV_COLUMNS],
    });

    const invalidForm = new FormData();
    invalidForm.append("file", new Blob([invalidCsvPayload], { type: "text/csv" }), "op-import-invalid.csv");

    const { response: invalidImportResponse, body: invalidImportBodyRaw } = await requestJson("/api/objek-pajak/import", {
      method: "POST",
      body: invalidForm,
    });
    const invalidImportBody = (invalidImportBodyRaw ?? {}) as JsonRecord;
    assert.equal(invalidImportResponse.status, 200);
    assert.equal(invalidImportBody.total, 1);
    assert.equal(invalidImportBody.success, 0);
    assert.equal(invalidImportBody.failed, 1);
    assert.ok(Array.isArray(invalidImportBody.errors));
    assert.ok(
      ((invalidImportBody.errors as unknown[]) ?? []).some(
        (item) =>
          typeof item === "string" &&
          item.includes("Format NOPD salah, mohon diperiksa kembali"),
      ),
      "Import harus melaporkan format NOPD lama sebagai error yang jelas",
    );
  } finally {
    if (importedId !== null) {
      await jsonRequest(`/api/objek-pajak/${importedId}`, "DELETE");
    }

    if (sourceId !== null) {
      await jsonRequest(`/api/objek-pajak/${sourceId}`, "DELETE");
    }

    await server.close();
  }
}

run()
  .then(() => {
    console.log("[integration] OP CSV round-trip final contract: PASS");
  })
  .catch((error) => {
    console.error("[integration] OP CSV round-trip final contract: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
