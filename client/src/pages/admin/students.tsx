// src/pages/admin/students.tsx
// == IMPORTS & DEPENDENCIES ==
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Search,
  Filter,
  Eye,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  XCircle,
  Book,
  BookOpen,
  BookOpenCheck,
  GraduationCap,
  Users,
  BarChart3,
  Award,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { toast } from "@/hooks/use-toast";

// shared media components
import { AvatarImg, BookCover } from "@/components/ui/media";

// ---------- animations ----------
const fadeInUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};
const fadeIn = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
const stagger = { visible: { transition: { staggerChildren: 0.05 } } };

// ---------- helpers ----------
const formatTime = (totalSeconds: number) => {
  if (!totalSeconds || totalSeconds === 0) return "0:00:00";
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
};

// Cloudinary helper
const CLOUD =
  import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ||
  import.meta.env.VITE_PUBLIC_CLOUDINARY_CLOUD_NAME ||
  import.meta.env.CLOUDINARY_CLOUD_NAME;

const getCoverUrl = (book: any, w = 64) => {
  if (!book) return null;
  const direct = book.coverImage ?? book.cover_image ?? null;
  if (direct) return direct;
  const publicId = book.coverPublicId ?? book.cover_public_id ?? null;
  if (publicId && CLOUD) {
    return `https://res.cloudinary.com/${CLOUD}/image/upload/c_fill,w=${w},h=${Math.round(
      w * 1.33
    )},q_auto,f_auto/${publicId}`;
  }
  return (
    (book as any).coverUrl ??
    (book as any).cover_url ??
    (book as any).imageUrl ??
    (book as any).image_url ??
    null
  );
};

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

// ---------- quiz types + session logic ----------
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

const SESSION_GAP_SEC = 120;

export default function AdminStudents() {
  // == STATE ==
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("all");
  const [activeTab, setActiveTab] = useState("approved");
  const [rejectReason, setRejectReason] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [showProgressDialog, setShowProgressDialog] = useState(false);

  const queryClient = useQueryClient();

  // == DATA ==
  const { data: studentsData, isLoading } = useQuery({
    queryKey: ["/api/students", activeTab, page, filter, searchTerm],
    queryFn: async () => {
      let url = `/api/students?status=${activeTab}`;
      if (page > 1) url += `&page=${page}`;
      if (filter !== "all") url += `&grade=${filter}`;
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!response.ok) throw new Error("Failed to fetch students");
      return response.json();
    },
  });

  const { data: pendingStudentsData } = useQuery({
    queryKey: ["/api/students", "pending"],
    queryFn: async () => {
      const response = await fetch("/api/students?status=pending", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!response.ok) throw new Error("Failed to fetch pending students");
      return response.json();
    },
  });

  const { data: progressData } = useQuery({
    queryKey: ["/api/progress"],
    queryFn: async () => {
      const response = await fetch("/api/progress", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!response.ok) throw new Error("Failed to fetch progress data");
      return response.json();
    },
  });

  // all quiz attempts
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

  // earned badges for selected student
  const {
    data: earnedBadgesPayload,
    isLoading: earnedBadgesLoading,
  } = useQuery({
    queryKey: ["/api/users", selectedStudent?.id, "badges", showProgressDialog],
    enabled: !!selectedStudent?.id && showProgressDialog,
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/users/${selectedStudent!.id}/badges`);
      return res?.earnedBadges ?? res?.earned_badges ?? res ?? [];
    },
  });

  const earnedBadges: EarnedBadge[] = earnedBadgesPayload ?? [];

  // ---------- progress helpers ----------
  const getUniqueStudentProgress = (studentId: number) => {
    if (!progressData?.progress) return [];
    const studentProgress = progressData.progress.filter(
      (p: any) => p.userId === studentId
    );
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

  // == MUTATIONS ==
  const approveMutation = useMutation({
    mutationFn: (studentId: number) => apiRequest("POST", `/api/students/${studentId}/approve`, {}),
    onSuccess: () => {
      toast({ title: "Success", description: "Student account has been approved" });
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ studentId, reason }: { studentId: number; reason: string }) =>
      apiRequest("POST", `/api/students/${studentId}/reject`, { reason }),
    onSuccess: () => {
      setRejectDialogOpen(false);
      setRejectReason("");
      toast({ title: "Success", description: "Student account has been rejected" });
      queryClient.invalidateQueries({ queryKey: ["/api/students"] });
    },
  });

  // == UI handlers ==
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    queryClient.invalidateQueries({
      queryKey: ["/api/students", activeTab, page, filter, searchTerm],
    });
  };

  const pendingCount = pendingStudentsData?.students?.length || 0;

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

  // == RENDER ==
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-ilaw-white via-brand-gold-50 to-brand-navy-50">
      <Header variant="admin" />

      {/* Top banner (with motion like dashboard) */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(900px_500px_at_10%_-10%,rgba(255,215,128,0.25),transparent),radial-gradient(900px_500px_at_110%_10%,rgba(13,35,66,0.25),transparent)] pointer-events-none" />
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="bg-ilaw-navy text-white py-6 relative"
        >
          <div className="container mx-auto px-4">
            <motion.div variants={fadeInUp} className="flex items-center justify-center mb-2">
              <GraduationCap className="h-8 w-8 text-ilaw-gold mr-3" />
              <span className="text-lg font-heading font-bold text-ilaw-gold">
                ILAW NG BAYAN LEARNING INSTITUTE
              </span>
            </motion.div>
            <motion.h1
              variants={fadeInUp}
              className="text-3xl font-heading font-bold text-center tracking-tight"
            >
              👥 Student Management
            </motion.h1>
            <motion.p variants={fadeInUp} className="text-lg text-blue-100 text-center">
              Manage learner accounts and track progress
            </motion.p>
          </div>
        </motion.div>
      </div>

      <main className="flex-grow p-4 md:p-6">
        <div className="container mx-auto">
          {/* Back */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex flex-col md:flex-row md:items-center md:justify-between mb-8"
          >
            <div className="flex flex-col md:flex-row md:items-center gap-2">
              <Link href="/admin">
                <Button
                  variant="outline"
                  size="sm"
                  className="border-2 border-brand-gold-300 text-ilaw-navy hover:bg-brand-gold-50 font-heading font-bold mt-2 md:mt-0 transition"
                  asChild={false}
                >
                  <span className="flex items-center">
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                  </span>
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Search & Filter */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="border-2 border-brand-gold-200 bg-white rounded-2xl shadow-lg mb-8"
          >
            <div className="border-b border-brand-gold-200 p-6">
              <h3 className="text-xl font-heading font-bold text-ilaw-navy flex items-center">
                <Users className="h-6 w-6 text-ilaw-gold mr-2" />
                🔍 Search & Filter Students
              </h3>
            </div>
            <div className="p-6">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <form onSubmit={handleSearch} className="w-full md:w-auto">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-gold-500" size={18} />
                    <Input
                      placeholder="Search students..."
                      className="pl-10 w-full md:w-[300px] border-2 border-brand-gold-200 focus:border-ilaw-gold transition-colors"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </form>

                <div className="flex items-center gap-3 w-full md:w-auto">
                  <Filter size={18} className="text-ilaw-gold" />
                  <Select
                    value={filter}
                    onValueChange={(value) => {
                      setFilter(value);
                      setPage(1);
                      queryClient.invalidateQueries({
                        queryKey: ["/api/students", activeTab, 1, value, searchTerm],
                      });
                    }}
                  >
                    <SelectTrigger className="w-[180px] border-2 border-brand-gold-200 focus:border-ilaw-gold">
                      <SelectValue placeholder="Select Grade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">🎓 All Grades</SelectItem>
                      <SelectItem value="K">🌟 Kindergarten</SelectItem>
                      <SelectItem value="1">1️⃣ Grade 1</SelectItem>
                      <SelectItem value="2">2️⃣ Grade 2</SelectItem>
                      <SelectItem value="3">3️⃣ Grade 3</SelectItem>
                      <SelectItem value="4">4️⃣ Grade 4</SelectItem>
                      <SelectItem value="5">5️⃣ Grade 5</SelectItem>
                      <SelectItem value="6">6️⃣ Grade 6</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </motion.div>

{/* Student Directory */}
<motion.div
  initial={{ opacity: 0, y: 12 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.45, ease: "easeOut" }}
  className="border-2 border-brand-gold-200 bg-white rounded-2xl shadow-lg"
>
  <div className="border-b border-brand-gold-200 p-6">
    <h3 className="text-xl font-heading font-bold text-ilaw-navy flex items-center">
      <Users className="h-6 w-6 text-ilaw-gold mr-2" />
      👥 Student Directory
    </h3>
  </div>

  <div className="pt-6 px-6 pb-0">
    <Tabs
      defaultValue="approved"
      value={activeTab}
      onValueChange={(value) => {
        setActiveTab(value);
        setPage(1);
        setFilter("all");
        queryClient.invalidateQueries({
          queryKey: ["/api/students", value, 1, "all", searchTerm],
        });
      }}
      className="space-y-4"
    >
      <TabsList className="grid grid-cols-3 bg-brand-gold-100 rounded-xl">
        <TabsTrigger
          value="approved"
          className="font-heading font-bold data-[state=active]:bg-ilaw-navy data-[state=active]:text-white transition-colors"
        >
          ✅ Approved Students
        </TabsTrigger>
        <TabsTrigger
          value="pending"
          className="relative font-heading font-bold data-[state=active]:bg-ilaw-navy data-[state=active]:text-white transition-colors"
        >
          ⏳ Pending Approval
          {pendingCount > 0 && (
            <Badge variant="destructive" className="ml-2 absolute -top-2 -right-2 animate-bounce">
              {pendingCount}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger
          value="rejected"
          className="font-heading font-bold data-[state=active]:bg-ilaw-navy data-[state=active]:text-white transition-colors"
        >
          ❌ Rejected
        </TabsTrigger>
      </TabsList>

      {/* 🔥 animate panel switch */}
      <AnimatePresence mode="wait" initial={false}>
        {activeTab === "approved" && (
          <motion.div
            key="approved"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            layout
          >
            <TabsContent value="approved" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-brand-gold-200">
                    <TableHead className="font-heading font-bold text-ilaw-navy">👤 Name</TableHead>
                    <TableHead className="font-heading font-bold text-ilaw-navy">📧 Email</TableHead>
                    <TableHead className="font-heading font-bold text-ilaw-navy">🎓 Grade Level</TableHead>
                    <TableHead className="font-heading font-bold text-ilaw-navy">📅 Join Date</TableHead>
                    <TableHead className="font-heading font-bold text-ilaw-navy">📊 Overall Progress</TableHead>
                    <TableHead className="font-heading font-bold text-ilaw-navy">📚 Books Completed</TableHead>
                    <TableHead className="font-heading font-bold text-ilaw-navy text-center">⚙️ Details</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-yellow-600 font-medium">
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" /> Loading students...
                        </span>
                      </TableCell>
                    </TableRow>
                  ) : studentsData?.students?.length > 0 ? (
                    <AnimatePresence initial={false}>
                      {studentsData.students.map((student: any, idx: number) => (
                        <motion.tr
                          key={student.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.25, delay: idx * 0.02 }}
                          className="border-b border-brand-gold-100 hover:bg-brand-gold-50/60 transition-colors"
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center">
                              <div className="mr-3">
                                <AvatarImg
                                  url={
                                    student.avatar ||
                                    student.photoUrl ||
                                    student.photo_url ||
                                    null
                                  }
                                  firstName={student.firstName}
                                  lastName={student.lastName}
                                  size={40}
                                  className="border-2 border-brand-gold-200"
                                />
                              </div>
                              <div>
                                <div className="font-heading font-bold text-ilaw-navy">
                                  {student.firstName} {student.lastName}
                                </div>
                                <div className="text-sm text-yellow-600 font-medium">@{student.username}</div>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="text-yellow-600 font-medium">{student.email}</TableCell>

                          <TableCell>
                            <Badge variant="outline" className="border-2 border-brand-gold-300 text-yellow-600 font-bold">
                              {student.gradeLevel
                                ? student.gradeLevel === "K"
                                  ? "🌟 Kindergarten"
                                  : `${student.gradeLevel}️⃣ Grade ${student.gradeLevel}`
                                : "N/A"}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-yellow-600 font-medium">
                            {new Date(student.createdAt).toLocaleDateString()}
                          </TableCell>

                          <TableCell>
                            <div className="w-full">
                              <div className="flex justify-between text-xs text-ilaw-navy font-bold mb-1">
                                <span>Progress</span>
                                <motion.span
                                  key={calculateAverageProgress(student.id)}
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  transition={{ duration: 0.3 }}
                                >
                                  {calculateAverageProgress(student.id)}%
                                </motion.span>
                              </div>
                              <Progress
                                value={calculateAverageProgress(student.id)}
                                className="h-2 transition-[width] duration-700 ease-out"
                              />
                            </div>
                          </TableCell>

                          <TableCell>
                            <Badge className="bg-ilaw-navy text-white font-bold">
                              📚 {getCompletedBooksCount(student.id)}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.98 }}
                                className="h-8 w-8 rounded-md inline-flex items-center justify-center hover:bg-brand-gold-100 border-2 border-transparent hover:border-brand-gold-200"
                                onClick={() => {
                                  setSelectedStudent(student);
                                  setShowProgressDialog(true);
                                }}
                                title="View progress"
                              >
                                <Eye className="h-4 w-4 text-ilaw-navy" />
                              </motion.button>
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-yellow-600 font-medium">
                        👥 No approved students found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </motion.div>
        )}

        {activeTab === "pending" && (
          <motion.div
            key="pending"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            layout
          >
            <TabsContent value="pending" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-brand-gold-200">
                    <TableHead className="font-heading font-bold text-ilaw-navy">👤 Name</TableHead>
                    <TableHead className="font-heading font-bold text-ilaw-navy">📧 Email</TableHead>
                    <TableHead className="font-heading font-bold text-ilaw-navy">🎓 Grade Level</TableHead>
                    <TableHead className="font-heading font-bold text-ilaw-navy">📅 Join Date</TableHead>
                    <TableHead className="font-heading font-bold text-ilaw-navy text-center">⚙️ Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-yellow-600 font-medium">
                        <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" />
                        Loading pending students...
                      </TableCell>
                    </TableRow>
                  ) : studentsData?.students?.length > 0 ? (
                    <AnimatePresence initial={false}>
                      {studentsData.students.map((student: any, idx: number) => (
                        <motion.tr
                          key={student.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.25, delay: idx * 0.02 }}
                          className="border-b border-brand-gold-100 hover:bg-brand-gold-50/60 transition-colors"
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center">
                              <div className="mr-3">
                                <AvatarImg
                                  url={
                                    student.avatar ||
                                    student.photoUrl ||
                                    student.photo_url ||
                                    null
                                  }
                                  firstName={student.firstName}
                                  lastName={student.lastName}
                                  size={40}
                                  className="border-2 border-brand-gold-200"
                                />
                              </div>
                              <div>
                                <div className="font-heading font-bold text-ilaw-navy">
                                  {student.firstName} {student.lastName}
                                </div>
                                <div className="text-sm text-yellow-600 font-medium">@{student.username}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-yellow-600 font-medium">{student.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-2 border-brand-gold-300 text-yellow-600 font-bold">
                              {student.gradeLevel
                                ? student.gradeLevel === "K"
                                  ? "🌟 Kindergarten"
                                  : `${student.gradeLevel}️⃣ Grade ${student.gradeLevel}`
                                : "N/A"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-yellow-600 font-medium">
                            {new Date(student.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <motion.button
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.98 }}
                                className="inline-flex items-center text-green-600 border-2 border-green-600 hover:bg-green-50 px-2.5 py-1.5 rounded-md font-bold"
                                onClick={() => approveMutation.mutate(student.id)}
                                disabled={approveMutation.isPending}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                ✅ Approve
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.03 }}
                                whileTap={{ scale: 0.98 }}
                                className="inline-flex items-center text-red-600 border-2 border-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-md font-bold"
                                onClick={() => {
                                  setSelectedStudent(student);
                                  setRejectDialogOpen(true);
                                }}
                                disabled={rejectMutation.isPending}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                ❌ Reject
                              </motion.button>
                            </div>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-yellow-600 font-medium">
                        ⏳ No pending students found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </motion.div>
        )}

        {activeTab === "rejected" && (
          <motion.div
            key="rejected"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            layout
          >
            <TabsContent value="rejected" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-brand-gold-200">
                    <TableHead className="font-heading font-bold text-ilaw-navy">👤 Name</TableHead>
                    <TableHead className="font-heading font-bold text-ilaw-navy">📧 Email</TableHead>
                    <TableHead className="font-heading font-bold text-ilaw-navy">🎓 Grade Level</TableHead>
                    <TableHead className="font-heading font-bold text-ilaw-navy">📅 Join Date</TableHead>
                    <TableHead className="font-heading font-bold text-ilaw-navy">❌ Rejection Reason</TableHead>
                    <TableHead className="font-heading font-bold text-ilaw-navy">⚙️ Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-yellow-600 font-medium">
                        <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" />
                        Loading rejected students...
                      </TableCell>
                    </TableRow>
                  ) : studentsData?.students?.length > 0 ? (
                    <AnimatePresence initial={false}>
                      {studentsData.students.map((student: any, idx: number) => (
                        <motion.tr
                          key={student.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.25, delay: idx * 0.02 }}
                          className="border-b border-brand-gold-100 hover:bg-brand-gold-50/60 transition-colors"
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center">
                              <div className="mr-3">
                                <AvatarImg
                                  url={
                                    student.avatar ||
                                    student.photoUrl ||
                                    student.photo_url ||
                                    null
                                  }
                                  firstName={student.firstName}
                                  lastName={student.lastName}
                                  size={40}
                                  className="border-2 border-brand-gold-200"
                                />
                              </div>
                              <div>
                                <div className="font-heading font-bold text-ilaw-navy">
                                  {student.firstName} {student.lastName}
                                </div>
                                <div className="text-sm text-yellow-600 font-medium">@{student.username}</div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-yellow-600 font-medium">{student.email}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-2 border-brand-gold-300 text-yellow-600 font-bold">
                              {student.gradeLevel
                                ? student.gradeLevel === "K"
                                  ? "🌟 Kindergarten"
                                  : `${student.gradeLevel}️⃣ Grade ${student.gradeLevel}`
                                : "N/A"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-yellow-600 font-medium">
                            {new Date(student.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-red-600 font-medium">
                            {student.rejectionReason || "No reason provided"}
                          </TableCell>
                          <TableCell className="text-center">
                            <motion.button
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.98 }}
                              className="inline-flex items-center text-green-600 border-2 border-green-600 hover:bg-green-50 px-2.5 py-1.5 rounded-md font-bold"
                              onClick={() => approveMutation.mutate(student.id)}
                              disabled={approveMutation.isPending}
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              ✅ Re-approve
                            </motion.button>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-yellow-600 font-medium">
                        ❌ No rejected students found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TabsContent>
          </motion.div>
        )}
      </AnimatePresence>
    </Tabs>

              {/* Pagination */}
              {studentsData?.totalPages > 1 && (
                <div className="flex items-center justify-between py-4">
                  <div className="text-sm text-yellow-600 font-medium">
                    Showing page {page} of {studentsData.totalPages}
                  </div>
                  <div className="flex items-center space-x-2">
                    <motion.button
                      whileHover={{ scale: page === 1 ? 1 : 1.03 }}
                      whileTap={{ scale: page === 1 ? 1 : 0.97 }}
                      onClick={() => setPage(Math.max(1, page - 1))}
                      disabled={page === 1}
                      className="border-2 border-brand-gold-300 text-ilaw-navy hover:bg-brand-gold-50 font-heading font-bold rounded-md px-3 py-1.5 disabled:opacity-50"
                    >
                      <span className="inline-flex items-center">
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Previous
                      </span>
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: page === studentsData.totalPages ? 1 : 1.03 }}
                      whileTap={{ scale: page === studentsData.totalPages ? 1 : 0.97 }}
                      onClick={() => setPage(Math.min(studentsData.totalPages, page + 1))}
                      disabled={page === studentsData.totalPages}
                      className="border-2 border-brand-gold-300 text-ilaw-navy hover:bg-brand-gold-50 font-heading font-bold rounded-md px-3 py-1.5 disabled:opacity-50"
                    >
                      <span className="inline-flex items-center">
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </span>
                    </motion.button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </main>

      {/* == Progress Dialog == */}
      <Dialog open={showProgressDialog} onOpenChange={setShowProgressDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto bg-ilaw-white border-2 border-ilaw-gold">
          <DialogHeader className="border-b border-brand-gold-200 pb-4">
            <DialogTitle className="text-xl font-heading font-bold text-ilaw-navy flex items-center">
              <GraduationCap className="h-6 w-6 text-ilaw-gold mr-3" />
              Student Progress Details
            </DialogTitle>
            <DialogDescription className="text-yellow-600 font-medium">
              Detailed reading and quiz progress for {selectedStudent?.firstName} {selectedStudent?.lastName}
            </DialogDescription>
          </DialogHeader>

          {selectedStudent && (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={stagger}
              className="space-y-6"
            >
              {/* Stats */}
              <motion.div variants={fadeInUp} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="border-2 border-ilaw-gold hover:shadow-lg transition-shadow">
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <div className="bg-gradient-to-br from-ilaw-gold to-brand-amber p-3 rounded-full mb-3 shadow-sm">
                      <BookOpen className="h-6 w-6 text-ilaw-navy" />
                    </div>
                    <div className="text-2xl font-heading font-bold text-ilaw-gold mb-1">
                      {calculateAverageProgress(selectedStudent.id)}%
                    </div>
                    <div className="text-xs font-semibold text-gray-600">📊 Average Progress</div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-green-200 hover:shadow-lg transition-shadow">
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <div className="bg-gradient-to-br from-green-400 to-emerald-500 p-3 rounded-full mb-3 shadow-sm">
                      <BookOpenCheck className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-2xl font-heading font-bold text-green-600 mb-1">
                      {getCompletedBooksCount(selectedStudent.id)}
                    </div>
                    <div className="text-xs font-semibold text-gray-600">📚 Books Completed</div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-blue-200 hover:shadow-lg transition-shadow">
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <div className="bg-gradient-to-br from-blue-400 to-indigo-500 p-3 rounded-full mb-3 shadow-sm">
                      <Book className="h-6 w-6 text-white" />
                    </div>
                    <div className="text-2xl font-heading font-bold text-blue-600 mb-1">
                      {getUniqueStudentProgress(selectedStudent.id).length}
                    </div>
                    <div className="text-xs font-semibold text-gray-600">📖 Books Started</div>
                  </CardContent>
                </Card>

                <Card className="border-2 border-amber-300 hover:shadow-lg transition-shadow">
                  <CardContent className="p-4 flex flex-col items-center text-center">
                    <div className="bg-gradient-to-br from-amber-300 to-yellow-300 p-3 rounded-full mb-3 shadow-sm">
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

              {/* Earned Badges */}
              <motion.div variants={fadeInUp}>
                <h4 className="text-lg font-heading font-bold text-ilaw-navy mb-3 flex items-center">
                  <Award className="h-5 w-5 text-ilaw-gold mr-2" />
                  🏅 Earned Badges
                  <span className="text-xs text-yellow-500 ml-2">
                    ({earnedBadges.length} {earnedBadges.length === 1 ? "badge" : "badges"})
                  </span>
                </h4>

                {earnedBadgesLoading ? (
                  <div className="bg-white p-6 rounded-xl text-center border-2 border-brand-gold-200">
                    <Loader2 className="h-5 w-5 animate-spin inline-block mr-2 text-ilaw-gold" />
                    <span className="text-brand-gold-600 font-medium">Loading badges…</span>
                  </div>
                ) : earnedBadges.length === 0 ? (
                  <div className="bg-white p-6 rounded-xl text-center border-2 border-brand-gold-200">
                    <p className="text-brand-gold-600 font-medium">No badges earned yet.</p>
                  </div>
                ) : (
                  <div className="rounded-xl border-2 border-brand-gold-200 overflow-hidden max-h-64 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-brand-gold-50 hover:bg-brand-gold-50">
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
                            <TableRow key={eb.id} className="border-b border-brand-gold-100">
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-brand-gold-50 border border-brand-gold-200 flex items-center justify-center shrink-0">
                                    {icon ? (
                                      <img src={icon} alt={eb.badge?.name || "Badge"} className="w-full h-full object-cover" />
                                    ) : (
                                      <Award className="h-6 w-6 text-ilaw-gold" />
                                    )}
                                  </div>
                                  <span className="text-ilaw-navy font-semibold">
                                    {eb.badge?.name ?? `Badge #${eb.badgeId}`}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-yellow-700">
                                {bookTitle ? (
                                  <div className="flex items-center gap-2">
                                    {coverUrl ? (
                                      <img
                                        src={coverUrl}
                                        alt={bookTitle}
                                        className="h-5 w-4 rounded-sm border border-brand-gold-200 object-cover"
                                      />
                                    ) : (
                                      <Book className="h-4 w-4 text-yellow-600" />
                                    )}
                                    <span>{bookTitle}</span>
                                  </div>
                                ) : (
                                  "—"
                                )}
                              </TableCell>
                              <TableCell className="text-sm text-ilaw-navy/80">
                                {desc || eb.note || <span className="text-yellow-500">No description</span>}
                              </TableCell>
                              <TableCell className="text-yellow-600 font-medium">
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

              {/* Book Progress table */}
              <motion.div variants={fadeInUp}>
                <h4 className="text-lg font-heading font-bold text-ilaw-navy mb-3 flex items-center">
                  📚 Book Progress Details
                  <span className="text-xs text-yellow-500 ml-2">
                    ({getUniqueStudentProgress(selectedStudent.id).length} records)
                  </span>
                </h4>
                <div className="rounded-xl border-2 border-brand-gold-200 overflow-hidden max-h-64 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-brand-gold-50 hover:bg-brand-gold-50">
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
                          const lastRead =
                            progress.lastReadAt || progress.last_read_at || progress.updatedAt;
                          const readingTimeInSeconds =
                            progress.totalReadingTime || progress.total_reading_time || 0;
                          const readingTime = formatTime(readingTimeInSeconds);
                          const bookId: number = progress.book?.id ?? progress.bookId;
                          const coverUrl = getCoverUrl(progress.book, 56);
                          const latestQuiz = latestSessionForBook(selectedStudent.id, bookId);
                          const attemptsCount = sessionsForBook(selectedStudent.id, bookId).length;

                          return (
                            <TableRow key={`${bookId}-${index}`} className="border-b border-brand-gold-100">
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-3">
                                  <BookCover url={coverUrl} ratio="portrait" framed={false} className="w-8 bg-transparent border-0" />
                                  <span className="text-ilaw-navy font-semibold">
                                    {progress.book?.title || `Book #${bookId}`}
                                  </span>
                                </div>
                              </TableCell>

                              <TableCell>
                                <div className="flex items-center space-x-3">
                                  <Progress value={pct} className="flex-1 h-3 bg-brand-gold-200 transition-[width] duration-700 ease-out" />
                                  <span className="text-sm font-bold text-ilaw-navy w-12 text-right">
                                    {Math.round(pct)}%
                                  </span>
                                </div>
                              </TableCell>

                              <TableCell className="text-yellow-600">
                                {lastRead ? (
                                  <div className="text-sm">
                                    <div className="font-semibold">
                                      {new Date(lastRead).toLocaleDateString()}
                                    </div>
                                    <div className="text-xs text-yellow-500">
                                      {new Date(lastRead).toLocaleTimeString([], {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      })}
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-yellow-400 text-sm">Not read</span>
                                )}
                              </TableCell>

                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <div className="p-1 rounded bg-blue-100 animate-pulse">
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
                                  <span className="text-yellow-600">…</span>
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
                                      className="font-bold border-brand-gold-300 text-ilaw-navy"
                                      title="Total quiz attempts"
                                    >
                                      {attemptsCount} {attemptsCount === 1 ? "attempt" : "attempts"}
                                    </Badge>
                                  </div>
                                ) : (
                                  <span className="text-yellow-600">—</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8">
                            <div className="flex flex-col items-center space-y-3">
                              <div className="p-4 rounded-full bg-brand-gold-100 animate-pulse">
                                <Book className="h-8 w-8 text-brand-gold-400" />
                              </div>
                              <div>
                                <p className="font-heading font-bold text-yellow-600 mb-1">
                                  📚 No reading progress yet
                                </p>
                                <p className="text-sm text-yellow-500">
                                  Student hasn't started reading any books
                                </p>
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
          )}

          <DialogFooter className="border-t border-brand-gold-200 pt-4">
            <Button
              onClick={() => setShowProgressDialog(false)}
              className="bg-ilaw-gold hover:bg-brand-amber text-ilaw-navy font-heading font-bold"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-ilaw-navy font-heading font-bold">
              ❌ Reject Student Account
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject {selectedStudent?.firstName} {selectedStudent?.lastName}'s
              account? Please provide a reason for rejection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              className="border-2 border-brand-gold-200 focus:border-ilaw-gold"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-2 border-brand-gold-300 text-ilaw-navy hover:bg-brand-gold-50 font-heading font-bold">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                rejectMutation.mutate({
                  studentId: selectedStudent.id,
                  reason: rejectReason,
                })
              }
              disabled={!rejectReason.trim()}
              className="bg-red-600 hover:bg-red-700 text-white font-heading font-bold"
            >
              ❌ Reject Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}