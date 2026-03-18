import { GeoJSON } from "react-leaflet";
import type { GeoJsonFeature, GeoJsonFeatureCollection, RegionBoundaryLevel } from "@shared/region-boundary";
import { getRegionBoundaryLayerStyle, type RegionBoundaryLayerStyle } from "@/lib/map/region-boundary-layer-style";
import {
  createBoundaryFeatureSelection,
  createKabupatenMaskBoundary,
  type BoundaryFeatureSelection,
  getBoundaryFeatureName,
  shouldShowBoundaryLabels,
} from "@/lib/map/public-boundary-layer-model";

type PublicBoundaryLayerProps = {
  level: RegionBoundaryLevel;
  boundary: GeoJsonFeatureCollection;
  opacity: number;
  zoom: number;
  forceShowLabels?: boolean;
  onFeatureSelect?: (selection: BoundaryFeatureSelection) => void;
  styleKey?: string;
  styleOverride?: (params: {
    feature: GeoJsonFeature;
    featureName: string;
    level: RegionBoundaryLevel;
    baseStyle: RegionBoundaryLayerStyle;
  }) => RegionBoundaryLayerStyle;
};

export function PublicBoundaryLayer(props: PublicBoundaryLayerProps) {
  const showLabels = props.forceShowLabels || shouldShowBoundaryLabels(props.level, props.zoom);
  const clickableLevel = props.level === "kecamatan" || props.level === "desa" ? props.level : null;

  return (
    <GeoJSON
      key={`${props.level}-${props.opacity}-${showLabels ? "labels" : "plain"}-${props.styleKey ?? "default"}`}
      data={props.boundary as any}
      interactive={clickableLevel !== null && typeof props.onFeatureSelect === "function"}
      style={(feature) => {
        const typedFeature = feature as GeoJsonFeature;
        const featureName = getBoundaryFeatureName(props.level, typedFeature);
        const baseStyle = getRegionBoundaryLayerStyle({
          level: props.level,
          featureName,
          opacity: props.opacity,
        });
        if (!props.styleOverride) {
          return baseStyle;
        }
        return props.styleOverride({
          feature: typedFeature,
          featureName,
          level: props.level,
          baseStyle,
        });
      }}
      onEachFeature={(feature, layer) => {
        if (clickableLevel && props.onFeatureSelect) {
          layer.on("click", () => {
            props.onFeatureSelect?.(
              createBoundaryFeatureSelection({
                level: clickableLevel,
                feature: feature as GeoJsonFeature,
              }),
            );
          });
        }

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
