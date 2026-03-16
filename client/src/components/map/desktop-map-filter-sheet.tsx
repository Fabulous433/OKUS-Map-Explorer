import { Search } from "lucide-react";
import { MapBoundaryLayerControls, MAP_ATLAS_PANEL_TABS } from "@/components/map/map-boundary-layer-controls";
import { MapBoundaryLegendPanel, type BoundaryLegendFeature } from "@/components/map/map-boundary-legend-panel";
import { MapBasemapButtonList } from "@/components/map/map-basemap-button-list";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BaseMapKey } from "@/lib/map/map-basemap-config";
import {
  createDefaultRegionBoundaryLayerState,
  type RegionBoundaryLayerId,
  type RegionBoundaryLayerState,
} from "@/lib/map/region-boundary-layer-state";
import type { MasterKecamatan, MasterRekeningPajak } from "@shared/schema";

type DesktopMapFilterSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  kecamatanId: string;
  onKecamatanIdChange: (value: string) => void;
  rekPajakId: string;
  onRekPajakIdChange: (value: string) => void;
  baseMap: BaseMapKey;
  onBaseMapChange: (value: BaseMapKey) => void;
  kecamatanList: MasterKecamatan[];
  rekeningList: MasterRekeningPajak[];
  boundaryLayerState?: RegionBoundaryLayerState;
  onBoundaryLayerVisibilityChange?: (layerId: RegionBoundaryLayerId, visible: boolean) => void;
  onBoundaryLayerOpacityChange?: (layerId: RegionBoundaryLayerId, opacity: number) => void;
  boundaryLegendFeatures?: BoundaryLegendFeature[];
  boundaryLayerZoom?: number;
};

export function DesktopMapFilterSheet({
  open,
  onOpenChange,
  searchQuery,
  onSearchQueryChange,
  kecamatanId,
  onKecamatanIdChange,
  rekPajakId,
  onRekPajakIdChange,
  baseMap,
  onBaseMapChange,
  kecamatanList,
  rekeningList,
  boundaryLayerState,
  onBoundaryLayerVisibilityChange,
  onBoundaryLayerOpacityChange,
  boundaryLegendFeatures = [],
  boundaryLayerZoom = 12,
}: DesktopMapFilterSheetProps) {
  const safeBoundaryLayerState = boundaryLayerState ?? createDefaultRegionBoundaryLayerState();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-[360px] border-r border-white/60 bg-[linear-gradient(180deg,#eef3f7_0%,#e8eef5_44%,#eff4f8_100%)] p-0 sm:max-w-[360px]"
      >
        <Tabs defaultValue="map" className="flex h-full flex-col">
          <div className="border-b border-white/60 px-4 py-4">
            <SheetHeader className="space-y-0 p-0 text-left">
              <SheetTitle className="font-sans text-xl font-bold text-slate-900">Atlas Peta</SheetTitle>
              <SheetDescription className="mt-1 text-sm leading-6 text-slate-600">
                Kontrol polygon batas, legenda warna, dan pencarian publik dalam satu panel atlas.
              </SheetDescription>
            </SheetHeader>

            <TabsList className="mt-4 grid h-auto w-full grid-cols-3 rounded-[22px] bg-white/70 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),0_8px_18px_rgba(148,163,184,0.14)]">
              {MAP_ATLAS_PANEL_TABS.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="rounded-[18px] px-3 py-2 text-sm font-semibold text-slate-600 data-[state=active]:bg-white data-[state=active]:text-slate-900"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <ScrollArea className="flex-1">
            <div className="px-4 py-5">
              <TabsContent value="map" className="mt-0 space-y-4">
                <MapBoundaryLayerControls
                  layerState={safeBoundaryLayerState}
                  kecamatanId={kecamatanId}
                  zoom={boundaryLayerZoom}
                  onVisibilityChange={onBoundaryLayerVisibilityChange}
                  onOpacityChange={onBoundaryLayerOpacityChange}
                />

                <section className="rounded-[24px] border border-white/70 bg-white/80 px-4 py-4 shadow-[12px_12px_32px_rgba(148,163,184,0.16),-10px_-10px_26px_rgba(255,255,255,0.82)]">
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">Basemap</p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    Pilih permukaan peta yang paling nyaman untuk membaca polygon.
                  </p>
                  <div className="mt-4">
                    <MapBasemapButtonList value={baseMap} onValueChange={onBaseMapChange} />
                  </div>
                </section>
              </TabsContent>

              <TabsContent value="info" className="mt-0 space-y-4">
                <MapBoundaryLegendPanel layerState={safeBoundaryLayerState} visibleFeatures={boundaryLegendFeatures} />
              </TabsContent>

              <TabsContent value="search" className="mt-0 space-y-4">
                <section className="rounded-[24px] border border-white/70 bg-white/80 px-4 py-4 shadow-[12px_12px_32px_rgba(148,163,184,0.16),-10px_-10px_26px_rgba(255,255,255,0.82)]">
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">Pencarian</p>
                  <div className="relative mt-3">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      value={searchQuery}
                      onChange={(event) => onSearchQueryChange(event.target.value)}
                      placeholder="Cari nama OP / NOPD / alamat"
                      className="h-11 rounded-2xl border-white/70 bg-slate-50 pl-9"
                    />
                  </div>
                </section>

                <section className="rounded-[24px] border border-white/70 bg-white/80 px-4 py-4 shadow-[12px_12px_32px_rgba(148,163,184,0.16),-10px_-10px_26px_rgba(255,255,255,0.82)]">
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">Wilayah</p>
                  <Select value={kecamatanId} onValueChange={onKecamatanIdChange}>
                    <SelectTrigger className="mt-3 h-11 rounded-2xl border-white/70 bg-slate-50 font-mono text-xs">
                      <SelectValue placeholder="Kecamatan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Kecamatan</SelectItem>
                      {kecamatanList.map((item) => (
                        <SelectItem key={item.cpmKecId} value={item.cpmKecId}>
                          {item.cpmKecamatan}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </section>

                <section className="rounded-[24px] border border-white/70 bg-white/80 px-4 py-4 shadow-[12px_12px_32px_rgba(148,163,184,0.16),-10px_-10px_26px_rgba(255,255,255,0.82)]">
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">Rekening Pajak</p>
                  <Select value={rekPajakId} onValueChange={onRekPajakIdChange}>
                    <SelectTrigger className="mt-3 h-11 rounded-2xl border-white/70 bg-slate-50 font-mono text-xs">
                      <SelectValue placeholder="Rekening Pajak" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua Rekening</SelectItem>
                      {rekeningList.map((item) => (
                        <SelectItem key={item.id} value={String(item.id)}>
                          {item.kodeRekening}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </section>
              </TabsContent>
            </div>
          </ScrollArea>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
