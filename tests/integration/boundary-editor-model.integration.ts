import assert from "node:assert/strict";

async function loadBoundaryEditorModelModule() {
  try {
    return await import("../../client/src/lib/backoffice/boundary-editor-model.ts");
  } catch {
    return null;
  }
}

async function run() {
  const boundaryEditorModelModule = await loadBoundaryEditorModelModule();
  assert.ok(boundaryEditorModelModule, "boundary editor model harus tersedia");

  const {
    parseBoundaryUpload,
    buildDraftFeaturePayload,
    createBoundaryImpactPanelModel,
  } = boundaryEditorModelModule as {
    parseBoundaryUpload?: (fileText: string) =>
      | {
          success: true;
          geometry: {
            type: "Polygon" | "MultiPolygon";
            coordinates: unknown;
          };
        }
      | {
          success: false;
          message: string;
        };
    buildDraftFeaturePayload?: (params: {
      boundaryKey: string;
      kecamatanId: string;
      kelurahanId: string;
      namaDesa: string;
      geometry: {
        type: "Polygon" | "MultiPolygon";
        coordinates: unknown;
      };
    }) => {
      boundaryKey: string;
      level: "desa";
      kecamatanId: string;
      kelurahanId: string;
      namaDesa: string;
      geometry: {
        type: "Polygon" | "MultiPolygon";
        coordinates: unknown;
      };
    };
    createBoundaryImpactPanelModel?: (params: {
      impactedCount: number;
      sampleMoves: Array<{
        opId: number;
        namaOp: string;
        fromKelurahan: string;
        toKelurahan: string;
      }>;
      hasPreview: boolean;
      hasDraftChanges: boolean;
      publishedRevisionCount: number;
    }) => {
      headline: string;
      badgeLabel: string;
      canPublish: boolean;
      canPreview: boolean;
      sampleRows: string[];
      historyLabel: string;
    };
  };

  assert.equal(typeof parseBoundaryUpload, "function", "parser upload boundary wajib diexport");
  assert.equal(typeof buildDraftFeaturePayload, "function", "builder payload draft boundary wajib diexport");
  assert.equal(typeof createBoundaryImpactPanelModel, "function", "model impact panel boundary wajib diexport");

  const polygonUpload = parseBoundaryUpload!(
    JSON.stringify({
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: { source: "manual" },
          geometry: {
            type: "Polygon",
            coordinates: [
              [
                [104.07, -4.55],
                [104.08, -4.55],
                [104.08, -4.54],
                [104.07, -4.55],
              ],
            ],
          },
        },
      ],
    }),
  );

  assert.deepEqual(
    polygonUpload,
    {
      success: true,
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [104.07, -4.55],
            [104.08, -4.55],
            [104.08, -4.54],
            [104.07, -4.55],
          ],
        ],
      },
    },
    "upload polygon tunggal harus lolos dan geometri-nya dinormalisasi",
  );

  assert.deepEqual(
    buildDraftFeaturePayload!({
      boundaryKey: "muaradua:batu-belang-jaya",
      kecamatanId: "1609040",
      kelurahanId: "1609040013",
      namaDesa: "Batu Belang Jaya",
      geometry: polygonUpload.success ? polygonUpload.geometry : { type: "Polygon", coordinates: [] },
    }),
    {
      boundaryKey: "muaradua:batu-belang-jaya",
      level: "desa",
      kecamatanId: "1609040",
      kelurahanId: "1609040013",
      namaDesa: "Batu Belang Jaya",
      geometry: {
        type: "Polygon",
        coordinates: [
          [
            [104.07, -4.55],
            [104.08, -4.55],
            [104.08, -4.54],
            [104.07, -4.55],
          ],
        ],
      },
    },
    "builder payload draft harus menghasilkan contract admin boundary yang siap dikirim ke backend",
  );

  assert.deepEqual(
    parseBoundaryUpload!(
      JSON.stringify({
        type: "FeatureCollection",
        features: [],
      }),
    ),
    {
      success: false,
      message: "File GeoJSON harus berisi tepat satu polygon desa/kelurahan",
    },
    "feature collection kosong harus menghasilkan pesan validasi yang jelas",
  );

  assert.deepEqual(
    parseBoundaryUpload!(
      JSON.stringify({
        type: "FeatureCollection",
        features: [
          {
            type: "Feature",
            geometry: { type: "Polygon", coordinates: [[[104.07, -4.55], [104.08, -4.55], [104.07, -4.55]]] },
            properties: {},
          },
          {
            type: "Feature",
            geometry: { type: "Polygon", coordinates: [[[104.07, -4.56], [104.08, -4.56], [104.07, -4.56]]] },
            properties: {},
          },
        ],
      }),
    ),
    {
      success: false,
      message: "File GeoJSON harus berisi tepat satu polygon desa/kelurahan",
    },
    "lebih dari satu feature tidak boleh diterima untuk upload boundary",
  );

  assert.deepEqual(
    parseBoundaryUpload!(
      JSON.stringify({
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: [
            [104.07, -4.55],
            [104.08, -4.54],
          ],
        },
      }),
    ),
    {
      success: false,
      message: "Geometry boundary harus bertipe Polygon atau MultiPolygon",
    },
    "geometry non-polygon harus ditolak dengan pesan yang terbaca",
  );

  assert.deepEqual(
    createBoundaryImpactPanelModel!({
      impactedCount: 2,
      sampleMoves: [
        {
          opId: 41,
          namaOp: "Cemara Homestay",
          fromKelurahan: "Bumi Agung",
          toKelurahan: "Batu Belang Jaya",
        },
      ],
      hasPreview: true,
      hasDraftChanges: true,
      publishedRevisionCount: 3,
    }),
    {
      headline: "2 OP terdampak",
      badgeLabel: "READY",
      canPublish: true,
      canPreview: true,
      sampleRows: ["Cemara Homestay: Bumi Agung -> Batu Belang Jaya"],
      historyLabel: "3 published revision",
    },
    "impact panel model harus menurunkan count, badge, sample row, dan riwayat revision",
  );
}

run()
  .then(() => {
    console.log("[integration] boundary-editor-model: PASS");
  })
  .catch((error) => {
    console.error("[integration] boundary-editor-model: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
