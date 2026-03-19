import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as React from "react";

async function loadPublicMapStageHeaderModule() {
  try {
    return await import("../../client/src/components/map/public-map-stage-header.tsx");
  } catch {
    return null;
  }
}

async function loadPublicMapTaxFilterChipsModule() {
  try {
    return await import("../../client/src/components/map/public-map-tax-filter-chips.tsx");
  } catch {
    return null;
  }
}

async function run() {
  (globalThis as { React?: typeof React }).React = React;

  const stageHeaderModule = await loadPublicMapStageHeaderModule();
  assert.ok(stageHeaderModule, "komponen header stage public map harus tersedia");

  const taxFilterChipsModule = await loadPublicMapTaxFilterChipsModule();
  assert.ok(taxFilterChipsModule, "komponen chip filter pajak public map harus tersedia");

  const { PublicMapStageHeader } = stageHeaderModule as {
    PublicMapStageHeader?: (props: {
      model: {
        title: string;
        subtitle: string;
        helperText: string;
        backVisible: boolean;
      };
      onBack: () => void;
      reducedMotion: boolean;
    }) => JSX.Element;
  };
  const { PublicMapTaxFilterChips } = taxFilterChipsModule as {
    PublicMapTaxFilterChips?: (props: {
      options: string[];
      selectedTaxType: string;
      onSelect: (value: string) => void;
      reducedMotion: boolean;
    }) => JSX.Element | null;
  };

  assert.equal(typeof PublicMapStageHeader, "function", "komponen header stage wajib diexport");
  assert.equal(typeof PublicMapTaxFilterChips, "function", "komponen chip pajak wajib diexport");

  const stageHeaderMarkup = renderToStaticMarkup(
    createElement(PublicMapStageHeader!, {
      model: {
        title: "Batu Belang Jaya",
        subtitle: "Tahap Desa / Kelurahan",
        helperText: "Filter jenis pajak lalu pilih marker OP yang ingin dilihat",
        backVisible: true,
      },
      onBack: () => undefined,
      reducedMotion: true,
    }),
  );

  assert.ok(
    stageHeaderMarkup.includes("text-lg") && stageHeaderMarkup.includes("sm:text-2xl"),
    "judul stage mobile harus turun 2 point menjadi text-lg sambil menjaga desktop tetap besar",
  );
  assert.ok(
    stageHeaderMarkup.includes("hidden sm:block"),
    "subtitle dan helper stage harus disembunyikan pada viewport mobile",
  );

  const chipMarkup = renderToStaticMarkup(
    createElement(PublicMapTaxFilterChips!, {
      options: ["Pajak Sarang Burung Walet"],
      selectedTaxType: "all",
      onSelect: () => undefined,
      reducedMotion: true,
    }),
  );

  assert.ok(chipMarkup.includes(">Semua OP<"), "desktop chip all harus tetap memakai label penuh");
  assert.ok(chipMarkup.includes(">Semua<"), "mobile chip all harus memakai label yang lebih singkat");
  assert.ok(
    chipMarkup.includes(">Pajak Sarang Burung Walet<"),
    "desktop chip jenis pajak harus tetap memakai label penuh",
  );
  assert.ok(chipMarkup.includes(">WLT<"), "mobile chip jenis pajak harus memakai singkatan ringkas");
  assert.ok(
    chipMarkup.includes("sm:hidden") && chipMarkup.includes("hidden sm:inline"),
    "chip publik harus merender label mobile dan desktop secara terpisah",
  );
}

run()
  .then(() => {
    console.log("[integration] public-map-mobile-shell: PASS");
  })
  .catch((error) => {
    console.error("[integration] public-map-mobile-shell: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
