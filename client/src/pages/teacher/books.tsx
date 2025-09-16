// src/pages/teacher/books.tsx
import { useState, useEffect, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import Header from "@/components/layout/Header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  Filter,
  Plus,
  ChevronLeft,
  ChevronRight,
  Edit,
  Eye,
  Trash2,
  BookOpen,
  Star,
  MoreVertical,
  Library,
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
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

// shared media
import { BookCover } from "@/components/ui/media";

/* ----------------- Helpers ----------------- */
const subjectLabel = (s?: string) => s || "General";

// Canonicalize a grade string for API use ("K" or "1".."12" or "all")
function normalizeGradeForApi(g: string | null | undefined) {
  if (!g) return "all";
  const m = g.match(/(k|[0-9]+)/i);
  return m ? m[1].toString().toUpperCase() : g;
}

// Cloudinary cloud name (same pattern used elsewhere in app)
const CLOUD =
  import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ||
  import.meta.env.VITE_PUBLIC_CLOUDINARY_CLOUD_NAME ||
  import.meta.env.CLOUDINARY_CLOUD_NAME;

// Build a usable cover URL (Cloudinary-aware) with graceful fallbacks
const getCoverUrl = (book: any, w = 48) => {
  if (!book) return null;

  // direct URL fields first
  const direct = book.coverImage ?? book.cover_image ?? null;
  if (direct) return direct;

  // Cloudinary by public_id
  const publicId = book.coverPublicId ?? book.cover_public_id ?? null;
  if (publicId && CLOUD) {
    return `https://res.cloudinary.com/${CLOUD}/image/upload/c_fill,w=${w},h=${Math.round(
      w * 1.33
    )},q_auto,f_auto/${publicId}`;
  }

  // legacy/url fallbacks
  return book.coverUrl ?? book.cover_url ?? book.imageUrl ?? book.image_url ?? null;
};

// small helper to append query params safely
const append = (url: string, key: string, value: string) =>
  `${url}${url.includes("?") ? "&" : "?"}${key}=${encodeURIComponent(value)}`;

// -------- client-side grade “safety” filter --------
function bookMatchesGrade(book: any, target: string) {
  if (!target || target === "all") return true;
  const g = String(target).toUpperCase(); // "K" or "1..12"

  const raw = book?.grade ?? book?.gradeLevel ?? book?.grade_level ?? null;
  if (raw == null) return true; // treat “no grade” as visible

  const toTokens = (val: any): string[] => {
    if (Array.isArray(val)) return val.map((v) => String(v).toUpperCase());
    const s = String(val).trim().toUpperCase();
    if (s.includes("-")) {
      const [a, b] = s.split("-").map((x) => x.trim());
      const start = a === "K" ? 0 : parseInt(a, 10);
      const end = b === "K" ? 0 : parseInt(b, 10);
      const from = Math.min(start, end);
      const to = Math.max(start, end);
      return Array.from({ length: to - from + 1 }, (_, i) =>
        from + i === 0 ? "K" : String(from + i)
      );
    }
    return [s];
  };

  const tokens = toTokens(raw);
  return tokens.includes(g);
}

// --- motion variants (teacher vibe: gentle, professional) ---
const fadeInUp = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};
const fadeIn = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0.3 } } };
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };

export default function TeacherBooks() {
  const [searchTerm, setSearchTerm] = useState("");
  const [bookType, setBookType] = useState<"all" | "storybook" | "educational">("all");
  const [page, setPage] = useState(1);
  const [deleteBookId, setDeleteBookId] = useState<number | null>(null);

  // Filters (leave "all" so backend can apply *all* teacher preferences)
  const [gradeFilter, setGradeFilter] = useState("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  const { toast } = useToast();

  /* ----------------- Teaching settings token check ----------------- */
  useEffect(() => {
    async function fetchTeachingSettings() {
      try {
        const res = await fetch("/api/user/teaching-settings", {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        await res.json().catch(() => null);
      } catch {
        // ignore
      } finally {
        setSettingsLoaded(true);
      }
    }
    fetchTeachingSettings();
  }, []);

  /* ----------------- Books query (teacher endpoint) ----------------- */
  const { data: booksData, isLoading } = useQuery({
    queryKey: ["/api/teacher/books", page, bookType, searchTerm, gradeFilter, subjectFilter],
    queryFn: async () => {
      let url = `/api/teacher/books`;

      if (bookType !== "all") url = append(url, "type", bookType);
      if (searchTerm) url = append(url, "search", searchTerm);

      const g = normalizeGradeForApi(gradeFilter);
      if (g !== "all") url = append(url, "grade", g);

      if (bookType === "educational" && subjectFilter !== "all") {
        url = append(url, "subject", subjectFilter);
      }

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      if (!response.ok) throw new Error("Failed to fetch books");
      return response.json();
    },
    enabled: settingsLoaded,
  });

  // Apply client-side grade safety filter to whatever the backend returned.
  const visibleBooks = useMemo(
    () => (booksData?.books ?? []).filter((b: any) => bookMatchesGrade(b, gradeFilter)),
    [booksData?.books, gradeFilter]
  );

  /* ----------------- Delete mutation (teacher route) ----------------- */
  const deleteMutation = useMutation({
    mutationFn: async (bookId: number) => apiRequest("DELETE", `/api/teacher/books/${bookId}`),
    onSuccess: () => {
      toast({ title: "Book deleted", description: "The book has been successfully deleted." });
      queryClient.invalidateQueries({ queryKey: ["/api/teacher/books"] });
      setDeleteBookId(null);
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete book",
      });
    },
  });

  /* ----------------- Search handler ----------------- */
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    queryClient.invalidateQueries({
      queryKey: ["/api/teacher/books", 1, bookType, searchTerm, gradeFilter, subjectFilter],
    });
    setPage(1);
  };

  const handleDelete = (bookId: number) => deleteMutation.mutate(bookId);

  const getRatingStars = (rating: number) => (
    <div className="flex">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${i < rating ? "text-ilaw-gold fill-ilaw-gold" : "text-gray-300"}`}
        />
      ))}
    </div>
  );

  /* ----------------- UI ----------------- */
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-brand-navy-50 via-ilaw-white to-brand-gold-50">
      <Header variant="teacher" />

      <main className="flex-grow p-4 md:p-6">
        <div className="container mx-auto">
          {/* Page Header */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="relative overflow-hidden rounded-2xl mb-8 border-2 border-brand-navy-200 shadow-lg"
          >
            <div className="absolute inset-0 bg-[radial-gradient(700px_400px_at_-10%_-10%,rgba(13,35,66,0.12),transparent),radial-gradient(700px_400px_at_110%_20%,rgba(255,215,128,0.18),transparent)] pointer-events-none" />
            <motion.div variants={fadeIn} className="bg-gradient-to-r from-ilaw-navy to-brand-navy-800 text-white">
              <div className="p-8">
                <motion.div variants={fadeInUp} className="flex items-center mb-2">
                  <Library className="h-8 w-8 text-ilaw-gold mr-3" />
                  <span className="text-sm font-semibold uppercase tracking-wider text-white/80">
                    Book Management
                  </span>
                </motion.div>
                <motion.h1 variants={fadeInUp} className="text-3xl md:text-4xl font-heading font-bold">
                  Books Library
                </motion.h1>
                <motion.p variants={fadeInUp} className="text-lg text-white/80 mt-1">
                  Manage your educational content collection
                </motion.p>

                <motion.div variants={fadeInUp} className="mt-6 flex gap-3">
                  <Link href="/teacher">
                    <Button
                      variant="outline"
                      className="border-2 border-ilaw-gold text-ilaw-gold hover:bg-ilaw-gold hover:text-ilaw-navy font-semibold px-6 py-3"
                    >
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Back to Dashboard
                    </Button>
                  </Link>
                  <Link href="/teacher/add-book">
                    <Button className="bg-ilaw-gold hover:bg-brand-gold-600 text-ilaw-navy font-heading font-bold px-6 py-3 shadow-lg">
                      <Plus className="mr-2 h-4 w-4" />
                      Add New Book
                    </Button>
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>

          {/* Search and Filter Section */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="bg-ilaw-white rounded-xl shadow-lg border-2 border-brand-navy-200 p-6 mb-8"
          >
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <form onSubmit={handleSearch} className="w-full md:w-[38rem]">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-brand-navy-400" size={20} />
                  <Input
                    placeholder="Search by title, author, or description..."
                    className="pl-12 h-12 text-lg border-2 border-brand-navy-200 focus:border-ilaw-navy rounded-lg"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
              </form>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full md:w-auto">
                {/* Book type */}
                <Select
                  value={bookType}
                  onValueChange={(v) => {
                    setBookType(v as any);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-12 border-2 border-brand-navy-200 focus:border-ilaw-navy rounded-lg">
                    <SelectValue>
                      <div className="flex items-center">
                        <Filter className="w-5 h-5 mr-3 text-ilaw-navy" />
                        <span className="font-medium">
                          {bookType === "all"
                            ? "All Books"
                            : bookType === "storybook"
                            ? "Storybooks"
                            : "Educational Books"}
                        </span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Books</SelectItem>
                    <SelectItem value="storybook">Storybooks</SelectItem>
                    <SelectItem value="educational">Educational Books</SelectItem>
                  </SelectContent>
                </Select>

                {/* Grade */}
                <Select
                  value={gradeFilter}
                  onValueChange={(v) => {
                    setGradeFilter(v);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="h-12 border-2 border-brand-navy-200 focus:border-ilaw-navy rounded-lg">
                    <SelectValue placeholder="Grade" />
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

                {/* Subject (only for educational) */}
                <Select
                  value={subjectFilter}
                  onValueChange={(v) => {
                    setSubjectFilter(v);
                    setPage(1);
                  }}
                  disabled={bookType !== "educational"}
                >
                  <SelectTrigger className="h-12 border-2 border-brand-navy-200 focus:border-ilaw-navy rounded-lg disabled:opacity-60">
                    <SelectValue placeholder="Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    <SelectItem value="Filipino Literature">Filipino Literature</SelectItem>
                    <SelectItem value="English (language)">English (language)</SelectItem>
                    <SelectItem value="Marungko">Marungko</SelectItem>
                    <SelectItem value="MAPEH">MAPEH</SelectItem>
                    <SelectItem value="Makabansa">Makabansa</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </motion.div>

          {/* Books Table */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="bg-ilaw-white rounded-xl shadow-lg border-2 border-brand-navy-200 overflow-hidden"
          >
            <div className="bg-gradient-to-r from-ilaw-navy to-brand-navy-800 p-4">
              <h2 className="text-xl font-heading font-bold text-ilaw-gold flex items-center">
                <BookOpen className="h-6 w-6 mr-3" />
                Books Collection
              </h2>
            </div>

            <Table>
              <TableHeader>
                <TableRow className="bg-brand-navy-50/40">
                  <TableHead className="font-heading font-bold text-ilaw-navy">BOOK</TableHead>
                  <TableHead className="font-heading font-bold text-ilaw-navy">TYPE & SUBJECT</TableHead>
                  <TableHead className="font-heading font-bold text-ilaw-navy">GRADE LEVEL</TableHead>
                  <TableHead className="font-heading font-bold text-ilaw-navy">RATING</TableHead>
                  <TableHead className="font-heading font-bold text-ilaw-navy">DATE ADDED</TableHead>
                  <TableHead className="font-heading font-bold text-ilaw-navy">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-2 border-ilaw-navy border-t-transparent mr-3"></div>
                        <span className="text-brand-navy-700 font-medium">Loading books...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : visibleBooks.length > 0 ? (
                  <AnimatePresence initial={false}>
                    {visibleBooks.map((book: any, idx: number) => {
                      const coverUrl = getCoverUrl(book, 48);
                      return (
                        <motion.tr
                          key={book.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.22, delay: idx * 0.02 }}
                          className="border-b border-brand-navy-100 hover:bg-brand-navy-50/50 transition-colors"
                        >
                          <TableCell className="font-medium">
                            <div className="flex items-center">
                              <div className="mr-4 w-12">
                                <BookCover url={coverUrl} ratio="portrait" framed className="w-12" />
                              </div>
                              <div>
                                <div className="font-heading font-semibold text-ilaw-navy">{book.title}</div>
                                <div className="text-sm text-brand-navy-700 truncate max-w-[260px]">
                                  {book.description}
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          {/* Type & Subject Column */}
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Badge
                                variant={book.type === "storybook" ? "default" : "secondary"}
                                className={
                                  book.type === "storybook"
                                    ? "bg-ilaw-navy text-white font-bold w-fit"
                                    : "bg-ilaw-gold text-ilaw-navy font-bold w-fit"
                                }
                              >
                                {book.type === "storybook" ? "📖 Storybook" : "🎓 Educational"}
                              </Badge>

                              {book.type === "educational" && (
                                <Badge
                                  variant="outline"
                                  className="border-2 border-brand-navy-200 bg-brand-navy-50 text-ilaw-navy font-bold text-xs w-fit"
                                >
                                  {subjectLabel(book.subject)}
                                </Badge>
                              )}
                            </div>
                          </TableCell>

                          <TableCell>
                            <span className="font-semibold text-ilaw-navy">
                              {book.grade ? `Grade ${book.grade}` : "All Grades"}
                            </span>
                          </TableCell>

                          <TableCell>{getRatingStars(book.rating || 0)}</TableCell>

                          <TableCell className="text-brand-navy-700">
                            {book.createdAt ? new Date(book.createdAt).toLocaleDateString() : "—"}
                          </TableCell>

                          <TableCell>
                            <div className="flex space-x-2">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-9 w-9 p-0 border-ilaw-navy text-ilaw-navy hover:bg-ilaw-navy hover:text-ilaw-gold"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="border-2 border-brand-navy-200">
                                  <DropdownMenuLabel className="font-heading font-bold text-ilaw-navy">
                                    Actions
                                  </DropdownMenuLabel>
                                  <DropdownMenuSeparator className="bg-brand-navy-200" />
                                  <Link href={`/teacher/books/${book.id}`}>
                                    <DropdownMenuItem className="flex items-center font-medium text-ilaw-navy hover:bg-brand-navy-50/60">
                                      <Eye className="mr-2 h-4 w-4" />
                                      View Details
                                    </DropdownMenuItem>
                                  </Link>
                                  <Link href={`/teacher/edit-book/${book.id}`}>
                                    <DropdownMenuItem className="flex items-center font-medium text-ilaw-navy hover:bg-brand-navy-50/60">
                                      <Edit className="mr-2 h-4 w-4" />
                                      Edit Book
                                    </DropdownMenuItem>
                                  </Link>
                                  <DropdownMenuItem
                                    className="flex items-center text-red-600 font-medium hover:bg-red-50"
                                    onClick={() => setDeleteBookId(book.id)}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Book
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12">
                      <div className="flex flex-col items-center">
                        <BookOpen className="h-16 w-16 text-brand-navy-200 mb-4" />
                        <p className="text-xl font-heading font-semibold text-ilaw-navy mb-2">
                          No books found
                        </p>
                        <p className="text-brand-navy-700">
                          {bookType !== "all" || gradeFilter !== "all" || subjectFilter !== "all" || searchTerm
                            ? "Try adjusting your filters"
                            : "Add your first book to get started"}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {/* Pagination (hidden if backend doesn't return totals) */}
            {booksData?.totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-brand-navy-200 bg-brand-navy-50/40">
                <div className="text-sm font-medium text-brand-navy-700">
                  Showing {(page - 1) * 10 + 1}-{Math.min(page * 10, booksData?.totalBooks)} of{" "}
                  {booksData?.totalBooks} books
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="border-2 border-brand-navy-300 text-ilaw-navy hover:bg-brand-navy-50 font-bold"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(booksData?.totalPages, p + 1))}
                    disabled={page === booksData?.totalPages}
                    className="border-2 border-brand-navy-300 text-ilaw-navy hover:bg-brand-navy-50 font-bold"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteBookId !== null} onOpenChange={() => setDeleteBookId(null)}>
        <AlertDialogContent className="border-2 border-brand-navy-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-ilaw-navy font-heading font-bold">Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-brand-navy-700">
              This action cannot be undone. This will permanently delete the book and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-2 border-gray-300 text-gray-600 hover:bg-gray-50 font-bold">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteBookId && deleteMutation.mutate(deleteBookId)}
              className="bg-red-600 hover:bg-red-700 font-bold"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}