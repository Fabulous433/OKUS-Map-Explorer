import { deriveWfsViewportMeta, mapWfsCollectionToViewportMarkers } from "@/lib/map/wfs-adapter";
import type { MapDataRequest, MapViewportBbox } from "@/lib/map/map-data-source";
import type { MapViewportMarker, WfsFeatureCollection } from "@/lib/map/wfs-types";
import type { MapObjekPajakItem } from "@shared/schema";

export type LegacyMapResponse = {
  items: MapObjekPajakItem[];
  meta: {
    totalInView: number;
    isCapped: boolean;
  };
};

export type MapViewportResult = {
  items: MapViewportMarker[];
  meta: {
    totalInView: number;
    isCapped: boolean;
    primaryLabel: "dalam viewport" | "marker loaded";
  };
};

type FetchImpl = typeof fetch;
type ViewportQueryActivationParams = {
  bbox: MapViewportBbox | null;
  searchQuery: string;
  kecamatanId: string;
  rekPajakId: string;
  focusId: number | null;
  focusTarget: { lat: number; lng: number } | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isWfsFeatureCollection(value: unknown): value is WfsFeatureCollection {
  return isRecord(value) && value.type === "FeatureCollection" && Array.isArray(value.features);
}

function isLegacyMapResponse(value: unknown): value is LegacyMapResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.items) &&
    isRecord(value.meta) &&
    typeof value.meta.totalInView === "number" &&
    typeof value.meta.isCapped === "boolean"
  );
}

async function readErrorMessage(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const payload = await response.json().catch(() => null);
    if (isRecord(payload) && typeof payload.message === "string" && payload.message.trim().length > 0) {
      return payload.message;
    }
    return response.statusText;
  }

  const text = await response.text().catch(() => "");
  return text || response.statusText;
}

// Keep network semantics centralized so the page stays focused on composition and layout.
export async function loadMapViewportData(params: {
  request: MapDataRequest;
  signal?: AbortSignal;
  fetchImpl?: FetchImpl;
}): Promise<MapViewportResult> {
  const fetchImpl = params.fetchImpl ?? fetch;

  if (!params.request.url) {
    throw new Error(params.request.errorMessage ?? "Konfigurasi data peta belum didukung.");
  }

  const response = await fetchImpl(params.request.url, {
    credentials: "include",
    signal: params.signal,
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  const payload = await response.json();

  if (params.request.mode === "backend-proxy") {
    if (!isWfsFeatureCollection(payload)) {
      throw new Error("Payload data peta WFS tidak valid.");
    }

    const items = mapWfsCollectionToViewportMarkers(payload);
    const { totalInView, isCapped, primaryLabel } = deriveWfsViewportMeta(payload, items.length);
    return {
      items,
      meta: {
        totalInView,
        isCapped,
        primaryLabel,
      },
    };
  }

  if (!isLegacyMapResponse(payload)) {
    throw new Error("Payload data peta internal tidak valid.");
  }

  return {
    items: payload.items.map((item) => ({
      ...item,
      focusKey: String(item.id),
    })),
    meta: {
      ...payload.meta,
      primaryLabel: "dalam viewport",
    },
  };
}

export function shouldActivateViewportData(params: ViewportQueryActivationParams) {
  if (!params.bbox) {
    return false;
  }

  const hasSearchQuery = params.searchQuery.trim().length > 0;
  const hasKecamatanFilter = params.kecamatanId !== "all";
  const hasRekeningFilter = params.rekPajakId !== "all";
  const hasFocusIntent = params.focusId !== null || params.focusTarget !== null;

  return hasSearchQuery || hasKecamatanFilter || hasRekeningFilter || hasFocusIntent;
}

export function shouldShowEmptyViewportState(params: {
  isQueryActive: boolean;
  bbox: MapViewportBbox | null;
  isFetching: boolean;
  error: unknown;
  markerCount: number;
}) {
  return params.isQueryActive && !params.error && !params.isFetching && params.markerCount === 0 && params.bbox !== null;
}
