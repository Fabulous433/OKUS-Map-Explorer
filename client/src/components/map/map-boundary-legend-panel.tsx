import { createDefaultRegionBoundaryLayerState, type RegionBoundaryLayerState } from "@/lib/map/region-boundary-layer-state";
import { getRegionBoundaryLayerStyle } from "@/lib/map/region-boundary-layer-style";

export type BoundaryLegendFeature = {
  level: "kecamatan" | "desa";
  featureName: string;
};

type BoundaryLegendItem = {
  label: string;
  tone: string;
};

type BoundaryLegendModel = {
  heading: string;
  description: string;
  items: BoundaryLegendItem[];
};

const MARKER_SYMBOL_GUIDE = [
  { label: "MKN", description: "Makanan & minuman" },
  { label: "HTL", description: "Perhotelan" },
  { label: "RKL", description: "Reklame" },
] as const;

function uniqueSortedNames(featureNames: string[]) {
  return Array.from(new Set(featureNames.map((item) => item.trim()).filter(Boolean))).sort((left, right) =>
    left.localeCompare(right, "id"),
  );
}

export function createBoundaryLegendModel(params: {
  layerState?: RegionBoundaryLayerState;
  visibleFeatures?: BoundaryLegendFeature[];
}): BoundaryLegendModel {
  const layerState = params.layerState ?? createDefaultRegionBoundaryLayerState();
  const visibleFeatures = params.visibleFeatures ?? [];

  const hasVisibleDesa = layerState.desa.visible && visibleFeatures.some((feature) => feature.level === "desa");
  const hasVisibleKecamatan =
    layerState.kecamatan.visible && visibleFeatures.some((feature) => feature.level === "kecamatan");

  if (!hasVisibleDesa && !hasVisibleKecamatan) {
    return {
      heading: "Informasi Layer Polygon",
      description: "Aktifkan layer kecamatan atau desa untuk melihat legenda warna polygon yang sedang tampil.",
      items: [],
    };
  }

  const activeLevel = hasVisibleDesa ? "desa" : "kecamatan";
  const activeFeatureNames = uniqueSortedNames(
    visibleFeatures.filter((feature) => feature.level === activeLevel).map((feature) => feature.featureName),
  );

  return {
    heading: activeLevel === "desa" ? "Data Polygon Desa / Kelurahan" : "Data Polygon Kecamatan",
    description:
      activeLevel === "desa"
        ? "Legenda mengikuti polygon desa/kelurahan yang sedang tampil pada scope kecamatan terpilih."
        : "Legenda mengikuti polygon kecamatan yang sedang tampil pada atlas peta publik.",
    items: activeFeatureNames.map((featureName) => ({
      label: featureName,
      tone: getRegionBoundaryLayerStyle({
        level: activeLevel,
        featureName,
        opacity: layerState[activeLevel].opacity,
      }).fillColor,
    })),
  };
}

type MapBoundaryLegendPanelProps = {
  layerState?: RegionBoundaryLayerState;
  visibleFeatures?: BoundaryLegendFeature[];
};

export function MapBoundaryLegendPanel(props: MapBoundaryLegendPanelProps) {
  const model = createBoundaryLegendModel({
    layerState: props.layerState,
    visibleFeatures: props.visibleFeatures,
  });

  return (
    <section className="space-y-3">
      <div className="rounded-[24px] border border-white/60 bg-white/70 px-4 py-4 shadow-[10px_10px_28px_rgba(148,163,184,0.16),-8px_-8px_22px_rgba(255,255,255,0.72)]">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500">Informasi</p>
        <h3 className="mt-2 text-xl font-semibold text-slate-900">{model.heading}</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">{model.description}</p>
      </div>

      {model.items.length > 0 ? (
        <div className="rounded-[24px] border border-white/70 bg-white/80 px-4 py-4 shadow-[12px_12px_32px_rgba(148,163,184,0.16),-10px_-10px_26px_rgba(255,255,255,0.82)]">
          <div className="space-y-3">
            {model.items.map((item) => (
              <div key={item.label} className="flex items-center gap-3">
                <span className="h-7 w-7 rounded-xl border border-slate-200" style={{ backgroundColor: item.tone }} />
                <span className="text-sm font-medium text-slate-800">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/80 px-4 py-4 text-sm leading-6 text-slate-600">
          Belum ada polygon aktif yang cukup untuk ditampilkan sebagai legenda.
        </div>
      )}

      <div className="rounded-[24px] border border-white/70 bg-white/80 px-4 py-4 shadow-[12px_12px_32px_rgba(148,163,184,0.16),-10px_-10px_26px_rgba(255,255,255,0.82)]">
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">Simbol Marker</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {MARKER_SYMBOL_GUIDE.map((item) => (
            <div
              key={item.label}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-[11px] text-slate-700"
            >
              <span className="font-semibold text-slate-900">{item.label}</span>
              <span className="mx-2 text-slate-300">/</span>
              <span>{item.description}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
