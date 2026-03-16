import { Link } from "wouter";
import { Search, Settings, X } from "lucide-react";
import { MapBoundaryLayerControls, MAP_ATLAS_PANEL_TABS } from "@/components/map/map-boundary-layer-controls";
import { MapBoundaryLegendPanel, type BoundaryLegendFeature } from "@/components/map/map-boundary-legend-panel";
import { MapBasemapButtonList } from "@/components/map/map-basemap-button-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BaseMapKey } from "@/lib/map/map-basemap-config";
import {
  createDefaultRegionBoundaryLayerState,
  type RegionBoundaryLayerId,
  type RegionBoundaryLayerState,
} from "@/lib/map/region-boundary-layer-state";
import type { MasterKecamatan, MasterRekeningPajak } from "@shared/schema";

type MobileMapDrawerProps = {
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
  totalInView: number;
  viewportLabel: string;
  markerCount: number;
  isCapped: boolean;
  isViewportQueryActive: boolean;
  boundaryLayerState?: RegionBoundaryLayerState;
  onBoundaryLayerVisibilityChange?: (layerId: RegionBoundaryLayerId, visible: boolean) => void;
  onBoundaryLayerOpacityChange?: (layerId: RegionBoundaryLayerId, opacity: number) => void;
  boundaryLegendFeatures?: BoundaryLegendFeature[];
  boundaryLayerZoom?: number;
};

export function MobileMapDrawer({
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
  totalInView,
  viewportLabel,
  markerCount,
  isCapped,
  isViewportQueryActive,
  boundaryLayerState,
  onBoundaryLayerVisibilityChange,
  onBoundaryLayerOpacityChange,
  boundaryLegendFeatures = [],
  boundaryLayerZoom = 12,
}: MobileMapDrawerProps) {
  const safeBoundaryLayerState = boundaryLayerState ?? createDefaultRegionBoundaryLayerState();

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-xl bg-background">
        <DrawerHeader className="px-4 pb-4 pt-5 text-left">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DrawerTitle className="font-sans text-xl font-bold uppercase tracking-[0.08em]">Atlas Peta</DrawerTitle>
              <DrawerDescription className="sr-only">
                Panel atlas peta untuk layer polygon, informasi simbol, pencarian wilayah, dan basemap.
              </DrawerDescription>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Layer polygon, informasi warna, dan pencarian publik dalam satu drawer.
              </p>
            </div>
            <Button type="button" variant="outline" size="icon" aria-label="Tutup" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DrawerHeader>

        <div className="px-4 pb-3">
          <Tabs defaultValue="map" className="flex flex-col">
            <TabsList className="grid h-auto w-full grid-cols-3 rounded-[20px] bg-muted/60 p-1">
              {MAP_ATLAS_PANEL_TABS.map((tab) => (
                <TabsTrigger key={tab.id} value={tab.id} className="rounded-[16px] py-2 text-sm font-semibold">
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <ScrollArea className="mt-4 max-h-[68vh]">
              <div className="space-y-4 pb-6">
                <TabsContent value="map" className="mt-0 space-y-4">
                  <MapBoundaryLayerControls
                    layerState={safeBoundaryLayerState}
                    kecamatanId={kecamatanId}
                    zoom={boundaryLayerZoom}
                    onVisibilityChange={onBoundaryLayerVisibilityChange}
                    onOpacityChange={onBoundaryLayerOpacityChange}
                  />

                  <div className="space-y-3 rounded-[24px] bg-background p-4 shadow-card">
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Basemap</p>
                    <MapBasemapButtonList value={baseMap} onValueChange={onBaseMapChange} />
                  </div>
                </TabsContent>

                <TabsContent value="info" className="mt-0 space-y-4">
                  <div className="space-y-3 rounded-[24px] bg-background p-4 shadow-card">
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Status Viewport</p>
                    {isViewportQueryActive ? (
                      <div className="flex flex-wrap gap-2">
                        <Badge className="bg-[#2d3436] text-white">
                          {totalInView} {viewportLabel}
                        </Badge>
                        <Badge variant="secondary">{markerCount} marker</Badge>
                        {isCapped ? <Badge className="bg-primary text-primary-foreground">capped</Badge> : null}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed border-border/80 bg-muted/30 px-3 py-2 text-sm leading-6 text-muted-foreground">
                        Cari OP / NOPD / alamat atau pilih filter untuk memuat marker objek pajak.
                      </div>
                    )}
                  </div>

                  <MapBoundaryLegendPanel layerState={safeBoundaryLayerState} visibleFeatures={boundaryLegendFeatures} />
                </TabsContent>

                <TabsContent value="search" className="mt-0 space-y-4">
                  <div className="space-y-3 rounded-[24px] bg-background p-4 shadow-card">
                    <div className="relative">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        value={searchQuery}
                        onChange={(event) => onSearchQueryChange(event.target.value)}
                        placeholder="Cari nama OP / NOPD / alamat"
                        className="pl-9"
                      />
                    </div>

                    <Select value={kecamatanId} onValueChange={onKecamatanIdChange}>
                      <SelectTrigger className="font-mono text-xs">
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

                    <Select value={rekPajakId} onValueChange={onRekPajakIdChange}>
                      <SelectTrigger className="font-mono text-xs">
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

                    <Link href="/backoffice">
                      <Button className="w-full font-mono text-xs">
                        <Settings className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
                        Backoffice
                      </Button>
                    </Link>
                  </div>
                </TabsContent>
              </div>
            </ScrollArea>
          </Tabs>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
