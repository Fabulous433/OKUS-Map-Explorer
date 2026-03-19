import { booleanPointInPolygon } from "@turf/boolean-point-in-polygon";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import {
  regionBoundaryDraftFeatureSchema,
  regionBoundaryImpactPreviewSchema,
  regionBoundaryPublishPayloadSchema,
  regionBoundaryRevisionSchema,
  type RegionBoundaryDraftFeature,
} from "@shared/region-boundary-admin";
import {
  auditLog,
  masterKecamatan,
  masterKelurahan,
  objekPajak,
  regionBoundaryRevision,
  regionBoundaryRevisionFeature,
} from "@shared/schema";
import { db, storage } from "./storage";
import { invalidateActiveRegionBoundaryCache, getActiveRegionBoundary } from "./region-boundaries";
import { mergePublishedDesaOverrides, type PublishedBoundaryFeature } from "./region-boundary-overrides";

type SaveDraftBoundaryFeatureInput = RegionBoundaryDraftFeature & {
  actorName: string;
};

type PreviewBoundaryImpactInput = RegionBoundaryDraftFeature;

type PublishDraftRevisionInput = {
  revisionId: number;
  mode: "publish-only" | "publish-and-reconcile";
  actorName: string;
};

type RollbackPublishedRevisionInput = {
  revisionId: number;
  actorName: string;
};

type InternalImpactItem = {
  opId: number;
  namaOp: string;
  fromKelurahan: string;
  toKelurahan: string;
  fromKelurahanId: string | null;
  toKelurahanId: string | null;
};

type ImpactComputation = {
  impactedCount: number;
  movedItems: InternalImpactItem[];
};

function normalizeRegionName(value: string) {
  return value.trim().toLocaleLowerCase("id").replace(/\s+/g, "");
}

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

function toPublishedBoundaryFeature(row: typeof regionBoundaryRevisionFeature.$inferSelect): PublishedBoundaryFeature {
  return {
    boundaryKey: row.boundaryKey,
    kecamatanId: row.kecamatanId,
    kelurahanId: row.kelurahanId,
    namaDesa: row.namaDesa,
    geometry: row.geometry as PublishedBoundaryFeature["geometry"],
  };
}

async function writeAuditEntry(input: {
  entityType: string;
  entityId: string;
  action: string;
  actorName: string;
  beforeData?: unknown;
  afterData?: unknown;
  metadata?: unknown;
}) {
  await db.insert(auditLog).values({
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    actorName: input.actorName,
    beforeData: input.beforeData ?? null,
    afterData: input.afterData ?? null,
    metadata: input.metadata ?? null,
    createdAt: new Date(),
  });
}

async function getKecamatanName(kecamatanId: string) {
  const [row] = await db
    .select({
      cpmKecId: masterKecamatan.cpmKecId,
      cpmKecamatan: masterKecamatan.cpmKecamatan,
      cpmKodeKec: masterKecamatan.cpmKodeKec,
    })
    .from(masterKecamatan)
    .where(eq(masterKecamatan.cpmKecId, kecamatanId))
    .limit(1);

  if (!row) {
    throw new Error("Kecamatan tidak dikenal di master wilayah aktif");
  }

  return row;
}

async function getKelurahanLookupByKecamatan(kecamatanId: string) {
  const rows = await storage.getMasterKelurahan(kecamatanId);
  const byId = new Map(rows.map((item) => [item.cpmKelId, item]));
  const byNormalizedName = new Map(
    rows.map((item) => [`${normalizeRegionName(item.cpmKelurahan)}`, item]),
  );
  return { byId, byNormalizedName };
}

function findContainingFeature(
  boundary: Awaited<ReturnType<typeof getActiveRegionBoundary>>["boundary"],
  longitude: number,
  latitude: number,
) {
  return boundary.features.find((item) => booleanPointInPolygon([longitude, latitude], item as any)) ?? null;
}

function resolveKelurahanFromFeature(
  feature: Awaited<ReturnType<typeof getActiveRegionBoundary>>["boundary"]["features"][number] | null,
  kelurahanLookup: Awaited<ReturnType<typeof getKelurahanLookupByKecamatan>>,
) {
  if (!feature) {
    return { id: null, name: null };
  }

  const explicitKelurahanId = String(feature.properties.__kelurahanId ?? "").trim();
  if (explicitKelurahanId) {
    const byId = kelurahanLookup.byId.get(explicitKelurahanId);
    return {
      id: explicitKelurahanId,
      name: byId?.cpmKelurahan ?? String(feature.properties.WADMKD ?? "").trim(),
    };
  }

  const featureName = String(feature.properties.WADMKD ?? "").trim();
  const matched = kelurahanLookup.byNormalizedName.get(normalizeRegionName(featureName));
  return {
    id: matched?.cpmKelId ?? null,
    name: featureName || null,
  };
}

async function getDraftRevisionById(id: number) {
  const [row] = await db.select().from(regionBoundaryRevision).where(eq(regionBoundaryRevision.id, id)).limit(1);
  return row ?? null;
}

async function getRevisionFeatures(revisionId: number) {
  return db
    .select()
    .from(regionBoundaryRevisionFeature)
    .where(eq(regionBoundaryRevisionFeature.revisionId, revisionId))
    .orderBy(asc(regionBoundaryRevisionFeature.id));
}

async function computeImpactForOverrides(input: {
  kecamatanId: string;
  overrides: PublishedBoundaryFeature[];
}): Promise<ImpactComputation> {
  const kecamatan = await getKecamatanName(input.kecamatanId);
  const kelurahanLookup = await getKelurahanLookupByKecamatan(input.kecamatanId);
  const baseBoundary = await getActiveRegionBoundary("desa", "precise", {
    kecamatanId: input.kecamatanId,
    kecamatanName: kecamatan.cpmKecamatan,
  });
  const nextBoundary = mergePublishedDesaOverrides({
    baseBoundary: baseBoundary.boundary,
    overrides: input.overrides,
  });

  const objekPajakRows = await storage.getObjekPajakByKecamatanId(input.kecamatanId);
  const movedItems = objekPajakRows
    .filter((item) => item.latitude !== null && item.longitude !== null)
    .map((item) => {
      const longitude = Number(item.longitude);
      const latitude = Number(item.latitude);
      const currentFeature = findContainingFeature(baseBoundary.boundary, longitude, latitude);
      const nextFeature = findContainingFeature(nextBoundary, longitude, latitude);
      const currentKelurahan = resolveKelurahanFromFeature(currentFeature, kelurahanLookup);
      const nextKelurahan = resolveKelurahanFromFeature(nextFeature, kelurahanLookup);

      if (!currentKelurahan.name || !nextKelurahan.name || currentKelurahan.name === nextKelurahan.name) {
        return null;
      }

      return {
        opId: item.id,
        namaOp: item.namaOp,
        fromKelurahan: currentKelurahan.name,
        toKelurahan: nextKelurahan.name,
        fromKelurahanId: currentKelurahan.id,
        toKelurahanId: nextKelurahan.id,
      };
    })
    .filter((item): item is InternalImpactItem => item !== null);

  return {
    impactedCount: movedItems.length,
    movedItems,
  };
}

async function computeImpactForRevisionFeatures(features: PublishedBoundaryFeature[]) {
  const featuresByKecamatanId = new Map<string, PublishedBoundaryFeature[]>();
  for (const feature of features) {
    const list = featuresByKecamatanId.get(feature.kecamatanId) ?? [];
    list.push(feature);
    featuresByKecamatanId.set(feature.kecamatanId, list);
  }

  const movedItems: InternalImpactItem[] = [];
  for (const [kecamatanId, overrides] of Array.from(featuresByKecamatanId.entries())) {
    const result = await computeImpactForOverrides({ kecamatanId, overrides });
    movedItems.push(...result.movedItems);
  }

  return {
    impactedCount: movedItems.length,
    movedItems,
  };
}

function toPublicImpactSummary(input: ImpactComputation) {
  return regionBoundaryImpactPreviewSchema.parse({
    impactedCount: input.impactedCount,
    movedItems: input.movedItems.map((item) => ({
      opId: item.opId,
      namaOp: item.namaOp,
      fromKelurahan: item.fromKelurahan,
      toKelurahan: item.toKelurahan,
    })),
  });
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

  const beforeData = existing ? mapDraftFeatureRow(existing) : null;

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

  await writeAuditEntry({
    entityType: "region_boundary_revision",
    entityId: String(revision.id),
    action: "draft_save",
    actorName: input.actorName,
    beforeData,
    afterData: parsed,
    metadata: {
      boundaryKey: parsed.boundaryKey,
    },
  });

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
  const draftRevision = await getOrCreateDesaDraftRevision("system-preview");
  const existingDraftFeatures = await getRevisionFeatures(draftRevision.id);

  const draftFeaturesByBoundaryKey = new Map<string, PublishedBoundaryFeature>();
  for (const row of existingDraftFeatures) {
    draftFeaturesByBoundaryKey.set(row.boundaryKey, toPublishedBoundaryFeature(row));
  }
  draftFeaturesByBoundaryKey.set(parsed.boundaryKey, {
    boundaryKey: parsed.boundaryKey,
    kecamatanId: parsed.kecamatanId,
    kelurahanId: parsed.kelurahanId,
    namaDesa: parsed.namaDesa,
    geometry: parsed.geometry,
  });

  const impact = await computeImpactForOverrides({
    kecamatanId: parsed.kecamatanId,
    overrides: Array.from(draftFeaturesByBoundaryKey.values()).filter((feature) => feature.kecamatanId === parsed.kecamatanId),
  });

  return toPublicImpactSummary(impact);
}

export async function publishDraftRevision(input: PublishDraftRevisionInput) {
  const parsed = regionBoundaryPublishPayloadSchema.parse({
    revisionId: input.revisionId,
    mode: input.mode,
  });
  const revision = await getDraftRevisionById(parsed.revisionId);
  if (!revision) {
    throw new Error("Revision boundary tidak ditemukan");
  }
  if (revision.status !== "draft") {
    throw new Error("Hanya revision draft yang dapat dipublish");
  }

  const revisionFeatures = await getRevisionFeatures(revision.id);
  if (revisionFeatures.length === 0) {
    throw new Error("Revision draft belum memiliki feature boundary");
  }

  const impact = await computeImpactForRevisionFeatures(revisionFeatures.map(toPublishedBoundaryFeature));
  const impactSummary = toPublicImpactSummary(impact);
  const now = new Date();

  const publishedBefore = await db
    .select()
    .from(regionBoundaryRevision)
    .where(
      and(
        eq(regionBoundaryRevision.regionKey, revision.regionKey),
        eq(regionBoundaryRevision.level, revision.level),
        eq(regionBoundaryRevision.status, "published"),
      ),
    );

  await db.transaction(async (tx) => {
    if (publishedBefore.length > 0) {
      await tx
        .update(regionBoundaryRevision)
        .set({
          status: "superseded",
          updatedAt: now,
        })
        .where(inArray(regionBoundaryRevision.id, publishedBefore.map((item) => item.id)));
    }

    await tx
      .update(regionBoundaryRevision)
      .set({
        status: "published",
        publishedBy: input.actorName,
        publishedAt: now,
        impactSummary,
        updatedAt: now,
      })
      .where(eq(regionBoundaryRevision.id, revision.id));

    if (parsed.mode === "publish-and-reconcile" && impact.movedItems.length > 0) {
      for (const item of impact.movedItems) {
        if (!item.toKelurahanId) {
          continue;
        }

        await tx
          .update(objekPajak)
          .set({
            kelurahanId: item.toKelurahanId,
            updatedAt: now,
          })
          .where(eq(objekPajak.id, item.opId));

        await tx.insert(auditLog).values({
          entityType: "objek_pajak",
          entityId: String(item.opId),
          action: "boundary_reconcile",
          actorName: input.actorName,
          beforeData: {
            kelurahanId: item.fromKelurahanId,
            kelurahan: item.fromKelurahan,
          },
          afterData: {
            kelurahanId: item.toKelurahanId,
            kelurahan: item.toKelurahan,
          },
          metadata: {
            revisionId: revision.id,
            source: "boundary-publish",
          },
          createdAt: now,
        });
      }
    }

    await tx.insert(auditLog).values({
      entityType: "region_boundary_revision",
      entityId: String(revision.id),
      action: "publish",
      actorName: input.actorName,
      beforeData: {
        status: revision.status,
      },
      afterData: {
        status: "published",
        mode: parsed.mode,
        impactSummary,
      },
      metadata: {
        supersededRevisionIds: publishedBefore.map((item) => item.id),
      },
      createdAt: now,
    });
  });

  invalidateActiveRegionBoundaryCache();

  const publishedRevision = await getDraftRevisionById(revision.id);
  if (!publishedRevision) {
    throw new Error("Revision publish gagal dimuat ulang");
  }

  return {
    revision: mapRevisionRow(publishedRevision),
    impactSummary,
    reconciledCount: parsed.mode === "publish-and-reconcile" ? impact.movedItems.filter((item) => item.toKelurahanId).length : 0,
  };
}

export async function rollbackPublishedRevision(input: RollbackPublishedRevisionInput) {
  const targetRevision = await getDraftRevisionById(input.revisionId);
  if (!targetRevision) {
    throw new Error("Revision rollback tidak ditemukan");
  }
  if (targetRevision.status === "draft") {
    throw new Error("Revision draft tidak dapat dijadikan target rollback");
  }

  const [currentPublished] = await db
    .select()
    .from(regionBoundaryRevision)
    .where(
      and(
        eq(regionBoundaryRevision.regionKey, targetRevision.regionKey),
        eq(regionBoundaryRevision.level, targetRevision.level),
        eq(regionBoundaryRevision.status, "published"),
      ),
    )
    .orderBy(desc(regionBoundaryRevision.publishedAt), desc(regionBoundaryRevision.id))
    .limit(1);

  if (currentPublished && currentPublished.id === targetRevision.id) {
    throw new Error("Revision ini sudah menjadi publish aktif");
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    if (currentPublished) {
      await tx
        .update(regionBoundaryRevision)
        .set({
          status: "superseded",
          updatedAt: now,
        })
        .where(eq(regionBoundaryRevision.id, currentPublished.id));
    }

    await tx
      .update(regionBoundaryRevision)
      .set({
        status: "published",
        publishedBy: input.actorName,
        publishedAt: now,
        updatedAt: now,
      })
      .where(eq(regionBoundaryRevision.id, targetRevision.id));

    await tx.insert(auditLog).values({
      entityType: "region_boundary_revision",
      entityId: String(targetRevision.id),
      action: "rollback",
      actorName: input.actorName,
      beforeData: {
        status: targetRevision.status,
      },
      afterData: {
        status: "published",
      },
      metadata: {
        replacedRevisionId: currentPublished?.id ?? null,
      },
      createdAt: now,
    });
  });

  invalidateActiveRegionBoundaryCache();

  const publishedRevision = await getDraftRevisionById(targetRevision.id);
  if (!publishedRevision) {
    throw new Error("Revision rollback gagal dimuat ulang");
  }

  return {
    revision: mapRevisionRow(publishedRevision),
  };
}
