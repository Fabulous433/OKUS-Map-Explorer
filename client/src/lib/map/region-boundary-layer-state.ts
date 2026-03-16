import type { RegionBoundaryLevel } from "@shared/region-boundary";

export type RegionBoundaryLayerId = RegionBoundaryLevel;

export type RegionBoundaryLayerConfig = {
  visible: boolean;
  opacity: number;
};

export type RegionBoundaryLayerState = Record<RegionBoundaryLayerId, RegionBoundaryLayerConfig>;

export const DESA_LAYER_MIN_ZOOM = 12;

export const REGION_BOUNDARY_LAYER_DEFAULTS: RegionBoundaryLayerState = {
  kabupaten: {
    visible: true,
    opacity: 24,
  },
  kecamatan: {
    visible: false,
    opacity: 72,
  },
  desa: {
    visible: false,
    opacity: 64,
  },
};

export function createDefaultRegionBoundaryLayerState(): RegionBoundaryLayerState {
  return {
    kabupaten: { ...REGION_BOUNDARY_LAYER_DEFAULTS.kabupaten },
    kecamatan: { ...REGION_BOUNDARY_LAYER_DEFAULTS.kecamatan },
    desa: { ...REGION_BOUNDARY_LAYER_DEFAULTS.desa },
  };
}

export function normalizeLayerOpacity(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function canLoadDesaLayer(params: {
  layerState: RegionBoundaryLayerState;
  kecamatanId: string;
  zoom: number;
  minZoom?: number;
}) {
  const minimumZoom = params.minZoom ?? DESA_LAYER_MIN_ZOOM;
  return params.layerState.desa.visible && params.kecamatanId !== "all" && params.zoom >= minimumZoom;
}

export function getDesaLayerEmptyState(params: {
  layerState: RegionBoundaryLayerState;
  kecamatanId: string;
  zoom: number;
  minZoom?: number;
}) {
  if (!params.layerState.desa.visible) {
    return "Aktifkan layer desa/kelurahan untuk memuat batas detail";
  }

  if (params.kecamatanId === "all") {
    return "Pilih kecamatan untuk memuat batas desa";
  }

  const minimumZoom = params.minZoom ?? DESA_LAYER_MIN_ZOOM;
  if (params.zoom < minimumZoom) {
    return `Perbesar peta ke zoom ${minimumZoom}+ untuk memuat batas desa`;
  }

  return null;
}
