// == IMPORTS & DEPENDENCIES ==
import { QueryClient, QueryFunction } from "@tanstack/react-query";

// == HELPERS ==
async function safeParseJSON(res: Response): Promise<any> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text }; // fallback if HTML or invalid JSON
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
// Use env for production and localhost for dev; NEXT_PUBLIC_* is exposed to the browser.
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://your-backend.onrender.com";

// Optional guard to fail fast if missing in production builds.
if (
  typeof window !== "undefined" &&
  process.env.NODE_ENV === "production" &&
  !process.env.NEXT_PUBLIC_API_BASE_URL
) {
  // eslint-disable-next-line no-console
  console.warn("Missing NEXT_PUBLIC_API_BASE_URL; falling back to localhost");
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

  // Allow absolute URLs; otherwise prefix with API base URL.
  if (!url.startsWith("http")) {
    if (!API_BASE_URL) throw new Error("API base URL is not configured");
  }
  const fullUrl = url.startsWith("http") ? url : API_BASE_URL + url;

  const res = await fetch(fullUrl, {
    method,
    // Important: do NOT send cookies for bearer-token auth to avoid credentialed CORS
    // which requires Allow-Credentials and stricter preflights.
    credentials: "omit",
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
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null;

    const headers: HeadersInit = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const url = queryKey as string;
    const isAbsolute = url.startsWith("http");
    const finalUrl = isAbsolute ? url : `${API_BASE_URL}${url}`;

    const res = await fetch(finalUrl, {
      // Avoid credentialed CORS for bearer-token reads as well
      credentials: "omit",
      headers,
    });

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
