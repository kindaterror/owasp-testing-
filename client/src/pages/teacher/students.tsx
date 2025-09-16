// src/pages/teacher/students.tsx
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import Header from "@/components/layout/Header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Search,
  Filter,
  Eye,
  PenSquare,
  ChevronLeft,
  Users,
  GraduationCap,
  BookOpen,
  Award,
  Target,
  BookOpenCheck,
  Book,
  BarChart3,
  Loader2,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

// media + api
import { AvatarImg, BookCover } from "@/components/ui/media";
import { apiRequest } from "@/lib/queryClient";

// ✨ animations
import { motion, AnimatePresence } from "framer-motion";
const fadeIn = { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.35 } } };
const fadeInFast = { hidden: { opacity: 0, y: 6 }, visible: { opacity: 1, y: 0, transition: { duration: 0.25 } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
const item = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.18 } },
};

// ---------- helpers ----------
const formatTime = (totalSeconds: number) => {
  if (!totalSeconds || totalSeconds === 0) return "0:00:00";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
};

const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: "easeOut" } },
};

// Build a usable book cover URL with Cloudinary fallback
const CLOUD =
  import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ||
  import.meta.env.VITE_PUBLIC_CLOUDINARY_CLOUD_NAME ||
  import.meta.env.CLOUDINARY_CLOUD_NAME;

const getCoverUrl = (book: any, w = 56) => {
  if (!book) return null;
  const direct = book.coverImage ?? book.cover_image ?? null;
  if (direct) return direct;

  const publicId = book.coverPublicId ?? book.cover_public_id ?? null;
  if (publicId && CLOUD) {
    return `https://res.cloudinary.com/${CLOUD}/image/upload/c_fill,w=${w},h=${Math.round(
      w * 1.33
    )},q_auto,f_auto/${publicId}`;
  }

  return book.coverUrl ?? book.cover_url ?? book.imageUrl ?? book.image_url ?? null;
};

// Badge icon URL (prefers Cloudinary publicId)
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
  userId: number;
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

const SESSION_GAP_SEC = 120; // rows within 2 minutes collapse into one session

function TeacherStudents() {
  const [searchTerm, setSearchTerm] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showProgressDialog, setShowProgressDialog] = useState(false);

  // Approved students
  const { data: studentsData, isLoading, error } = useQuery({
    queryKey: ["/api/students", "approved", gradeFilter, searchTerm],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("status", "approved");
      if (gradeFilter !== "all") params.append("grade", gradeFilter);
      if (searchTerm && searchTerm.trim() !== "") params.append("search", searchTerm);

      const token = localStorage.getItem("token");
      const res = await fetch(`/api/students?${params.toString()}`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      if (!res.ok) throw new Error(`API error: ${res.status} - ${await res.text()}`);
      return res.json();
    },
    retry: 1,
  });

  // Progress data
  const { data: progressData } = useQuery({
    queryKey: ["/api/progress"],
    queryFn: async () => {
      const res = await fetch("/api/progress", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch progress data");
      return res.json();
    },
  });

  // Quiz attempts (teacher can see all)
  const { data: quizAttemptsData, isLoading: attemptsLoading } = useQuery({
    queryKey: ["/api/quiz-attempts"],
    queryFn: async () => {
      const res = await fetch("/api/quiz-attempts", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!res.ok) throw new Error("Failed to fetch quiz attempts");
      return res.json();
    },
  });

  // ---------- progress helpers ----------
  const getUniqueStudentProgress = (studentId: number) => {
    if (!progressData?.progress) return [];
    const studentProgress = progressData.progress.filter((p: any) => p.userId === studentId);

    const latestProgressMap = new Map<number, any>();
    studentProgress.forEach((progress: any) => {
      const existing = latestProgressMap.get(progress.bookId);
      if (!existing || new Date(progress.lastReadAt) > new Date(existing.lastReadAt)) {
        latestProgressMap.set(progress.bookId, progress);
      }
    });
    return Array.from(latestProgressMap.values());
  };

  const calculateAverageProgress = (studentId: number) => {
    const unique = getUniqueStudentProgress(studentId);
    if (unique.length === 0) return 0;
    const sum = unique.reduce((acc: number, curr: any) => {
      const pct =
        typeof curr.percentComplete === "number"
          ? curr.percentComplete
          : parseFloat(curr.percentComplete || 0);
      return acc + (isNaN(pct) ? 0 : pct);
    }, 0);
    return Math.round(sum / unique.length);
  };

  const getCompletedBooksCount = (studentId: number) => {
    const unique = getUniqueStudentProgress(studentId);
    return unique.filter((p: any) => {
      const pct =
        typeof p.percentComplete === "number"
          ? p.percentComplete
          : parseFloat(p.percentComplete || 0);
      return pct >= 99.5;
    }).length;
  };

  // ---------- quiz helpers (SESSION-BASED) ----------
  const allAttempts = (quizAttemptsData?.attempts || []) as QuizAttempt[];
  const ts = (a: QuizAttempt) => (a.createdAt ? new Date(a.createdAt).getTime() : 0);

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
          userId: a.userId,
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
      cur.percentage = cur.totalTotal > 0 ? Math.round((cur.totalCorrect / cur.totalTotal) * 100) : 0;

      if (mode === "straight") cur.mode = "straight";
    }
    return out;
  };

  const sessionsForBook = (studentId: number, bookId: number): QuizSession[] => {
    const list = allAttempts
      .filter((a) => a.userId === studentId && a.bookId === bookId)
      .sort((a, b) => ts(a) - ts(b));
    return groupIntoSessions(list);
  };

  const latestSessionForBook = (studentId: number, bookId: number) => {
    const sessions = sessionsForBook(studentId, bookId);
    return sessions.length ? sessions[sessions.length - 1] : null;
  };

  const allSessionsForStudent = (studentId: number): QuizSession[] => {
    const byBook = new Map<number, QuizAttempt[]>();
    for (const a of allAttempts) {
      if (a.userId !== studentId) continue;
      const arr = byBook.get(a.bookId) ?? [];
      arr.push(a);
      byBook.set(a.bookId, arr);
    }
    const sessions: QuizSession[] = [];
    for (const [, arr] of byBook) {
      sessions.push(...groupIntoSessions(arr.sort((a: QuizAttempt, b: QuizAttempt) => ts(a) - ts(b))));
    }
    return sessions;
  };

  const getAverageQuizForStudent = (studentId: number) => {
    const sessions = allSessionsForStudent(studentId);
    if (sessions.length === 0) return null;
    const sum = sessions.reduce((acc, s) => acc + s.percentage, 0);
    return Math.round(sum / sessions.length);
  };

  // ---------- badges ----------
  const { data: earnedBadgesPayload, isLoading: earnedBadgesLoading } = useQuery({
    queryKey: ["/api/users", selectedStudent?.id, "badges", showProgressDialog],
    enabled: !!selectedStudent?.id && showProgressDialog,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/users/${selectedStudent!.id}/badges`);
      return res?.earnedBadges ?? res?.earned_badges ?? [];
    },
  });
  const earnedBadges: EarnedBadge[] = earnedBadgesPayload ?? [];

  // book titles map (for badge rows)
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

  // ---------- UI filtering ----------
  const handleSearch = (e: React.FormEvent) => e.preventDefault();

  const filteredStudents =
    studentsData?.students?.filter((student: any) => {
      const matchesSearch =
        !searchTerm ||
        student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.username.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesGrade = gradeFilter === "all" || student.gradeLevel === gradeFilter;
      return matchesSearch && matchesGrade;
    }) || [];

  // ---------- error state ----------
  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-brand-navy-50 via-ilaw-white to-brand-gold-50">
        <Header variant="teacher" />
        <div className="container mx-auto p-6 text-center">
          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-8 mb-6 shadow-lg">
            <h2 className="text-2xl font-heading font-bold text-red-700 mb-4">Error Loading Students</h2>
            <p className="text-red-600 font-medium">
              {error instanceof Error ? error.message : "Unknown error occurred"}
            </p>
          </div>
          <Link href="/teacher">
            <Button variant="outline" className="border-2 border-ilaw-gold text-ilaw-navy hover:bg-ilaw-gold">
              <ChevronLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-brand-navy-50 via-ilaw-white to-brand-gold-50">
      <Header variant="teacher" />

      <main className="flex-grow p-4 md:p-6">
        <div className="container mx-auto">
          {/* Header */}
          <motion.div variants={fadeIn} initial="hidden" animate="visible" className="bg-gradient-to-r from-ilaw-navy to-brand-navy-800 rounded-2xl p-8 mb-8 text-white shadow-lg relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 [mask-image:radial-gradient(60%_60%_at_15%_20%,black,transparent)]" />
            <div className="flex flex-col md:flex-row md:items-center md:justify-between relative">
              <div>
                <div className="flex items-center mb-2">
                  <Users className="h-8 w-8 text-ilaw-gold mr-3" />
                  <span className="text-sm font-semibold uppercase tracking-wide text-white/80">
                    Student Management
                  </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-heading font-bold mb-2">Enrolled Students</h1>
                <p className="text-lg text-white/80">Monitor and track your students' learning progress</p>
              </div>
              <div className="mt-6 md:mt-0">
                <Link href="/teacher">
                  <Button
                    variant="outline"
                    className="border-2 border-white text-white hover:bg-white hover:text-ilaw-navy font-semibold px-6 py-3"
                  >
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>

          {/* Search & Filter */}
          <motion.div variants={fadeInFast} initial="hidden" animate="visible" className="bg-white rounded-xl shadow-lg border-2 border-brand-navy-200 p-6 mb-8">
            <div className="flex flex-col md:flex-row gap-6">
              <form onSubmit={handleSearch} className="w-full md:w-2/3">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-navy-300" size={20} />
                  <Input
                    placeholder="Search by name, email, or username..."
                    className="pl-12 h-12 text-lg border-2 border-brand-navy-200 focus:border-ilaw-gold rounded-lg"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </form>

              <div className="w-full md:w-1/3">
                <Select value={gradeFilter} onValueChange={setGradeFilter}>
                  <SelectTrigger className="h-12 border-2 border-brand-navy-200 focus:border-ilaw-gold rounded-lg">
                    <SelectValue>
                      <div className="flex items-center">
                        <Filter className="w-5 h-5 mr-3 text-ilaw-gold" />
                        <span className="font-medium">
                          {gradeFilter === "all"
                            ? "All Grades"
                            : gradeFilter === "K"
                            ? "Kindergarten"
                            : `Grade ${gradeFilter}`}
                        </span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Grades</SelectItem>
                    <SelectItem value="K">Kindergarten</SelectItem>
                    <SelectItem value="1">Grade 1</SelectItem>
                    <SelectItem value="2">Grade 2</SelectItem>
                    <SelectItem value="3">Grade 3</SelectItem>
                    <SelectItem value="4">Grade 4</SelectItem>
                    <SelectItem value="5">Grade 5</SelectItem>
                    <SelectItem value="6">Grade 6</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>

          {/* Students table */}
          <motion.div variants={fadeIn} initial="hidden" animate="visible" className="bg-white rounded-xl shadow-lg border-2 border-brand-navy-200 overflow-hidden">
            <div className="bg-gradient-to-r from-ilaw-navy to-brand-navy-800 p-4">
              <h2 className="text-xl font-heading font-bold text-ilaw-gold flex items-center">
                <GraduationCap className="h-6 w-6 mr-3" />
                Student Directory
              </h2>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="bg-brand-navy-50">
                  <TableHead className="font-heading font-bold text-ilaw-navy">STUDENT</TableHead>
                  <TableHead className="font-heading font-bold text-ilaw-navy">EMAIL</TableHead>
                  <TableHead className="font-heading font-bold text-ilaw-navy">GRADE</TableHead>
                  <TableHead className="font-heading font-bold text-ilaw-navy">JOIN DATE</TableHead>
                  <TableHead className="font-heading font-bold text-ilaw-navy">PROGRESS</TableHead>
                  <TableHead className="font-heading font-bold text-ilaw-navy">COMPLETED</TableHead>
                  <TableHead className="font-heading font-bold text-ilaw-navy">AVG QUIZ</TableHead>
                  <TableHead className="font-heading font-bold text-ilaw-navy">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-ilaw-gold border-t-transparent mr-3" />
                        <span className="text-brand-navy-700 font-medium">Loading students...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredStudents.length > 0 ? (
                  <AnimatePresence initial={false}>
                    {filteredStudents.map((student: any, idx: number) => {
                      const avgQuiz = getAverageQuizForStudent(student.id);
                      return (
                        <motion.tr
                          key={student.id}
                          variants={item}
                          initial="hidden"
                          animate="visible"
                          exit="exit"
                          transition={{ delay: idx * 0.02 }}
                          className="hover:bg-brand-navy-50 transition-colors"
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center">
                              <div className="mr-4">
                                <AvatarImg
                                  url={student.avatar || student.photoUrl || student.photo_url || null}
                                  firstName={student.firstName}
                                  lastName={student.lastName}
                                  size={48}
                                  className="border-2 border-brand-navy-200"
                                />
                              </div>
                              <div>
                                <div className="font-heading font-semibold text-ilaw-navy">
                                  {student.firstName} {student.lastName}
                                </div>
                                <div className="text-sm text-brand-navy-700">@{student.username}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-brand-navy-700">{student.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-brand-navy-200 text-ilaw-navy font-semibold">
                              {student.gradeLevel
                                ? student.gradeLevel === "K"
                                  ? "Kindergarten"
                                  : `Grade ${student.gradeLevel}`
                                : "N/A"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-brand-navy-700">
                            {new Date(student.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Progress value={calculateAverageProgress(student.id)} className="h-3 w-24 bg-brand-navy-100" />
                              <span className="text-sm font-semibold text-ilaw-navy">
                                {calculateAverageProgress(student.id)}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <BookOpenCheck className="h-4 w-4 text-ilaw-navy mr-2" />
                              <span className="font-semibold text-ilaw-navy">
                                {getCompletedBooksCount(student.id)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {attemptsLoading ? (
                              <span className="text-brand-navy-700">…</span>
                            ) : avgQuiz != null ? (
                              <Badge
                                variant="outline"
                                className={`font-bold ${
                                  avgQuiz >= 80
                                    ? "border-green-400 text-green-700"
                                    : avgQuiz >= 50
                                    ? "border-amber-400 text-amber-700"
                                    : "border-red-400 text-red-700"
                                }`}
                              >
                                {avgQuiz}% avg
                              </Badge>
                            ) : (
                              <span className="text-brand-navy-700">—</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9 w-9 p-0 border-ilaw-gold text-ilaw-gold hover:bg-ilaw-gold hover:text-ilaw-navy"
                                onClick={() => {
                                  setSelectedStudent(student);
                                  setShowProgressDialog(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="flex flex-col items-center">
                        <Users className="h-16 w-16 text-brand-navy-200 mb-4" />
                        <p className="text-xl font-heading font-semibold text-ilaw-navy mb-2">
                          No approved students found
                        </p>
                        <p className="text-brand-navy-700">Students need to be approved by an admin to appear here</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            <div className="px-6 py-4 border-t border-brand-navy-200 bg-brand-navy-50">
              <p className="text-sm font-medium text-brand-navy-700 flex items-center">
                <Target className="h-4 w-4 mr-2" />
                Showing {filteredStudents.length} approved students
              </p>
            </div>
          </motion.div>

          {/* Student Progress Dialog */}
          <Dialog open={showProgressDialog} onOpenChange={setShowProgressDialog}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto bg-white border-2 border-brand-navy-200">
              <DialogHeader className="border-b border-brand-navy-200 pb-4">
                <DialogTitle className="text-xl font-heading font-bold text-ilaw-navy flex items-center">
                  <Award className="h-6 w-6 text-ilaw-gold mr-3" />
                  Student Progress Details
                </DialogTitle>
                <DialogDescription className="text-brand-navy-700">
                  Detailed reading and quiz progress for {selectedStudent?.firstName} {selectedStudent?.lastName}
                </DialogDescription>
              </DialogHeader>

              {selectedStudent ? (
                <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
                  {/* Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <motion.div variants={item}>
                      <Card className="border-2 border-ilaw-gold hover:shadow-lg transition-shadow">
                        <CardContent className="p-4 flex flex-col items-center text-center">
                          <div className="bg-gradient-to-br from-ilaw-gold to-brand-amber p-3 rounded-full mb-3">
                            <BookOpen className="h-6 w-6 text-ilaw-navy" />
                          </div>
                          <div className="text-2xl font-heading font-bold text-ilaw-gold mb-1">
                            {calculateAverageProgress(selectedStudent.id)}%
                          </div>
                          <div className="text-xs font-semibold text-gray-600">📊 Average Progress</div>
                        </CardContent>
                      </Card>
                    </motion.div>

                    <motion.div variants={item}>
                      <Card className="border-2 border-green-200 hover:shadow-lg transition-shadow">
                        <CardContent className="p-4 flex flex-col items-center text-center">
                          <div className="bg-gradient-to-br from-green-400 to-emerald-500 p-3 rounded-full mb-3">
                            <BookOpenCheck className="h-6 w-6 text-white" />
                          </div>
                          <div className="text-2xl font-heading font-bold text-green-600 mb-1">
                            {getCompletedBooksCount(selectedStudent.id)}
                          </div>
                          <div className="text-xs font-semibold text-gray-600">📚 Books Completed</div>
                        </CardContent>
                      </Card>
                    </motion.div>

                    <motion.div variants={item}>
                      <Card className="border-2 border-blue-200 hover:shadow-lg transition-shadow">
                        <CardContent className="p-4 flex flex-col items-center text-center">
                          <div className="bg-gradient-to-br from-blue-400 to-indigo-500 p-3 rounded-full mb-3">
                            <Book className="h-6 w-6 text-white" />
                          </div>
                          <div className="text-2xl font-heading font-bold text-blue-600 mb-1">
                            {getUniqueStudentProgress(selectedStudent.id).length}
                          </div>
                          <div className="text-xs font-semibold text-gray-600">📖 Books Started</div>
                        </CardContent>
                      </Card>
                    </motion.div>

                    <motion.div variants={item}>
                      <Card className="border-2 border-amber-300 hover:shadow-lg transition-shadow">
                        <CardContent className="p-4 flex flex-col items-center text-center">
                          <div className="bg-gradient-to-br from-amber-300 to-yellow-300 p-3 rounded-full mb-3">
                            <BarChart3 className="h-6 w-6 text-ilaw-navy" />
                          </div>
                          <div className="text-2xl font-heading font-bold text-amber-600 mb-1">
                            {(() => {
                              const v = getAverageQuizForStudent(selectedStudent.id);
                              return v != null ? `${v}%` : "—";
                            })()}
                          </div>
                          <div className="text-xs font-semibold text-gray-600">🧠 Avg Quiz Score</div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  </div>

{/* Earned Badges — TEACHER (navy) scheme to match Book Progress */}
<motion.div variants={fadeInUp}>
  <h4 className="text-lg font-heading font-bold text-ilaw-navy mb-3 flex items-center">
    <Award className="h-5 w-5 text-ilaw-gold mr-2" />
    🏅 Earned Badges
    <span className="text-xs text-yellow-500 ml-2">
      ({earnedBadges.length} {earnedBadges.length === 1 ? "badge" : "badges"})
    </span>
  </h4>

  {earnedBadgesLoading ? (
    <div className="bg-white p-6 rounded-xl text-center border-2 border-brand-navy-200">
      <Loader2 className="h-5 w-5 animate-spin inline-block mr-2 text-ilaw-gold" />
      <span className="text-brand-navy-700 font-medium">Loading badges…</span>
    </div>
  ) : earnedBadges.length === 0 ? (
    <div className="bg-white p-6 rounded-xl text-center border-2 border-brand-navy-200">
      <p className="text-brand-navy-700 font-medium">No badges earned yet.</p>
    </div>
  ) : (
    <div className="rounded-xl border-2 border-brand-navy-200 overflow-hidden max-h-64 overflow-y-auto">
      <Table>
        <TableHeader>
          {/* match Book Progress header */}
          <TableRow className="bg-brand-navy-50 hover:bg-brand-navy-50">
            <TableHead className="font-heading font-bold text-ilaw-navy">BADGE</TableHead>
            <TableHead className="font-heading font-bold text-ilaw-navy">BOOK</TableHead>
            <TableHead className="font-heading font-bold text-ilaw-navy">DESCRIPTION</TableHead>
            <TableHead className="font-heading font-bold text-ilaw-navy">AWARDED</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {earnedBadges.map((eb) => {
            const icon = getBadgeIconUrl(eb.badge, 64);
            const bookId: number | undefined =
              (eb as any).book?.id ?? (eb as any).bookId ?? undefined;
            const bookTitle =
              eb.book?.title ??
              (bookId && bookTitleById.get(bookId)) ??
              (bookId ? `Book #${bookId}` : null);
            const coverUrl = eb.book ? getCoverUrl(eb.book, 32) : null;
            const awardedAt =
              (eb as any).awardedAt ??
              (eb as any).awarded_at ??
              (eb as any).createdAt ??
              (eb as any).created_at ??
              null;
            const desc = eb.badge?.description ?? null;

            return (
              <TableRow key={eb.id} className="border-b border-brand-navy-100">
                <TableCell className="font-medium">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-brand-navy-50 border border-brand-navy-200 flex items-center justify-center shrink-0">
                      {icon ? (
                        <img src={icon} alt={eb.badge?.name || "Badge"} className="w-full h-full object-cover" />
                      ) : (
                        <Award className="h-6 w-6 text-ilaw-navy" />
                      )}
                    </div>
                    <span className="text-ilaw-navy font-semibold">
                      {eb.badge?.name ?? `Badge #${eb.badgeId}`}
                    </span>
                  </div>
                </TableCell>

                <TableCell className="text-ilaw-navy/80">
                  {bookTitle ? (
                    <div className="flex items-center gap-2">
                      {coverUrl ? (
                        <img
                          src={coverUrl}
                          alt={bookTitle}
                          className="h-5 w-4 rounded-sm border border-brand-navy-200 object-cover"
                        />
                      ) : (
                        <Book className="h-4 w-4 text-ilaw-navy/70" />
                      )}
                      <span>{bookTitle}</span>
                    </div>
                  ) : (
                    "—"
                  )}
                </TableCell>

                <TableCell className="text-sm text-ilaw-navy/80">
                  {desc || eb.note || <span className="text-brand-navy-600">No description</span>}
                </TableCell>

                <TableCell className="text-ilaw-navy font-medium">
                  {awardedAt ? new Date(awardedAt).toLocaleDateString() : "—"}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  )}
</motion.div>

                  {/* Book Progress + latest quiz */}
                  <motion.div variants={item}>
                    <h4 className="text-lg font-heading font-bold text-ilaw-navy mb-3 flex items-center">
                      📚 Book Progress Details
                      <span className="text-xs text-brand-navy-700 ml-2">
                        ({getUniqueStudentProgress(selectedStudent.id).length} records)
                      </span>
                    </h4>
                    <div className="rounded-xl border-2 border-brand-navy-200 overflow-hidden max-h-64 overflow-y-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-brand-navy-50 hover:bg-brand-navy-50">
                            <TableHead className="font-heading font-bold text-ilaw-navy">BOOK</TableHead>
                            <TableHead className="font-heading font-bold text-ilaw-navy">COMPLETION</TableHead>
                            <TableHead className="font-heading font-bold text-ilaw-navy">LAST READ</TableHead>
                            <TableHead className="font-heading font-bold text-ilaw-navy">TIME</TableHead>
                            <TableHead className="font-heading font-bold text-ilaw-navy">
                              QUIZ (LATEST • ATTEMPTS)
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getUniqueStudentProgress(selectedStudent.id).length > 0 ? (
                            getUniqueStudentProgress(selectedStudent.id).map((progress: any, index: number) => {
                              const pct =
                                typeof progress.percentComplete === "number"
                                  ? progress.percentComplete
                                  : parseFloat(progress.percentComplete || 0);
                              const lastRead = progress.lastReadAt || progress.last_read_at || progress.updatedAt;
                              const readingTimeInSeconds = progress.totalReadingTime || progress.total_reading_time || 0;
                              const readingTime = formatTime(readingTimeInSeconds);

                              const bookId: number = progress.book?.id ?? progress.bookId;
                              const coverUrl = getCoverUrl(progress.book, 56);

                              const latestQuiz = latestSessionForBook(selectedStudent.id, bookId);
                              const attemptsCount = sessionsForBook(selectedStudent.id, bookId).length;

                              return (
                                <TableRow key={`${bookId}-${index}`} className="border-b border-brand-navy-100">
                                  <TableCell className="font-medium">
                                    <div className="flex items-center space-x-3">
                                      <BookCover url={coverUrl} ratio="portrait" framed={false} className="w-8 bg-transparent border-0" />
                                      <span className="text-ilaw-navy font-semibold">
                                        {progress.book?.title || `Book #${bookId}`}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center space-x-3">
                                      <Progress value={pct} className="flex-1 h-3 bg-brand-navy-100" />
                                      <span className="text-sm font-bold text-ilaw-navy w-12 text-right">
                                        {Math.round(pct)}%
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-brand-navy-700">
                                    {lastRead ? (
                                      <div className="text-sm">
                                        <div className="font-semibold">
                                          {new Date(lastRead).toLocaleDateString()}
                                        </div>
                                        <div className="text-xs text-brand-navy-700">
                                          {new Date(lastRead).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="text-brand-navy-700 text-sm">Not read</span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center space-x-2">
                                      <div className="p-1 rounded bg-blue-100">
                                        <svg className="h-3 w-3 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                                          <path
                                            fillRule="evenodd"
                                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                                            clipRule="evenodd"
                                          />
                                        </svg>
                                      </div>
                                      <span className="text-sm font-semibold text-blue-700">{readingTime}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {attemptsLoading ? (
                                      <span className="text-brand-navy-700">…</span>
                                    ) : latestQuiz ? (
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <Badge
                                          variant="outline"
                                          className={`font-bold ${
                                            latestQuiz.percentage >= 80
                                              ? "border-green-400 text-green-700"
                                              : latestQuiz.percentage >= 50
                                              ? "border-amber-400 text-amber-700"
                                              : "border-red-400 text-red-700"
                                          }`}
                                          title="Latest quiz score"
                                        >
                                          {latestQuiz.percentage}%{" "}
                                          <span className="ml-1 text-[10px] opacity-70">({latestQuiz.mode})</span>
                                        </Badge>
                                        <Badge
                                          variant="outline"
                                          className="font-bold border-brand-navy-200 text-ilaw-navy"
                                          title="Total quiz attempts"
                                        >
                                          {attemptsCount} {attemptsCount === 1 ? "attempt" : "attempts"}
                                        </Badge>
                                      </div>
                                    ) : (
                                      <span className="text-brand-navy-700">—</span>
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            })
                          ) : (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center py-8">
                                <div className="flex flex-col items-center space-y-3">
                                  <div className="p-4 rounded-full bg-brand-navy-100">
                                    <Book className="h-8 w-8 text-brand-navy-300" />
                                  </div>
                                  <div>
                                    <p className="font-heading font-bold text-ilaw-navy mb-1">📚 No reading progress yet</p>
                                    <p className="text-sm text-brand-navy-700">Student hasn't started reading any books</p>
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </motion.div>
                </motion.div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-brand-navy-700">No student selected</p>
                </div>
              )}

              <DialogFooter className="border-t border-brand-navy-200 pt-4">
                <Button onClick={() => setShowProgressDialog(false)} className="bg-ilaw-gold hover:bg-brand-gold-600 text-ilaw-navy font-heading font-bold">
                  Close
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </main>
    </div>
  );
}

export default TeacherStudents;