import { Link } from "wouter";
import { Layers, Search, Settings, X } from "lucide-react";
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
import type { MasterKecamatan, MasterRekeningPajak } from "@shared/schema";

type BaseMapKey = "osm" | "carto" | "esri";

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
  markerCount: number;
  isCapped: boolean;
};

const BASE_MAP_LABELS: Record<BaseMapKey, string> = {
  osm: "OpenStreetMap",
  carto: "CartoDB Positron",
  esri: "ESRI Satellite",
};

const LEGEND_ITEMS = [
  { label: "MKN", tone: "bg-[#FF6B00] text-white" },
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
  markerCount,
  isCapped,
}: MobileMapDrawerProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-none border-[4px] border-black bg-[#fffdf6]">
        <DrawerHeader className="border-b-[3px] border-black px-4 pb-4 pt-5 text-left">
          <div className="flex items-start justify-between gap-3">
            <div>
              <DrawerTitle className="font-serif text-xl font-black uppercase tracking-[0.08em] text-black">
                Filter Peta
              </DrawerTitle>
              <DrawerDescription className="sr-only">
                Panel filter peta untuk pencarian, wilayah, rekening pajak, basemap, dan legenda marker.
              </DrawerDescription>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-black/55">
                Search, wilayah, rekening, dan legenda
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="h-10 w-10 rounded-none border-[2px] border-black bg-white p-0"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DrawerHeader>

        <div className="max-h-[72vh] space-y-4 overflow-y-auto px-4 py-4">
          <div className="space-y-3 border-[3px] border-black bg-white p-4 shadow-[4px_4px_0_0_rgba(0,0,0,0.08)]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-black" />
              <Input
                value={searchQuery}
                onChange={(event) => onSearchQueryChange(event.target.value)}
                placeholder="Cari nama OP / NOPD / alamat"
                className="rounded-none border-[2px] border-black pl-9 font-mono text-xs"
              />
            </div>

            <Select value={kecamatanId} onValueChange={onKecamatanIdChange}>
              <SelectTrigger className="rounded-none border-[2px] border-black font-mono text-xs">
                <SelectValue placeholder="Kecamatan" />
              </SelectTrigger>
              <SelectContent className="rounded-none border-[2px] border-black">
                <SelectItem value="all">Semua Kecamatan</SelectItem>
                {kecamatanList.map((item) => (
                  <SelectItem key={item.cpmKecId} value={item.cpmKecId}>
                    {item.cpmKecamatan}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={rekPajakId} onValueChange={onRekPajakIdChange}>
              <SelectTrigger className="rounded-none border-[2px] border-black font-mono text-xs">
                <SelectValue placeholder="Rekening Pajak" />
              </SelectTrigger>
              <SelectContent className="rounded-none border-[2px] border-black">
                <SelectItem value="all">Semua Rekening</SelectItem>
                {rekeningList.map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {item.kodeRekening}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={baseMap} onValueChange={(value) => onBaseMapChange(value as BaseMapKey)}>
              <SelectTrigger className="rounded-none border-[2px] border-black font-mono text-xs">
                <Layers className="mr-2 h-3.5 w-3.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-none border-[2px] border-black">
                {Object.entries(BASE_MAP_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Link href="/backoffice">
              <Button className="w-full rounded-none border-[2px] border-black bg-black font-mono text-xs text-[#FFFF00] no-default-hover-elevate no-default-active-elevate">
                <Settings className="mr-2 h-3.5 w-3.5" />
                Backoffice
              </Button>
            </Link>
          </div>

          <div className="space-y-3 border-[3px] border-black bg-white p-4 shadow-[4px_4px_0_0_rgba(0,0,0,0.08)]">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-black/55">Status Viewport</p>
            <div className="flex flex-wrap gap-2">
              <Badge className="rounded-none border-[2px] border-black bg-black px-3 py-1 font-mono text-[10px] text-[#FFFF00]">
                {totalInView} dalam viewport
              </Badge>
              <Badge className="rounded-none border-[2px] border-black bg-[#FFFF00] px-3 py-1 font-mono text-[10px] text-black">
                {markerCount} marker
              </Badge>
              {isCapped ? (
                <Badge className="rounded-none border-[2px] border-black bg-[#FF6B00] px-3 py-1 font-mono text-[10px] text-white">
                  capped
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="space-y-3 border-[3px] border-black bg-white p-4 shadow-[4px_4px_0_0_rgba(0,0,0,0.08)]">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-black/55">Legenda</p>
            <div className="flex flex-wrap gap-2">
              {LEGEND_ITEMS.map((item) => (
                <Badge
                  key={item.label}
                  className={`rounded-none border-[2px] border-black px-3 py-1 font-mono text-[10px] ${item.tone}`}
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
