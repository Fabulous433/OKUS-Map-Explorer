import {
  regionBoundaryDraftFeatureSchema,
  type RegionBoundaryDraftFeature,
  type RegionBoundaryGeometry,
  type RegionBoundaryImpactMovedItem,
} from "@shared/region-boundary-admin";
import type { GeoJsonFeatureCollection } from "@shared/region-boundary";

type GeoJsonFeatureInput = {
  type: "Feature";
  properties?: Record<string, unknown>;
  geometry?: {
    type?: string;
    coordinates?: unknown;
  } | null;
};

type GeoJsonUploadResult =
  | {
      success: true;
      geometry: RegionBoundaryGeometry;
    }
  | {
      success: false;
      message: string;
    };

function isPolygonGeometry(
  geometry: GeoJsonFeatureInput["geometry"],
): geometry is RegionBoundaryGeometry {
  return Boolean(
    geometry &&
      (geometry.type === "Polygon" || geometry.type === "MultiPolygon") &&
      geometry.coordinates !== undefined,
  );
}

function getSingleUploadFeature(payload: unknown): GeoJsonFeatureInput | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  if ((payload as { type?: unknown }).type === "Feature") {
    return payload as GeoJsonFeatureInput;
  }

  if ((payload as { type?: unknown }).type === "FeatureCollection") {
    const features = (payload as { features?: unknown }).features;
    if (!Array.isArray(features) || features.length !== 1) {
      return null;
    }

    return features[0] as GeoJsonFeatureInput;
  }

  return null;
}

export function parseBoundaryUpload(fileText: string): GeoJsonUploadResult {
  let payload: unknown;

  try {
    payload = JSON.parse(fileText);
  } catch {
    return {
      success: false,
      message: "File GeoJSON tidak valid",
    };
  }

  const feature = getSingleUploadFeature(payload);
  if (!feature) {
    return {
      success: false,
      message: "File GeoJSON harus berisi tepat satu polygon desa/kelurahan",
    };
  }

  if (!isPolygonGeometry(feature.geometry)) {
    return {
      success: false,
      message: "Geometry boundary harus bertipe Polygon atau MultiPolygon",
    };
  }

  return {
    success: true,
    geometry: {
      type: feature.geometry.type,
      coordinates: feature.geometry.coordinates,
    },
  };
}

export function buildDraftFeaturePayload(params: {
  boundaryKey: string;
  kecamatanId: string;
  kelurahanId: string;
  namaDesa: string;
  geometry: RegionBoundaryGeometry;
}): RegionBoundaryDraftFeature {
  return regionBoundaryDraftFeatureSchema.parse({
    boundaryKey: params.boundaryKey,
    level: "desa",
    kecamatanId: params.kecamatanId,
    kelurahanId: params.kelurahanId,
    namaDesa: params.namaDesa,
    geometry: params.geometry,
  });
}

export function createBoundaryImpactPanelModel(params: {
  impactedCount: number;
  sampleMoves: RegionBoundaryImpactMovedItem[];
  hasPreview: boolean;
  hasDraftChanges: boolean;
  publishedRevisionCount: number;
}) {
  const historyLabel = `${params.publishedRevisionCount} published revision`;

  if (!params.hasDraftChanges) {
    return {
      headline: "Belum ada draft boundary",
      badgeLabel: "IDLE",
      canPublish: false,
      canPreview: false,
      sampleRows: [],
      historyLabel,
    };
  }

  if (!params.hasPreview) {
    return {
      headline: "Draft siap dipreview",
      badgeLabel: "DRAFT",
      canPublish: false,
      canPreview: true,
      sampleRows: [],
      historyLabel,
    };
  }

  return {
    headline: `${params.impactedCount} OP terdampak`,
    badgeLabel: "READY",
    canPublish: true,
    canPreview: true,
    sampleRows: params.sampleMoves.map(
      (item) => `${item.namaOp}: ${item.fromKelurahan} -> ${item.toKelurahan}`,
    ),
    historyLabel,
  };
}

export function createBoundaryPublishSuccessDescription(params: {
  movedCount: number;
  mode: "publish-only" | "publish-and-reconcile";
}) {
  if (params.mode === "publish-and-reconcile") {
    return `Boundary berhasil dipublish. ${params.movedCount} OP ikut direkonsiliasi ke desa baru.`;
  }

  return `Boundary berhasil dipublish. ${params.movedCount} OP terdampak tercatat pada preview.`;
}

export function findBoundaryFeatureByKey(
  boundary: GeoJsonFeatureCollection | null | undefined,
  boundaryKey: string,
) {
  if (!boundary) {
    return null;
  }

  return (
    boundary.features.find(
      (feature) => String((feature.properties as Record<string, unknown> | undefined)?.__boundaryKey ?? "") === boundaryKey,
    ) ?? null
  );
}

export function areBoundaryGeometriesEqual(
  left: RegionBoundaryGeometry | null | undefined,
  right: RegionBoundaryGeometry | null | undefined,
) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}
