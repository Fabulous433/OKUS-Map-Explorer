import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  createDefaultRegionBoundaryLayerState,
  getDesaLayerEmptyState,
  type RegionBoundaryLayerId,
  type RegionBoundaryLayerState,
} from "@/lib/map/region-boundary-layer-state";

export const MAP_ATLAS_PANEL_TABS = [
  { id: "map", label: "Peta" },
  { id: "info", label: "Informasi" },
  { id: "search", label: "Cari" },
] as const;

type MapBoundaryLayerControlRow = {
  id: RegionBoundaryLayerId;
  label: string;
  eyebrow: string;
  helperText: string;
  visible: boolean;
  opacity: number;
  hasToggle: true;
  hasOpacity: true;
  accent: string;
};

const LAYER_META: Record<
  RegionBoundaryLayerId,
  {
    label: string;
    eyebrow: string;
    helperText: string;
    accent: string;
  }
> = {
  kabupaten: {
    label: "Batas Kabupaten",
    eyebrow: "Konteks dasar atlas",
    helperText: "Outline wilayah aktif tetap menjadi jangkar orientasi peta.",
    accent: "#D8A446",
  },
  kecamatan: {
    label: "Polygon Kecamatan",
    eyebrow: "Lapisan menengah",
    helperText: "Warna berbeda membantu membaca distribusi antar kecamatan.",
    accent: "#44B2E2",
  },
  desa: {
    label: "Polygon Desa / Kelurahan",
    eyebrow: "Lapisan detail",
    helperText: "Aktifkan detail administratif terdalam untuk kecamatan yang dipilih.",
    accent: "#E37AA7",
  },
};

export function createMapBoundaryLayerControlRows(params: {
  layerState?: RegionBoundaryLayerState;
  kecamatanId: string;
  zoom: number;
}): MapBoundaryLayerControlRow[] {
  const layerState = params.layerState ?? createDefaultRegionBoundaryLayerState();

  return (["kabupaten", "kecamatan", "desa"] as const).map((layerId) => {
    const layerConfig = layerState[layerId];
    const helperText =
      layerId === "desa"
        ? getDesaLayerEmptyState({
            layerState,
            kecamatanId: params.kecamatanId,
            zoom: params.zoom,
          }) ?? LAYER_META[layerId].helperText
        : LAYER_META[layerId].helperText;

    return {
      id: layerId,
      label: LAYER_META[layerId].label,
      eyebrow: LAYER_META[layerId].eyebrow,
      helperText,
      visible: layerConfig.visible,
      opacity: layerConfig.opacity,
      hasToggle: true,
      hasOpacity: true,
      accent: LAYER_META[layerId].accent,
    };
  });
}

type MapBoundaryLayerControlsProps = {
  layerState?: RegionBoundaryLayerState;
  kecamatanId: string;
  zoom: number;
  onVisibilityChange?: (layerId: RegionBoundaryLayerId, visible: boolean) => void;
  onOpacityChange?: (layerId: RegionBoundaryLayerId, opacity: number) => void;
};

export function MapBoundaryLayerControls(props: MapBoundaryLayerControlsProps) {
  const rows = createMapBoundaryLayerControlRows({
    layerState: props.layerState,
    kecamatanId: props.kecamatanId,
    zoom: props.zoom,
  });

  return (
    <section className="space-y-3">
      <div className="rounded-[24px] border border-white/60 bg-white/70 px-4 py-4 shadow-[10px_10px_28px_rgba(148,163,184,0.16),-8px_-8px_22px_rgba(255,255,255,0.72)]">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-slate-500">Layer Control</p>
        <h3 className="mt-2 text-xl font-semibold text-slate-900">Polygon batas aktif</h3>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          Atur visibilitas dan transparansi batas administratif tanpa mengubah alur marker viewport.
        </p>
      </div>

      {rows.map((row) => (
        <article
          key={row.id}
          className="rounded-[24px] border border-white/70 bg-white/80 px-4 py-4 shadow-[12px_12px_32px_rgba(148,163,184,0.16),-10px_-10px_26px_rgba(255,255,255,0.82)]"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: row.accent }}
                  aria-hidden="true"
                />
                <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">{row.eyebrow}</p>
              </div>
              <h4 className="mt-2 text-base font-semibold text-slate-900">{row.label}</h4>
              <p
                className={cn(
                  "mt-1 text-sm leading-6 text-slate-600",
                  row.id === "desa" && row.helperText !== LAYER_META.desa.helperText ? "text-amber-700" : undefined,
                )}
              >
                {row.helperText}
              </p>
            </div>

            <Switch
              checked={row.visible}
              onCheckedChange={(checked) => props.onVisibilityChange?.(row.id, checked)}
              aria-label={`Toggle ${row.label}`}
            />
          </div>

          <div className="mt-4 rounded-[20px] bg-slate-50/90 px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">Opacity</p>
              <span className="font-mono text-xs text-slate-700">{row.opacity}%</span>
            </div>
            <Slider
              value={[row.opacity]}
              min={0}
              max={100}
              step={1}
              disabled={!row.visible}
              className="mt-3"
              onValueChange={(value) => props.onOpacityChange?.(row.id, value[0] ?? row.opacity)}
              aria-label={`Opacity ${row.label}`}
            />
          </div>
        </article>
      ))}
    </section>
  );
}

export type { MapBoundaryLayerControlRow };
