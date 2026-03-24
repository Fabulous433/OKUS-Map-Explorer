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
    BOUNDARY_EDITOR_BASE_MAPS,
    DEFAULT_BOUNDARY_EDITOR_BASE_MAP_KEY,
    countBoundaryGeometryVertices,
    simplifyBoundaryEditingGeometry,
    createEditableBoundaryGeometryParts,
    mergeEditableBoundaryGeometryParts,
    filterTopologyAnalysisForBoundary,
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
      topologyReadyForPublish?: boolean;
    }) => {
      headline: string;
      badgeLabel: string;
      canPublish: boolean;
      canPreview: boolean;
      sampleRows: string[];
      historyLabel: string;
    };
    BOUNDARY_EDITOR_BASE_MAPS?: Record<string, { name: string }>;
    DEFAULT_BOUNDARY_EDITOR_BASE_MAP_KEY?: string;
    countBoundaryGeometryVertices?: (geometry: {
      type: "Polygon" | "MultiPolygon";
      coordinates: unknown;
    }) => number;
    simplifyBoundaryEditingGeometry?: (geometry: {
      type: "Polygon" | "MultiPolygon";
      coordinates: unknown;
    }) => {
      type: "Polygon" | "MultiPolygon";
      coordinates: unknown;
    } | null;
    createEditableBoundaryGeometryParts?: (geometry: {
      type: "Polygon" | "MultiPolygon";
      coordinates: unknown;
    }) => Array<{
      type: "Polygon";
      coordinates: unknown;
    }>;
    mergeEditableBoundaryGeometryParts?: (
      parts: Array<{
        type: "Polygon";
        coordinates: unknown;
      }>,
    ) => {
      type: "Polygon" | "MultiPolygon";
      coordinates: unknown;
    } | null;
    filterTopologyAnalysisForBoundary?: (input: {
      revisionId: number;
      regionKey: string;
      level: "desa";
      topologyStatus: "draft-editing" | "draft-needs-resolution" | "draft-ready" | "published" | "superseded";
      summary: {
        fragmentCount: number;
        unresolvedFragmentCount: number;
        autoAssignedFragmentCount: number;
        manualAssignmentRequiredCount: number;
        invalidFragmentCount: number;
      };
      fragments: Array<{
        fragmentId: string;
        type: "released-fragment" | "takeover-area";
        sourceBoundaryKey: string;
        candidateBoundaryKeys: string[];
        assignedBoundaryKey: string | null;
        assignmentMode: "auto" | "manual" | null;
        status: "unresolved" | "resolved" | "invalid";
        geometry: {
          type: "Polygon" | "MultiPolygon";
          coordinates: unknown;
        };
        areaSqM: number;
      }>;
    }, selectedBoundaryKey?: string) => {
      fragments: Array<{ fragmentId: string }>;
      summary: {
        fragmentCount: number;
        unresolvedFragmentCount: number;
        autoAssignedFragmentCount: number;
        manualAssignmentRequiredCount: number;
        invalidFragmentCount: number;
      };
    };
  };

  assert.equal(typeof parseBoundaryUpload, "function", "parser upload boundary wajib diexport");
  assert.equal(typeof buildDraftFeaturePayload, "function", "builder payload draft boundary wajib diexport");
  assert.equal(typeof createBoundaryImpactPanelModel, "function", "model impact panel boundary wajib diexport");
  assert.equal(typeof countBoundaryGeometryVertices, "function", "counter vertex boundary wajib diexport");
  assert.equal(typeof simplifyBoundaryEditingGeometry, "function", "simplifier geometry editor wajib diexport");
  assert.equal(
    typeof createEditableBoundaryGeometryParts,
    "function",
    "multipart geometry helper untuk editor leaflet wajib diexport",
  );
  assert.equal(
    typeof mergeEditableBoundaryGeometryParts,
    "function",
    "combiner geometry edit leaflet wajib diexport",
  );
  assert.equal(
    typeof filterTopologyAnalysisForBoundary,
    "function",
    "filter topology per desa aktif wajib diexport",
  );
  assert.equal(DEFAULT_BOUNDARY_EDITOR_BASE_MAP_KEY, "esri", "basemap default editor boundary harus ESRI");
  assert.deepEqual(
    Object.keys(BOUNDARY_EDITOR_BASE_MAPS ?? {}),
    ["esri", "osm", "carto"],
    "editor boundary harus menyediakan pilihan basemap ESRI, OSM, dan CartoDB",
  );

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
      topologyReadyForPublish: true,
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

  assert.deepEqual(
    createBoundaryImpactPanelModel!({
      impactedCount: 0,
      sampleMoves: [],
      hasPreview: true,
      hasDraftChanges: true,
      publishedRevisionCount: 3,
      topologyReadyForPublish: false,
    }),
    {
      headline: "Preview selesai, tetapi revisi belum siap dipublish",
      badgeLabel: "DRAFT",
      canPublish: false,
      canPreview: true,
      sampleRows: [],
      historyLabel: "3 published revision",
    },
    "impact panel model tidak boleh READY bila revisi global masih tertahan",
  );

  const denseGeometry = {
    type: "Polygon" as const,
    coordinates: [
      [
        [104.07, -4.55],
        [104.071, -4.5502],
        [104.072, -4.5504],
        [104.073, -4.5506],
        [104.074, -4.5508],
        [104.075, -4.551],
        [104.076, -4.5512],
        [104.077, -4.5514],
        [104.078, -4.5516],
        [104.079, -4.5518],
        [104.08, -4.552],
        [104.081, -4.5522],
        [104.082, -4.5524],
        [104.083, -4.5526],
        [104.084, -4.5528],
        [104.085, -4.553],
        [104.086, -4.5532],
        [104.087, -4.5534],
        [104.088, -4.5536],
        [104.089, -4.5538],
        [104.09, -4.554],
        [104.091, -4.5542],
        [104.092, -4.5544],
        [104.093, -4.5546],
        [104.094, -4.5548],
        [104.095, -4.555],
        [104.096, -4.5552],
        [104.097, -4.5554],
        [104.098, -4.5556],
        [104.099, -4.5558],
        [104.1, -4.556],
        [104.101, -4.5562],
        [104.102, -4.5564],
        [104.103, -4.5566],
        [104.104, -4.5568],
        [104.105, -4.557],
        [104.106, -4.5572],
        [104.107, -4.5574],
        [104.108, -4.5576],
        [104.109, -4.5578],
        [104.11, -4.558],
        [104.111, -4.5582],
        [104.112, -4.5584],
        [104.113, -4.5586],
        [104.114, -4.5588],
        [104.115, -4.559],
        [104.116, -4.5592],
        [104.117, -4.5594],
        [104.118, -4.5596],
        [104.119, -4.5598],
        [104.12, -4.56],
        [104.12, -4.565],
        [104.11, -4.566],
        [104.1, -4.567],
        [104.09, -4.568],
        [104.08, -4.569],
        [104.07, -4.57],
        [104.069, -4.565],
        [104.068, -4.56],
        [104.067, -4.555],
        [104.07, -4.55],
      ],
    ],
  };

  const simplifiedDenseGeometry = simplifyBoundaryEditingGeometry!(denseGeometry);
  assert.ok(simplifiedDenseGeometry, "geometry padat harus tetap menghasilkan polygon valid");
  assert.ok(
    countBoundaryGeometryVertices!(simplifiedDenseGeometry!) < countBoundaryGeometryVertices!(denseGeometry),
    "geometry edit yang sangat padat harus disederhanakan agar handle vertex tidak terlalu rapat",
  );

  const multipartGeometry = {
    type: "MultiPolygon" as const,
    coordinates: [
      [
        [
          [104.07, -4.55],
          [104.08, -4.55],
          [104.08, -4.54],
          [104.07, -4.54],
          [104.07, -4.55],
        ],
      ],
      [
        [
          [104.1, -4.57],
          [104.11, -4.57],
          [104.11, -4.56],
          [104.1, -4.56],
          [104.1, -4.57],
        ],
      ],
    ],
  };

  const editableParts = createEditableBoundaryGeometryParts!(multipartGeometry);
  assert.deepEqual(
    editableParts,
    [
      {
        type: "Polygon",
        coordinates: [
          [
            [104.07, -4.55],
            [104.08, -4.55],
            [104.08, -4.54],
            [104.07, -4.54],
            [104.07, -4.55],
          ],
        ],
      },
      {
        type: "Polygon",
        coordinates: [
          [
            [104.1, -4.57],
            [104.11, -4.57],
            [104.11, -4.56],
            [104.1, -4.56],
            [104.1, -4.57],
          ],
        ],
      },
    ],
    "geometry multipart harus dipecah menjadi beberapa polygon edit-safe agar leaflet draw tidak crash saat edit mode aktif",
  );

  assert.deepEqual(
    mergeEditableBoundaryGeometryParts!(editableParts),
    multipartGeometry,
    "seluruh polygon part yang diedit terpisah harus digabung kembali menjadi geometry runtime yang utuh saat save draft",
  );

  const filteredTopology = filterTopologyAnalysisForBoundary!(
    {
      revisionId: 17,
      regionKey: "okus",
      level: "desa",
      topologyStatus: "draft-needs-resolution",
      summary: {
        fragmentCount: 4,
        unresolvedFragmentCount: 2,
        autoAssignedFragmentCount: 1,
        manualAssignmentRequiredCount: 1,
        invalidFragmentCount: 1,
      },
      fragments: [
        {
          fragmentId: "release-active",
          type: "released-fragment",
          sourceBoundaryKey: "muaraduakisam:ulak-agung-ulu",
          candidateBoundaryKeys: ["muaraduakisam:sugihan"],
          assignedBoundaryKey: null,
          assignmentMode: null,
          status: "unresolved",
          geometry: multipartGeometry,
          areaSqM: 100,
        },
        {
          fragmentId: "takeover-active",
          type: "takeover-area",
          sourceBoundaryKey: "muaraduakisam:dusun-tengah",
          candidateBoundaryKeys: ["muaraduakisam:dusun-tengah"],
          assignedBoundaryKey: "muaraduakisam:ulak-agung-ulu",
          assignmentMode: "manual",
          status: "resolved",
          geometry: multipartGeometry,
          areaSqM: 90,
        },
        {
          fragmentId: "other-village-invalid",
          type: "released-fragment",
          sourceBoundaryKey: "muaraduakisam:desa-lain",
          candidateBoundaryKeys: [],
          assignedBoundaryKey: null,
          assignmentMode: null,
          status: "invalid",
          geometry: multipartGeometry,
          areaSqM: 10,
        },
        {
          fragmentId: "other-village-auto",
          type: "released-fragment",
          sourceBoundaryKey: "muaraduakisam:desa-lain",
          candidateBoundaryKeys: ["muaraduakisam:sugihan"],
          assignedBoundaryKey: "muaraduakisam:sugihan",
          assignmentMode: "auto",
          status: "resolved",
          geometry: multipartGeometry,
          areaSqM: 12,
        },
        {
          fragmentId: "candidate-only-neighbor",
          type: "released-fragment",
          sourceBoundaryKey: "muaraduakisam:desa-tetangga",
          candidateBoundaryKeys: ["muaraduakisam:ulak-agung-ulu"],
          assignedBoundaryKey: null,
          assignmentMode: null,
          status: "unresolved",
          geometry: multipartGeometry,
          areaSqM: 11,
        },
      ],
    },
    "muaraduakisam:ulak-agung-ulu",
  );

  assert.deepEqual(
    filteredTopology.fragments.map((fragment) => fragment.fragmentId),
    ["release-active", "takeover-active"],
    "panel dan peta desa aktif tidak boleh ikut menampilkan area tetangga hanya karena desa aktif muncul sebagai kandidat",
  );
  assert.deepEqual(
    filteredTopology.summary,
    {
      fragmentCount: 2,
      unresolvedFragmentCount: 1,
      autoAssignedFragmentCount: 0,
      manualAssignmentRequiredCount: 1,
      invalidFragmentCount: 0,
    },
    "summary topology desa aktif harus dihitung ulang setelah area desa lain disaring keluar",
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
