import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from "react-leaflet";
import L from "leaflet";
import { useQuery } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { MapPin, Search, ZoomIn, ZoomOut, Crosshair, Layers, X, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import type { WajibPajakWithBadanUsaha, ObjekPajak } from "@shared/schema";
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
  google: {
    name: "Google Satellite",
    url: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
    attribution: '&copy; Google',
    maxZoom: 20,
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

const JENIS_PAJAK_COLORS: Record<string, { bg: string; label: string }> = {
  "Makanan": { bg: "#FF6B00", label: "MKN" },
  "Perhotelan": { bg: "#2563EB", label: "HTL" },
  "Reklame": { bg: "#9333EA", label: "RKL" },
  "Parkir": { bg: "#16A34A", label: "PKR" },
  "Hiburan": { bg: "#DB2777", label: "HBR" },
  "Kesenian": { bg: "#DB2777", label: "HBR" },
  "Listrik": { bg: "#EA580C", label: "LST" },
  "Air Tanah": { bg: "#0891B2", label: "AIR" },
  "Walet": { bg: "#78716C", label: "WLT" },
  "MBLB": { bg: "#57534E", label: "MBL" },
};

function getJenisConfig(jenisPajak: string) {
  for (const [key, config] of Object.entries(JENIS_PAJAK_COLORS)) {
    if (jenisPajak.includes(key)) return config;
  }
  return { bg: "#6B7280", label: "OTH" };
}

function getJenisPajakIcon(jenisPajak: string, type: "wp" | "op") {
  const config = getJenisConfig(jenisPajak);
  const borderColor = type === "wp" ? "#000" : config.bg;
  const bgColor = type === "wp" ? config.bg : "#000";
  const textColor = type === "wp" ? "#fff" : config.bg;
  const typeBg = type === "wp" ? "#000" : config.bg;
  const typeColor = type === "wp" ? config.bg : "#fff";

  return new L.DivIcon({
    className: "custom-marker",
    html: `<div style="position:relative;width:40px;height:40px;">
      <div style="width:40px;height:40px;background:${bgColor};border:3px solid ${borderColor};display:flex;align-items:center;justify-content:center;font-weight:900;font-size:13px;color:${textColor};font-family:'Space Grotesk',monospace;letter-spacing:-0.5px;">${config.label}</div>
      <div style="position:absolute;top:-6px;right:-6px;background:${typeBg};color:${typeColor};font-size:8px;font-weight:900;font-family:monospace;padding:1px 3px;border:2px solid #000;line-height:1;">${type.toUpperCase()}</div>
    </div>`,
    iconSize: [40, 40],
    iconAnchor: [20, 40],
    popupAnchor: [0, -40],
  });
}

function getClusterIcon(count: number) {
  return new L.DivIcon({
    className: "cluster-marker",
    html: `<div style="width:44px;height:44px;background:#FFFF00;border:3px solid #000;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:monospace;">
      <div style="font-weight:900;font-size:16px;color:#000;line-height:1;">${count}</div>
      <div style="font-size:7px;font-weight:700;color:#000;line-height:1;">OBJEK</div>
    </div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 44],
    popupAnchor: [0, -44],
  });
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

function Legend() {
  const [isOpen, setIsOpen] = useState(false);
  const items = [
    { label: "Makanan & Minuman", short: "MKN", color: "#FF6B00" },
    { label: "Jasa Perhotelan", short: "HTL", color: "#2563EB" },
    { label: "Pajak Reklame", short: "RKL", color: "#9333EA" },
    { label: "Jasa Parkir", short: "PKR", color: "#16A34A" },
    { label: "Kesenian & Hiburan", short: "HBR", color: "#DB2777" },
    { label: "Tenaga Listrik", short: "LST", color: "#EA580C" },
    { label: "Air Tanah", short: "AIR", color: "#0891B2" },
    { label: "Sarang Burung Walet", short: "WLT", color: "#78716C" },
    { label: "MBLB", short: "MBL", color: "#57534E" },
  ];

  return (
    <div className="absolute bottom-4 left-4 z-[1000]" data-testid="legend-panel">
      <Button
        size="sm"
        variant="outline"
        className={`rounded-none border-[3px] border-black font-mono text-xs h-9 no-default-hover-elevate no-default-active-elevate ${
          isOpen ? "bg-[#FFFF00] text-black" : "bg-white text-black"
        }`}
        onClick={() => setIsOpen(!isOpen)}
        data-testid="button-toggle-legend"
      >
        <MapPin className="w-3 h-3 mr-1" />
        LEGENDA
      </Button>
      {isOpen && (
        <div className="absolute bottom-11 left-0 bg-white border-[3px] border-black p-3 min-w-[220px]" data-testid="legend-content">
          <div className="font-mono text-xs font-bold text-black mb-2 pb-1 border-b-[2px] border-black">JENIS PAJAK</div>
          <div className="space-y-1.5">
            {items.map((item) => (
              <div key={item.short} className="flex items-center gap-2">
                <div
                  className="w-7 h-5 border-[2px] border-black flex items-center justify-center"
                  style={{ background: item.color }}
                >
                  <span className="font-mono text-[8px] font-bold text-white">{item.short}</span>
                </div>
                <span className="font-mono text-[10px] text-black">{item.label}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 pt-1 border-t-[2px] border-black space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-5 border-[2px] border-black bg-[#FF6B00] flex items-center justify-center">
                <span className="font-mono text-[7px] font-bold text-white">WP</span>
              </div>
              <span className="font-mono text-[10px] text-black">Wajib Pajak</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-7 h-5 border-[2px] border-black bg-black flex items-center justify-center">
                <span className="font-mono text-[7px] font-bold text-[#FF6B00]">OP</span>
              </div>
              <span className="font-mono text-[10px] text-black">Objek Pajak</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

type SearchResult = {
  type: "wp" | "op";
  id: number;
  name: string;
  jenisPajak: string;
  alamat: string;
  lat: string | null;
  lng: string | null;
  opCount?: number;
  wpId?: number | null;
};

export default function MapPage() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const focusLat = params.get("lat") ? parseFloat(params.get("lat")!) : null;
  const focusLng = params.get("lng") ? parseFloat(params.get("lng")!) : null;
  const focusZoom = params.get("zoom") ? parseInt(params.get("zoom")!) : 17;

  const [searchQuery, setSearchQuery] = useState("");
  const [activeBaseMap, setActiveBaseMap] = useState<BaseMapKey>("osm");
  const [selectedWpId, setSelectedWpId] = useState<number | null>(null);
  const [highlightedOpId, setHighlightedOpId] = useState<number | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lng: number; zoom: number } | null>(null);

  const { data: wpList = [] } = useQuery<WajibPajakWithBadanUsaha[]>({
    queryKey: ["/api/wajib-pajak"],
  });

  const { data: opList = [] } = useQuery<ObjekPajak[]>({
    queryKey: ["/api/objek-pajak"],
  });

  const searchResults = useMemo<SearchResult[]>(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const results: SearchResult[] = [];

    wpList.forEach((wp) => {
      const area = [wp.alamatWp, wp.alamatPengelola, wp.badanUsaha?.alamatBadanUsaha]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      if (
        wp.displayName.toLowerCase().includes(q) ||
        (wp.npwpd || "").toLowerCase().includes(q) ||
        wp.peranWp.toLowerCase().includes(q) ||
        wp.jenisWp.toLowerCase().includes(q) ||
        area.includes(q)
      ) {
        const opCount = opList.filter((op) => op.wpId === wp.id).length;
        results.push({
          type: "wp",
          id: wp.id,
          name: wp.displayName,
          jenisPajak: "WP",
          alamat: [wp.alamatWp, wp.alamatPengelola, wp.badanUsaha?.alamatBadanUsaha].find(Boolean) || "-",
          lat: null,
          lng: null,
          opCount,
        });
      }
    });

    opList.forEach((op) => {
      if (
        op.namaObjek.toLowerCase().includes(q) ||
        op.nopd.toLowerCase().includes(q) ||
        op.jenisPajak.toLowerCase().includes(q) ||
        op.alamat.toLowerCase().includes(q)
      ) {
        results.push({
          type: "op",
          id: op.id,
          name: op.namaObjek,
          jenisPajak: op.jenisPajak,
          alamat: op.alamat,
          lat: op.latitude,
          lng: op.longitude,
          wpId: op.wpId,
        });
      }
    });

    return results;
  }, [searchQuery, wpList, opList]);

  const handleSelectResult = (result: SearchResult) => {
    setShowResults(false);
    if (result.type === "wp") {
      setSelectedWpId(result.id);
      setHighlightedOpId(null);
      const relatedOps = opList.filter((op) => op.wpId === result.id && op.latitude && op.longitude);
      if (relatedOps.length > 0) {
        setFlyTarget({
          lat: parseFloat(relatedOps[0].latitude!),
          lng: parseFloat(relatedOps[0].longitude!),
          zoom: 16,
        });
      } else if (result.lat && result.lng) {
        setFlyTarget({ lat: parseFloat(result.lat), lng: parseFloat(result.lng), zoom: 16 });
      }
    } else {
      setSelectedWpId(null);
      setHighlightedOpId(result.id);
      if (result.lat && result.lng) {
        setFlyTarget({ lat: parseFloat(result.lat), lng: parseFloat(result.lng), zoom: 17 });
      }
    }
  };

  const clearSearch = () => {
    setSearchQuery("");
    setSelectedWpId(null);
    setHighlightedOpId(null);
    setShowResults(false);
  };

  const locationGroups = useMemo(() => {
    const groups: Record<string, ObjekPajak[]> = {};
    opList
      .filter((op) => op.latitude && op.longitude)
      .forEach((op) => {
        const key = `${parseFloat(op.latitude!).toFixed(5)},${parseFloat(op.longitude!).toFixed(5)}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(op);
      });
    return groups;
  }, [opList]);

  const visibleWP: WajibPajakWithBadanUsaha[] = [];

  const visibleOP = useMemo(() => {
    if (selectedWpId) {
      return opList.filter((op) => op.wpId === selectedWpId && op.latitude && op.longitude);
    }
    if (highlightedOpId) {
      return opList.filter((op) => op.id === highlightedOpId && op.latitude && op.longitude);
    }
    return opList.filter((op) => op.latitude && op.longitude);
  }, [opList, selectedWpId, highlightedOpId]);

  const visibleLocationGroups = useMemo(() => {
    const groups: Record<string, ObjekPajak[]> = {};
    visibleOP.forEach((op) => {
      const key = `${parseFloat(op.latitude!).toFixed(5)},${parseFloat(op.longitude!).toFixed(5)}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(op);
    });
    return groups;
  }, [visibleOP]);

  const currentBaseMap = BASE_MAPS[activeBaseMap];

  const jenisPajakBadgeColor = (jenis: string) => {
    const config = getJenisConfig(jenis);
    return config.bg;
  };

  const effectiveFlyLat = flyTarget?.lat ?? focusLat;
  const effectiveFlyLng = flyTarget?.lng ?? focusLng;
  const effectiveFlyZoom = flyTarget?.zoom ?? focusZoom;

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

        <div className="relative">
          <div className="relative flex gap-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black" />
              <Input
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowResults(true);
                  if (!e.target.value.trim()) {
                    setSelectedWpId(null);
                    setHighlightedOpId(null);
                  }
                }}
                onFocus={() => searchQuery.trim() && setShowResults(true)}
                placeholder="Cari WP / Objek Pajak..."
                className="pl-9 h-10 bg-white border-[3px] border-black rounded-none font-mono text-sm placeholder:text-gray-400 focus-visible:ring-[#FFFF00] focus-visible:ring-2 w-[300px]"
                data-testid="input-search"
              />
            </div>
            {(searchQuery || selectedWpId || highlightedOpId) && (
              <Button
                size="icon"
                variant="outline"
                className="bg-white border-[3px] border-black rounded-none w-10 h-10 flex-shrink-0 no-default-hover-elevate no-default-active-elevate"
                onClick={clearSearch}
                data-testid="button-clear-search"
              >
                <X className="w-4 h-4 text-black" />
              </Button>
            )}
          </div>

          {showResults && searchResults.length > 0 && (
            <div className="absolute top-12 left-0 w-[340px] bg-white border-[3px] border-black max-h-[400px] overflow-y-auto" data-testid="search-results">
              <div className="p-2 border-b-[2px] border-black bg-gray-50">
                <span className="font-mono text-[10px] font-bold text-gray-500">{searchResults.length} HASIL DITEMUKAN</span>
              </div>
              {searchResults.map((result) => (
                <div
                  key={`${result.type}-${result.id}`}
                  className="p-3 border-b border-gray-200 cursor-pointer hover:bg-[#FFFF00]/20 transition-colors"
                  onClick={() => handleSelectResult(result)}
                  data-testid={`search-result-${result.type}-${result.id}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      className="rounded-none border-[2px] border-black font-mono text-[9px] px-1.5 py-0"
                      style={{
                        background: result.type === "wp" ? "#FF6B00" : "#000",
                        color: result.type === "wp" ? "#fff" : "#FFFF00",
                      }}
                    >
                      {result.type.toUpperCase()}
                    </Badge>
                    <span className="font-serif font-black text-sm text-black truncate">{result.name}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge
                      className="rounded-none border border-black/30 font-mono text-[9px] px-1.5 py-0 text-white"
                      style={{ background: jenisPajakBadgeColor(result.jenisPajak) }}
                    >
                      {result.jenisPajak}
                    </Badge>
                    {result.type === "wp" && result.opCount !== undefined && result.opCount > 0 && (
                      <span className="font-mono text-[10px] text-gray-500">({result.opCount} objek pajak)</span>
                    )}
                  </div>
                  <div className="font-mono text-[10px] text-gray-500 mt-1 truncate">{result.alamat}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {(selectedWpId || highlightedOpId) && (
          <div className="bg-[#FFFF00] border-[3px] border-black px-3 py-2 flex items-center gap-2 max-w-[340px]">
            <span className="font-mono text-xs font-bold text-black flex-1 truncate">
              {selectedWpId
                ? `WP: ${wpList.find((wp) => wp.id === selectedWpId)?.displayName} (${visibleOP.length} OP)`
                : `OP: ${opList.find((op) => op.id === highlightedOpId)?.namaObjek}`}
            </span>
            <Button
              size="icon"
              variant="ghost"
              className="w-6 h-6 rounded-none no-default-hover-elevate no-default-active-elevate flex-shrink-0"
              onClick={clearSearch}
              data-testid="button-clear-filter"
            >
              <X className="w-3 h-3 text-black" />
            </Button>
          </div>
        )}
      </div>

      <Link href="/backoffice">
        <Button
          size="sm"
          variant="outline"
          className="absolute top-4 right-[120px] z-[1000] rounded-none border-[3px] border-black font-mono text-xs h-10 bg-[#FFFF00] text-black no-default-hover-elevate no-default-active-elevate"
          data-testid="button-backoffice"
        >
          <Settings className="w-4 h-4 mr-1" />
          Backoffice
        </Button>
      </Link>

      <div className="absolute bottom-4 right-4 z-[1000] flex gap-3" data-testid="map-stats">
        <div className="bg-[#FF6B00] border-[3px] border-black px-3 py-1.5 font-mono text-xs font-bold text-white">
          <span data-testid="text-wp-count">{wpList.length}</span> WP
        </div>
        <div className="bg-black border-[3px] border-[#FFFF00] px-3 py-1.5 font-mono text-xs font-bold text-[#FFFF00]">
          <span data-testid="text-op-count">{opList.length}</span> OP
        </div>
      </div>

      <Legend />
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
        <MapControls />
        <FlyToHandler lat={effectiveFlyLat} lng={effectiveFlyLng} zoom={effectiveFlyZoom} />

                {Object.entries(visibleLocationGroups).map(([key, ops]) => {
          if (ops.length === 1) {
            const op = ops[0];
            return (
              <Marker
                key={`op-${op.id}`}
                position={[parseFloat(op.latitude!), parseFloat(op.longitude!)]}
                icon={getJenisPajakIcon(op.jenisPajak, "op")}
              >
                <Popup>
                  <div className="font-mono text-xs space-y-1 min-w-[180px]">
                    <div className="font-bold text-sm">{op.namaObjek}</div>
                    <div className="inline-block px-1.5 py-0.5 text-white text-[10px] font-bold" style={{ background: jenisPajakBadgeColor(op.jenisPajak) }}>
                      {op.jenisPajak}
                    </div>
                    <div>NOPD: {op.nopd}</div>
                    <div>{op.alamat}</div>
                    {op.pajakBulanan && (
                      <div className="font-bold">Pajak: Rp {Number(op.pajakBulanan).toLocaleString("id-ID")}/bln</div>
                    )}
                  </div>
                </Popup>
              </Marker>
            );
          }

          const firstOp = ops[0];
          return (
            <Marker
              key={`cluster-${key}`}
              position={[parseFloat(firstOp.latitude!), parseFloat(firstOp.longitude!)]}
              icon={getClusterIcon(ops.length)}
            >
              <Popup>
                <div className="font-mono text-xs space-y-2 min-w-[220px] max-h-[300px] overflow-y-auto">
                  <div className="font-bold text-sm border-b border-gray-300 pb-1">{ops.length} Objek Pajak di lokasi ini</div>
                  {ops.map((op) => (
                    <div key={op.id} className="border-b border-gray-100 pb-1.5">
                      <div className="font-bold">{op.namaObjek}</div>
                      <div className="inline-block px-1 py-0 text-white text-[9px] font-bold mt-0.5" style={{ background: jenisPajakBadgeColor(op.jenisPajak) }}>
                        {op.jenisPajak}
                      </div>
                      <div className="text-gray-500">NOPD: {op.nopd}</div>
                      {op.pajakBulanan && (
                        <div>Pajak: Rp {Number(op.pajakBulanan).toLocaleString("id-ID")}/bln</div>
                      )}
                    </div>
                  ))}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}


