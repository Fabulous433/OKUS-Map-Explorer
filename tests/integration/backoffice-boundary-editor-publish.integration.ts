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

async function run() {
  (globalThis as { React?: typeof React }).React = React;

  const shellModule = await loadBoundaryShellModule();
  assert.ok(shellModule, "shell boundary editor harus tersedia");

  const impactPanelModule = await loadBoundaryImpactPanelModule();
  assert.ok(impactPanelModule, "impact panel boundary editor harus tersedia");

  const modelModule = await loadBoundaryEditorModelModule();
  assert.ok(modelModule, "model boundary editor harus tersedia");

  const { BoundaryEditorShell } = shellModule as {
    BoundaryEditorShell?: (props: {
      selectedKecamatanId: string;
      selectedBoundaryKey: string;
      kecamatanOptions: Array<{ id: string; label: string }>;
      desaOptions: Array<{ id: string; boundaryKey: string; label: string }>;
      revisions: Array<{
        id: number;
        regionKey: string;
        level: "desa";
        status: "draft" | "published" | "superseded";
        notes: string | null;
        createdBy: string;
        publishedBy: string | null;
        publishedAt: string | null;
        impactSummary: { impactedCount: number; movedItems: [] } | null;
        createdAt: string;
        updatedAt: string;
      }>;
      onRollbackRevision?: (revisionId: number) => void;
    }) => JSX.Element;
  };
  const { BoundaryEditorImpactPanel } = impactPanelModule as {
    BoundaryEditorImpactPanel?: (props: {
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
      geometryStatusLabel: string;
      publishMode?: "publish-only" | "publish-and-reconcile";
      saveDisabled?: boolean;
      previewDisabled?: boolean;
      publishDisabled?: boolean;
      onSaveDraft?: () => void;
      onPreviewImpact?: () => void;
      onPublish?: () => void;
    }) => JSX.Element;
  };
  const { createBoundaryPublishSuccessDescription } = modelModule as {
    createBoundaryPublishSuccessDescription?: (params: {
      movedCount: number;
      mode: "publish-only" | "publish-and-reconcile";
    }) => string;
  };

  assert.equal(typeof BoundaryEditorShell, "function", "shell boundary editor wajib diexport");
  assert.equal(typeof BoundaryEditorImpactPanel, "function", "impact panel boundary editor wajib diexport");
  assert.equal(
    typeof createBoundaryPublishSuccessDescription,
    "function",
    "helper toast publish boundary wajib diexport",
  );

  const idlePanelMarkup = renderToStaticMarkup(
    createElement(BoundaryEditorImpactPanel!, {
      impactedCount: 0,
      sampleMoves: [],
      hasPreview: false,
      hasDraftChanges: false,
      publishedRevisionCount: 1,
      geometryStatusLabel: "Boundary runtime siap diedit",
      publishMode: "publish-and-reconcile",
      previewDisabled: true,
      publishDisabled: true,
    }),
  );

  assert.ok(
    idlePanelMarkup.includes("Preview Impact") && idlePanelMarkup.includes("disabled"),
    "CTA preview impact harus disabled sampai ada draft change",
  );

  const draftOnlyPanelMarkup = renderToStaticMarkup(
    createElement(BoundaryEditorImpactPanel!, {
      impactedCount: 0,
      sampleMoves: [],
      hasPreview: false,
      hasDraftChanges: true,
      publishedRevisionCount: 2,
      geometryStatusLabel: "Draft berubah, simpan sebelum preview",
      publishMode: "publish-and-reconcile",
      publishDisabled: true,
    }),
  );

  assert.ok(
    draftOnlyPanelMarkup.includes("Publish") && draftOnlyPanelMarkup.includes("disabled"),
    "CTA publish harus disabled sampai preview sukses dijalankan",
  );
  assert.ok(
    draftOnlyPanelMarkup.includes("publish-and-reconcile"),
    "mode rekonsiliasi default harus publish-and-reconcile",
  );

  const shellMarkup = renderToStaticMarkup(
    createElement(BoundaryEditorShell!, {
      selectedKecamatanId: "1609040",
      selectedBoundaryKey: "muaradua:batu-belang-jaya",
      kecamatanOptions: [{ id: "1609040", label: "Muaradua" }],
      desaOptions: [{ id: "1609040013", boundaryKey: "muaradua:batu-belang-jaya", label: "Batu Belang Jaya" }],
      revisions: [
        {
          id: 11,
          regionKey: "okus",
          level: "desa",
          status: "published",
          notes: "Published Maret",
          createdBy: "admin",
          publishedBy: "admin",
          publishedAt: "2026-03-20T09:00:00.000Z",
          impactSummary: { impactedCount: 1, movedItems: [] },
          createdAt: "2026-03-20T08:00:00.000Z",
          updatedAt: "2026-03-20T09:00:00.000Z",
        },
      ],
      onRollbackRevision: () => undefined,
    }),
  );

  assert.ok(
    shellMarkup.includes("Rollback Revision"),
    "published revision di daftar revisi harus menampilkan CTA rollback",
  );

  assert.equal(
    createBoundaryPublishSuccessDescription!({
      movedCount: 2,
      mode: "publish-and-reconcile",
    }),
    "Boundary berhasil dipublish. 2 OP ikut direkonsiliasi ke desa baru.",
    "toast sukses publish harus menyebut jumlah OP yang dipindahkan",
  );
}

run()
  .then(() => {
    console.log("[integration] backoffice-boundary-editor-publish: PASS");
  })
  .catch((error) => {
    console.error("[integration] backoffice-boundary-editor-publish: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
