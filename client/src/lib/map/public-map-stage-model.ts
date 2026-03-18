import type { GeoJsonFeatureCollection, RegionBoundaryBounds } from "@shared/region-boundary";
import { filterViewportMarkersByBoundarySelection, type BoundaryFeatureSelection } from "@/lib/map/public-boundary-layer-model";
import type { MapViewportBbox } from "@/lib/map/map-data-source";
import type { MapViewportMarker } from "@/lib/map/wfs-types";

export type MapStage = "kabupaten" | "kecamatan" | "desa";

export type SelectedKecamatan = {
  id: string;
  name: string;
  bounds: RegionBoundaryBounds;
  feature: BoundaryFeatureSelection["feature"];
};

export type SelectedDesa = {
  name: string;
  bounds: RegionBoundaryBounds;
  feature: BoundaryFeatureSelection["feature"];
};

export type PublicMapStageState = {
  stage: MapStage;
  selectedKecamatan: SelectedKecamatan | null;
  selectedDesa: SelectedDesa | null;
  selectedTaxType: string;
};

export type PublicMapStageHeaderModel = {
  title: string;
  subtitle: string;
  helperText: string;
  backVisible: boolean;
};

export type PublicMapBoundaryPresentation = {
  showKabupaten: boolean;
  showKecamatan: boolean;
  showDesa: boolean;
  desaMode: "none" | "scoped" | "focused-scoped";
};

const ROOT_STAGE_HELPER = "Pilih satu kecamatan untuk masuk ke wilayahnya";
const KECAMATAN_STAGE_HELPER = "Pilih desa/kelurahan untuk membuka detail wilayah";
const DESA_STAGE_HELPER = "Filter jenis pajak lalu pilih marker OP yang ingin dilihat";

export function createDefaultPublicMapStageState(): PublicMapStageState {
  return {
    stage: "kabupaten",
    selectedKecamatan: null,
    selectedDesa: null,
    selectedTaxType: "all",
  };
}

export function drillIntoKecamatanStage(params: {
  current: PublicMapStageState;
  selection: BoundaryFeatureSelection;
  kecamatanId: string;
}): PublicMapStageState {
  return {
    stage: "kecamatan",
    selectedKecamatan: {
      id: params.kecamatanId,
      name: params.selection.featureName,
      bounds: params.selection.bounds,
      feature: params.selection.feature,
    },
    selectedDesa: null,
    selectedTaxType: "all",
  };
}

export function drillIntoDesaStage(params: {
  current: PublicMapStageState;
  selection: BoundaryFeatureSelection;
}): PublicMapStageState {
  return {
    ...params.current,
    stage: "desa",
    selectedDesa: {
      name: params.selection.featureName,
      bounds: params.selection.bounds,
      feature: params.selection.feature,
    },
    selectedTaxType: "all",
  };
}

export function stepBackPublicMapStage(current: PublicMapStageState): PublicMapStageState {
  if (current.stage === "desa") {
    return {
      ...current,
      stage: "kecamatan",
      selectedDesa: null,
      selectedTaxType: "all",
    };
  }

  if (current.stage === "kecamatan") {
    return createDefaultPublicMapStageState();
  }

  return current;
}

export function createPublicMapStageHeaderModel(params: {
  stageState: PublicMapStageState;
  regionName: string;
  markerCount: number;
}): PublicMapStageHeaderModel {
  if (params.stageState.stage === "desa" && params.stageState.selectedDesa) {
    return {
      title: params.stageState.selectedDesa.name,
      subtitle: "Tahap Desa / Kelurahan",
      helperText: DESA_STAGE_HELPER,
      backVisible: true,
    };
  }

  if (params.stageState.stage === "kecamatan" && params.stageState.selectedKecamatan) {
    return {
      title: params.stageState.selectedKecamatan.name,
      subtitle: "Tahap Kecamatan",
      helperText: KECAMATAN_STAGE_HELPER,
      backVisible: true,
    };
  }

  return {
    title: params.regionName,
    subtitle: "Tahap Kabupaten",
    helperText: ROOT_STAGE_HELPER,
    backVisible: false,
  };
}

export function shouldActivatePublicMapMarkers(params: {
  stageState: PublicMapStageState;
  hasFocusOverride: boolean;
}) {
  if (params.hasFocusOverride) {
    return true;
  }

  return params.stageState.stage === "desa" && params.stageState.selectedDesa !== null;
}

export function extractPublicMapTaxTypeOptions(markers: MapViewportMarker[]) {
  return Array.from(new Set(markers.map((marker) => marker.jenisPajak.trim()).filter(Boolean))).sort((left, right) =>
    left.localeCompare(right, "id"),
  );
}

export function filterPublicMapMarkersByTaxType(params: {
  markers: MapViewportMarker[];
  selectedTaxType: string;
}) {
  if (params.selectedTaxType === "all") {
    return params.markers;
  }

  return params.markers.filter((marker) => marker.jenisPajak === params.selectedTaxType);
}

export function createPublicMapVisibleMarkers(params: {
  stageState: PublicMapStageState;
  hasFocusOverride: boolean;
  markers: MapViewportMarker[];
}) {
  if (
    !shouldActivatePublicMapMarkers({
      stageState: params.stageState,
      hasFocusOverride: params.hasFocusOverride,
    })
  ) {
    return [];
  }

  const stageBoundaryFilteredMarkers =
    params.stageState.stage === "desa" && params.stageState.selectedDesa
      ? filterViewportMarkersByBoundarySelection({
          selection: {
            feature: params.stageState.selectedDesa.feature,
          },
          markers: params.markers,
        })
      : params.markers;

  return filterPublicMapMarkersByTaxType({
    markers: stageBoundaryFilteredMarkers,
    selectedTaxType: params.stageState.selectedTaxType,
  });
}

export function getPublicMapMarkerQueryBounds(params: {
  stageState: PublicMapStageState;
  viewportBbox: MapViewportBbox | null;
}) {
  if (params.stageState.stage === "desa" && params.stageState.selectedDesa) {
    return params.stageState.selectedDesa.bounds;
  }

  return params.viewportBbox;
}

export function createSingleFeatureCollection(selection: Pick<BoundaryFeatureSelection, "feature">): GeoJsonFeatureCollection {
  return {
    type: "FeatureCollection",
    features: [selection.feature],
  };
}

export function getPublicMapDesaMarkerFocusTarget(params: {
  stageState: PublicMapStageState;
  markers: MapViewportMarker[];
}) {
  if (params.stageState.stage !== "desa" || params.stageState.selectedDesa === null || params.markers.length === 0) {
    return null;
  }

  return {
    lat: params.markers[0]!.latitude,
    lng: params.markers[0]!.longitude,
  };
}

export function getPublicMapBoundaryPresentation(params: {
  stageState: PublicMapStageState;
  hasKabupatenBoundary: boolean;
  hasKecamatanBoundary: boolean;
  hasDesaBoundary: boolean;
}): PublicMapBoundaryPresentation {
  if (params.stageState.stage === "desa") {
    return {
      showKabupaten: params.hasKabupatenBoundary,
      showKecamatan: false,
      showDesa: params.hasDesaBoundary && params.stageState.selectedDesa !== null,
      desaMode: "focused-scoped",
    };
  }

  if (params.stageState.stage === "kecamatan") {
    return {
      showKabupaten: params.hasKabupatenBoundary,
      showKecamatan: false,
      showDesa: params.hasDesaBoundary && params.stageState.selectedKecamatan !== null,
      desaMode: "scoped",
    };
  }

  return {
    showKabupaten: params.hasKabupatenBoundary,
    showKecamatan: params.hasKecamatanBoundary,
    showDesa: false,
    desaMode: "none",
  };
}

export function expandStageBounds(bounds: RegionBoundaryBounds, paddingRatio: number): RegionBoundaryBounds {
  const lngPadding = (bounds.maxLng - bounds.minLng) * paddingRatio;
  const latPadding = (bounds.maxLat - bounds.minLat) * paddingRatio;

  return {
    minLng: bounds.minLng - lngPadding,
    minLat: bounds.minLat - latPadding,
    maxLng: bounds.maxLng + lngPadding,
    maxLat: bounds.maxLat + latPadding,
  };
}

export function getPublicMapStageBounds(params: {
  stageState: PublicMapStageState;
  kabupatenBounds: RegionBoundaryBounds | null;
}) {
  if (params.stageState.stage === "desa" && params.stageState.selectedDesa) {
    return params.stageState.selectedDesa.bounds;
  }

  if (params.stageState.stage === "kecamatan" && params.stageState.selectedKecamatan) {
    return params.stageState.selectedKecamatan.bounds;
  }

  return params.kabupatenBounds;
}

export function getPublicMapStageConstraintBounds(params: {
  stageState: PublicMapStageState;
  kabupatenBounds: RegionBoundaryBounds | null;
}) {
  if (params.stageState.stage === "desa" && params.stageState.selectedKecamatan) {
    return params.stageState.selectedKecamatan.bounds;
  }

  return getPublicMapStageBounds(params);
}

export function getPublicMapStagePaddingRatio(stage: MapStage) {
  if (stage === "desa") {
    return 0.02;
  }

  if (stage === "kecamatan") {
    return 0.04;
  }

  return 0.08;
}

export function getPublicMapStageMaxZoom(stage: MapStage) {
  if (stage === "desa") {
    return 16;
  }

  if (stage === "kecamatan") {
    return 13;
  }

  return 11;
}

export function getPublicMapStageViewportPlan(params: { stage: MapStage; baseMapMaxZoom: number }) {
  const maxZoom = Math.min(getPublicMapStageMaxZoom(params.stage), params.baseMapMaxZoom);

  if (params.stage === "desa") {
    return {
      mode: "center" as const,
      maxZoom,
    };
  }

  return {
    mode: "bounds" as const,
    maxZoom,
  };
}

export function getPublicMapStageAnimationDuration(stage: MapStage, reducedMotion: boolean) {
  if (reducedMotion) {
    return 0;
  }

  if (stage === "desa") {
    return 0.95;
  }

  if (stage === "kecamatan") {
    return 0.8;
  }

  return 0.65;
}

export function getPublicMapStageViewportPadding(stage: MapStage, compactViewport: boolean) {
  if (!compactViewport) {
    if (stage === "desa") {
      return {
        paddingTopLeft: [44, 148] as [number, number],
        paddingBottomRight: [44, 52] as [number, number],
      };
    }

    return {
      paddingTopLeft: [32, 32] as [number, number],
      paddingBottomRight: [32, 32] as [number, number],
    };
  }

  if (stage === "desa") {
    return {
      paddingTopLeft: [24, 320] as [number, number],
      paddingBottomRight: [24, 96] as [number, number],
    };
  }

  if (stage === "kecamatan") {
    return {
      paddingTopLeft: [24, 144] as [number, number],
      paddingBottomRight: [24, 64] as [number, number],
    };
  }

  return {
    paddingTopLeft: [20, 120] as [number, number],
    paddingBottomRight: [20, 56] as [number, number],
  };
}
