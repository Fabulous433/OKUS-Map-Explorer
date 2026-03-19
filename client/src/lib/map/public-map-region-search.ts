import { createPublicMapDesaKey } from "@/lib/map/public-map-route-state";

type KecamatanOption = {
  id: string;
  nama: string;
};

type DesaOption = {
  kecamatanId: string;
  nama: string;
};

export type PublicMapRegionJumpItem = {
  type: "kecamatan" | "desa";
  kecamatanId: string;
  desaKey?: string;
  label: string;
  parentLabel?: string;
};

export type PublicMapRegionJumpGroup = {
  group: string;
  items: PublicMapRegionJumpItem[];
};

function normalizeSearchValue(value: string) {
  return value
    .trim()
    .toLocaleLowerCase("id")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "");
}

function compactSearchValue(value: string) {
  return normalizeSearchValue(value).replace(/[^a-z0-9]+/g, "");
}

function matchesRegionQuery(label: string, query: string) {
  const normalizedLabel = normalizeSearchValue(label);
  const normalizedQuery = normalizeSearchValue(query);
  if (normalizedLabel.includes(normalizedQuery)) {
    return true;
  }

  return compactSearchValue(label).includes(compactSearchValue(query));
}

export function buildPublicMapRegionJumpGroups(params: {
  query: string;
  selectedKecamatanId: string | null;
  kecamatan: KecamatanOption[];
  desa: DesaOption[];
}): PublicMapRegionJumpGroup[] {
  const normalizedQuery = normalizeSearchValue(params.query);
  if (!normalizedQuery) {
    return [];
  }

  const kecamatanById = new Map(params.kecamatan.map((item) => [item.id, item.nama]));

  const kecamatanItems = params.kecamatan
    .filter((item) => matchesRegionQuery(item.nama, normalizedQuery))
    .sort((left, right) => left.nama.localeCompare(right.nama, "id"))
    .map<PublicMapRegionJumpItem>((item) => ({
      type: "kecamatan",
      kecamatanId: item.id,
      label: item.nama,
    }));

  const desaItems =
    params.selectedKecamatanId === null
      ? []
      : params.desa
          .filter(
            (item) =>
              item.kecamatanId === params.selectedKecamatanId &&
              matchesRegionQuery(item.nama, normalizedQuery),
          )
          .sort((left, right) => left.nama.localeCompare(right.nama, "id"))
          .map<PublicMapRegionJumpItem>((item) => ({
            type: "desa",
            kecamatanId: item.kecamatanId,
            desaKey: createPublicMapDesaKey({
              kecamatanId: item.kecamatanId,
              desaName: item.nama,
            }),
            label: item.nama,
            parentLabel: kecamatanById.get(item.kecamatanId) ?? "Kecamatan",
          }));

  return [
    kecamatanItems.length > 0
      ? {
          group: "Kecamatan",
          items: kecamatanItems,
        }
      : null,
    desaItems.length > 0
      ? {
          group: "Desa / Kelurahan",
          items: desaItems,
        }
      : null,
  ].filter((group): group is PublicMapRegionJumpGroup => group !== null);
}
