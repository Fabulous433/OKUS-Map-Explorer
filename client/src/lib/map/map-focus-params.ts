export type MapFocusParams = {
  id: number | null;
  target: {
    lat: number;
    lng: number;
  } | null;
};

function readOptionalNumber(params: URLSearchParams, key: string) {
  if (!params.has(key)) {
    return null;
  }

  const rawValue = params.get(key);
  const parsedValue = Number(rawValue);
  return Number.isFinite(parsedValue) ? parsedValue : null;
}

export function parseMapFocusParams(search: string): MapFocusParams {
  const params = new URLSearchParams(search);
  const lat = readOptionalNumber(params, "focusLat");
  const lng = readOptionalNumber(params, "focusLng");
  const id = readOptionalNumber(params, "focusOpId");

  return {
    id: id !== null && id > 0 ? id : null,
    target:
      lat !== null && lng !== null
        ? {
            lat,
            lng,
          }
        : null,
  };
}
