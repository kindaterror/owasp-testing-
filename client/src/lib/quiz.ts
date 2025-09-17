// src/lib/quiz.ts

export type QuizMode = "retry" | "straight";

export interface SubmitQuizAttemptOptions {
  bookId: number;
  pageId?: number | null;
  scoreCorrect: number;
  scoreTotal: number;
  mode?: QuizMode;        // falls back to "retry"
  durationSec?: number;   // falls back to 0
}

/** Shape of one attempt from the API (we only list fields we actually use) */
export interface QuizAttempt {
  bookId: number;
  pageId?: number | null;
  percentage: number | null;
  attemptNumber?: number | null;
  mode?: QuizMode | null;
  createdAt?: string | null;
}

export type QuizStats = {
  attempts: number;
  latestPct: number | null;
  latestMode: QuizMode | null;
  bestPct: number | null;
  lastAt: string | null;
};

export type QuizStatsByBook = Record<number, QuizStats>;

// Build absolute API URLs using the same env as the query client
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL || "").replace(/\/+$/, "");
function apiUrl(path: string) {
  return `${API_BASE_URL}${path.startsWith("/") ? "" : "/"}${path}`;
}

/**
 * Submit a quiz attempt to the API.
 * Calculates percentage on the client to avoid trusting the caller.
 */
export async function submitQuizAttempt(opts: SubmitQuizAttemptOptions) {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not authenticated: missing token");

  // basic guards
  const bookId = Number(opts.bookId);
  const pageId = opts.pageId == null ? null : Number(opts.pageId);
  const scoreCorrect = Math.max(0, Number(opts.scoreCorrect));
  const scoreTotal = Math.max(0, Number(opts.scoreTotal));
  const durationSec = Math.max(0, Number(opts.durationSec ?? 0));
  const mode: QuizMode = opts.mode === "straight" ? "straight" : "retry";

  const percentage = scoreTotal > 0 ? Math.round((scoreCorrect / scoreTotal) * 100) : 0;

  const res = await fetch(apiUrl("/api/quiz-attempts"), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    credentials: "omit",
    body: JSON.stringify({
      bookId,
      pageId,
      scoreCorrect,
      scoreTotal,
      percentage,
      mode,
      durationSec,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to save quiz attempt: ${res.status} ${text}`);
  }

  // shape: { success: true, attempt: {...} } from the API
  return res.json() as Promise<any>;
}

/**
 * Fetch attempts (student can see their own; teacher/admin may pass userId).
 * NOTE: the server may ignore unknown params like `limit`.
 */
export async function fetchQuizAttempts(params?: {
  userId?: number;  // admin/teacher filter
  bookId?: number;
  pageId?: number;
  limit?: number;
}) {
  const token = localStorage.getItem("token");
  if (!token) throw new Error("Not authenticated: missing token");

  const qs = new URLSearchParams();
  if (params?.userId != null) qs.set("userId", String(params.userId));
  if (params?.bookId != null) qs.set("bookId", String(params.bookId));
  if (params?.pageId != null) qs.set("pageId", String(params.pageId));
  if (params?.limit != null) qs.set("limit", String(params.limit));

  const url = apiUrl(`/api/quiz-attempts${qs.toString() ? `?${qs.toString()}` : ""}`);

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    credentials: "omit",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to fetch quiz attempts: ${res.status} ${text}`);
  }

  return res.json() as Promise<{ success: boolean; attempts: QuizAttempt[] }>;
}

/**
 * Summarize attempts by book:
 *  - attempts: total attempts for that book
 *  - latestPct/latestMode: newest attempt (prefers createdAt, falls back to attemptNumber)
 *  - bestPct: max percentage ever for that book
 *  - lastAt: ISO date/time of latest attempt
 */
export function summarizeAttemptsByBook(attempts: QuizAttempt[]): QuizStatsByBook {
  const byBook: QuizStatsByBook = {};

  for (const a of attempts) {
    const bId = a.bookId;
    if (!byBook[bId]) {
      byBook[bId] = {
        attempts: 0,
        latestPct: null,
        latestMode: null,
        bestPct: null,
        lastAt: null,
      };
    }
    const s = byBook[bId];
    s.attempts += 1;

    // Update best score
    if (typeof a.percentage === "number") {
      s.bestPct = Math.max(s.bestPct ?? 0, a.percentage);
    }

    // Decide if this attempt is newer than the current "latest"
    const curTime = s.lastAt ? new Date(s.lastAt).getTime() : 0;
    const newTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;

    const isNewer =
      newTime > curTime ||
      // fallback: if times are equal/unknown, prefer higher attemptNumber
      ((a.attemptNumber ?? 0) > 0 && (a.attemptNumber ?? 0) >= s.attempts /* rough fallback */);

    if (isNewer) {
      s.lastAt = a.createdAt ?? s.lastAt;
      s.latestPct = a.percentage ?? null;
      s.latestMode = (a.mode ?? null) as QuizMode | null;
    }
  }

  return byBook;
}

/** Convenience helper: get summarized stats for one specific book id */
export function summarizeAttemptsForBook(
  attempts: QuizAttempt[],
  bookId: number
): QuizStats | undefined {
  const map = summarizeAttemptsByBook(attempts);
  return map[bookId];
}
