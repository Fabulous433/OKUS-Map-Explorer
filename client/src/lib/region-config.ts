import { resolveMapDataSourceConfig, type ResolvedMapDataSourceConfig } from "@/lib/map/map-data-source";

type RegionConfig = {
  identity: {
    regionKey: string;
    regionName: string;
    regionShortName: string;
  };
  map: {
    center: [number, number];
    defaultZoom: number;
    dataSource: ResolvedMapDataSourceConfig;
  };
  brand: {
    publicMapMobileTitle: string;
    publicMapDesktopTitle: string;
    publicMapSubtitleMobile: string;
    publicMapSubtitleDesktop: string;
    backofficeTitle: string;
    backofficeMobileTitle: string;
    backofficeSubtitle: string;
    backofficeLoginTitle: string;
    backofficeLoginSubtitle: string;
  };
};

type RegionEnvSource = Record<string, string | undefined>;

const DEFAULT_REGION_NAME = "OKU Selatan";
const DEFAULT_REGION_SHORT_NAME = "OKUS";
const DEFAULT_REGION_KEY = "okus";
const DEFAULT_MAP_CENTER: [number, number] = [-4.525, 104.027];
const DEFAULT_MAP_ZOOM = 10;

function readString(value: string | undefined, fallback: string) {
  const normalized = value?.trim();
  return normalized && normalized.length > 0 ? normalized : fallback;
}

function readNumber(value: string | undefined, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readRegionEnvSource(): RegionEnvSource {
  const meta = import.meta as ImportMeta & {
    env?: RegionEnvSource;
  };

  return meta.env ?? {};
}

export function createRegionConfig(envSource: RegionEnvSource): RegionConfig {
  const regionKey = readString(envSource.VITE_REGION_KEY, DEFAULT_REGION_KEY).toLowerCase();
  const regionName = readString(envSource.VITE_REGION_NAME, DEFAULT_REGION_NAME);
  const regionShortName = readString(envSource.VITE_REGION_SHORT_NAME, DEFAULT_REGION_SHORT_NAME);
  const mapCenter: [number, number] = [
    readNumber(envSource.VITE_MAP_CENTER_LAT, DEFAULT_MAP_CENTER[0]),
    readNumber(envSource.VITE_MAP_CENTER_LNG, DEFAULT_MAP_CENTER[1]),
  ];
  const defaultZoom = readNumber(envSource.VITE_MAP_DEFAULT_ZOOM, DEFAULT_MAP_ZOOM);
  const dataSource = resolveMapDataSourceConfig({
    mapDataMode: envSource.VITE_MAP_DATA_MODE,
    mapInternalApiEndpoint: envSource.VITE_MAP_INTERNAL_API_ENDPOINT,
    mapProxyEndpoint: envSource.VITE_MAP_PROXY_ENDPOINT,
    mapWfsEndpoint: envSource.VITE_MAP_WFS_ENDPOINT,
  });

  return {
    identity: {
      regionKey,
      regionName,
      regionShortName,
    },
    map: {
      center: mapCenter,
      defaultZoom,
      dataSource,
    },
    brand: {
      publicMapMobileTitle: "PETA OP",
      publicMapDesktopTitle: "PETA OBJEK PAJAK",
      publicMapSubtitleMobile: "Viewport Query",
      publicMapSubtitleDesktop: "Viewport Query Mode",
      backofficeTitle: "BACKOFFICE",
      backofficeMobileTitle: `${regionShortName} Backoffice`,
      backofficeSubtitle: `Pajak Daerah ${regionName}`,
      backofficeLoginTitle: "BACKOFFICE LOGIN",
      backofficeLoginSubtitle: `${regionName} Pajak Daerah`,
    },
  };
}

export const regionConfig: RegionConfig = createRegionConfig(readRegionEnvSource());
