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
  assert.ok(boundaryEditorModelModule, "boundary editor model topology harus tersedia");

  const {
    createBoundaryTopologyPanelModel,
    createTakeoverWarningModel,
    canPreviewBoundaryRevision,
    canPublishBoundaryRevision,
  } = boundaryEditorModelModule as {
    createBoundaryTopologyPanelModel?: (input: {
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
      requiresTakeoverConfirmation?: boolean;
    }) => {
      badgeLabel: string;
      headline: string;
      canPreview: boolean;
      canPublish: boolean;
      manualResolutionQueue: Array<{
        fragmentId: string;
        candidateBoundaryKeys: string[];
        type: "released-fragment" | "takeover-area";
        sourceBoundaryKey: string;
        status: "unresolved" | "invalid";
        canAssign: boolean;
        resolutionMessage: string;
      }>;
      informationalRows: string[];
      takeoverDetected: boolean;
      sharedDraftLabel: string;
      invalidLabel: string;
    };
    createTakeoverWarningModel?: (input: {
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
      requiresTakeoverConfirmation?: boolean;
    }) => {
      visible: boolean;
      title: string;
      message: string;
    };
    canPreviewBoundaryRevision?: (input: {
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
      requiresTakeoverConfirmation?: boolean;
    }) => boolean;
    canPublishBoundaryRevision?: (
      input: {
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
        requiresTakeoverConfirmation?: boolean;
      },
      previewReady: boolean,
    ) => boolean;
  };

  assert.equal(
    typeof createBoundaryTopologyPanelModel,
    "function",
    "helper panel topology boundary wajib diexport",
  );
  assert.equal(
    typeof createTakeoverWarningModel,
    "function",
    "helper warning takeover boundary wajib diexport",
  );
  assert.equal(typeof canPreviewBoundaryRevision, "function", "helper preview gate boundary wajib diexport");
  assert.equal(typeof canPublishBoundaryRevision, "function", "helper publish gate boundary wajib diexport");

  const dirtyTopology = {
    topologyStatus: "draft-needs-resolution" as const,
    summary: {
      fragmentCount: 4,
      unresolvedFragmentCount: 1,
      autoAssignedFragmentCount: 1,
      manualAssignmentRequiredCount: 2,
      invalidFragmentCount: 1,
    },
    fragments: [
      {
        fragmentId: "frag-001",
        type: "released-fragment" as const,
        sourceBoundaryKey: "muaradua:bumi-agung",
        candidateBoundaryKeys: ["muaradua:batu-belang-jaya", "runjungagung:desa-contoh"],
        assignedBoundaryKey: null,
        assignmentMode: null,
        status: "unresolved" as const,
        geometry: {
          type: "Polygon" as const,
          coordinates: [[[104.09, -4.54]]],
        },
        areaSqM: 1200,
      },
      {
        fragmentId: "frag-002",
        type: "released-fragment" as const,
        sourceBoundaryKey: "muaradua:bumi-agung",
        candidateBoundaryKeys: ["muaradua:batu-belang-jaya"],
        assignedBoundaryKey: "muaradua:batu-belang-jaya",
        assignmentMode: "auto" as const,
        status: "resolved" as const,
        geometry: {
          type: "Polygon" as const,
          coordinates: [[[104.1, -4.55]]],
        },
        areaSqM: 800,
      },
      {
        fragmentId: "frag-002b",
        type: "released-fragment" as const,
        sourceBoundaryKey: "muaradua:pancur-pungah",
        candidateBoundaryKeys: [],
        assignedBoundaryKey: null,
        assignmentMode: null,
        status: "invalid" as const,
        geometry: {
          type: "Polygon" as const,
          coordinates: [[[104.105, -4.551]]],
        },
        areaSqM: 3.25,
      },
      {
        fragmentId: "frag-003",
        type: "takeover-area" as const,
        sourceBoundaryKey: "muaradua:batu-belang-jaya",
        candidateBoundaryKeys: ["muaradua:bumi-agung"],
        assignedBoundaryKey: "muaradua:bumi-agung",
        assignmentMode: "manual" as const,
        status: "resolved" as const,
        geometry: {
          type: "Polygon" as const,
          coordinates: [[[104.11, -4.52]]],
        },
        areaSqM: 500,
      },
    ],
    requiresTakeoverConfirmation: true,
  };

  const dirtyPanel = createBoundaryTopologyPanelModel!(dirtyTopology);
  assert.equal(dirtyPanel.badgeLabel, "NEEDS RESOLUTION", "badge topology harus diturunkan dari status summary");
  assert.equal(dirtyPanel.canPreview, false, "preview harus diblok sampai topology clean");
  assert.equal(dirtyPanel.canPublish, false, "publish harus diblok sampai preview dan topology clean");
  assert.equal(dirtyPanel.manualResolutionQueue.length, 2, "queue resolusi manual harus memuat unresolved dan invalid");
  assert.deepEqual(
    dirtyPanel.manualResolutionQueue[0],
    {
      fragmentId: "frag-001",
      candidateBoundaryKeys: ["muaradua:batu-belang-jaya", "runjungagung:desa-contoh"],
      type: "released-fragment",
      sourceBoundaryKey: "muaradua:bumi-agung",
      status: "unresolved",
      canAssign: true,
      resolutionMessage: "Pilih salah satu desa kandidat untuk fragmen ini.",
    },
    "fragment unresolved harus masuk antrean resolusi manual secara utuh",
  );
  assert.equal(
    dirtyPanel.manualResolutionQueue[1]?.status,
    "invalid",
    "fragment tanpa kandidat harus tetap muncul sebagai invalid, bukan unresolved biasa",
  );
  assert.equal(
    dirtyPanel.manualResolutionQueue[1]?.canAssign,
    false,
    "fragment invalid tanpa kandidat tidak boleh membuka selector desa",
  );
  assert.ok(
    dirtyPanel.manualResolutionQueue[1]?.resolutionMessage.includes("Tidak ada kandidat desa"),
    "fragment invalid harus menjelaskan kenapa dropdown tidak tersedia",
  );
  assert.ok(
    dirtyPanel.informationalRows.some((row) => row.includes("frag-002") && row.includes("auto")),
    "fragment auto-assigned hanya boleh muncul sebagai row informasional",
  );
  assert.equal(dirtyPanel.takeoverDetected, true, "takeover harus terdeteksi dari topology summary");
  assert.ok(
    dirtyPanel.sharedDraftLabel.includes("Revision draft ini mencakup"),
    "panel topology harus menjelaskan bahwa revision draft ini mencakup lebih dari satu desa",
  );
  assert.equal(
    dirtyPanel.invalidLabel,
    "1 invalid",
    "summary topology harus menampilkan jumlah fragment invalid secara eksplisit",
  );

  const takeoverWarning = createTakeoverWarningModel!(dirtyTopology);
  assert.equal(takeoverWarning.visible, true, "warning takeover harus tampil saat ada takeover area");
  assert.ok(
    takeoverWarning.message.includes("Konfirmasi pengambilan wilayah"),
    "warning takeover harus menjelaskan kebutuhan konfirmasi",
  );

  assert.equal(canPreviewBoundaryRevision!(dirtyTopology), false, "preview harus tetap diblok saat topology belum clean");
  assert.equal(
    canPublishBoundaryRevision!(dirtyTopology, false),
    false,
    "publish harus tetap diblok sebelum preview berhasil dan topology clean",
  );

  const confirmedTakeoverTopology = {
    topologyStatus: "draft-ready" as const,
    summary: {
      fragmentCount: 1,
      unresolvedFragmentCount: 0,
      autoAssignedFragmentCount: 0,
      manualAssignmentRequiredCount: 0,
      invalidFragmentCount: 0,
    },
    fragments: [
      {
        fragmentId: "frag-101",
        type: "takeover-area" as const,
        sourceBoundaryKey: "muaradua:batu-belang-jaya",
        candidateBoundaryKeys: ["muaradua:bumi-agung"],
        assignedBoundaryKey: "muaradua:bumi-agung",
        assignmentMode: "manual" as const,
        status: "resolved" as const,
        geometry: {
          type: "Polygon" as const,
          coordinates: [[[104.13, -4.5]]],
        },
        areaSqM: 450,
      },
    ],
    requiresTakeoverConfirmation: false,
  };

  const confirmedTakeoverPanel = createBoundaryTopologyPanelModel!(confirmedTakeoverTopology);
  assert.equal(
    confirmedTakeoverPanel.canPreview,
    true,
    "takeover yang sudah dikonfirmasi tidak boleh lagi memblok preview",
  );
  assert.equal(
    canPublishBoundaryRevision!(confirmedTakeoverTopology, true),
    true,
    "takeover yang sudah dikonfirmasi harus bisa dipublish setelah preview sukses",
  );
  assert.equal(
    createTakeoverWarningModel!(confirmedTakeoverTopology).visible,
    false,
    "warning takeover hanya boleh tampil saat konfirmasi takeover masih dibutuhkan",
  );

  const cleanTopology = {
    topologyStatus: "draft-ready" as const,
    summary: {
      fragmentCount: 0,
      unresolvedFragmentCount: 0,
      autoAssignedFragmentCount: 0,
      manualAssignmentRequiredCount: 0,
      invalidFragmentCount: 0,
    },
    fragments: [],
    requiresTakeoverConfirmation: false,
  };

  const cleanPanel = createBoundaryTopologyPanelModel!(cleanTopology);
  assert.equal(cleanPanel.badgeLabel, "TOPOLOGY CLEAN", "status badge clean harus berbeda dari mode resolusi");
  assert.equal(cleanPanel.canPreview, true, "preview harus dibuka ketika topology clean");
  assert.equal(cleanPanel.canPublish, false, "publish tetap butuh preview sukses");
  assert.equal(canPreviewBoundaryRevision!(cleanTopology), true, "preview harus diizinkan untuk draft ready yang clean");
  assert.equal(canPublishBoundaryRevision!(cleanTopology, true), true, "publish harus diizinkan setelah preview sukses");
}

run()
  .then(() => {
    console.log("[integration] boundary-editor-topology-model: PASS");
  })
  .catch((error) => {
    console.error("[integration] boundary-editor-topology-model: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
