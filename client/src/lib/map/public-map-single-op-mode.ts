export type PublicMapSingleOpUiModel = {
  showCompactStageShell: boolean;
  showTaxFilter: boolean;
  showOpRail: boolean;
  showMobileSheet: boolean;
  showResetButton: boolean;
  showZoomControl: boolean;
  lockMapInteractions: boolean;
};

export function isPublicMapSingleOpMode(params: {
  hasFocusOverride: boolean;
  focusId: number | null;
}) {
  return params.hasFocusOverride && params.focusId !== null;
}

export function createPublicMapSingleOpUiModel(singleOpMode: boolean): PublicMapSingleOpUiModel {
  return {
    showCompactStageShell: !singleOpMode,
    showTaxFilter: !singleOpMode,
    showOpRail: !singleOpMode,
    showMobileSheet: !singleOpMode,
    showResetButton: !singleOpMode,
    showZoomControl: !singleOpMode,
    lockMapInteractions: singleOpMode,
  };
}

export function resolvePublicMapFocusZoom(params: {
  singleOpMode: boolean;
  baseMapMaxZoom: number;
  defaultFocusZoom: number;
}) {
  return params.singleOpMode ? params.baseMapMaxZoom : params.defaultFocusZoom;
}
