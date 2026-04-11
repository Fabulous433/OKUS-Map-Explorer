export type MapDataMode = "internal-api" | "backend-proxy" | "direct-wfs";

export type MapViewportBbox = {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
};

export type RawMapDataSourceConfig = {
  mapDataMode?: string;
  mapInternalApiEndpoint?: string;
  mapProxyEndpoint?: string;
  mapWfsEndpoint?: string;
};

export type ResolvedMapDataSourceConfig = {
  mode: MapDataMode;
  internalApiEndpoint: string;
  proxyEndpoint: string;
  wfsEndpoint: string | null;
};

export type MapDataRequestInput = {
  bbox: MapViewportBbox;
  zoom: number;
  limit: number;
  searchQuery?: string;
  kecamatanId?: string;
  rekPajakId?: string;
  includeUnverified?: boolean;
  focusOpId?: number;
};

export type MapDataRequest =
  | {
      mode: "internal-api" | "backend-proxy";
      url: string;
      errorMessage: null;
    }
  | {
      mode: "direct-wfs";
      url: null;
      errorMessage: string;
    };

const DEFAULT_INTERNAL_API_ENDPOINT = "/api/objek-pajak/map";
const DEFAULT_PROXY_ENDPOINT = "/api/objek-pajak/map-wfs";

function readOptionalString(value?: string) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : null;
}

function normalizeMapDataMode(value?: string): MapDataMode {
  switch (value?.trim()) {
    case "backend-proxy":
      return "backend-proxy";
    case "direct-wfs":
      return "direct-wfs";
    case "internal-api":
    default:
      return "internal-api";
  }
}

export function resolveMapDataSourceConfig(raw: RawMapDataSourceConfig): ResolvedMapDataSourceConfig {
  const internalApiEndpoint = readOptionalString(raw.mapInternalApiEndpoint) ?? DEFAULT_INTERNAL_API_ENDPOINT;
  const proxyEndpoint = readOptionalString(raw.mapProxyEndpoint) ?? DEFAULT_PROXY_ENDPOINT;

  return {
    mode: normalizeMapDataMode(raw.mapDataMode),
    internalApiEndpoint,
    proxyEndpoint,
    wfsEndpoint: readOptionalString(raw.mapWfsEndpoint),
  };
}

// Keep the current query contract isolated from the page so source mode can change later.
export function buildInternalApiMapQueryUrl(
  input: MapDataRequestInput & {
    endpoint: string;
  },
) {
  const params = new URLSearchParams();
  params.set("bbox", `${input.bbox.minLng},${input.bbox.minLat},${input.bbox.maxLng},${input.bbox.maxLat}`);
  params.set("zoom", String(input.zoom));
  params.set("limit", String(input.limit));

  if (input.searchQuery) params.set("q", input.searchQuery);
  if (input.kecamatanId) params.set("kecamatanId", input.kecamatanId);
  if (input.rekPajakId) params.set("rekPajakId", input.rekPajakId);
  if (input.includeUnverified) params.set("includeUnverified", "true");
  if (typeof input.focusOpId === "number" && Number.isFinite(input.focusOpId) && input.focusOpId > 0) {
    params.set("focusOpId", String(input.focusOpId));
  }

  return `${input.endpoint}?${params.toString()}`;
}

// This descriptor lets the page keep one query flow while map source implementations evolve.
export function buildMapDataRequest(
  config: ResolvedMapDataSourceConfig,
  input: MapDataRequestInput,
): MapDataRequest {
  if (config.mode === "direct-wfs") {
    return {
      mode: "direct-wfs",
      url: null,
      errorMessage: "Mode direct-wfs belum didukung sebelum adapter WFS diimplementasikan.",
    };
  }

  const endpoint = config.mode === "backend-proxy" ? config.proxyEndpoint : config.internalApiEndpoint;
  return {
    mode: config.mode,
    url: buildInternalApiMapQueryUrl({
      endpoint,
      ...input,
    }),
    errorMessage: null,
  };
}
