import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { Filter, Layers, Loader2, MapPin, Search, Settings, Target } from "lucide-react";
import L from "leaflet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MobileMapDrawer } from "@/components/map/mobile-map-drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { getQueryFn } from "@/lib/queryClient";
import type { MapObjekPajakItem, MasterKecamatan, MasterRekeningPajak } from "@shared/schema";
import "leaflet/dist/leaflet.css";

const OKU_SELATAN_CENTER: [number, number] = [-4.525, 104.027];
const DEFAULT_ZOOM = 13;

const BASE_MAPS = {
  osm: {
    name: "OpenStreetMap",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
  carto: {
    name: "CartoDB Positron",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
  },
  esri: {
    name: "ESRI Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri",
    maxZoom: 18,
  },
} as const;

type BaseMapKey = keyof typeof BASE_MAPS;

type Bbox = {
  minLng: number;
  minLat: number;
  maxLng: number;
  maxLat: number;
};

type MapResponse = {
  items: MapObjekPajakItem[];
  meta: {
    totalInView: number;
    isCapped: boolean;
  };
};

function buildMarkerIcon(jenisPajak: string) {
  const palette = [
    { key: "Makanan", color: "#FF6B00", label: "MKN" },
    { key: "Perhotelan", color: "#2563EB", label: "HTL" },
    { key: "Parkir", color: "#16A34A", label: "PKR" },
    { key: "Hiburan", color: "#DB2777", label: "HBR" },
    { key: "Kesenian", color: "#DB2777", label: "HBR" },
    { key: "Listrik", color: "#EA580C", label: "LST" },
    { key: "Reklame", color: "#9333EA", label: "RKL" },
    { key: "Air Tanah", color: "#0891B2", label: "AIR" },
    { key: "Walet", color: "#78716C", label: "WLT" },
    { key: "MBLB", color: "#57534E", label: "MBL" },
  ];
  const selected = palette.find((item) => jenisPajak.includes(item.key)) ?? { color: "#111827", label: "OP" };

  return new L.DivIcon({
    className: "custom-op-marker",
    html: `<div style="width:38px;height:38px;border-radius:8px;background:#e0e5ec;display:flex;align-items:center;justify-content:center;box-shadow:3px 3px 6px #babecc,-3px -3px 6px #fff;">
      <span style="font-family:'JetBrains Mono',monospace;font-size:10px;font-weight:700;letter-spacing:0.5px;color:${selected.color}">${selected.label}</span>
    </div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 38],
    popupAnchor: [0, -30],
  });
}

function formatCurrency(value: string | null) {
  if (!value) return "-";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(numeric);
}

function MapViewportTracker(props: { onChange: (bbox: Bbox, zoom: number) => void }) {
  const map = useMap();

  useMapEvents({
    moveend: () => {
      const bounds = map.getBounds();
      props.onChange(
        {
          minLng: bounds.getWest(),
          minLat: bounds.getSouth(),
          maxLng: bounds.getEast(),
          maxLat: bounds.getNorth(),
        },
        map.getZoom(),
      );
    },
    zoomend: () => {
      const bounds = map.getBounds();
      props.onChange(
        {
          minLng: bounds.getWest(),
          minLat: bounds.getSouth(),
          maxLng: bounds.getEast(),
          maxLat: bounds.getNorth(),
        },
        map.getZoom(),
      );
    },
  });

  return null;
}

function MapTopRightControls(props: { isFetching: boolean; isMobile: boolean }) {
  const map = useMap();
  return (
    <div className={`absolute z-[1000] flex gap-2 ${props.isMobile ? "right-3 top-16" : "right-4 top-4"}`}>
      <Button
        size="icon"
        variant="outline"
        className="rounded-lg bg-background shadow-card"
        onClick={() => map.flyTo(OKU_SELATAN_CENTER, DEFAULT_ZOOM, { duration: 0.7 })}
        title="Reset view"
        aria-label="Reset view"
      >
        <Target className="w-4 h-4" />
      </Button>
      {props.isFetching && (
        <div className="flex items-center gap-2 rounded-lg bg-background px-3 py-2 font-mono text-xs shadow-card">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          memuat viewport
        </div>
      )}
    </div>
  );
}

export default function MapPage() {
  const isMobile = useIsMobile();
  const [baseMap, setBaseMap] = useState<BaseMapKey>("osm");
  const [searchQuery, setSearchQuery] = useState("");
  const [kecamatanId, setKecamatanId] = useState("all");
  const [rekPajakId, setRekPajakId] = useState("all");
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [bbox, setBbox] = useState<Bbox | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const debouncedSearch = useDebouncedValue(searchQuery, 300);
  const debouncedBbox = useDebouncedValue(bbox, 250);

  const mapQueryUrl = useMemo(() => {
    if (!debouncedBbox) return null;
    const params = new URLSearchParams();
    params.set(
      "bbox",
      `${debouncedBbox.minLng},${debouncedBbox.minLat},${debouncedBbox.maxLng},${debouncedBbox.maxLat}`,
    );
    params.set("zoom", String(zoom));
    params.set("limit", "500");
    if (debouncedSearch) params.set("q", debouncedSearch);
    if (kecamatanId !== "all") params.set("kecamatanId", kecamatanId);
    if (rekPajakId !== "all") params.set("rekPajakId", rekPajakId);
    return `/api/objek-pajak/map?${params.toString()}`;
  }, [debouncedBbox, debouncedSearch, kecamatanId, rekPajakId, zoom]);

  const { data: mapData, isFetching, error } = useQuery<MapResponse>({
    queryKey: [mapQueryUrl ?? "/api/objek-pajak/map?empty=true"],
    enabled: mapQueryUrl !== null,
    placeholderData: keepPreviousData,
    queryFn: async ({ queryKey, signal }) => {
      const response = await fetch(queryKey[0] as string, { credentials: "include", signal });
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Gagal memuat data peta");
      }
      return (await response.json()) as MapResponse;
    },
  });

  const markerList = mapData?.items ?? [];
  const totalInView = mapData?.meta.totalInView ?? 0;
  const isCapped = mapData?.meta.isCapped ?? false;

  const { data: kecamatanData } = useQuery<MasterKecamatan[] | null>({
    queryKey: ["/api/master/kecamatan"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  const { data: rekeningData } = useQuery<MasterRekeningPajak[] | null>({
    queryKey: ["/api/master/rekening-pajak"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  const kecamatanList = kecamatanData ?? [];
  const rekeningList = rekeningData ?? [];

  const mapConfig = BASE_MAPS[baseMap];

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background" data-testid="map-page">
      {isMobile ? (
        <>
          <div className="absolute left-3 right-3 top-3 z-[1000] flex items-start justify-between gap-3">
            <div className="rounded-xl bg-background px-4 py-3 shadow-floating">
              <h1 className="font-sans text-lg font-bold leading-none">PETA OP</h1>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Viewport Query</p>
            </div>
            <Link href="/backoffice">
              <Button className="font-mono text-[11px]">
                <Settings className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
                Backoffice
              </Button>
            </Link>
          </div>

          <div className="absolute bottom-20 left-3 z-[1000] flex max-w-[70vw] flex-wrap gap-2">
            <Badge className="bg-[#2d3436] text-white">
              {totalInView} viewport
            </Badge>
            <Badge variant="secondary">
              {markerList.length} marker
            </Badge>
            {isCapped ? (
              <Badge className="bg-primary text-primary-foreground">
                capped
              </Badge>
            ) : null}
          </div>

          <Button
            type="button"
            className="absolute bottom-20 right-3 z-[1000] px-4 py-6 font-mono text-xs font-bold shadow-floating"
            variant="outline"
            onClick={() => setIsDrawerOpen(true)}
          >
            <Filter className="mr-2 h-4 w-4" aria-hidden="true" />
            Filter
          </Button>

          <MobileMapDrawer
            open={isDrawerOpen}
            onOpenChange={setIsDrawerOpen}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            kecamatanId={kecamatanId}
            onKecamatanIdChange={setKecamatanId}
            rekPajakId={rekPajakId}
            onRekPajakIdChange={setRekPajakId}
            baseMap={baseMap}
            onBaseMapChange={setBaseMap}
            kecamatanList={kecamatanList}
            rekeningList={rekeningList}
            totalInView={totalInView}
            markerCount={markerList.length}
            isCapped={isCapped}
          />
        </>
      ) : (
        <>
          <div className="absolute left-4 top-4 z-[1000] w-[360px] max-w-[calc(100vw-2rem)] space-y-3">
            <div className="rounded-xl bg-background p-4 shadow-floating">
              <h1 className="font-sans text-xl font-bold leading-none">PETA OBJEK PAJAK</h1>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Viewport Query Mode
              </p>
            </div>

            <div className="space-y-2 rounded-xl bg-background p-4 shadow-card">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Cari nama OP / NOPD / alamat"
                  className="pl-9"
                />
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Select value={kecamatanId} onValueChange={setKecamatanId}>
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
                <Select value={rekPajakId} onValueChange={setRekPajakId}>
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
              <div className="grid grid-cols-2 gap-2">
                <Select value={baseMap} onValueChange={(value) => setBaseMap(value as BaseMapKey)}>
                  <SelectTrigger className="font-mono text-xs">
                    <Layers className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(BASE_MAPS) as BaseMapKey[]).map((key) => (
                      <SelectItem key={key} value={key}>
                        {BASE_MAPS[key].name}
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
            </div>
          </div>

          <div className="absolute bottom-4 right-4 z-[1000] flex gap-2">
            <Badge className="bg-[#2d3436] text-white">
              {totalInView} dalam viewport
            </Badge>
            <Badge variant="secondary">
              {markerList.length} marker
            </Badge>
            {isCapped && (
              <Badge className="bg-primary text-primary-foreground">
                capped
              </Badge>
            )}
          </div>
        </>
      )}

      <MapContainer center={OKU_SELATAN_CENTER} zoom={DEFAULT_ZOOM} className="h-full w-full" zoomControl={false}>
        <TileLayer attribution={mapConfig.attribution} url={mapConfig.url} maxZoom={mapConfig.maxZoom} />
        <MapViewportTracker
          onChange={(nextBbox, nextZoom) => {
            setBbox(nextBbox);
            setZoom(nextZoom);
          }}
        />
        <MapTopRightControls isFetching={isFetching} isMobile={isMobile} />

        {markerList.map((item) => (
          <Marker
            key={item.id}
            position={[item.latitude, item.longitude]}
            icon={buildMarkerIcon(item.jenisPajak)}
          >
            <Popup>
              <div className="min-w-[180px] space-y-1 font-mono text-xs">
                <p className="font-bold">{item.namaOp}</p>
                <p className="text-[11px] text-gray-600">{item.jenisPajak}</p>
                <p>NOPD: {item.nopd}</p>
                <p>{item.alamatOp}</p>
                <p className="font-bold">{formatCurrency(item.pajakBulanan)} / bulan</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {error && (
        <div className="absolute bottom-4 left-4 z-[1000] max-w-[440px] rounded-lg bg-red-100 p-3 font-mono text-xs text-red-800 shadow-card">
          {error instanceof Error ? error.message : "Terjadi kesalahan saat memuat peta"}
        </div>
      )}

      {!error && !isFetching && markerList.length === 0 && bbox && (
        <div className="absolute bottom-4 left-4 z-[1000] rounded-lg bg-background p-3 font-mono text-xs shadow-card">
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            Tidak ada objek pajak pada viewport ini.
          </div>
        </div>
      )}
    </div>
  );
}
