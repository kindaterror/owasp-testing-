// --- SECTION: Imports ---
import { useState, useEffect, useRef, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Home,
  Music,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  BookOpen,
  Star,
  Award,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import '@/Book-reader.css';

// --- SECTION: Interface Definitions ---
interface Question {
  id?: number;
  questionText: string;
  answerType: string;
  correctAnswer?: string;
  options?: string;
}

interface Page {
  id: number;
  pageNumber: number;
  content: string;
  title?: string;
  imageUrl?: string;
  questions?: Question[];
  shuffleQuestions?: boolean;          // per-page question shuffle (camelCase)
  shuffle_questions?: boolean;         // tolerate snake_case from API
}

interface BookReaderProps {
  title: string;
  pages: Page[];
  returnPath: string;
  musicUrl?: string;
  bookId: number;
  onExit?: () => void;
  quizMode?: 'retry' | 'straight';
  /** Optional: explicit book-level page shuffle */
  shufflePageOrder?: boolean;
}

// --- helpers ---
function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Seeded RNG (stable per session)
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffleArraySeeded<T>(arr: T[], seed: number): T[] {
  const a = [...arr];
  const rnd = mulberry32(seed);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// --- SECTION: Component Definition: BookReader ---
export function BookReader({
  title,
  pages,
  returnPath,
  musicUrl,
  bookId,
  onExit,
  quizMode: quizModeProp = 'retry',
  shufflePageOrder = false,
}: BookReaderProps) {
  // --- Core Book State ---
  const [currentPage, setCurrentPage] = useState(0);
  const [showQuestions, setShowQuestions] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showAnswerFeedback, setShowAnswerFeedback] = useState<Record<string, boolean>>({});
  const [answersCorrect, setAnswersCorrect] = useState<Record<string, boolean>>({});
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioMuted, setAudioMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState<'next' | 'prev' | null>(null);
  const [nextPageReady, setNextPageReady] = useState(false);
  const [bookCompleted, setBookCompleted] = useState(false);
  const [visitedPages, setVisitedPages] = useState<Record<number, boolean>>({ 0: true });

  // --- Session Tracking ---
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [currentReadingTime, setCurrentReadingTime] = useState(0); // seconds
  const [liveTimerActive, setLiveTimerActive] = useState(false);
  const [sessionId, setSessionId] = useState<number | null>(null); // <- used for seeded shuffle

  // --- Touch ---
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const queryClient = useQueryClient();
  const minSwipeDistance = 50;

  // --- Refs / Guards ---
  const didStartSession = useRef(false);
  const lastPercentRef = useRef<number>(-1);
  const bookIdRef = useRef<number>(bookId);
  useEffect(() => { bookIdRef.current = bookId; }, [bookId]);

  const sessionStartedRef = useRef(false);
  useEffect(() => { sessionStartedRef.current = sessionStarted; }, [sessionStarted]);

  // Refs
  const bookContainerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // --- API Mutations ---
  const startSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/reading-sessions/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ bookId: Number(bookIdRef.current) }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to start reading session');
      }
      return response.json();
    },
    onSuccess: (data: { success?: boolean; sessionId?: number }) => {
      setSessionId(data?.sessionId ?? null);
      setSessionStarted(true);
      const now = new Date();
      setSessionStartTime(now);
      setCurrentReadingTime(0);
      setLiveTimerActive(true);
    },
  });

  const endSessionMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/reading-sessions/end', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ bookId: Number(bookIdRef.current) }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        return { success: false, message: errorData.message };
      }
      return response.json();
    },
    onSuccess: () => {
      setSessionStarted(false);
      setSessionStartTime(null);
      setLiveTimerActive(false);
      didStartSession.current = false;
    },
    onError: () => {
      setSessionStarted(false);
      setSessionStartTime(null);
      setLiveTimerActive(false);
      didStartSession.current = false;
    },
  });

  const updateProgressMutation = useMutation({
    mutationFn: async (progressData: { bookId: number; currentPage: number; percentComplete: number }) => {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/progress', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          bookId: progressData.bookId,
          percentComplete: progressData.percentComplete,
        }),
        credentials: 'include',
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error('Failed to update progress: ' + JSON.stringify(errorData));
      }
      return res.json();
    },
  });

  const markBookCompletedMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/books/${id}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({}),
        credentials: 'include',
      });
      if (!response.ok) {
        const errorText = await response.text();
        try {
          const errorData = JSON.parse(errorText);
          throw new Error(errorData.message || 'Failed to mark book as completed');
        } catch {
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/progress'] });
      setLiveTimerActive(false);
    },
  });

  // --- NEW: Quiz attempt mutation + helpers ---
  type QuizAttemptPayload = {
    bookId: number;
    pageId?: number | null;
    scoreCorrect: number;
    scoreTotal: number;
    percentage: number;
    mode: 'retry' | 'straight';
    durationSec?: number;
  };

  const quizAttemptMutation = useMutation({
    mutationFn: async (payload: QuizAttemptPayload) => {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/quiz-attempts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Failed to save quiz attempt');
      return res.json();
    },
  });

  // --- Effects ---

  // Start session only once per mount
  useEffect(() => {
    if (bookId && !didStartSession.current) {
      didStartSession.current = true;
      startSessionMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]);

  // Session cleanup + navigation/unload listeners
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (sessionStartedRef.current) {
        const data = JSON.stringify({ bookId: Number(bookIdRef.current) });
        navigator.sendBeacon('/api/reading-sessions/end', data);
      }
    };
    const handlePopState = () => {
      if (sessionStartedRef.current) endSessionMutation.mutate();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
      if (sessionStartedRef.current) endSessionMutation.mutate();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live timer tick
  useEffect(() => {
    let interval: NodeJS.Timeout | undefined;
    if (liveTimerActive && sessionStartTime) {
      interval = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - sessionStartTime.getTime()) / 1000);
        setCurrentReadingTime(elapsed);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [liveTimerActive, sessionStartTime]);

  // --- PAGE ORDER SHUFFLE (book-level) ---

  // Make a stable signature so we don't reshuffle on every render
  const pagesSignature = useMemo(
    () => (pages ?? []).map(p => `${p.id}:${p.pageNumber}:${p.questions?.length ?? 0}`).join('|'),
    [pages]
  );

  // Seed for deterministic shuffle: prefer sessionId; fallback to bookId
  const shuffleSeed = useMemo(() => (sessionId ?? Number(bookId) ?? 1), [sessionId, bookId]);

  // Derive a shuffle flag WITHOUT changing your backend:
  //  - if prop is true → shuffle
  //  - else if ANY page has shuffle_questions/shuffleQuestions → shuffle
  const effectiveShufflePageOrder = useMemo(() => {
    const anyPageWantsShuffle =
      (pages ?? []).some(p => p.shuffleQuestions === true || p.shuffle_questions === true);
    return Boolean(shufflePageOrder || anyPageWantsShuffle);
  }, [shufflePageOrder, pages]);

  // Build the ordered list once per (effective flag + content signature + seed)
  const orderedPages = useMemo(() => {
    if (!effectiveShufflePageOrder) return pages;
    const out = shuffleArraySeeded(pages, shuffleSeed);
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveShufflePageOrder, pagesSignature, shuffleSeed]);

  // --- Percent complete (based on orderedPages) ---
  const percentComplete = useMemo(() => {
    if (!orderedPages.length) return 0;
    const visitedPagesCount = Object.keys(visitedPages).length;
    return Math.min(Math.round((visitedPagesCount / orderedPages.length) * 100), 100);
  }, [visitedPages, orderedPages.length]);

  // Progress update (throttled by value change)
  useEffect(() => {
    if (!bookId || orderedPages.length === 0) return;
    if (percentComplete !== lastPercentRef.current) {
      lastPercentRef.current = percentComplete;
      updateProgressMutation.mutate({ bookId, currentPage, percentComplete });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId, orderedPages.length, currentPage, percentComplete]);

  // --- Reset questions + NEW: reset page timer when changing pages ---
  const pageStartRef = useRef<number>(Date.now());
  useEffect(() => {
    setShowQuestions(false);
    setShowAnswerFeedback({});
    setAnswersCorrect({});
    pageStartRef.current = Date.now(); // NEW: start timing this page
  }, [currentPage]);

  // --- Fullscreen change listener ---
  useEffect(() => {
    const handleFullscreenChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // --- Touch handlers ---
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    if (isLeftSwipe && currentPage < orderedPages.length - 1) nextPage();
    else if (isRightSwipe && currentPage > 0) prevPage();
  };

  // --- Derived values / memoized selections ---
  const pageObj = orderedPages[currentPage];

  // Per-page QUESTION shuffle (seeded + stable per session & page)
  const displayedQuestions = useMemo(() => {
    const list = pageObj?.questions ?? [];
    const pageWantsShuffle = pageObj?.shuffleQuestions === true || pageObj?.shuffle_questions === true;
    if (!pageWantsShuffle || list.length === 0) return list;
    // page-specific seed so each page gets a unique, stable order
    const pageSeed = (shuffleSeed ^ (pageObj?.id ?? 0)) >>> 0;
    return shuffleArraySeeded(list, pageSeed);
  }, [pageObj?.id, pageObj?.questions, pageObj?.shuffleQuestions, pageObj?.shuffle_questions, shuffleSeed]);

  const currentPageHasQuestions = (displayedQuestions?.length ?? 0) > 0;
  const quizMode = quizModeProp ?? 'retry';

  // --- NEW: scoring helper for current page ---
  const computeCurrentPageScore = () => {
    if (!currentPageHasQuestions) return null;
    const qs = displayedQuestions ?? [];
    let total = 0;
    let correct = 0;

    qs.forEach((q, idx) => {
      const qId = (q.id ?? `${pageObj?.id ?? 'page'}-${idx}`).toString();
      const expected = (q.correctAnswer ?? '').trim().toLowerCase();
      if (!expected) return; // skip un-gradable items
      total += 1;
      const given = (answers[qId] ?? '').trim().toLowerCase();
      if (given && given === expected) correct += 1;
    });

    const percentage = total ? Math.round((correct / total) * 100) : 0;
    return { scoreCorrect: correct, scoreTotal: total, percentage };
  };

  // --- Audio ---
  const toggleAudio = () => {
    if (!audioRef.current) return;
    if (audioPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(() => {});
    }
    setAudioPlaying(!audioPlaying);
  };
  const toggleMute = () => {
    if (!audioRef.current) return;
    audioRef.current.muted = !audioMuted;
    setAudioMuted(!audioMuted);
  };

  // --- Fullscreen ---
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      bookContainerRef.current?.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // --- Answer helpers ---
  const resetAnswer = (qId: string) => {
    if (quizMode === 'straight') return; // no retries in straight mode
    const newAnswers = { ...answers };
    delete newAnswers[qId];
    const newShow = { ...showAnswerFeedback };
    delete newShow[qId];
    const newCorrect = { ...answersCorrect };
    delete newCorrect[qId];
    setAnswers(newAnswers);
    setShowAnswerFeedback(newShow);
    setAnswersCorrect(newCorrect);
  };

  // --- Navigation gating ---
  const canAdvanceFromQuestions = () => {
    if (!currentPageHasQuestions || !showQuestions) return true;
    if (quizMode === 'retry') {
      // must be all correct
      return displayedQuestions.every((question, idx) => {
        const qId = (question.id ?? `${pageObj?.id ?? 'page'}-${idx}`).toString();
        return showAnswerFeedback[qId] && answersCorrect[qId] === true;
      });
    }
    // straight: must have attempted each once (no correctness reveal)
    return displayedQuestions.every((question, idx) => {
      const qId = (question.id ?? `${pageObj?.id ?? 'page'}-${idx}`).toString();
      return !!showAnswerFeedback[qId];
    });
  };

  const nextPage = () => {
    if (!canAdvanceFromQuestions()) return;

    // NEW: if leaving a quiz page, save an attempt (once per leave)
    if (showQuestions && currentPageHasQuestions) {
      const score = computeCurrentPageScore();
      if (score) {
        const durationSec = Math.max(0, Math.floor((Date.now() - pageStartRef.current) / 1000));
        quizAttemptMutation.mutate({
          bookId,
          pageId: pageObj?.id,
          ...score,
          mode: quizMode,
          durationSec,
        });
      }
    }

    if (currentPageHasQuestions && !showQuestions) {
      setShowQuestions(true);
      return;
    }
    if (isFlipping) return;

    if (currentPage < orderedPages.length - 1) {
      setNextPageReady(true);
      setTimeout(() => {
        setIsFlipping(true);
        setFlipDirection('next');
        setTimeout(() => {
          const nextPageNumber = currentPage + 1;
          setVisitedPages((prev) => ({ ...prev, [prev[nextPageNumber] ? -1 : nextPageNumber]: true, [nextPageNumber]: true }));
          setCurrentPage(nextPageNumber);
          setTimeout(() => {
            setIsFlipping(false);
            setFlipDirection(null);
            setNextPageReady(false);
          }, 200);
        }, 1000);
      }, 50);
    }
  };

  const prevPage = () => {
    if (showQuestions) {
      setShowQuestions(false);
      return;
    }
    if (isFlipping) return;

    if (bookCompleted && currentPage === orderedPages.length - 1) {
      setBookCompleted(false);
      setCurrentPage(currentPage - 1);
      return;
    }
    if (currentPage > 0) {
      setIsFlipping(true);
      setFlipDirection('prev');
      setTimeout(() => {
        setCurrentPage(currentPage - 1);
        setTimeout(() => {
          setIsFlipping(false);
          setFlipDirection(null);
        }, 200);
      }, 1000);
    }
  };

  const handleExit = () => {
    if (sessionStarted) endSessionMutation.mutate();
    if (onExit) onExit();
    else window.history.back();
  };

  // keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault();
        nextPage();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        prevPage();
      } else if (e.key === 'Escape') {
        if (isFullscreen) document.exitFullscreen();
        else if (showQuestions) setShowQuestions(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, showQuestions, currentPageHasQuestions, isFullscreen]);

  const formatLiveTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // --- RENDER ---
  return (
    <div className="flex flex-col items-center w-full">
      {!isFullscreen && (
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-3">
            <BookOpen className="h-8 w-8 text-ilaw-gold mr-3" />
            <h1 className="text-3xl font-heading font-bold text-ilaw-navy">{title}</h1>
            {sessionStarted && liveTimerActive && (
              <div className="ml-4 flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800 border border-green-300">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                📖 Reading: {formatLiveTime(currentReadingTime)}
              </div>
            )}
          </div>
          <p className="text-brand-gold-600 font-medium italic">An Ilaw ng Bayan Learning Experience ✨</p>
        </div>
      )}

      <div
        ref={bookContainerRef}
        className={`relative bg-gradient-to-br from-ilaw-navy via-brand-navy-700 to-brand-navy-800 w-full rounded-2xl shadow-2xl border-4 border-ilaw-gold ${
          isFullscreen ? 'fixed inset-0 z-50 rounded-none border-0 p-8' : 'max-w-4xl p-6 mb-6 h-[550px]'
        }`}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {isFullscreen && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-black/80 text-white px-4 py-2 rounded-lg text-sm">
            Press <kbd className="bg-white/20 px-2 py-1 rounded">ESC</kbd> to exit fullscreen
          </div>
        )}

        {bookCompleted && currentPage === orderedPages.length - 1 ? (
          <div className="bg-gradient-to-br from-ilaw-white via-brand-gold-50 to-ilaw-gold rounded-2xl shadow-2xl overflow-hidden mx-auto text-center flex flex-col items-center justify-center h-full border-4 border-ilaw-gold">
            <div className="p-12">
              <div className="mb-8">
                <div className="relative inline-block">
                  <span className="inline-block rounded-full bg-gradient-to-br from-ilaw-gold to-brand-amber p-6 shadow-ilaw">
                    <Award className="h-16 w-16 text-ilaw-navy" />
                  </span>
                  <Sparkles className="absolute -top-2 -right-2 h-8 w-8 text-brand-amber animate-pulse" />
                </div>
              </div>

              <h2 className="text-4xl font-heading font-bold text-ilaw-navy mb-4">Congratulations, Young Scholar!</h2>
              <p className="text-xl text-brand-gold-700 mb-2">
                You've completed <span className="font-bold text-ilaw-navy">"{title}"</span>
              </p>
              <p className="text-lg text-brand-gold-600 mb-8 italic">Another step in your journey of enlightenment! ✨</p>

              <div className="mb-6 py-4 px-8 bg-gradient-to-r from-blue-100 to-cyan-100 rounded-2xl inline-block border-2 border-blue-200 shadow-lg">
                <div className="flex items-center justify-center mb-2">
                  <BookOpen className="h-6 w-6 text-blue-600 mr-2" />
                  <span className="font-heading font-bold text-blue-800 text-lg">Reading Time: {formatLiveTime(currentReadingTime)}</span>
                </div>
                <p className="text-blue-700 font-medium text-sm">Time well spent learning!</p>
              </div>

              <div className="mb-10 py-6 px-10 bg-gradient-to-r from-green-100 to-emerald-100 rounded-2xl inline-block border-2 border-green-200 shadow-lg">
                <div className="flex items-center justify-center mb-3">
                  <Star className="h-8 w-8 text-yellow-500 mr-3 animate-pulse" />
                  <span className="font-heading font-bold text-green-800 text-xl">100% Complete!</span>
                  <Star className="h-8 w-8 text-yellow-500 ml-3 animate-pulse" />
                </div>
                <p className="text-green-700 font-medium">This achievement has been added to your learning journey.</p>
              </div>

              <div className="flex flex-col md:flex-row gap-6 justify-center">
                <Button
                  onClick={() => {
                    setBookCompleted(false);
                    setCurrentPage(0);
                    if (sessionStarted) endSessionMutation.mutate();
                    setTimeout(() => {
                      startSessionMutation.mutate();
                    }, 500);
                  }}
                  className="bg-ilaw-gold hover:bg-brand-amber text-ilaw-navy font-semibold px-8 py-4 text-lg shadow-ilaw border-2 border-ilaw-navy"
                >
                  <BookOpen className="mr-2 h-5 w-5" />
                  Read Again
                </Button>

                <Button
                  onClick={handleExit}
                  variant="outline"
                  className="border-2 border-ilaw-navy text-ilaw-navy hover:bg-ilaw-navy hover:text-ilaw-white font-semibold px-8 py-4 text-lg"
                >
                  <Home className="mr-2 h-5 w-5" />
                  Back to Collection
                </Button>
              </div>

              <div className="mt-8 p-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-xl border border-purple-200">
                <p className="text-purple-700 font-medium italic text-lg">
                  "Liwanag, Kaalaman, Paglilingkod" - Keep shining bright! 🌟
                </p>
              </div>
            </div>
          </div>
        ) : (
          // Book layout
          <div className={`flat-book-container h-full ${isFullscreen ? 'max-w-6xl mx-auto' : ''}`}>
            <div className="flat-book-content h-full flex">
              {/* LEFT SIDE - Image */}
              <div className={`bg-gradient-to-br from-brand-gold-50 to-ilaw-white p-6 border-r-2 border-brand-gold-200 ${isFullscreen ? 'w-1/2' : 'w-1/2'}`}>
                {pageObj?.imageUrl ? (
                  <div className="w-full h-full flex items-center justify-center bg-ilaw-white rounded-lg shadow-inner border border-brand-gold-200">
                    <img
                      src={pageObj.imageUrl}
                      alt={`Illustration for page ${currentPage + 1}`}
                      className="max-w-full max-h-full object-contain rounded-lg"
                      style={{ transition: 'none' }}
                    />
                  </div>
                ) : (
                  <div className="h-full flex items-center justify-center bg-gradient-to-br from-brand-gold-100 to-ilaw-gold rounded-lg border-2 border-brand-gold-300">
                    <div className="text-center">
                      <BookOpen className="h-16 w-16 text-brand-gold-500 mx-auto mb-4" />
                      <p className="text-brand-gold-600 font-medium italic">Illustration coming soon</p>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT SIDE - Content */}
              <div
                className={`flat-page-right-container relative ${isFullscreen ? 'w-1/2' : 'w-1/2'} ${
                  isFlipping ? (flipDirection === 'next' ? 'flat-flipping' : 'flat-flipping-reverse') : ''
                }`}
              >
                <div className="flat-page-content absolute inset-0 p-8 overflow-y-auto bg-ilaw-white">
                  <div className="flex items-center mb-6">
                    <Star className="h-6 w-6 text-ilaw-gold mr-3" />
                    <h2 className={`font-heading font-bold text-ilaw-navy ${isFullscreen ? 'text-3xl' : 'text-2xl'}`}>
                      {pageObj?.title || `Page ${currentPage + 1}`}
                    </h2>
                  </div>

                  <div className="prose max-w-none">
                    <p className={`text-gray-700 leading-relaxed font-medium ${isFullscreen ? 'text-xl' : 'text-lg'}`}>{pageObj?.content}</p>
                  </div>

                  {/* Finish reading on last page */}
                  {currentPage === orderedPages.length - 1 && !bookCompleted && (
                    <div className="mt-8 text-center bg-gradient-to-r from-ilaw-gold to-brand-amber p-6 rounded-xl border-2 border-ilaw-navy">
                      {Array.from({ length: orderedPages.length }).every((_, i) => visitedPages[i]) ? (
                        <div>
                          <h3 className="text-xl font-heading font-bold text-ilaw-navy mb-4">🎉 You've reached the end!</h3>
                          <Button
                            onClick={() => {
                              // NEW: record last-page quiz attempt (if any)
                              if (currentPageHasQuestions) {
                                const score = computeCurrentPageScore();
                                if (score) {
                                  const durationSec = Math.max(0, Math.floor((Date.now() - pageStartRef.current) / 1000));
                                  quizAttemptMutation.mutate({
                                    bookId,
                                    pageId: pageObj?.id,
                                    ...score,
                                    mode: quizMode,
                                    durationSec,
                                  });
                                }
                              }

                              setLiveTimerActive(false);
                              if (bookId) {
                                updateProgressMutation.mutate({ bookId, currentPage, percentComplete: 100 });
                                markBookCompletedMutation.mutate(bookId);
                              }
                              setBookCompleted(true);
                            }}
                            className="bg-ilaw-navy hover:bg-brand-navy-800 text-ilaw-gold font-semibold px-8 py-3 text-lg shadow-navy border-2 border-ilaw-white"
                          >
                            <Award className="mr-2 h-5 w-5" />
                            Finish Reading
                          </Button>
                        </div>
                      ) : (
                        <div>
                          <Button disabled className="bg-gray-300 text-gray-700 cursor-not-allowed mb-3 px-8 py-3">
                            <Award className="mr-2 h-5 w-5" />
                            Finish Reading
                          </Button>
                          <p className="text-sm text-ilaw-navy font-medium italic">📚 Please read all pages to complete your journey!</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Questions */}
                  {showQuestions && currentPageHasQuestions && (
                    <div className="mt-8 p-6 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-200 shadow-lg">
                      <div className="flex items-center mb-6">
                        <Sparkles className="h-6 w-6 text-purple-600 mr-3" />
                        <h3 className="text-xl font-heading font-bold text-purple-800">Learning Questions</h3>
                      </div>

                      {displayedQuestions.map((question, idx) => {
                        const qId = (question.id ?? `${pageObj?.id ?? 'page'}-${idx}`).toString();
                        const disableInputs = showAnswerFeedback[qId] && quizMode === 'straight';

                        const optionsList =
                          (question.options?.includes('\n') ? question.options.split('\n') : question.options?.split(',') || []).map((o) =>
                            o.trim()
                          );

                        const renderNeutralPanel = (
                          <div className="mt-3 p-3 text-sm rounded-lg border-2 bg-blue-50 text-blue-800 border-blue-200">
                            Answer submitted. ✍️
                          </div>
                        );

                        return (
                          <div key={qId} className="mb-6 p-4 bg-white rounded-lg shadow border border-purple-200">
                            <p className="font-semibold mb-4 text-gray-800 text-lg">
                              {idx + 1}. {question.questionText}
                            </p>

                            {question.answerType === 'text' ? (
                              <div>
                                <input
                                  type="text"
                                  className="w-full border-2 border-purple-200 rounded-lg p-3 focus:border-purple-400 focus:ring-2 focus:ring-purple-200 font-medium"
                                  value={answers[qId] || ''}
                                  onChange={(e) => setAnswers({ ...answers, [qId]: e.target.value })}
                                  placeholder="Type your answer here..."
                                  disabled={disableInputs}
                                />

                                {showAnswerFeedback[qId] &&
                                  (quizMode === 'straight' ? (
                                    renderNeutralPanel
                                  ) : answersCorrect[qId] ? (
                                    <div className="mt-3 p-3 text-sm rounded-lg border-2 bg-green-100 text-green-800 border-green-300">
                                      <div className="flex items-center">
                                        <Star className="h-4 w-4 mr-2" />
                                        Excellent! You got it right! 🌟
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="mt-3 p-3 text-sm rounded-lg border-2 bg-red-100 text-red-800 border-red-300">
                                      <p className="mb-3">Not quite right, but keep trying! 💪</p>
                                      <Button
                                        className="bg-ilaw-gold hover:bg-brand-amber text-ilaw-navy font-semibold"
                                        size="sm"
                                        onClick={() => resetAnswer(qId)}
                                      >
                                        Try Again
                                      </Button>
                                    </div>
                                  ))}

                                {!showAnswerFeedback[qId] && (
                                  <Button
                                    className="mt-3 bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                                    size="sm"
                                    onClick={() => {
                                      if (quizMode === 'straight') {
                                        setShowAnswerFeedback({ ...showAnswerFeedback, [qId]: true });
                                      } else {
                                        const isCorrect =
                                          (answers[qId] || '').trim().toLowerCase() ===
                                          (question.correctAnswer || '').trim().toLowerCase();
                                        setAnswersCorrect({ ...answersCorrect, [qId]: isCorrect });
                                        setShowAnswerFeedback({ ...showAnswerFeedback, [qId]: true });
                                      }
                                    }}
                                  >
                                    {quizMode === 'straight' ? 'Submit' : 'Check Answer'}
                                  </Button>
                                )}
                              </div>
                            ) : (
                              question.answerType === 'multiple_choice' && (
                                <div className="space-y-2">
                                  {optionsList.map((option, optionIdx) =>
                                    option ? (
                                      <label
                                        key={optionIdx}
                                        htmlFor={`question-${qId}-option-${optionIdx}`}
                                        className="flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer"
                                      >
                                        <input
                                          type="radio"
                                          id={`question-${qId}-option-${optionIdx}`}
                                          name={`question-${qId}`}
                                          className="mr-3 h-4 w-4"
                                          checked={(answers[qId] || '') === option}
                                          onChange={() => setAnswers({ ...answers, [qId]: option })}
                                          disabled={disableInputs}
                                        />
                                        <span className="text-sm w-full">{option}</span>
                                      </label>
                                    ) : null
                                  )}

                                  {showAnswerFeedback[qId] &&
                                    (quizMode === 'straight' ? (
                                      renderNeutralPanel
                                    ) : answersCorrect[qId] ? (
                                      <div className="mt-2 p-2 text-sm rounded bg-green-100 text-green-800">
                                        Correct! Great job!
                                      </div>
                                    ) : (
                                      <div className="mt-2 p-2 text-sm rounded bg-red-100 text-red-800">
                                        <p>Not quite. Try again!</p>
                                        <Button
                                          className="mt-2 bg-ilaw-gold hover:bg-brand-amber text-ilaw-navy font-semibold"
                                          size="sm"
                                          onClick={() => resetAnswer(qId)}
                                        >
                                          Try Again
                                        </Button>
                                      </div>
                                    ))}

                                  {!showAnswerFeedback[qId] && answers[qId] && (
                                    <Button
                                      className="mt-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                                      size="sm"
                                      onClick={() => {
                                        if (quizMode === 'straight') {
                                          setShowAnswerFeedback({ ...showAnswerFeedback, [qId]: true });
                                        } else {
                                          const isCorrect =
                                            (answers[qId] || '').trim().toLowerCase() ===
                                            (question.correctAnswer || '').trim().toLowerCase();
                                          setAnswersCorrect({ ...answersCorrect, [qId]: isCorrect });
                                          setShowAnswerFeedback({ ...showAnswerFeedback, [qId]: true });
                                        }
                                      }}
                                    >
                                      {quizMode === 'straight' ? 'Submit' : 'Check Answer'}
                                    </Button>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flat-page-curl"></div>
                </div>

                {/* Next page content (forward flip) */}
                {nextPageReady && currentPage < orderedPages.length - 1 && flipDirection === 'next' && (
                  <div className="flat-page-content-next absolute inset-0 p-8 overflow-y-auto bg-ilaw-white">
                    <div className="flex items-center mb-6">
                      <Star className="h-6 w-6 text-ilaw-gold mr-3" />
                      <h2 className={`font-heading font-bold text-ilaw-navy ${isFullscreen ? 'text-3xl' : 'text-2xl'}`}>
                        {orderedPages[currentPage + 1]?.title || `Page ${currentPage + 2}`}
                      </h2>
                    </div>
                    <div className="prose max-w-none">
                      <p className={`text-gray-700 leading-relaxed font-medium ${isFullscreen ? 'text-xl' : 'text-lg'}`}>
                        {orderedPages[currentPage + 1]?.content}
                      </p>
                    </div>
                  </div>
                )}

                {/* Previous page content (backward flip) */}
                {flipDirection === 'prev' && currentPage > 0 && (
                  <div className="flat-page-content-prev absolute inset-0 p-8 overflow-y-auto bg-ilaw-white">
                    <div className="flex items-center mb-6">
                      <Star className="h-6 w-6 text-ilaw-gold mr-3" />
                      <h2 className={`font-heading font-bold text-ilaw-navy ${isFullscreen ? 'text-3xl' : 'text-2xl'}`}>
                        {orderedPages[currentPage - 1]?.title || `Page ${currentPage}`}
                      </h2>
                    </div>
                    <div className="prose max-w-none">
                      <p className={`text-gray-700 leading-relaxed font-medium ${isFullscreen ? 'text-xl' : 'text-lg'}`}>
                        {orderedPages[currentPage - 1]?.content}
                      </p>
                    </div>
                  </div>
                )}

                <div className="flat-page-spine-shadow"></div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        {currentPage < orderedPages.length - 1 && !bookCompleted && (
          <div className={`absolute top-1/2 transform -translate-y-1/2 z-50 ${isFullscreen ? 'right-8' : 'right-4'}`}>
            <Button
              onClick={nextPage}
              variant="ghost"
              size="icon"
              className={`text-ilaw-gold bg-ilaw-navy/80 hover:bg-ilaw-navy rounded-full shadow-2xl border-2 border-ilaw-gold ${
                isFullscreen ? 'w-16 h-16' : 'w-14 h-14'
              }`}
            >
              <ChevronRight className={isFullscreen ? 'h-10 w-10' : 'h-8 w-8'} />
            </Button>
          </div>
        )}

        {currentPage > 0 && !bookCompleted && (
          <div className={`absolute top-1/2 transform -translate-y-1/2 ${isFullscreen ? 'left-8' : 'left-4'}`}>
            <Button
              onClick={prevPage}
              variant="ghost"
              size="icon"
              className={`text-ilaw-gold bg-ilaw-navy/80 hover:bg-ilaw-navy rounded-full shadow-2xl border-2 border-ilaw-gold ${
                isFullscreen ? 'w-16 h-16' : 'w-14 h-14'
              }`}
            >
              <ChevronLeft className={isFullscreen ? 'h-10 w-10' : 'h-8 w-8'} />
            </Button>
          </div>
        )}

        {/* Fullscreen button */}
        <div className={`absolute z-50 ${isFullscreen ? 'top-8 right-8' : 'top-4 right-4'}`}>
          <Button
            onClick={toggleFullscreen}
            variant="ghost"
            size="icon"
            className={`text-ilaw-gold bg-ilaw-navy/60 hover:bg-ilaw-navy/80 rounded-full border border-ilaw-gold ${
              isFullscreen ? 'w-12 h-12' : 'w-10 h-10'
            }`}
          >
            {isFullscreen ? <Minimize className="h-6 w-6" /> : <Maximize className="h-5 w-5" />}
          </Button>
        </div>

        {/* Page indicator */}
        <div
          className={`absolute left-1/2 transform -translate-x-1/2 bg-ilaw-navy/80 text-ilaw-gold px-6 py-2 rounded-full text-sm font-semibold border border-ilaw-gold z-50 ${
            isFullscreen ? 'bottom-8' : 'bottom-4'
          }`}
        >
          Page {currentPage + 1} of {orderedPages.length}
          {liveTimerActive && <span className="ml-2 text-green-400">● Live</span>}
        </div>
      </div>

      {/* Bottom controls */}
      {!isFullscreen && (
        <div className="flex items-center justify-center gap-8 mb-4">
          <Button
            onClick={handleExit}
            variant="outline"
            className="flex items-center gap-2 border-2 border-ilaw-gold text-ilaw-navy hover:bg-ilaw-gold font-semibold px-6 py-3"
          >
            <Home size={18} />
            Return to Collection
          </Button>

          {musicUrl && (
            <>
              <audio ref={audioRef} src={musicUrl} loop={true} />
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleAudio}
                  className="flex items-center gap-2 border-2 border-purple-400 text-purple-700 hover:bg-purple-100 font-semibold"
                >
                  {audioPlaying ? <VolumeX className="h-4 w-4" /> : <Music className="h-4 w-4" />}
                  {audioPlaying ? 'Stop Music' : 'Play Music'}
                </Button>

                {audioPlaying && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleMute}
                    className="flex items-center gap-2 border-2 border-purple-400 text-purple-700 hover:bg-purple-100 font-semibold"
                  >
                    {audioMuted ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    {audioMuted ? 'Unmute' : 'Mute'}
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}