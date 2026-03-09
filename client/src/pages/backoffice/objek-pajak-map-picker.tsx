import { useCallback, useRef, useState } from "react";
import { Crosshair, MapPin } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const PICKER_LAYERS = {
  osm: {
    name: "OSM",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OSM",
    maxZoom: 19,
  },
  google: {
    name: "Google",
    url: "https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}",
    attribution: "&copy; Google",
    maxZoom: 20,
  },
  esri: {
    name: "ESRI",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri",
    maxZoom: 18,
  },
};

type PickerLayerKey = keyof typeof PICKER_LAYERS;

export function MapPickerEmbed({
  lat,
  lng,
  onSelect,
}: {
  lat: string;
  lng: string;
  onSelect: (lat: number, lng: number) => void;
}) {
  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(
    lat && lng ? { lat: parseFloat(lat), lng: parseFloat(lng) } : null,
  );
  const [activeLayer, setActiveLayer] = useState<PickerLayerKey>("osm");
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const mapRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    if ((node as any)._leafletMap) return;

    const initLat = lat ? parseFloat(lat) : -4.5250;
    const initLng = lng ? parseFloat(lng) : 104.0270;
    const map = L.map(node, {
      center: [initLat, initLng],
      zoom: lat ? 17 : 15,
      zoomControl: true,
    });

    const layer = L.tileLayer(PICKER_LAYERS.osm.url, {
      attribution: PICKER_LAYERS.osm.attribution,
      maxZoom: PICKER_LAYERS.osm.maxZoom,
    }).addTo(map);

    tileLayerRef.current = layer;
    mapInstanceRef.current = map;

    let currentMarker: L.Marker | null = null;
    if (lat && lng) {
      currentMarker = L.marker([parseFloat(lat), parseFloat(lng)]).addTo(map);
    }

    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;
      if (currentMarker) {
        currentMarker.setLatLng([clickLat, clickLng]);
      } else {
        currentMarker = L.marker([clickLat, clickLng]).addTo(map);
      }
      setMarker({ lat: clickLat, lng: clickLng });
      onSelect(clickLat, clickLng);
    });

    (node as any)._leafletMap = map;

    setTimeout(() => map.invalidateSize(), 100);
  }, [lat, lng, onSelect]);

  const switchLayer = (key: PickerLayerKey) => {
    setActiveLayer(key);
    const map = mapInstanceRef.current;
    if (!map) return;
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    const cfg = PICKER_LAYERS[key];
    tileLayerRef.current = L.tileLayer(cfg.url, {
      attribution: cfg.attribution,
      maxZoom: cfg.maxZoom,
    }).addTo(map);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {(Object.keys(PICKER_LAYERS) as PickerLayerKey[]).map((key) => (
          <button
            key={key}
            type="button"
            className={`font-mono text-[10px] font-bold px-2 py-1 border-[2px] border-black transition-colors ${
              activeLayer === key ? "bg-black text-[#FFFF00]" : "bg-white text-black hover:bg-gray-100"
            }`}
            onClick={() => switchLayer(key)}
            data-testid={`picker-layer-${key}`}
          >
            {PICKER_LAYERS[key].name}
          </button>
        ))}
      </div>
      <div
        ref={mapRef}
        className="w-full h-[200px] border-[2px] border-black"
        data-testid="map-picker"
      />
      {marker ? (
        <div className="font-mono text-[10px] text-gray-500 flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          Klik peta untuk menandai lokasi: {marker.lat.toFixed(7)}, {marker.lng.toFixed(7)}
        </div>
      ) : (
        <div className="font-mono text-[10px] text-gray-400 flex items-center gap-1">
          <Crosshair className="w-3 h-3" />
          Klik pada peta untuk menandai lokasi objek pajak
        </div>
      )}
    </div>
  );
}
