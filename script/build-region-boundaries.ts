import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import simplify from "@turf/simplify";
import shapefile from "shapefile";

type GeoJsonGeometry = {
  type: string;
  coordinates: unknown;
};

type GeoJsonFeature = {
  type: "Feature";
  properties: Record<string, unknown>;
  geometry: GeoJsonGeometry;
};

type GeoJsonFeatureCollection = {
  type: "FeatureCollection";
  features: GeoJsonFeature[];
};

type RegionBoundaryBundle = {
  regionKey: string;
  assets: {
    kabupaten: {
      precise: GeoJsonFeatureCollection;
      light: GeoJsonFeatureCollection;
    };
    kecamatan: {
      precise: GeoJsonFeatureCollection;
      light: GeoJsonFeatureCollection;
    };
    desa: {
      precise: GeoJsonFeatureCollection;
      light: GeoJsonFeatureCollection;
    };
  };
};

type BuildRegionBoundaryBundleInput = {
  regionKey: string;
  docsRoot?: string;
  outputRoot?: string;
  writeFiles?: boolean;
};

type LayerKey = "kabupaten" | "kecamatan" | "desa";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const defaultDocsCandidates = [
  path.join(repoRoot, "docs"),
  path.resolve(repoRoot, "..", "..", "docs"),
];
const defaultOutputRoot = path.join(repoRoot, "server", "data", "regions");
const targetKabupatenName = "Ogan Komering Ulu Selatan";
const supportedRegionKey = "okus";

const layerConfigs: Record<
  LayerKey,
  {
    sourceDir: string;
    baseName: string;
    propertyKeys: string[];
    sortKeys: string[];
  }
> = {
  kabupaten: {
    sourceDir: "batas kabupaten dan propinsi indonesia",
    baseName: "Batas Kabupaten",
    propertyKeys: ["WADMKK"],
    sortKeys: ["WADMKK"],
  },
  kecamatan: {
    sourceDir: "batas-kecamatan-indonesia",
    baseName: "Batas Kecamatan",
    propertyKeys: ["WADMKC", "WADMKK", "WADMPR"],
    sortKeys: ["WADMKC"],
  },
  desa: {
    sourceDir: "batas-desa-indonesia",
    baseName: "Batas_Wilayah_KelurahanDesa_10K_AR",
    propertyKeys: ["NAMOBJ", "KDCPUM", "KDEPUM", "TIPADM", "WADMKD", "WADMKC", "WADMKK", "WADMPR"],
    sortKeys: ["WADMKC", "WADMKD", "NAMOBJ"],
  },
};

const lightSimplificationTolerances: Record<LayerKey, number[]> = {
  kabupaten: [0.00005, 0.0001, 0.0002, 0.0005, 0.001],
  kecamatan: [0.00003, 0.00005, 0.0001, 0.0002, 0.0005],
  desa: [0.00001, 0.00002, 0.00003, 0.00005, 0.0001],
};

function parseCliArgs(argv: string[]) {
  const parsed: { regionKey?: string } = {};
  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];
    if (current === "--regionKey") {
      parsed.regionKey = argv[index + 1];
      index += 1;
    }
  }
  return parsed;
}

async function fileExists(filePath: string) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function resolveDocsRoot(explicitDocsRoot?: string) {
  const candidates = explicitDocsRoot ? [explicitDocsRoot] : defaultDocsCandidates;

  for (const candidate of candidates) {
    const kabupatenShapePath = buildShapePath(candidate, layerConfigs.kabupaten);
    const kabupatenDbfPath = buildDbfPath(candidate, layerConfigs.kabupaten);
    const kecamatanShapePath = buildShapePath(candidate, layerConfigs.kecamatan);
    const kecamatanDbfPath = buildDbfPath(candidate, layerConfigs.kecamatan);
    const desaShapePath = buildShapePath(candidate, layerConfigs.desa);
    const desaDbfPath = buildDbfPath(candidate, layerConfigs.desa);

    if (
      (await fileExists(kabupatenShapePath)) &&
      (await fileExists(kabupatenDbfPath)) &&
      (await fileExists(kecamatanShapePath)) &&
      (await fileExists(kecamatanDbfPath)) &&
      (await fileExists(desaShapePath)) &&
      (await fileExists(desaDbfPath))
    ) {
      return candidate;
    }
  }

  throw new Error(
    [
      "Shapefile sumber boundary tidak ditemukan.",
      "Pastikan sumber offline tersedia di salah satu path berikut:",
      ...candidates.map((candidate) => `- ${candidate}`),
    ].join("\n"),
  );
}

function buildShapePath(docsRoot: string, config: { sourceDir: string; baseName: string }) {
  return path.join(docsRoot, config.sourceDir, `${config.baseName}.shp`);
}

function buildDbfPath(docsRoot: string, config: { sourceDir: string; baseName: string }) {
  return path.join(docsRoot, config.sourceDir, `${config.baseName}.dbf`);
}

function pickProperties(properties: Record<string, unknown> | null | undefined, propertyKeys: string[]) {
  const picked: Record<string, unknown> = {};
  if (!properties) {
    return picked;
  }

  for (const propertyKey of propertyKeys) {
    const value = properties[propertyKey];
    if (value !== undefined && value !== null && value !== "") {
      picked[propertyKey] = value;
    }
  }

  return picked;
}

function sortFeatures(features: GeoJsonFeature[], sortKeys: string[]) {
  return [...features].sort((left, right) => {
    for (const sortKey of sortKeys) {
      const leftValue = String(left.properties[sortKey] ?? "");
      const rightValue = String(right.properties[sortKey] ?? "");
      const result = leftValue.localeCompare(rightValue, "id");
      if (result !== 0) {
        return result;
      }
    }

    return 0;
  });
}

async function readLayerCollection(layerKey: LayerKey, docsRoot: string) {
  const layerConfig = layerConfigs[layerKey];
  const source = await shapefile.open(buildShapePath(docsRoot, layerConfig), buildDbfPath(docsRoot, layerConfig), {
    encoding: "utf-8",
  });
  const features: GeoJsonFeature[] = [];

  while (true) {
    const result = await source.read();
    if (result.done) {
      break;
    }

    const feature = result.value as {
      properties?: Record<string, unknown> | null;
      geometry?: GeoJsonGeometry | null;
    };

    if (feature.properties?.WADMKK !== targetKabupatenName || !feature.geometry?.coordinates) {
      continue;
    }

    features.push({
      type: "Feature",
      properties: pickProperties(feature.properties, layerConfig.propertyKeys),
      geometry: {
        type: feature.geometry.type,
        coordinates: feature.geometry.coordinates,
      },
    });
  }

  return {
    type: "FeatureCollection",
    features: sortFeatures(features, layerConfig.sortKeys),
  } satisfies GeoJsonFeatureCollection;
}

function countCoordinatePairs(coordinates: unknown): number {
  if (!Array.isArray(coordinates)) {
    return 0;
  }

  if (
    coordinates.length >= 2 &&
    typeof coordinates[0] === "number" &&
    typeof coordinates[1] === "number"
  ) {
    return 1;
  }

  return coordinates.reduce((total, entry) => total + countCoordinatePairs(entry), 0);
}

function countCollectionCoordinates(collection: GeoJsonFeatureCollection) {
  return collection.features.reduce((total, feature) => {
    return total + countCoordinatePairs(feature.geometry.coordinates);
  }, 0);
}

function simplifyCollection(layerKey: LayerKey, collection: GeoJsonFeatureCollection): GeoJsonFeatureCollection {
  const originalCoordinateCount = countCollectionCoordinates(collection);
  const tolerances = lightSimplificationTolerances[layerKey];

  for (const tolerance of tolerances) {
    const simplifiedFeatures = collection.features.map((feature) => {
      const simplifiedFeature = simplify(feature as never, {
        tolerance,
        highQuality: true,
        mutate: false,
      }) as GeoJsonFeature;

      return {
        ...feature,
        geometry: {
          type: simplifiedFeature.geometry.type,
          coordinates: simplifiedFeature.geometry.coordinates,
        },
      };
    });

    const simplifiedCollection: GeoJsonFeatureCollection = {
      type: "FeatureCollection",
      features: simplifiedFeatures,
    };

    if (countCollectionCoordinates(simplifiedCollection) < originalCoordinateCount) {
      return simplifiedCollection;
    }
  }

  throw new Error(`Gagal menyederhanakan layer ${layerKey} menjadi asset light yang lebih ringan`);
}

function serializeCollection(collection: GeoJsonFeatureCollection) {
  return `${JSON.stringify(collection, null, 2)}\n`;
}

async function writeCollections(
  regionKey: string,
  outputRoot: string,
  assets: RegionBoundaryBundle["assets"],
) {
  const regionOutputDir = path.join(outputRoot, regionKey);
  await mkdir(regionOutputDir, { recursive: true });

  const outputs: Array<[string, GeoJsonFeatureCollection]> = [
    ["kabupaten.precise.geojson", assets.kabupaten.precise],
    ["kecamatan.precise.geojson", assets.kecamatan.precise],
    ["desa.precise.geojson", assets.desa.precise],
    ["kabupaten.light.geojson", assets.kabupaten.light],
    ["kecamatan.light.geojson", assets.kecamatan.light],
    ["desa.light.geojson", assets.desa.light],
  ];

  await Promise.all(
    outputs.map(([fileName, collection]) => {
      return writeFile(path.join(regionOutputDir, fileName), serializeCollection(collection), "utf-8");
    }),
  );
}

export async function loadRegionBoundaryBundle(regionKey: string, outputRoot = defaultOutputRoot): Promise<RegionBoundaryBundle> {
  const regionOutputDir = path.join(outputRoot, regionKey);
  const readCollection = async (fileName: string) => {
    const raw = await readFile(path.join(regionOutputDir, fileName), "utf-8");
    return JSON.parse(raw) as GeoJsonFeatureCollection;
  };

  return {
    regionKey,
    assets: {
      kabupaten: {
        precise: await readCollection("kabupaten.precise.geojson"),
        light: await readCollection("kabupaten.light.geojson"),
      },
      kecamatan: {
        precise: await readCollection("kecamatan.precise.geojson"),
        light: await readCollection("kecamatan.light.geojson"),
      },
      desa: {
        precise: await readCollection("desa.precise.geojson"),
        light: await readCollection("desa.light.geojson"),
      },
    },
  };
}

export async function buildRegionBoundaryBundle({
  regionKey,
  docsRoot,
  outputRoot = defaultOutputRoot,
  writeFiles = true,
}: BuildRegionBoundaryBundleInput): Promise<RegionBoundaryBundle> {
  if (regionKey !== supportedRegionKey) {
    throw new Error(`Region key ${regionKey} belum didukung. Gunakan ${supportedRegionKey}.`);
  }

  const resolvedDocsRoot = await resolveDocsRoot(docsRoot);
  const kabupatenPrecise = await readLayerCollection("kabupaten", resolvedDocsRoot);
  const kecamatanPrecise = await readLayerCollection("kecamatan", resolvedDocsRoot);
  const desaPrecise = await readLayerCollection("desa", resolvedDocsRoot);
  const assets: RegionBoundaryBundle["assets"] = {
    kabupaten: {
      precise: kabupatenPrecise,
      light: simplifyCollection("kabupaten", kabupatenPrecise),
    },
    kecamatan: {
      precise: kecamatanPrecise,
      light: simplifyCollection("kecamatan", kecamatanPrecise),
    },
    desa: {
      precise: desaPrecise,
      light: simplifyCollection("desa", desaPrecise),
    },
  };
  const bundle: RegionBoundaryBundle = {
    regionKey,
    assets,
  };

  if (writeFiles) {
    await writeCollections(regionKey, outputRoot, assets);
  }

  return bundle;
}

async function runCli() {
  const { regionKey } = parseCliArgs(process.argv.slice(2));
  if (!regionKey) {
    throw new Error("Argumen --regionKey wajib diisi");
  }

  const bundle = await buildRegionBoundaryBundle({ regionKey, writeFiles: true });
  console.log(
    JSON.stringify(
      {
        regionKey: bundle.regionKey,
        kabupatenFeatures: bundle.assets.kabupaten.precise.features.length,
        kecamatanFeatures: bundle.assets.kecamatan.precise.features.length,
        desaFeatures: bundle.assets.desa.precise.features.length,
      },
      null,
      2,
    ),
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  runCli().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
