import { startTransition, useEffect, useMemo, useRef, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "wouter";
import { MapContainer, Marker, Popup, TileLayer, useMap, ZoomControl } from "react-leaflet";
import { Layers3, Loader2, MapPin, Settings, Target } from "lucide-react";
import L from "leaflet";
import { PublicBoundaryLayer, PublicKabupatenMask } from "@/components/map/public-boundary-layer";
import { PublicMapStageHeader } from "@/components/map/public-map-stage-header";
import { PublicMapTaxFilterChips } from "@/components/map/public-map-tax-filter-chips";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PUBLIC_BASE_MAPS, type BaseMapKey } from "@/lib/map/map-basemap-config";
import { buildMapDataRequest, type MapViewportBbox } from "@/lib/map/map-data-source";
import { getFocusedDesaBoundaryLayerStyle } from "@/lib/map/region-boundary-layer-style";
import { parseMapFocusParams } from "@/lib/map/map-focus-params";
import { loadMapViewportData, shouldShowEmptyViewportState, type MapViewportResult } from "@/lib/map/map-viewport-query";
import { bindMapViewportTracking } from "@/lib/map/map-viewport-tracker";
import {
  type BoundaryFeatureSelection,
  resolveBoundarySelectionKecamatanId,
} from "@/lib/map/public-boundary-layer-model";
import {
  createDefaultPublicMapStageState,
  createPublicMapStageHeaderModel,
  createPublicMapVisibleMarkers,
  drillIntoDesaStage,
  drillIntoKecamatanStage,
  expandStageBounds,
  extractPublicMapTaxTypeOptions,
  getPublicMapDesaMarkerFocusTarget,
  getPublicMapBoundaryPresentation,
  getPublicMapMarkerQueryBounds,
  getPublicMapStageConstraintBounds,
  getPublicMapStageAnimationDuration,
  getPublicMapStageBounds,
  getPublicMapStagePaddingRatio,
  getPublicMapStageViewportPlan,
  getPublicMapStageViewportPadding,
  shouldActivatePublicMapMarkers,
  stepBackPublicMapStage,
  type MapStage,
  type PublicMapStageState,
} from "@/lib/map/public-map-stage-model";
import { loadActiveRegionBoundary } from "@/lib/map/region-boundary-query";
import { getQueryFn } from "@/lib/queryClient";
import { regionConfig } from "@/lib/region-config";
import type { RegionBoundaryBounds } from "@shared/region-boundary";
import type { MasterKecamatan } from "@shared/schema";
import "leaflet/dist/leaflet.css";

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

function toLeafletBounds(bounds: RegionBoundaryBounds): [[number, number], [number, number]] {
  return [
    [bounds.minLat, bounds.minLng],
    [bounds.maxLat, bounds.maxLng],
  ];
}

function getBoundsCenter(bounds: RegionBoundaryBounds): [number, number] {
  return [(bounds.minLat + bounds.maxLat) / 2, (bounds.minLng + bounds.maxLng) / 2];
}

function cycleBaseMap(current: BaseMapKey): BaseMapKey {
  const mapKeys = Object.keys(PUBLIC_BASE_MAPS) as BaseMapKey[];
  const currentIndex = mapKeys.indexOf(current);
  const nextIndex = (currentIndex + 1) % mapKeys.length;
  return mapKeys[nextIndex] ?? "osm";
}

function MapViewportTracker(props: { onChange: (bbox: MapViewportBbox, zoom: number) => void }) {
  const map = useMap();
  const onChangeRef = useRef(props.onChange);

  useEffect(() => {
    onChangeRef.current = props.onChange;
  }, [props.onChange]);

  useEffect(
    () =>
      bindMapViewportTracking({
        map,
        onChange: (bbox, zoom) => onChangeRef.current(bbox, zoom),
      }),
    [map],
  );

  return null;
}

function MapFocusController(props: {
  target: { lat: number; lng: number } | null;
  zoom: number;
  reducedMotion: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (!props.target) return;

    map.flyTo([props.target.lat, props.target.lng], props.zoom, {
      duration: props.reducedMotion ? 0 : 0.85,
    });
  }, [map, props.reducedMotion, props.target, props.zoom]);

  return null;
}

function MapStageConstraintController(props: {
  kabupatenBounds: RegionBoundaryBounds | null;
  stageBounds: RegionBoundaryBounds | null;
  stage: MapStage;
}) {
  const map = useMap();

  useEffect(() => {
    const activeBounds = props.stageBounds ?? props.kabupatenBounds;
    if (!activeBounds) {
      return;
    }

    const constrainedBounds = expandStageBounds(activeBounds, getPublicMapStagePaddingRatio(props.stage));
    const leafletBounds = L.latLngBounds(toLeafletBounds(constrainedBounds));
    const minZoom = map.getBoundsZoom(leafletBounds, false, L.point(24, 24));

    map.setMaxBounds(leafletBounds);
    map.options.maxBoundsViscosity = 1;
    map.setMinZoom(minZoom);

    if (map.getZoom() < minZoom) {
      map.setZoom(minZoom);
    }
  }, [map, props.kabupatenBounds, props.stage, props.stageBounds]);

  return null;
}

function MapStageViewportController(props: {
  stageState: PublicMapStageState;
  kabupatenBounds: RegionBoundaryBounds | null;
  baseMapMaxZoom: number;
  focusTarget: { lat: number; lng: number } | null;
  reducedMotion: boolean;
  resetToken: number;
}) {
  const map = useMap();
  const hasInitializedRef = useRef(false);
  const skippedInitialFocusRef = useRef(false);
  const lastSignatureRef = useRef("");

  const targetBounds = useMemo(
    () =>
      getPublicMapStageBounds({
        stageState: props.stageState,
        kabupatenBounds: props.kabupatenBounds,
      }),
    [props.kabupatenBounds, props.stageState],
  );

  const signature = `${props.stageState.stage}:${props.stageState.selectedKecamatan?.id ?? "none"}:${props.stageState.selectedDesa?.name ?? "none"}:${props.resetToken}`;

  useEffect(() => {
    if (!targetBounds) {
      return;
    }

    if (
      props.focusTarget &&
      !skippedInitialFocusRef.current &&
      props.stageState.stage === "kabupaten" &&
      props.stageState.selectedKecamatan === null &&
      props.stageState.selectedDesa === null
    ) {
      skippedInitialFocusRef.current = true;
      hasInitializedRef.current = true;
      lastSignatureRef.current = signature;
      return;
    }

    if (lastSignatureRef.current === signature) {
      return;
    }

    lastSignatureRef.current = signature;
    const compactViewport = map.getSize().x < 640;
    const viewportPadding = getPublicMapStageViewportPadding(props.stageState.stage, compactViewport);
    const viewportPlan = getPublicMapStageViewportPlan({
      stage: props.stageState.stage,
      baseMapMaxZoom: props.baseMapMaxZoom,
    });

    const fitOptions = {
      paddingTopLeft: viewportPadding.paddingTopLeft,
      paddingBottomRight: viewportPadding.paddingBottomRight,
      maxZoom: viewportPlan.maxZoom,
    };

    if (viewportPlan.mode === "center") {
      const targetCenter = getBoundsCenter(targetBounds);

      if (!hasInitializedRef.current || props.reducedMotion) {
        map.setView(targetCenter, viewportPlan.maxZoom);
        hasInitializedRef.current = true;
        return;
      }

      map.flyTo(targetCenter, viewportPlan.maxZoom, {
        duration: getPublicMapStageAnimationDuration(props.stageState.stage, props.reducedMotion),
      });
      hasInitializedRef.current = true;
      return;
    }

    if (!hasInitializedRef.current || props.reducedMotion || props.stageState.stage === "kabupaten") {
      map.fitBounds(toLeafletBounds(targetBounds), fitOptions);
      hasInitializedRef.current = true;
      return;
    }

    map.flyToBounds(toLeafletBounds(targetBounds), {
      ...fitOptions,
      duration: getPublicMapStageAnimationDuration(props.stageState.stage, props.reducedMotion),
    });
    hasInitializedRef.current = true;
  }, [map, props.baseMapMaxZoom, props.focusTarget, props.reducedMotion, props.stageState, signature, targetBounds]);

  return null;
}

function MapBaseMapZoomController(props: { maxZoom: number }) {
  const map = useMap();

  useEffect(() => {
    map.setMaxZoom(props.maxZoom);

    if (map.getZoom() > props.maxZoom) {
      map.setZoom(props.maxZoom);
    }
  }, [map, props.maxZoom]);

  return null;
}

function MapDesaMarkerFocusController(props: {
  stageState: PublicMapStageState;
  markers: MapViewportResult["items"];
  requiredZoom: number;
  reducedMotion: boolean;
  zoom: number;
}) {
  const map = useMap();
  const lastFocusedSignatureRef = useRef("");

  useEffect(() => {
    if (props.stageState.stage !== "desa" || props.stageState.selectedDesa === null) {
      lastFocusedSignatureRef.current = "";
      return;
    }

    const focusTarget = getPublicMapDesaMarkerFocusTarget({
      stageState: props.stageState,
      markers: props.markers,
    });
    if (!focusTarget) {
      return;
    }

    if (props.zoom + 0.01 < props.requiredZoom) {
      return;
    }

    const signature = `${props.stageState.selectedDesa.name}:${props.markers.map((marker) => marker.id).join(",")}`;
    if (lastFocusedSignatureRef.current === signature) {
      return;
    }

    lastFocusedSignatureRef.current = signature;
    map.panTo([focusTarget.lat, focusTarget.lng], {
      animate: !props.reducedMotion,
      duration: props.reducedMotion ? 0 : 0.7,
    });
  }, [map, props.markers, props.reducedMotion, props.requiredZoom, props.stageState, props.zoom]);

  return null;
}

export default function MapPage() {
  const reducedMotion = useReducedMotion() ?? false;
  const [baseMap, setBaseMap] = useState<BaseMapKey>("osm");
  const [zoom, setZoom] = useState(regionConfig.map.defaultZoom);
  const [bbox, setBbox] = useState<MapViewportBbox | null>(null);
  const [stageState, setStageState] = useState<PublicMapStageState>(() => createDefaultPublicMapStageState());
  const [focusParams, setFocusParams] = useState(() => parseMapFocusParams(window.location.search));
  const [transitionPulseKey, setTransitionPulseKey] = useState(0);
  const [viewportResetToken, setViewportResetToken] = useState(0);
  const focusedMarkerRef = useRef<L.Marker | null>(null);
  const hasMountedStageRef = useRef(false);
  const kecamatanListRef = useRef<MasterKecamatan[]>([]);
  const hasFocusOverride = focusParams.id !== null || focusParams.target !== null;

  useEffect(() => {
    if (!hasMountedStageRef.current) {
      hasMountedStageRef.current = true;
      return;
    }

    setTransitionPulseKey((current) => current + 1);
  }, [stageState.stage, stageState.selectedKecamatan?.id, stageState.selectedDesa?.name]);

  const { data: kecamatanData } = useQuery<MasterKecamatan[] | null>({
    queryKey: ["/api/master/kecamatan"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  const { data: activeKabupatenBoundary } = useQuery({
    queryKey: ["active-region-boundary", regionConfig.identity.regionKey, "kabupaten"],
    queryFn: ({ signal }) => loadActiveRegionBoundary({ level: "kabupaten", signal }),
    staleTime: 5 * 60 * 1000,
  });
  const { data: activeKecamatanBoundary } = useQuery({
    queryKey: ["active-region-boundary", regionConfig.identity.regionKey, "kecamatan", "stage-root"],
    queryFn: ({ signal }) => loadActiveRegionBoundary({ level: "kecamatan", signal }),
    staleTime: 5 * 60 * 1000,
  });
  const { data: activeDesaBoundary } = useQuery({
    queryKey: [
      "active-region-boundary",
      regionConfig.identity.regionKey,
      "desa",
      stageState.selectedKecamatan?.id ?? "none",
    ],
    enabled: stageState.selectedKecamatan !== null,
    queryFn: ({ signal }) =>
      loadActiveRegionBoundary({
        level: "desa",
        kecamatanId: stageState.selectedKecamatan?.id,
        signal,
      }),
    staleTime: 5 * 60 * 1000,
  });

  const isMarkerQueryActive = useMemo(
    () =>
      shouldActivatePublicMapMarkers({
        stageState,
        hasFocusOverride,
      }),
    [hasFocusOverride, stageState],
  );

  const mapDataRequest = useMemo(() => {
    const markerQueryBounds = getPublicMapMarkerQueryBounds({
      stageState,
      viewportBbox: bbox,
    });

    if (!markerQueryBounds || !isMarkerQueryActive) {
      return null;
    }

    return buildMapDataRequest(regionConfig.map.dataSource, {
      bbox: markerQueryBounds,
      zoom,
      limit: 500,
      kecamatanId: stageState.selectedKecamatan?.id ?? undefined,
    });
  }, [bbox, isMarkerQueryActive, stageState, zoom]);

  const { data: mapData, isFetching, error } = useQuery<MapViewportResult>({
    queryKey: [
      "public-map-data",
      mapDataRequest?.mode ?? "empty",
      mapDataRequest?.url ?? mapDataRequest?.errorMessage ?? "empty",
      stageState.stage,
      stageState.selectedKecamatan?.id ?? "none",
      stageState.selectedDesa?.name ?? "none",
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
  const stageScopedMarkerList = useMemo(
    () =>
      createPublicMapVisibleMarkers({
        stageState: {
          ...stageState,
          selectedTaxType: "all",
        },
        hasFocusOverride,
        markers: markerList,
      }),
    [hasFocusOverride, markerList, stageState],
  );
  const taxTypeOptions = useMemo(() => extractPublicMapTaxTypeOptions(stageScopedMarkerList), [stageScopedMarkerList]);
  const visibleMarkerList = useMemo(
    () =>
      createPublicMapVisibleMarkers({
        stageState,
        hasFocusOverride,
        markers: markerList,
      }),
    [hasFocusOverride, markerList, stageState],
  );
  const stageHeaderModel = createPublicMapStageHeaderModel({
    stageState,
    regionName: regionConfig.identity.regionName,
    markerCount: visibleMarkerList.length,
  });
  const activeStageBounds = getPublicMapStageBounds({
    stageState,
    kabupatenBounds: activeKabupatenBoundary?.bounds ?? null,
  });
  const activeStageConstraintBounds = getPublicMapStageConstraintBounds({
    stageState,
    kabupatenBounds: activeKabupatenBoundary?.bounds ?? null,
  });
  const activeKabupatenGeoJson = activeKabupatenBoundary?.boundary ?? null;
  const activeKecamatanGeoJson = activeKecamatanBoundary?.boundary ?? null;
  const activeDesaGeoJson = activeDesaBoundary?.boundary ?? null;
  const boundaryPresentation = getPublicMapBoundaryPresentation({
    stageState,
    hasKabupatenBoundary: activeKabupatenGeoJson !== null,
    hasKecamatanBoundary: activeKecamatanGeoJson !== null,
    hasDesaBoundary: activeDesaGeoJson !== null,
  });
  const showMarkerBadges = isMarkerQueryActive && (stageState.stage === "desa" || hasFocusOverride);
  const viewportLabel =
    stageState.stage === "desa" && stageState.selectedDesa
      ? `dalam desa ${stageState.selectedDesa.name}`
      : stageState.stage === "kecamatan" && stageState.selectedKecamatan
        ? `dalam kecamatan ${stageState.selectedKecamatan.name}`
        : mapData?.meta.primaryLabel ?? "marker loaded";
  const showEmptyViewportState = shouldShowEmptyViewportState({
    isQueryActive: isMarkerQueryActive,
    bbox,
    isFetching,
    error,
    markerCount: visibleMarkerList.length,
  });
  const mapConfig = PUBLIC_BASE_MAPS[baseMap];
  const activeViewportPlan = getPublicMapStageViewportPlan({
    stage: stageState.stage,
    baseMapMaxZoom: mapConfig.maxZoom,
  });

  useEffect(() => {
    if (!stageState.selectedKecamatan || stageState.stage !== "desa") {
      return;
    }

    if (stageState.selectedTaxType === "all") {
      return;
    }

    if (taxTypeOptions.includes(stageState.selectedTaxType)) {
      return;
    }

    setStageState((current) => ({
      ...current,
      selectedTaxType: "all",
    }));
  }, [stageState.selectedKecamatan, stageState.selectedTaxType, stageState.stage, taxTypeOptions]);

  useEffect(() => {
    if (!focusParams.id || visibleMarkerList.length === 0 || !focusedMarkerRef.current) return;

    const markerExists = visibleMarkerList.some((item) => String(item.id) === String(focusParams.id));
    if (!markerExists) return;

    const timer = window.setTimeout(() => {
      focusedMarkerRef.current?.openPopup();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [focusParams.id, visibleMarkerList]);

  const kecamatanList = kecamatanData ?? [];

  useEffect(() => {
    kecamatanListRef.current = kecamatanList;
  }, [kecamatanList]);

  function clearFocusOverride() {
    if (!hasFocusOverride) {
      return;
    }

    setFocusParams({
      id: null,
      target: null,
    });

    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.delete("focusLat");
    nextUrl.searchParams.delete("focusLng");
    nextUrl.searchParams.delete("focusOpId");
    const nextSearch = nextUrl.searchParams.toString();
    window.history.replaceState({}, "", `${nextUrl.pathname}${nextSearch ? `?${nextSearch}` : ""}${nextUrl.hash}`);
  }

  function handleBoundaryFeatureSelect(selection: BoundaryFeatureSelection) {
    startTransition(() => {
      clearFocusOverride();

      if (selection.level === "kecamatan") {
        const nextKecamatanId = resolveBoundarySelectionKecamatanId({
          selection,
          kecamatanList: kecamatanListRef.current,
        });
        if (!nextKecamatanId) {
          return;
        }

        setStageState((current) =>
          drillIntoKecamatanStage({
            current,
            selection,
            kecamatanId: nextKecamatanId,
          }),
        );
        return;
      }

      setStageState((current) =>
        drillIntoDesaStage({
          current,
          selection,
        }),
      );
    });
  }

  function handleBackStage() {
    startTransition(() => {
      clearFocusOverride();
      setStageState((current) => stepBackPublicMapStage(current));
    });
  }

  function handleResetStage() {
    startTransition(() => {
      clearFocusOverride();
      setStageState(createDefaultPublicMapStageState());
      setViewportResetToken((current) => current + 1);
    });
  }

  function handleTaxTypeChange(selectedTaxType: string) {
    startTransition(() => {
      setStageState((current) => ({
        ...current,
        selectedTaxType,
      }));
    });
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background" data-testid="map-page">
      <div className="absolute left-3 top-3 z-[1000] sm:left-4 sm:top-4">
        <PublicMapStageHeader model={stageHeaderModel} onBack={handleBackStage} reducedMotion={reducedMotion} />
      </div>

      <div className="absolute right-3 top-3 z-[1000] flex items-center gap-2 sm:right-4 sm:top-4">
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-2xl border-white/75 bg-white/90 px-3 shadow-card"
          onClick={() => setBaseMap((current) => cycleBaseMap(current))}
          aria-label={`Ganti basemap, saat ini ${mapConfig.name}`}
          title={`Basemap: ${mapConfig.name}`}
        >
          <Layers3 className="h-4 w-4" aria-hidden="true" />
          <span className="font-mono text-[11px] uppercase tracking-[0.18em]">{mapConfig.buttonLabel}</span>
        </Button>

        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-11 w-11 rounded-2xl border-white/75 bg-white/90 shadow-card"
          onClick={handleResetStage}
          aria-label="Kembali ke peta OKU Selatan"
          title="Kembali ke peta OKU Selatan"
        >
          <Target className="h-4 w-4" aria-hidden="true" />
        </Button>

        <Link href="/backoffice">
          <Button
            type="button"
            size="icon"
            variant="outline"
            className="h-11 w-11 rounded-2xl border-white/75 bg-white/90 shadow-card"
            aria-label="Buka backoffice"
            title="Buka backoffice"
          >
            <Settings className="h-4 w-4" aria-hidden="true" />
          </Button>
        </Link>
      </div>

      {stageState.stage === "desa" ? (
        <div className="absolute bottom-20 left-3 right-3 z-[1000] sm:bottom-auto sm:left-4 sm:right-auto sm:top-[8.8rem]">
          <PublicMapTaxFilterChips
            options={taxTypeOptions}
            selectedTaxType={stageState.selectedTaxType}
            onSelect={handleTaxTypeChange}
            reducedMotion={reducedMotion}
          />
        </div>
      ) : null}

      {transitionPulseKey > 0 ? (
        <motion.div
          key={transitionPulseKey}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[920] bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.28)_0%,rgba(219,228,239,0.16)_38%,rgba(219,228,239,0)_72%)]"
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={reducedMotion ? undefined : { opacity: [0, 0.18, 0] }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.5, ease: "easeInOut" }}
        />
      ) : null}

      <MapContainer
        center={regionConfig.map.center}
        zoom={regionConfig.map.defaultZoom}
        className="h-full w-full"
        zoomControl={false}
      >
        <TileLayer attribution={mapConfig.attribution} url={mapConfig.url} maxZoom={mapConfig.maxZoom} />
        <MapBaseMapZoomController maxZoom={mapConfig.maxZoom} />
        <MapStageConstraintController
          kabupatenBounds={activeKabupatenBoundary?.bounds ?? null}
          stageBounds={activeStageConstraintBounds}
          stage={stageState.stage}
        />
        <MapStageViewportController
          stageState={stageState}
          kabupatenBounds={activeKabupatenBoundary?.bounds ?? null}
          baseMapMaxZoom={mapConfig.maxZoom}
          focusTarget={focusParams.target}
          reducedMotion={reducedMotion}
          resetToken={viewportResetToken}
        />
        <MapFocusController target={focusParams.target} zoom={Math.max(regionConfig.map.defaultZoom, 18)} reducedMotion={reducedMotion} />
        <ZoomControl position="bottomright" />
        <MapViewportTracker
          onChange={(nextBbox, nextZoom) => {
            setBbox(nextBbox);
            setZoom(nextZoom);
          }}
        />
        <MapDesaMarkerFocusController
          stageState={stageState}
          markers={visibleMarkerList}
          reducedMotion={reducedMotion}
          requiredZoom={activeViewportPlan.maxZoom}
          zoom={zoom}
        />

        {activeKabupatenGeoJson ? <PublicKabupatenMask boundary={activeKabupatenGeoJson} /> : null}

        {boundaryPresentation.showKabupaten && activeKabupatenGeoJson ? (
          <PublicBoundaryLayer
            level="kabupaten"
            boundary={activeKabupatenGeoJson}
            opacity={24}
            zoom={zoom}
            forceShowLabels
          />
        ) : null}

        {boundaryPresentation.showKecamatan && activeKecamatanGeoJson ? (
          <PublicBoundaryLayer
            level="kecamatan"
            boundary={activeKecamatanGeoJson}
            opacity={76}
            zoom={zoom}
            forceShowLabels
            onFeatureSelect={handleBoundaryFeatureSelect}
          />
        ) : null}

        {boundaryPresentation.showDesa && boundaryPresentation.desaMode === "scoped" && activeDesaGeoJson ? (
          <PublicBoundaryLayer
            level="desa"
            boundary={activeDesaGeoJson}
            opacity={68}
            zoom={zoom}
            forceShowLabels
            onFeatureSelect={handleBoundaryFeatureSelect}
          />
        ) : null}

        {boundaryPresentation.showDesa && boundaryPresentation.desaMode === "focused-scoped" && activeDesaGeoJson ? (
          <PublicBoundaryLayer
            level="desa"
            boundary={activeDesaGeoJson}
            opacity={72}
            zoom={zoom}
            forceShowLabels
            styleKey={stageState.selectedDesa?.name ?? "none"}
            styleOverride={({ featureName }) =>
              getFocusedDesaBoundaryLayerStyle({
                featureName,
                selectedFeatureName: stageState.selectedDesa?.name ?? "",
                opacity: 72,
              })
            }
            onFeatureSelect={handleBoundaryFeatureSelect}
          />
        ) : null}

        {visibleMarkerList.map((item) => (
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
            <Popup autoPan={false}>
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

      {isFetching ? (
        <div className="absolute bottom-4 left-3 z-[1000] flex items-center gap-2 rounded-2xl bg-white/92 px-3 py-2 font-mono text-xs shadow-card sm:left-4">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          memuat wilayah
        </div>
      ) : null}

      {showMarkerBadges ? (
        <div className="absolute bottom-4 right-3 z-[1000] flex flex-wrap justify-end gap-2 sm:right-4">
          <Badge className="bg-[#2d3436] text-white">{visibleMarkerList.length} {viewportLabel}</Badge>
          {stageState.selectedTaxType !== "all" ? <Badge variant="secondary">{stageState.selectedTaxType}</Badge> : null}
        </div>
      ) : null}

      {error ? (
        <div className="absolute bottom-4 left-3 z-[1000] max-w-[440px] rounded-2xl bg-red-100 p-3 font-mono text-xs text-red-800 shadow-card sm:left-4">
          {error instanceof Error ? error.message : "Terjadi kesalahan saat memuat peta"}
        </div>
      ) : null}

      {showEmptyViewportState ? (
        <div className="absolute bottom-4 left-3 z-[1000] rounded-2xl bg-white/92 p-3 font-mono text-xs shadow-card sm:left-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-3.5 w-3.5" aria-hidden="true" />
            Tidak ada objek pajak di desa ini untuk filter yang aktif.
          </div>
        </div>
      ) : null}
    </div>
  );
}
