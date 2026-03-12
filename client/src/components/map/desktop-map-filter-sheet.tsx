import { Search } from "lucide-react";
import { MapBasemapButtonList } from "@/components/map/map-basemap-button-list";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { BaseMapKey } from "@/lib/map/map-basemap-config";
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
}: DesktopMapFilterSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[320px] p-0 sm:max-w-[320px]">
        <SheetHeader className="border-b border-border/70 px-5 py-5">
          <SheetTitle className="font-sans text-xl font-bold uppercase tracking-[0.08em]">Filter Peta</SheetTitle>
          <SheetDescription className="font-mono text-[11px] uppercase tracking-[0.16em]">
            Search, wilayah, rekening, dan basemap
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-5 py-5">
          <div className="space-y-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Pencarian</p>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchQuery}
                onChange={(event) => onSearchQueryChange(event.target.value)}
                placeholder="Cari nama OP / NOPD / alamat"
                className="pl-9"
              />
            </div>
          </div>

          <div className="space-y-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Wilayah</p>
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
          </div>

          <div className="space-y-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Rekening Pajak</p>
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
          </div>

          <div className="space-y-3 border-t border-border/70 pt-5">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Basemap</p>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground">Pilih layer peta langsung tanpa dropdown.</p>
            </div>
            <MapBasemapButtonList value={baseMap} onValueChange={onBaseMapChange} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
