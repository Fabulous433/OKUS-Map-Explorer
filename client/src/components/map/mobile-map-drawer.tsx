import { Link } from "wouter";
import { Search, Settings, X } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BaseMapKey } from "@/lib/map/map-basemap-config";
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
};

const LEGEND_ITEMS = [
  { label: "MKN", tone: "bg-primary text-white" },
  { label: "HTL", tone: "bg-[#2563EB] text-white" },
  { label: "PKR", tone: "bg-[#16A34A] text-white" },
  { label: "HBR", tone: "bg-[#DB2777] text-white" },
  { label: "LST", tone: "bg-[#EA580C] text-white" },
  { label: "RKL", tone: "bg-[#9333EA] text-white" },
  { label: "AIR", tone: "bg-[#0891B2] text-white" },
  { label: "WLT", tone: "bg-[#78716C] text-white" },
  { label: "MBLB", tone: "bg-[#57534E] text-white" },
] as const;

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
}: MobileMapDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-xl bg-background">
        <DrawerHeader className="px-4 pb-4 pt-5 text-left">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DrawerTitle className="font-sans text-xl font-bold uppercase tracking-[0.08em]">
                Filter Peta
              </DrawerTitle>
              <DrawerDescription className="sr-only">
                Panel filter peta untuk pencarian, wilayah, rekening pajak, basemap, dan legenda marker.
              </DrawerDescription>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                Search, wilayah, rekening, dan legenda
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              aria-label="Tutup"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DrawerHeader>

        <div className="max-h-[72vh] space-y-4 overflow-y-auto px-4 py-4">
          <div className="space-y-3 rounded-xl bg-background p-4 shadow-card">
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

          <div className="space-y-3 rounded-xl bg-background p-4 shadow-card">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Status Viewport</p>
            {isViewportQueryActive ? (
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-[#2d3436] text-white">
                  {totalInView} {viewportLabel}
                </Badge>
                <Badge variant="secondary">
                  {markerCount} marker
                </Badge>
                {isCapped ? (
                  <Badge className="bg-primary text-primary-foreground">
                    capped
                  </Badge>
                ) : null}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border/80 bg-muted/30 px-3 py-2 font-mono text-[11px] text-muted-foreground">
                Cari OP / NOPD / alamat atau pilih filter untuk memuat marker objek pajak.
              </div>
            )}
          </div>

          <div className="space-y-3 rounded-xl bg-background p-4 shadow-card">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Basemap</p>
            <MapBasemapButtonList value={baseMap} onValueChange={onBaseMapChange} />
          </div>

          <div className="space-y-3 rounded-xl bg-background p-4 shadow-card">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Legenda</p>
            <div className="flex flex-wrap gap-2">
              {LEGEND_ITEMS.map((item) => (
                <Badge
                  key={item.label}
                  className={`${item.tone}`}
                >
                  {item.label}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
