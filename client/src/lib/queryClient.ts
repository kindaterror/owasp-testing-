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
// In Vite, only VITE_* vars are exposed to client code via import.meta.env. [web:294]
const API_BASE_URL =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_BASE_URL) ||
  "https://your-backend.onrender.com"; // fallback for dev or missing env

// Optional guard to fail fast if missing in production builds (requires rebuild to take effect). [web:296]
if (typeof window !== "undefined" && import.meta.env?.PROD && !import.meta.env?.VITE_API_BASE_URL) {
  // eslint-disable-next-line no-console
  console.warn("Missing VITE_API_BASE_URL; using fallback https://your-backend.onrender.com");
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
    ...(token ? { Authorization: `Bearer ${token}` } : {}), // server must allow Authorization in CORS [web:194]
    ...(options?.headers || {}),
  };

  // Allow absolute URLs; otherwise prefix with API base URL.
  if (!url.startsWith("http")) {
    if (!API_BASE_URL) throw new Error("API base URL is not configured");
  }
  const fullUrl = url.startsWith("http") ? url : API_BASE_URL + url;

  const res = await fetch(fullUrl, {
    method,
    // Avoid credentialed CORS for bearer-token flows. [web:174][web:193]
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
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;

    const headers: HeadersInit = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const url = queryKey[0] as string;
    const isAbsolute = url.startsWith("http");
    const finalUrl = isAbsolute ? url : `${API_BASE_URL}${url}`;

    const res = await fetch(finalUrl, {
      credentials: "omit", // non-credentialed CORS for reads too [web:174][web:193]
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
