import assert from "node:assert/strict";

async function loadPublicMapOpListModelModule() {
  try {
    return await import("../../client/src/lib/map/public-map-op-list-model.ts");
  } catch {
    return null;
  }
}

async function run() {
  const opListModelModule = await loadPublicMapOpListModelModule();
  assert.ok(opListModelModule, "helper model rail OP publik harus tersedia");

  const { createPublicMapOpRailModel } = opListModelModule as {
    createPublicMapOpRailModel?: (params: {
      stage: "kabupaten" | "kecamatan" | "desa";
      markers: Array<{
        id: string | number;
        focusKey: string;
        namaOp: string;
        nopd: string | null;
        jenisPajak: string;
        alamatOp: string | null;
        latitude: number;
        longitude: number;
        pajakBulanan?: string | null;
      }>;
      selectedTaxType: string;
      compactViewport: boolean;
    }) => {
      visible: boolean;
      title: string;
      countLabel: string;
      rows: Array<{
        id: string | number;
        title: string;
        subtitle: string;
        meta: string;
      }>;
      emptyMessage: string | null;
    };
  };

  assert.equal(typeof createPublicMapOpRailModel, "function", "builder rail OP wajib diexport");

  const markers = [
    {
      id: 3,
      focusKey: "3",
      namaOp: "Walet Budi",
      nopd: "13.01.01.0008",
      jenisPajak: "Pajak Sarang Burung Walet",
      alamatOp: "Batu Belang Jaya",
      latitude: -4.1,
      longitude: 104.1,
      pajakBulanan: "400000",
    },
    {
      id: 1,
      focusKey: "1",
      namaOp: "Aula Harmoni",
      nopd: "13.01.01.0003",
      jenisPajak: "Pajak Hiburan",
      alamatOp: "Batu Belang Jaya",
      latitude: -4.11,
      longitude: 104.11,
      pajakBulanan: "250000",
    },
    {
      id: 2,
      focusKey: "2",
      namaOp: "Walet Andi",
      nopd: "13.01.01.0001",
      jenisPajak: "Pajak Sarang Burung Walet",
      alamatOp: "Batu Belang Jaya",
      latitude: -4.12,
      longitude: 104.12,
      pajakBulanan: "500000",
    },
  ];

  assert.deepEqual(
    createPublicMapOpRailModel!({
      stage: "kabupaten",
      markers,
      selectedTaxType: "all",
      compactViewport: false,
    }),
    {
      visible: false,
      title: "Objek Pajak di Desa Ini",
      countLabel: "0 OP",
      rows: [],
      emptyMessage: null,
    },
    "rail desktop tidak boleh aktif di luar tahap desa",
  );

  assert.deepEqual(
    createPublicMapOpRailModel!({
      stage: "desa",
      markers,
      selectedTaxType: "all",
      compactViewport: true,
    }),
    {
      visible: false,
      title: "Objek Pajak di Desa Ini",
      countLabel: "0 OP",
      rows: [],
      emptyMessage: null,
    },
    "rail tidak boleh tampil di viewport mobile",
  );

  assert.deepEqual(
    createPublicMapOpRailModel!({
      stage: "desa",
      markers,
      selectedTaxType: "all",
      compactViewport: false,
    }),
    {
      visible: true,
      title: "Objek Pajak di Desa Ini",
      countLabel: "3 OP",
      rows: [
        {
          id: 1,
          title: "Aula Harmoni",
          subtitle: "Pajak Hiburan",
          meta: "NOPD 13.01.01.0003",
        },
        {
          id: 2,
          title: "Walet Andi",
          subtitle: "Pajak Sarang Burung Walet",
          meta: "NOPD 13.01.01.0001",
        },
        {
          id: 3,
          title: "Walet Budi",
          subtitle: "Pajak Sarang Burung Walet",
          meta: "NOPD 13.01.01.0008",
        },
      ],
      emptyMessage: null,
    },
    "rail desa desktop harus tersortir deterministik berdasarkan jenis pajak lalu nama OP",
  );

  assert.deepEqual(
    createPublicMapOpRailModel!({
      stage: "desa",
      markers,
      selectedTaxType: "Pajak Sarang Burung Walet",
      compactViewport: false,
    }),
    {
      visible: true,
      title: "Objek Pajak di Desa Ini",
      countLabel: "2 OP",
      rows: [
        {
          id: 2,
          title: "Walet Andi",
          subtitle: "Pajak Sarang Burung Walet",
          meta: "NOPD 13.01.01.0001",
        },
        {
          id: 3,
          title: "Walet Budi",
          subtitle: "Pajak Sarang Burung Walet",
          meta: "NOPD 13.01.01.0008",
        },
      ],
      emptyMessage: null,
    },
    "rail harus mengikuti filter jenis pajak yang aktif",
  );

  assert.deepEqual(
    createPublicMapOpRailModel!({
      stage: "desa",
      markers,
      selectedTaxType: "Pajak Air Tanah",
      compactViewport: false,
    }),
    {
      visible: true,
      title: "Objek Pajak di Desa Ini",
      countLabel: "0 OP",
      rows: [],
      emptyMessage: "Belum ada objek pajak yang cocok dengan filter aktif.",
    },
    "empty state rail harus jujur saat tidak ada OP yang cocok",
  );
}

run()
  .then(() => {
    console.log("[integration] public-map-op-list-model: PASS");
  })
  .catch((error) => {
    console.error("[integration] public-map-op-list-model: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
