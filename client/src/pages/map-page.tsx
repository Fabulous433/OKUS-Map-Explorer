import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents } from "react-leaflet";
import { Filter, Loader2, MapPin, Search, Settings, Target } from "lucide-react";
import L from "leaflet";
import { DesktopMapFilterSheet } from "@/components/map/desktop-map-filter-sheet";
import { PublicBoundaryLayer, PublicKabupatenMask } from "@/components/map/public-boundary-layer";
import {
  extractBoundaryLegendFeatures,
  createPublicBoundaryLayerQueryPlan,
} from "@/lib/map/public-boundary-layer-model";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MobileMapDrawer } from "@/components/map/mobile-map-drawer";
import { MobileBottomNav } from "@/components/backoffice/mobile-bottom-nav";
import { useIsMobile } from "@/hooks/use-mobile";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { PUBLIC_BASE_MAPS, type BaseMapKey } from "@/lib/map/map-basemap-config";
import { parseMapFocusParams } from "@/lib/map/map-focus-params";
import { buildMapDataRequest, type MapViewportBbox } from "@/lib/map/map-data-source";
import {
  loadMapViewportData,
  shouldActivateViewportData,
  shouldShowEmptyViewportState,
  type MapViewportResult,
} from "@/lib/map/map-viewport-query";
import {
  createDefaultRegionBoundaryLayerState,
  normalizeLayerOpacity,
  type RegionBoundaryLayerId,
} from "@/lib/map/region-boundary-layer-state";
import { loadActiveRegionBoundary } from "@/lib/map/region-boundary-query";
import { getQueryFn } from "@/lib/queryClient";
import { regionConfig } from "@/lib/region-config";
import type { RegionBoundaryBounds } from "@shared/region-boundary";
import type { MasterKecamatan, MasterRekeningPajak } from "@shared/schema";
import "leaflet/dist/leaflet.css";

const IDLE_MAP_HINT = "Peta wilayah aktif. Cari OP / NOPD / alamat atau pilih filter untuk menampilkan marker.";

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

function formatCurrency(value: string | null | undefined) {
  if (!value) return "-";
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return "-";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(numeric);
}

function toLeafletBounds(bounds: RegionBoundaryBounds): L.LatLngBoundsExpression {
  return [
    [bounds.minLat, bounds.minLng],
    [bounds.maxLat, bounds.maxLng],
  ];
}

function MapViewportTracker(props: { onChange: (bbox: MapViewportBbox, zoom: number) => void }) {
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

function MapTopRightControls(props: {
  isFetching: boolean;
  isMobile: boolean;
  activeBounds: RegionBoundaryBounds | null;
}) {
  const map = useMap();
  return (
    <div className={`absolute z-[1000] flex gap-2 ${props.isMobile ? "right-3 top-16" : "right-4 top-4"}`}>
      <Button
        size="icon"
        variant="outline"
        className="rounded-lg bg-background shadow-card"
        onClick={() => {
          if (props.activeBounds) {
            map.fitBounds(toLeafletBounds(props.activeBounds), { padding: [24, 24] });
            return;
          }

          map.flyTo(regionConfig.map.center, regionConfig.map.defaultZoom, { duration: 0.7 });
        }}
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

function MapActiveRegionController(props: {
  activeBounds: RegionBoundaryBounds | null;
  focusTarget: { lat: number; lng: number } | null;
}) {
  const map = useMap();
  const hasAnchoredRef = useRef(false);

  useEffect(() => {
    if (!props.activeBounds || props.focusTarget || hasAnchoredRef.current) {
      return;
    }

    map.fitBounds(toLeafletBounds(props.activeBounds), { padding: [24, 24] });
    hasAnchoredRef.current = true;
  }, [map, props.activeBounds, props.focusTarget]);

  return null;
}

function MapFocusController(props: {
  target: { lat: number; lng: number } | null;
  zoom: number;
}) {
  const map = useMap();

  useEffect(() => {
    if (!props.target) return;

    map.flyTo([props.target.lat, props.target.lng], props.zoom, { duration: 0.85 });
  }, [map, props.target, props.zoom]);

  return null;
}

function MapZoomBoundsController(props: { maxZoom: number }) {
  const map = useMap();

  useEffect(() => {
    map.setMaxZoom(props.maxZoom);

    if (map.getZoom() > props.maxZoom) {
      map.setZoom(props.maxZoom);
    }
  }, [map, props.maxZoom]);

  return null;
}

export default function MapPage() {
  const isMobile = useIsMobile();
  const [baseMap, setBaseMap] = useState<BaseMapKey>("osm");
  const [searchQuery, setSearchQuery] = useState("");
  const [kecamatanId, setKecamatanId] = useState("all");
  const [rekPajakId, setRekPajakId] = useState("all");
  const [zoom, setZoom] = useState(regionConfig.map.defaultZoom);
  const [bbox, setBbox] = useState<MapViewportBbox | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [boundaryLayerState, setBoundaryLayerState] = useState(() => createDefaultRegionBoundaryLayerState());
  const focusedMarkerRef = useRef<L.Marker | null>(null);

  const debouncedSearch = useDebouncedValue(searchQuery, 300);
  const debouncedBbox = useDebouncedValue(bbox, 250);
  const focusParams = useMemo(() => parseMapFocusParams(window.location.search), []);

  const isViewportQueryActive = useMemo(
    () =>
      shouldActivateViewportData({
        bbox: debouncedBbox,
        searchQuery: debouncedSearch,
        kecamatanId,
        rekPajakId,
        focusId: focusParams.id,
        focusTarget: focusParams.target,
      }),
    [debouncedBbox, debouncedSearch, focusParams.id, focusParams.target, kecamatanId, rekPajakId],
  );

  const mapDataRequest = useMemo(() => {
    if (!debouncedBbox || !isViewportQueryActive) return null;
    return buildMapDataRequest(regionConfig.map.dataSource, {
      bbox: debouncedBbox,
      zoom,
      limit: 500,
      searchQuery: debouncedSearch || undefined,
      kecamatanId: kecamatanId !== "all" ? kecamatanId : undefined,
      rekPajakId: rekPajakId !== "all" ? rekPajakId : undefined,
    });
  }, [debouncedBbox, debouncedSearch, isViewportQueryActive, kecamatanId, rekPajakId, zoom]);

  const { data: mapData, isFetching, error } = useQuery<MapViewportResult>({
    queryKey: [
      "public-map-data",
      mapDataRequest?.mode ?? "empty",
      mapDataRequest?.url ?? mapDataRequest?.errorMessage ?? "empty",
    ],
    enabled: mapDataRequest !== null,
    placeholderData: keepPreviousData,
    queryFn: ({ signal }) =>
      mapDataRequest
        ? loadMapViewportData({
            request: mapDataRequest,
            signal,
          })
        : Promise.reject(new Error("Konfigurasi data peta belum tersedia.")),
  });

  const markerList = mapData?.items ?? [];
  const totalInView = mapData?.meta.totalInView ?? 0;
  const isCapped = mapData?.meta.isCapped ?? false;
  const viewportLabel = mapData?.meta.primaryLabel ?? "dalam viewport";
  const showEmptyViewportState = shouldShowEmptyViewportState({
    isQueryActive: isViewportQueryActive,
    bbox: debouncedBbox,
    isFetching,
    error,
    markerCount: markerList.length,
  });
  const showIdleViewportHint = !isViewportQueryActive && !error;

  useEffect(() => {
    if (!focusParams.id || markerList.length === 0 || !focusedMarkerRef.current) return;

    const markerExists = markerList.some((item) => String(item.id) === String(focusParams.id));
    if (!markerExists) return;

    const timer = window.setTimeout(() => {
      focusedMarkerRef.current?.openPopup();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [focusParams.id, markerList]);

  const { data: kecamatanData } = useQuery<MasterKecamatan[] | null>({
    queryKey: ["/api/master/kecamatan"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  const { data: rekeningData } = useQuery<MasterRekeningPajak[] | null>({
    queryKey: ["/api/master/rekening-pajak"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  const { data: activeKabupatenBoundary } = useQuery({
    queryKey: ["active-region-boundary", regionConfig.identity.regionKey, "kabupaten"],
    queryFn: ({ signal }) => loadActiveRegionBoundary({ level: "kabupaten", signal }),
    staleTime: 5 * 60 * 1000,
  });
  const boundaryQueryPlan = createPublicBoundaryLayerQueryPlan({
    layerState: boundaryLayerState,
    kecamatanId,
    zoom,
  });
  const { data: activeKecamatanBoundary } = useQuery({
    queryKey: [
      "active-region-boundary",
      regionConfig.identity.regionKey,
      "kecamatan",
      boundaryQueryPlan.kecamatan.enabled ? "enabled" : "disabled",
    ],
    enabled: boundaryQueryPlan.kecamatan.enabled,
    queryFn: ({ signal }) => loadActiveRegionBoundary({ level: "kecamatan", signal }),
    staleTime: 5 * 60 * 1000,
  });
  const { data: activeDesaBoundary } = useQuery({
    queryKey: [
      "active-region-boundary",
      regionConfig.identity.regionKey,
      "desa",
      boundaryQueryPlan.desa.kecamatanId ?? "none",
    ],
    enabled: boundaryQueryPlan.desa.enabled,
    queryFn: ({ signal }) =>
      loadActiveRegionBoundary({
        level: "desa",
        kecamatanId: boundaryQueryPlan.desa.kecamatanId,
        signal,
      }),
    staleTime: 5 * 60 * 1000,
  });
  const kecamatanList = kecamatanData ?? [];
  const rekeningList = rekeningData ?? [];
  const activeRegionBounds = activeKabupatenBoundary?.bounds ?? null;
  const activeKabupatenGeoJson = activeKabupatenBoundary?.boundary ?? null;
  const activeKecamatanGeoJson = activeKecamatanBoundary?.boundary ?? null;
  const activeDesaGeoJson = activeDesaBoundary?.boundary ?? null;
  const boundaryLegendFeatures = [
    ...(boundaryQueryPlan.kecamatan.enabled && activeKecamatanGeoJson
      ? extractBoundaryLegendFeatures({
          level: "kecamatan",
          boundary: activeKecamatanGeoJson,
        })
      : []),
    ...(boundaryQueryPlan.desa.enabled && activeDesaGeoJson
      ? extractBoundaryLegendFeatures({
          level: "desa",
          boundary: activeDesaGeoJson,
        })
      : []),
  ];

  const mapConfig = PUBLIC_BASE_MAPS[baseMap];

  function updateBoundaryLayerVisibility(layerId: RegionBoundaryLayerId, visible: boolean) {
    startTransition(() => {
      setBoundaryLayerState((current) => ({
        ...current,
        [layerId]: {
          ...current[layerId],
          visible,
        },
      }));
    });
  }

  function updateBoundaryLayerOpacity(layerId: RegionBoundaryLayerId, opacity: number) {
    startTransition(() => {
      setBoundaryLayerState((current) => ({
        ...current,
        [layerId]: {
          ...current[layerId],
          opacity: normalizeLayerOpacity(opacity),
        },
      }));
    });
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background" data-testid="map-page">
      {isMobile ? (
        <>
          <div className="absolute left-3 right-3 top-3 z-[1000] flex items-start justify-between gap-3">
            <div className="rounded-xl bg-background px-4 py-3 shadow-floating">
              <h1 className="font-sans text-lg font-bold leading-none">{regionConfig.brand.publicMapMobileTitle}</h1>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                {regionConfig.brand.publicMapSubtitleMobile}
              </p>
            </div>
            <Link href="/backoffice">
              <Button
                size="icon"
                aria-label="Buka backoffice"
                className="h-14 w-14 rounded-xl bg-primary text-primary-foreground shadow-floating"
              >
                <Settings className="h-5 w-5" aria-hidden="true" />
              </Button>
            </Link>
          </div>

          <div className="absolute bottom-24 left-3 z-[1000] flex max-w-[70vw] flex-wrap gap-2">
            {isViewportQueryActive ? (
              <>
                <Badge className="bg-[#2d3436] text-white">
                  {totalInView} {viewportLabel}
                </Badge>
                <Badge variant="secondary">
                  {markerList.length} marker
                </Badge>
                {isCapped ? (
                  <Badge className="bg-primary text-primary-foreground">
                    capped
                  </Badge>
                ) : null}
              </>
            ) : (
              <Badge variant="secondary">mode jelajah wilayah</Badge>
            )}
          </div>

          <Button
            type="button"
            aria-label="Buka filter peta"
            className="absolute bottom-24 right-3 z-[1000] h-14 w-14 rounded-xl p-0 shadow-floating"
            variant="outline"
            onClick={() => setIsDrawerOpen(true)}
          >
            <Filter className="h-5 w-5" aria-hidden="true" />
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
            viewportLabel={viewportLabel}
            markerCount={markerList.length}
            isCapped={isCapped}
            isViewportQueryActive={isViewportQueryActive}
            boundaryLayerState={boundaryLayerState}
            onBoundaryLayerVisibilityChange={updateBoundaryLayerVisibility}
            onBoundaryLayerOpacityChange={updateBoundaryLayerOpacity}
            boundaryLegendFeatures={boundaryLegendFeatures}
            boundaryLayerZoom={zoom}
          />
        </>
      ) : (
        <>
          <div className="absolute left-4 top-4 z-[1000] flex max-w-[calc(100vw-2rem)] flex-col gap-3">
            <div className="rounded-xl bg-background p-4 shadow-floating">
              <h1 className="font-sans text-xl font-bold leading-none">{regionConfig.brand.publicMapDesktopTitle}</h1>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {regionConfig.brand.publicMapSubtitleDesktop}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsDrawerOpen(true)}>
                <Filter className="h-3.5 w-3.5" aria-hidden="true" />
                Filter Peta
              </Button>
              <Link href="/backoffice">
                <Button size="sm" className="font-mono text-xs">
                  <Settings className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                  Backoffice
                </Button>
              </Link>
            </div>

            <DesktopMapFilterSheet
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
              boundaryLayerState={boundaryLayerState}
              onBoundaryLayerVisibilityChange={updateBoundaryLayerVisibility}
              onBoundaryLayerOpacityChange={updateBoundaryLayerOpacity}
              boundaryLegendFeatures={boundaryLegendFeatures}
              boundaryLayerZoom={zoom}
            />
          </div>

          <div className="absolute bottom-4 right-4 z-[1000] flex gap-2">
            {isViewportQueryActive ? (
              <>
                <Badge className="bg-[#2d3436] text-white">
                  {totalInView} {viewportLabel}
                </Badge>
                <Badge variant="secondary">
                  {markerList.length} marker
                </Badge>
                {isCapped && (
                  <Badge className="bg-primary text-primary-foreground">
                    capped
                  </Badge>
                )}
              </>
            ) : (
              <Badge variant="secondary">mode jelajah wilayah</Badge>
            )}
          </div>
        </>
      )}

      <MapContainer
        center={regionConfig.map.center}
        zoom={regionConfig.map.defaultZoom}
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer attribution={mapConfig.attribution} url={mapConfig.url} maxZoom={mapConfig.maxZoom} />
        <MapActiveRegionController activeBounds={activeRegionBounds} focusTarget={focusParams.target} />
        <MapFocusController target={focusParams.target} zoom={Math.max(regionConfig.map.defaultZoom, 18)} />
        <MapZoomBoundsController maxZoom={mapConfig.maxZoom} />
        <MapViewportTracker
          onChange={(nextBbox, nextZoom) => {
            setBbox(nextBbox);
            setZoom(nextZoom);
          }}
        />
        <MapTopRightControls isFetching={isFetching} isMobile={isMobile} activeBounds={activeRegionBounds} />

        {activeKabupatenGeoJson ? <PublicKabupatenMask boundary={activeKabupatenGeoJson} /> : null}

        {boundaryLayerState.kabupaten.visible && activeKabupatenGeoJson ? (
          <PublicBoundaryLayer
            level="kabupaten"
            boundary={activeKabupatenGeoJson}
            opacity={boundaryLayerState.kabupaten.opacity}
            zoom={zoom}
          />
        ) : null}

        {boundaryLayerState.kecamatan.visible && activeKecamatanGeoJson ? (
          <PublicBoundaryLayer
            level="kecamatan"
            boundary={activeKecamatanGeoJson}
            opacity={boundaryLayerState.kecamatan.opacity}
            zoom={zoom}
          />
        ) : null}

        {boundaryQueryPlan.desa.enabled && activeDesaGeoJson ? (
          <PublicBoundaryLayer
            level="desa"
            boundary={activeDesaGeoJson}
            opacity={boundaryLayerState.desa.opacity}
            zoom={zoom}
          />
        ) : null}

        {markerList.map((item) => (
          <Marker
            key={item.focusKey}
            position={[item.latitude, item.longitude]}
            icon={buildMarkerIcon(item.jenisPajak)}
            ref={(marker) => {
              if (String(item.id) === String(focusParams.id)) {
                focusedMarkerRef.current = marker;
              }
            }}
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

      {showEmptyViewportState && (
        <div className="absolute bottom-4 left-4 z-[1000] rounded-lg bg-background p-3 font-mono text-xs shadow-card">
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            Tidak ada objek pajak pada viewport ini.
          </div>
        </div>
      )}

      {showIdleViewportHint && (
        <div className="absolute bottom-4 left-4 z-[1000] max-w-[440px] rounded-lg bg-background p-3 font-mono text-xs shadow-card">
          <div className="flex items-center gap-2">
            <Search className="h-3.5 w-3.5" aria-hidden="true" />
            {IDLE_MAP_HINT}
          </div>
        </div>
      )}

      {isMobile ? <MobileBottomNav /> : null}
    </div>
  );
}
