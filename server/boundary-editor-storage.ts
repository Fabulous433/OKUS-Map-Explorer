import { booleanPointInPolygon } from "@turf/boolean-point-in-polygon";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import {
  regionBoundaryFragmentAssignmentPayloadSchema,
  regionBoundaryDraftFeatureSchema,
  regionBoundaryImpactPreviewSchema,
  regionBoundaryPublishPayloadSchema,
  regionBoundaryRevisionSchema,
  regionBoundaryTakeoverConfirmationPayloadSchema,
  regionBoundaryTopologyAnalysisSchema,
  type RegionBoundaryFragmentAssignmentMode,
  type RegionBoundaryFragmentStatus,
  type RegionBoundaryGeometry,
  type RegionBoundaryTopologyAnalysis,
  type RegionBoundaryTopologyFragment,
  type RegionBoundaryDraftFeature,
} from "@shared/region-boundary-admin";
import {
  auditLog,
  masterKecamatan,
  masterKelurahan,
  objekPajak,
  regionBoundaryRevision,
  regionBoundaryRevisionFeature,
  regionBoundaryRevisionFragment,
} from "@shared/schema";
import { db, storage } from "./storage";
import { invalidateActiveRegionBoundaryCache, getActiveRegionBoundary } from "./region-boundaries";
import {
  analyzeTopologyDraft,
  materializeAffectedGeometryPack,
  type TopologyFragment,
} from "./region-boundary-topology";
import { buildDesaBoundaryKey, mergePublishedDesaOverrides, type PublishedBoundaryFeature } from "./region-boundary-overrides";

type SaveDraftBoundaryFeatureInput = RegionBoundaryDraftFeature & {
  actorName: string;
};

type PreviewBoundaryImpactInput = RegionBoundaryDraftFeature;

type AnalyzeDraftBoundaryTopologyInput = RegionBoundaryDraftFeature & {
  actorName: string;
};

type AssignDraftTopologyFragmentInput = {
  revisionId: number;
  fragmentId: string;
  assignedBoundaryKey: string;
  actorName: string;
};

type ConfirmDraftTakeoverInput = {
  revisionId: number;
  actorName: string;
  takeoverConfirmedBy: string;
};

type PublishDraftRevisionInput = {
  revisionId: number;
  mode: "publish-only" | "publish-and-reconcile";
  topologyStatus: "draft-ready";
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

type DraftTopologyState = {
  revision: ReturnType<typeof mapRevisionRow>;
  analysis: RegionBoundaryTopologyAnalysis;
  features: RegionBoundaryDraftFeature[];
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
    topologyStatus: row.topologyStatus,
    topologySummary: row.topologySummary,
    takeoverConfirmedAt: toIsoString(row.takeoverConfirmedAt),
    takeoverConfirmedBy: row.takeoverConfirmedBy,
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

async function getRevisionFragments(revisionId: number, sourceBoundaryKey?: string) {
  const conditions = [eq(regionBoundaryRevisionFragment.revisionId, revisionId)];
  if (sourceBoundaryKey) {
    conditions.push(eq(regionBoundaryRevisionFragment.sourceBoundaryKey, sourceBoundaryKey));
  }

  return db
    .select()
    .from(regionBoundaryRevisionFragment)
    .where(and(...conditions))
    .orderBy(asc(regionBoundaryRevisionFragment.fragmentId));
}

function mapTopologyFragmentRow(row: typeof regionBoundaryRevisionFragment.$inferSelect): RegionBoundaryTopologyFragment {
  const status: RegionBoundaryFragmentStatus =
    row.status === "resolved"
      ? "resolved"
      : row.status === "invalid"
        ? "invalid"
        : "unresolved";

  return {
    fragmentId: row.fragmentId,
    type: row.type as RegionBoundaryTopologyFragment["type"],
    sourceBoundaryKey: row.sourceBoundaryKey,
    candidateBoundaryKeys: Array.isArray(row.candidateBoundaryKeys)
      ? row.candidateBoundaryKeys.map((value) => String(value))
      : [],
    assignedBoundaryKey: row.assignedBoundaryKey,
    assignmentMode: row.assignmentMode as RegionBoundaryFragmentAssignmentMode | null,
    status,
    geometry: row.geometry as RegionBoundaryGeometry,
    areaSqM: Number(row.areaSqM),
  };
}

function toPublicTopologyFragment(fragment: TopologyFragment): RegionBoundaryTopologyFragment {
  return {
    fragmentId: `${fragment.sourceBoundaryKey}:${fragment.fragmentId}`,
    type: fragment.type,
    sourceBoundaryKey: fragment.sourceBoundaryKey,
    candidateBoundaryKeys: [...fragment.candidateBoundaryKeys],
    assignedBoundaryKey: fragment.assignedBoundaryKey,
    assignmentMode: fragment.assignmentMode as RegionBoundaryFragmentAssignmentMode | null,
    status:
      fragment.status === "resolved"
        ? "resolved"
        : fragment.status === "invalid"
          ? "invalid"
          : "unresolved",
    geometry: fragment.geometry,
    areaSqM: fragment.areaSqM,
  };
}

function summarizeTopologyFragments(fragments: RegionBoundaryTopologyFragment[]) {
  return {
    fragmentCount: fragments.length,
    unresolvedFragmentCount: fragments.filter((fragment) => fragment.status === "unresolved").length,
    autoAssignedFragmentCount: fragments.filter(
      (fragment) => fragment.status === "resolved" && fragment.assignmentMode === "auto",
    ).length,
    manualAssignmentRequiredCount: fragments.filter((fragment) => fragment.status !== "resolved").length,
    invalidFragmentCount: fragments.filter((fragment) => fragment.status === "invalid").length,
  };
}

function buildRevisionTopologyStatus(params: {
  revisionStatus: string;
  fragments: RegionBoundaryTopologyFragment[];
  takeoverConfirmedAt: Date | null;
}) {
  if (params.revisionStatus === "published") {
    return "published" as const;
  }

  if (params.revisionStatus === "superseded") {
    return "superseded" as const;
  }

  if (params.fragments.length === 0) {
    return "draft-ready" as const;
  }

  const hasTakeover = params.fragments.some((fragment) => fragment.type === "takeover-area");
  if (hasTakeover && !params.takeoverConfirmedAt) {
    return "draft-needs-resolution" as const;
  }

  if (params.fragments.some((fragment) => fragment.status !== "resolved")) {
    return "draft-needs-resolution" as const;
  }

  return "draft-ready" as const;
}

function buildTopologyAnalysis(params: {
  revision: typeof regionBoundaryRevision.$inferSelect;
  fragments: RegionBoundaryTopologyFragment[];
}) {
  const summary = summarizeTopologyFragments(params.fragments);
  const requiresTakeoverConfirmation =
    params.fragments.some((fragment) => fragment.type === "takeover-area") &&
    !params.revision.takeoverConfirmedAt;
  const canPublish = buildRevisionTopologyStatus({
    revisionStatus: params.revision.status,
    fragments: params.fragments,
    takeoverConfirmedAt: params.revision.takeoverConfirmedAt,
  }) === "draft-ready";
  return {
    ...regionBoundaryTopologyAnalysisSchema.parse({
      revisionId: params.revision.id,
      regionKey: params.revision.regionKey,
      level: params.revision.level,
      topologyStatus: buildRevisionTopologyStatus({
        revisionStatus: params.revision.status,
        fragments: params.fragments,
        takeoverConfirmedAt: params.revision.takeoverConfirmedAt,
      }),
      summary,
      fragments: params.fragments,
    }),
    requiresTakeoverConfirmation,
    canPublish,
  };
}

function assertDraftRevisionPublishable(params: {
  revision: typeof regionBoundaryRevision.$inferSelect;
  fragments: RegionBoundaryTopologyFragment[];
}) {
  if (params.revision.topologyStatus !== "draft-ready") {
    if (params.fragments.some((fragment) => fragment.status !== "resolved")) {
      throw new Error("Revision boundary masih memiliki fragment topology yang belum diselesaikan");
    }

    if (
      params.fragments.some((fragment) => fragment.type === "takeover-area") &&
      !params.revision.takeoverConfirmedAt
    ) {
      throw new Error("Revision boundary memiliki takeover yang belum dikonfirmasi");
    }

    throw new Error("Revision boundary belum topology-ready untuk publish");
  }

  if (params.fragments.some((fragment) => fragment.status !== "resolved")) {
    throw new Error("Revision boundary masih memiliki fragment topology yang belum diselesaikan");
  }

  if (
    params.fragments.some((fragment) => fragment.type === "takeover-area") &&
    !params.revision.takeoverConfirmedAt
  ) {
    throw new Error("Revision boundary memiliki takeover yang belum dikonfirmasi");
  }
}

async function getActiveDesaFeaturesForTopology(): Promise<PublishedBoundaryFeature[]> {
  const [kecamatanRows, kelurahanRows, activeBoundary] = await Promise.all([
    db
      .select({
        cpmKecId: masterKecamatan.cpmKecId,
        cpmKecamatan: masterKecamatan.cpmKecamatan,
        cpmKodeKec: masterKecamatan.cpmKodeKec,
      })
      .from(masterKecamatan),
    db
      .select({
        cpmKelId: masterKelurahan.cpmKelId,
        cpmKelurahan: masterKelurahan.cpmKelurahan,
        cpmKodeKec: masterKelurahan.cpmKodeKec,
      })
      .from(masterKelurahan),
    getActiveRegionBoundary("desa", "precise"),
  ]);
  const kecamatanByNormalizedName = new Map(
    kecamatanRows.map((row) => [normalizeRegionName(row.cpmKecamatan), row] as const),
  );
  const kelurahanById = new Map(kelurahanRows.map((row) => [row.cpmKelId, row] as const));
  const kelurahanByCompositeKey = new Map(
    kelurahanRows.map((row) => [`${row.cpmKodeKec}:${normalizeRegionName(row.cpmKelurahan)}`, row] as const),
  );

  return activeBoundary.boundary.features
    .map((feature) => {
      const namaDesa = String(feature.properties.WADMKD ?? "").trim();
      const kecamatanName = String(feature.properties.WADMKC ?? "").trim();
      const kecamatan = kecamatanByNormalizedName.get(normalizeRegionName(kecamatanName));
      if (!kecamatan) {
        return null;
      }

      const explicitKelurahanId = String(feature.properties.__kelurahanId ?? "").trim();
      const kelurahan =
        (explicitKelurahanId ? kelurahanById.get(explicitKelurahanId) : null) ??
        kelurahanByCompositeKey.get(`${kecamatan.cpmKodeKec}:${normalizeRegionName(namaDesa)}`);
      if (!kelurahan) {
        return null;
      }

      return {
        boundaryKey: String(
          feature.properties.__boundaryKey ??
            buildDesaBoundaryKey({
              kecamatanName,
              desaName: namaDesa,
            }),
        ),
        kecamatanId: kecamatan.cpmKecId,
        kelurahanId: kelurahan.cpmKelId,
        namaDesa: kelurahan.cpmKelurahan,
        geometry: feature.geometry as PublishedBoundaryFeature["geometry"],
      } satisfies PublishedBoundaryFeature;
    })
    .filter((feature): feature is PublishedBoundaryFeature => feature !== null);
}

async function getMergedDraftBaseFeatures(revisionId: number) {
  const baseFeatures = await getActiveDesaFeaturesForTopology();
  const draftFeatures = await getRevisionFeatures(revisionId);
  const draftOverrideByBoundaryKey = new Map(draftFeatures.map((row) => [row.boundaryKey, toPublishedBoundaryFeature(row)]));
  const baseFeatureKeys = new Set(baseFeatures.map((feature) => feature.boundaryKey));

  return [
    ...baseFeatures.map((feature) => draftOverrideByBoundaryKey.get(feature.boundaryKey) ?? feature),
    ...draftFeatures
      .map(toPublishedBoundaryFeature)
      .filter((feature) => !baseFeatureKeys.has(feature.boundaryKey)),
  ];
}

function toManagedBoundaryKeys(sourceBoundaryKey: string, fragments: Array<Pick<RegionBoundaryTopologyFragment, "candidateBoundaryKeys" | "assignedBoundaryKey">>) {
  const boundaryKeys = new Set<string>([sourceBoundaryKey]);
  for (const fragment of fragments) {
    for (const candidateBoundaryKey of fragment.candidateBoundaryKeys) {
      boundaryKeys.add(candidateBoundaryKey);
    }
    if (fragment.assignedBoundaryKey) {
      boundaryKeys.add(fragment.assignedBoundaryKey);
    }
  }

  return Array.from(boundaryKeys);
}

async function replaceRevisionFeaturePack(params: {
  revisionId: number;
  sourceBoundaryKey: string;
  features: PublishedBoundaryFeature[];
  previousFragments: RegionBoundaryTopologyFragment[];
  nextFragments: RegionBoundaryTopologyFragment[];
}) {
  const boundaryKeysToReplace = Array.from(
    new Set([
      ...toManagedBoundaryKeys(params.sourceBoundaryKey, params.previousFragments),
      ...params.features.map((feature) => feature.boundaryKey),
      ...toManagedBoundaryKeys(params.sourceBoundaryKey, params.nextFragments),
    ]),
  );

  if (boundaryKeysToReplace.length > 0) {
    await db
      .delete(regionBoundaryRevisionFeature)
      .where(
        and(
          eq(regionBoundaryRevisionFeature.revisionId, params.revisionId),
          inArray(regionBoundaryRevisionFeature.boundaryKey, boundaryKeysToReplace),
        ),
      );
  }

  if (params.features.length === 0) {
    return;
  }

  const now = new Date();
  await db.insert(regionBoundaryRevisionFeature).values(
    params.features.map((feature) => ({
      revisionId: params.revisionId,
      boundaryKey: feature.boundaryKey,
      kecamatanId: feature.kecamatanId,
      kelurahanId: feature.kelurahanId,
      namaDesa: feature.namaDesa,
      geometry: feature.geometry,
      bounds: computeBoundsFromCoordinates(feature.geometry.coordinates),
      createdAt: now,
      updatedAt: now,
    })),
  );
}

async function persistRevisionFragments(params: {
  revisionId: number;
  sourceBoundaryKey: string;
  fragments: RegionBoundaryTopologyFragment[];
}) {
  await db
    .delete(regionBoundaryRevisionFragment)
    .where(
      and(
        eq(regionBoundaryRevisionFragment.revisionId, params.revisionId),
        eq(regionBoundaryRevisionFragment.sourceBoundaryKey, params.sourceBoundaryKey),
      ),
    );

  if (params.fragments.length === 0) {
    return;
  }

  await db.insert(regionBoundaryRevisionFragment).values(
    params.fragments.map((fragment) => ({
      revisionId: params.revisionId,
      fragmentId: fragment.fragmentId,
      type: fragment.type,
      sourceBoundaryKey: fragment.sourceBoundaryKey,
      candidateBoundaryKeys: fragment.candidateBoundaryKeys,
      assignedBoundaryKey: fragment.assignedBoundaryKey,
      assignmentMode: fragment.assignmentMode,
      status: fragment.status,
      geometry: fragment.geometry,
      areaSqM: String(fragment.areaSqM.toFixed(2)),
    })),
  );
}

async function getDraftTopologyStateBySourceBoundary(revisionId: number, sourceBoundaryKey: string): Promise<DraftTopologyState> {
  const revision = await getDraftRevisionById(revisionId);
  if (!revision) {
    throw new Error("Revision draft topology tidak ditemukan");
  }

  const fragments = (await getRevisionFragments(revisionId, sourceBoundaryKey)).map(mapTopologyFragmentRow);
  const managedBoundaryKeys = toManagedBoundaryKeys(sourceBoundaryKey, fragments);
  const features = managedBoundaryKeys.length > 0
    ? (await db
        .select()
        .from(regionBoundaryRevisionFeature)
        .where(
          and(
            eq(regionBoundaryRevisionFeature.revisionId, revisionId),
            inArray(regionBoundaryRevisionFeature.boundaryKey, managedBoundaryKeys),
          ),
        )
        .orderBy(asc(regionBoundaryRevisionFeature.namaDesa), asc(regionBoundaryRevisionFeature.id))).map(mapDraftFeatureRow)
    : [];

  return {
    revision: mapRevisionRow(revision),
    analysis: buildTopologyAnalysis({ revision, fragments }),
    features,
  };
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

export async function resetDraftBoundaryFeature(input: { boundaryKey: string; actorName: string }) {
  const revision = await getOrCreateDesaDraftRevision(input.actorName);
  if (revision.status !== "draft") {
    throw new Error("Hanya revision draft yang dapat direset");
  }

  const existingFragments = (await getRevisionFragments(revision.id, input.boundaryKey)).map(mapTopologyFragmentRow);
  const boundaryKeysToDelete = toManagedBoundaryKeys(input.boundaryKey, existingFragments);

  if (boundaryKeysToDelete.length > 0) {
    await db
      .delete(regionBoundaryRevisionFeature)
      .where(
        and(
          eq(regionBoundaryRevisionFeature.revisionId, revision.id),
          inArray(regionBoundaryRevisionFeature.boundaryKey, boundaryKeysToDelete),
        ),
      );
  }
  await db
    .delete(regionBoundaryRevisionFragment)
    .where(
      and(
        eq(regionBoundaryRevisionFragment.revisionId, revision.id),
        eq(regionBoundaryRevisionFragment.sourceBoundaryKey, input.boundaryKey),
      ),
    );

  const remainingFragments = (await getRevisionFragments(revision.id)).map(mapTopologyFragmentRow);
  const remainingFeatures = await getRevisionFeatures(revision.id);
  const hasTakeover = remainingFragments.some((fragment) => fragment.type === "takeover-area");
  const topologyStatus =
    remainingFragments.length === 0 && remainingFeatures.length === 0
      ? "draft-editing"
      : buildRevisionTopologyStatus({
          revisionStatus: revision.status,
          fragments: remainingFragments,
          takeoverConfirmedAt: hasTakeover ? revision.takeoverConfirmedAt : null,
        });

  await db
    .update(regionBoundaryRevision)
    .set({
      topologyStatus,
      topologySummary: summarizeTopologyFragments(remainingFragments),
      takeoverConfirmedAt: hasTakeover ? revision.takeoverConfirmedAt : null,
      takeoverConfirmedBy: hasTakeover ? revision.takeoverConfirmedBy : null,
      updatedAt: new Date(),
    })
    .where(eq(regionBoundaryRevision.id, revision.id));

  await writeAuditEntry({
    entityType: "region_boundary_revision",
    entityId: String(revision.id),
    action: "draft_reset",
    actorName: input.actorName,
    metadata: {
      boundaryKey: input.boundaryKey,
      removedBoundaryKeys: boundaryKeysToDelete,
    },
  });

  return {
    success: true,
    boundaryKey: input.boundaryKey,
    revisionId: revision.id,
  };
}

export async function saveDraftBoundaryFeature(input: SaveDraftBoundaryFeatureInput) {
  const parsed = regionBoundaryDraftFeatureSchema.parse(input);
  const revision = await getOrCreateDesaDraftRevision(input.actorName);

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

  const topologyState = await analyzeDraftBoundaryTopology({
    ...parsed,
    actorName: input.actorName,
  });

  await writeAuditEntry({
    entityType: "region_boundary_revision",
    entityId: String(revision.id),
    action: "draft_save",
    actorName: input.actorName,
    beforeData,
    afterData: parsed,
    metadata: {
      boundaryKey: parsed.boundaryKey,
      topologyStatus: topologyState.analysis.topologyStatus,
    },
  });

  return {
    ...topologyState,
    feature: parsed,
  };
}

export async function analyzeDraftBoundaryTopology(input: AnalyzeDraftBoundaryTopologyInput) {
  const parsed = regionBoundaryDraftFeatureSchema.parse(input);
  const revision = await getOrCreateDesaDraftRevision(input.actorName);
  const now = new Date();
  invalidateActiveRegionBoundaryCache();
  const baseFeatures = await getMergedDraftBaseFeatures(revision.id);
  const previousFragments = (await getRevisionFragments(revision.id, parsed.boundaryKey)).map(mapTopologyFragmentRow);
  const topologyResult = await analyzeTopologyDraft({
    targetBoundaryKey: parsed.boundaryKey,
    targetGeometry: parsed.geometry,
    baseFeatures,
  });
  const publicFragments = topologyResult.fragments.map(toPublicTopologyFragment);
  const materializedPack = materializeAffectedGeometryPack({
    targetBoundaryKey: parsed.boundaryKey,
    targetGeometry: parsed.geometry,
    assignments: topologyResult.fragments,
    baseFeatures,
  });
  await persistRevisionFragments({
    revisionId: revision.id,
    sourceBoundaryKey: parsed.boundaryKey,
    fragments: publicFragments,
  });
  await replaceRevisionFeaturePack({
    revisionId: revision.id,
    sourceBoundaryKey: parsed.boundaryKey,
    features: materializedPack.features,
    previousFragments,
    nextFragments: publicFragments,
  });
  const persistedFragments = (await getRevisionFragments(revision.id)).map(mapTopologyFragmentRow);
  const topologySummary = summarizeTopologyFragments(persistedFragments);
  const topologyStatus = buildRevisionTopologyStatus({
    revisionStatus: revision.status,
    fragments: persistedFragments,
    takeoverConfirmedAt: null,
  });
  await db
    .update(regionBoundaryRevision)
    .set({
      topologyStatus,
      topologySummary,
      takeoverConfirmedAt: null,
      takeoverConfirmedBy: null,
      updatedAt: now,
    })
    .where(eq(regionBoundaryRevision.id, revision.id));

  await writeAuditEntry({
    entityType: "region_boundary_revision",
    entityId: String(revision.id),
    action: "draft_topology_analyze",
    actorName: input.actorName,
    afterData: parsed,
    metadata: {
      boundaryKey: parsed.boundaryKey,
      fragmentCount: publicFragments.length,
      topologyStatus,
    },
  });

  return getDraftTopologyStateBySourceBoundary(revision.id, parsed.boundaryKey);
}

export async function assignDraftTopologyFragment(input: AssignDraftTopologyFragmentInput) {
  const parsed = regionBoundaryFragmentAssignmentPayloadSchema.parse({
    revisionId: input.revisionId,
    fragmentId: input.fragmentId,
    assignedBoundaryKey: input.assignedBoundaryKey,
    assignmentMode: "manual",
  });
  const revision = await getDraftRevisionById(parsed.revisionId);
  if (!revision) {
    throw new Error("Revision draft topology tidak ditemukan");
  }
  if (revision.status !== "draft") {
    throw new Error("Hanya revision draft yang dapat diubah");
  }

  const [fragmentRow] = await db
    .select()
    .from(regionBoundaryRevisionFragment)
    .where(
      and(
        eq(regionBoundaryRevisionFragment.revisionId, parsed.revisionId),
        eq(regionBoundaryRevisionFragment.fragmentId, parsed.fragmentId),
      ),
    )
    .limit(1);
  if (!fragmentRow) {
    throw new Error("Fragment topology draft tidak ditemukan");
  }

  const candidateBoundaryKeys = Array.isArray(fragmentRow.candidateBoundaryKeys)
    ? fragmentRow.candidateBoundaryKeys.map((value) => String(value))
    : [];
  if (!candidateBoundaryKeys.includes(parsed.assignedBoundaryKey)) {
    throw new Error("Boundary tujuan assignment tidak termasuk kandidat fragment");
  }

  const [targetFeatureRow] = await db
    .select()
    .from(regionBoundaryRevisionFeature)
    .where(
      and(
        eq(regionBoundaryRevisionFeature.revisionId, parsed.revisionId),
        eq(regionBoundaryRevisionFeature.boundaryKey, fragmentRow.sourceBoundaryKey),
      ),
    )
    .limit(1);
  if (!targetFeatureRow) {
    throw new Error("Feature target draft topology tidak ditemukan");
  }

  const previousFragments = (await getRevisionFragments(parsed.revisionId, fragmentRow.sourceBoundaryKey)).map(
    mapTopologyFragmentRow,
  );

  await db
    .update(regionBoundaryRevisionFragment)
    .set({
      assignedBoundaryKey: parsed.assignedBoundaryKey,
      assignmentMode: "manual",
      status: "resolved",
    })
    .where(
      and(
        eq(regionBoundaryRevisionFragment.revisionId, parsed.revisionId),
        eq(regionBoundaryRevisionFragment.fragmentId, parsed.fragmentId),
      ),
    );

  const nextFragments = (await getRevisionFragments(parsed.revisionId, fragmentRow.sourceBoundaryKey)).map(
    mapTopologyFragmentRow,
  );
  const baseFeatures = await getMergedDraftBaseFeatures(parsed.revisionId);
  const materializedPack = materializeAffectedGeometryPack({
    targetBoundaryKey: fragmentRow.sourceBoundaryKey,
    targetGeometry: targetFeatureRow.geometry as RegionBoundaryGeometry,
    assignments: nextFragments as unknown as TopologyFragment[],
    baseFeatures,
  });
  const persistedFragments = (await getRevisionFragments(parsed.revisionId)).map(mapTopologyFragmentRow);
  const topologySummary = summarizeTopologyFragments(persistedFragments);
  const topologyStatus = buildRevisionTopologyStatus({
    revisionStatus: revision.status,
    fragments: persistedFragments,
    takeoverConfirmedAt: revision.takeoverConfirmedAt,
  });

  await replaceRevisionFeaturePack({
    revisionId: parsed.revisionId,
    sourceBoundaryKey: fragmentRow.sourceBoundaryKey,
    features: materializedPack.features,
    previousFragments,
    nextFragments,
  });
  await db
    .update(regionBoundaryRevision)
    .set({
      topologyStatus,
      topologySummary,
      updatedAt: new Date(),
    })
    .where(eq(regionBoundaryRevision.id, parsed.revisionId));

  await writeAuditEntry({
    entityType: "region_boundary_revision",
    entityId: String(parsed.revisionId),
    action: "draft_topology_assign",
    actorName: input.actorName,
    afterData: parsed,
    metadata: {
      sourceBoundaryKey: fragmentRow.sourceBoundaryKey,
    },
  });

  return getDraftTopologyStateBySourceBoundary(parsed.revisionId, fragmentRow.sourceBoundaryKey);
}

export async function confirmDraftTakeover(input: ConfirmDraftTakeoverInput) {
  const parsed = regionBoundaryTakeoverConfirmationPayloadSchema.parse({
    revisionId: input.revisionId,
    takeoverConfirmedBy: input.takeoverConfirmedBy,
  });
  const revision = await getDraftRevisionById(parsed.revisionId);
  if (!revision) {
    throw new Error("Revision draft topology tidak ditemukan");
  }
  if (revision.status !== "draft") {
    throw new Error("Hanya revision draft yang dapat dikonfirmasi");
  }

  const fragments = (await getRevisionFragments(parsed.revisionId)).map(mapTopologyFragmentRow);
  const takeoverFragment = fragments.find((fragment) => fragment.type === "takeover-area");
  if (!takeoverFragment) {
    throw new Error("Revision draft tidak memiliki takeover yang perlu dikonfirmasi");
  }

  const now = new Date();
  const topologyStatus = buildRevisionTopologyStatus({
    revisionStatus: revision.status,
    fragments,
    takeoverConfirmedAt: now,
  });
  const topologySummary = summarizeTopologyFragments(fragments);

  await db
    .update(regionBoundaryRevision)
    .set({
      topologyStatus,
      topologySummary,
      takeoverConfirmedAt: now,
      takeoverConfirmedBy: input.actorName,
      updatedAt: now,
    })
    .where(eq(regionBoundaryRevision.id, parsed.revisionId));

  await writeAuditEntry({
    entityType: "region_boundary_revision",
    entityId: String(parsed.revisionId),
    action: "draft_topology_takeover_confirm",
    actorName: input.actorName,
    afterData: {
      takeoverConfirmedBy: input.actorName,
    },
    metadata: {
      sourceBoundaryKey: takeoverFragment.sourceBoundaryKey,
    },
  });

  return getDraftTopologyStateBySourceBoundary(parsed.revisionId, takeoverFragment.sourceBoundaryKey);
}

export async function getDraftTopologyByKecamatan(kecamatanId: string) {
  const revision = await getOrCreateDesaDraftRevision("system-topology");
  const featureRows = await db
    .select()
    .from(regionBoundaryRevisionFeature)
    .where(
      and(
        eq(regionBoundaryRevisionFeature.revisionId, revision.id),
        eq(regionBoundaryRevisionFeature.kecamatanId, kecamatanId),
      ),
    )
    .orderBy(asc(regionBoundaryRevisionFeature.namaDesa), asc(regionBoundaryRevisionFeature.id));
  const sourceBoundaryKeys = featureRows.map((row) => row.boundaryKey);
  const fragments = sourceBoundaryKeys.length === 0
    ? []
    : (await getRevisionFragments(revision.id)).filter((fragment) => sourceBoundaryKeys.includes(fragment.sourceBoundaryKey));

  return {
    revision: mapRevisionRow(revision),
    analysis: buildTopologyAnalysis({
      revision,
      fragments: fragments.map(mapTopologyFragmentRow),
    }),
    features: featureRows.map(mapDraftFeatureRow),
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

  const impact = await computeImpactForRevisionFeatures(Array.from(draftFeaturesByBoundaryKey.values()));

  return toPublicImpactSummary(impact);
}

export async function publishDraftRevision(input: PublishDraftRevisionInput) {
  const parsed = regionBoundaryPublishPayloadSchema.parse({
    revisionId: input.revisionId,
    mode: input.mode,
    topologyStatus: input.topologyStatus,
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

  const revisionFragments = (await getRevisionFragments(revision.id)).map(mapTopologyFragmentRow);
  assertDraftRevisionPublishable({
    revision,
    fragments: revisionFragments,
  });

  const impact = await computeImpactForRevisionFeatures(revisionFeatures.map(toPublishedBoundaryFeature));
  const impactSummary = toPublicImpactSummary(impact);
  const impactedBoundaryKeys = Array.from(new Set(revisionFeatures.map((feature) => feature.boundaryKey)));
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
          topologyStatus: "superseded",
          updatedAt: now,
        })
        .where(inArray(regionBoundaryRevision.id, publishedBefore.map((item) => item.id)));
    }

    await tx
      .update(regionBoundaryRevision)
      .set({
        status: "published",
        topologyStatus: "published",
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
    impactedBoundaryKeys,
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
          topologyStatus: "superseded",
          updatedAt: now,
        })
        .where(eq(regionBoundaryRevision.id, currentPublished.id));
    }

    await tx
      .update(regionBoundaryRevision)
      .set({
        status: "published",
        topologyStatus: "published",
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
