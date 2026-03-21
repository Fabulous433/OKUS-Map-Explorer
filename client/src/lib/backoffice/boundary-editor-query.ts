import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type {
  RegionBoundaryDraftFeature,
  RegionBoundaryRevision,
  RegionBoundaryRevisionHistoryItem,
  RegionBoundaryTopologyAnalysis,
} from "@shared/region-boundary-admin";
import type { MasterKecamatan, MasterKelurahan } from "@shared/schema";

function normalizeBoundarySegment(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("id")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeCompactSegment(value: string) {
  return normalizeBoundarySegment(value).replace(/-/g, "");
}

export function buildBoundaryEditorDesaKey(params: { kecamatanName: string; desaName: string }) {
  return `${normalizeCompactSegment(params.kecamatanName)}:${normalizeBoundarySegment(params.desaName)}`;
}

export type BoundaryEditorKecamatanOption = {
  id: string;
  label: string;
};

export type BoundaryEditorDesaOption = {
  id: string;
  boundaryKey: string;
  label: string;
};

export type BoundaryEditorDraftResponse = {
  revision: RegionBoundaryRevision;
  features: RegionBoundaryDraftFeature[];
};

export type BoundaryEditorTopologyResponse = {
  revision: RegionBoundaryRevision;
  analysis: RegionBoundaryTopologyAnalysis;
  features: RegionBoundaryDraftFeature[];
};

export function createBoundaryEditorDraftQueryKey(kecamatanId?: string) {
  return [
    kecamatanId
      ? `/api/backoffice/region-boundaries/desa/draft?kecamatanId=${encodeURIComponent(kecamatanId)}`
      : "/api/backoffice/region-boundaries/desa/draft",
  ] as const;
}

export function createBoundaryEditorTopologyQueryKey(kecamatanId?: string) {
  return [
    kecamatanId
      ? `/api/backoffice/region-boundaries/desa/draft/topology?kecamatanId=${encodeURIComponent(kecamatanId)}`
      : "/api/backoffice/region-boundaries/desa/draft/topology",
  ] as const;
}

export function createBoundaryEditorRevisionHistoryQueryKey(boundaryKey?: string) {
  return [
    boundaryKey
      ? `/api/backoffice/region-boundaries/desa/revision-history?boundaryKey=${encodeURIComponent(boundaryKey)}`
      : "/api/backoffice/region-boundaries/desa/revision-history",
  ] as const;
}

export function useBoundaryEditorRevisionListQuery() {
  return useQuery<RegionBoundaryRevision[]>({
    queryKey: ["/api/backoffice/region-boundaries/desa/revisions"],
  });
}

export function useBoundaryEditorRevisionHistoryQuery(boundaryKey?: string) {
  return useQuery<RegionBoundaryRevisionHistoryItem[]>({
    queryKey: createBoundaryEditorRevisionHistoryQueryKey(boundaryKey),
    enabled: Boolean(boundaryKey),
  });
}

export function useBoundaryEditorKecamatanOptionsQuery() {
  const query = useQuery<MasterKecamatan[]>({
    queryKey: ["/api/master/kecamatan"],
  });

  const options = useMemo<BoundaryEditorKecamatanOption[]>(() => {
    const items = Array.isArray(query.data) ? query.data : [];
    return items.map((item) => ({
      id: item.cpmKecId,
      label: item.cpmKecamatan,
    }));
  }, [query.data]);

  return {
    ...query,
    options,
  };
}

export function useBoundaryEditorDesaOptionsQuery(kecamatanId?: string) {
  const queryKey = kecamatanId
    ? `/api/master/kelurahan?kecamatanId=${encodeURIComponent(kecamatanId)}`
    : "/api/master/kelurahan";

  const query = useQuery<MasterKelurahan[]>({
    queryKey: [queryKey],
    enabled: Boolean(kecamatanId),
  });

  return {
    ...query,
    items: Array.isArray(query.data) ? query.data : [],
  };
}

export function useBoundaryEditorAllDesaItemsQuery() {
  const query = useQuery<MasterKelurahan[]>({
    queryKey: ["/api/master/kelurahan"],
  });

  return {
    ...query,
    items: Array.isArray(query.data) ? query.data : [],
  };
}

export function useBoundaryEditorDraftQuery(kecamatanId?: string) {
  return useQuery<BoundaryEditorDraftResponse>({
    queryKey: createBoundaryEditorDraftQueryKey(kecamatanId),
    enabled: Boolean(kecamatanId),
  });
}

export function useBoundaryEditorTopologyQuery(kecamatanId?: string) {
  return useQuery<BoundaryEditorTopologyResponse>({
    queryKey: createBoundaryEditorTopologyQueryKey(kecamatanId),
    enabled: Boolean(kecamatanId),
  });
}

export function createBoundaryEditorDesaOptions(params: {
  draftFeatures: RegionBoundaryDraftFeature[];
  kelurahanItems: MasterKelurahan[];
  selectedKecamatanName: string;
}) {
  return params.kelurahanItems.map((item) => {
    const draftFeature = params.draftFeatures.find((feature) => feature.kelurahanId === item.cpmKelId);

    return {
      id: item.cpmKelId,
      boundaryKey:
        draftFeature?.boundaryKey ??
        buildBoundaryEditorDesaKey({
          kecamatanName: params.selectedKecamatanName,
          desaName: item.cpmKelurahan,
        }),
      label: item.cpmKelurahan,
    };
  });
}

export function createBoundaryEditorTopologyCandidateOptions(params: {
  topologyAnalysis: RegionBoundaryTopologyAnalysis | null | undefined;
  kelurahanItems: MasterKelurahan[];
  kecamatanItems: MasterKecamatan[];
}) {
  const candidateBoundaryKeys = new Set<string>();

  for (const fragment of params.topologyAnalysis?.fragments ?? []) {
    candidateBoundaryKeys.add(fragment.sourceBoundaryKey);

    for (const boundaryKey of fragment.candidateBoundaryKeys) {
      candidateBoundaryKeys.add(boundaryKey);
    }

    if (fragment.assignedBoundaryKey) {
      candidateBoundaryKeys.add(fragment.assignedBoundaryKey);
    }
  }

  const kecamatanByKode = new Map(
    params.kecamatanItems.map((item) => [item.cpmKodeKec, item]),
  );

  const options: BoundaryEditorDesaOption[] = [];
  for (const kelurahan of params.kelurahanItems) {
    const kecamatan = kecamatanByKode.get(kelurahan.cpmKodeKec);
    if (!kecamatan) {
      continue;
    }

    const boundaryKey = buildBoundaryEditorDesaKey({
      kecamatanName: kecamatan.cpmKecamatan,
      desaName: kelurahan.cpmKelurahan,
    });
    if (!candidateBoundaryKeys.has(boundaryKey)) {
      continue;
    }

    options.push({
      id: kelurahan.cpmKelId,
      boundaryKey,
      label: `${kelurahan.cpmKelurahan} (${kecamatan.cpmKecamatan})`,
    });
  }

  return options;
}
