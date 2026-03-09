import { QueryClient, QueryFunction } from "@tanstack/react-query";

export type ApiFieldError = {
  field: string;
  message: string;
};

export class ApiError extends Error {
  status: number;
  fieldErrors: ApiFieldError[];
  body: unknown;

  constructor(params: {
    status: number;
    message: string;
    fieldErrors?: ApiFieldError[];
    body?: unknown;
  }) {
    super(params.message);
    this.name = "ApiError";
    this.status = params.status;
    this.fieldErrors = params.fieldErrors ?? [];
    this.body = params.body;
  }
}

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const contentType = res.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      const body = await res.json().catch(() => null);
      const message =
        body && typeof body === "object" && typeof (body as { message?: unknown }).message === "string"
          ? (body as { message: string }).message
          : res.statusText;
      const fieldErrors =
        body && typeof body === "object" && Array.isArray((body as { fieldErrors?: unknown[] }).fieldErrors)
          ? ((body as { fieldErrors: ApiFieldError[] }).fieldErrors ?? []).filter(
              (item) =>
                item &&
                typeof item === "object" &&
                typeof (item as { field?: unknown }).field === "string" &&
                typeof (item as { message?: unknown }).message === "string",
            )
          : [];

      throw new ApiError({
        status: res.status,
        message,
        fieldErrors,
        body,
      });
    }

    const text = (await res.text()) || res.statusText;
    throw new ApiError({
      status: res.status,
      message: text,
      body: text,
    });
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
