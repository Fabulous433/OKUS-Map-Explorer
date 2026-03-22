import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";

async function loadBoundaryShellModule() {
  try {
    return await import("../../client/src/components/backoffice/boundary-editor-shell.tsx");
  } catch {
    return null;
  }
}

async function loadBoundaryImpactPanelModule() {
  try {
    return await import("../../client/src/components/backoffice/boundary-editor-impact-panel.tsx");
  } catch {
    return null;
  }
}

async function loadBoundaryEditorModelModule() {
  try {
    return await import("../../client/src/lib/backoffice/boundary-editor-model.ts");
  } catch {
    return null;
  }
}

async function loadBoundaryEditorQueryModule() {
  try {
    return await import("../../client/src/lib/backoffice/boundary-editor-query.ts");
  } catch {
    return null;
  }
}

async function run() {
  (globalThis as { React?: typeof React }).React = React;

  const shellModule = await loadBoundaryShellModule();
  assert.ok(shellModule, "shell boundary editor harus tersedia");

  const impactPanelModule = await loadBoundaryImpactPanelModule();
  assert.ok(impactPanelModule, "impact panel boundary editor harus tersedia");

  const modelModule = await loadBoundaryEditorModelModule();
  assert.ok(modelModule, "model boundary editor harus tersedia");
  const queryModule = await loadBoundaryEditorQueryModule();
  assert.ok(queryModule, "query boundary editor harus tersedia");

  const { BoundaryEditorShell } = shellModule as {
    BoundaryEditorShell?: (props: Record<string, unknown>) => JSX.Element;
  };
  const { BoundaryEditorImpactPanel } = impactPanelModule as {
    BoundaryEditorImpactPanel?: (props: Record<string, unknown>) => JSX.Element;
  };
  const {
    createBoundaryTopologyPanelModel,
    createBoundaryResolutionBlocks,
    createTakeoverWarningModel,
    canPreviewBoundaryRevision,
    canPublishBoundaryRevision,
  } = modelModule as {
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
      resolutionBlockLabel: string;
      manualResolutionQueue: Array<{
        blockId: string;
        fragmentIds: string[];
        candidateBoundaryKeys: string[];
        type: "released-fragment" | "takeover-area";
        sourceBoundaryKey: string;
        status: "unresolved" | "invalid";
        canAssign: boolean;
        resolutionMessage: string;
      }>;
      informationalRows: string[];
      takeoverDetected: boolean;
      summaryLabel: string;
      unresolvedLabel: string;
      autoAssignedLabel: string;
      manualAssignmentLabel: string;
    };
    createBoundaryResolutionBlocks?: (input: {
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
    }) => Array<{ blockId: string; fragmentIds: string[] }>;
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
  const { createBoundaryEditorTopologyCandidateOptions } = queryModule as {
    createBoundaryEditorTopologyCandidateOptions?: (params: {
      topologyAnalysis: {
        fragments: Array<{
          sourceBoundaryKey: string;
          candidateBoundaryKeys: string[];
          assignedBoundaryKey: string | null;
        }>;
      } | null;
      kelurahanItems: Array<{
        cpmKelId: string;
        cpmKelurahan: string;
        cpmKodeKec: string;
      }>;
      kecamatanItems: Array<{
        cpmKecId: string;
        cpmKecamatan: string;
        cpmKodeKec: string;
      }>;
    }) => Array<{
      id: string;
      boundaryKey: string;
      label: string;
    }>;
  };

  assert.equal(typeof BoundaryEditorShell, "function", "shell boundary editor wajib diexport");
  assert.equal(typeof BoundaryEditorImpactPanel, "function", "impact panel boundary editor wajib diexport");
  assert.equal(typeof createBoundaryTopologyPanelModel, "function", "helper topology boundary wajib diexport");
  assert.equal(typeof createBoundaryResolutionBlocks, "function", "helper blok area wajib diexport");
  assert.equal(typeof createTakeoverWarningModel, "function", "helper warning takeover boundary wajib diexport");
  assert.equal(typeof canPreviewBoundaryRevision, "function", "helper preview gate boundary wajib diexport");
  assert.equal(typeof canPublishBoundaryRevision, "function", "helper publish gate boundary wajib diexport");
  assert.equal(
    typeof createBoundaryEditorTopologyCandidateOptions,
    "function",
    "helper kandidat topology lintas-kecamatan wajib diexport",
  );

  const unresolvedTopology = {
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
        sourceBoundaryKey: "muaradua:bumi-agung",
        candidateBoundaryKeys: [],
        assignedBoundaryKey: null,
        assignmentMode: null,
        status: "invalid" as const,
        geometry: {
          type: "Polygon" as const,
          coordinates: [[
            [104.099, -4.549],
            [104.1, -4.549],
            [104.1, -4.548],
            [104.099, -4.548],
            [104.099, -4.549],
          ]],
        },
        areaSqM: 1.7,
      },
      {
        fragmentId: "frag-002c",
        type: "released-fragment" as const,
        sourceBoundaryKey: "muaradua:bumi-agung",
        candidateBoundaryKeys: [],
        assignedBoundaryKey: null,
        assignmentMode: null,
        status: "invalid" as const,
        geometry: {
          type: "Polygon" as const,
          coordinates: [[
            [104.1, -4.549],
            [104.101, -4.549],
            [104.101, -4.548],
            [104.1, -4.548],
            [104.1, -4.549],
          ]],
        },
        areaSqM: 0.9,
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

  const cleanTopology = {
    topologyStatus: "draft-ready" as const,
    summary: {
      fragmentCount: 1,
      unresolvedFragmentCount: 0,
      autoAssignedFragmentCount: 1,
      manualAssignmentRequiredCount: 0,
      invalidFragmentCount: 0,
    },
    fragments: [
      {
        fragmentId: "frag-100",
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
    ],
    requiresTakeoverConfirmation: false,
  };

  const dirtyModel = createBoundaryTopologyPanelModel!(unresolvedTopology);
  assert.equal(dirtyModel.badgeLabel, "PERLU DITUNTASKAN", "badge topology harus diturunkan dari status summary");
  assert.equal(
    dirtyModel.resolutionBlockLabel,
    "2 blok area perlu dituntaskan",
    "panel topology harus berbicara dalam blok area, bukan fragment per serpihan",
  );
  assert.equal(
    dirtyModel.manualResolutionQueue.length,
    2,
    "queue resolusi manual harus menampung fragment unresolved dan invalid",
  );
  assert.equal(dirtyModel.takeoverDetected, true, "takeover harus terdeteksi dari topology summary");
  assert.equal(createTakeoverWarningModel!(unresolvedTopology).visible, true, "warning takeover harus tampil saat perlu konfirmasi");
  assert.equal(canPreviewBoundaryRevision!(unresolvedTopology), false, "preview harus diblok saat topology belum clean");
  assert.equal(
    canPublishBoundaryRevision!(unresolvedTopology, false),
    false,
    "publish harus diblok sebelum preview sukses dan topology clean",
  );
  assert.equal(
    canPublishBoundaryRevision!(cleanTopology, true),
    true,
    "publish harus diizinkan setelah topology clean, takeover dikonfirmasi, dan preview sukses",
  );
  assert.equal(
    createBoundaryResolutionBlocks!(unresolvedTopology)[1]?.fragmentIds.length,
    2,
    "fragmen invalid yang saling menempel harus digabung menjadi satu blok area",
  );

  const topologyCandidateOptions = createBoundaryEditorTopologyCandidateOptions!({
    topologyAnalysis: unresolvedTopology,
    kelurahanItems: [
      {
        cpmKelId: "1609040013",
        cpmKelurahan: "Batu Belang Jaya",
        cpmKodeKec: "160904",
      },
      {
        cpmKelId: "1609040012",
        cpmKelurahan: "Bumi Agung",
        cpmKodeKec: "160904",
      },
      {
        cpmKelId: "1609050012",
        cpmKelurahan: "Desa Contoh",
        cpmKodeKec: "160905",
      },
    ],
    kecamatanItems: [
      {
        cpmKecId: "1609040",
        cpmKecamatan: "Muara Dua",
        cpmKodeKec: "160904",
      },
      {
        cpmKecId: "1609050",
        cpmKecamatan: "Runjung Agung",
        cpmKodeKec: "160905",
      },
    ],
  });
  assert.equal(
    topologyCandidateOptions.some(
      (item) => item.boundaryKey === "runjungagung:desa-contoh" && item.label === "Desa Contoh (Runjung Agung)",
    ),
    true,
    "kandidat lintas-kecamatan harus punya label desa + kecamatan yang terbaca",
  );

  const panelMarkup = renderToStaticMarkup(
    createElement(BoundaryEditorImpactPanel as unknown as React.ComponentType<Record<string, unknown>>, {
      impactedCount: 2,
      sampleMoves: [
        {
          opId: 41,
          namaOp: "Cemara Homestay",
          fromKelurahan: "Bumi Agung",
          toKelurahan: "Batu Belang Jaya",
        },
      ],
      hasPreview: false,
      hasDraftChanges: true,
      publishedRevisionCount: 3,
      geometryStatusLabel: "draft-needs-resolution",
      publishMode: "publish-and-reconcile",
      saveDisabled: false,
      previewDisabled: true,
      publishDisabled: true,
      isSaving: false,
      isPreviewing: false,
      isPublishing: false,
      topologyAnalysis: unresolvedTopology,
      topologyRevisionId: 17,
      takeoverConfirmed: false,
      selectedBoundaryKey: "muaradua:batu-belang-jaya",
      desaOptions: topologyCandidateOptions,
      onSaveDraft: () => undefined,
      onPreviewImpact: () => undefined,
      onPublish: () => undefined,
      onConfirmTakeover: () => undefined,
      onAssignFragmentBlock: () => undefined,
      onResetBoundaryDraft: () => undefined,
      onFocusResolutionBlock: () => undefined,
    }),
  );

  assert.ok(
    panelMarkup.includes("PERLU DITUNTASKAN"),
    "save draft harus menampilkan status topology yang belum clean",
  );
  assert.ok(
    panelMarkup.includes("Selesaikan Perubahan Wilayah"),
    "panel kanan harus memakai judul yang lebih natural untuk admin",
  );
  assert.ok(
    panelMarkup.includes("Area yang perlu dicek sudah diberi tanda langsung di peta."),
    "panel harus mengarahkan admin untuk melihat area bermasalah langsung di peta",
  );
  assert.ok(
    panelMarkup.includes("Blok area yang perlu diputuskan"),
    "panel harus menampilkan antrean blok area yang perlu diputuskan",
  );
  assert.ok(
    panelMarkup.includes("Ringkasan perubahan otomatis"),
    "panel harus merangkum perubahan otomatis dengan bahasa yang lebih sederhana",
  );
  assert.ok(
    panelMarkup.includes("Area desa lain yang diambil"),
    "panel harus menjelaskan area takeover dengan bahasa non-teknis",
  );
  assert.ok(
    panelMarkup.includes("Batu Belang Jaya") && panelMarkup.includes("Desa Contoh"),
    "blok area unresolved harus menampilkan kandidat lintas-kecamatan di selector",
  );
  assert.ok(
    panelMarkup.includes("Revision draft ini mencakup") && panelMarkup.includes("Bumi Agung"),
    "panel harus menjelaskan bahwa unresolved bisa datang dari desa draft lain dalam revision yang sama",
  );
  assert.ok(
    panelMarkup.includes("Ada sisa area kecil yang belum jelas masuk ke desa mana"),
    "area invalid harus dijelaskan dengan bahasa manusiawi, bukan istilah teknis invalid semata",
  );
  assert.ok(
    panelMarkup.includes("Rapikan garis edit atau batalkan bagian ini"),
    "panel harus memberi tindakan perbaikan yang jelas untuk area invalid",
  );
  assert.ok(
    panelMarkup.includes("Reset Draft Desa Ini"),
    "panel harus menyediakan aksi reset draft per desa untuk membersihkan unresolved lama",
  );
  assert.ok(
    panelMarkup.includes("Lihat di peta"),
    "setiap blok area yang perlu diputuskan harus bisa disorot di peta",
  );
  assert.ok(
    panelMarkup.includes("Desa yang berbatasan dengan area ini"),
    "pilihan desa manual harus dijelaskan sebagai desa yang berbatasan dengan area, bukan kandidat teknis",
  );
  assert.equal(
    panelMarkup.includes("fragmen mesin digabung menjadi satu blok kerja"),
    false,
    "panel admin tidak boleh lagi menampilkan kalimat teknis fragmen mesin",
  );
  assert.ok(
    panelMarkup.includes("Konfirmasi Pengambilan Wilayah"),
    "takeover warning harus menampilkan CTA konfirmasi eksplisit",
  );
  assert.ok(
    panelMarkup.includes("Preview Impact") && panelMarkup.includes("disabled"),
    "preview harus tetap disabled saat topology draft-needs-resolution",
  );
  assert.ok(
    panelMarkup.includes("Publish") && panelMarkup.includes("disabled"),
    "publish harus tetap disabled sampai topology clean, takeover confirmed, dan preview sukses",
  );

  const shellMarkup = renderToStaticMarkup(
    createElement(
      BoundaryEditorShell as unknown as React.ComponentType<Record<string, unknown>>,
      {
        selectedKecamatanId: "1609040",
        selectedBoundaryKey: "muaradua:batu-belang-jaya",
        kecamatanOptions: [{ id: "1609040", label: "Muaradua" }],
        desaOptions: [
          { id: "1609040013", boundaryKey: "muaradua:batu-belang-jaya", label: "Batu Belang Jaya" },
        ],
        revisionHistory: [],
        isLoading: false,
        lastSavedLabel: "Draft tersimpan 08.30 WIB",
        showDraftStatus: true,
        mapCanvas: createElement("div", { "data-testid": "boundary-editor-map-shell" }, "map"),
        rightPanel: createElement(BoundaryEditorImpactPanel as unknown as React.ComponentType<Record<string, unknown>>, {
          impactedCount: 2,
          sampleMoves: [
            {
              opId: 41,
              namaOp: "Cemara Homestay",
              fromKelurahan: "Bumi Agung",
              toKelurahan: "Batu Belang Jaya",
            },
          ],
          hasPreview: false,
          hasDraftChanges: true,
          publishedRevisionCount: 3,
          geometryStatusLabel: "draft-needs-resolution",
          publishMode: "publish-and-reconcile",
          saveDisabled: false,
          previewDisabled: true,
          publishDisabled: true,
          topologyAnalysis: unresolvedTopology,
          topologyRevisionId: 17,
          takeoverConfirmed: false,
          selectedBoundaryKey: "muaradua:batu-belang-jaya",
          desaOptions: topologyCandidateOptions,
          onSaveDraft: () => undefined,
          onPreviewImpact: () => undefined,
          onPublish: () => undefined,
          onConfirmTakeover: () => undefined,
          onAssignFragmentBlock: () => undefined,
          onResetBoundaryDraft: () => undefined,
          onFocusResolutionBlock: () => undefined,
        }),
      },
    ),
  );

  assert.ok(
    shellMarkup.includes("Batu Belang Jaya") && shellMarkup.includes("Konfirmasi Pengambilan Wilayah"),
    "shell boundary editor harus meneruskan workflow resolusi topology ke panel kanan",
  );
}

run()
  .then(() => {
    console.log("[integration] backoffice-boundary-topology-resolution: PASS");
  })
  .catch((error) => {
    console.error("[integration] backoffice-boundary-topology-resolution: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
