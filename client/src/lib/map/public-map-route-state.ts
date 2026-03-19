import type { MapStage } from "@/lib/map/public-map-stage-model";

export type PublicMapRouteState = {
  stage: MapStage;
  kecamatanId: string | null;
  desaKey: string | null;
  taxType: string | null;
};

function normalizeDesaSlug(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("id")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createRootRouteState(): PublicMapRouteState {
  return {
    stage: "kabupaten",
    kecamatanId: null,
    desaKey: null,
    taxType: null,
  };
}

export function createPublicMapDesaKey(params: { kecamatanId: string; desaName: string }) {
  return `${params.kecamatanId}:${normalizeDesaSlug(params.desaName)}`;
}

export function serializePublicMapRouteState(state: PublicMapRouteState) {
  if (state.stage === "kabupaten") {
    return "";
  }

  if (!state.kecamatanId) {
    return "";
  }

  const searchParams = new URLSearchParams();
  searchParams.set("stage", state.stage);
  searchParams.set("kecamatanId", state.kecamatanId);

  if (state.stage === "desa") {
    if (!state.desaKey) {
      return "";
    }

    searchParams.set("desaKey", state.desaKey);

    if (state.taxType && state.taxType.trim().length > 0) {
      searchParams.set("taxType", state.taxType);
    }
  }

  return searchParams.toString();
}

export function parsePublicMapRouteState(search: string): PublicMapRouteState {
  const searchParams = new URLSearchParams(search);
  const stage = searchParams.get("stage");

  if (!stage || stage === "kabupaten") {
    return createRootRouteState();
  }

  const kecamatanId = searchParams.get("kecamatanId")?.trim() ?? "";
  if (!kecamatanId) {
    return createRootRouteState();
  }

  if (stage === "kecamatan") {
    return {
      stage,
      kecamatanId,
      desaKey: null,
      taxType: null,
    };
  }

  if (stage === "desa") {
    const desaKey = searchParams.get("desaKey")?.trim() ?? "";
    if (!desaKey) {
      return createRootRouteState();
    }

    const taxType = searchParams.get("taxType")?.trim() ?? "";
    return {
      stage,
      kecamatanId,
      desaKey,
      taxType: taxType || null,
    };
  }

  return createRootRouteState();
}

export function applyPublicMapRouteStateToSearch(currentSearch: string, state: PublicMapRouteState) {
  const nextParams = new URLSearchParams(currentSearch);
  nextParams.delete("stage");
  nextParams.delete("kecamatanId");
  nextParams.delete("desaKey");
  nextParams.delete("taxType");

  const serializedRouteState = serializePublicMapRouteState(state);
  if (serializedRouteState) {
    const routeParams = new URLSearchParams(serializedRouteState);
    routeParams.forEach((value, key) => {
      nextParams.set(key, value);
    });
  }

  const nextSearch = nextParams.toString();
  return nextSearch ? `?${nextSearch}` : "";
}
