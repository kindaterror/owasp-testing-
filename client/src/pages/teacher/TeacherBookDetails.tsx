import { useQuery } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { ChevronLeft, Edit, BookOpen, Loader2, Sparkles } from "lucide-react";
import Header from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";

/* --- motion variants to match dashboard --- */
const fadeInUp = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } };
const fadeIn = { hidden: { opacity: 0 }, visible: { opacity: 1 } };
const stagger = { hidden: { opacity: 1 }, visible: { opacity: 1, transition: { staggerChildren: 0.06 } } };

function TeacherBookDetails() {
  const { id } = useParams<{ id: string }>();
  const bookId = parseInt(id);

  // Pretty subject labels
  const formatSubject = (subject: string) => {
    const map = {
      "filipino-literature": "📚 Filipino Literature",
      "philippine-folklore": "🏛️ Philippine Folklore",
      "reading-comprehension": "📖 Reading Comprehension",
      "creative-writing": "✍️ Creative Writing",
      "general-education": "🎓 General Education",
    } as const;
    return (map as any)[subject] ?? subject;
  };

  // Book
  const { data: bookData, isLoading } = useQuery({
    queryKey: [`/api/books/${bookId}`],
    queryFn: async () => {
      interface BookResponse { book: any }
      const res = await apiRequest<BookResponse>("GET", `/api/books/${bookId}`);
      if (res?.book) return res.book;
      throw new Error("Failed to fetch book");
    },
    enabled: !!bookId,
  });

  // Pages
  const { data: pagesData } = useQuery({
    queryKey: [`/api/books/${bookId}/pages`],
    queryFn: async () => {
      interface PagesResponse { pages: any[] }
      const res = await apiRequest<PagesResponse>("GET", `/api/books/${bookId}/pages`);
      return res?.pages ?? [];
    },
    enabled: !!bookId,
  });

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(iso));

  /* ---------- Loading ---------- */
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-brand-navy-50 via-ilaw-white to-brand-gold-50">
        <Header variant="teacher" />
        <main className="flex-1 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.25 }}
            className="flex flex-col items-center gap-4 bg-white rounded-2xl p-8 border-2 border-brand-navy-200 shadow-lg"
          >
            <Loader2 className="h-12 w-12 animate-spin text-ilaw-gold" />
            <p className="text-lg font-heading font-bold text-ilaw-navy">Loading book data…</p>
          </motion.div>
        </main>
      </div>
    );
  }

  /* ---------- Not found ---------- */
  if (!bookData) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-brand-navy-50 via-ilaw-white to-brand-gold-50">
        <Header variant="teacher" />
        <main className="flex-1 flex items-center justify-center p-6">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="border-2 border-brand-navy-200 bg-white rounded-2xl shadow-lg max-w-md w-full"
          >
            <div className="border-b border-brand-navy-200 p-6">
              <h3 className="text-2xl font-heading font-bold text-ilaw-navy">📚 Book Not Found</h3>
              <p className="text-brand-navy-700 mt-1 font-medium">
                We couldn't find the book you're looking for.
              </p>
            </div>
            <div className="p-6">
              <Link href="/teacher/books">
                <Button className="bg-ilaw-gold hover:bg-brand-gold-600 text-ilaw-navy font-heading font-bold">
                  <ChevronLeft className="h-4 w-4 mr-2" /> Back to Books
                </Button>
              </Link>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  /* ---------- Page ---------- */
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-brand-navy-50 via-ilaw-white to-brand-gold-50">
      <Header variant="teacher" />

      <main className="flex-grow p-4 md:p-6">
        <div className="container mx-auto">
          {/* Hero — match dashboard */}
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
                  <BookOpen className="h-8 w-8 text-ilaw-gold mr-3" />
                  <span className="text-sm font-semibold uppercase tracking-wider text-white/80">
                    Ilaw ng Bayan Learning Institute
                  </span>
                </motion.div>

                <motion.h1 variants={fadeInUp} className="text-3xl md:text-4xl font-heading font-bold">
                  {bookData.title}
                </motion.h1>
                <motion.p variants={fadeInUp} className="text-white/80 mt-1">
                  Comprehensive view of learning material
                </motion.p>

                <motion.div variants={fadeInUp} className="mt-6 flex gap-3">
                  <Link href="/teacher/books">
                    <Button
                      variant="outline"
                      className="border-2 border-white text-white hover:bg-white hover:text-ilaw-navy font-semibold px-6 py-3"
                    >
                      <ChevronLeft className="mr-2 h-4 w-4" />
                      Back to Books
                    </Button>
                  </Link>
                  <Link href={`/teacher/edit-book/${bookId}`}>
                    <Button className="bg-ilaw-gold hover:bg-brand-gold-600 text-ilaw-navy font-heading font-bold px-6 py-3 shadow-lg">
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Book
                    </Button>
                  </Link>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>

          {/* Content */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
          >
            {/* Left: Book info */}
            <motion.div variants={fadeInUp} className="lg:col-span-1">
              <div className="bg-white rounded-2xl shadow-lg border-2 border-brand-navy-200 overflow-hidden">
                <div className="bg-gradient-to-r from-ilaw-navy to-brand-navy-800 p-4">
                  <h2 className="text-xl font-heading font-bold text-ilaw-gold flex items-center">
                    <Sparkles className="h-6 w-6 mr-3" />
                    Book Information
                  </h2>
                </div>

                <div className="p-6">
                  <div className="flex flex-col items-center mb-6">
                    <AnimatePresence mode="popLayout">
                      {bookData.coverImage ? (
                        <motion.img
                          key="cover"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.25 }}
                          src={bookData.coverImage}
                          alt={bookData.title}
                          className="rounded-xl w-full max-w-[250px] object-cover aspect-[3/4] mb-4 shadow-lg border-2 border-brand-navy-200"
                        />
                      ) : (
                        <motion.div
                          key="cover-fallback"
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -8 }}
                          transition={{ duration: 0.25 }}
                          className="bg-brand-navy-50 border-2 border-brand-navy-200 rounded-xl w-full max-w-[250px] aspect-[3/4] mb-4 flex items-center justify-center"
                        >
                          <BookOpen className="h-16 w-16 text-ilaw-navy" />
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <h2 className="text-2xl font-heading font-bold text-center mt-2 text-ilaw-navy">
                      {bookData.title}
                    </h2>

                    {/* Badges */}
                    <motion.div variants={stagger} className="flex flex-wrap items-center justify-center gap-2 mt-2">
                      <motion.div variants={fadeInUp}>
                        <Badge
                          variant={bookData.type === "storybook" ? "default" : "secondary"}
                          className={
                            bookData.type === "storybook"
                              ? "bg-ilaw-navy text-white font-bold"
                              : "bg-ilaw-gold text-ilaw-navy font-bold"
                          }
                        >
                          {bookData.type === "storybook" ? "📖 Storybook" : "🎓 Educational"}
                        </Badge>
                      </motion.div>

                      {bookData.type === "educational" && bookData.subject && (
                        <motion.div variants={fadeInUp}>
                          <Badge
                            variant="outline"
                            className="border-2 border-brand-navy-200 bg-brand-navy-50 text-ilaw-navy font-bold"
                          >
                            {formatSubject(bookData.subject)}
                          </Badge>
                        </motion.div>
                      )}

                      {bookData.grade && (
                        <motion.div variants={fadeInUp}>
                          <Badge
                            variant="outline"
                            className="border-2 border-brand-navy-200 text-ilaw-navy font-bold"
                          >
                            Grade {bookData.grade === "K" ? "K" : bookData.grade}
                          </Badge>
                        </motion.div>
                      )}
                    </motion.div>
                  </div>

                  <Separator className="my-4 bg-brand-navy-200" />

                  <motion.div variants={stagger} className="space-y-4">
                    <motion.div variants={fadeInUp}>
                      <h3 className="text-sm font-heading font-bold text-ilaw-navy">📝 Description</h3>
                      <p className="mt-1 text-brand-navy-700 font-medium">{bookData.description}</p>
                    </motion.div>

                    {bookData.type === "educational" && bookData.subject && (
                      <motion.div variants={fadeInUp}>
                        <h3 className="text-sm font-heading font-bold text-ilaw-navy">📋 Subject Category</h3>
                        <p className="mt-1 text-brand-navy-700 font-medium">{formatSubject(bookData.subject)}</p>
                      </motion.div>
                    )}

                    <motion.div variants={fadeInUp}>
                      <h3 className="text-sm font-heading font-bold text-ilaw-navy">📄 Pages</h3>
                      <p className="mt-1 text-brand-navy-700 font-medium">{pagesData?.length || 0} pages</p>
                    </motion.div>

                    {bookData.createdAt && (
                      <motion.div variants={fadeInUp}>
                        <h3 className="text-sm font-heading font-bold text-ilaw-navy">📅 Added On</h3>
                        <p className="mt-1 text-brand-navy-700 font-medium">{formatDate(bookData.createdAt)}</p>
                      </motion.div>
                    )}

                    {bookData.musicUrl && (
                      <motion.div variants={fadeInUp}>
                        <h3 className="text-sm font-heading font-bold text-ilaw-navy">🎵 Background Music</h3>
                        <div className="mt-1">
                          <audio controls className="w-full" src={bookData.musicUrl}>
                            Your browser does not support the audio element.
                          </audio>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                </div>
              </div>
            </motion.div>

            {/* Right: Tabs */}
            <motion.div variants={fadeInUp} className="lg:col-span-2">
              <div className="bg-white rounded-2xl shadow-lg border-2 border-brand-navy-200 overflow-hidden">
                <div className="bg-gradient-to-r from-ilaw-navy to-brand-navy-800 p-4">
                  <h2 className="text-xl font-heading font-bold text-ilaw-gold">📖 Book Content</h2>
                  <p className="text-blue-100 mt-1 font-medium">View pages and questions for this book</p>
                </div>

                <div className="p-6">
                  <Tabs defaultValue="pages" className="w-full">
                    <TabsList className="grid w-full grid-cols-2 rounded-xl bg-gradient-to-br from-white to-brand-navy-50 border border-brand-navy-200">
                      <TabsTrigger
                        value="pages"
                        className="font-heading font-bold data-[state=active]:bg-ilaw-navy data-[state=active]:text-white"
                      >
                        📄 Pages
                      </TabsTrigger>
                      <TabsTrigger
                        value="questions"
                        className="font-heading font-bold data-[state=active]:bg-ilaw-navy data-[state=active]:text-white"
                      >
                        ❓ Questions
                      </TabsTrigger>
                    </TabsList>

                    {/* Pages */}
                    <TabsContent value="pages" className="pt-6">
                      {pagesData && pagesData.length > 0 ? (
                        <AnimatePresence initial={false}>
                          <div className="space-y-6">
                            {pagesData.map((page: any) => (
                              <motion.div
                                key={page.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.25 }}
                                className="border-2 border-brand-navy-200 bg-brand-navy-50 rounded-xl overflow-hidden"
                              >
                                <div className="border-b border-brand-navy-200 p-4">
                                  <h4 className="text-lg font-heading font-bold text-ilaw-navy">
                                    📄 Page {page.pageNumber}
                                    {page.title && `: ${page.title}`}
                                  </h4>
                                </div>

                                <div className="p-4">
                                  <div className="flex flex-col md:flex-row gap-4">
                                    {page.imageUrl && (
                                      <motion.div
                                        initial={{ opacity: 0, scale: 0.98 }}
                                        whileInView={{ opacity: 1, scale: 1 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 0.25 }}
                                        className="w-full md:w-1/3"
                                      >
                                        <img
                                          src={page.imageUrl}
                                          alt={`Page ${page.pageNumber}`}
                                          className="rounded-xl w-full object-cover aspect-video border-2 border-brand-navy-200"
                                        />
                                      </motion.div>
                                    )}

                                    <div className={`w-full ${page.imageUrl ? "md:w-2/3" : ""}`}>
                                      <p className="whitespace-pre-line text-ilaw-navy font-medium">{page.content}</p>
                                    </div>
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </AnimatePresence>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="py-8 text-center bg-brand-navy-50 rounded-xl border-2 border-brand-navy-200"
                        >
                          <p className="text-brand-navy-700 font-medium italic">📚 No pages found for this book.</p>
                        </motion.div>
                      )}
                    </TabsContent>

                    {/* Questions */}
                    <TabsContent value="questions" className="pt-6">
                      {pagesData && pagesData.some((p: any) => p.questions && p.questions.length > 0) ? (
                        <AnimatePresence initial={false}>
                          <div className="space-y-6">
                            {pagesData
                              .filter((p: any) => p.questions && p.questions.length > 0)
                              .map((page: any) => (
                                <motion.div
                                  key={`questions-${page.id}`}
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  transition={{ duration: 0.25 }}
                                  className="border-2 border-brand-navy-200 bg-brand-navy-50 rounded-xl overflow-hidden"
                                >
                                  <div className="border-b border-brand-navy-200 p-4">
                                    <h4 className="text-lg font-heading font-bold text-ilaw-navy">
                                      ❓ Page {page.pageNumber} Questions
                                      {page.title && ` - ${page.title}`}
                                    </h4>
                                  </div>

                                  <div className="p-4">
                                    <div className="space-y-4">
                                      {page.questions.map((q: any, idx: number) => (
                                        <motion.div
                                          key={`${page.id}-${idx}`}
                                          initial={{ opacity: 0, y: 8 }}
                                          whileInView={{ opacity: 1, y: 0 }}
                                          viewport={{ once: true }}
                                          transition={{ duration: 0.2 }}
                                          className="p-4 border-2 border-brand-navy-200 rounded-xl bg-white"
                                        >
                                          <h4 className="font-heading font-bold mb-2 text-ilaw-navy">
                                            ❓ Question {idx + 1}: {q.questionText}
                                          </h4>

                                          <div className="ml-4">
                                            <p className="text-sm text-brand-navy-700 font-bold mb-1">
                                              Type: {q.answerType === "text" ? "✍️ Text Answer" : "🔘 Multiple Choice"}
                                            </p>

                                            {q.answerType === "multiple_choice" && q.options && (
                                              <div className="mt-2">
                                                <p className="text-sm text-brand-navy-700 font-bold mb-1">Options:</p>
                                                <ul className="list-disc pl-5">
                                                  {q.options.split("\n").map((opt: string, i: number) => (
                                                    <li
                                                      key={`${idx}-opt-${i}`}
                                                      className={
                                                        opt === q.correctAnswer
                                                          ? "font-bold text-green-600"
                                                          : "text-ilaw-navy font-medium"
                                                      }
                                                    >
                                                      {opt}
                                                      {opt === q.correctAnswer && " ✅ (correct)"}
                                                    </li>
                                                  ))}
                                                </ul>
                                              </div>
                                            )}

                                            {q.answerType === "text" && q.correctAnswer && (
                                              <p className="text-sm mt-2">
                                                <span className="text-brand-navy-700 font-bold">Correct answer:</span>{" "}
                                                <span className="font-bold text-green-600">{q.correctAnswer}</span>
                                              </p>
                                            )}
                                          </div>
                                        </motion.div>
                                      ))}
                                    </div>
                                  </div>
                                </motion.div>
                              ))}
                          </div>
                        </AnimatePresence>
                      ) : (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="py-8 text-center bg-brand-navy-50 rounded-xl border-2 border-brand-navy-200"
                        >
                          <p className="text-brand-navy-700 font-medium italic">❓ No questions found for this book.</p>
                        </motion.div>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

export default TeacherBookDetails;