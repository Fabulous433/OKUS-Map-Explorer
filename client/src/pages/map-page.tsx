import { useState, useEffect, useCallback, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { Loader2, MapPin, Search, ZoomIn, ZoomOut, Crosshair, Layers, Users, Building2, Info, X, ExternalLink, Navigation, Star, Tag, DollarSign, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import type { WikiLandmark, WajibPajak, ObjekPajak } from "@shared/schema";
import "leaflet/dist/leaflet.css";

const OKU_SELATAN_CENTER: [number, number] = [-4.5250, 104.0270];
const DEFAULT_ZOOM = 14;

const BASE_MAPS = {
  osm: {
    name: "OpenStreetMap",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
  esri: {
    name: "ESRI Satellite",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: '&copy; <a href="https://www.esri.com">Esri</a>, Maxar, Earthstar Geographics',
    maxZoom: 18,
  },
  cartodb: {
    name: "CartoDB Positron",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
  },
} as const;

type BaseMapKey = keyof typeof BASE_MAPS;

const landmarkIcon = new L.DivIcon({
  className: "landmark-marker",
  html: `<div style="width:32px;height:32px;background:#FFFF00;border:3px solid #000;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:14px;font-family:'Space Grotesk',sans-serif;">W</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const wpIcon = new L.DivIcon({
  className: "wp-marker",
  html: `<div style="width:32px;height:32px;background:#FF6B00;border:3px solid #000;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:12px;color:#fff;font-family:'Space Grotesk',sans-serif;">WP</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

const opIcon = new L.DivIcon({
  className: "op-marker",
  html: `<div style="width:32px;height:32px;background:#000;border:3px solid #FFFF00;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:12px;color:#FFFF00;font-family:'Space Grotesk',sans-serif;">OP</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

function MapEventHandler({ onBoundsChange }: { onBoundsChange: (bounds: L.LatLngBounds) => void }) {
  const map = useMapEvents({
    moveend: () => {
      onBoundsChange(map.getBounds());
    },
    zoomend: () => {
      onBoundsChange(map.getBounds());
    },
  });

  useEffect(() => {
    onBoundsChange(map.getBounds());
  }, []);

  return null;
}

function FlyToHandler({ lat, lng, zoom }: { lat: number | null; lng: number | null; zoom: number }) {
  const map = useMap();
  const lastCoords = useRef<string | null>(null);

  useEffect(() => {
    if (lat !== null && lng !== null) {
      const coordKey = `${lat},${lng},${zoom}`;
      if (lastCoords.current !== coordKey) {
        lastCoords.current = coordKey;
        setTimeout(() => {
          map.flyTo([lat, lng], zoom, { duration: 1.5 });
        }, 500);
      }
    }
  }, [lat, lng, zoom, map]);

  return null;
}

function MapControls() {
  const map = useMap();

  return (
    <div className="absolute top-4 right-4 z-[1000] flex flex-col gap-2" data-testid="map-controls">
      <Button
        size="icon"
        variant="outline"
        className="bg-white border-[3px] border-black rounded-none w-10 h-10 no-default-hover-elevate no-default-active-elevate"
        onClick={() => map.zoomIn()}
        data-testid="button-zoom-in"
      >
        <ZoomIn className="w-5 h-5 text-black" />
      </Button>
      <Button
        size="icon"
        variant="outline"
        className="bg-white border-[3px] border-black rounded-none w-10 h-10 no-default-hover-elevate no-default-active-elevate"
        onClick={() => map.zoomOut()}
        data-testid="button-zoom-out"
      >
        <ZoomOut className="w-5 h-5 text-black" />
      </Button>
      <Button
        size="icon"
        variant="outline"
        className="bg-white border-[3px] border-black rounded-none w-10 h-10 no-default-hover-elevate no-default-active-elevate"
        onClick={() => map.setView(OKU_SELATAN_CENTER, DEFAULT_ZOOM)}
        data-testid="button-reset-view"
      >
        <Crosshair className="w-5 h-5 text-black" />
      </Button>
    </div>
  );
}

function BaseMapSwitcher({ activeMap, onChange }: { activeMap: BaseMapKey; onChange: (key: BaseMapKey) => void }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="absolute top-4 right-16 z-[1000]" data-testid="basemap-switcher">
      <Button
        size="icon"
        variant="outline"
        className="bg-white border-[3px] border-black rounded-none w-10 h-10 no-default-hover-elevate no-default-active-elevate"
        onClick={() => setIsOpen(!isOpen)}
        data-testid="button-basemap-toggle"
      >
        <Layers className="w-5 h-5 text-black" />
      </Button>
      {isOpen && (
        <div className="absolute top-12 right-0 bg-white border-[3px] border-black p-3 min-w-[200px]" data-testid="basemap-options">
          <div className="flex items-center gap-2 mb-3 pb-2 border-b-[2px] border-black">
            <Layers className="w-4 h-4 text-black" />
            <span className="font-mono text-xs font-bold text-black">BASE MAP</span>
          </div>
          {(Object.keys(BASE_MAPS) as BaseMapKey[]).map((key) => (
            <label
              key={key}
              className="flex items-center gap-2 py-1.5 cursor-pointer"
              data-testid={`basemap-option-${key}`}
            >
              <input
                type="radio"
                name="basemap"
                checked={activeMap === key}
                onChange={() => {
                  onChange(key);
                  setIsOpen(false);
                }}
                className="accent-black w-4 h-4"
              />
              <span className="font-mono text-xs text-black">{BASE_MAPS[key].name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

function LandmarkDetail({ landmark, onClose }: { landmark: WikiLandmark; onClose: () => void }) {
  return (
    <div
      className="absolute bottom-4 left-4 z-[1000] w-[380px] max-w-[calc(100vw-2rem)] bg-white border-[4px] border-black"
      data-testid="landmark-detail"
    >
      <div className="flex items-start justify-between gap-2 p-4 border-b-[3px] border-black bg-[#FFFF00]">
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="w-5 h-5 flex-shrink-0 text-black" />
          <h3 className="font-serif text-lg font-black text-black truncate" data-testid="text-landmark-title">
            {landmark.title}
          </h3>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="flex-shrink-0 w-8 h-8 rounded-none no-default-hover-elevate no-default-active-elevate"
          onClick={onClose}
          data-testid="button-close-detail"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      {landmark.thumbnail && (
        <div className="border-b-[3px] border-black">
          <img
            src={landmark.thumbnail}
            alt={landmark.title}
            className="w-full h-48 object-cover"
            data-testid="img-landmark-thumbnail"
          />
        </div>
      )}
      <div className="p-4 space-y-3">
        {landmark.extract && (
          <p className="text-sm font-mono leading-relaxed text-black" data-testid="text-landmark-extract">
            {landmark.extract}
          </p>
        )}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge className="rounded-none border-[2px] border-black bg-black text-white font-mono text-xs">
            {landmark.lat.toFixed(4)}, {landmark.lon.toFixed(4)}
          </Badge>
          {landmark.dist !== undefined && (
            <Badge className="rounded-none border-[2px] border-black bg-[#FFFF00] text-black font-mono text-xs">
              {(landmark.dist / 1000).toFixed(1)} km
            </Badge>
          )}
        </div>
        <a
          href={`https://en.wikipedia.org/?curid=${landmark.pageid}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-mono font-bold text-black underline decoration-[2px] underline-offset-4"
          data-testid="link-wikipedia"
        >
          Wikipedia <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </div>
  );
}

export default function MapPage() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const focusLat = params.get("lat") ? parseFloat(params.get("lat")!) : null;
  const focusLng = params.get("lng") ? parseFloat(params.get("lng")!) : null;
  const focusZoom = params.get("zoom") ? parseInt(params.get("zoom")!) : 17;

  const [bounds, setBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
  const [selectedLandmark, setSelectedLandmark] = useState<WikiLandmark | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showLayers, setShowLayers] = useState({ landmarks: true, wp: true, op: true });
  const [sidePanel, setSidePanel] = useState<"none" | "wp" | "op">("none");
  const [activeBaseMap, setActiveBaseMap] = useState<BaseMapKey>("osm");
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const [debouncedBounds, setDebouncedBounds] = useState(bounds);

  const handleBoundsChange = useCallback((newBounds: L.LatLngBounds) => {
    const b = {
      north: newBounds.getNorth(),
      south: newBounds.getSouth(),
      east: newBounds.getEast(),
      west: newBounds.getWest(),
    };
    setBounds(b);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedBounds(b);
    }, 500);
  }, []);

  const { data: landmarks = [], isLoading: landmarksLoading } = useQuery<WikiLandmark[]>({
    queryKey: ["/api/landmarks", debouncedBounds?.north, debouncedBounds?.south, debouncedBounds?.east, debouncedBounds?.west],
    queryFn: async () => {
      if (!debouncedBounds) return [];
      const params = new URLSearchParams({
        north: debouncedBounds.north.toString(),
        south: debouncedBounds.south.toString(),
        east: debouncedBounds.east.toString(),
        west: debouncedBounds.west.toString(),
      });
      const res = await fetch(`/api/landmarks?${params}`);
      if (!res.ok) throw new Error("Failed to fetch landmarks");
      return res.json();
    },
    enabled: !!debouncedBounds && showLayers.landmarks,
  });

  const { data: wpList = [] } = useQuery<WajibPajak[]>({
    queryKey: ["/api/wajib-pajak"],
    enabled: showLayers.wp,
  });

  const { data: opList = [] } = useQuery<ObjekPajak[]>({
    queryKey: ["/api/objek-pajak"],
    enabled: showLayers.op,
  });

  const filteredLandmarks = searchQuery
    ? landmarks.filter((l) => l.title.toLowerCase().includes(searchQuery.toLowerCase()))
    : landmarks;

  const currentBaseMap = BASE_MAPS[activeBaseMap];

  const jenisPajakColor = (jenis: string) => {
    if (jenis.includes("Makanan")) return "bg-[#FF6B00] text-white";
    if (jenis.includes("Perhotelan")) return "bg-blue-600 text-white";
    if (jenis.includes("Reklame")) return "bg-purple-600 text-white";
    if (jenis.includes("Parkir")) return "bg-green-600 text-white";
    return "bg-gray-600 text-white";
  };

  return (
    <div className="h-screen w-screen relative bg-white overflow-hidden" data-testid="map-page">
      <div className="absolute top-4 left-4 z-[1000] flex flex-col gap-3" data-testid="map-header">
        <div className="bg-black border-[4px] border-[#FFFF00] p-3 flex items-center gap-3">
          <div className="bg-[#FFFF00] w-10 h-10 flex items-center justify-center flex-shrink-0">
            <MapPin className="w-6 h-6 text-black" />
          </div>
          <div>
            <h1 className="font-serif text-lg font-black text-[#FFFF00] tracking-tight leading-none" data-testid="text-app-title">
              OKU SELATAN
            </h1>
            <p className="font-mono text-[10px] text-white tracking-widest uppercase">
              Peta Pajak Daerah
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari landmark..."
              className="pl-9 h-10 bg-white border-[3px] border-black rounded-none font-mono text-sm placeholder:text-gray-400 focus-visible:ring-[#FFFF00] focus-visible:ring-2"
              data-testid="input-search"
            />
          </div>
        </div>

        <div className="flex gap-1 flex-wrap">
          <Button
            size="sm"
            variant={showLayers.landmarks ? "default" : "outline"}
            className={`rounded-none border-[2px] border-black font-mono text-xs h-8 no-default-hover-elevate no-default-active-elevate ${
              showLayers.landmarks ? "bg-[#FFFF00] text-black" : "bg-white text-black"
            }`}
            onClick={() => setShowLayers((s) => ({ ...s, landmarks: !s.landmarks }))}
            data-testid="button-toggle-landmarks"
          >
            <Layers className="w-3 h-3 mr-1" />
            Wiki
          </Button>
          <Button
            size="sm"
            variant={showLayers.wp ? "default" : "outline"}
            className={`rounded-none border-[2px] border-black font-mono text-xs h-8 no-default-hover-elevate no-default-active-elevate ${
              showLayers.wp ? "bg-[#FF6B00] text-white" : "bg-white text-black"
            }`}
            onClick={() => setShowLayers((s) => ({ ...s, wp: !s.wp }))}
            data-testid="button-toggle-wp"
          >
            <Users className="w-3 h-3 mr-1" />
            WP
          </Button>
          <Button
            size="sm"
            variant={showLayers.op ? "default" : "outline"}
            className={`rounded-none border-[2px] border-black font-mono text-xs h-8 no-default-hover-elevate no-default-active-elevate ${
              showLayers.op ? "bg-black text-[#FFFF00]" : "bg-white text-black"
            }`}
            onClick={() => setShowLayers((s) => ({ ...s, op: !s.op }))}
            data-testid="button-toggle-op"
          >
            <Building2 className="w-3 h-3 mr-1" />
            OP
          </Button>
        </div>
      </div>

      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] flex gap-2">
        <Button
          size="sm"
          variant="outline"
          className={`rounded-none border-[3px] border-black font-mono text-xs h-9 no-default-hover-elevate no-default-active-elevate ${
            sidePanel === "wp" ? "bg-[#FF6B00] text-white border-[#FF6B00]" : "bg-white text-black"
          }`}
          onClick={() => setSidePanel(sidePanel === "wp" ? "none" : "wp")}
          data-testid="button-panel-wp"
        >
          <Users className="w-4 h-4 mr-1" />
          Wajib Pajak
        </Button>
        <Button
          size="sm"
          variant="outline"
          className={`rounded-none border-[3px] border-black font-mono text-xs h-9 no-default-hover-elevate no-default-active-elevate ${
            sidePanel === "op" ? "bg-black text-[#FFFF00] border-black" : "bg-white text-black"
          }`}
          onClick={() => setSidePanel(sidePanel === "op" ? "none" : "op")}
          data-testid="button-panel-op"
        >
          <Building2 className="w-4 h-4 mr-1" />
          Objek Pajak
        </Button>
        <Link href="/dashboard">
          <Button
            size="sm"
            variant="outline"
            className="rounded-none border-[3px] border-black font-mono text-xs h-9 bg-[#FFFF00] text-black border-[#FFFF00] no-default-hover-elevate no-default-active-elevate"
            data-testid="button-dashboard"
          >
            <BarChart3 className="w-4 h-4 mr-1" />
            Dashboard
          </Button>
        </Link>
      </div>

      {landmarksLoading && (
        <div className="absolute top-20 right-4 z-[1000] bg-[#FFFF00] border-[3px] border-black p-2 flex items-center gap-2" data-testid="loading-indicator">
          <Loader2 className="w-4 h-4 animate-spin text-black" />
          <span className="font-mono text-xs font-bold text-black">LOADING...</span>
        </div>
      )}

      <div className="absolute bottom-4 right-4 z-[1000] flex gap-3" data-testid="map-stats">
        <div className="bg-[#FFFF00] border-[3px] border-black px-3 py-1.5 font-mono text-xs font-bold text-black">
          <span data-testid="text-landmark-count">{filteredLandmarks.length}</span> WIKI
        </div>
        <div className="bg-[#FF6B00] border-[3px] border-black px-3 py-1.5 font-mono text-xs font-bold text-white">
          <span data-testid="text-wp-count">{wpList.length}</span> WP
        </div>
        <div className="bg-black border-[3px] border-[#FFFF00] px-3 py-1.5 font-mono text-xs font-bold text-[#FFFF00]">
          <span data-testid="text-op-count">{opList.length}</span> OP
        </div>
      </div>

      {sidePanel !== "none" && (
        <SidePanel
          type={sidePanel}
          wpList={wpList}
          opList={opList}
          onClose={() => setSidePanel("none")}
        />
      )}

      {selectedLandmark && (
        <LandmarkDetail
          landmark={selectedLandmark}
          onClose={() => setSelectedLandmark(null)}
        />
      )}

      <BaseMapSwitcher activeMap={activeBaseMap} onChange={setActiveBaseMap} />

      <MapContainer
        center={OKU_SELATAN_CENTER}
        zoom={DEFAULT_ZOOM}
        className="h-full w-full"
        zoomControl={false}
        attributionControl={true}
      >
        <TileLayer
          key={activeBaseMap}
          attribution={currentBaseMap.attribution}
          url={currentBaseMap.url}
          maxZoom={currentBaseMap.maxZoom}
        />
        <MapEventHandler onBoundsChange={handleBoundsChange} />
        <MapControls />
        <FlyToHandler lat={focusLat} lng={focusLng} zoom={focusZoom} />

        {showLayers.landmarks &&
          filteredLandmarks.map((landmark) => (
            <Marker
              key={`wiki-${landmark.pageid}`}
              position={[landmark.lat, landmark.lon]}
              icon={landmarkIcon}
              eventHandlers={{
                click: () => setSelectedLandmark(landmark),
              }}
            >
              <Popup className="brutalist-popup">
                <div className="font-mono text-xs font-bold">{landmark.title}</div>
              </Popup>
            </Marker>
          ))}

        {showLayers.wp &&
          wpList
            .filter((wp) => wp.latitude && wp.longitude)
            .map((wp) => (
              <Marker
                key={`wp-${wp.id}`}
                position={[parseFloat(wp.latitude!), parseFloat(wp.longitude!)]}
                icon={wpIcon}
              >
                <Popup>
                  <div className="font-mono text-xs space-y-1">
                    <div className="font-bold text-sm">{wp.nama}</div>
                    {wp.namaUsaha && <div className="text-gray-600">{wp.namaUsaha}</div>}
                    <div>NPWPD: {wp.npwpd}</div>
                    <div className="font-bold text-[#FF6B00]">{wp.jenisPajak}</div>
                    <div>{wp.alamat}</div>
                  </div>
                </Popup>
              </Marker>
            ))}

        {showLayers.op &&
          opList
            .filter((op) => op.latitude && op.longitude)
            .map((op) => (
              <Marker
                key={`op-${op.id}`}
                position={[parseFloat(op.latitude!), parseFloat(op.longitude!)]}
                icon={opIcon}
              >
                <Popup>
                  <div className="font-mono text-xs space-y-1">
                    <div className="font-bold text-sm">{op.namaObjek}</div>
                    <div className="font-bold text-[#FF6B00]">{op.jenisPajak}</div>
                    <div>NOPD: {op.nopd}</div>
                    <div>{op.alamat}</div>
                    {op.rating && (
                      <div className="flex items-center gap-1">
                        <span>Rating: {Number(op.rating).toFixed(1)}</span>
                        {op.reviewCount && <span>({op.reviewCount} ulasan)</span>}
                      </div>
                    )}
                    {op.pajakBulanan && (
                      <div className="font-bold">Pajak: Rp {Number(op.pajakBulanan).toLocaleString("id-ID")}/bln</div>
                    )}
                  </div>
                </Popup>
              </Marker>
            ))}
      </MapContainer>
    </div>
  );
}

function SidePanel({
  type,
  wpList,
  opList,
  onClose,
}: {
  type: "wp" | "op";
  wpList: WajibPajak[];
  opList: ObjekPajak[];
  onClose: () => void;
}) {
  const isWP = type === "wp";
  const items = isWP ? wpList : opList;

  const jenisPajakColor = (jenis: string) => {
    if (jenis.includes("Makanan")) return "bg-[#FF6B00] text-white";
    if (jenis.includes("Perhotelan")) return "bg-blue-600 text-white";
    if (jenis.includes("Reklame")) return "bg-purple-600 text-white";
    if (jenis.includes("Parkir")) return "bg-green-600 text-white";
    return "bg-gray-600 text-white";
  };

  return (
    <div
      className={`absolute top-0 right-0 z-[1001] h-full w-[420px] max-w-full border-l-[4px] flex flex-col ${
        isWP ? "bg-white border-[#FF6B00]" : "bg-white border-black"
      }`}
      data-testid={`panel-${type}`}
    >
      <div
        className={`flex items-center justify-between gap-2 p-4 border-b-[4px] ${
          isWP ? "bg-[#FF6B00] border-black" : "bg-black border-[#FFFF00]"
        }`}
      >
        <div className="flex items-center gap-2">
          {isWP ? (
            <Users className="w-5 h-5 text-white" />
          ) : (
            <Building2 className="w-5 h-5 text-[#FFFF00]" />
          )}
          <h2
            className={`font-serif text-xl font-black ${isWP ? "text-white" : "text-[#FFFF00]"}`}
            data-testid={`text-panel-title-${type}`}
          >
            {isWP ? "WAJIB PAJAK" : "OBJEK PAJAK"}
          </h2>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className={`rounded-none w-8 h-8 no-default-hover-elevate no-default-active-elevate ${
            isWP ? "text-white" : "text-[#FFFF00]"
          }`}
          onClick={onClose}
          data-testid={`button-close-panel-${type}`}
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center" data-testid={`empty-state-${type}`}>
            <div className={`w-16 h-16 border-[4px] border-black flex items-center justify-center mb-4 ${isWP ? "bg-[#FF6B00]" : "bg-[#FFFF00]"}`}>
              {isWP ? <Users className="w-8 h-8 text-white" /> : <Building2 className="w-8 h-8 text-black" />}
            </div>
            <p className="font-serif text-lg font-black text-black">BELUM ADA DATA</p>
            <p className="font-mono text-xs text-gray-500 mt-1">
              {isWP ? "Tambahkan Wajib Pajak baru" : "Tambahkan Objek Pajak baru"}
            </p>
          </div>
        ) : (
          items.map((item: any) => (
            <div
              key={item.id}
              className="border-[3px] border-black p-3 space-y-2 bg-white"
              data-testid={`card-${type}-${item.id}`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-serif font-black text-sm text-black leading-tight">
                  {isWP ? item.nama : item.namaObjek}
                </h3>
                <Badge
                  className={`rounded-none border-[2px] border-black font-mono text-[10px] flex-shrink-0 ${
                    item.status === "active" ? "bg-[#FFFF00] text-black" : "bg-gray-200 text-gray-600"
                  }`}
                >
                  {item.status?.toUpperCase()}
                </Badge>
              </div>
              {!isWP && item.namaObjek && (
                <Badge className={`rounded-none border-[2px] border-black font-mono text-[10px] ${jenisPajakColor(item.jenisPajak)}`}>
                  <Tag className="w-3 h-3 mr-1" />
                  {item.jenisPajak}
                </Badge>
              )}
              {isWP && item.jenisPajak && (
                <Badge className={`rounded-none border-[2px] border-black font-mono text-[10px] ${jenisPajakColor(item.jenisPajak)}`}>
                  <Tag className="w-3 h-3 mr-1" />
                  {item.jenisPajak}
                </Badge>
              )}
              <div className="font-mono text-xs text-gray-600 space-y-0.5">
                <div><span className="font-bold text-black">{isWP ? "NPWPD" : "NOPD"}:</span> {isWP ? item.npwpd : item.nopd}</div>
                {isWP && item.namaUsaha && <div><span className="font-bold text-black">USAHA:</span> {item.namaUsaha}</div>}
                <div><span className="font-bold text-black">ALAMAT:</span> {item.alamat}</div>
                {item.kecamatan && <div><span className="font-bold text-black">KEC:</span> {item.kecamatan}</div>}
                {!isWP && item.pajakBulanan && (
                  <div><span className="font-bold text-black">PAJAK:</span> Rp {Number(item.pajakBulanan).toLocaleString("id-ID")}/bln</div>
                )}
                {!isWP && item.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="w-3 h-3 text-black fill-black" />
                    <span className="font-bold text-black">{Number(item.rating).toFixed(1)}</span>
                    {item.reviewCount && <span className="text-gray-400">({item.reviewCount})</span>}
                  </div>
                )}
              </div>
              {item.latitude && item.longitude && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-black" />
                  <span className="font-mono text-[10px] text-gray-500">
                    {Number(item.latitude).toFixed(4)}, {Number(item.longitude).toFixed(4)}
                  </span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <div className={`p-4 border-t-[4px] ${isWP ? "border-[#FF6B00]" : "border-black"}`}>
        <a
          href={isWP ? "/wajib-pajak" : "/objek-pajak"}
          className={`flex items-center justify-center gap-2 w-full h-10 border-[3px] border-black font-mono text-sm font-bold ${
            isWP ? "bg-[#FF6B00] text-white" : "bg-black text-[#FFFF00]"
          }`}
          data-testid={`link-manage-${type}`}
        >
          {isWP ? "KELOLA WAJIB PAJAK" : "KELOLA OBJEK PAJAK"}
        </a>
      </div>
    </div>
  );
}
