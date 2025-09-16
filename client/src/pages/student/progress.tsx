import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import Header from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BookOpen,
  Clock,
  BarChart3,
  ChevronRight,
  ChevronLeft,
  ArrowUpRight,
  TrendingUp,
  GraduationCap,
  Target,
  Star,
  Loader2,
  Award,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type QuizAttempt = {
  userId: number;
  bookId: number;
  pageId?: number | null;
  scoreCorrect?: number | null;
  scoreTotal?: number | null;
  percentage?: number | null;
  mode?: "retry" | "straight" | string;
  attemptNumber?: number | null;
  durationSec?: number | null;
  createdAt?: string;
};

type QuizSession = {
  bookId: number;
  startAt: number;
  endAt: number;
  totalCorrect: number;
  totalTotal: number;
  percentage: number;
  mode: "retry" | "straight";
};

type EarnedBadge = {
  id: number;
  userId: number;
  badgeId: number;
  bookId?: number | null;
  awardedAt?: string;
  note?: string | null;
  badge?: {
    id: number;
    name: string;
    description?: string | null;
    iconUrl?: string | null;
    iconPublicId?: string | null;
  };
  book?: {
    id: number;
    title?: string;
    coverImage?: string | null;
    coverPublicId?: string | null;
  };
};

const SESSION_GAP_SEC = 120; // how far apart rows must be to count as a new attempt

export default function StudentProgress() {
  const [activeTab, setActiveTab] = useState("overview");

  const formatSubject = (subject: string) => {
    if (!subject) return null;
    const map: Record<string, string> = {
      "filipino-literature": "📚 Filipino Literature",
      "philippine-folklore": "🏛️ Philippine Folklore",
      "reading-comprehension": "📖 Reading Comprehension",
      "creative-writing": "✍️ Creative Writing",
      "general-education": "🎓 General Education",
    };
    return map[subject] || subject;
  };

  // Progress
  const { data: progressData, isLoading } = useQuery({
    queryKey: ["/api/progress"],
    queryFn: async () => {
      const response = await fetch("/api/progress", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!response.ok) throw new Error("Failed to fetch progress");
      return response.json();
    },
  });

  // Quiz attempts (row-level)
  const { data: quizAttemptsData } = useQuery({
    queryKey: ["/api/quiz-attempts"],
    queryFn: async () => {
      const res = await fetch("/api/quiz-attempts", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch quiz attempts");
      return res.json();
    },
  });


  // 🏅 Earned badges for the current student
  // If your backend exposes a different route (e.g. /api/users/me/earned-badges),
  // just change the URL below — the rest will work as-is.
// 🏅 Earned badges for the current student (resilient to route differences)
// --- Earned badges for the logged-in student ---
// --- Earned badges (resilient, always normalizes to an array) ---
// --- Earned Badges Query ---
const {
  data: earnedBadgesPayload,
  isLoading: badgesLoading,
  error: badgesError,
} = useQuery({
  queryKey: ["earned-badges"],
  enabled: !!localStorage.getItem("token"),
  queryFn: async () => {
    const headers = { Authorization: `Bearer ${localStorage.getItem("token")}` };

    // 1) Fetch current user to get ID
    let meRes = await fetch("/api/user/me", { headers });
    let me: any = null;

    if (meRes.ok) {
      const j = await meRes.json();
      me = j?.user ?? j; // your backend wraps user in { success, user }
    } else {
      // fallback: /api/auth/user
      meRes = await fetch("/api/auth/user", { headers });
      if (!meRes.ok) throw new Error("Unable to fetch current user");
      const j = await meRes.json();
      me = j?.user ?? j;
    }

    const userId = me?.id;
    if (!userId) throw new Error("No user id found");

    // 2) Fetch earned badges for this user
    const res = await fetch(`/api/users/${userId}/badges`, { headers });
    if (!res.ok) throw new Error("Unable to fetch earned badges");
    const data = await res.json();

    // 3) Normalize return shapes → always an array
    return Array.isArray(data)
      ? data
      : Array.isArray(data?.earnedBadges)
      ? data.earnedBadges
      : Array.isArray(data?.earned_badges)
      ? data.earned_badges
      : [];
  },
});

// --- Always an array from here ---
const earnedBadges: EarnedBadge[] = Array.isArray(earnedBadgesPayload)
  ? earnedBadgesPayload
  : [];

  // ----------------- helpers -----------------
  const getUniqueProgress = (progressArray: any[]) => {
    if (!progressArray) return [];
    return progressArray.reduce((unique: any[], progress: any) => {
      const i = unique.findIndex((p) => p.bookId === progress.bookId);
      if (i === -1) unique.push(progress);
      else if (new Date(progress.lastReadAt) > new Date(unique[i].lastReadAt))
        unique[i] = progress;
      return unique;
    }, []);
  };

  const formatReadingTime = (totalSeconds: number) => {
    if (!totalSeconds || totalSeconds === 0) return "0:00:00";
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };


// Cloudinary env (supports Next/Vite variants)
const CLOUD =
  import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ||
  import.meta.env.VITE_PUBLIC_CLOUDINARY_CLOUD_NAME ||
  (typeof process !== "undefined" ? process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME : undefined);

// Badge icon (Cloudinary-aware)
const getBadgeIconUrl = (badge: any, w = 64) => {
  if (!badge) return null;
  const direct = badge.iconUrl ?? badge.icon_url ?? null;
  if (direct) return direct;
  const publicId = badge.iconPublicId ?? badge.icon_public_id ?? null;
  if (publicId && CLOUD) {
    return `https://res.cloudinary.com/${CLOUD}/image/upload/c_fill,w=${w},h=${w},q_auto,f_auto/${publicId}`;
  }
  return null;
};

  // Build a quick map of bookId -> title from progress for cases where badges don't join books
  const bookTitleById = useMemo(() => {
    const map = new Map<number, string>();
    const all = progressData?.progress ?? [];
    for (const p of all) {
      const bid = p.book?.id ?? p.bookId;
      const title = p.book?.title;
      if (bid && title) map.set(bid, title);
    }
    return map;
  }, [progressData]);

  const attempts = (quizAttemptsData?.attempts || []) as QuizAttempt[];

  const safePct = (a: QuizAttempt) => {
    if (typeof a.percentage === "number") return a.percentage;
    const c = Number(a.scoreCorrect ?? 0);
    const t = Number(a.scoreTotal ?? 0);
    return t > 0 ? Math.round((c / t) * 100) : 0;
  };

  const ts = (a: QuizAttempt) => (a.createdAt ? new Date(a.createdAt).getTime() : 0);

  /** Group a sorted list (ASC by time) of attempts into sessions using a time gap */
  const groupIntoSessions = (list: QuizAttempt[], gapSec = SESSION_GAP_SEC): QuizSession[] => {
    const out: QuizSession[] = [];
    let cur: QuizSession | null = null;

    for (const a of list) {
      const time = ts(a);
      const corr = Number(a.scoreCorrect ?? 0);
      const tot = Number(a.scoreTotal ?? 0);
      const mode = a.mode === "straight" ? "straight" : "retry";

      if (!cur || time - cur.endAt > gapSec * 1000) {
        cur = {
          bookId: a.bookId,
          startAt: time,
          endAt: time,
          totalCorrect: 0,
          totalTotal: 0,
          percentage: 0,
          mode,
        };
        out.push(cur);
      } else {
        cur.endAt = time;
      }

      cur.totalCorrect += corr;
      cur.totalTotal += tot;
      cur.percentage =
        cur.totalTotal > 0 ? Math.round((cur.totalCorrect / cur.totalTotal) * 100) : 0;

      if (mode === "straight") cur.mode = "straight";
    }
    return out;
  };

  /** All sessions across all books (for this user) */
  const allSessions = (() => {
    const byKey = new Map<string, QuizAttempt[]>();
    for (const a of attempts) {
      const key = `${a.userId}:${a.bookId}`;
      const arr = byKey.get(key) ?? [];
      arr.push(a);
      byKey.set(key, arr);
    }
    const sessions: QuizSession[] = [];
    for (const [, arr] of byKey) {
      const sorted = arr.slice().sort((a: QuizAttempt, b: QuizAttempt) => ts(a) - ts(b));
      sessions.push(...groupIntoSessions(sorted));
    }
    return sessions;
  })();

  /** Sessions for a specific book */
  const sessionsForBook = (bookId: number) => {
    const list = attempts.filter((a) => a.bookId === bookId).sort((a, b) => ts(a) - ts(b));
    return groupIntoSessions(list);
  };

  /** Latest quiz result for a book (rolled up across pages) */
  const latestQuizForBook = (bookId: number) => {
    const sessions = sessionsForBook(bookId);
    return sessions.length ? sessions[sessions.length - 1] : null;
  };

  /** Average across sessions (not rows) */
  const averageQuizAcrossSessions = () => {
    if (allSessions.length === 0) return null;
    const sum = allSessions.reduce((s, x) => s + x.percentage, 0);
    return Math.round(sum / allSessions.length);
  };

  const quizBadgeClass = (pct: number) =>
    pct >= 80
      ? "border-green-400 text-green-700"
      : pct >= 50
      ? "border-amber-400 text-amber-700"
      : "border-red-400 text-red-700";

  // ---------- Reading stats ----------
  const getStats = () => {
    if (!progressData?.progress) {
      return { booksCompleted: 0, booksInProgress: 0, totalReadingTime: 0, completionRate: 0 };
    }
    const unique = getUniqueProgress(progressData.progress);
    const completed = unique.filter((p: any) => p.percentComplete === 100).length;
    const inProgress = unique.filter(
      (p: any) => p.percentComplete > 0 && p.percentComplete < 100
    ).length;
    const totalSeconds = unique.reduce(
      (sum: number, p: any) => sum + (p.totalReadingTime || 0),
      0
    );
    const totalStarted = completed + inProgress;
    const completionRate = totalStarted > 0 ? Math.round((completed / totalStarted) * 100) : 0;
    return {
      booksCompleted: completed,
      booksInProgress: inProgress,
      totalReadingTime: totalSeconds,
      completionRate,
    };
  };

  const stats = getStats();
  const avgQuiz = averageQuizAcrossSessions();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-brand-navy-50 to-ilaw-white">
      <Header variant="student" />

      <main className="flex-grow p-4 md:p-6">
        <div className="container mx-auto">
          {/* Hero */}
          <div className="bg-gradient-to-r from-ilaw-navy to-brand-navy-800 rounded-2xl p-8 mb-8 text-ilaw-white shadow-navy">
            <div className="flex items-center mb-4">
              <Target className="h-10 w-10 text-ilaw-gold mr-4" />
              <div>
                <span className="text-sm font-semibold uppercase tracking-wide text-brand-gold-200">
                  Learning Progress
                </span>
              </div>
            </div>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between">
              <div>
                <h1 className="text-4xl md:text-5xl font-heading font-bold mb-4">My Reading Journey</h1>
                <p className="text-xl text-brand-gold-100 leading-relaxed">
                  Track your learning achievements and celebrate your progress on the path to knowledge.
                </p>
                <div className="mt-6 flex items-center text-ilaw-gold">
                  <Star className="h-5 w-5 mr-2" />
                  <span className="font-medium italic">Liwanag, Kaalaman, Paglilingkod</span>
                </div>
              </div>
              <div className="mt-6 md:mt-0">
                <Link href="/student">
                  <Button
                    variant="outline"
                    className="border-2 border-ilaw-gold text-ilaw-gold hover:bg-ilaw-gold hover:text-ilaw-navy font-heading font-bold px-6 py-3"
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab} className="mb-8">
            <TabsList className="grid w-full grid-cols-2 mb-6 bg-brand-gold-100 border-2 border-brand-gold-200">
              <TabsTrigger
                value="overview"
                className="font-heading font-bold text-ilaw-navy data-[state=active]:bg-ilaw-gold data-[state=active]:text-ilaw-navy"
              >
                📊 Overview
              </TabsTrigger>
              <TabsTrigger
                value="history"
                className="font-heading font-bold text-ilaw-navy data-[state=active]:bg-ilaw-gold data-[state=active]:text-ilaw-navy"
              >
                📚 Reading History
              </TabsTrigger>
            </TabsList>

            {/* OVERVIEW */}
            <TabsContent value="overview">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <Card className="border-2 border-brand-gold-200 hover:border-ilaw-gold transition-all duration-300 shadow-lg bg-gradient-to-br from-ilaw-white to-brand-gold-50">
                  <CardContent className="pt-6">
                    <div className="flex justify-between">
                      <div>
                        <p className="text-sm text-yellow-600 font-semibold">Books Completed</p>
                        <h3 className="text-3xl font-heading font-bold mt-1 text-ilaw-navy">
                          {stats.booksCompleted}
                        </h3>
                      </div>
                      <div className="bg-gradient-to-br from-amber-200 to-yellow-200 h-12 w-12 rounded-full flex items-center justify-center shadow-md">
                        <BookOpen className="h-6 w-6 text-ilaw-navy" />
                      </div>
                    </div>
                    <div className="mt-4 text-sm text-yellow-600">
                      <span className="text-green-600 items-center inline-flex font-medium">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        {stats.booksInProgress} books in progress
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-brand-gold-200 hover:border-ilaw-gold transition-all duration-300 shadow-lg bg-gradient-to-br from-ilaw-white to-brand-gold-50">
                  <CardContent className="pt-6">
                    <div className="flex justify-between">
                      <div>
                        <p className="text-sm text-yellow-600 font-semibold">Reading Time</p>
                        <h3 className="text-3xl font-heading font-bold mt-1 text-ilaw-navy">
                          {formatReadingTime(stats.totalReadingTime)}
                        </h3>
                      </div>
                      <div className="bg-gradient-to-br from-ilaw-gold to-brand-amber h-12 w-12 rounded-full flex items-center justify-center shadow-md">
                        <Clock className="h-6 w-6 text-ilaw-navy" />
                      </div>
                    </div>
                    <div className="mt-4 text-sm text-yellow-600">
                      <span className="text-green-600 items-center inline-flex font-medium">
                        <ArrowUpRight className="h-4 w-4 mr-1" />
                        Keep up the great work!
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-brand-gold-200 hover:border-ilaw-gold transition-all duration-300 shadow-lg bg-gradient-to-br from-ilaw-white to-brand-gold-50">
                  <CardContent className="pt-6">
                    <div className="flex justify-between">
                      <div>
                        <p className="text-sm text-yellow-600 font-semibold">Completion Rate</p>
                        <h3 className="text-3xl font-heading font-bold mt-1 text-ilaw-navy">
                          {stats.completionRate}%
                        </h3>
                      </div>
                      <div className="bg-gradient-to-br from-green-200 to-emerald-200 h-12 w-12 rounded-full flex items-center justify-center shadow-md">
                        <BarChart3 className="h-6 w-6 text-green-700" />
                      </div>
                    </div>
                    <div className="mt-4 text-sm text-yellow-600">
                      <span className="text-green-600 items-center inline-flex font-medium">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        Steadily improving
                      </span>
                    </div>
                  </CardContent>
                </Card>

                {/* Avg Quiz Score (session-based) */}
                <Card className="border-2 border-brand-gold-200 hover:border-ilaw-gold transition-all duration-300 shadow-lg bg-gradient-to-br from-ilaw-white to-brand-gold-50">
                  <CardContent className="pt-6">
                    <div className="flex justify-between">
                      <div>
                        <p className="text-sm text-yellow-600 font-semibold">Average Quiz Score</p>
                        <h3 className="text-3xl font-heading font-bold mt-1 text-ilaw-navy">
                          {avgQuiz != null ? `${avgQuiz}%` : "—"}
                        </h3>
                      </div>
                      <div className="bg-gradient-to-br from-amber-200 to-yellow-200 h-12 w-12 rounded-full flex items-center justify-center shadow-md">
                        <BarChart3 className="h-6 w-6 text-ilaw-navy" />
                      </div>
                    </div>
                    <div className="mt-4 text-sm text-yellow-600">
                      <span className="text-green-600 items-center inline-flex font-medium">
                        <TrendingUp className="h-4 w-4 mr-1" />
                        Practice boosts scores
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* 🏅 Badges Earned (replaces Reading Activity) */}
              <div className="mb-8 border-2 border-brand-gold-200 hover:border-ilaw-gold transition-all duration-300 shadow-lg bg-ilaw-white rounded-2xl">
                <div className="bg-gradient-to-r from-ilaw-navy to-brand-navy-800 p-6 rounded-t-xl">
                  <h3 className="text-xl font-heading font-bold text-ilaw-gold flex items-center">
                    <Award className="h-6 w-6 mr-3" />
                    🏅 Badges Earned
                  </h3>
                </div>

                <div className="p-6">
                  {badgesLoading ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-ilaw-gold inline-block mb-3" />
                      <p className="text-yellow-600 font-medium">Loading your badges…</p>
                    </div>
                  ) : earnedBadges.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="bg-gradient-to-br from-amber-200 to-yellow-200 p-6 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                        <Award className="h-12 w-12 text-ilaw-navy" />
                      </div>
                      <h4 className="text-2xl font-heading font-bold text-ilaw-navy mb-2">
                        No badges yet
                      </h4>
                      <p className="text-yellow-600">
                        Read books and complete quizzes to earn badges!
                      </p>
                    </div>
                  ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
{earnedBadges
  .slice()
  .sort((a, b) => {
    const aDate = (a as any).awardedAt ?? (a as any).awarded_at ?? (a as any).createdAt ?? (a as any).created_at;
    const bDate = (b as any).awardedAt ?? (b as any).awarded_at ?? (b as any).createdAt ?? (b as any).created_at;
    const ta = aDate ? new Date(aDate).getTime() : 0;
    const tb = bDate ? new Date(bDate).getTime() : 0;
    return tb - ta;
  })
  .map((eb) => {
    const icon = getBadgeIconUrl(eb.badge, 72);
    const title =
      eb.book?.title ??
      (eb.bookId && bookTitleById.get(eb.bookId)) ??
      (eb.bookId ? `Book #${eb.bookId}` : null);

    const awardedAt =
      (eb as any).awardedAt ??
      (eb as any).awarded_at ??
      (eb as any).createdAt ??
      (eb as any).created_at ??
      null;

    return (
      <div key={eb.id} className="flex items-center gap-3 p-4 bg-white rounded-xl border-2 border-brand-gold-200 hover:border-ilaw-gold transition-colors">
        <div className="w-14 h-14 rounded-xl overflow-hidden bg-brand-gold-50 border border-brand-gold-200 flex items-center justify-center">
          {icon ? <img src={icon} alt={eb.badge?.name || "Badge"} className="w-full h-full object-cover" /> : <Award className="h-6 w-6 text-ilaw-gold" />}
        </div>
        <div className="min-w-0">
          <div className="font-heading font-bold text-ilaw-navy truncate">
            {eb.badge?.name ?? `Badge #${eb.badgeId}`}
          </div>
          <div className="text-xs text-yellow-600 flex flex-wrap items-center gap-2">
            {title && <span>📚 {title}</span>}
            {awardedAt && <span>📅 {new Date(awardedAt).toLocaleDateString()}</span>}
            {eb.note && <span>📝 {eb.note}</span>}
          </div>
        </div>
      </div>
    );
  })}
                    </div>
                  )}
                </div>
              </div>

              {/* Current Progress */}
              <div className="border-2 border-brand-gold-200 hover:border-ilaw-gold transition-all duration-300 shadow-lg bg-ilaw-white rounded-2xl">
                <div className="bg-gradient-to-r from-ilaw-navy to-brand-navy-800 p-6 rounded-t-xl">
                  <h3 className="text-xl font-heading font-bold text-ilaw-gold flex items-center">
                    <GraduationCap className="h-6 w-6 mr-3" />
                    📖 Current Reading Progress
                  </h3>
                </div>
                <div className="p-6">
                  {isLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-pulse">
                        <div className="bg-gradient-to-br from-amber-200 to-yellow-200 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                          <BookOpen className="h-8 w-8 text-ilaw-navy" />
                        </div>
                        <p className="text-yellow-600 font-medium">Loading your progress...</p>
                      </div>
                    </div>
                  ) : (() => {
                      const unique = getUniqueProgress(progressData?.progress || []);
                      const inProgressBooks = unique.filter((p: any) => p.percentComplete < 100);

                      return inProgressBooks.length > 0 ? (
                        <div className="space-y-6">
                          {inProgressBooks
                            .sort(
                              (a: any, b: any) =>
                                new Date(b.lastReadAt).getTime() - new Date(a.lastReadAt).getTime()
                            )
                            .slice(0, 3)
                            .map((progress: any) => {
                              const bookId: number = progress.book?.id ?? progress.bookId;
                              const latestSession = latestQuizForBook(bookId);
                              const attemptsCount = sessionsForBook(bookId).length;

                              return (
                                <div
                                  key={bookId}
                                  className="flex items-start p-6 bg-gradient-to-r from-brand-gold-50 to-ilaw-white rounded-xl border-2 border-brand-gold-200 hover:border-ilaw-gold hover:shadow-md transition-all duration-300"
                                >
                                  <div className="flex-shrink-0 w-16 h-24 bg-gradient-to-br from-amber-200 to-yellow-200 rounded-lg flex items-center justify-center mr-4 shadow-md">
                                    {progress.book?.coverImage ? (
                                      <img
                                        src={progress.book.coverImage}
                                        alt={progress.book.title}
                                        className="w-full h-full object-cover rounded-lg"
                                      />
                                    ) : (
                                      <BookOpen className="h-6 w-6 text-ilaw-navy" />
                                    )}
                                  </div>
                                  <div className="flex-1">
                                    <h4 className="font-heading font-bold text-ilaw-navy text-lg mb-2">
                                      {progress.book?.title}
                                    </h4>

                                    <div className="flex flex-wrap gap-2 mb-3">
                                      <Badge
                                        variant="outline"
                                        className={`border-2 font-bold text-xs ${
                                          progress.book?.type === "storybook"
                                            ? "border-brand-gold-300 bg-brand-gold-100 text-yellow-600"
                                            : "border-ilaw-navy-300 bg-ilaw-navy-100 text-ilaw-navy"
                                        }`}
                                      >
                                        {progress.book?.type === "storybook"
                                          ? "📚 Storybook"
                                          : "🎓 Educational"}
                                      </Badge>
                                      {progress.book?.subject && (
                                        <Badge
                                          variant="outline"
                                          className="border-2 border-amber-300 bg-amber-50 text-yellow-600 font-bold text-xs"
                                        >
                                          {formatSubject(progress.book.subject)}
                                        </Badge>
                                      )}
                                      {progress.book?.grade && (
                                        <Badge
                                          variant="outline"
                                          className="border-2 border-brand-gold-300 text-yellow-600 font-bold text-xs"
                                        >
                                          Grade {progress.book.grade === "K" ? "K" : progress.book.grade}
                                        </Badge>
                                      )}

                                      {/* latest quiz + attempts (session-based) */}
                                      {latestSession && (
                                        <Badge
                                          variant="outline"
                                          className={`border-2 font-bold text-xs ${quizBadgeClass(
                                            latestSession.percentage
                                          )}`}
                                        >
                                          🧠 Last quiz: {latestSession.percentage}% ({latestSession.mode})
                                        </Badge>
                                      )}
                                      {attemptsCount > 0 && (
                                        <Badge
                                          variant="outline"
                                          className="border-2 text-ilaw-navy font-bold text-xs"
                                        >
                                          {attemptsCount} {attemptsCount === 1 ? "attempt" : "attempts"}
                                        </Badge>
                                      )}
                                    </div>

                                    <p className="text-sm text-yellow-600 font-medium mb-3">
                                      {progress.currentChapter || "Chapter 1"} • Last read:{" "}
                                      {new Date(progress.lastReadAt).toLocaleDateString()}
                                    </p>
                                    <div className="mb-2">
                                      <div className="flex justify-between text-xs text-yellow-600 mb-2 font-medium">
                                        <span>Progress</span>
                                        <span>{progress.percentComplete}%</span>
                                      </div>
                                      <Progress value={progress.percentComplete} className="h-3" />
                                    </div>

                                    <Link
                                      href={
                                        progress.book?.type === "educational"
                                          ? `/student/educational-books/${bookId}`
                                          : `/student/storybooks/${bookId}`
                                      }
                                    >
                                      <Button
                                        variant="link"
                                        className="p-0 h-auto text-ilaw-navy hover:text-ilaw-gold font-heading font-bold flex items-center transition-colors duration-200"
                                      >
                                        Continue Reading <ChevronRight className="h-4 w-4 ml-1" />
                                      </Button>
                                    </Link>
                                  </div>
                                </div>
                              );
                            })}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <div className="bg-gradient-to-br from-amber-200 to-yellow-200 p-6 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                            <BookOpen className="h-12 w-12 text-ilaw-navy" />
                          </div>
                          <h4 className="text-2xl font-heading font-bold text-ilaw-navy mb-4">
                            Ready to Start Your Learning Journey?
                          </h4>
                          <p className="text-yellow-600 font-medium mb-2">No books in progress yet</p>
                          <p className="text-sm text-yellow-600">
                            Choose a book from our collection to begin tracking your progress
                          </p>
                        </div>
                      );
                    })()}
                </div>
              </div>
            </TabsContent>

            {/* HISTORY */}
            <TabsContent value="history">
              <div className="border-2 border-brand-gold-200 hover:border-ilaw-gold transition-all duration-300 shadow-lg bg-ilaw-white rounded-2xl">
                <div className="bg-gradient-to-r from-ilaw-navy to-brand-navy-800 p-6 rounded-t-xl">
                  <h3 className="text-xl font-heading font-bold text-ilaw-gold flex items-center">
                    <BookOpen className="h-6 w-6 mr-3" />
                    📚 Reading History
                  </h3>
                </div>
                <div className="p-6">
                  {isLoading ? (
                    <div className="text-center py-8">
                      <div className="animate-pulse">
                        <div className="bg-gradient-to-br from-amber-200 to-yellow-200 p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                          <BookOpen className="h-8 w-8 text-ilaw-navy" />
                        </div>
                        <p className="text-yellow-600 font-medium">Loading your history...</p>
                      </div>
                    </div>
                  ) : (() => {
                      const unique = getUniqueProgress(progressData?.progress || []);
                      return unique.length > 0 ? (
                        <Table>
                          <TableHeader>
                            <TableRow className="border-brand-gold-200">
                              <TableHead className="text-ilaw-navy font-heading font-bold">📖 Book</TableHead>
                              <TableHead className="text-ilaw-navy font-heading font-bold">📋 Details</TableHead>
                              <TableHead className="text-ilaw-navy font-heading font-bold">📊 Progress</TableHead>
                              <TableHead className="text-ilaw-navy font-heading font-bold text-center w-28 whitespace-nowrap">
                                ⏱️ Reading Time
                              </TableHead>
                              <TableHead className="text-ilaw-navy font-heading font-bold">📅 Last Read</TableHead>
                              {/* quiz (latest) */}
                              <TableHead className="text-ilaw-navy font-heading font-bold">🧠 Quiz (Latest)</TableHead>
                              <TableHead></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {unique
                              .sort(
                                (a: any, b: any) =>
                                  new Date(b.lastReadAt).getTime() - new Date(a.lastReadAt).getTime()
                              )
                              .map((progress: any) => {
                                const bookId: number = progress.book?.id ?? progress.bookId;
                                const latest = latestQuizForBook(bookId);
                                const count = sessionsForBook(bookId).length;
                                return (
                                  <TableRow
                                    key={bookId}
                                    className="border-brand-gold-100 hover:bg-brand-gold-50 transition-colors duration-200"
                                  >
                                    <TableCell>
                                      <div className="flex items-center">
                                        <div className="w-12 h-16 bg-gradient-to-br from-amber-200 to-yellow-200 rounded-lg flex items-center justify-center mr-3 shadow-sm">
                                          {progress.book?.coverImage ? (
                                            <img
                                              src={progress.book.coverImage}
                                              alt={progress.book.title}
                                              className="w-full h-full object-cover rounded-lg"
                                            />
                                          ) : (
                                            <BookOpen className="h-5 w-5 text-ilaw-navy" />
                                          )}
                                        </div>
                                        <div>
                                          <div className="font-heading font-bold text-ilaw-navy">
                                            {progress.book?.title}
                                          </div>
                                          <div className="text-xs text-yellow-600 font-medium">
                                            {progress.currentChapter || "Chapter 1"}
                                          </div>
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="flex flex-wrap gap-1">
                                        <Badge
                                          variant="outline"
                                          className={`border font-bold text-xs ${
                                            progress.book?.type === "storybook"
                                              ? "border-brand-gold-300 bg-brand-gold-100 text-yellow-600"
                                              : "border-ilaw-navy-300 bg-ilaw-navy-100 text-ilaw-navy"
                                          }`}
                                        >
                                          {progress.book?.type === "storybook" ? "📚 Story" : "🎓 Educational"}
                                        </Badge>
                                        {progress.book?.subject && (
                                          <Badge
                                            variant="outline"
                                            className="border border-amber-300 bg-amber-50 text-yellow-600 font-bold text-xs"
                                          >
                                            {formatSubject(progress.book.subject)?.split(" ")[0]}
                                          </Badge>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <div className="w-full max-w-[100px]">
                                        <div className="text-xs text-yellow-600 mb-1 flex justify-between font-medium">
                                          <span>{progress.percentComplete}%</span>
                                          {progress.percentComplete === 100 && (
                                            <span className="text-green-600 font-bold">✓ Done</span>
                                          )}
                                        </div>
                                        <Progress value={progress.percentComplete} className="h-2" />
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-yellow-600 font-medium text-center w-24">
                                      {formatReadingTime(progress.totalReadingTime || 0)}
                                    </TableCell>
                                    <TableCell className="text-yellow-600 font-medium">
                                      {new Date(progress.lastReadAt).toLocaleDateString()}
                                    </TableCell>

                                    {/* latest quiz column (session-based) */}
                                    <TableCell>
                                      {latest ? (
                                        <div className="flex items-center gap-2">
                                          <Badge
                                            variant="outline"
                                            className={`font-bold ${quizBadgeClass(latest.percentage)}`}
                                          >
                                            {latest.percentage}%{" "}
                                            <span className="ml-1 text-[10px] opacity-70">({latest.mode})</span>
                                          </Badge>
                                          <Badge variant="outline" className="font-bold text-ilaw-navy">
                                            {count} {count === 1 ? "attempt" : "attempts"}
                                          </Badge>
                                        </div>
                                      ) : (
                                        <span className="text-yellow-600">—</span>
                                      )}
                                    </TableCell>

                                    <TableCell>
                                      {progress.percentComplete === 100 ? (
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="text-green-600 hover:text-green-700 font-heading font-bold"
                                          disabled
                                        >
                                          ✓ Completed
                                        </Button>
                                      ) : (
                                        <Link
                                          href={
                                            progress.book?.type === "educational"
                                              ? `/student/educational-books/${bookId}`
                                              : `/student/storybooks/${bookId}`
                                          }
                                        >
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-ilaw-navy hover:text-ilaw-gold hover:bg-brand-gold-50 font-heading font-bold transition-colors duration-200"
                                          >
                                            Continue →
                                          </Button>
                                        </Link>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                );
                              })}
                          </TableBody>
                        </Table>
                      ) : (
                        <div className="text-center py-12">
                          <div className="bg-gradient-to-br from-amber-200 to-yellow-200 p-6 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
                            <BookOpen className="h-12 w-12 text-ilaw-navy" />
                          </div>
                          <h4 className="text-2xl font-heading font-bold text-ilaw-navy mb-4">
                            Your Reading Adventure Begins Here!
                          </h4>
                          <p className="text-yellow-600 font-medium mb-2">No reading history found yet</p>
                          <p className="text-sm text-yellow-600">Start reading to build your learning journey</p>
                        </div>
                      );
                    })()}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}