import { filterPublicMapMarkersByTaxType, type MapStage } from "@/lib/map/public-map-stage-model";
import type { MapViewportMarker } from "@/lib/map/wfs-types";

export type PublicMapOpRailRow = {
  id: string | number;
  title: string;
  subtitle: string;
  meta: string;
};

export type PublicMapOpRailModel = {
  visible: boolean;
  title: string;
  countLabel: string;
  rows: PublicMapOpRailRow[];
  emptyMessage: string | null;
};

const PUBLIC_MAP_OP_RAIL_TITLE = "Objek Pajak di Desa Ini";

function createDefaultRailModel(): PublicMapOpRailModel {
  return {
    visible: false,
    title: PUBLIC_MAP_OP_RAIL_TITLE,
    countLabel: "0 OP",
    rows: [],
    emptyMessage: null,
  };
}

function formatRailMeta(marker: MapViewportMarker) {
  return `NOPD ${marker.nopd?.trim() || "-"}`;
}

export function createPublicMapOpRailModel(params: {
  stage: MapStage;
  markers: MapViewportMarker[];
  selectedTaxType: string;
  compactViewport: boolean;
}): PublicMapOpRailModel {
  if (params.stage !== "desa" || params.compactViewport) {
    return createDefaultRailModel();
  }

  const filteredMarkers = filterPublicMapMarkersByTaxType({
    markers: params.markers,
    selectedTaxType: params.selectedTaxType,
  });

  const rows = [...filteredMarkers]
    .sort((left, right) => {
      const taxTypeComparison = left.jenisPajak.localeCompare(right.jenisPajak, "id");
      if (taxTypeComparison !== 0) {
        return taxTypeComparison;
      }

      return left.namaOp.localeCompare(right.namaOp, "id");
    })
    .map<PublicMapOpRailRow>((marker) => ({
      id: marker.id,
      title: marker.namaOp,
      subtitle: marker.jenisPajak,
      meta: formatRailMeta(marker),
    }));

  return {
    visible: true,
    title: PUBLIC_MAP_OP_RAIL_TITLE,
    countLabel: `${rows.length} OP`,
    rows,
    emptyMessage: rows.length === 0 ? "Belum ada objek pajak yang cocok dengan filter aktif." : null,
  };
}
