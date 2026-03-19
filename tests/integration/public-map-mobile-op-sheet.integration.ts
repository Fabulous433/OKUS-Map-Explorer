import assert from "node:assert/strict";

async function loadPublicMapMobileOpSheetModule() {
  try {
    return await import("../../client/src/lib/map/public-map-mobile-op-sheet-model.ts");
  } catch {
    return null;
  }
}

async function run() {
  const mobileOpSheetModule = await loadPublicMapMobileOpSheetModule();
  assert.ok(mobileOpSheetModule, "helper bottom sheet OP mobile harus tersedia");

  const {
    createDefaultPublicMapMobileOpSheetState,
    createPublicMapMobileOpSheetModel,
    openPublicMapMobileOpSheetDetail,
    stepBackPublicMapMobileOpSheetState,
    syncPublicMapMobileOpSheetState,
  } = mobileOpSheetModule as {
    createDefaultPublicMapMobileOpSheetState?: () => { mode: "hidden" };
    openPublicMapMobileOpSheetDetail?: (markerId: string | number) => { mode: "detail"; markerId: string | number };
    stepBackPublicMapMobileOpSheetState?: (
      current: { mode: "hidden" } | { mode: "list" } | { mode: "detail"; markerId: string | number },
    ) => { mode: "hidden" } | { mode: "list" } | { mode: "detail"; markerId: string | number };
    syncPublicMapMobileOpSheetState?: (params: {
      current: { mode: "hidden" } | { mode: "list" } | { mode: "detail"; markerId: string | number };
      stage: "kabupaten" | "kecamatan" | "desa";
      compactViewport: boolean;
      markers: Array<{ id: string | number }>;
    }) => { mode: "hidden" } | { mode: "list" } | { mode: "detail"; markerId: string | number };
    createPublicMapMobileOpSheetModel?: (params: {
      stage: "kabupaten" | "kecamatan" | "desa";
      compactViewport: boolean;
      desaName: string | null;
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
      sheetState: { mode: "hidden" } | { mode: "list" } | { mode: "detail"; markerId: string | number };
    }) => {
      visible: boolean;
      mode: "hidden" | "list" | "detail";
      title: string | null;
      countLabel: string | null;
      filterSummary: string | null;
      rows: Array<{
        id: string | number;
        title: string;
        subtitle: string;
        meta: string;
        amountLabel: string;
      }>;
      detail: {
        title: string;
        subtitle: string;
        amountLabel: string;
      } | null;
    };
  };

  assert.equal(
    typeof createDefaultPublicMapMobileOpSheetState,
    "function",
    "state default bottom sheet mobile wajib diexport",
  );
  assert.equal(typeof syncPublicMapMobileOpSheetState, "function", "state sync bottom sheet mobile wajib diexport");
  assert.equal(typeof openPublicMapMobileOpSheetDetail, "function", "detail opener bottom sheet mobile wajib diexport");
  assert.equal(typeof stepBackPublicMapMobileOpSheetState, "function", "state back bottom sheet mobile wajib diexport");
  assert.equal(typeof createPublicMapMobileOpSheetModel, "function", "model bottom sheet mobile wajib diexport");

  const markers = [
    {
      id: 2,
      focusKey: "2",
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
      namaOp: "Walet Andi",
      nopd: "13.01.01.0001",
      jenisPajak: "Pajak Sarang Burung Walet",
      alamatOp: "Batu Belang Jaya",
      latitude: -4.12,
      longitude: 104.12,
      pajakBulanan: "500000",
    },
  ];

  assert.deepEqual(createDefaultPublicMapMobileOpSheetState!(), { mode: "hidden" });

  assert.deepEqual(
    syncPublicMapMobileOpSheetState!({
      current: { mode: "hidden" },
      stage: "desa",
      compactViewport: true,
      markers,
    }),
    { mode: "list" },
    "sheet mobile harus aktif ke mode list saat masuk tahap desa di viewport mobile",
  );

  assert.deepEqual(
    createPublicMapMobileOpSheetModel!({
      stage: "kabupaten",
      compactViewport: true,
      desaName: null,
      markers,
      selectedTaxType: "all",
      sheetState: { mode: "hidden" },
    }),
    {
      visible: false,
      mode: "hidden",
      title: null,
      countLabel: null,
      filterSummary: null,
      rows: [],
      detail: null,
    },
    "bottom sheet tidak boleh aktif di luar tahap desa mobile",
  );

  assert.deepEqual(
    createPublicMapMobileOpSheetModel!({
      stage: "desa",
      compactViewport: true,
      desaName: "Batu Belang Jaya",
      markers,
      selectedTaxType: "all",
      sheetState: { mode: "list" },
    }),
    {
      visible: true,
      mode: "list",
      title: "Batu Belang Jaya",
      countLabel: "2 OP",
      filterSummary: "Semua OP",
      rows: [
        {
          id: 1,
          title: "Walet Andi",
          subtitle: "Pajak Sarang Burung Walet",
          meta: "NOPD 13.01.01.0001",
          amountLabel: "Rp 500.000 / bulan",
        },
        {
          id: 2,
          title: "Walet Budi",
          subtitle: "Pajak Sarang Burung Walet",
          meta: "NOPD 13.01.01.0008",
          amountLabel: "Rp 400.000 / bulan",
        },
      ],
      detail: null,
    },
    "mode list mobile harus menampilkan count desa, ringkasan filter, dan daftar OP tersortir",
  );

  const detailState = openPublicMapMobileOpSheetDetail!(2);
  assert.deepEqual(detailState, { mode: "detail", markerId: 2 });

  assert.deepEqual(
    createPublicMapMobileOpSheetModel!({
      stage: "desa",
      compactViewport: true,
      desaName: "Batu Belang Jaya",
      markers,
      selectedTaxType: "Pajak Sarang Burung Walet",
      sheetState: detailState,
    }),
    {
      visible: true,
      mode: "detail",
      title: "Batu Belang Jaya",
      countLabel: "2 OP",
      filterSummary: "WLT",
      rows: [
        {
          id: 1,
          title: "Walet Andi",
          subtitle: "Pajak Sarang Burung Walet",
          meta: "NOPD 13.01.01.0001",
          amountLabel: "Rp 500.000 / bulan",
        },
        {
          id: 2,
          title: "Walet Budi",
          subtitle: "Pajak Sarang Burung Walet",
          meta: "NOPD 13.01.01.0008",
          amountLabel: "Rp 400.000 / bulan",
        },
      ],
      detail: {
        title: "Walet Budi",
        subtitle: "Pajak Sarang Burung Walet",
        amountLabel: "Rp 400.000 / bulan",
      },
    },
    "mode detail mobile harus memuat ringkasan marker yang dipilih",
  );

  assert.deepEqual(
    stepBackPublicMapMobileOpSheetState!(detailState),
    { mode: "list" },
    "back dari detail harus kembali ke list, bukan keluar dari tahap desa",
  );
}

run()
  .then(() => {
    console.log("[integration] public-map-mobile-op-sheet: PASS");
  })
  .catch((error) => {
    console.error("[integration] public-map-mobile-op-sheet: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
