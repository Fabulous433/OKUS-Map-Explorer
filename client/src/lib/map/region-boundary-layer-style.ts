import type { RegionBoundaryLevel } from "@shared/region-boundary";
import { normalizeLayerOpacity } from "./region-boundary-layer-state";

const KECAMATAN_FILL_PALETTE = ["#8BDE72", "#B97EE8", "#47B6E6", "#EA6CAD", "#D69579", "#3D3AE5", "#CDC86B"] as const;
const DESA_FILL_PALETTE = ["#F1C38A", "#A8D8EE", "#B9E2A0", "#F3A7B9", "#B7A4F0", "#8AD6C3", "#F0DE91"] as const;

export const REGION_BOUNDARY_LABEL_MIN_ZOOM: Record<RegionBoundaryLevel, number> = {
  kabupaten: 9,
  kecamatan: 11,
  desa: 13,
};

export type RegionBoundaryLayerStyle = {
  color: string;
  fillColor: string;
  fillOpacity: number;
  opacity: number;
  weight: number;
  dashArray?: string;
};

function hashName(input: string) {
  let hash = 0;
  for (const character of input) {
    hash = (hash * 33 + character.charCodeAt(0)) >>> 0;
  }
  return hash;
}

function pickPaletteColor(level: Exclude<RegionBoundaryLevel, "kabupaten">, featureName: string) {
  const palette = level === "kecamatan" ? KECAMATAN_FILL_PALETTE : DESA_FILL_PALETTE;
  const index = hashName(`${level}:${featureName.trim().toLocaleLowerCase("id")}`) % palette.length;
  return palette[index]!;
}

export function getRegionBoundaryLayerStyle(params: {
  level: RegionBoundaryLevel;
  featureName: string;
  opacity: number;
}): RegionBoundaryLayerStyle {
  const normalizedOpacity = normalizeLayerOpacity(params.opacity);

  if (params.level === "kabupaten") {
    return {
      color: "#18263A",
      fillColor: "#F3DF9A",
      fillOpacity: Number((normalizedOpacity / 100 / 2.5).toFixed(3)),
      opacity: 0.92,
      weight: 2.2,
      dashArray: "8 5",
    };
  }

  const fillColor = pickPaletteColor(params.level, params.featureName);
  return {
    color: params.level === "kecamatan" ? "#243447" : "#32465C",
    fillColor,
    fillOpacity: Number((normalizedOpacity / 100).toFixed(3)),
    opacity: params.level === "kecamatan" ? 0.82 : 0.74,
    weight: params.level === "kecamatan" ? 1.8 : 1.1,
  };
}
