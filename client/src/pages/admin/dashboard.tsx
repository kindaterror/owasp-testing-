// == IMPORTS & DEPENDENCIES ==
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
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
  Shield,
} from "lucide-react";
import { motion } from "framer-motion";

// Small animation presets (UI-only; no data logic touched)
const fadeIn = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};
const fadeInFast = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
};
const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const cardBase =
  "group border border-brand-gold-200 hover:border-ilaw-gold transition-all duration-300 " +
  "shadow-sm hover:shadow-xl bg-white rounded-2xl will-change-transform hover:-translate-y-0.5";

// == ADMIN DASHBOARD COMPONENT ==
export default function AdminDashboard() {
  // == DATA FETCHING ==
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

  const { data: teachersData } = useQuery({
    queryKey: ["/api/teachers", "pending"],
    queryFn: async () => {
      const response = await fetch("/api/teachers?status=pending", {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      if (!response.ok) throw new Error("Failed to fetch pending teachers");
      return response.json();
    },
  });

  // == COMPUTED VALUES ==
  const pendingTeachersCount = teachersData?.teachers?.length || 0;

  // == RENDER COMPONENT ==
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-ilaw-white via-brand-gold-50 to-brand-navy-50">
      <Header variant="admin" />

      <main className="flex-grow p-4 md:p-6">
        <div className="container mx-auto">
          {/* == Welcome Section == */}
          <motion.div
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            className="bg-ilaw-navy rounded-2xl p-8 mb-8 text-white shadow-lg relative overflow-hidden"
          >
            {/* Soft sheen */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 [mask-image:radial-gradient(60%_60%_at_20%_20%,black,transparent)]" />
            <div className="flex items-start justify-between relative">
              <div className="flex-1">
                <div className="flex items-center mb-3">
                  <Shield className="h-8 w-8 text-ilaw-gold mr-3" />
                  <span className="text-lg font-heading font-bold text-ilaw-gold uppercase tracking-wide">
                    Ilaw ng Bayan Learning Institute
                  </span>
                </div>
                <h1 className="text-3xl md:text-4xl font-heading font-bold mb-3">
                  Welcome back, Administrator!
                </h1>
                <p className="text-base text-blue-100 mb-4 max-w-2xl">
                  Continue your leadership journey and guide the light of knowledge through excellence and
                  service.
                </p>
                <p className="text-brand-gold-300 font-medium flex items-center">
                  <span className="mr-2">🎯</span>
                  Liwanag • Kaalaman • Paglilingkod
                </p>
              </div>
            </div>
          </motion.div>

          {/* == Header Section == */}
          <motion.div
            className="flex flex-col md:flex-row md:items-center md:justify-between mb-6"
            variants={fadeInFast}
            initial="hidden"
            animate="visible"
          >
            <div>
              <h2 className="text-2xl font-heading font-bold text-ilaw-navy">Management Overview</h2>
              <p className="text-yellow-700 font-medium">Monitor your institution&apos;s performance</p>
            </div>
            <div className="mt-4 md:mt-0">
              <Link href="/admin/add-book">
                <Button className="bg-gradient-to-r from-ilaw-gold to-amber-500 hover:from-amber-500 hover:to-yellow-600 text-ilaw-navy font-heading font-bold shadow-md transition-transform duration-300 hover:-translate-y-0.5 active:translate-y-0">
                  <Plus className="mr-2 h-4 w-4" />
                  Add New Book
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* == Statistics Cards == */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
          >
            {/* == Total Students Card == */}
            <motion.div variants={fadeIn} className={cardBase}>
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-yellow-700 text-sm font-medium">Total Students</p>
                    <h3 className="text-3xl font-heading font-bold mt-1 text-ilaw-navy">
                      {isLoadingStudents ? "..." : studentsData?.students?.length || 0}
                    </h3>
                  </div>
                  <div className="bg-gradient-to-br from-ilaw-navy-100 to-ilaw-navy-200 p-3 rounded-lg">
                    <Users className="h-6 w-6 text-ilaw-navy transition-transform duration-300 group-hover:scale-110" />
                  </div>
                </div>
                <div className="flex items-center mt-4 text-sm">
                  <span className="text-green-600 flex items-center font-medium">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    12%
                  </span>
                  <span className="text-slate-600 ml-2">approved students</span>
                </div>
              </div>
            </motion.div>

            {/* == Average Reading Time Card == */}
            <motion.div variants={fadeIn} className={cardBase}>
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-yellow-700 text-sm font-medium">Avg. Reading Time</p>
                    <h3 className="text-3xl font-heading font-bold mt-1 text-ilaw-navy">
                      {isLoadingStats ? "..." : `${statsData?.stats?.avgReadingTime || 25} min`}
                    </h3>
                  </div>
                  <div className="bg-gradient-to-br from-brand-gold-100 to-brand-gold-200 p-3 rounded-lg">
                    <Clock className="h-6 w-6 text-ilaw-gold transition-transform duration-300 group-hover:rotate-6" />
                  </div>
                </div>
                <div className="flex items-center mt-4 text-sm">
                  <span className="text-green-600 flex items-center font-medium">
                    <TrendingUp className="h-3 w-3 mr-1" />
                    5%
                  </span>
                  <span className="text-slate-600 ml-2">from last month</span>
                </div>
              </div>
            </motion.div>

            {/* == Completion Rate Card == */}
            <motion.div variants={fadeIn} className={cardBase}>
              <div className="p-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-yellow-700 text-sm font-medium">Completion Rate</p>
                    <h3 className="text-3xl font-heading font-bold mt-1 text-ilaw-navy">
                      {isLoadingStats ? "..." : `${statsData?.stats?.completionRate || 0}%`}
                    </h3>
                  </div>
                  <div className="bg-gradient-to-br from-ilaw-navy-100 to-ilaw-navy-200 p-3 rounded-lg">
                    <BarChart3 className="h-6 w-6 text-ilaw-navy transition-transform duration-300 group-hover:scale-110" />
                  </div>
                </div>
                <div className="flex items-center mt-4 text-sm">
                  <span className="text-red-600 flex items-center font-medium">
                    <TrendingDown className="h-3 w-3 mr-1" />
                    2%
                  </span>
                  <span className="text-slate-600 ml-2">from last month</span>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* == Action Cards == */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6"
          >
            {/* == Manage Books Card == */}
            <Link href="/admin/books">
              <motion.div variants={fadeIn} className={`${cardBase} p-6 cursor-pointer`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-heading font-bold text-ilaw-navy">Manage Books</h3>
                    <p className="text-slate-600 mt-1 text-sm">View, edit and add new books</p>
                  </div>
                  <div className="bg-gradient-to-br from-brand-gold-100 to-brand-gold-200 p-4 rounded-lg">
                    <BookOpen className="h-6 w-6 text-ilaw-gold transition-transform duration-300 group-hover:-translate-y-0.5" />
                  </div>
                </div>
              </motion.div>
            </Link>

            {/* == Manage Students Card == */}
            <Link href="/admin/students">
              <motion.div variants={fadeIn} className={`${cardBase} p-6 cursor-pointer`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-heading font-bold text-ilaw-navy">Manage Students</h3>
                    <p className="text-slate-600 mt-1 text-sm">View student progress and activities</p>
                  </div>
                  <div className="bg-gradient-to-br from-ilaw-navy-100 to-ilaw-navy-200 p-4 rounded-lg">
                    <Users className="h-6 w-6 text-ilaw-navy transition-transform duration-300 group-hover:-translate-y-0.5" />
                  </div>
                </div>
              </motion.div>
            </Link>

            {/* == Manage Teachers Card == */}
            <Link href="/admin/teacher">
              <motion.div variants={fadeIn} className={`${cardBase} p-6 cursor-pointer`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-heading font-bold text-ilaw-navy">Manage Teachers</h3>
                    <p className="text-slate-600 mt-1 text-sm">
                      Approve and monitor teacher accounts
                      {pendingTeachersCount > 0 && (
                        <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-800 rounded-full font-bold">
                          {pendingTeachersCount} pending
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-brand-gold-100 to-brand-gold-200 p-4 rounded-lg">
                    <GraduationCap className="h-6 w-6 text-ilaw-gold transition-transform duration-300 group-hover:-translate-y-0.5" />
                  </div>
                </div>
              </motion.div>
            </Link>
          </motion.div>
        </div>
      </main>
    </div>
  );
}