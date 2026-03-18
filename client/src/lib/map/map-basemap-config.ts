export const PUBLIC_BASE_MAPS = {
  osm: {
    name: "OpenStreetMap",
    buttonLabel: "OSM",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
  },
  carto: {
    name: "CartoDB Positron",
    buttonLabel: "Carto",
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution: '&copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 20,
  },
  esri: {
    name: "ESRI Satellite",
    buttonLabel: "ESRI Sat",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "&copy; Esri",
    maxZoom: 16,
  },
} as const;

export type BaseMapKey = keyof typeof PUBLIC_BASE_MAPS;
