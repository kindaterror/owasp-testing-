// --- SECTION: Imports ---
import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Home, Music, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/contexts/AuthContext';

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
}

interface BookReaderProps {
  title: string;
  pages: Page[];
  returnPath: string;
  musicUrl?: string;
  bookId?: number; // Add bookId to identify which book is being read
}

// --- SECTION: Component Definition: BookReader ---
export function BookReader({ title, pages, returnPath, musicUrl, bookId }: BookReaderProps) {
  // --- SUB-SECTION: State and Refs ---
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
  const [visitedPages, setVisitedPages] = useState<Record<number, boolean>>({0: true}); // Track visited pages
  
  const bookContainerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // --- SUB-SECTION: Audio Control ---
  const toggleAudio = () => {
    if (audioRef.current) {
      if (audioPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(error => {
          console.error('Error playing audio:', error);
        });
      }
      setAudioPlaying(!audioPlaying);
    }
  };
  
  const toggleMute = () => {
    if (audioRef.current) {
      audioRef.current.muted = !audioMuted;
      setAudioMuted(!audioMuted);
    }
  };

  // --- SUB-SECTION: Fullscreen Control ---
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      bookContainerRef.current?.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const currentPageHasQuestions = pages[currentPage]?.questions && 
                               pages[currentPage]?.questions?.length > 0;

  // --- SUB-SECTION: Page Navigation Logic ---
  const nextPage = () => {
    // If there are unanswered questions and we haven't shown them yet, show them instead of navigating
    if (currentPageHasQuestions && !showQuestions) {
      setShowQuestions(true);
      return;
    }

    // Don't allow navigation during page flip animation
    if (isFlipping) return;

    // Reset questions state when moving to a new page
    setShowQuestions(false);
    
    if (currentPage < pages.length - 1) {
      // Set next page as ready before starting the animation
      setNextPageReady(true);
      
      // Small delay to ensure next page content is loaded before flip begins
      setTimeout(() => {
        // Start the flipping animation
        setIsFlipping(true);
        setFlipDirection('next');
        
        // Wait for animation to complete before changing the actual page
        // This creates a smoother flip effect - animation is 0.6s in CSS
        setTimeout(() => {
          const nextPageNumber = currentPage + 1;
          
          // Mark the next page as visited
          setVisitedPages(prev => ({...prev, [nextPageNumber]: true}));
          
          setCurrentPage(nextPageNumber);
          
          // Small delay to ensure page content is updated before ending animation
          setTimeout(() => {
            setIsFlipping(false);
            setFlipDirection(null);
            setNextPageReady(false);
          }, 50);
        }, 300); // Halfway through the animation
      }, 10);
    }
  };

  const prevPage = () => {
    // If questions are shown, hide them first instead of navigating
    if (showQuestions) {
      setShowQuestions(false);
      return;
    }
    
    // Don't allow navigation during page flip animation
    if (isFlipping) return;
    
    // When on the "Thanks for Reading" page, just go back to the last content page
    if (bookCompleted && currentPage === pages.length - 1) {
      setBookCompleted(false);
      setCurrentPage(currentPage - 1);
      return;
    }
    
    if (currentPage > 0) {
      // Start the flipping animation
      setIsFlipping(true);
      setFlipDirection('prev');
      
      // Wait for animation to be halfway through before changing the actual page
      // This creates a smoother flip effect
      setTimeout(() => {
        setCurrentPage(currentPage - 1);
        
        // Small delay before ending animation state
        setTimeout(() => {
          setIsFlipping(false);
          setFlipDirection(null);
        }, 50);
      }, 300); // Halfway through the animation (animation is 0.6s in CSS)
    }
  };

  // Get the current user
  const { user } = useAuth();
  
  // --- SUB-SECTION: API Mutations (Book Completion & Progress) ---
  // Create mutation for marking a book as completed
  const markBookCompletedMutation = useMutation({
    mutationFn: async (bookId: number) => {
      const token = localStorage.getItem('token');
      
      console.log("Marking book as completed:", bookId);
      
      try {
        const response = await fetch(`/api/books/${bookId}/complete`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}` 
          },
          credentials: 'include'
        });
        
        // First check if response is ok
        if (!response.ok) {
          const text = await response.text();
          console.error('Book completion error response:', text);
          try {
            // Try to parse as JSON
            const errorData = JSON.parse(text);
            throw new Error('Failed to mark book as completed: ' + JSON.stringify(errorData));
          } catch (parseError) {
            // If can't parse as JSON, use text directly
            throw new Error('Failed to mark book as completed: ' + text);
          }
        }
        
        // Try to parse response as JSON
        try {
          const data = await response.json();
          console.log("Book completion success:", data);
          return data;
        } catch (parseError) {
          console.log("Empty or invalid JSON response, but request was successful");
          return { success: true, message: "Book marked as completed" };
        }
      } catch (error) {
        console.error("Book completion request error:", error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidate any relevant queries to update UI
      queryClient.invalidateQueries({ queryKey: ['/api/progress'] });
    }
  });
  
  // This state is already declared above
  
  // Create mutation for updating progress
  const updateProgressMutation = useMutation({
    mutationFn: async (progressData: { bookId: number; currentPage: number; percentComplete: number }) => {
      const token = localStorage.getItem('token');
      
      // Include explicit userId from the authenticated user
      const formattedData = {
        userId: user?.id,  // Include the userId explicitly
        bookId: progressData.bookId,
        percentComplete: progressData.percentComplete
      };
      
      console.log("Sending progress update:", formattedData);
      
      return fetch('/api/progress', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify(formattedData),
        credentials: 'include'
      }).then(res => {
        if (!res.ok) {
          return res.json().then(errorData => {
            console.error('Progress update error:', errorData);
            throw new Error('Failed to update progress: ' + JSON.stringify(errorData));
          });
        }
        return res.json();
      });
    }
  });

  // --- SUB-SECTION: Effects ---
  // --- Effect: Book Completion Logic ---
  useEffect(() => {
    // If we're on the last page and haven't marked the book as completed yet
    // AND the user has visited all pages
    if (currentPage === pages.length - 1 && !bookCompleted && pages.length > 0) {
      // Check if all pages have been visited
      const allPagesVisited = Array.from({ length: pages.length }).every((_, i) => visitedPages[i]);
      
      if (!allPagesVisited) {
        console.log("Last page reached but not all pages have been visited yet");
        return;
      }
      
      console.log("Reached last page and all pages visited, marking book as completed");
      
      // Use the provided bookId or fall back to the page's bookId if needed
      const bookIdToUse = bookId || pages[0]?.id;
      
      if (bookIdToUse) {
        console.log(`Sending completion request for book ID: ${bookIdToUse}`);
        
        // First update progress to 100% using the regular progress endpoint
        updateProgressMutation.mutate({
          bookId: bookIdToUse,
          currentPage,
          percentComplete: 100
        });
        
        // Then use the dedicated endpoint for marking books as completed after a small delay
        setTimeout(() => {
          markBookCompletedMutation.mutate(bookIdToUse);
          // Set book completion state AFTER marking it as completed in the database
          setTimeout(() => {
            setBookCompleted(true);
          }, 300);
        }, 500); // Small delay to ensure progress update completes first
      } else {
        console.error("Cannot mark book as completed: No book ID available");
      }
    }
  }, [currentPage, pages.length, bookCompleted, bookId, visitedPages]);
  
  // Reset questions when changing pages
  // --- Effect: Question Reset on Page Change ---
  useEffect(() => {
    setShowQuestions(false);
    setShowAnswerFeedback({});
    setAnswersCorrect({});
  }, [currentPage]);

  // Keyboard navigation
  // --- Effect: Keyboard Navigation ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') {
        nextPage();
      } else if (e.key === 'ArrowLeft') {
        prevPage();
      } else if (e.key === 'Escape' && isFullscreen) {
        document.exitFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, showQuestions, currentPageHasQuestions, isFullscreen]);

  // --- SUB-SECTION: Render Logic ---
  return (
    <div className="flex flex-col items-center w-full">
      {/* --- Render: Main Container & Title --- */}
      {/* Book title */}
      {!isFullscreen && (
        <h1 className="text-2xl font-bold mb-6">{title}</h1>
      )}
      
      {/* --- Render: Book Container (FlipBuilder Style) --- */}
      {/* Book container with FlipBuilder style */}
      <div 
        ref={bookContainerRef}
        className={`relative bg-gray-800 w-full max-w-4xl rounded-lg p-4 mb-4 ${isFullscreen ? 'h-screen p-8' : 'h-[600px]'}`}
      >
        {bookCompleted && currentPage === pages.length - 1 ? (
          <div className="bg-white rounded shadow-lg overflow-hidden mx-auto text-center flex flex-col items-center justify-center h-full">
            <div className="p-8">
              <h2 className="text-2xl font-bold mb-6 text-primary">Thanks for Reading!</h2>
              <p className="text-lg text-gray-700 mb-8">You've completed "{title}"</p>
              
              <div className="flex flex-col md:flex-row gap-4 justify-center">
                <Button 
                  onClick={() => {
                    setBookCompleted(false);
                    setCurrentPage(0);
                  }} 
                  className="bg-primary hover:bg-primary/90 text-black"
                >
                  Read Again
                </Button>
                
                <Link href={returnPath}>
                  <Button variant="outline">
                    Back to Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="flip-book-container h-full">
            <div className="flip-book-content h-full">
              {/* Main book layout with flip animation */}
              <div className={`page-wrapper relative w-full h-full ${isFlipping ? 'flipping' : ''}`}>
                
                {/* --- Render: Front Page (Current Page) --- */}
                {/* Front page (current page) */}
                <div className="page-side page-front flex bg-white rounded-lg shadow-xl overflow-hidden">
                  {/* --- Render: Front Page - Image Side --- */}
                  {/* Left page - Image side */}
                  <div className="w-1/2 bg-gray-50 p-4">
                    {pages[currentPage]?.imageUrl ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <img 
                          src={pages[currentPage].imageUrl} 
                          alt={`Illustration for page ${currentPage + 1}`}
                          className="max-w-full max-h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="h-full flex items-center justify-center">
                        <p className="text-gray-400 italic">No image for this page</p>
                      </div>
                    )}
                    <div className="page-fold"></div>
                    <div className="page-curl"></div>
                  </div>
                  
                  {/* --- Render: Front Page - Content Side (with Questions) --- */}
                  {/* Right page - Content side */}
                  <div className="w-1/2 p-6 overflow-y-auto relative">
                    <h2 className="text-xl font-semibold mb-4">
                      {pages[currentPage]?.title || `Page ${currentPage + 1}`}
                    </h2>
                    
                    <div className="prose max-w-none">
                      <p className="text-gray-700">{pages[currentPage]?.content}</p>
                    </div>
                    
                    {/* Show finish reading button if this is the last content page */}
                    {currentPage === pages.length - 1 && !bookCompleted && (
                      <div className="mt-6 text-center">
                        {/* Check if all pages have been visited */}
                        {Array.from({ length: pages.length }).every((_, i) => visitedPages[i]) ? (
                          <Button 
                            onClick={() => {
                              // Mark book as completed in database first
                              const bookIdToUse = bookId || pages[0]?.id;
                              if (bookIdToUse) {
                                updateProgressMutation.mutate({
                                  bookId: bookIdToUse,
                                  currentPage,
                                  percentComplete: 100
                                });
                                markBookCompletedMutation.mutate(bookIdToUse);
                              }
                              // Then set state to show completion page
                              setBookCompleted(true);
                            }} 
                            className="bg-primary hover:bg-primary/90 text-black"
                          >
                            Finish Reading
                          </Button>
                        ) : (
                          <div>
                            <Button 
                              disabled
                              className="bg-gray-300 text-gray-700 cursor-not-allowed mb-2"
                            >
                              Finish Reading
                            </Button>
                            <p className="text-sm text-gray-500 italic">
                              You need to read all pages first!
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Add page curl effect to the right side too */}
                    <div className="page-curl absolute top-0 right-0 h-full"></div>
                    
                    {/* Questions Section */}
                    {showQuestions && currentPageHasQuestions && (
                      <div className="mt-6 p-4 bg-gray-50 rounded-md border">
                        <h3 className="text-lg font-semibold mb-4">Questions</h3>
                        
                        {pages[currentPage].questions?.map((question, idx) => {
                          {/* Create a string ID for the question if it doesn't have one */}
                          const qId = typeof question.id !== 'undefined' 
                            ? question.id.toString() 
                            : `page${currentPage}-q${idx}`;
                          
                          return (
                            <div key={qId} className="mb-4 p-3 bg-white rounded shadow-sm">
                              <p className="font-medium mb-2">{idx + 1}. {question.questionText}</p>
                              
                              {question.answerType === 'text' ? (
                                <div>
                                  <input 
                                    type="text"
                                    className="w-full border rounded p-2"
                                    value={answers[qId] || ''}
                                    onChange={(e) => setAnswers({...answers, [qId]: e.target.value})}
                                    placeholder="Type your answer here"
                                  />
                                  
                                  {showAnswerFeedback[qId] && (
                                    <div className={`mt-2 p-2 text-sm rounded ${answersCorrect[qId] ? 
                                      'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                      {answersCorrect[qId] ? 
                                        'Correct!' : 
                                        `Not quite. The correct answer is: ${question.correctAnswer}`}
                                    </div>
                                  )}
                                  
                                  {!showAnswerFeedback[qId] && (
                                    <Button 
                                      className="mt-2"
                                      size="sm"
                                      onClick={() => {
                                        const isCorrect = answers[qId]?.toLowerCase() === 
                                                          question.correctAnswer?.toLowerCase();
                                        
                                        setAnswersCorrect({...answersCorrect, [qId]: isCorrect});
                                        setShowAnswerFeedback({...showAnswerFeedback, [qId]: true});
                                      }}
                                    >
                                      Check Answer
                                    </Button>
                                  )}
                                </div>
                              ) : question.answerType === 'multiple_choice' && (
                                <div className="space-y-2">
                                  {question.options?.split('\n').map((option, optionIdx) => (
                                    <div key={optionIdx} className="flex items-center">
                                      <input 
                                        type="radio"
                                        id={`question-${qId}-option-${optionIdx}`}
                                        name={`question-${qId}`}
                                        className="mr-2"
                                        checked={answers[qId] === option}
                                        onChange={() => setAnswers({...answers, [qId]: option})}
                                      />
                                      <label htmlFor={`question-${qId}-option-${optionIdx}`}>
                                        {option}
                                      </label>
                                    </div>
                                  ))}
                                  
                                  {showAnswerFeedback[qId] && (
                                    <div className={`mt-2 p-2 text-sm rounded ${answersCorrect[qId] ? 
                                      'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                      {answersCorrect[qId] ? 
                                        'Correct!' : 
                                        `Not quite. The correct answer is: ${question.correctAnswer}`}
                                    </div>
                                  )}
                                  
                                  {!showAnswerFeedback[qId] && answers[qId] && (
                                    <Button 
                                      className="mt-2"
                                      size="sm"
                                      onClick={() => {
                                        const isCorrect = answers[qId] === question.correctAnswer;
                                        
                                        setAnswersCorrect({...answersCorrect, [qId]: isCorrect});
                                        setShowAnswerFeedback({...showAnswerFeedback, [qId]: true});
                                      }}
                                    >
                                      Check Answer
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="page-shadow"></div>
                </div>
                
                {/* --- Render: Back Page (Next Page for Flip) --- */}
                {/* Back page (next or previous page) */}
                <div className="page-side page-back flex bg-white rounded-lg shadow-xl overflow-hidden">
                  {/* Show next page content on the back during flip animation */}
                  {nextPageReady && currentPage < pages.length - 1 && (
                    <>
                      {/* Left page - Image side */}
                      <div className="w-1/2 bg-gray-50 p-4">
                        {pages[currentPage + 1]?.imageUrl ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <img 
                              src={pages[currentPage + 1].imageUrl} 
                              alt={`Illustration for page ${currentPage + 2}`}
                              className="max-w-full max-h-full object-contain"
                            />
                          </div>
                        ) : (
                          <div className="h-full flex items-center justify-center">
                            <p className="text-gray-400 italic">No image for this page</p>
                          </div>
                        )}
                      </div>
                      
                      {/* Right page - Content side */}
                      <div className="w-1/2 p-6 overflow-y-auto">
                        <h2 className="text-xl font-semibold mb-4">
                          {pages[currentPage + 1]?.title || `Page ${currentPage + 2}`}
                        </h2>
                        
                        <div className="prose max-w-none">
                          <p className="text-gray-700">{pages[currentPage + 1]?.content}</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* --- Render: Navigation Buttons (Prev/Next) --- */}
        {/* Large navigation buttons - circular with icons */}
        {currentPage < pages.length - 1 && (
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
            <Button 
              onClick={nextPage} 
              variant="ghost" 
              size="icon" 
              className="text-white bg-black/60 hover:bg-black/80 rounded-full w-12 h-12 shadow-lg"
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          </div>
        )}
        
        {currentPage > 0 && (
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
            <Button 
              onClick={prevPage} 
              variant="ghost" 
              size="icon" 
              className="text-white bg-black/60 hover:bg-black/80 rounded-full w-12 h-12 shadow-lg"
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
          </div>
        )}
        
        {/* --- Render: Fullscreen Button --- */}
        {/* Fullscreen button */}
        <div className="absolute top-4 right-4">
          <Button
            onClick={toggleFullscreen}
            variant="ghost"
            size="icon"
            className="text-white bg-black/40 hover:bg-black/60 rounded-full"
          >
            {isFullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
          </Button>
        </div>
        
        {/* --- Render: Page Indicator --- */}
        {/* Current page indicator */}
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/50 text-white px-4 py-1 rounded-full text-sm">
          Page {currentPage + 1} of {pages.length}
        </div>
      </div>

      {/* --- Render: Bottom Controls (Non-Fullscreen) --- */}
      {/* Bottom navigation and controls - only visible when not in fullscreen */}
      {!isFullscreen && (
        <div className="flex items-center justify-center gap-8 mb-4">
          <Link href={returnPath}>
            <Button variant="outline" className="flex items-center gap-2">
              <Home size={16} />
              Return to Books
            </Button>
          </Link>
          
          {musicUrl && (
            <>
              <audio ref={audioRef} src={musicUrl} loop={true} />
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleAudio}
                  className="flex items-center gap-2"
                >
                  {audioPlaying ? <VolumeX className="h-4 w-4" /> : <Music className="h-4 w-4" />}
                  {audioPlaying ? "Stop Music" : "Play Music"}
                </Button>
                
                {audioPlaying && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleMute}
                    className="flex items-center gap-2"
                  >
                    {audioMuted ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    {audioMuted ? "Unmute" : "Mute"}
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