import { useState, useEffect, useRef } from 'react';
import { Link } from 'wouter';
import Header from "@/components/layout/Header";
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Home, Volume2, VolumeX, Check, X, Maximize, Minimize, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
// Import anime GIFs (800x450)
import animeGif1 from '@/assets/sun and moon assets/scene 1.gif'; // Replace with actual anime GIF paths
import animeGif2 from '@/assets/sun and moon assets/scene2.gif';
import animeGif3 from '@/assets/sun and moon assets/scene3.gif';
import animeGif4 from '@/assets/sun and moon assets/scene4.gif';
import animeGif5 from '@/assets/sun and moon assets/scene5.gif';
import animeGif6 from '@/assets/sun and moon assets/scene6.gif';
import animeGif7 from '@/assets/sun and moon assets/scene7.gif';
import animeGif8 from '@/assets/sun and moon assets/scene8.gif';
// Import the 2D animated storybook CSS
import '@/pages/student/stories/2danimatedstorybook.css';

export default function SunMoonStory() {
  const [currentPage, setCurrentPage] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [flipDirection, setFlipDirection] = useState('');
  const [showQuestion, setShowQuestion] = useState(false);
  const [questionAnswered, setQuestionAnswered] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isStoryComplete, setIsStoryComplete] = useState(false);
  const [showFloatingElements, setShowFloatingElements] = useState(false);
  
  const bookRef = useRef(null);
  
  // Story pages data with questions and floating illustration data
  const storyPages = [
    {
      id: 'page1',
      title: "The Creator and His Children",
      narration: "Long ago, the world was created by Bathala, the great god. He had two children: Apolaqui and Mayari.",
      character: "Bathala: \"My children, you are the light of this world.\"",
      illustration: animeGif1,
      floatingElements: {
        scene: { type: 'scene-illustration', image: animeGif1, position: 'center' }
      },
      question: "Who were Bathala's children?",
      options: [
        { id: "A", text: "Apolaqui and Mayari", correct: true },
        { id: "B", text: "Lakan and Lakambini", correct: false },
        { id: "C", text: "Tala and Hanan", correct: false }
      ]
    },
    {
      id: 'page2',
      title: "Bringing Light to the World",
      narration: "From the eyes of Apolaqui and Mayari came the first light. The world rejoiced in their brightness.",
      character: "People: \"Look! The children's eyes bring light to our world!\"",
      illustration: animeGif2,
      floatingElements: {
        scene: { type: 'scene-illustration', image: animeGif2, position: 'center' }
      },
      question: "What did Apolaqui and Mayari give to the world?",
      options: [
        { id: "A", text: "Rain and thunder", correct: false },
        { id: "B", text: "Light and joy", correct: true },
        { id: "C", text: "Wind and fire", correct: false }
      ]
    },
    {
      id: 'page3',
      title: "Bathala's Request",
      narration: "Bathala loved his children dearly and wished they would stay close. As he grew older, he asked them to remain by his side.",
      character: "Bathala: \"Please stay with me, my dear children. I need you near.\"",
      illustration: animeGif3,
      floatingElements: {
        scene: { type: 'scene-illustration', image: animeGif3, position: 'center' }
      },
      question: "Did Apolaqui and Mayari listen to their father's wish?",
      options: [
        { id: "A", text: "Yes, they stayed with him", correct: false },
        { id: "B", text: "No, they continued their adventures", correct: true },
        { id: "C", text: "They left the world entirely", correct: false }
      ]
    },
    {
      id: 'page4',
      title: "The Passing of Bathala",
      narration: "One day, Bathala fell ill and passed away, leaving no instructions on who should rule the earth.",
      character: "Narrator: \"The great creator was gone, and the world was without a ruler.\"",
      illustration: animeGif4,
      floatingElements: {
        scene: { type: 'scene-illustration', image: animeGif4, position: 'center' }
      },
      question: "What happened after Bathala's death?",
      options: [
        { id: "A", text: "The earth was left in darkness", correct: false },
        { id: "B", text: "Apolaqui and Mayari agreed to rule together", correct: false },
        { id: "C", text: "A conflict arose between the siblings", correct: true }
      ]
    },
    {
      id: 'page5',
      title: "The Siblings' Dispute",
      narration: "Apolaqui wanted to rule alone, but Mayari insisted on sharing power. Their disagreement led to a fierce battle.",
      character: "Apolaqui: \"I should rule alone!\" Mayari: \"We must share the power!\"",
      illustration: animeGif5,
      floatingElements: {
        scene: { type: 'scene-illustration', image: animeGif5, position: 'center' }
      },
      question: "Why did Apolaqui and Mayari fight?",
      options: [
        { id: "A", text: "They disagreed on who should rule the earth", correct: true },
        { id: "B", text: "They wanted to explore the sky", correct: false },
        { id: "C", text: "They were playing a game", correct: false }
      ]
    },
    {
      id: 'page6',
      title: "Mayari's Injury",
      narration: "During the fight, Apolaqui accidentally struck Mayari, injuring her eye. Realizing his mistake, he felt deep remorse.",
      character: "Apolaqui: \"Sister! I'm so sorry! I didn't mean to hurt you!\"",
      illustration: animeGif6,
      floatingElements: {
        scene: { type: 'scene-illustration', image: animeGif6, position: 'center' }
      },
      question: "What did Apolaqui do after hurting Mayari?",
      options: [
        { id: "A", text: "Continued fighting", correct: false },
        { id: "B", text: "Apologized and suggested they share power", correct: true },
        { id: "C", text: "Left the earth", correct: false }
      ]
    },
    {
      id: 'page7',
      title: "A New Agreement",
      narration: "They decided to rule the earth equally but at different times. Apolaqui would shine during the day, and Mayari would glow at night.",
      character: "Mayari: \"Let us share the responsibility. You take the day, I'll take the night.\"",
      illustration: animeGif7,
      floatingElements: {
        scene: { type: 'scene-illustration', image: animeGif7, position: 'center' }
      },
      question: "Why is Mayari's light fainter than Apolaqui's?",
      options: [
        { id: "A", text: "She only has one eye", correct: true },
        { id: "B", text: "She is shy", correct: false },
        { id: "C", text: "She uses a lantern", correct: false }
      ]
    },
    {
      id: 'page8',
      title: "The Sun and the Moon Today",
      narration: "To this day, Apolaqui, the Sun, rules the day, and Mayari, the Moon, watches over the night, each taking turns to light our world.",
      character: "Narrator: \"And they lived happily ever after, sharing the sky in harmony.\"",
      illustration: animeGif8,
      floatingElements: {
        scene: { type: 'scene-illustration', image: animeGif8, position: 'center' }
      },
      question: "What can we learn from Apolaqui and Mayari's story?",
      options: [
        { id: "A", text: "Sharing power can bring harmony", correct: true },
        { id: "B", text: "Fighting solves problems", correct: false },
        { id: "C", text: "It's better to rule alone", correct: false }
      ]
    }
  ];
  
  // ADDED: useEffect TO LOCK POSITIONING ON COMPONENT MOUNT
  useEffect(() => {
    // Force consistent positioning on component mount
    const forceConsistentPositioning = () => {
      // Remove any conflicting classes
      document.body.classList.remove('book-fullscreen-mode');
      
      // CORRECTED VERSION WITH PROPER TYPE CASTING
      const dialogContainer = document.querySelector('.popup-floating-dialog-container') as HTMLElement;
      if (dialogContainer) {
        // Force the positioning we want regardless of any other factors
        (dialogContainer as any).style.position = 'absolute';
        (dialogContainer as any).style.bottom = '8%';
        (dialogContainer as any).style.left = '50%';
        (dialogContainer as any).style.transform = 'translateX(-50%)';
        (dialogContainer as any).style.width = '70%';
        (dialogContainer as any).style.maxWidth = '800px';
      }
      
      // Ensure book container has consistent positioning
      const bookContainer = document.querySelector('.popup-flip-book-container') as HTMLElement;
      if (bookContainer) {
        bookContainer.classList.remove('book-fullscreen-mode');
      }
    };
    
    // Apply immediately
    forceConsistentPositioning();
    
    // Also apply after a small delay to catch any late-loading elements
    setTimeout(forceConsistentPositioning, 100);
    setTimeout(forceConsistentPositioning, 500);
    
  }, []); // Empty dependency array means this runs once on mount
  
  // Reset questionAnswered when currentPage changes
  useEffect(() => {
    setQuestionAnswered(false);
  }, [currentPage]);
  
  // UPDATED: useEffect FOR isLoaded WITH PROPER TYPE CASTING
  useEffect(() => {
    setIsLoaded(true);
    
    // Ensure positioning is locked after component is loaded
    setTimeout(() => {
      // CORRECTED VERSION WITH PROPER TYPE CASTING
      const dialogContainer = document.querySelector('.popup-floating-dialog-container') as HTMLElement;
      if (dialogContainer) {
        (dialogContainer as any).style.position = 'absolute';
        (dialogContainer as any).style.bottom = '8%';
        (dialogContainer as any).style.left = '50%';
        (dialogContainer as any).style.transform = 'translateX(-50%)';
      }
    }, 200);
  }, []);

  // Show floating elements after a delay when page loads
  useEffect(() => {
    setShowFloatingElements(false);
    const timer = setTimeout(() => {
      setShowFloatingElements(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [currentPage]);
  
  // Add event listener for ESC key and ARROW KEYS
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // ESC key for fullscreen exit
      if (event.key === "Escape" && isFullscreen) {
        setIsFullscreen(false);
        return;
      }
      
      // Prevent arrow key navigation if dialog is open or currently flipping
      if (showQuestion || isFlipping) {
        return;
      }
      
      // Left arrow key - Previous page
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (currentPage > 0) {
          prevPage();
        }
      }
      
      // Right arrow key - Next page
      if (event.key === "ArrowRight") {
        event.preventDefault();
        nextPage();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen, showQuestion, isFlipping, currentPage, questionAnswered]);
  
  // UPDATED: toggleFullscreen with positioning fixes
  const toggleFullscreen = () => {
    const newFullscreenState = !isFullscreen;
    setIsFullscreen(newFullscreenState);
    
    if (newFullscreenState) {
      document.body.classList.add('book-fullscreen-mode');
    } else {
      document.body.classList.remove('book-fullscreen-mode');
      
      // CORRECTED POSITIONING RESET WITH PROPER TYPE CASTING
      setTimeout(() => {
        // CORRECTED VERSION WITH PROPER TYPE CASTING
        const dialogContainer = document.querySelector('.popup-floating-dialog-container') as HTMLElement;
        if (dialogContainer) {
          (dialogContainer as any).style.position = 'absolute';
          (dialogContainer as any).style.bottom = '8%';
          (dialogContainer as any).style.left = '50%';
          (dialogContainer as any).style.transform = 'translateX(-50%)';
          (dialogContainer as any).style.width = '70%';
          (dialogContainer as any).style.maxWidth = '800px'; // FIXED: Changed from '600px' to '800px'
        }
      }, 100);
    }
  };
  
  // ================== NEW ANIMATION LOGIC ==================
  const nextPage = () => {
    if (currentPage < storyPages.length - 1) {
      if (!questionAnswered) {
        setShowQuestion(true);
        return;
      }
      
      // Add animation class to hide floating elements
      const bookContainer = document.querySelector('.popup-flip-book-container');
      bookContainer?.classList.add('popup-book-animating');
      
      setFlipDirection('forward');
      setIsFlipping(true);
      setShowFloatingElements(false);
      
      // Trigger right page flip animation
      const rightPage = document.querySelector('.popup-page-right');
      rightPage?.classList.add('flipped');
      
      setTimeout(() => {
        setCurrentPage(prev => prev + 1);
        setIsFlipping(false);
        setSelectedAnswer('');
        setHasAnswered(false);
        setFeedback('');
        setIsCorrect(false);
        
        // Reset page flip state
        rightPage?.classList.remove('flipped');
        
        // Remove animation class after animation completes
        bookContainer?.classList.remove('popup-book-animating');
      }, 1000); // Match your CSS transition duration
    } else {
      if (!questionAnswered) {
        setShowQuestion(true);
      } else {
        setIsStoryComplete(true);
      }
    }
  };
  
  const prevPage = () => {
    if (currentPage > 0) {
      // Add animation class to hide floating elements
      const bookContainer = document.querySelector('.popup-flip-book-container');
      bookContainer?.classList.add('popup-book-animating');
      
      setFlipDirection('backward');
      setIsFlipping(true);
      setShowFloatingElements(false);
      
      // Trigger right page flip animation (reverse)
      const rightPage = document.querySelector('.popup-page-right');
      rightPage?.classList.add('flipped');
      
      setTimeout(() => {
        setCurrentPage(prev => prev - 1);
        setIsFlipping(false);
        
        // Reset page flip state
        rightPage?.classList.remove('flipped');
        
        // Remove animation class after animation completes
        bookContainer?.classList.remove('popup-book-animating');
      }, 1000); // Match your CSS transition duration
    }
  };
  // ================== END NEW ANIMATION LOGIC ==================
  
  const handleAnswerSubmit = () => {
    const correct = storyPages[currentPage].options.find(o => o.id === selectedAnswer)?.correct;
    setIsCorrect(!!correct);
    setHasAnswered(true);
    setFeedback(correct ? "Correct! You're ready to continue the story." : "That's not right. Try again!");
  };
  
  const continueStory = () => {
    if (isCorrect) {
      setQuestionAnswered(true);
      setShowQuestion(false);
      setSelectedAnswer('');
      setHasAnswered(false);
      setFeedback('');
      
      if (currentPage === storyPages.length - 1) {
        setTimeout(() => {
          setIsStoryComplete(true);
        }, 300);
      }
    }
  };
  
  const restartStory = () => {
    setCurrentPage(0);
    setIsStoryComplete(false);
    setSelectedAnswer('');
    setHasAnswered(false);
    setFeedback('');
    setQuestionAnswered(false);
  };
  
  const toggleMute = () => setIsMuted(!isMuted);
  
  const tryAgain = () => {
    setSelectedAnswer('');
    setHasAnswered(false);
    setFeedback('');
  };
  
  const handleDialogClose = (open: boolean) => {
    setShowQuestion(open);
    if (!open) {
      setSelectedAnswer('');
      setHasAnswered(false);
      setFeedback('');
    }
  };
  
  // Get current page floating elements
  const currentFloatingElements = storyPages[currentPage]?.floatingElements;
  
  return (
    <div className={`min-h-screen flex flex-col bg-gradient-to-br from-amber-900 via-amber-800 to-amber-950 ${isFullscreen ? 'book-fullscreen-mode' : ''}`}>
      {!isFullscreen && <Header variant="student" />}
      
      <main className={`flex-grow flex flex-col items-center justify-center ${isFullscreen ? 'p-0' : 'p-4 md:p-6'}`}>
        {!isFullscreen && (
          <div className="w-full max-w-7xl">
            <div className="flex justify-between items-center mb-6">
              <Link href="/student/twodanimation">
                <Button variant="outline" className="bg-transparent border-amber-500 text-amber-300 hover:bg-amber-900/70 flex items-center gap-2">
                  <ChevronLeft size={16} /> Back to Stories
                </Button>
              </Link>
              <div className="text-center">
                <h1 className="text-2xl font-serif font-bold text-amber-100">The Sun and the Moon</h1>
                <div className="text-amber-300 text-sm">Page {currentPage + 1} of {storyPages.length}</div>
              </div>
              <div className="flex gap-2">
                <Button onClick={toggleFullscreen} className="bg-transparent border-amber-500 text-amber-300 hover:bg-amber-900/70">
                  {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                </Button>
                <Button onClick={toggleMute} className="bg-transparent border-amber-500 text-amber-300 hover:bg-amber-900/70">
                  {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* UPDATED BOOK CONTAINER WITH POPUP 2D ANIMATED STORYBOOK STRUCTURE */}
        <div 
          ref={bookRef}
          className={`popup-open-book-wrapper relative mx-auto transition-all duration-700 ease-in-out ${
            isFullscreen 
              ? 'fixed inset-0 z-50 w-screen h-screen bg-gradient-to-br from-amber-900 via-amber-800 to-amber-950 flex items-center justify-center' 
              : 'w-full max-w-7xl h-[75vh]'
          }`}
        >
          {/* Fullscreen controls */}
          {isFullscreen && (
            <div className="absolute top-4 right-4 z-10 flex space-x-2">
              <Button onClick={toggleFullscreen} className="bg-amber-900/50 hover:bg-amber-900/80 text-white rounded-full w-10 h-10 p-0 flex items-center justify-center">
                <Minimize size={16} />
              </Button>
              <Button onClick={toggleMute} className="bg-amber-900/50 hover:bg-amber-900/80 text-white rounded-full w-10 h-10 p-0 flex items-center justify-center">
                {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
              </Button>
            </div>
          )}
          
          {/* POPUP BOOK CONTAINER WITH 3D EFFECTS */}
          <div className="popup-book-container">
            <div className={`popup-flip-book-container ${isFullscreen ? 'w-[80vw] h-[75vh] max-w-none' : 'w-full h-full max-w-6xl'}`}>
              
              {/* LEFT NAVIGATION BUTTON */}
              <button
                className="popup-page-nav-left"
                onClick={prevPage}
                disabled={currentPage === 0 || isFlipping}
              >
                <ChevronLeft size={24} />
              </button>

              {/* RIGHT NAVIGATION BUTTON */}
              <button
                className="popup-page-nav-right"
                onClick={nextPage}
                disabled={isFlipping}
              >
                <ChevronRight size={24} />
              </button>
              
              {/* Book Base/Table Surface */}
              <div className="popup-book-surface"></div>
              
              {/* NEW POPUP BOOK STRUCTURE - Left/Right Pages */}
              <div className="popup-book-wrapper">
                
                {/* Book Spine (Center Binding) */}
                <div className="popup-book-fold"></div>
               
                {/* LEFT PAGE - Static (never animates) */}
                <div className="popup-page-left">
                  <div className="story-content">
                    {/* Left page content */}
                    <div className="absolute left-8 top-8 bottom-8 w-px bg-amber-200/40"></div>
                    <div className="absolute left-12 top-8 bottom-8 w-px bg-amber-100/30"></div>
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-xs text-amber-600">
                      {(currentPage * 2) + 1}
                    </div>
                  </div>
                </div>

                {/* RIGHT PAGE - Animating page (flips on navigation) */}
                <div className="popup-page-right">
                  <div className="story-content">
                    {/* Right page content */}
                    <div className="absolute right-8 top-8 bottom-8 w-px bg-amber-200/40"></div>
                    <div className="absolute right-12 top-8 bottom-8 w-px bg-amber-100/30"></div>
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-xs text-amber-600">
                      {(currentPage * 2) + 2}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* POPUP FLOATING ILLUSTRATIONS - MOVED OUTSIDE popup-flip-book-container */}
            <div className="popup-floating-illustrations">
              {currentFloatingElements?.scene && showFloatingElements && (
                <div 
                  className={`popup-floating-illustration scene-illustration ${showFloatingElements ? 'active' : ''} popup-entrance-center`}
                  style={{ 
                    backgroundImage: `url(${currentFloatingElements.scene.image})`,
                    animationDelay: '0.4s'
                  }}
                ></div>
              )}
            </div>
          </div>
        </div>

        {/* POPUP FLOATING DIALOG RECTANGLE - POSITIONED BY CSS */}
        <div className={`popup-floating-dialog-container ${showQuestion ? 'hidden' : ''}`}>
          <div className="story-content-wrapper">
            {/* Story Title */}
            <div className="story-title-section">
              <h2 className="story-title">{storyPages[currentPage].title}</h2>
            </div>
            
            {/* Story Narration */}
            <div className="narration-section">
              <p className="narration-text">{storyPages[currentPage].narration}</p>
            </div>
            
            {/* Character Dialog */}
            {storyPages[currentPage].character && (
              <div className="dialog-section">
                <p className="dialog-text">{storyPages[currentPage].character}</p>
              </div>
            )}
          </div>
        </div>

        {/* Question Dialog */}
        <Dialog open={showQuestion} onOpenChange={handleDialogClose}>
          <DialogContent className="max-w-md bg-amber-50 z-[10001]">
            <DialogHeader>
              <DialogTitle className="text-amber-800 font-serif">Question</DialogTitle>
              <DialogDescription className="text-amber-700">
                {storyPages[currentPage].question}
              </DialogDescription>
            </DialogHeader>
            <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
              {storyPages[currentPage].options.map((option) => (
                <div key={option.id} className="flex items-center space-x-2 my-2">
                  <RadioGroupItem value={option.id} id={option.id} />
                  <Label htmlFor={option.id} className="text-amber-800">{option.text}</Label>
                </div>
              ))}
            </RadioGroup>
            {hasAnswered && (
              <div className={`mt-4 p-2 rounded text-sm font-semibold ${isCorrect ? 'text-green-600' : 'text-red-600'}`}>
                {feedback}
              </div>
            )}
            <DialogFooter className="mt-4 gap-2">
              {hasAnswered ? (
                <>
                  {isCorrect ? (
                    <Button onClick={continueStory} className="bg-green-600 hover:bg-green-700 text-white">
                      <Check size={16} className="mr-2" /> Continue
                    </Button>
                  ) : (
                    <Button onClick={tryAgain} className="bg-amber-600 hover:bg-amber-700 text-white">
                      <RefreshCw size={16} className="mr-2" /> Try Again
                    </Button>
                  )}
                </>
              ) : (
                <Button 
                  onClick={handleAnswerSubmit} 
                  disabled={!selectedAnswer} 
                  className="bg-amber-700 hover:bg-amber-600 text-white"
                >
                  Submit
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Story Complete Dialog */}
        <Dialog open={isStoryComplete} onOpenChange={setIsStoryComplete}>
          <DialogContent className="max-w-md bg-amber-50 z-[10001]">
            <DialogHeader>
              <DialogTitle className="text-amber-800 font-serif">Story Complete!</DialogTitle>
              <DialogDescription className="text-amber-700">
                You've reached the end of "The Sun and the Moon" story.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-between mt-4">
              <Button onClick={restartStory} className="bg-amber-700 hover:bg-amber-600 text-white">
                <RefreshCw size={16} className="mr-2" /> Read Again
              </Button>
              <Link href="/student/twodanimation">
                <Button className="bg-amber-700 hover:bg-amber-600 text-white">
                  <Home size={16} className="mr-2" /> Back to Stories
                </Button>
              </Link>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}