import { regionBoundaryResponseSchema, type RegionBoundaryLevel, type RegionBoundaryResponse } from "@shared/region-boundary";

type FetchImpl = typeof fetch;

function buildBoundaryEndpoint(params: { level: RegionBoundaryLevel; kecamatanId?: string }) {
  const searchParams = new URLSearchParams();
  if (params.kecamatanId) {
    searchParams.set("kecamatanId", params.kecamatanId);
  }

  const query = searchParams.toString();
  if (!query) {
    return `/api/region-boundaries/active/${params.level}`;
  }

  return `/api/region-boundaries/active/${params.level}?${query}`;
}

async function readErrorMessage(response: Response) {
  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const payload = await response.json().catch(() => null);
    if (
      payload &&
      typeof payload === "object" &&
      "message" in payload &&
      typeof payload.message === "string" &&
      payload.message.trim().length > 0
    ) {
      return payload.message;
    }
  }

  const text = await response.text().catch(() => "");
  return text || response.statusText;
}

export async function loadActiveRegionBoundary(params: {
  level: RegionBoundaryLevel;
  kecamatanId?: string;
  signal?: AbortSignal;
  fetchImpl?: FetchImpl;
}): Promise<RegionBoundaryResponse> {
  const fetchImpl = params.fetchImpl ?? fetch;
  const response = await fetchImpl(buildBoundaryEndpoint(params), {
    credentials: "include",
    signal: params.signal,
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return regionBoundaryResponseSchema.parse(await response.json());
}
