// == IMPORTS & DEPENDENCIES ==
import { QueryClient, QueryFunction } from "@tanstack/react-query";

// == HELPERS ==
async function safeParseJSON(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

function toHttpError(res: Response, body: any): Error {
  const msg = body?.message || res.statusText || "Unknown error";
  const error = new Error(`${res.status} ${msg}`);
  (error as any).status = res.status;
  (error as any).body = body;
  return error;
}

// == API BASE URL ==
// Build-time injected; never fallback silently in production.
const rawBase = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const API_BASE_URL = rawBase.replace(/\/+$/, ""); // trim trailing slash

if (typeof window !== "undefined" && process.env.NODE_ENV === "production") {
  if (!rawBase) {
    throw new Error("Missing NEXT_PUBLIC_API_BASE_URL in production build");
  }
}

// == API REQUEST FUNCTION ==
export async function apiRequest<T = any>(
  method: string,
  url: string,
  data?: any,
  options?: RequestInit
): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options?.headers || {}),
  };

  const fullUrl = url.startsWith("http")
    ? url
    : `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;

  const res = await fetch(fullUrl, {
    method,
    credentials: "omit", // bearer token only
    headers,
    body: data ? JSON.stringify(data) : undefined,
    ...options,
  });

  const parsed = await safeParseJSON(res);
  if (!res.ok) throw toHttpError(res, parsed);
  return parsed as T;
}

// == QUERY FUNCTION ==
type UnauthorizedBehavior = "returnNull" | "throw";

export const getQueryFn =
  <T>({ on401 }: { on401: UnauthorizedBehavior }): QueryFunction<T> =>
  async ({ queryKey }) => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const headers: HeadersInit = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };

    const key = queryKey as unknown as string;
    const finalUrl = key.startsWith("http")
      ? key
      : `${API_BASE_URL}${key.startsWith("/") ? "" : "/"}${key}`;

    const res = await fetch(finalUrl, { credentials: "omit", headers });
    if (on401 === "returnNull" && res.status === 401) {
      return null as unknown as T;
    }
    const parsed = await safeParseJSON(res);
    if (!res.ok) throw toHttpError(res, parsed);
    return parsed as T;
  };

// == QUERY CLIENT CONFIGURATION ==
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
