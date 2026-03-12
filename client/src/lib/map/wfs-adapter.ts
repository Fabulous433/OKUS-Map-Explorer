import type { MapViewportBbox } from "@/lib/map/map-data-source";

import type {
  MapViewportMarker,
  WfsFeature,
  WfsFeatureCollection,
  WfsProperties,
  WfsQueryFilters,
  WfsServiceConfig,
  WfsViewportMeta,
} from "@/lib/map/wfs-types";

const DEFAULT_WFS_VERSION = "1.1.0";
const DEFAULT_WFS_SRS = "EPSG:4326";
const DEFAULT_WFS_OUTPUT = "application/json";

const PROPERTY_ALIASES = {
  id: ["id", "objectid", "gid", "op_id"],
  namaOp: ["namaOp", "nama_op", "nama_objek_pajak", "nama_objek"],
  nopd: ["nopd", "NOPD"],
  jenisPajak: ["jenisPajak", "jenis_pajak", "jenis_rekening", "nm_rek"],
  alamatOp: ["alamatOp", "alamat_op", "alamat"],
  statusVerifikasi: ["statusVerifikasi", "status_verifikasi"],
  pajakBulanan: ["pajakBulanan", "pajak_bulanan"],
} as const;

function escapeCqlLiteral(value: string) {
  return value.replace(/'/g, "''");
}

function normalizeString(value: unknown) {
  if (typeof value === "string") {
    const normalized = value.trim();
    return normalized.length > 0 ? normalized : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function readAliasedString(properties: WfsProperties, aliases: readonly string[]) {
  for (const alias of aliases) {
    const value = normalizeString(properties[alias]);
    if (value) return value;
  }

  return null;
}

function readFeatureId(feature: WfsFeature) {
  if (typeof feature.id === "string" || typeof feature.id === "number") {
    return feature.id;
  }

  for (const alias of PROPERTY_ALIASES.id) {
    const value = feature.properties[alias];
    if (typeof value === "string" || typeof value === "number") {
      return value;
    }
  }

  return null;
}

function readMatchedCount(collection: WfsFeatureCollection) {
  const candidates = [collection.numberMatched, collection.totalFeatures, collection.numberOfFeatures];
  for (const candidate of candidates) {
    const numeric = Number(candidate);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }

  return null;
}

function isPointCoordinates(coordinates: unknown): coordinates is [number, number] {
  return (
    Array.isArray(coordinates) &&
    coordinates.length >= 2 &&
    typeof coordinates[0] === "number" &&
    Number.isFinite(coordinates[0]) &&
    typeof coordinates[1] === "number" &&
    Number.isFinite(coordinates[1])
  );
}

// Build the WFS URL from stable service params plus optional server-side filters.
export function buildWfsUrl(config: WfsServiceConfig, bbox: MapViewportBbox, filters: WfsQueryFilters = {}) {
  const url = new URL(config.endpoint);
  const srsName = config.srsName ?? DEFAULT_WFS_SRS;
  const searchParams = url.searchParams;

  searchParams.set("service", "WFS");
  searchParams.set("version", config.version ?? DEFAULT_WFS_VERSION);
  searchParams.set("request", "GetFeature");
  searchParams.set("typeName", config.typeName);
  searchParams.set("srsName", srsName);
  searchParams.set("outputFormat", config.outputFormat ?? DEFAULT_WFS_OUTPUT);
  searchParams.set("bbox", `${bbox.minLng},${bbox.minLat},${bbox.maxLng},${bbox.maxLat},${srsName}`);

  if (filters.limit) {
    searchParams.set("maxFeatures", String(filters.limit));
  }

  const cqlFilters: string[] = [];
  if (filters.kecamatanId && config.propertyMap?.kecamatanId) {
    cqlFilters.push(`${config.propertyMap.kecamatanId} = '${escapeCqlLiteral(filters.kecamatanId)}'`);
  }
  if (filters.rekPajakId && config.propertyMap?.rekPajakId) {
    cqlFilters.push(`${config.propertyMap.rekPajakId} = '${escapeCqlLiteral(filters.rekPajakId)}'`);
  }
  if (filters.searchQuery && config.propertyMap?.search && config.propertyMap.search.length > 0) {
    const escaped = escapeCqlLiteral(filters.searchQuery.trim());
    if (escaped.length > 0) {
      const query = config.propertyMap.search.map((field) => `${field} ILIKE '%${escaped}%'`).join(" OR ");
      cqlFilters.push(`(${query})`);
    }
  }

  if (cqlFilters.length > 0) {
    searchParams.set("cql_filter", cqlFilters.join(" AND "));
  }

  return url.toString();
}

// Map a raw WFS feature into the stable marker shape consumed by the UI.
export function mapFeatureToViewportMarker(feature: WfsFeature): MapViewportMarker | null {
  if (!feature.geometry || !isPointCoordinates(feature.geometry.coordinates)) {
    return null;
  }

  const id = readFeatureId(feature);
  if (id === null) {
    return null;
  }

  const [longitude, latitude] = feature.geometry.coordinates;
  return {
    id,
    focusKey: String(id),
    namaOp: readAliasedString(feature.properties, PROPERTY_ALIASES.namaOp) ?? "Objek Pajak",
    nopd: readAliasedString(feature.properties, PROPERTY_ALIASES.nopd),
    jenisPajak: readAliasedString(feature.properties, PROPERTY_ALIASES.jenisPajak) ?? "Pajak Daerah",
    alamatOp: readAliasedString(feature.properties, PROPERTY_ALIASES.alamatOp),
    latitude,
    longitude,
    statusVerifikasi: readAliasedString(feature.properties, PROPERTY_ALIASES.statusVerifikasi),
    pajakBulanan: readAliasedString(feature.properties, PROPERTY_ALIASES.pajakBulanan),
  };
}

export function mapWfsCollectionToViewportMarkers(collection: WfsFeatureCollection) {
  return collection.features.flatMap((feature) => {
    const marker = mapFeatureToViewportMarker(feature);
    return marker ? [marker] : [];
  });
}

// Keep viewport badges honest: use matched totals when available, otherwise fall back to loaded markers.
export function deriveWfsViewportMeta(collection: WfsFeatureCollection, markerCount: number): WfsViewportMeta {
  const matchedCount = readMatchedCount(collection);
  if (matchedCount !== null) {
    return {
      totalInView: matchedCount,
      isCapped: matchedCount > markerCount,
      primaryLabel: "dalam viewport",
      semantics: "matched-features",
    };
  }

  return {
    totalInView: markerCount,
    isCapped: false,
    primaryLabel: "marker loaded",
    semantics: "loaded-markers",
  };
}
