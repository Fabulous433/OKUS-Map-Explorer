import { Building2, MapPinned, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { PublicMapRegionJumpGroup, PublicMapRegionJumpItem } from "@/lib/map/public-map-region-search";

type PublicMapRegionJumpProps = {
  compactViewport: boolean;
  groups: PublicMapRegionJumpGroup[];
  open: boolean;
  query: string;
  selectedKecamatanName: string | null;
  onOpenChange: (open: boolean) => void;
  onQueryChange: (query: string) => void;
  onSelect: (item: PublicMapRegionJumpItem) => void;
};

function createEmptyCopy(params: { query: string; selectedKecamatanName: string | null }) {
  if (!params.query.trim()) {
    return params.selectedKecamatanName
      ? `Cari kecamatan lain atau desa di ${params.selectedKecamatanName}`
      : "Cari kecamatan tujuan untuk masuk lebih cepat";
  }

  if (!params.selectedKecamatanName) {
    return "Belum ada hasil. Desa baru bisa dicari setelah masuk ke kecamatan.";
  }

  return `Tidak ada hasil yang cocok di ${params.selectedKecamatanName}.`;
}

function createTriggerLabel(selectedKecamatanName: string | null, compactViewport: boolean) {
  if (compactViewport) {
    return selectedKecamatanName ? "Cari wilayah" : "Cari kecamatan";
  }

  return selectedKecamatanName ? "Cari kecamatan atau desa" : "Cari kecamatan";
}

function RegionJumpCommand(props: Omit<PublicMapRegionJumpProps, "compactViewport" | "open" | "onOpenChange">) {
  const showHelper = !props.query.trim();
  const hasResults = props.groups.length > 0;

  return (
    <div className="rounded-[24px] bg-transparent">
      <div className="flex items-center border-b border-slate-200 px-4">
        <Search className="mr-2 h-4 w-4 shrink-0 text-slate-500" aria-hidden="true" />
        <input
          value={props.query}
          onChange={(event) => props.onQueryChange(event.target.value)}
          autoFocus
          placeholder={props.selectedKecamatanName ? "Cari kecamatan atau desa" : "Cari kecamatan"}
          className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-slate-400"
        />
      </div>

      {showHelper ? (
        <div className="space-y-2 px-4 py-4">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-slate-500">Quick Jump Wilayah</p>
          <p className="text-sm leading-6 text-slate-700">Cari kecamatan atau desa untuk masuk langsung ke wilayah tujuan.</p>
          {props.selectedKecamatanName ? (
            <p className="rounded-2xl bg-slate-100/80 px-3 py-2 text-xs text-slate-600">
              Desa yang bisa dicari saat ini berasal dari kecamatan <span className="font-semibold text-slate-900">{props.selectedKecamatanName}</span>.
            </p>
          ) : (
            <p className="rounded-2xl bg-slate-100/80 px-3 py-2 text-xs text-slate-600">
              Mulai dari nama kecamatan. Setelah masuk ke kecamatan, pencarian desa akan ikut aktif.
            </p>
          )}
        </div>
      ) : null}

      {!showHelper && !hasResults ? (
        <div className="px-4 py-6 text-left text-sm text-slate-600">
          {createEmptyCopy({
            query: props.query,
            selectedKecamatanName: props.selectedKecamatanName,
          })}
        </div>
      ) : null}

      {hasResults ? (
        <div className="max-h-[min(22rem,55vh)] space-y-3 overflow-y-auto px-2 pb-2 pt-2">
          {props.groups.map((group) => (
            <section key={group.group} className="space-y-1">
              <p className="px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-slate-500">{group.group}</p>

              {group.items.map((item) => (
                <button
                  key={`${item.type}:${item.desaKey ?? item.kecamatanId}`}
                  type="button"
                  className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left hover:bg-slate-100/80"
                  data-testid={`public-map-region-jump-item-${item.type}-${item.desaKey ?? item.kecamatanId}`}
                  onClick={() => props.onSelect(item)}
                >
                  <span className="mt-0.5 rounded-xl bg-slate-100 p-2 text-slate-700">
                    {item.type === "kecamatan" ? <Building2 className="h-4 w-4" aria-hidden="true" /> : <MapPinned className="h-4 w-4" aria-hidden="true" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-semibold text-slate-900">{item.label}</span>
                    <span className="block truncate text-xs text-slate-500">
                      {item.type === "kecamatan" ? "Masuk ke tahap kecamatan" : item.parentLabel}
                    </span>
                  </span>
                </button>
              ))}
            </section>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function PublicMapRegionJump(props: PublicMapRegionJumpProps) {
  const trigger = (
    <Button
      type="button"
      variant="outline"
      className="h-auto min-h-11 justify-start rounded-[22px] border-white/70 bg-white/90 px-4 py-3 text-left shadow-[0_18px_45px_rgba(15,23,42,0.14)] backdrop-blur-md"
      data-testid="public-map-region-jump-trigger"
      onClick={() => props.onOpenChange(true)}
    >
      <Search className="h-4 w-4 shrink-0 text-slate-700" aria-hidden="true" />
      <span className="min-w-0">
        <span className="block truncate font-mono text-[10px] uppercase tracking-[0.18em] text-slate-500">Quick Jump</span>
        <span className="block truncate text-sm font-semibold text-slate-900">
          {createTriggerLabel(props.selectedKecamatanName, props.compactViewport)}
        </span>
      </span>
    </Button>
  );

  if (props.compactViewport) {
    return (
      <Sheet open={props.open} onOpenChange={props.onOpenChange}>
        <div className="w-full max-w-[min(92vw,22rem)]">{trigger}</div>
        <SheetContent
          side="bottom"
          className="z-[1200] rounded-t-[28px] border-white/60 bg-[linear-gradient(180deg,rgba(248,250,252,0.98)_0%,rgba(239,244,248,0.96)_100%)] px-0 pb-0 pt-4"
        >
          <SheetHeader className="px-4 pb-2 text-left">
            <SheetTitle className="font-sans text-xl font-black text-slate-950">Cari wilayah</SheetTitle>
            <SheetDescription className="text-sm leading-6 text-slate-600">
              Masuk langsung ke kecamatan atau desa yang ingin dibuka.
            </SheetDescription>
          </SheetHeader>

          <RegionJumpCommand
            groups={props.groups}
            query={props.query}
            selectedKecamatanName={props.selectedKecamatanName}
            onQueryChange={props.onQueryChange}
            onSelect={props.onSelect}
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Popover open={props.open} onOpenChange={props.onOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        align="start"
        side="bottom"
        sideOffset={12}
        className="z-[1200] w-[min(30rem,calc(100vw-2rem))] rounded-[28px] border-white/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.98)_0%,rgba(239,244,248,0.96)_100%)] p-0 shadow-[0_24px_55px_rgba(15,23,42,0.18)]"
      >
        <RegionJumpCommand
          groups={props.groups}
          query={props.query}
          selectedKecamatanName={props.selectedKecamatanName}
          onQueryChange={props.onQueryChange}
          onSelect={props.onSelect}
        />
      </PopoverContent>
    </Popover>
  );
}
