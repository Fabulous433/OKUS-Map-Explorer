import assert from "node:assert/strict";

async function loadPublicMapRegionSearchModule() {
  try {
    return await import("../../client/src/lib/map/public-map-region-search.ts");
  } catch {
    return null;
  }
}

async function run() {
  const regionSearchModule = await loadPublicMapRegionSearchModule();
  assert.ok(regionSearchModule, "helper region quick jump public map harus tersedia");

  const { buildPublicMapRegionJumpGroups } = regionSearchModule as {
    buildPublicMapRegionJumpGroups?: (params: {
      query: string;
      selectedKecamatanId: string | null;
      kecamatan: Array<{ id: string; nama: string }>;
      desa: Array<{ kecamatanId: string; nama: string }>;
    }) => Array<{
      group: string;
      items: Array<{
        type: "kecamatan" | "desa";
        kecamatanId: string;
        desaKey?: string;
        label: string;
        parentLabel?: string;
      }>;
    }>;
  };

  assert.equal(typeof buildPublicMapRegionJumpGroups, "function", "builder group quick jump wajib diexport");

  const kecamatan = [
    { id: "1609040", nama: "Muara Dua" },
    { id: "1609050", nama: "Simpang" },
    { id: "1609060", nama: "Buay Sandang Aji" },
  ];
  const desa = [
    { kecamatanId: "1609040", nama: "Batu Belang Jaya" },
    { kecamatanId: "1609040", nama: "Pelangki" },
    { kecamatanId: "1609050", nama: "Ujan Mas" },
  ];

  assert.deepEqual(
    buildPublicMapRegionJumpGroups!({
      query: "",
      selectedKecamatanId: null,
      kecamatan,
      desa,
    }),
    [],
    "query kosong tidak boleh memunculkan hasil quick jump",
  );

  assert.deepEqual(
    buildPublicMapRegionJumpGroups!({
      query: "mua",
      selectedKecamatanId: null,
      kecamatan,
      desa,
    }),
    [
      {
        group: "Kecamatan",
        items: [
          {
            type: "kecamatan",
            kecamatanId: "1609040",
            label: "Muara Dua",
          },
        ],
      },
    ],
    "tanpa kecamatan aktif, quick jump publik minimal harus bisa mencari kecamatan",
  );

  assert.deepEqual(
    buildPublicMapRegionJumpGroups!({
      query: "Muara Dua",
      selectedKecamatanId: null,
      kecamatan: [{ id: "1609040", nama: "Muaradua" }],
      desa: [],
    }),
    [
      {
        group: "Kecamatan",
        items: [
          {
            type: "kecamatan",
            kecamatanId: "1609040",
            label: "Muaradua",
          },
        ],
      },
    ],
    "matcher quick jump harus toleran terhadap spasi user untuk nama wilayah yang tersimpan rapat",
  );

  assert.deepEqual(
    buildPublicMapRegionJumpGroups!({
      query: "batu",
      selectedKecamatanId: "1609040",
      kecamatan,
      desa,
    }),
    [
      {
        group: "Desa / Kelurahan",
        items: [
          {
            type: "desa",
            kecamatanId: "1609040",
            desaKey: "1609040:batu-belang-jaya",
            label: "Batu Belang Jaya",
            parentLabel: "Muara Dua",
          },
        ],
      },
    ],
    "ketika kecamatan aktif, quick jump harus bisa mencari desa scoped dengan key stabil",
  );

  assert.deepEqual(
    buildPublicMapRegionJumpGroups!({
      query: "a",
      selectedKecamatanId: "1609040",
      kecamatan,
      desa,
    }),
    [
      {
        group: "Kecamatan",
        items: [
          {
            type: "kecamatan",
            kecamatanId: "1609060",
            label: "Buay Sandang Aji",
          },
          {
            type: "kecamatan",
            kecamatanId: "1609040",
            label: "Muara Dua",
          },
          {
            type: "kecamatan",
            kecamatanId: "1609050",
            label: "Simpang",
          },
        ],
      },
      {
        group: "Desa / Kelurahan",
        items: [
          {
            type: "desa",
            kecamatanId: "1609040",
            desaKey: "1609040:batu-belang-jaya",
            label: "Batu Belang Jaya",
            parentLabel: "Muara Dua",
          },
          {
            type: "desa",
            kecamatanId: "1609040",
            desaKey: "1609040:pelangki",
            label: "Pelangki",
            parentLabel: "Muara Dua",
          },
        ],
      },
    ],
    "hasil quick jump harus tetap terkelompok dan tersortir stabil",
  );
}

run()
  .then(() => {
    console.log("[integration] public-map-region-search: PASS");
  })
  .catch((error) => {
    console.error("[integration] public-map-region-search: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
