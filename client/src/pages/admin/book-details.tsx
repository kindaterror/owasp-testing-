// == IMPORTS & DEPENDENCIES ==
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'wouter';
import { ChevronLeft, Edit, BookOpen, Loader2, Sparkles, GraduationCap } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import Header from '@/components/layout/Header';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { motion, AnimatePresence } from 'framer-motion';

// == Animation presets (UI-only) ==
const fadeIn = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } },
};
const fadeInFast = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
};
const stagger = { hidden: {}, visible: { transition: { staggerChildren: 0.08 } } };
const itemFade = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' } },
  exit: { opacity: 0, y: -6, transition: { duration: 0.2, ease: 'easeIn' } },
};

const cardBase =
  'group border border-brand-gold-200 hover:border-ilaw-gold transition-all duration-300 ' +
  'shadow-sm hover:shadow-xl bg-white rounded-2xl will-change-transform';

// == BOOK DETAILS COMPONENT ==
export default function BookDetails() {
  const { id } = useParams<{ id: string }>();
  const bookId = parseInt(id);
  const [activeTab, setActiveTab] = useState<'pages' | 'questions'>('pages');

  // == DATA FETCHING ==
  const { data: bookData, isLoading } = useQuery({
    queryKey: [`/api/books/${bookId}`],
    queryFn: async () => {
      interface BookResponse { book: any }
      const response = await apiRequest<BookResponse>('GET', `/api/books/${bookId}`);
      if (response && response.book) return response.book;
      throw new Error('Failed to fetch book data');
    },
    enabled: !!bookId
  });

  const { data: pagesData } = useQuery({
    queryKey: [`/api/books/${bookId}/pages`],
    queryFn: async () => {
      interface PagesResponse { pages: any[] }
      const response = await apiRequest<PagesResponse>('GET', `/api/books/${bookId}/pages`);
      if (response && response.pages) return response.pages;
      return [];
    },
    enabled: !!bookId
  });

  // == UTILS ==
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(date);
  };

  const formatSubject = (subject: string) => {
    const subjectMap: Record<string, string> = {
      'filipino-literature': 'Filipino Literature',
      'philippine-folklore': 'Philippine Folklore',
      'reading-comprehension': 'Reading Comprehension',
      'creative-writing': 'Creative Writing',
      'general-education': 'General Education'
    };
    return subjectMap[subject] || subject;
  };

  // == LOADING STATE ==
  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-ilaw-white via-brand-gold-50 to-brand-navy-50">
        <Header variant="admin" />
        <main className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4 bg-white rounded-xl p-8 border border-brand-gold-200 shadow-md">
            <Loader2 className="h-10 w-10 animate-spin text-ilaw-gold" />
            <p className="text-base font-heading font-bold text-ilaw-navy">Loading book data...</p>
          </div>
        </main>
      </div>
    );
  }

  // == ERROR STATE ==
  if (!bookData) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-ilaw-white via-brand-gold-50 to-brand-navy-50">
        <Header variant="admin" />
        <main className="flex-1 flex items-center justify-center">
          <div className="border border-brand-gold-200 bg-white rounded-xl shadow-md max-w-md w-full">
            <div className="border-b border-brand-gold-200 p-6">
              <h3 className="text-2xl font-heading font-bold text-ilaw-navy">Book Not Found</h3>
              <p className="text-slate-600 mt-1">We couldn't find the book you're looking for.</p>
            </div>
            <div className="p-6">
              <Link href="/admin/books">
                <Button className="bg-gradient-to-r from-ilaw-gold to-amber-500 hover:from-amber-500 hover:to-yellow-600 text-ilaw-navy font-heading font-bold">
                  <ChevronLeft className="h-4 w-4 mr-2" /> Back to Books
                </Button>
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

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
        {/* Subtle sheen */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/0 via-white/5 to-white/0 [mask-image:radial-gradient(60%_60%_at_20%_20%,black,transparent)]" />
        <div className="container mx-auto px-4 text-center relative">
          <div className="flex items-center justify-center mb-2">
            <GraduationCap className="h-8 w-8 text-ilaw-gold mr-3" />
            <span className="text-sm md:text-base font-heading font-bold text-ilaw-gold tracking-wide uppercase">
              Ilaw ng Bayan Learning Institute
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold">Book Details</h1>
          <p className="text-blue-100">Comprehensive view of learning material</p>
        </div>
      </motion.div>

      <main className="flex-1 py-8 container mx-auto px-4">
        {/* == Navigation == */}
        <motion.div
          variants={fadeInFast}
          initial="hidden"
          animate="visible"
          className="flex justify-between items-center mb-8"
        >
          <div className="flex items-center gap-2">
            <Link href="/admin/books">
              <Button variant="outline" className="border border-brand-gold-300 text-ilaw-navy hover:bg-brand-gold-50 font-heading font-bold">
                <ChevronLeft className="h-4 w-4 mr-2" /> Back to Books
              </Button>
            </Link>
            <Link href="/admin">
              <Button variant="outline" size="sm" className="border border-gray-300 text-gray-700 hover:bg-gray-50 font-heading font-bold">
                Back to Dashboard
              </Button>
            </Link>
          </div>
          <Link href={`/admin/edit-book/${bookId}`}>
            <Button className="bg-gradient-to-r from-ilaw-gold to-amber-500 hover:from-amber-500 hover:to-yellow-600 text-ilaw-navy font-heading font-bold transition-transform hover:-translate-y-0.5">
              <Edit className="h-4 w-4 mr-2" /> Edit Book
            </Button>
          </Link>
        </motion.div>

        {/* == Content Grid == */}
        <motion.div
          variants={stagger}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
          {/* == Book Information == */}
          <motion.div variants={fadeIn} className="lg:col-span-1">
            <div className={cardBase}>
              <div className="border-b border-brand-gold-200 p-6 rounded-t-2xl">
                <h3 className="text-xl font-heading font-bold text-ilaw-navy flex items-center">
                  <Sparkles className="h-5 w-5 text-ilaw-gold mr-2" /> Book Information
                </h3>
              </div>
              <div className="p-6">
                {/* Cover & Title */}
                <div className="flex flex-col items-center mb-6">
                  {bookData.coverImage ? (
                    <img
                      src={bookData.coverImage}
                      alt={bookData.title}
                      className="rounded-xl w-full max-w-[250px] object-cover aspect-[3/4] mb-4 shadow-md border border-brand-gold-200"
                    />
                  ) : (
                    <div className="bg-brand-gold-50 border border-brand-gold-200 rounded-xl w-full max-w-[250px] aspect-[3/4] mb-4 flex items-center justify-center">
                      <BookOpen className="h-14 w-14 text-brand-gold-400" />
                    </div>
                  )}
                  <h2 className="text-2xl font-heading font-bold text-center mt-2 text-ilaw-navy">{bookData.title}</h2>
                  <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                    <Badge className={bookData.type === 'storybook' ? 'bg-ilaw-navy text-white font-semibold' : 'bg-brand-gold-200 text-ilaw-navy font-semibold'}>
                      {bookData.type === 'storybook' ? 'Storybook' : 'Educational'}
                    </Badge>
                    {bookData.type === 'educational' && bookData.subject && (
                      <Badge variant="outline" className="border border-amber-300 bg-amber-50 text-yellow-700 font-semibold">
                        {formatSubject(bookData.subject)}
                      </Badge>
                    )}
                    {bookData.grade && (
                      <Badge variant="outline" className="border border-brand-gold-300 text-yellow-700 font-semibold">
                        Grade {bookData.grade === 'K' ? 'K' : bookData.grade}
                      </Badge>
                    )}
                  </div>
                </div>

                <Separator className="my-4 bg-brand-gold-200" />

                {/* Details */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-heading font-bold text-ilaw-navy">Description</h3>
                    <p className="mt-1 text-slate-700">{bookData.description}</p>
                  </div>
                  {bookData.type === 'educational' && bookData.subject && (
                    <div>
                      <h3 className="text-sm font-heading font-bold text-ilaw-navy">Subject Category</h3>
                      <p className="mt-1 text-slate-700">{formatSubject(bookData.subject)}</p>
                    </div>
                  )}
                  <div>
                    <h3 className="text-sm font-heading font-bold text-ilaw-navy">Pages</h3>
                    <p className="mt-1 text-slate-700">{pagesData?.length || 0} pages</p>
                  </div>
                  {bookData.createdAt && (
                    <div>
                      <h3 className="text-sm font-heading font-bold text-ilaw-navy">Added On</h3>
                      <p className="mt-1 text-slate-700">{formatDate(bookData.createdAt)}</p>
                    </div>
                  )}
                  {bookData.musicUrl && (
                    <div>
                      <h3 className="text-sm font-heading font-bold text-ilaw-navy">Background Music</h3>
                      <div className="mt-1">
                        <audio controls className="w-full" src={bookData.musicUrl}>
                          Your browser does not support the audio element.
                        </audio>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>

          {/* == Book Content Tabs == */}
          <motion.div variants={fadeIn} className="lg:col-span-2">
            <div className={cardBase}>
              <div className="border-b border-brand-gold-200 p-6 rounded-t-2xl">
                <h3 className="text-xl font-heading font-bold text-ilaw-navy">Book Content</h3>
                <p className="text-slate-600 text-sm">View pages and questions for this book</p>
              </div>
              <div className="p-6">
                <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'pages' | 'questions')} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-brand-gold-100 rounded-lg">
                    <TabsTrigger value="pages" className="font-heading font-semibold data-[state=active]:bg-ilaw-navy data-[state=active]:text-white">
                      Pages
                    </TabsTrigger>
                    <TabsTrigger value="questions" className="font-heading font-semibold data-[state=active]:bg-ilaw-navy data-[state=active]:text-white">
                      Questions
                    </TabsTrigger>
                  </TabsList>

                  {/* Animated Tab Content */}
                  <div className="pt-6">
                    <AnimatePresence mode="wait">
                      {activeTab === 'pages' ? (
                        <motion.div
                          key="tab-pages"
                          variants={fadeIn}
                          initial="hidden"
                          animate="visible"
                          exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
                        >
                          <TabsContent value="pages" className="m-0 p-0">
                            {pagesData && pagesData.length > 0 ? (
                              <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
                                {pagesData.map((page: any) => (
                                  <motion.div
                                    key={page.id}
                                    variants={itemFade}
                                    className="border border-brand-gold-200 bg-brand-gold-50 rounded-lg"
                                  >
                                    <div className="border-b border-brand-gold-200 p-4 rounded-t-lg">
                                      <h4 className="text-base font-heading font-bold text-ilaw-navy">
                                        Page {page.pageNumber}{page.title ? `: ${page.title}` : ''}
                                      </h4>
                                    </div>
                                    <div className="p-4">
                                      <div className="flex flex-col md:flex-row gap-4">
                                        {page.imageUrl && (
                                          <div className="w-full md:w-1/3">
                                            <img
                                              src={page.imageUrl}
                                              alt={`Page ${page.pageNumber}`}
                                              className="rounded-lg w-full object-cover aspect-video border border-brand-gold-200"
                                            />
                                          </div>
                                        )}
                                        <div className={`w-full ${page.imageUrl ? 'md:w-2/3' : ''}`}>
                                          <p className="whitespace-pre-line text-slate-800">{page.content}</p>
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                ))}
                              </motion.div>
                            ) : (
                              <motion.div
                                variants={itemFade}
                                initial="hidden"
                                animate="visible"
                                className="py-8 text-center bg-brand-gold-50 rounded-lg border border-brand-gold-200"
                              >
                                <p className="text-slate-600 italic">No pages found for this book.</p>
                              </motion.div>
                            )}
                          </TabsContent>
                        </motion.div>
                      ) : (
                        <motion.div
                          key="tab-questions"
                          variants={fadeIn}
                          initial="hidden"
                          animate="visible"
                          exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
                        >
                          <TabsContent value="questions" className="m-0 p-0">
                            {pagesData && pagesData.some((p: any) => p.questions && p.questions.length > 0) ? (
                              <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-6">
                                {pagesData
                                  .filter((p: any) => p.questions && p.questions.length > 0)
                                  .map((page: any) => (
                                    <motion.div
                                      key={`questions-${page.id}`}
                                      variants={itemFade}
                                      className="border border-brand-gold-200 bg-brand-gold-50 rounded-lg"
                                    >
                                      <div className="border-b border-brand-gold-200 p-4 rounded-t-lg">
                                        <h4 className="text-base font-heading font-bold text-ilaw-navy">
                                          Page {page.pageNumber}{page.title ? ` - ${page.title}` : ''} Questions
                                        </h4>
                                      </div>
                                      <div className="p-4">
                                        <div className="space-y-4">
                                          {page.questions.map((question: any, index: number) => (
                                            <motion.div
                                              key={index}
                                              variants={itemFade}
                                              className="p-4 border border-brand-gold-300 rounded-lg bg-white"
                                            >
                                              <h4 className="font-heading font-bold mb-2 text-ilaw-navy">
                                                Question {index + 1}: {question.questionText}
                                              </h4>
                                              <div className="ml-4">
                                                <p className="text-sm text-slate-600 mb-1">
                                                  Type: {question.answerType === 'text' ? 'Text Answer' : 'Multiple Choice'}
                                                </p>
                                                {question.answerType === 'multiple_choice' && question.options && (
                                                  <div className="mt-2">
                                                    <p className="text-sm text-slate-600 mb-1">Options:</p>
                                                    <ul className="list-disc pl-5">
                                                      {question.options.split('\n').map((option: string, optIdx: number) => (
                                                        <li
                                                          key={optIdx}
                                                          className={option === question.correctAnswer ? 'font-semibold text-emerald-600' : 'text-slate-800'}
                                                        >
                                                          {option}
                                                          {option === question.correctAnswer && ' (correct)'}
                                                        </li>
                                                      ))}
                                                    </ul>
                                                  </div>
                                                )}
                                                {question.answerType === 'text' && question.correctAnswer && (
                                                  <p className="text-sm mt-2">
                                                    <span className="text-slate-600">Correct answer:</span>{' '}
                                                    <span className="font-semibold text-emerald-600">{question.correctAnswer}</span>
                                                  </p>
                                                )}
                                              </div>
                                            </motion.div>
                                          ))}
                                        </div>
                                      </div>
                                    </motion.div>
                                  ))}
                              </motion.div>
                            ) : (
                              <motion.div
                                variants={itemFade}
                                initial="hidden"
                                animate="visible"
                                className="py-8 text-center bg-brand-gold-50 rounded-lg border border-brand-gold-200"
                              >
                                <p className="text-slate-600 italic">No questions found for this book.</p>
                              </motion.div>
                            )}
                          </TabsContent>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </Tabs>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}