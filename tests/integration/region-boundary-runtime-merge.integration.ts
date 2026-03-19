import assert from "node:assert/strict";

import { and, eq } from "drizzle-orm";
import { regionBoundaryResponseSchema } from "@shared/region-boundary";
import {
  masterKecamatan,
  masterKelurahan,
  regionBoundaryRevision,
  regionBoundaryRevisionFeature,
} from "@shared/schema";
import { buildDesaBoundaryKey } from "../../server/region-boundary-overrides";
import {
  findContainingDesa,
  getActiveRegionBoundary,
  invalidateActiveRegionBoundaryCache,
} from "../../server/region-boundaries";
import { db } from "../../server/storage";
import { createIntegrationServer } from "./_helpers";

const CEMARA_HOMESTAY_POINT = [104.0736256, -4.5455788];

function buildBoundsFromPolygon(coordinates: number[][]) {
  const lngs = coordinates.map((point) => point[0]);
  const lats = coordinates.map((point) => point[1]);
  return {
    minLng: Math.min(...lngs),
    minLat: Math.min(...lats),
    maxLng: Math.max(...lngs),
    maxLat: Math.max(...lats),
  };
}

async function run() {
  const server = await createIntegrationServer();
  let revisionId: number | null = null;

  try {
    const [muaradua] = await db
      .select()
      .from(masterKecamatan)
      .where(eq(masterKecamatan.cpmKecamatan, "Muaradua"))
      .limit(1);
    assert.ok(muaradua, "master kecamatan Muaradua wajib tersedia");

    const [batuBelangJaya] = await db
      .select()
      .from(masterKelurahan)
      .where(
        and(
          eq(masterKelurahan.cpmKelurahan, "Batu Belang Jaya"),
          eq(masterKelurahan.cpmKodeKec, muaradua.cpmKodeKec),
        ),
      )
      .limit(1);
    assert.ok(batuBelangJaya, "master kelurahan Batu Belang Jaya di Muaradua wajib tersedia");

    const boundaryKey = buildDesaBoundaryKey({
      kecamatanName: "Muara Dua",
      desaName: "Batu Belang Jaya",
    });
    assert.equal(boundaryKey, "muaradua:batu-belang-jaya");

    const before = await findContainingDesa(CEMARA_HOMESTAY_POINT[0], CEMARA_HOMESTAY_POINT[1]);
    assert.equal(before?.name, "Bumi Agung", "fixture titik referensi awal harus jatuh ke Bumi Agung");

    const baseBoundary = await getActiveRegionBoundary("desa", "precise", {
      kecamatanId: muaradua.cpmKecId,
      kecamatanName: muaradua.cpmKecamatan,
    });
    const baseBatuBelang = baseBoundary.boundary.features.find((feature) => {
      return String(feature.properties.WADMKD ?? "").trim() === "Batu Belang Jaya";
    });
    const baseBumiAgung = baseBoundary.boundary.features.find((feature) => {
      return String(feature.properties.WADMKD ?? "").trim() === "Bumi Agung";
    });
    assert.ok(baseBatuBelang, "base boundary Batu Belang Jaya wajib tersedia");
    assert.ok(baseBumiAgung, "base boundary Bumi Agung wajib tersedia");

    const overridePolygon = [
      [104.0729, -4.5464],
      [104.0745, -4.5464],
      [104.0745, -4.5446],
      [104.0729, -4.5446],
      [104.0729, -4.5464],
    ];

    const [createdRevision] = await db
      .insert(regionBoundaryRevision)
      .values({
        regionKey: "okus",
        level: "desa",
        status: "published",
        notes: "integration override runtime merge",
        createdBy: "integration-test",
        publishedBy: "integration-test",
        publishedAt: new Date(),
        impactSummary: null,
        updatedAt: new Date(),
      })
      .returning({ id: regionBoundaryRevision.id });
    revisionId = createdRevision.id;

    await db.insert(regionBoundaryRevisionFeature).values({
      revisionId,
      boundaryKey,
      kecamatanId: muaradua.cpmKecId,
      kelurahanId: batuBelangJaya.cpmKelId,
      namaDesa: "Batu Belang Jaya",
      geometry: {
        type: "Polygon",
        coordinates: [overridePolygon],
      },
      bounds: buildBoundsFromPolygon(overridePolygon),
      updatedAt: new Date(),
    });

    invalidateActiveRegionBoundaryCache();

    const after = await findContainingDesa(CEMARA_HOMESTAY_POINT[0], CEMARA_HOMESTAY_POINT[1]);
    assert.equal(after?.name, "Batu Belang Jaya", "containing desa harus mengikuti override published");

    const mergedBoundary = await getActiveRegionBoundary("desa", "precise", {
      kecamatanId: muaradua.cpmKecId,
      kecamatanName: muaradua.cpmKecamatan,
    });
    const mergedBatuBelang = mergedBoundary.boundary.features.find((feature) => {
      return String(feature.properties.__boundaryKey ?? "") === boundaryKey;
    });
    const mergedBumiAgung = mergedBoundary.boundary.features.find((feature) => {
      return String(feature.properties.WADMKD ?? "").trim() === "Bumi Agung";
    });
    assert.ok(mergedBatuBelang, "merged boundary harus memuat feature override dengan boundary key stabil");
    assert.equal(mergedBatuBelang?.properties.__kelurahanId, batuBelangJaya.cpmKelId);
    assert.equal(mergedBatuBelang?.properties.__kecamatanId, muaradua.cpmKecId);
    assert.notDeepEqual(
      mergedBatuBelang?.geometry,
      baseBatuBelang.geometry,
      "geometry override harus menggantikan feature dasar Batu Belang Jaya",
    );
    assert.deepEqual(
      mergedBumiAgung?.geometry,
      baseBumiAgung.geometry,
      "desa non-override harus tetap memakai geometry dasar",
    );

    const scopedResponse = await server.requestJson(
      `/api/region-boundaries/active/desa?kecamatanId=${encodeURIComponent(muaradua.cpmKecId)}`,
    );
    assert.equal(scopedResponse.response.status, 200, "endpoint desa aktif harus tetap tersedia setelah merge");
    const parsedResponse = regionBoundaryResponseSchema.parse(scopedResponse.body);
    assert.equal(parsedResponse.boundary.type, "FeatureCollection");
    assert.ok(
      parsedResponse.boundary.features.some((feature) => feature.properties.__boundaryKey === boundaryKey),
      "response publik harus mengandung properti boundary key stabil pada feature override",
    );
  } finally {
    if (revisionId !== null) {
      await db.delete(regionBoundaryRevision).where(eq(regionBoundaryRevision.id, revisionId));
      invalidateActiveRegionBoundaryCache();
    }
    await server.close();
  }
}

run()
  .then(() => {
    console.log("[integration] region-boundary-runtime-merge: PASS");
  })
  .catch((error) => {
    console.error("[integration] region-boundary-runtime-merge: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
