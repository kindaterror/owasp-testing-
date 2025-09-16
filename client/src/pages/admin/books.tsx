// src/pages/admin/books.tsx
// == IMPORTS & DEPENDENCIES ==
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import Header from "@/components/layout/Header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  GraduationCap,
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
import { BookCover } from "@/components/ui/media";
import { motion, AnimatePresence } from "framer-motion";

// == Animation presets (UI-only) ==
const fadeIn = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };

const rowFade = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.2, ease: "easeIn" } },
};

const cardBase =
  "group border border-brand-gold-200 hover:border-ilaw-gold transition-all duration-300 " +
  "shadow-sm hover:shadow-xl bg-white rounded-2xl will-change-transform hover:-translate-y-0.5";

// ===== Helpers =====
const getCoverUrl = (book: any, size = 96) => {
  const direct = book?.coverImage ?? book?.cover_image ?? null;
  if (direct) return direct;
  const pid = book?.coverPublicId ?? book?.cover_public_id ?? null;
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (pid && cloud) {
    return `https://res.cloudinary.com/${cloud}/image/upload/c_fill,w=${size},h=${Math.round(
      size * 1.33
    )},q_auto,f_auto/${pid}`;
  }
  return null;
};

// == ADMIN BOOKS COMPONENT ==
export default function AdminBooks() {
  // == STATE MANAGEMENT ==
  const [searchTerm, setSearchTerm] = useState("");
  const [bookType, setBookType] = useState<"all" | "storybook" | "educational">("all");
  const [subjectFilter, setSubjectFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [deleteBookId, setDeleteBookId] = useState<number | null>(null);
  const { toast } = useToast();

  // Reset subject filter when switching away from educational
  useEffect(() => {
    if (bookType !== "educational" && subjectFilter !== "all") {
      setSubjectFilter("all");
    }
  }, [bookType, subjectFilter]);

  // == DATA FETCHING ==
  const { data: booksData, isLoading } = useQuery({
    queryKey: ["/api/books", page, bookType, subjectFilter, searchTerm],
    queryFn: async () => {
      let url = `/api/books?page=${page}`;
      if (bookType !== "all") url += `&type=${bookType}`;
      if (bookType === "educational" && subjectFilter !== "all") {
        url += `&subject=${subjectFilter}`;
      }
      if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      if (!response.ok) throw new Error("Failed to fetch books");
      return response.json();
    },
  });

  // == DELETE MUTATION ==
  const deleteMutation = useMutation({
    mutationFn: async (bookId: number) => apiRequest("DELETE", `/api/books/${bookId}`),
    onSuccess: () => {
      toast({ title: "Book deleted", description: "The book has been successfully deleted." });
      queryClient.invalidateQueries({ queryKey: ["/api/books"] });
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

  // == EVENT HANDLERS ==
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    queryClient.invalidateQueries({
      queryKey: ["/api/books", 1, bookType, subjectFilter, searchTerm],
    });
  };

  const handleDelete = (bookId: number) => deleteMutation.mutate(bookId);

  const changeBookType = (val: "all" | "storybook" | "educational") => {
    setBookType(val);
    setPage(1);
    queryClient.invalidateQueries({ queryKey: ["/api/books", 1, val, subjectFilter, searchTerm] });
  };
  const changeSubject = (val: string) => {
    setSubjectFilter(val);
    setPage(1);
    queryClient.invalidateQueries({ queryKey: ["/api/books", 1, bookType, val, searchTerm] });
  };

  // Subject display helper
  const getSubjectDisplay = (subject: string) => {
    const subjectMap: Record<string, string> = {
      "filipino-literature": "Filipino Literature",
      "philippine-folklore": "Philippine Folklore",
      "reading-comprehension": "Reading Comprehension",
      "creative-writing": "Creative Writing",
      "general-education": "General Education",
    };
    return subjectMap[subject] || subject;
  };

  // == RENDER COMPONENT ==
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-ilaw-white via-brand-gold-50 to-brand-navy-50">
      <Header variant="admin" />

      {/* == Header Section == */}
      <motion.div
        variants={fadeIn}
        initial="hidden"
        animate="visible"
        className="bg-ilaw-navy text-white py-8 shadow-md relative overflow-hidden"
      >
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-center mb-2">
            <GraduationCap className="h-8 w-8 text-ilaw-gold mr-3" />
            <span className="text-sm md:text-base font-heading font-bold text-ilaw-gold tracking-wide uppercase">
              Ilaw ng Bayan Learning Institute
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-center">Books Management</h1>
          <p className="text-blue-100 text-center">Manage your educational content library</p>
        </div>
      </motion.div>

      <main className="flex-grow p-4 md:p-6">
        <div className="container mx-auto">
          {/* == Navigation Section == */}
          <motion.div
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            className="flex flex-col md:flex-row md:items-center md:justify-between mb-8"
          >
            <div className="flex flex-col md:flex-row md:items-center gap-2">
              <Link href="/admin">
                <Button
                  variant="outline"
                  size="sm"
                  className="border border-brand-gold-300 text-ilaw-navy hover:bg-brand-gold-50 font-heading font-bold"
                >
                  <ChevronLeft className="mr-2 h-4 w-4" />
                  Back to Dashboard
                </Button>
              </Link>
            </div>
            <Link href="/admin/add-book">
              <Button className="mt-4 md:mt-0 bg-gradient-to-r from-ilaw-gold to-amber-500 hover:from-amber-500 hover:to-yellow-600 text-ilaw-navy font-heading font-bold flex items-center shadow-md transition-transform hover:-translate-y-0.5">
                <Plus className="mr-2 h-4 w-4" />
                Add New Book
              </Button>
            </Link>
          </motion.div>

          {/* == Search & Filter Section == */}
          <motion.div variants={stagger} initial="hidden" animate="visible" className={`${cardBase} mb-8`}>
            <div className="border-b border-brand-gold-200 p-6">
              <h3 className="text-xl font-heading font-bold text-ilaw-navy flex items-center">
                <Library className="h-6 w-6 text-ilaw-gold mr-2" />
                Search & Filter
              </h3>
            </div>
            <div className="p-6">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <form onSubmit={handleSearch} className="w-full md:w-auto">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-yellow-600" size={18} />
                    <Input
                      placeholder="Search books..."
                      className="pl-10 w-full md:w-[300px] border border-brand-gold-200 focus:border-ilaw-gold"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </form>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto">
                  {/* == Book Type Filter == */}
                  <div className="flex items-center gap-2">
                    <Filter size={18} className="text-ilaw-gold" />
                    <Select value={bookType} onValueChange={(v) => changeBookType(v as any)}>
                      <SelectTrigger className="w-[180px] border border-brand-gold-200 focus:border-ilaw-gold">
                        <SelectValue placeholder="Book Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Books</SelectItem>
                        <SelectItem value="storybook">Storybooks</SelectItem>
                        <SelectItem value="educational">Educational Books</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Subject Filter (educational only) */}
                  {bookType === "educational" && (
                    <div className="flex items-center gap-2">
                      <Select value={subjectFilter} onValueChange={changeSubject}>
                        <SelectTrigger className="w-[200px] border border-brand-gold-200 focus:border-ilaw-gold">
                          <SelectValue placeholder="Subject Category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Subjects</SelectItem>
                          <SelectItem value="GMRC">GMRC</SelectItem>
                          <SelectItem value="Jolly Phonics (English Reading)">Jolly Phonics (English Reading)</SelectItem>
                          <SelectItem value="Makabansa">Makabansa</SelectItem>
                          <SelectItem value="English (language)">English (language)</SelectItem>
                          <SelectItem value="Mathematics">Mathematics</SelectItem>
                          <SelectItem value="Filipino">Filipino</SelectItem>
                          <SelectItem value="Science">Science</SelectItem>
                          <SelectItem value="English grammar">English grammar</SelectItem>
                          <SelectItem value="Reading comprehension">Reading comprehension</SelectItem>
                          <SelectItem value="Marungko">Marungko</SelectItem>
                          <SelectItem value="MAPEH">MAPEH</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* == Books Table Section == */}
          <motion.div variants={fadeIn} initial="hidden" animate="visible" className={cardBase}>
            <div className="border-b border-brand-gold-200 p-6">
              <h3 className="text-xl font-heading font-bold text-ilaw-navy flex items-center">
                <BookOpen className="h-6 w-6 text-ilaw-gold mr-2" />
                Books Library
              </h3>
            </div>

            <div className="p-0">
              <Table>
                {/* == Table Header == */}
                <TableHeader>
                  <TableRow className="border-b border-brand-gold-200">
                    <TableHead className="font-heading font-bold text-ilaw-navy">Title</TableHead>
                    <TableHead className="font-heading font-bold text-ilaw-navy">Type</TableHead>
                    <TableHead className="font-heading font-bold text-ilaw-navy">Subject</TableHead>
                    <TableHead className="font-heading font-bold text-ilaw-navy">Grade Level</TableHead>
                    <TableHead className="font-heading font-bold text-ilaw-navy">Date Added</TableHead>
                    <TableHead className="text-right font-heading font-bold text-ilaw-navy">Actions</TableHead>
                  </TableRow>
                </TableHeader>

                {/* == Table Body == */}
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-yellow-700 font-medium">
                        Loading books...
                      </TableCell>
                    </TableRow>
                  ) : (
                    <AnimatePresence mode="popLayout">
                      {booksData?.books?.length > 0 ? (
                        booksData.books.map((book: any) => {
                          const coverUrl = getCoverUrl(book, 72);
                          return (
                            <motion.tr
                              key={book.id}
                              variants={rowFade}
                              initial="hidden"
                              animate="visible"
                              exit="exit"
                              layout
                              className="border-b border-brand-gold-100 hover:bg-brand-gold-50/60 transition-colors"
                            >
                              {/* == Book Title & Cover == */}
                              <TableCell>
                                <div className="flex items-center">
                                  <div className="w-12 mr-3">
                                    <BookCover url={coverUrl} ratio="portrait" framed className="w-12" />
                                  </div>
                                  <div>
                                    <div className="font-heading font-bold text-ilaw-navy">{book.title}</div>
                                    <div className="text-sm text-slate-600 truncate max-w-[240px]">
                                      {book.description || "—"}
                                    </div>
                                  </div>
                                </div>
                              </TableCell>

                              {/* == Book Type Badge == */}
                              <TableCell>
                                <span
                                  className={`px-3 py-1 rounded-full text-xs font-bold ${
                                    book.type === "storybook"
                                      ? "bg-ilaw-navy text-white"
                                      : "bg-brand-gold-200 text-ilaw-navy"
                                  }`}
                                >
                                  {book.type === "storybook" ? "Storybook" : "Educational"}
                                </span>
                              </TableCell>

                              {/* Subject Badge (educational only) */}
                              <TableCell>
                                {book.type === "educational" && book.subject ? (
                                  <Badge
                                    variant="outline"
                                    className="border border-brand-gold-300 text-yellow-700 font-semibold text-xs"
                                  >
                                    {getSubjectDisplay(book.subject)}
                                  </Badge>
                                ) : (
                                  <span className="text-slate-400 text-sm font-medium">—</span>
                                )}
                              </TableCell>

                              {/* == Grade Level == */}
                              <TableCell className="text-ilaw-navy font-semibold">
                                {book.grade ? `Grade ${book.grade}` : "All grades"}
                              </TableCell>

                              {/* == Date Added == */}
                              <TableCell className="text-slate-600">
                                {book.createdAt ? new Date(book.createdAt).toLocaleDateString() : "—"}
                              </TableCell>

                              {/* == Actions Dropdown == */}
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 w-8 p-0 hover:bg-brand-gold-100 border border-transparent hover:border-brand-gold-200"
                                    >
                                      <svg viewBox="0 0 24 24" className="h-4 w-4 text-ilaw-navy" fill="currentColor">
                                        <circle cx="12" cy="5" r="2" />
                                        <circle cx="12" cy="12" r="2" />
                                        <circle cx="12" cy="19" r="2" />
                                      </svg>
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="border border-brand-gold-200">
                                    <DropdownMenuLabel className="font-heading font-bold text-ilaw-navy">
                                      Actions
                                    </DropdownMenuLabel>
                                    <DropdownMenuSeparator className="bg-brand-gold-200" />
                                    <Link href={`/admin/books/${book.id}`}>
                                      <DropdownMenuItem className="flex items-center font-medium text-ilaw-navy hover:bg-brand-gold-50">
                                        <Eye className="mr-2 h-4 w-4" /> View Details
                                      </DropdownMenuItem>
                                    </Link>
                                    <Link href={`/admin/edit-book/${book.id}`}>
                                      <DropdownMenuItem className="flex items-center font-medium text-ilaw-navy hover:bg-brand-gold-50">
                                        <Edit className="mr-2 h-4 w-4" /> Edit Book
                                      </DropdownMenuItem>
                                    </Link>
                                    <DropdownMenuItem
                                      className="flex items-center text-red-600 font-medium hover:bg-red-50"
                                      onClick={() => setDeleteBookId(book.id)}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4" /> Delete Book
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </motion.tr>
                          );
                        })
                      ) : (
                        <motion.tr key="no-books" variants={rowFade} initial="hidden" animate="visible" exit="exit">
                          <TableCell colSpan={6} className="text-center py-8 text-yellow-700 font-medium">
                            No books found
                          </TableCell>
                        </motion.tr>
                      )}
                    </AnimatePresence>
                  )}
                </TableBody>
              </Table>

              {/* == Pagination Section == */}
              {booksData?.totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-4 border-t border-brand-gold-200">
                  <div className="text-sm text-slate-600">
                    Showing {(page - 1) * 10 + 1}-{Math.min(page * 10, booksData?.totalBooks)} of{" "}
                    {booksData?.totalBooks} books
                  </div>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="border border-brand-gold-300 text-ilaw-navy hover:bg-brand-gold-50 font-semibold"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(booksData?.totalPages, p + 1))}
                      disabled={page === booksData?.totalPages}
                      className="border border-brand-gold-300 text-ilaw-navy hover:bg-brand-gold-50 font-semibold"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </main>

      {/* == Delete Confirmation Dialog == */}
      <AlertDialog open={deleteBookId !== null} onOpenChange={() => setDeleteBookId(null)}>
        <AlertDialogContent className="border border-brand-gold-200 rounded-2xl shadow-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-ilaw-navy font-heading font-bold">Are you sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-600">
              This action cannot be undone. This will permanently delete the book and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border border-gray-300 text-gray-700 hover:bg-gray-50 font-semibold">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteBookId && handleDelete(deleteBookId)}
              className="bg-red-600 hover:bg-red-700 font-semibold"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}