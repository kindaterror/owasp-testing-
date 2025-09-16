// == IMPORTS & DEPENDENCIES ==
import { QueryClient, QueryFunction } from "@tanstack/react-query"; // [web:83]

// == HELPERS ==
async function safeParseJSON(res: Response): Promise<any> {
  const text = await res.text(); // [web:83]
  try {
    return text ? JSON.parse(text) : {}; // [web:83]
  } catch {
    return { raw: text }; // fallback if HTML or invalid JSON [web:83]
  }
}

function toHttpError(res: Response, body: any): Error {
  const msg = body?.message || res.statusText || "Unknown error"; // [web:83]
  const error = new Error(`${res.status} ${msg}`); // [web:83]
  (error as any).status = res.status; // [web:83]
  (error as any).body = body; // [web:83]
  return error; // [web:83]
}

// == API BASE URL ==
// Use env for production and localhost for dev; NEXT_PUBLIC_* is exposed to the browser in Next.js.
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "https://your-backend.onrender.com"; // [web:83][web:144]

// Optional guard to fail fast if missing in production builds.
if (
  typeof window !== "undefined" &&
  process.env.NODE_ENV === "production" &&
  !process.env.NEXT_PUBLIC_API_BASE_URL
) {
  // eslint-disable-next-line no-console
  console.warn("Missing NEXT_PUBLIC_API_BASE_URL; falling back to localhost"); // [web:83]
}

// == API REQUEST FUNCTION ==
export async function apiRequest<T = any>(
  method: string,
  url: string,
  data?: any,
  options?: RequestInit
): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null; // [web:83]

  const headers: HeadersInit = {
    "Content-Type": "application/json", // [web:83]
    ...(token ? { Authorization: `Bearer ${token}` } : {}), // [web:121]
    ...(options?.headers || {}), // [web:83]
  };

  // Allow absolute URLs; otherwise prefix with API base URL.
  if (!url.startsWith("http")) {
    if (!API_BASE_URL) throw new Error("API base URL is not configured"); // [web:83]
  }
  const fullUrl = url.startsWith("http") ? url : API_BASE_URL + url; // [web:83]

  const res = await fetch(fullUrl, {
    method, // [web:83]
    credentials: "include", // be sure backend CORS allows credentials & origin [web:121][web:120]
    headers, // [web:83]
    body: data ? JSON.stringify(data) : undefined, // [web:83]
    ...options, // [web:83]
  });

  const parsed = await safeParseJSON(res); // [web:83]
  if (!res.ok) throw toHttpError(res, parsed); // [web:83]

  return parsed as T; // [web:83]
}

// == QUERY FUNCTION ==
type UnauthorizedBehavior = "returnNull" | "throw"; // [web:83]

export const getQueryFn =
  <T>({ on401 }: { on401: UnauthorizedBehavior }): QueryFunction<T> =>
  async ({ queryKey }) => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("token") : null; // [web:83]

    const headers: HeadersInit = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}), // [web:121]
    };

    const url = queryKey[0] as string; // [web:83]
    const isAbsolute = url.startsWith("http"); // [web:83]
    const finalUrl = isAbsolute ? url : `${API_BASE_URL}${url}`; // [web:83]

    const res = await fetch(finalUrl, { credentials: "include", headers }); // [web:121][web:83]

    if (on401 === "returnNull" && res.status === 401) {
      return null as unknown as T; // [web:83]
    }

    const parsed = await safeParseJSON(res); // [web:83]
    if (!res.ok) throw toHttpError(res, parsed); // [web:83]

    return parsed as T; // [web:83]
  };

// == QUERY CLIENT CONFIGURATION ==
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }), // [web:83]
      refetchInterval: false, // [web:83]
      refetchOnWindowFocus: false, // [web:83]
      staleTime: Infinity, // [web:83]
      retry: false, // [web:83]
    },
    mutations: {
      retry: false, // [web:83]
    },
  },
}); // [web:83]
