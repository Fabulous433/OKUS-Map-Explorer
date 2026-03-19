import { createPublicMapTaxFilterLabelModel, filterPublicMapMarkersByTaxType, type MapStage } from "@/lib/map/public-map-stage-model";
import type { MapViewportMarker } from "@/lib/map/wfs-types";

export type PublicMapMobileOpSheetState =
  | { mode: "hidden" }
  | { mode: "list" }
  | { mode: "detail"; markerId: string | number };

export type PublicMapMobileOpSheetRow = {
  id: string | number;
  title: string;
  subtitle: string;
  meta: string;
  amountLabel: string;
};

export type PublicMapMobileOpSheetModel = {
  visible: boolean;
  mode: "hidden" | "list" | "detail";
  title: string | null;
  countLabel: string | null;
  filterSummary: string | null;
  rows: PublicMapMobileOpSheetRow[];
  detail: {
    title: string;
    subtitle: string;
    amountLabel: string;
  } | null;
};

function createHiddenModel(): PublicMapMobileOpSheetModel {
  return {
    visible: false,
    mode: "hidden",
    title: null,
    countLabel: null,
    filterSummary: null,
    rows: [],
    detail: null,
  };
}

function formatCurrencyLabel(value: string | null | undefined) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "Rp - / bulan";
  }

  return `Rp ${new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(numeric)} / bulan`;
}

function formatMeta(marker: MapViewportMarker) {
  return `NOPD ${marker.nopd?.trim() || "-"}`;
}

function createSortedRows(markers: MapViewportMarker[]): PublicMapMobileOpSheetRow[] {
  return [...markers]
    .sort((left, right) => {
      const taxTypeComparison = left.jenisPajak.localeCompare(right.jenisPajak, "id");
      if (taxTypeComparison !== 0) {
        return taxTypeComparison;
      }

      return left.namaOp.localeCompare(right.namaOp, "id");
    })
    .map((marker) => ({
      id: marker.id,
      title: marker.namaOp,
      subtitle: marker.jenisPajak,
      meta: formatMeta(marker),
      amountLabel: formatCurrencyLabel(marker.pajakBulanan),
    }));
}

export function createDefaultPublicMapMobileOpSheetState(): PublicMapMobileOpSheetState {
  return { mode: "hidden" };
}

export function openPublicMapMobileOpSheetDetail(markerId: string | number): PublicMapMobileOpSheetState {
  return {
    mode: "detail",
    markerId,
  };
}

export function stepBackPublicMapMobileOpSheetState(current: PublicMapMobileOpSheetState): PublicMapMobileOpSheetState {
  if (current.mode === "detail") {
    return { mode: "list" };
  }

  return current;
}

export function syncPublicMapMobileOpSheetState(params: {
  current: PublicMapMobileOpSheetState;
  stage: MapStage;
  compactViewport: boolean;
  markers: Array<{ id: string | number }>;
}): PublicMapMobileOpSheetState {
  if (params.stage !== "desa" || !params.compactViewport) {
    return params.current.mode === "hidden" ? params.current : { mode: "hidden" };
  }

  if (params.current.mode === "hidden") {
    return { mode: "list" };
  }

  const currentDetailState = params.current.mode === "detail" ? params.current : null;
  if (currentDetailState && !params.markers.some((marker) => String(marker.id) === String(currentDetailState.markerId))) {
    return { mode: "list" };
  }

  return params.current;
}

export function createPublicMapMobileOpSheetModel(params: {
  stage: MapStage;
  compactViewport: boolean;
  desaName: string | null;
  markers: MapViewportMarker[];
  selectedTaxType: string;
  sheetState: PublicMapMobileOpSheetState;
}): PublicMapMobileOpSheetModel {
  if (params.stage !== "desa" || !params.compactViewport || params.sheetState.mode === "hidden") {
    return createHiddenModel();
  }

  const filteredMarkers = filterPublicMapMarkersByTaxType({
    markers: params.markers,
    selectedTaxType: params.selectedTaxType,
  });
  const rows = createSortedRows(filteredMarkers);
  const detailState = params.sheetState.mode === "detail" ? params.sheetState : null;
  const detailMarker = detailState
    ? filteredMarkers.find((marker) => String(marker.id) === String(detailState.markerId)) ?? null
    : null;

  return {
    visible: true,
    mode: detailMarker ? "detail" : "list",
    title: params.desaName,
    countLabel: `${rows.length} OP`,
    filterSummary: createPublicMapTaxFilterLabelModel(params.selectedTaxType).full === "Semua OP"
      ? "Semua OP"
      : createPublicMapTaxFilterLabelModel(params.selectedTaxType).compact,
    rows,
    detail: detailMarker
      ? {
          title: detailMarker.namaOp,
          subtitle: detailMarker.jenisPajak,
          amountLabel: formatCurrencyLabel(detailMarker.pajakBulanan),
        }
      : null,
  };
}
