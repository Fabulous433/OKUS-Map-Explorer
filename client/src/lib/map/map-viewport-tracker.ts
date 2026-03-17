import type { MapViewportBbox } from "@/lib/map/map-data-source";

type LeafletBoundsLike = {
  getWest: () => number;
  getSouth: () => number;
  getEast: () => number;
  getNorth: () => number;
};

type LeafletViewportMapLike = {
  getBounds: () => LeafletBoundsLike;
  getZoom: () => number;
  on: (eventName: "moveend" | "zoomend", handler: () => void) => void;
  off: (eventName: "moveend" | "zoomend", handler: () => void) => void;
};

export function captureMapViewport(map: LeafletViewportMapLike) {
  const bounds = map.getBounds();

  return {
    bbox: {
      minLng: bounds.getWest(),
      minLat: bounds.getSouth(),
      maxLng: bounds.getEast(),
      maxLat: bounds.getNorth(),
    } satisfies MapViewportBbox,
    zoom: map.getZoom(),
  };
}

export function bindMapViewportTracking(params: {
  map: LeafletViewportMapLike;
  onChange: (bbox: MapViewportBbox, zoom: number) => void;
}) {
  const emitViewport = () => {
    const viewport = captureMapViewport(params.map);
    params.onChange(viewport.bbox, viewport.zoom);
  };

  emitViewport();
  params.map.on("moveend", emitViewport);
  params.map.on("zoomend", emitViewport);

  return () => {
    params.map.off("moveend", emitViewport);
    params.map.off("zoomend", emitViewport);
  };
}
