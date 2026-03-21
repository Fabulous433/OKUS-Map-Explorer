import type { ChangeEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { FeatureGroup, GeoJSON, MapContainer, TileLayer, useMap } from "react-leaflet";
import { AlertTriangle, Layers3, Upload } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet-draw";
import "leaflet-draw/dist/leaflet.draw.css";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BOUNDARY_EDITOR_BASE_MAPS,
  DEFAULT_BOUNDARY_EDITOR_BASE_MAP_KEY,
  countBoundaryGeometryVertices,
  createEditableBoundaryGeometryParts,
  createBoundaryTopologyPanelModel,
  createTakeoverWarningModel,
  mergeEditableBoundaryGeometryParts,
  parseBoundaryUpload,
  simplifyBoundaryEditingGeometry,
  type DraftTopologySummary,
} from "@/lib/backoffice/boundary-editor-model";
import type { RegionBoundaryGeometry } from "@shared/region-boundary-admin";
import type { GeoJsonFeatureCollection } from "@shared/region-boundary";

function collectGeometryCoordinates(input: unknown, points: Array<[number, number]>) {
  if (!Array.isArray(input)) {
    return;
  }

  if (
    input.length >= 2 &&
    typeof input[0] === "number" &&
    typeof input[1] === "number"
  ) {
    points.push([input[1], input[0]]);
    return;
  }

  for (const item of input) {
    collectGeometryCoordinates(item, points);
  }
}

function getGeometryBounds(
  boundary: GeoJsonFeatureCollection | null,
  geometry: RegionBoundaryGeometry | null,
) {
  const points: Array<[number, number]> = [];

  if (boundary) {
    for (const feature of boundary.features) {
      collectGeometryCoordinates(feature.geometry.coordinates, points);
    }
  }

  if (geometry) {
    collectGeometryCoordinates(geometry.coordinates, points);
  }

  if (points.length === 0) {
    return L.latLngBounds([
      [-4.7, 103.8],
      [-4.2, 104.4],
    ]);
  }

  return L.latLngBounds(points);
}

function getFragmentStyle(
  fragment: DraftTopologySummary["fragments"][number],
  highlightedFragmentIds: Set<string>,
) {
  const isHighlighted =
    highlightedFragmentIds.size === 0 || highlightedFragmentIds.has(fragment.fragmentId);
  const fadedOpacity = isHighlighted ? 1 : 0.35;

  if (fragment.type === "takeover-area") {
    return {
      color: "#b91c1c",
      weight: isHighlighted ? 3.5 : 2,
      dashArray: "7 4",
      fillColor: "#f87171",
      fillOpacity: (fragment.status === "resolved" ? 0.18 : 0.24) * fadedOpacity,
      opacity: fadedOpacity,
    };
  }

  if (fragment.assignmentMode === "auto" && fragment.status === "resolved") {
    return {
      color: "#15803d",
      weight: isHighlighted ? 2.5 : 2,
      dashArray: "4 4",
      fillColor: "#4ade80",
      fillOpacity: 0.18 * fadedOpacity,
      opacity: fadedOpacity,
    };
  }

  return {
    color: "#c2410c",
    weight: isHighlighted ? 3 : 2,
    dashArray: "6 3",
    fillColor: "#fb923c",
    fillOpacity: 0.2 * fadedOpacity,
    opacity: fadedOpacity,
  };
}

function collectPolygonGeometryParts(
  geometry: GeoJSON.Geometry | null | undefined,
  parts: Array<{
    type: "Polygon";
    coordinates: unknown;
  }>,
) {
  if (!geometry) {
    return;
  }

  if (geometry.type === "Polygon") {
    parts.push({
      type: "Polygon",
      coordinates: geometry.coordinates,
    });
    return;
  }

  if (geometry.type !== "MultiPolygon") {
    return;
  }

  for (const coordinates of geometry.coordinates) {
    parts.push({
      type: "Polygon",
      coordinates,
    });
  }
}

function TopologyFragmentLayers(props: {
  topologyAnalysis: DraftTopologySummary;
  highlightFragmentIds?: string[];
}) {
  const highlightedFragmentIds = new Set(props.highlightFragmentIds ?? []);

  return (
    <>
      {props.topologyAnalysis.fragments.map((fragment) => (
        <GeoJSON
          key={fragment.fragmentId}
          data={
            {
              type: "Feature",
              properties: {
                fragmentId: fragment.fragmentId,
                fragmentType: fragment.type,
                assignmentMode: fragment.assignmentMode,
                status: fragment.status,
              },
              geometry: fragment.geometry,
            } as GeoJSON.Feature
          }
          style={getFragmentStyle(fragment, highlightedFragmentIds)}
        />
      ))}
    </>
  );
}

function EditableBoundaryLayer(props: {
  geometry: RegionBoundaryGeometry | null;
  boundary: GeoJsonFeatureCollection | null;
  onGeometryChange: (geometry: RegionBoundaryGeometry) => void;
}) {
  const map = useMap();
  const featureGroupRef = useRef<L.FeatureGroup | null>(null);
  const editableGeometryParts = useMemo(
    () => createEditableBoundaryGeometryParts(props.geometry),
    [props.geometry],
  );

  useEffect(() => {
    if (!featureGroupRef.current) {
      return;
    }

    const featureGroup = featureGroupRef.current;
    featureGroup.clearLayers();

    for (const editableGeometry of editableGeometryParts) {
      L.geoJSON(
        {
          type: "Feature",
          properties: {},
          geometry: editableGeometry,
        } as GeoJSON.Feature,
        {
          style: {
            color: "#b7410e",
            weight: 3,
            fillColor: "#f59e0b",
            fillOpacity: 0.22,
          },
        },
      ).eachLayer((layer) => {
        featureGroup.addLayer(layer);
      });
    }

    const bounds = getGeometryBounds(props.boundary, props.geometry);
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [24, 24] });
    }
  }, [editableGeometryParts, map, props.boundary, props.geometry]);

  useEffect(() => {
    if (!featureGroupRef.current) {
      return;
    }

    const drawControl = new L.Control.Draw({
      draw: {
        polyline: false,
        polygon: false,
        rectangle: false,
        circle: false,
        marker: false,
        circlemarker: false,
      },
      edit: {
        featureGroup: featureGroupRef.current,
        remove: false,
      },
    });

    const handleEdited = (event: L.LeafletEvent & { layers?: L.LayerGroup }) => {
      const nextParts: Array<{
        type: "Polygon";
        coordinates: unknown;
      }> = [];

      featureGroupRef.current?.eachLayer((layer) => {
        if (!("toGeoJSON" in layer) || typeof layer.toGeoJSON !== "function") {
          return;
        }

        const nextFeature = layer.toGeoJSON() as GeoJSON.Feature;
        collectPolygonGeometryParts(nextFeature.geometry, nextParts);
      });

      const nextGeometry = mergeEditableBoundaryGeometryParts(nextParts);
      if (nextGeometry) {
        props.onGeometryChange(nextGeometry);
      }
    };

    map.addControl(drawControl);
    map.on("draw:edited", handleEdited);

    return () => {
      map.off("draw:edited", handleEdited);
      map.removeControl(drawControl);
    };
  }, [map, props.onGeometryChange]);

  return <FeatureGroup ref={featureGroupRef} />;
}

export function BoundaryEditorMap(props: {
  boundary: GeoJsonFeatureCollection | null;
  selectedBoundaryKey: string;
  selectedDesaLabel: string;
  geometry: RegionBoundaryGeometry | null;
  onGeometryChange: (geometry: RegionBoundaryGeometry) => void;
  topologyAnalysis?: DraftTopologySummary | null;
  highlightFragmentIds?: string[];
}) {
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [baseMapKey, setBaseMapKey] = useState<keyof typeof BOUNDARY_EDITOR_BASE_MAPS>(
    DEFAULT_BOUNDARY_EDITOR_BASE_MAP_KEY,
  );
  const topologyModel = useMemo(
    () => (props.topologyAnalysis ? createBoundaryTopologyPanelModel(props.topologyAnalysis) : null),
    [props.topologyAnalysis],
  );
  const takeoverWarning = useMemo(
    () => (props.topologyAnalysis ? createTakeoverWarningModel(props.topologyAnalysis) : null),
    [props.topologyAnalysis],
  );

  const selectedFeatureCollection = useMemo(() => {
    if (!props.boundary || !props.selectedBoundaryKey) {
      return null;
    }

    return {
      type: "FeatureCollection" as const,
      features: props.boundary.features.filter(
        (feature) =>
          String((feature.properties as Record<string, unknown> | undefined)?.__boundaryKey ?? "") === props.selectedBoundaryKey,
      ),
    };
  }, [props.boundary, props.selectedBoundaryKey]);
  const editableGeometry = useMemo(
    () => simplifyBoundaryEditingGeometry(props.geometry),
    [props.geometry],
  );
  const editableVertexCount = countBoundaryGeometryVertices(editableGeometry);
  const originalVertexCount = countBoundaryGeometryVertices(props.geometry);
  const activeBaseMap = BOUNDARY_EDITOR_BASE_MAPS[baseMapKey];
  const affectedBoundaryKeys = useMemo(() => {
    const keys = new Set<string>();

    if (props.selectedBoundaryKey) {
      keys.add(props.selectedBoundaryKey);
    }

    if (!props.topologyAnalysis) {
      return keys;
    }

    for (const fragment of props.topologyAnalysis.fragments) {
      keys.add(fragment.sourceBoundaryKey);

      if (fragment.assignedBoundaryKey) {
        keys.add(fragment.assignedBoundaryKey);
      }

      for (const candidateBoundaryKey of fragment.candidateBoundaryKeys) {
        keys.add(candidateBoundaryKey);
      }
    }

    return keys;
  }, [props.selectedBoundaryKey, props.topologyAnalysis]);

  async function handleUploadChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    const result = parseBoundaryUpload(await file.text());
    if (!result.success) {
      setUploadError(result.message);
      return;
    }

    setUploadError(null);
    props.onGeometryChange(result.geometry);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-black/10 bg-white/80 px-4 py-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/45">Active geometry</p>
          <p className="mt-1 font-mono text-sm font-bold text-black/85">{props.selectedDesaLabel || "Pilih desa/kelurahan"}</p>
          <p className="mt-1 font-mono text-[11px] text-black/55">
            Handle edit: {editableVertexCount} titik
            {originalVertexCount > editableVertexCount ? ` dari ${originalVertexCount} vertex asli` : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label>
            <input
              type="file"
              accept=".geojson,application/geo+json,application/json"
              className="sr-only"
              onChange={handleUploadChange}
            />
            <Button type="button" variant="outline" className="font-mono text-xs font-bold" asChild>
              <span>
                <Upload className="mr-2 h-4 w-4" />
                Upload GeoJSON
              </span>
            </Button>
          </label>
          <label className="flex items-center gap-2 rounded-lg border border-black/10 bg-white px-3 py-2">
            <Layers3 className="h-4 w-4 text-black/60" />
            <span className="font-mono text-[11px] font-bold uppercase text-black/60">Basemap</span>
            <select
              value={baseMapKey}
              onChange={(event) => setBaseMapKey(event.target.value as keyof typeof BOUNDARY_EDITOR_BASE_MAPS)}
              className="bg-transparent font-mono text-xs font-bold"
            >
              <option value="esri">ESRI</option>
              <option value="osm">OSM</option>
              <option value="carto">CartoDB</option>
            </select>
          </label>
        </div>
      </div>

      {topologyModel ? (
        <div className="space-y-3 rounded-xl border border-black/10 bg-white/85 px-4 py-3" data-testid="boundary-editor-topology-panel">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/45">Topology status</p>
              <p className="mt-1 font-mono text-sm font-bold text-black/85">{topologyModel.headline}</p>
            </div>
            <Badge variant={topologyModel.canPreview ? "default" : "outline"}>{topologyModel.badgeLabel}</Badge>
          </div>
          <p className="font-mono text-[11px] text-black/55">
            {topologyModel.summaryLabel} · {topologyModel.unresolvedLabel} · {topologyModel.autoAssignedLabel} ·{" "}
            {topologyModel.manualAssignmentLabel}
          </p>
          {topologyModel.manualResolutionQueue.length > 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-amber-800">Manual resolution queue</p>
              <ul className="mt-2 space-y-1 font-mono text-xs text-amber-900">
                {topologyModel.manualResolutionQueue.map((block) => (
                  <li key={block.blockId}>
                    {block.blockId}: {block.candidateBoundaryKeys.join(", ")}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {topologyModel.informationalRows.length > 0 ? (
            <div className="rounded-lg border border-black/10 bg-[#faf8f2] px-3 py-2">
              <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-black/45">Informational rows</p>
              <ul className="mt-2 space-y-1 font-mono text-xs text-black/65">
                {topologyModel.informationalRows.map((row) => (
                  <li key={row}>{row}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {takeoverWarning?.visible ? (
            <div className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 font-mono text-xs text-rose-800">
              <p className="flex items-center gap-2 font-bold uppercase tracking-[0.18em]">
                <AlertTriangle className="h-4 w-4" />
                {takeoverWarning.title}
              </p>
              <p className="mt-2 leading-6">{takeoverWarning.message}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-black/10" data-testid="boundary-editor-map-live">
        <MapContainer
          center={[-4.5, 104.1]}
          zoom={11}
          className="h-[430px] w-full"
          zoomControl={true}
        >
          <TileLayer
            attribution={activeBaseMap.attribution}
            url={activeBaseMap.url}
            maxZoom={activeBaseMap.maxZoom}
          />
          {props.boundary ? (
            <GeoJSON
              data={props.boundary as GeoJSON.FeatureCollection}
              style={(feature) => {
                const isSelected =
                  String((feature?.properties as Record<string, unknown> | undefined)?.__boundaryKey ?? "") ===
                  props.selectedBoundaryKey;
                const boundaryKey = String((feature?.properties as Record<string, unknown> | undefined)?.__boundaryKey ?? "");
                const isAffected = affectedBoundaryKeys.has(boundaryKey);

                if (isSelected) {
                  return {
                    color: "#f97316",
                    weight: 1.2,
                    fillColor: "#f59e0b",
                    fillOpacity: 0.05,
                  };
                }

                if (isAffected) {
                  return {
                    color: "#c2410c",
                    weight: 1.15,
                    fillColor: "#fdba74",
                    fillOpacity: 0.14,
                  };
                }

                return {
                  color: "#7c6f64",
                  weight: 1,
                  fillColor: "#a8a29e",
                  fillOpacity: 0.08,
                };
              }}
            />
          ) : null}
          {selectedFeatureCollection ? (
            <GeoJSON
              data={selectedFeatureCollection as GeoJSON.FeatureCollection}
              style={{
                color: "#b7410e",
                weight: 2,
                fillOpacity: 0,
              }}
            />
          ) : null}
          {props.topologyAnalysis ? (
            <TopologyFragmentLayers
              topologyAnalysis={props.topologyAnalysis}
              highlightFragmentIds={props.highlightFragmentIds}
            />
          ) : null}
          <EditableBoundaryLayer
            boundary={props.boundary}
            geometry={props.geometry}
            onGeometryChange={props.onGeometryChange}
          />
        </MapContainer>
      </div>

      {uploadError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 font-mono text-xs text-red-700">
          {uploadError}
        </div>
      ) : null}
      {originalVertexCount > editableVertexCount ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 font-mono text-xs text-amber-800">
          Vertex edit disederhanakan sementara agar handle tidak terlalu rapat dan drag lebih mudah.
        </div>
      ) : null}
    </div>
  );
}

export default BoundaryEditorMap;
