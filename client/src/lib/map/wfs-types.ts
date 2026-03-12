import type { MapViewportBbox } from "@/lib/map/map-data-source";

export type WfsProperties = Record<string, unknown>;

export type WfsGeometry = {
  type: string;
  coordinates: unknown;
} | null;

export type WfsFeature = {
  type: "Feature";
  id?: string | number;
  geometry: WfsGeometry;
  properties: WfsProperties;
};

export type WfsFeatureCollection = {
  type: "FeatureCollection";
  features: WfsFeature[];
  numberMatched?: number | string;
  totalFeatures?: number | string;
  numberOfFeatures?: number | string;
};

export type MapViewportMarker = {
  id: string | number;
  focusKey: string;
  namaOp: string;
  nopd: string | null;
  jenisPajak: string;
  alamatOp: string | null;
  latitude: number;
  longitude: number;
  pajakBulanan?: string | null;
  statusVerifikasi?: string | null;
};

export type WfsPropertyMap = {
  kecamatanId?: string;
  rekPajakId?: string;
  search?: string[];
};

export type WfsServiceConfig = {
  endpoint: string;
  typeName: string;
  version?: string;
  srsName?: string;
  outputFormat?: string;
  propertyMap?: WfsPropertyMap;
};

export type WfsQueryFilters = {
  kecamatanId?: string;
  rekPajakId?: string;
  searchQuery?: string;
  limit?: number;
};

export type WfsViewportMeta = {
  totalInView: number;
  isCapped: boolean;
  primaryLabel: "dalam viewport" | "marker loaded";
  semantics: "matched-features" | "loaded-markers";
};

export type WfsUrlBuilder = (
  config: WfsServiceConfig,
  bbox: MapViewportBbox,
  filters?: WfsQueryFilters,
) => string;
