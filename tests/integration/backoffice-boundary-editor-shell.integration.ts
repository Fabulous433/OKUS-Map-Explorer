import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";

async function loadLayoutModule() {
  try {
    return await import("../../client/src/pages/backoffice/layout.tsx");
  } catch {
    return null;
  }
}

async function loadBoundaryPageModule() {
  try {
    return await import("../../client/src/pages/backoffice/batas-wilayah.tsx");
  } catch {
    return null;
  }
}

async function loadBoundaryShellModule() {
  try {
    return await import("../../client/src/components/backoffice/boundary-editor-shell.tsx");
  } catch {
    return null;
  }
}

async function run() {
  (globalThis as { React?: typeof React }).React = React;

  const appSourcePath = path.resolve(import.meta.dirname, "../../client/src/App.tsx");
  const appSource = await readFile(appSourcePath, "utf8");

  const layoutModule = await loadLayoutModule();
  assert.ok(layoutModule, "layout backoffice harus tersedia");

  const boundaryPageModule = await loadBoundaryPageModule();
  assert.ok(boundaryPageModule, "halaman batas wilayah backoffice harus tersedia");

  const boundaryShellModule = await loadBoundaryShellModule();
  assert.ok(boundaryShellModule, "shell batas wilayah backoffice harus tersedia");

  const { BACKOFFICE_NAV_ITEMS } = layoutModule as {
    BACKOFFICE_NAV_ITEMS?: Array<{ href: string; label: string; roles?: readonly string[] }>;
  };
  const { BoundaryEditorAccessDeniedCard, BoundaryEditorMobileNotice } = boundaryPageModule as {
    BoundaryEditorAccessDeniedCard?: () => JSX.Element;
    BoundaryEditorMobileNotice?: () => JSX.Element;
  };
  const { BoundaryEditorShell } = boundaryShellModule as {
    BoundaryEditorShell?: (props: {
      selectedKecamatanId: string;
      selectedBoundaryKey: string;
      kecamatanOptions: Array<{ id: string; label: string }>;
      desaOptions: Array<{ id: string; boundaryKey: string; label: string }>;
      revisionHistory: Array<{
        id: number;
        boundaryKey: string;
        boundaryName: string;
        status: "draft" | "published" | "superseded";
        changeType: "perluasan" | "penyusutan" | "penyesuaian";
        notes: string | null;
        createdBy: string;
        publishedBy: string | null;
        publishedAt: string | null;
        impactSummary: {
          impactedCount: number;
          movedItems: Array<{
            opId: number;
            namaOp: string;
            fromKelurahan: string;
            toKelurahan: string;
          }>;
        } | null;
        createdAt: string;
        updatedAt: string;
      }>;
      isLoading?: boolean;
      lastSavedLabel?: string | null;
      showDraftStatus?: boolean;
    }) => JSX.Element;
  };

  assert.ok(
    appSource.includes('path="/backoffice/batas-wilayah"') ||
      appSource.includes("path=\"/backoffice/batas-wilayah\""),
    "route /backoffice/batas-wilayah harus terdaftar di App",
  );

  const navItem = BACKOFFICE_NAV_ITEMS?.find((item) => item.href === "/backoffice/batas-wilayah");
  assert.ok(navItem, "menu backoffice harus memuat item Batas Wilayah");
  assert.equal(navItem?.label, "Batas Wilayah", "label menu boundary editor harus konsisten");
  assert.deepEqual(navItem?.roles, ["admin"], "menu boundary editor hanya boleh terlihat untuk admin");

  assert.equal(
    typeof BoundaryEditorAccessDeniedCard,
    "function",
    "halaman boundary editor harus mengekspor kartu akses ditolak",
  );
  assert.equal(
    typeof BoundaryEditorMobileNotice,
    "function",
    "halaman boundary editor harus mengekspor fallback mobile notice",
  );
  assert.equal(typeof BoundaryEditorShell, "function", "shell boundary editor wajib diexport");

  const deniedMarkup = renderToStaticMarkup(createElement(BoundaryEditorAccessDeniedCard!));
  assert.ok(
    deniedMarkup.includes("AKSES DITOLAK") &&
      deniedMarkup.includes("role admin") &&
      deniedMarkup.includes("Batas Wilayah"),
    "non-admin harus melihat access denied yang eksplisit untuk editor batas wilayah",
  );

  const mobileMarkup = renderToStaticMarkup(createElement(BoundaryEditorMobileNotice!));
  assert.ok(
    mobileMarkup.includes("Desktop Only") &&
      mobileMarkup.includes("read-only") &&
      mobileMarkup.includes("Preview revisi"),
    "mobile shell harus menampilkan fallback read-only untuk boundary editor",
  );

  const shellMarkup = renderToStaticMarkup(
    createElement(BoundaryEditorShell!, {
      selectedKecamatanId: "1609040",
      selectedBoundaryKey: "muaradua:batu-belang-jaya",
      kecamatanOptions: [
        { id: "1609040", label: "Muaradua" },
        { id: "1609050", label: "Buay Rawan" },
      ],
      desaOptions: [
        {
          id: "1609040013",
          boundaryKey: "muaradua:batu-belang-jaya",
          label: "Batu Belang Jaya",
        },
        {
          id: "1609040012",
          boundaryKey: "muaradua:bumi-agung",
          label: "Bumi Agung",
        },
      ],
      revisionHistory: [
        {
          id: 7,
          boundaryKey: "muaradua:batu-belang-jaya",
          boundaryName: "Batu Belang Jaya",
          status: "draft",
          changeType: "perluasan",
          notes: "Penyesuaian batas Batu Belang Jaya",
          createdBy: "admin",
          publishedBy: null,
          publishedAt: null,
          impactSummary: {
            impactedCount: 3,
            movedItems: [
              {
                opId: 41,
                namaOp: "Cemara Homestay",
                fromKelurahan: "Bumi Agung",
                toKelurahan: "Batu Belang Jaya",
              },
            ],
          },
          createdAt: "2026-03-20T08:00:00.000Z",
          updatedAt: "2026-03-20T08:30:00.000Z",
        },
        {
          id: 6,
          boundaryKey: "muaradua:batu-belang-jaya",
          boundaryName: "Batu Belang Jaya",
          status: "published",
          changeType: "penyusutan",
          notes: "Penyempitan sisi timur",
          createdBy: "admin",
          publishedBy: "admin",
          publishedAt: "2026-03-19T08:30:00.000Z",
          impactSummary: null,
          createdAt: "2026-03-19T08:00:00.000Z",
          updatedAt: "2026-03-19T08:30:00.000Z",
        },
        {
          id: 5,
          boundaryKey: "muaradua:batu-belang-jaya",
          boundaryName: "Batu Belang Jaya",
          status: "superseded",
          changeType: "penyesuaian",
          notes: "Geser batas lama",
          createdBy: "admin",
          publishedBy: "admin",
          publishedAt: "2026-03-18T08:30:00.000Z",
          impactSummary: null,
          createdAt: "2026-03-18T08:00:00.000Z",
          updatedAt: "2026-03-18T08:30:00.000Z",
        },
      ],
      lastSavedLabel: "Draft tersimpan 08.30 WIB",
      showDraftStatus: true,
    }),
  );

  assert.ok(shellMarkup.includes("Pilih Kecamatan"), "desktop shell harus memuat selector kecamatan");
  assert.ok(shellMarkup.includes("Pilih Desa"), "desktop shell harus memuat selector desa");
  assert.ok(shellMarkup.includes("Riwayat Revisi"), "desktop shell harus memuat daftar revisi");
  assert.ok(shellMarkup.includes("Draf"), "riwayat revisi harus memakai label status Indonesia untuk draft");
  assert.ok(shellMarkup.includes("Aktif"), "riwayat revisi harus memakai label status Indonesia untuk published");
  assert.ok(shellMarkup.includes("Arsip"), "riwayat revisi harus memakai label status Indonesia untuk superseded");
  assert.ok(
    shellMarkup.includes("Perluasan wilayah") &&
      shellMarkup.includes("Penyusutan wilayah") &&
      shellMarkup.includes("Penyesuaian batas"),
    "riwayat revisi harus menjelaskan jenis perubahan wilayah secara natural",
  );
  assert.ok(shellMarkup.includes("Status Draf"), "status draf hanya boleh tampil jika desa aktif memang punya draf");
  assert.ok(shellMarkup.includes("Edit Polygon"), "desktop shell harus memuat aksi edit polygon");
  assert.ok(shellMarkup.includes("Upload GeoJSON"), "desktop shell harus memuat aksi upload GeoJSON");
  assert.ok(shellMarkup.includes("Preview Impact"), "desktop shell harus memuat aksi preview impact");
  assert.ok(shellMarkup.includes("Save Draft"), "desktop shell harus memuat aksi simpan draft");
  assert.ok(shellMarkup.includes("Publish"), "desktop shell harus memuat aksi publish");
  assert.ok(shellMarkup.includes("Rollback"), "desktop shell harus memuat aksi rollback");

  const untouchedShellMarkup = renderToStaticMarkup(
    createElement(BoundaryEditorShell!, {
      selectedKecamatanId: "1609050",
      selectedBoundaryKey: "runjungagung:desa-contoh",
      kecamatanOptions: [{ id: "1609050", label: "Runjung Agung" }],
      desaOptions: [
        {
          id: "1609050012",
          boundaryKey: "runjungagung:desa-contoh",
          label: "Desa Contoh",
        },
      ],
      revisionHistory: [],
      showDraftStatus: false,
    }),
  );

  assert.equal(
    untouchedShellMarkup.includes("Status Draf"),
    false,
    "desa yang belum pernah diedit tidak boleh menampilkan panel status draf",
  );
  assert.ok(
    untouchedShellMarkup.includes("Belum ada riwayat penyesuaian untuk desa ini."),
    "desa yang belum pernah diedit harus menampilkan empty state riwayat per desa",
  );
}

run()
  .then(() => {
    console.log("[integration] backoffice-boundary-editor-shell: PASS");
  })
  .catch((error) => {
    console.error("[integration] backoffice-boundary-editor-shell: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
