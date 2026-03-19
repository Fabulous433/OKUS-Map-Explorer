import { booleanPointInPolygon } from "@turf/boolean-point-in-polygon";
import { and, asc, desc, eq } from "drizzle-orm";
import {
  regionBoundaryDraftFeatureSchema,
  regionBoundaryImpactPreviewSchema,
  regionBoundaryRevisionSchema,
  type RegionBoundaryDraftFeature,
} from "@shared/region-boundary-admin";
import {
  masterKecamatan,
  regionBoundaryRevision,
  regionBoundaryRevisionFeature,
} from "@shared/schema";
import { db, storage } from "./storage";
import { getActiveRegionBoundary } from "./region-boundaries";
import { mergePublishedDesaOverrides, type PublishedBoundaryFeature } from "./region-boundary-overrides";

type SaveDraftBoundaryFeatureInput = RegionBoundaryDraftFeature & {
  actorName: string;
};

type PreviewBoundaryImpactInput = RegionBoundaryDraftFeature;

function toIsoString(value: Date | null) {
  return value ? value.toISOString() : null;
}

function computeBoundsFromCoordinates(coordinates: unknown) {
  let minLng = Number.POSITIVE_INFINITY;
  let minLat = Number.POSITIVE_INFINITY;
  let maxLng = Number.NEGATIVE_INFINITY;
  let maxLat = Number.NEGATIVE_INFINITY;

  const visit = (value: unknown) => {
    if (!Array.isArray(value)) {
      return;
    }

    if (
      value.length >= 2 &&
      typeof value[0] === "number" &&
      typeof value[1] === "number"
    ) {
      minLng = Math.min(minLng, value[0]);
      minLat = Math.min(minLat, value[1]);
      maxLng = Math.max(maxLng, value[0]);
      maxLat = Math.max(maxLat, value[1]);
      return;
    }

    for (const entry of value) {
      visit(entry);
    }
  };

  visit(coordinates);

  if (![minLng, minLat, maxLng, maxLat].every(Number.isFinite)) {
    throw new Error("Geometry boundary tidak memiliki koordinat polygon yang valid");
  }

  return { minLng, minLat, maxLng, maxLat };
}

function mapRevisionRow(row: typeof regionBoundaryRevision.$inferSelect) {
  return regionBoundaryRevisionSchema.parse({
    id: row.id,
    regionKey: row.regionKey,
    level: row.level,
    status: row.status,
    notes: row.notes,
    createdBy: row.createdBy,
    publishedBy: row.publishedBy,
    publishedAt: toIsoString(row.publishedAt),
    impactSummary: row.impactSummary,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  });
}

function mapDraftFeatureRow(row: typeof regionBoundaryRevisionFeature.$inferSelect) {
  return regionBoundaryDraftFeatureSchema.parse({
    boundaryKey: row.boundaryKey,
    level: "desa",
    kecamatanId: row.kecamatanId,
    kelurahanId: row.kelurahanId,
    namaDesa: row.namaDesa,
    geometry: row.geometry,
  });
}

async function getKecamatanName(kecamatanId: string) {
  const [row] = await db
    .select({
      cpmKecId: masterKecamatan.cpmKecId,
      cpmKecamatan: masterKecamatan.cpmKecamatan,
    })
    .from(masterKecamatan)
    .where(eq(masterKecamatan.cpmKecId, kecamatanId))
    .limit(1);

  if (!row) {
    throw new Error("Kecamatan tidak dikenal di master wilayah aktif");
  }

  return row;
}

function findContainingFeatureName(
  boundary: Awaited<ReturnType<typeof getActiveRegionBoundary>>["boundary"],
  longitude: number,
  latitude: number,
) {
  const feature = boundary.features.find((item) => booleanPointInPolygon([longitude, latitude], item as any));
  return feature ? String(feature.properties.WADMKD ?? "").trim() : null;
}

async function getDraftRevisionById(id: number) {
  const [row] = await db.select().from(regionBoundaryRevision).where(eq(regionBoundaryRevision.id, id)).limit(1);
  return row ?? null;
}

export async function getOrCreateDesaDraftRevision(createdBy: string) {
  const [existing] = await db
    .select()
    .from(regionBoundaryRevision)
    .where(
      and(
        eq(regionBoundaryRevision.regionKey, "okus"),
        eq(regionBoundaryRevision.level, "desa"),
        eq(regionBoundaryRevision.status, "draft"),
      ),
    )
    .orderBy(desc(regionBoundaryRevision.updatedAt), desc(regionBoundaryRevision.id))
    .limit(1);

  if (existing) {
    return existing;
  }

  const now = new Date();
  const [created] = await db
    .insert(regionBoundaryRevision)
    .values({
      regionKey: "okus",
      level: "desa",
      status: "draft",
      notes: null,
      createdBy,
      publishedBy: null,
      publishedAt: null,
      impactSummary: null,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return created;
}

export async function getDesaDraftByKecamatan(kecamatanId: string, actorName: string) {
  const revision = await getOrCreateDesaDraftRevision(actorName);
  const features = await db
    .select()
    .from(regionBoundaryRevisionFeature)
    .where(
      and(
        eq(regionBoundaryRevisionFeature.revisionId, revision.id),
        eq(regionBoundaryRevisionFeature.kecamatanId, kecamatanId),
      ),
    )
    .orderBy(asc(regionBoundaryRevisionFeature.namaDesa), asc(regionBoundaryRevisionFeature.id));

  return {
    revision: mapRevisionRow(revision),
    features: features.map(mapDraftFeatureRow),
  };
}

export async function saveDraftBoundaryFeature(input: SaveDraftBoundaryFeatureInput) {
  const parsed = regionBoundaryDraftFeatureSchema.parse(input);
  const revision = await getOrCreateDesaDraftRevision(input.actorName);
  const now = new Date();
  const bounds = computeBoundsFromCoordinates(parsed.geometry.coordinates);

  const [existing] = await db
    .select()
    .from(regionBoundaryRevisionFeature)
    .where(
      and(
        eq(regionBoundaryRevisionFeature.revisionId, revision.id),
        eq(regionBoundaryRevisionFeature.boundaryKey, parsed.boundaryKey),
      ),
    )
    .limit(1);

  if (existing) {
    await db
      .update(regionBoundaryRevisionFeature)
      .set({
        kecamatanId: parsed.kecamatanId,
        kelurahanId: parsed.kelurahanId,
        namaDesa: parsed.namaDesa,
        geometry: parsed.geometry,
        bounds,
        updatedAt: now,
      })
      .where(eq(regionBoundaryRevisionFeature.id, existing.id));
  } else {
    await db.insert(regionBoundaryRevisionFeature).values({
      revisionId: revision.id,
      boundaryKey: parsed.boundaryKey,
      kecamatanId: parsed.kecamatanId,
      kelurahanId: parsed.kelurahanId,
      namaDesa: parsed.namaDesa,
      geometry: parsed.geometry,
      bounds,
      createdAt: now,
      updatedAt: now,
    });
  }

  await db
    .update(regionBoundaryRevision)
    .set({
      updatedAt: now,
    })
    .where(eq(regionBoundaryRevision.id, revision.id));

  return {
    revision: mapRevisionRow((await getDraftRevisionById(revision.id)) ?? revision),
    feature: parsed,
  };
}

export async function listBoundaryRevisions() {
  const rows = await db
    .select()
    .from(regionBoundaryRevision)
    .where(and(eq(regionBoundaryRevision.regionKey, "okus"), eq(regionBoundaryRevision.level, "desa")))
    .orderBy(desc(regionBoundaryRevision.updatedAt), desc(regionBoundaryRevision.id));

  return rows.map(mapRevisionRow);
}

export async function previewDraftImpact(input: PreviewBoundaryImpactInput) {
  const parsed = regionBoundaryDraftFeatureSchema.parse(input);
  const kecamatan = await getKecamatanName(parsed.kecamatanId);
  const draftRevision = await getOrCreateDesaDraftRevision("system-preview");
  const existingDraftFeatures = await db
    .select()
    .from(regionBoundaryRevisionFeature)
    .where(eq(regionBoundaryRevisionFeature.revisionId, draftRevision.id))
    .orderBy(asc(regionBoundaryRevisionFeature.id));

  const draftFeaturesByBoundaryKey = new Map<string, PublishedBoundaryFeature>();
  for (const row of existingDraftFeatures) {
    draftFeaturesByBoundaryKey.set(row.boundaryKey, {
      boundaryKey: row.boundaryKey,
      kecamatanId: row.kecamatanId,
      kelurahanId: row.kelurahanId,
      namaDesa: row.namaDesa,
      geometry: row.geometry as PublishedBoundaryFeature["geometry"],
    });
  }
  draftFeaturesByBoundaryKey.set(parsed.boundaryKey, {
    boundaryKey: parsed.boundaryKey,
    kecamatanId: parsed.kecamatanId,
    kelurahanId: parsed.kelurahanId,
    namaDesa: parsed.namaDesa,
    geometry: parsed.geometry,
  });

  const baseBoundary = await getActiveRegionBoundary("desa", "precise", {
    kecamatanId: parsed.kecamatanId,
    kecamatanName: kecamatan.cpmKecamatan,
  });
  const draftBoundary = mergePublishedDesaOverrides({
    baseBoundary: baseBoundary.boundary,
    overrides: Array.from(draftFeaturesByBoundaryKey.values()),
  });

  const objekPajakRows = await storage.getObjekPajakByKecamatanId(parsed.kecamatanId);
  const movedItems = objekPajakRows
    .filter((item) => item.latitude !== null && item.longitude !== null)
    .map((item) => {
      const longitude = Number(item.longitude);
      const latitude = Number(item.latitude);
      const fromKelurahan = findContainingFeatureName(baseBoundary.boundary, longitude, latitude);
      const toKelurahan = findContainingFeatureName(draftBoundary, longitude, latitude);
      if (!fromKelurahan || !toKelurahan || fromKelurahan === toKelurahan) {
        return null;
      }

      return {
        opId: item.id,
        namaOp: item.namaOp,
        fromKelurahan,
        toKelurahan,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null);

  return regionBoundaryImpactPreviewSchema.parse({
    impactedCount: movedItems.length,
    movedItems,
  });
}
