import { PUBLIC_BASE_MAPS, type BaseMapKey } from "@/lib/map/map-basemap-config";

const PUBLIC_MAP_BASEMAP_STORAGE_KEY = "okus-public-map-basemap";

function canUseLocalStorage() {
  return typeof globalThis !== "undefined" && typeof globalThis.localStorage !== "undefined";
}

function isBaseMapKey(value: string): value is BaseMapKey {
  return Object.prototype.hasOwnProperty.call(PUBLIC_BASE_MAPS, value);
}

export function loadPublicMapBaseMapPreference(): BaseMapKey | null {
  if (!canUseLocalStorage()) {
    return null;
  }

  try {
    const value = globalThis.localStorage.getItem(PUBLIC_MAP_BASEMAP_STORAGE_KEY);
    return value && isBaseMapKey(value) ? value : null;
  } catch {
    return null;
  }
}

export function savePublicMapBaseMapPreference(value: BaseMapKey) {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    globalThis.localStorage.setItem(PUBLIC_MAP_BASEMAP_STORAGE_KEY, value);
  } catch {
    // Ignore storage failures and keep the map usable.
  }
}
