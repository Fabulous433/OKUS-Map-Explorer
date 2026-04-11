import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Crosshair, MapPin } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import {
  createRegionBoundaryClientState,
  isCoordinateInsideRegionBoundary,
  type RegionBoundaryClientState,
} from "@/lib/map/region-boundary-client";
import { loadActiveRegionBoundary } from "@/lib/map/region-boundary-query";
import { regionConfig } from "@/lib/region-config";

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
} as const;

type PickerLayerKey = keyof typeof PICKER_LAYERS;

function parseCoordinate(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function MapPickerEmbed(props: {
  lat: string;
  lng: string;
  kecamatanId?: string;
  kelurahanName?: string;
  onSelect: (lat: number, lng: number) => void;
  onInvalidSelection?: (message: string | null) => void;
}) {
  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(() => {
    const lat = parseCoordinate(props.lat);
    const lng = parseCoordinate(props.lng);
    return lat !== null && lng !== null ? { lat, lng } : null;
  });
  const [activeLayer, setActiveLayer] = useState<PickerLayerKey>("osm");
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const boundaryLayerRef = useRef<L.GeoJSON | null>(null);
  const onSelectRef = useRef(props.onSelect);
  const onInvalidSelectionRef = useRef(props.onInvalidSelection);
  const boundaryStateRef = useRef<RegionBoundaryClientState | null>(null);
  const hasAnchoredRegionRef = useRef(false);
  const lastAnchorModeRef = useRef<"coordinate" | "kelurahan" | "kabupaten" | null>(null);

  const { data: activeKabupatenBoundary } = useQuery({
    queryKey: ["active-region-boundary", regionConfig.identity.regionKey, "kabupaten", "picker"],
    queryFn: ({ signal }) => loadActiveRegionBoundary({ level: "kabupaten", signal }),
    staleTime: 5 * 60 * 1000,
  });
  const { data: activeDesaBoundary } = useQuery({
    queryKey: [
      "active-region-boundary",
      regionConfig.identity.regionKey,
      "desa",
      "picker",
      props.kecamatanId ?? "none",
    ],
    queryFn: ({ signal }) =>
      loadActiveRegionBoundary({
        level: "desa",
        kecamatanId: props.kecamatanId,
        signal,
      }),
    enabled: Boolean(props.kecamatanId),
    staleTime: 5 * 60 * 1000,
  });

  const boundaryState = useMemo(() => {
    return activeKabupatenBoundary ? createRegionBoundaryClientState(activeKabupatenBoundary.boundary) : null;
  }, [activeKabupatenBoundary]);
  const selectedKelurahanBounds = useMemo(() => {
    const targetName = String(props.kelurahanName ?? "").trim();
    if (!targetName || !activeDesaBoundary?.boundary?.features?.length) {
      return null;
    }

    const normalizeRegionName = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
    const normalizedTarget = normalizeRegionName(targetName);
    const matchedFeature = activeDesaBoundary.boundary.features.find((feature) => {
      const props = (feature.properties ?? {}) as Record<string, unknown>;
      const candidateName = String(props.WADMKD ?? props.NAMOBJ ?? "").trim();
      return candidateName.length > 0 && normalizeRegionName(candidateName) === normalizedTarget;
    });

    if (!matchedFeature) {
      return null;
    }

    try {
      const bounds = L.geoJSON(matchedFeature as any).getBounds();
      return bounds.isValid() ? bounds : null;
    } catch {
      return null;
    }
  }, [activeDesaBoundary, props.kelurahanName]);

  useEffect(() => {
    onSelectRef.current = props.onSelect;
    onInvalidSelectionRef.current = props.onInvalidSelection;
  }, [props.onInvalidSelection, props.onSelect]);

  useEffect(() => {
    boundaryStateRef.current = boundaryState;
  }, [boundaryState]);

  const mapRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (!node || mapInstanceRef.current || (node as { _leafletMap?: L.Map })._leafletMap) {
        return;
      }

      const initialLat = parseCoordinate(props.lat) ?? -4.525;
      const initialLng = parseCoordinate(props.lng) ?? 104.027;
      const map = L.map(node, {
        center: [initialLat, initialLng],
        zoom: props.lat && props.lng ? 17 : 15,
        zoomControl: true,
      });

      tileLayerRef.current = L.tileLayer(PICKER_LAYERS.osm.url, {
        attribution: PICKER_LAYERS.osm.attribution,
        maxZoom: PICKER_LAYERS.osm.maxZoom,
      }).addTo(map);

      if (props.lat && props.lng) {
        markerRef.current = L.marker([initialLat, initialLng]).addTo(map);
      }

      map.on("click", (event: L.LeafletMouseEvent) => {
        const activeBoundaryState = boundaryStateRef.current;
        if (!activeBoundaryState) {
          onInvalidSelectionRef.current?.("Boundary OKU Selatan masih dimuat. Coba lagi sesaat.");
          return;
        }

        const nextPoint = {
          lat: event.latlng.lat,
          lng: event.latlng.lng,
        };

        if (!isCoordinateInsideRegionBoundary(activeBoundaryState.geoJson, nextPoint)) {
          onInvalidSelectionRef.current?.("Titik harus berada di dalam Kabupaten OKU Selatan.");
          return;
        }

        if (markerRef.current) {
          markerRef.current.setLatLng([nextPoint.lat, nextPoint.lng]);
        } else {
          markerRef.current = L.marker([nextPoint.lat, nextPoint.lng]).addTo(map);
        }

        setMarker(nextPoint);
        onInvalidSelectionRef.current?.(null);
        onSelectRef.current(nextPoint.lat, nextPoint.lng);
      });

      mapInstanceRef.current = map;
      (node as { _leafletMap?: L.Map })._leafletMap = map;

      window.setTimeout(() => map.invalidateSize(), 100);
    },
    [props.lat, props.lng],
  );

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !boundaryState) {
      return;
    }

    if (boundaryLayerRef.current) {
      map.removeLayer(boundaryLayerRef.current);
    }

    boundaryLayerRef.current = L.geoJSON(boundaryState.geoJson as any, {
      style: {
        color: "#0f766e",
        weight: 2,
        opacity: 0.95,
        fillColor: "#14b8a6",
        fillOpacity: 0.05,
      },
      interactive: false,
    }).addTo(map);

    map.setMaxBounds(boundaryState.maxBounds as L.LatLngBoundsExpression);

    const latitude = parseCoordinate(props.lat);
    const longitude = parseCoordinate(props.lng);
    const hasCoordinateTarget = latitude !== null && longitude !== null;

    if (!hasAnchoredRegionRef.current) {
      if (hasCoordinateTarget) {
        map.setView([latitude, longitude], 17, { animate: false });
        lastAnchorModeRef.current = "coordinate";
      } else if (selectedKelurahanBounds) {
        map.fitBounds(selectedKelurahanBounds, { padding: [16, 16] });
        lastAnchorModeRef.current = "kelurahan";
      } else {
        map.fitBounds(boundaryState.maxBounds as L.LatLngBoundsExpression, { padding: [16, 16] });
        lastAnchorModeRef.current = "kabupaten";
      }
      hasAnchoredRegionRef.current = true;
    } else if (hasCoordinateTarget && lastAnchorModeRef.current !== "coordinate") {
      map.setView([latitude, longitude], 17, { animate: false });
      lastAnchorModeRef.current = "coordinate";
    } else if (
      !hasCoordinateTarget &&
      selectedKelurahanBounds &&
      lastAnchorModeRef.current === "kabupaten"
    ) {
      // Upgrade focus from kabupaten fallback to selected kelurahan once desa boundary finishes loading.
      map.fitBounds(selectedKelurahanBounds, { padding: [16, 16] });
      lastAnchorModeRef.current = "kelurahan";
    }

    return () => {
      if (boundaryLayerRef.current) {
        map.removeLayer(boundaryLayerRef.current);
        boundaryLayerRef.current = null;
      }
    };
  }, [boundaryState, props.lat, props.lng, selectedKelurahanBounds]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) {
      return;
    }

    const nextLat = parseCoordinate(props.lat);
    const nextLng = parseCoordinate(props.lng);
    if (nextLat === null || nextLng === null) {
      if (markerRef.current) {
        map.removeLayer(markerRef.current);
        markerRef.current = null;
      }
      setMarker(null);
      return;
    }

    if (markerRef.current) {
      markerRef.current.setLatLng([nextLat, nextLng]);
    } else {
      markerRef.current = L.marker([nextLat, nextLng]).addTo(map);
    }

    setMarker({ lat: nextLat, lng: nextLng });
  }, [props.lat, props.lng]);

  const switchLayer = (key: PickerLayerKey) => {
    setActiveLayer(key);
    const map = mapInstanceRef.current;
    if (!map) {
      return;
    }

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const layerConfig = PICKER_LAYERS[key];
    tileLayerRef.current = L.tileLayer(layerConfig.url, {
      attribution: layerConfig.attribution,
      maxZoom: layerConfig.maxZoom,
    }).addTo(map);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-1">
        {(Object.keys(PICKER_LAYERS) as PickerLayerKey[]).map((key) => (
          <button
            key={key}
            type="button"
            className={`px-2 py-1 font-mono text-[10px] font-bold transition-colors ${
              activeLayer === key ? "bg-[#2d3436] text-white" : "bg-white text-black hover:bg-gray-100"
            }`}
            onClick={() => switchLayer(key)}
            data-testid={`picker-layer-${key}`}
          >
            {PICKER_LAYERS[key].name}
          </button>
        ))}
      </div>
      <div ref={mapRef} className="h-[200px] w-full" data-testid="map-picker" />
      {marker ? (
        <div className="flex items-center gap-1 font-mono text-[10px] text-gray-500">
          <MapPin className="h-3 w-3" />
          Klik peta untuk menandai lokasi: {marker.lat.toFixed(7)}, {marker.lng.toFixed(7)}
        </div>
      ) : (
        <div className="flex items-center gap-1 font-mono text-[10px] text-gray-400">
          <Crosshair className="h-3 w-3" />
          Klik pada peta untuk menandai lokasi objek pajak di OKU Selatan
        </div>
      )}
    </div>
  );
}
