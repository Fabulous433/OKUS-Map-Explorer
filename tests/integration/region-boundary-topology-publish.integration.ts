import assert from "node:assert/strict";

import bbox from "@turf/bbox";
import { booleanPointInPolygon } from "@turf/boolean-point-in-polygon";
import { and, eq, inArray } from "drizzle-orm";
import {
  regionBoundaryRevisionSchema,
  regionBoundaryTopologyAnalysisSchema,
} from "@shared/region-boundary-admin";
import {
  masterKecamatan,
  masterKelurahan,
  regionBoundaryRevision,
  regionBoundaryRevisionFeature,
} from "@shared/schema";
import {
  analyzeDraftBoundaryTopology,
  confirmDraftTakeover,
  publishDraftRevision,
  rollbackPublishedRevision,
} from "../../server/boundary-editor-storage";
import { buildDesaBoundaryKey, type PublishedBoundaryFeature } from "../../server/region-boundary-overrides";
import { findContainingDesa, getActiveRegionBoundary, invalidateActiveRegionBoundaryCache } from "../../server/region-boundaries";
import { db } from "../../server/storage";
import { createIntegrationServer } from "./_helpers";

const TARGET_BOUNDARY_NAME = "Batu Belang Jaya";
// Keep the synthetic published baseline newer than any test-created revision.
const SYNTHETIC_PUBLISHED_AT = new Date("2099-03-20T04:00:00.000Z");

type GeometryPoint = readonly [number, number];
type BoundaryFeature = {
  geometry: {
    type: "Polygon" | "MultiPolygon";
    coordinates: unknown;
  };
  properties?: Record<string, unknown>;
};

function featureName(feature: BoundaryFeature) {
  return String(feature.properties?.WADMKD ?? feature.properties?.NAMOBJ ?? "").trim();
}

function normalizeRegionName(value: string) {
  return value.trim().toLocaleLowerCase("id").replace(/\s+/g, "");
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

    if (value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number") {
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

  return { minLng, minLat, maxLng, maxLat };
}

function findInteriorPointForFeature(feature: BoundaryFeature): GeometryPoint {
  const [minLng, minLat, maxLng, maxLat] = bbox(feature as never);
  const steps = 12;

  for (let lngStep = 0; lngStep < steps; lngStep++) {
    for (let latStep = 0; latStep < steps; latStep++) {
      const lng = minLng + ((lngStep + 0.5) / steps) * (maxLng - minLng);
      const lat = minLat + ((latStep + 0.5) / steps) * (maxLat - minLat);
      if (booleanPointInPolygon([lng, lat], feature as never)) {
        return [lng, lat];
      }
    }
  }

  throw new Error(`Tidak menemukan titik interior untuk feature ${featureName(feature) || "<unknown>"}`);
}

function createSquarePolygonAroundPoint(point: GeometryPoint, delta: number) {
  const [lng, lat] = point;
  return [
    [lng - delta, lat - delta],
    [lng + delta, lat - delta],
    [lng + delta, lat + delta],
    [lng - delta, lat + delta],
    [lng - delta, lat - delta],
  ];
}

function buildExpandedTargetGeometry(
  targetGeometry: BoundaryFeature["geometry"],
  donorPoint: GeometryPoint,
) {
  const donorSquare = createSquarePolygonAroundPoint(donorPoint, 0.00002);

  if (targetGeometry.type === "Polygon") {
    return {
      type: "MultiPolygon" as const,
      coordinates: [targetGeometry.coordinates, [donorSquare]],
    };
  }

  if (targetGeometry.type === "MultiPolygon") {
    return {
      type: "MultiPolygon" as const,
      coordinates: [...targetGeometry.coordinates, [donorSquare]],
    };
  }

  throw new Error(`Geometry target tidak didukung: ${targetGeometry.type}`);
}

function resolveContainingFeatureName(features: BoundaryFeature[], point: GeometryPoint) {
  const containing = features.find((feature) => booleanPointInPolygon(point, feature as never)) as
    | BoundaryFeature
    | undefined;
  return containing ? featureName(containing) : null;
}

function pickDonorFeatureAndPoint(features: BoundaryFeature[], targetFeature: BoundaryFeature, targetIndex: number) {
  for (const feature of features.slice(targetIndex + 1)) {
    if (featureName(feature) === TARGET_BOUNDARY_NAME) continue;

    const point = findInteriorPointForFeature(feature);
    const currentName = resolveContainingFeatureName(features, point);
    if (!currentName || currentName === TARGET_BOUNDARY_NAME) {
      continue;
    }

    const nextFeatures = features.map((item) =>
      featureName(item) === TARGET_BOUNDARY_NAME
        ? { ...item, geometry: buildExpandedTargetGeometry(targetFeature.geometry, point) }
        : item,
    );
    const nextName = resolveContainingFeatureName(nextFeatures, point);
    if (nextName === TARGET_BOUNDARY_NAME) {
      return { point, containingName: currentName };
    }
  }

  throw new Error("Tidak menemukan donor point non-target untuk publish test");
}

async function buildPublishedBoundaryFeatures(kecamatan: typeof masterKecamatan.$inferSelect, boundaryFeatures: BoundaryFeature[]) {
  const kelurahanRows = await db
    .select()
    .from(masterKelurahan)
    .where(eq(masterKelurahan.cpmKodeKec, kecamatan.cpmKodeKec));
  const kelurahanByName = new Map(
    kelurahanRows.map((row) => [normalizeRegionName(row.cpmKelurahan), row]),
  );

  return boundaryFeatures.map((feature) => {
    const namaDesa = featureName(feature);
    const kelurahan = kelurahanByName.get(normalizeRegionName(namaDesa));
    if (!kelurahan) {
      throw new Error(`Master kelurahan tidak ditemukan untuk ${namaDesa}`);
    }

    return {
      boundaryKey: String(
        feature.properties?.__boundaryKey ??
          buildDesaBoundaryKey({
            kecamatanName: String(feature.properties?.WADMKC ?? kecamatan.cpmKecamatan),
            desaName: namaDesa,
          }),
      ),
      kecamatanId: kecamatan.cpmKecId,
      kelurahanId: kelurahan.cpmKelId,
      namaDesa,
      geometry: feature.geometry as PublishedBoundaryFeature["geometry"],
    } satisfies PublishedBoundaryFeature;
  });
}

function appendHoleToPolygon(
  polygonCoordinates: number[][][],
  holeRing: number[][],
  point: GeometryPoint,
) {
  const targetFeature = {
    type: "Feature" as const,
    geometry: {
      type: "Polygon" as const,
      coordinates: polygonCoordinates,
    },
    properties: {},
  };
  return booleanPointInPolygon(point, targetFeature as never);
}

function geometryWithHole(
  geometry: BoundaryFeature["geometry"],
  point: GeometryPoint,
  delta: number,
): BoundaryFeature["geometry"] {
  const holeRing = createSquarePolygonAroundPoint(point, delta);

  if (geometry.type === "Polygon") {
    return {
      type: "Polygon",
      coordinates: [...geometry.coordinates, holeRing],
    };
  }

  const polygonIndex = geometry.coordinates.findIndex((polygonCoordinates) =>
    appendHoleToPolygon(polygonCoordinates as number[][][], holeRing, point),
  );
  if (polygonIndex < 0) {
    throw new Error("Tidak menemukan polygon target untuk menambahkan hole");
  }

  return {
    type: "MultiPolygon",
    coordinates: geometry.coordinates.map((polygonCoordinates, index) =>
      index === polygonIndex ? [...polygonCoordinates, holeRing] : polygonCoordinates,
    ),
  };
}

async function findUnresolvedDraftGeometry(params: {
  targetBoundaryKey: string;
  targetFeature: BoundaryFeature;
  baseFeatures: PublishedBoundaryFeature[];
}) {
  const [minLng, minLat, maxLng, maxLat] = bbox(params.targetFeature as never);
  const spanLng = Math.max(maxLng - minLng, 0.0001);
  const spanLat = Math.max(maxLat - minLat, 0.0001);
  const delta = Math.min(spanLng, spanLat) / 120;

  for (let lngStep = 1; lngStep <= 8; lngStep++) {
    for (let latStep = 1; latStep <= 8; latStep++) {
      const point: GeometryPoint = [
        minLng + (spanLng * lngStep) / 9,
        minLat + (spanLat * latStep) / 9,
      ];
      if (!booleanPointInPolygon(point, params.targetFeature as never)) {
        continue;
      }

      const holeRing = createSquarePolygonAroundPoint(point, delta);
      if (!holeRing.every((holePoint) => booleanPointInPolygon(holePoint as GeometryPoint, params.targetFeature as never))) {
        continue;
      }

      const candidateGeometry = geometryWithHole(params.targetFeature.geometry, point, delta);
      const analysis = await analyzeDraftBoundaryTopology({
        boundaryKey: params.targetBoundaryKey,
        level: "desa",
        kecamatanId: params.baseFeatures[0]?.kecamatanId ?? "",
        kelurahanId: params.baseFeatures.find((feature) => feature.boundaryKey === params.targetBoundaryKey)
          ?.kelurahanId ?? "",
        namaDesa: TARGET_BOUNDARY_NAME,
        geometry: candidateGeometry as never,
        actorName: "admin",
      });

      if (analysis.analysis.topologyStatus === "draft-needs-resolution" && analysis.analysis.summary.unresolvedFragmentCount > 0) {
        return {
          geometry: candidateGeometry,
          analysis: analysis.analysis,
          revision: analysis.revision,
        };
      }
    }
  }

  throw new Error("Tidak menemukan geometry unresolved untuk publish test");
}

async function run() {
  const server = await createIntegrationServer();
  const revisionIds = new Set<number>();

  try {
    const [kecamatan] = await db
      .select()
      .from(masterKecamatan)
      .where(eq(masterKecamatan.cpmKecamatan, "Muaradua"))
      .limit(1);
    assert.ok(kecamatan, "master kecamatan Muaradua wajib tersedia");

    const [targetKelurahan] = await db
      .select()
      .from(masterKelurahan)
      .where(
        and(
          eq(masterKelurahan.cpmKelurahan, TARGET_BOUNDARY_NAME),
          eq(masterKelurahan.cpmKodeKec, kecamatan.cpmKodeKec),
        ),
      )
      .limit(1);
    assert.ok(targetKelurahan, "master kelurahan target wajib tersedia");

    const boundaryKey = buildDesaBoundaryKey({
      kecamatanName: kecamatan.cpmKecamatan,
      desaName: TARGET_BOUNDARY_NAME,
    });
    assert.equal(boundaryKey, "muaradua:batu-belang-jaya");

    const baseBoundary = await getActiveRegionBoundary("desa", "precise", {
      kecamatanId: kecamatan.cpmKecId,
      kecamatanName: kecamatan.cpmKecamatan,
    });
    const baseTargetFeature = baseBoundary.boundary.features.find((feature) => {
      return featureName(feature as BoundaryFeature) === TARGET_BOUNDARY_NAME;
    }) as BoundaryFeature | undefined;
    assert.ok(baseTargetFeature, "base target feature wajib tersedia");

    const basePublishedFeatures = await buildPublishedBoundaryFeatures(kecamatan, baseBoundary.boundary.features as BoundaryFeature[]);

    const [previousPublished] = await db
      .insert(regionBoundaryRevision)
      .values({
        regionKey: "okus",
        level: "desa",
        status: "published",
        notes: "previous published revision",
        createdBy: "integration-test",
        publishedBy: "integration-test",
        publishedAt: SYNTHETIC_PUBLISHED_AT,
        impactSummary: null,
        createdAt: SYNTHETIC_PUBLISHED_AT,
        updatedAt: SYNTHETIC_PUBLISHED_AT,
      })
      .returning({ id: regionBoundaryRevision.id });
    revisionIds.add(previousPublished.id);

    await db.insert(regionBoundaryRevisionFeature).values({
      revisionId: previousPublished.id,
      boundaryKey,
      kecamatanId: kecamatan.cpmKecId,
      kelurahanId: targetKelurahan.cpmKelId,
      namaDesa: TARGET_BOUNDARY_NAME,
      geometry: baseTargetFeature.geometry,
      bounds: computeBoundsFromCoordinates(baseTargetFeature.geometry.coordinates),
      createdAt: SYNTHETIC_PUBLISHED_AT,
      updatedAt: SYNTHETIC_PUBLISHED_AT,
    });

    invalidateActiveRegionBoundaryCache();

    const activeBoundary = await getActiveRegionBoundary("desa", "precise", {
      kecamatanId: kecamatan.cpmKecId,
      kecamatanName: kecamatan.cpmKecamatan,
    });
    const activeTargetFeature = activeBoundary.boundary.features.find((feature) => {
      return featureName(feature as BoundaryFeature) === TARGET_BOUNDARY_NAME;
    }) as BoundaryFeature | undefined;
    assert.ok(activeTargetFeature, "feature Batu Belang Jaya aktif wajib tersedia");

    const targetIndex = activeBoundary.boundary.features.findIndex(
      (feature) => featureName(feature as BoundaryFeature) === TARGET_BOUNDARY_NAME,
    );
    assert.ok(targetIndex >= 0, "index feature Batu Belang Jaya aktif wajib tersedia");

    const donorSelection = pickDonorFeatureAndPoint(
      activeBoundary.boundary.features as BoundaryFeature[],
      activeTargetFeature,
      targetIndex,
    );
    const donorBoundaryKey = buildDesaBoundaryKey({
      kecamatanName: kecamatan.cpmKecamatan,
      desaName: donorSelection.containingName,
    });

    const beforePublish = await findContainingDesa(donorSelection.point[0], donorSelection.point[1]);
    assert.equal(beforePublish?.name, donorSelection.containingName, "titik donor harus tetap berada di desa asal sebelum publish");

    const noOpDraft = await analyzeDraftBoundaryTopology({
      boundaryKey,
      level: "desa",
      kecamatanId: kecamatan.cpmKecId,
      kelurahanId: targetKelurahan.cpmKelId,
      namaDesa: TARGET_BOUNDARY_NAME,
      geometry: activeTargetFeature.geometry as never,
      actorName: "admin",
    });
    const noOpRevision = regionBoundaryRevisionSchema.parse(noOpDraft.revision);
    const noOpAnalysis = regionBoundaryTopologyAnalysisSchema.parse(noOpDraft.analysis);
    revisionIds.add(noOpRevision.id);
    assert.equal(noOpAnalysis.summary.fragmentCount, 0);
    assert.equal(noOpAnalysis.topologyStatus, "draft-ready");
    assert.equal(noOpRevision.topologyStatus, "draft-ready");

    const noOpPublish = await publishDraftRevision({
      revisionId: noOpRevision.id,
      mode: "publish-only",
      topologyStatus: "draft-ready",
      actorName: "admin",
    });
    assert.equal(noOpPublish.revision.status, "published");
    assert.equal(noOpPublish.revision.topologyStatus, "published");

    await rollbackPublishedRevision({
      revisionId: previousPublished.id,
      actorName: "admin",
    });
    await db
      .update(regionBoundaryRevision)
      .set({
        status: "superseded",
        topologyStatus: "superseded",
      })
      .where(eq(regionBoundaryRevision.id, noOpRevision.id));
    revisionIds.delete(noOpRevision.id);
    invalidateActiveRegionBoundaryCache();

    const unresolvedDraft = await findUnresolvedDraftGeometry({
      targetBoundaryKey: boundaryKey,
      targetFeature: activeTargetFeature,
      baseFeatures: basePublishedFeatures,
    });
    const unresolvedRevision = regionBoundaryRevisionSchema.parse(unresolvedDraft.revision);
    const unresolvedAnalysis = regionBoundaryTopologyAnalysisSchema.parse(unresolvedDraft.analysis);
    revisionIds.add(unresolvedRevision.id);
    assert.equal(unresolvedAnalysis.topologyStatus, "draft-needs-resolution");
    assert.equal(unresolvedAnalysis.summary.unresolvedFragmentCount > 0, true);

    await assert.rejects(
      () =>
        publishDraftRevision({
          revisionId: unresolvedRevision.id,
          mode: "publish-and-reconcile",
          topologyStatus: "draft-ready",
          actorName: "admin",
        }),
      /fragment|topology/i,
      "publish harus ditolak saat masih ada fragment unresolved",
    );

    await db.delete(regionBoundaryRevision).where(eq(regionBoundaryRevision.id, unresolvedRevision.id));
    revisionIds.delete(unresolvedRevision.id);
    invalidateActiveRegionBoundaryCache();

    const takeoverGeometry = buildExpandedTargetGeometry(activeTargetFeature.geometry, donorSelection.point);
    const takeoverDraft = await analyzeDraftBoundaryTopology({
      boundaryKey,
      level: "desa",
      kecamatanId: kecamatan.cpmKecId,
      kelurahanId: targetKelurahan.cpmKelId,
      namaDesa: TARGET_BOUNDARY_NAME,
      geometry: takeoverGeometry as never,
      actorName: "admin",
    });
    const takeoverRevision = regionBoundaryRevisionSchema.parse(takeoverDraft.revision);
    const takeoverAnalysis = regionBoundaryTopologyAnalysisSchema.parse(takeoverDraft.analysis);
    revisionIds.add(takeoverRevision.id);
    assert.equal(takeoverDraft.analysis.requiresTakeoverConfirmation, true);
    assert.equal(takeoverAnalysis.topologyStatus, "draft-needs-resolution");
    assert.equal(takeoverAnalysis.fragments[0]?.type, "takeover-area");
    assert.equal(takeoverRevision.takeoverConfirmedAt, null);

    await assert.rejects(
      () =>
        publishDraftRevision({
          revisionId: takeoverRevision.id,
          mode: "publish-and-reconcile",
          topologyStatus: "draft-ready",
          actorName: "admin",
        }),
      /takeover/i,
      "publish harus ditolak sebelum takeover dikonfirmasi",
    );

    const confirmedTakeover = await confirmDraftTakeover({
      revisionId: takeoverRevision.id,
      takeoverConfirmedBy: "admin",
      actorName: "admin",
    });
    const confirmedRevision = regionBoundaryRevisionSchema.parse(confirmedTakeover.revision);
    const confirmedAnalysis = regionBoundaryTopologyAnalysisSchema.parse(confirmedTakeover.analysis);
    assert.notEqual(confirmedRevision.takeoverConfirmedAt, null);
    assert.equal(confirmedRevision.takeoverConfirmedBy, "admin");
    assert.equal(confirmedAnalysis.topologyStatus, "draft-ready");

    const publishResult = await publishDraftRevision({
      revisionId: takeoverRevision.id,
      mode: "publish-and-reconcile",
      topologyStatus: "draft-ready",
      actorName: "admin",
    });
    assert.equal(publishResult.revision.topologyStatus, "published");
    assert.equal(
      publishResult.impactedBoundaryKeys.includes(boundaryKey),
      true,
      "published geometry pack harus mencakup boundary target",
    );
    assert.equal(
      publishResult.impactedBoundaryKeys.includes(donorBoundaryKey),
      true,
      "published geometry pack harus mencakup boundary tetangga yang terdampak",
    );

    const publishedFeatureRows = await db
      .select({
        boundaryKey: regionBoundaryRevisionFeature.boundaryKey,
      })
      .from(regionBoundaryRevisionFeature)
      .where(eq(regionBoundaryRevisionFeature.revisionId, takeoverRevision.id));
    const publishedBoundaryKeys = publishedFeatureRows.map((row) => row.boundaryKey).sort();
    assert.equal(publishedBoundaryKeys.includes(boundaryKey), true);
    assert.equal(publishedBoundaryKeys.includes(donorBoundaryKey), true);

    const afterPublish = await findContainingDesa(donorSelection.point[0], donorSelection.point[1]);
    assert.equal(afterPublish?.name, TARGET_BOUNDARY_NAME, "runtime merge harus menampilkan hasil topology final");

    const rollbackResult = await rollbackPublishedRevision({
      revisionId: previousPublished.id,
      actorName: "admin",
    });
    assert.equal(rollbackResult.revision.status, "published");

    const [rolledBackPrevious] = await db
      .select()
      .from(regionBoundaryRevision)
      .where(eq(regionBoundaryRevision.id, previousPublished.id))
      .limit(1);
    const [supersededTakeover] = await db
      .select()
      .from(regionBoundaryRevision)
      .where(eq(regionBoundaryRevision.id, takeoverRevision.id))
      .limit(1);
    assert.equal(rolledBackPrevious?.status, "published");
    assert.equal(supersededTakeover?.status, "superseded");

    const afterRollback = await findContainingDesa(donorSelection.point[0], donorSelection.point[1]);
    assert.equal(afterRollback?.name, donorSelection.containingName, "rollback harus memulihkan geometry pack published sebelumnya");
  } finally {
    if (revisionIds.size > 0) {
      await db.delete(regionBoundaryRevision).where(inArray(regionBoundaryRevision.id, Array.from(revisionIds)));
    }
    invalidateActiveRegionBoundaryCache();
    await server.close();
  }
}

run()
  .then(() => {
    console.log("[integration] region-boundary-topology-publish: PASS");
  })
  .catch((error) => {
    console.error("[integration] region-boundary-topology-publish: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
