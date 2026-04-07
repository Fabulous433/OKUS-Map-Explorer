import assert from "node:assert/strict";

import { createIntegrationServer } from "./_helpers";
import { readFirstSheetRows } from "./_excel";

async function run() {
  const server = await createIntegrationServer();
  const { loginAs, requestBytes } = server;

  try {
    const loginResult = await loginAs("admin", "admin123");
    assert.equal(loginResult.response.status, 200);

    const wpSample = await requestBytes("/api/data-tools/samples/wp");
    assert.equal(wpSample.response.status, 200);
    assert.match(
      wpSample.response.headers.get("content-type") ?? "",
      /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/i,
    );
    assert.match(
      wpSample.response.headers.get("content-disposition") ?? "",
      /simpatda-wp-import-sample\.xlsx/i,
    );
    const wpRows = readFirstSheetRows(wpSample.body);
    assert.deepEqual(wpRows[0], ["jenis_wp", "peran_wp", "npwpd", "status_aktif", "nama_subjek", "nik_subjek", "alamat_subjek", "kecamatan_subjek", "kelurahan_subjek", "telepon_wa_subjek", "email_subjek", "nama_badan_usaha", "npwp_badan_usaha", "alamat_badan_usaha", "kecamatan_badan_usaha", "kelurahan_badan_usaha", "telepon_badan_usaha", "email_badan_usaha"]);

    const opSample = await requestBytes("/api/data-tools/samples/op");
    assert.equal(opSample.response.status, 200);
    assert.match(
      opSample.response.headers.get("content-type") ?? "",
      /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/i,
    );
    assert.match(
      opSample.response.headers.get("content-disposition") ?? "",
      /simpatda-op-import-sample\.xlsx/i,
    );
    const opRows = readFirstSheetRows(opSample.body);
    assert.deepEqual(opRows[0], [
      "npwpd",
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
      "nopd",
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
    ]);
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
