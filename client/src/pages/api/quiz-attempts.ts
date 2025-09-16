// == IMPORTS & DEPENDENCIES ==
import jwt from "jsonwebtoken";
import { db } from "@db";
import * as schema from "@shared/schema";
import { and, desc, eq } from "drizzle-orm";

// == CONSTANTS ==
const JWT_SECRET = process.env.JWT_SECRET || "adonai_grace_school_secret";

// == TYPE DEFINITIONS ==
interface JWTPayload {
  userId: number;
  role: "student" | "teacher" | "admin";
  username: string;
  iat?: number;
  exp?: number;
}

// == AUTH ==
function getUserFromReq(req: any): JWTPayload {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) throw new Error("Authentication required");
  try {
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch {
    throw new Error("Invalid or expired token");
  }
}

// == UTILS ==
const toInt = (v: any, def?: number) => {
  const n = typeof v === "string" ? parseInt(v, 10) : Number(v);
  return Number.isFinite(n) ? n : def;
};

const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

// == MAIN HANDLER ==
export default async function handler(req: any, res: any) {
  console.log(`🧪 API /api/quiz-attempts method=${req.method}`);

  // CORS preflight (if needed)
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "content-type,authorization");
    return res.status(204).end();
  }

  try {
    if (req.method === "POST") return await handlePost(req, res);
    if (req.method === "GET") return await handleGet(req, res);
    return res.status(405).json({ message: "Method not allowed" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status =
      msg === "Authentication required" || msg === "Invalid or expired token"
        ? 401
        : 500;
    console.error("❌ /api/quiz-attempts error:", err);
    return res.status(status).json({ success: false, message: msg });
  }
}

// == POST: CREATE ATTEMPT ==
async function handlePost(req: any, res: any) {
  const user = getUserFromReq(req);

  // Only students/teachers/admin can write attempts (teachers/admin also for testing/imports)
  if (!["student", "teacher", "admin"].includes(user.role)) {
    return res.status(403).json({ message: "Access denied" });
  }

  // Accept both camelCase and snake_case
  const body = req.body || {};
  const bookIdRaw = body.bookId ?? body.book_id;
  const pageIdRaw = body.pageId ?? body.page_id;
  const correctRaw = body.scoreCorrect ?? body.score_correct;
  const totalRaw = body.scoreTotal ?? body.score_total;
  const pctRaw = body.percentage ?? body.percent ?? body.percentage_pct;
  const modeRaw = body.mode;
  const durationRaw = body.durationSec ?? body.duration_sec ?? body.seconds;
  const userIdRaw = body.userId ?? body.user_id;

  // Resolve actual owner of the attempt
  const ownerUserId =
    user.role === "student" ? user.userId : toInt(userIdRaw, user.userId)!;

  // Basic validation
  if (bookIdRaw == null || correctRaw == null || totalRaw == null) {
    return res.status(400).json({
      message:
        "Missing required fields: bookId, scoreCorrect, scoreTotal are required",
    });
  }

  const safeBookId = toInt(bookIdRaw)!;
  const safePageId =
    pageIdRaw === undefined || pageIdRaw === null ? null : toInt(pageIdRaw)!;
  const safeCorrect = toInt(correctRaw)!;
  const safeTotal = toInt(totalRaw)!;

  if (
    !Number.isFinite(safeBookId) ||
    (safePageId !== null && !Number.isFinite(safePageId)) ||
    !Number.isFinite(safeCorrect) ||
    !Number.isFinite(safeTotal) ||
    safeTotal <= 0 ||
    safeCorrect < 0 ||
    safeCorrect > safeTotal
  ) {
    return res.status(400).json({ message: "Invalid score/book/page values" });
  }

  const safeMode: "retry" | "straight" =
    modeRaw === "straight" ? "straight" : "retry";

  // compute percentage if absent; clamp 0..100; round to integer
  const computedPct = clamp(
    Math.round(
      typeof pctRaw === "number"
        ? pctRaw
        : (safeCorrect / safeTotal) * 100
    ),
    0,
    100
  );

  const safeDuration = clamp(toInt(durationRaw ?? 0, 0)!, 0, 86400); // cap at 24h for sanity

  // Determine next attempt number for this (user, book[, page])
  // If pageId is provided, attempt numbering is per (user,book,page).
  // If pageId is null, attempts are per (user,book).
  const existingLatest = await db.query.quizAttempts.findFirst({
    where: and(
      eq(schema.quizAttempts.userId, ownerUserId),
      eq(schema.quizAttempts.bookId, safeBookId),
      ...(safePageId === null
        ? []
        : [eq(schema.quizAttempts.pageId, safePageId)])
    ),
    orderBy: [desc(schema.quizAttempts.attemptNumber)],
  });

  const nextAttemptNumber = (existingLatest?.attemptNumber ?? 0) + 1;

  // Insert
  const [inserted] = await db
    .insert(schema.quizAttempts)
    .values({
      userId: ownerUserId,
      bookId: safeBookId,
      pageId: safePageId,
      scoreCorrect: safeCorrect,
      scoreTotal: safeTotal,
      percentage: computedPct,
      mode: safeMode,
      attemptNumber: nextAttemptNumber,
      durationSec: safeDuration,
    })
    .returning();

  console.log("✅ Quiz attempt saved:", inserted);

  return res.status(201).json({
    success: true,
    attempt: inserted,
  });
}

// == GET: LIST/READ ATTEMPTS ==
async function handleGet(req: any, res: any) {
  const user = getUserFromReq(req);

  // Query params (camel + snake)
  const qp = req.query || {};
  const userIdQ = qp.userId ?? qp.user_id;
  const bookIdQ = qp.bookId ?? qp.book_id;
  const pageIdQ = qp.pageId ?? qp.page_id;
  const latestPerBookQ = qp.latestPerBook ?? qp.latest_per_book;

  const filterUserId =
    user.role === "student"
      ? user.userId
      : userIdQ != null
      ? toInt(userIdQ)
      : undefined;
  const filterBookId = bookIdQ != null ? toInt(bookIdQ) : undefined;
  const filterPageId = pageIdQ != null ? toInt(pageIdQ) : undefined;
  const onlyLatestPerBook =
    String(latestPerBookQ ?? "").toLowerCase() === "true";

  // Students can only read their own attempts
  if (
    user.role === "student" &&
    filterUserId &&
    filterUserId !== user.userId
  ) {
    return res.status(403).json({ message: "Access denied" });
  }

  // Build where filters
  const whereClauses: any[] = [];
  if (filterUserId !== undefined) {
    whereClauses.push(eq(schema.quizAttempts.userId, filterUserId));
  } else if (user.role === "student") {
    // Always pin to current student if they didn’t pass userId
    whereClauses.push(eq(schema.quizAttempts.userId, user.userId));
  }

  if (filterBookId !== undefined) {
    whereClauses.push(eq(schema.quizAttempts.bookId, filterBookId));
  }
  if (filterPageId !== undefined) {
    whereClauses.push(eq(schema.quizAttempts.pageId, filterPageId));
  }

  const attempts = await db.query.quizAttempts.findMany({
    where: whereClauses.length ? (and as any)(...whereClauses) : undefined,
    orderBy: [desc(schema.quizAttempts.createdAt)],
    with: {
      book: {
        columns: {
          id: true,
          title: true,
          type: true,
          subject: true,
          grade: true,
          coverImage: true,
        },
      },
      page: {
        columns: {
          id: true,
          pageNumber: true,
          title: true,
        },
      },
      user: {
        columns: {
          id: true,
          firstName: true,
          lastName: true,
          username: true,
          email: true,
          gradeLevel: true,
        },
      },
    },
  });

  let payload = attempts;

  // Reduce to latest per book (per user) if requested
  if (onlyLatestPerBook) {
    const key = (a: any) => `${a.userId}:${a.bookId}`;
    const latestMap = new Map<string, any>();

    for (const a of attempts) {
      const k = key(a);
      const current = latestMap.get(k);
      if (!current) {
        latestMap.set(k, a);
      } else {
        // Prefer newer based on attemptNumber then createdAt
        if (
          (a.attemptNumber ?? 0) > (current.attemptNumber ?? 0) ||
          new Date(a.createdAt).getTime() >
            new Date(current.createdAt).getTime()
        ) {
          latestMap.set(k, a);
        }
      }
    }

    payload = Array.from(latestMap.values());
  }

  return res.status(200).json({
    success: true,
    count: payload.length,
    attempts: payload,
  });
}