import assert from "node:assert/strict";

import type { MapViewportBbox } from "../../client/src/lib/map/map-data-source";

async function loadMapViewportTrackerModule() {
  try {
    return await import("../../client/src/lib/map/map-viewport-tracker.ts");
  } catch {
    return null;
  }
}

function createBounds(values: MapViewportBbox) {
  return {
    getWest: () => values.minLng,
    getSouth: () => values.minLat,
    getEast: () => values.maxLng,
    getNorth: () => values.maxLat,
  };
}

async function run() {
  const mapViewportTrackerModule = await loadMapViewportTrackerModule();
  assert.ok(mapViewportTrackerModule, "module tracker viewport peta harus tersedia");

  const { captureMapViewport, bindMapViewportTracking } = mapViewportTrackerModule as {
    captureMapViewport?: (map: {
      getBounds: () => {
        getWest: () => number;
        getSouth: () => number;
        getEast: () => number;
        getNorth: () => number;
      };
      getZoom: () => number;
    }) => { bbox: MapViewportBbox; zoom: number };
    bindMapViewportTracking?: (params: {
      map: {
        getBounds: () => {
          getWest: () => number;
          getSouth: () => number;
          getEast: () => number;
          getNorth: () => number;
        };
        getZoom: () => number;
        on: (eventName: "moveend" | "zoomend", handler: () => void) => void;
        off: (eventName: "moveend" | "zoomend", handler: () => void) => void;
      };
      onChange: (bbox: MapViewportBbox, zoom: number) => void;
    }) => () => void;
  };

  assert.equal(typeof captureMapViewport, "function", "helper capture viewport wajib diexport");
  assert.equal(typeof bindMapViewportTracking, "function", "helper bind tracker viewport wajib diexport");

  const events = new Map<"moveend" | "zoomend", Set<() => void>>();
  const currentState = {
    bbox: {
      minLng: 103.91,
      minLat: -4.61,
      maxLng: 104.07,
      maxLat: -4.48,
    },
    zoom: 13,
  };

  const map = {
    getBounds: () => createBounds(currentState.bbox),
    getZoom: () => currentState.zoom,
    on: (eventName: "moveend" | "zoomend", handler: () => void) => {
      if (!events.has(eventName)) {
        events.set(eventName, new Set());
      }

      events.get(eventName)!.add(handler);
    },
    off: (eventName: "moveend" | "zoomend", handler: () => void) => {
      events.get(eventName)?.delete(handler);
    },
  };

  const captured = captureMapViewport!(map);
  assert.deepEqual(
    captured,
    {
      bbox: currentState.bbox,
      zoom: currentState.zoom,
    },
    "helper capture viewport harus membaca bbox + zoom dari map Leaflet-like",
  );

  const emitted: Array<{ bbox: MapViewportBbox; zoom: number }> = [];
  const stopTracking = bindMapViewportTracking!({
    map,
    onChange: (bbox, zoom) => {
      emitted.push({ bbox, zoom });
    },
  });

  assert.deepEqual(
    emitted,
    [
      {
        bbox: currentState.bbox,
        zoom: currentState.zoom,
      },
    ],
    "tracker viewport harus mengirim snapshot awal tanpa menunggu interaksi map",
  );
  assert.equal(events.get("moveend")?.size, 1, "tracker harus subscribe moveend");
  assert.equal(events.get("zoomend")?.size, 1, "tracker harus subscribe zoomend");

  currentState.bbox = {
    minLng: 103.95,
    minLat: -4.6,
    maxLng: 104.1,
    maxLat: -4.44,
  };
  currentState.zoom = 14;
  events.get("moveend")?.forEach((handler) => handler());

  assert.deepEqual(
    emitted.at(-1),
    {
      bbox: currentState.bbox,
      zoom: currentState.zoom,
    },
    "moveend harus mengirim viewport terbaru",
  );

  currentState.bbox = {
    minLng: 103.97,
    minLat: -4.57,
    maxLng: 104.08,
    maxLat: -4.46,
  };
  currentState.zoom = 15;
  events.get("zoomend")?.forEach((handler) => handler());

  assert.deepEqual(
    emitted.at(-1),
    {
      bbox: currentState.bbox,
      zoom: currentState.zoom,
    },
    "zoomend harus mengirim bbox + zoom terbaru",
  );

  stopTracking();
  assert.equal(events.get("moveend")?.size ?? 0, 0, "cleanup harus melepas listener moveend");
  assert.equal(events.get("zoomend")?.size ?? 0, 0, "cleanup harus melepas listener zoomend");
}

run()
  .then(() => {
    console.log("[integration] map-viewport-tracker: PASS");
  })
  .catch((error) => {
    console.error("[integration] map-viewport-tracker: FAIL");
    console.error(error);
    process.exitCode = 1;
  });
