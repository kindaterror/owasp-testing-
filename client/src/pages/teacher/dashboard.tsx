import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { jwtDecode } from "jwt-decode";
import { motion, AnimatePresence } from "framer-motion";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import {
  Users,
  BookOpen,
  Clock,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Plus,
  GraduationCap,
  Award,
  ChevronRight,
} from "lucide-react";

// JWT payload type
interface JwtPayload {
  exp: number;
}

// --- motion variants ---
const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0 },
};
const fadeIn = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
const stagger = {
  hidden: { opacity: 1 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

function TeacherDashboard() {
  // Auto-logout based on JWT expiration
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;

    try {
      const decoded = jwtDecode<JwtPayload>(token);
      const expiresAt = decoded.exp * 1000;
      const now = Date.now();

      if (expiresAt < now) {
        alert("Session timed out. Please log in again.");
        localStorage.removeItem("token");
        window.location.href = "/login";
        return;
      }

      const timeout = expiresAt - now;
      const timer = setTimeout(() => {
        alert("Session timed out. Please log in again.");
        localStorage.removeItem("token");
        window.location.href = "/login";
      }, timeout);

      return () => clearTimeout(timer);
    } catch (error) {
      console.error("Invalid token:", error);
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
  }, []);

  // Fetch APPROVED students
  const { data: studentsData, isLoading: isLoadingStudents } = useQuery({
    queryKey: ["/api/students", "approved"],
    queryFn: async () => {
      const response = await fetch("/api/students?status=approved", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!response.ok) throw new Error("Failed to fetch approved students data");
      return response.json();
    },
  });

  // Fetch dashboard statistics
  const { data: statsData, isLoading: isLoadingStats } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: async () => {
      const response = await fetch("/api/stats", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!response.ok) throw new Error("Failed to fetch dashboard stats");
      return response.json();
    },
  });

  const totalStudents = studentsData?.students?.length || 0;
  const avgReading = statsData?.stats?.avgReadingTime ?? 25;
  const completionRate = statsData?.stats?.completionRate ?? 0;

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-brand-navy-50 via-ilaw-white to-brand-gold-50">
      <Header variant="teacher" />

      <main className="flex-grow p-4 md:p-6">
        <div className="container mx-auto">
          {/* ===== Welcome / Banner ===== */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="relative overflow-hidden rounded-2xl mb-8 border-2 border-brand-navy-200 shadow-lg"
          >
            <div className="absolute inset-0 bg-[radial-gradient(700px_400px_at_-10%_-10%,rgba(13,35,66,0.12),transparent),radial-gradient(700px_400px_at_110%_20%,rgba(255,215,128,0.18),transparent)] pointer-events-none" />
            <motion.div
              variants={fadeIn}
              className="bg-gradient-to-r from-ilaw-navy to-brand-navy-800 text-white"
            >
              <div className="p-8">
                <motion.div variants={fadeInUp} className="flex items-center mb-2">
                  <GraduationCap className="h-8 w-8 text-ilaw-gold mr-3" />
                  <span className="text-sm font-semibold uppercase tracking-wider text-white/80">
                    Ilaw ng Bayan Learning Institute
                  </span>
                </motion.div>

                <motion.h1
                  variants={fadeInUp}
                  className="text-3xl md:text-4xl font-heading font-bold"
                >
                  Teacher Dashboard
                </motion.h1>
                <motion.p
                  variants={fadeInUp}
                  className="text-lg text-white/80 mt-1"
                >
                  Guide. Inspire. Illuminate. Welcome back, Teacher!
                </motion.p>

                <motion.div variants={fadeInUp} className="mt-6">
                  <Link href="/teacher/add-book">
                    <Button className="bg-ilaw-gold hover:bg-brand-gold-600 text-ilaw-navy border-2 border-ilaw-gold px-6 py-3 text-lg font-semibold inline-flex items-center group transition-all duration-300 hover:scale-[1.02]">
                      <Plus className="mr-2 h-5 w-5 group-hover:rotate-90 transition-transform duration-300" />
                      Add New Book
                    </Button>
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>

          {/* ===== Stats ===== */}
          <motion.div
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
            initial="hidden"
            animate="visible"
            variants={stagger}
          >
            {/* Total Students */}
            <motion.div
              variants={fadeInUp}
              className="rounded-2xl bg-white border-2 border-brand-navy-200 hover:border-ilaw-gold transition-colors shadow-md"
            >
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-brand-navy-700 text-sm font-medium">Total Students</p>
                    <div className="mt-1 text-3xl font-heading font-bold text-ilaw-navy">
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                          key={isLoadingStudents ? "loading" : totalStudents}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.25 }}
                        >
                          {isLoadingStudents ? "…" : totalStudents}
                        </motion.span>
                      </AnimatePresence>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-brand-navy-100 to-brand-navy-200 p-3 rounded-xl">
                    <Users className="h-6 w-6 text-ilaw-navy" />
                  </div>
                </div>
                <div className="flex items-center mt-4 text-sm">
                  <span className="text-green-600 flex items-center font-medium">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    12%
                  </span>
                  <span className="text-brand-navy-700 ml-2">approved students</span>
                </div>
              </div>
            </motion.div>

            {/* Avg Reading Time */}
            <motion.div
              variants={fadeInUp}
              className="rounded-2xl bg-white border-2 border-brand-navy-200 hover:border-ilaw-gold transition-colors shadow-md"
            >
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-brand-navy-700 text-sm font-medium">Avg. Reading Time</p>
                    <div className="mt-1 text-3xl font-heading font-bold text-ilaw-navy">
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                          key={isLoadingStats ? "loading" : avgReading}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.25 }}
                        >
                          {isLoadingStats ? "…" : `${avgReading} min`}
                        </motion.span>
                      </AnimatePresence>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-ilaw-gold/30 to-ilaw-gold/50 p-3 rounded-xl">
                    <Clock className="h-6 w-6 text-ilaw-gold" />
                  </div>
                </div>
                <div className="flex items-center mt-4 text-sm">
                  <span className="text-green-600 flex items-center font-medium">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    5%
                  </span>
                  <span className="text-brand-navy-700 ml-2">from last month</span>
                </div>
              </div>
            </motion.div>

            {/* Completion Rate */}
            <motion.div
              variants={fadeInUp}
              className="rounded-2xl bg-white border-2 border-brand-navy-200 hover:border-ilaw-gold transition-colors shadow-md"
            >
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-brand-navy-700 text-sm font-medium">Completion Rate</p>
                    <div className="mt-1 text-3xl font-heading font-bold text-ilaw-navy">
                      <AnimatePresence mode="wait" initial={false}>
                        <motion.span
                          key={isLoadingStats ? "loading" : completionRate}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -6 }}
                          transition={{ duration: 0.25 }}
                        >
                          {isLoadingStats ? "…" : `${completionRate}%`}
                        </motion.span>
                      </AnimatePresence>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-brand-navy-100 to-brand-navy-200 p-3 rounded-xl">
                    <BarChart3 className="h-6 w-6 text-ilaw-navy" />
                  </div>
                </div>
                <div className="flex items-center mt-4 text-sm">
                  <span className="text-red-500 flex items-center font-medium">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    2%
                  </span>
                  <span className="text-brand-navy-700 ml-2">from last month</span>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* ===== Action Tiles ===== */}
          <motion.div
            className="border-2 border-brand-navy-200 rounded-2xl overflow-hidden"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
          >
            <div className="flex flex-col lg:flex-row">
              {/* Manage Books */}
              <div className="flex-1">
                <Link href="/teacher/books">
                  <div className="h-full transition-all duration-300 cursor-pointer group bg-gradient-to-br from-white to-brand-navy-50 hover:from-brand-navy-100 hover:to-brand-navy-200 border-r border-brand-navy-200">
                    <div className="p-8 flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-3">
                          <BookOpen className="h-6 w-6 text-ilaw-navy mr-3" />
                          <h3 className="text-xl font-heading font-bold text-ilaw-navy">
                            Manage Books
                          </h3>
                        </div>
                        <p className="text-brand-navy-700 font-medium">
                          View, edit and add new educational resources for your class
                        </p>
                        <div className="mt-4 flex items-center text-ilaw-navy font-semibold">
                          <span>Explore Library</span>
                          <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                      <div className="ml-6">
                        <div className="bg-gradient-to-br from-ilaw-navy to-brand-navy-800 p-4 rounded-xl group-hover:scale-110 transition-transform duration-300">
                          <BookOpen className="h-8 w-8 text-ilaw-gold" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>

              {/* Manage Students */}
              <div className="flex-1">
                <Link href="/teacher/students">
                  <div className="h-full transition-all duration-300 cursor-pointer group bg-gradient-to-br from-white to-brand-gold-50 hover:from-brand-gold-100 hover:to-brand-gold-200">
                    <div className="p-8 flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-3">
                          <Users className="h-6 w-6 text-ilaw-gold mr-3" />
                          <h3 className="text-xl font-heading font-bold text-ilaw-navy">
                            Manage Students
                          </h3>
                        </div>
                        <p className="text-brand-navy-700 font-medium">
                          Monitor student progress, activities, and achievements
                        </p>
                        <div className="mt-4 flex items-center text-ilaw-navy font-semibold">
                          <span>View Students</span>
                          <ChevronRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </div>
                      <div className="ml-6">
                        <div className="bg-gradient-to-br from-ilaw-gold to-brand-amber p-4 rounded-xl group-hover:scale-110 transition-transform duration-300">
                          <Users className="h-8 w-8 text-ilaw-navy" />
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              </div>
            </div>
          </motion.div>

          {/* ===== Quote ===== */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="mt-12 bg-gradient-to-r from-ilaw-navy to-brand-navy-800 rounded-2xl p-8 text-center border-2 border-brand-navy-200"
          >
            <Award className="h-12 w-12 text-ilaw-gold mx-auto mb-4" />
            <blockquote className="text-xl md:text-2xl font-heading font-medium text-ilaw-white mb-4">
              "A teacher affects eternity; they can never tell where their influence stops."
            </blockquote>
            <p className="text-brand-gold-200 font-medium">— Henry Adams</p>
            <div className="mt-6 text-ilaw-gold font-heading italic">
              Liwanag, Kaalaman, Paglilingkod
            </div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

export default TeacherDashboard;
