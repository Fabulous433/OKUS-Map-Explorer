import { GeoJSON } from "react-leaflet";
import type { GeoJsonFeature, GeoJsonFeatureCollection, RegionBoundaryLevel } from "@shared/region-boundary";
import { getRegionBoundaryLayerStyle } from "@/lib/map/region-boundary-layer-style";
import {
  createKabupatenMaskBoundary,
  getBoundaryFeatureName,
  shouldShowBoundaryLabels,
} from "@/lib/map/public-boundary-layer-model";

type PublicBoundaryLayerProps = {
  level: RegionBoundaryLevel;
  boundary: GeoJsonFeatureCollection;
  opacity: number;
  zoom: number;
};

export function PublicBoundaryLayer(props: PublicBoundaryLayerProps) {
  const showLabels = shouldShowBoundaryLabels(props.level, props.zoom);

  return (
    <GeoJSON
      key={`${props.level}-${props.opacity}-${showLabels ? "labels" : "plain"}`}
      data={props.boundary as any}
      interactive={false}
      style={(feature) => {
        const featureName = getBoundaryFeatureName(props.level, feature as GeoJsonFeature);
        return getRegionBoundaryLayerStyle({
          level: props.level,
          featureName,
          opacity: props.opacity,
        });
      }}
      onEachFeature={(feature, layer) => {
        if (!showLabels) {
          return;
        }

        const featureName = getBoundaryFeatureName(props.level, feature as GeoJsonFeature);
        if (!featureName) {
          return;
        }

        layer.bindTooltip(featureName, {
          permanent: true,
          direction: "center",
          opacity: 0.95,
          className:
            "border-0 bg-transparent p-0 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-800 drop-shadow-[0_1px_2px_rgba(255,255,255,0.95)]",
        });
      }}
    />
  );
}

type PublicKabupatenMaskProps = {
  boundary: GeoJsonFeatureCollection;
};

export function PublicKabupatenMask(props: PublicKabupatenMaskProps) {
  const maskBoundary = createKabupatenMaskBoundary(props.boundary);

  return (
    <GeoJSON
      key="kabupaten-mask"
      data={maskBoundary as any}
      interactive={false}
      pathOptions={{
        color: "transparent",
        weight: 0,
        fillColor: "#dbe4ef",
        fillOpacity: 0.55,
      }}
    />
  );
}
