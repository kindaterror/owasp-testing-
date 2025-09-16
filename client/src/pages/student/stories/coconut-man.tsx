import { useState, useEffect, useRef } from 'react';
import { Link } from 'wouter';
import Header from "@/components/layout/Header";
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Home, Volume2, VolumeX, Check, X, Maximize, Minimize, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import scene1 from '@/assets/the man and the coconut assets/scene1.gif'; // Replace with actual anime GIF paths
import scene2 from '@/assets/the man and the coconut assets/scene2.gif';
import scene3 from '@/assets/the man and the coconut assets/scene3.gif';
import scene4 from '@/assets/the man and the coconut assets/scene4.gif';
import scene5 from '@/assets/the man and the coconut assets/scene5.gif';
import scene6 from '@/assets/the man and the coconut assets/scene6.gif';
import scene7 from '@/assets/the man and the coconut assets/scene7.gif';
import scene8 from '@/assets/the man and the coconut assets/scene8.gif';
// Import the 2D animated storybook CSS
import '@/pages/student/stories/2danimatedstorybook.css';

export default function CoconutManStory() {
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
      title: "Juan's Hard Work",
      narration: "Early one morning, Juan set out to harvest coconuts for a wealthy man. He climbed tall coconut trees, cutting down the fruits and collecting them in baskets.",
      character: "Juan: \"Another day of hard work begins. I must gather all these coconuts carefully.\"",
      illustration: scene1,
      floatingElements: {
        scene: { type: 'scene-illustration', image: scene1, position: 'center' }
      },
      question: "What is Juan doing?",
      options: [
        { id: "A", text: "Planting coconuts", correct: false },
        { id: "B", text: "Harvesting coconuts", correct: true },
        { id: "C", text: "Selling coconuts", correct: false }
      ]
    },
    {
      id: 'page2',
      title: "Loading the Horse",
      narration: "After hours of work, Juan loaded the heavy baskets onto his horse. It was a huge and tiring job.",
      character: "Juan: \"These baskets are so heavy! My horse can barely carry all of them.\"",
      illustration: scene2,
      floatingElements: {
        scene: { type: 'scene-illustration', image: scene2, position: 'center' }
      },
      question: "How does Juan feel after his work?",
      options: [
        { id: "A", text: "Energetic", correct: false },
        { id: "B", text: "Tired", correct: true },
        { id: "C", text: "Bored", correct: false }
      ]
    },
    {
      id: 'page3',
      title: "Meeting the Boy",
      narration: "Just as Juan started on the road to the owner's house, he saw a young boy standing under a tree.",
      character: "Boy: \"How long will it take to reach the owner's house?\"\nJuan: \"If I go slowly, I will be there very soon. But if I go very fast, I will get there tomorrow.\"\nJuan (thinking): \"What silly advice! I should hurry to get there faster.\"",
      illustration: scene3,
      floatingElements: {
        scene: { type: 'scene-illustration', image: scene3, position: 'center' }
      },
      question: "What did the boy suggest?",
      options: [
        { id: "A", text: "Hurry to get there faster", correct: false },
        { id: "B", text: "Go slowly to arrive soon", correct: true },
        { id: "C", text: "Don't go at all", correct: false }
      ]
    },
    {
      id: 'page4',
      title: "The Journey Begins",
      narration: "Juan began to hurry down the road, pulling his horse along at a fast speed.",
      character: "Juan: \"Come on, horse! We need to move faster to get there quickly!\"",
      illustration: scene4,
      floatingElements: {
        scene: { type: 'scene-illustration', image: scene4, position: 'center' }
      },
      question: "What might happen if Juan goes too fast?",
      options: [
        { id: "A", text: "He will arrive safely", correct: false },
        { id: "B", text: "Coconuts might fall off", correct: true },
        { id: "C", text: "The horse will fly", correct: false }
      ]
    },
    {
      id: 'page5',
      title: "Coconuts Falling",
      narration: "As Juan hurried, coconuts began to fall out of the baskets. He had to stop to pick them up and adjust the load.",
      character: "Juan: \"Oh no! The coconuts are falling everywhere! I have to stop and collect them.\"",
      illustration: scene5,
      floatingElements: {
        scene: { type: 'scene-illustration', image: scene5, position: 'center' }
      },
      question: "Why is Juan stopping?",
      options: [
        { id: "A", text: "To rest", correct: false },
        { id: "B", text: "To pick up fallen coconuts", correct: true },
        { id: "C", text: "To eat lunch", correct: false }
      ]
    },
    {
      id: 'page6',
      title: "The Lesson Learned",
      narration: "The more Juan tried to hurry, the more coconuts fell and rolled away. It took him longer to reach the owner's house.",
      character: "Juan: \"This is taking forever! The faster I go, the more problems I have.\"",
      illustration: scene6,
      floatingElements: {
        scene: { type: 'scene-illustration', image: scene6, position: 'center' }
      },
      question: "What did Juan learn?",
      options: [
        { id: "A", text: "Hurrying helped him", correct: false },
        { id: "B", text: "Going slowly would have been better", correct: true },
        { id: "C", text: "The boy was wrong", correct: false }
      ]
    },
    {
      id: 'page7',
      title: "Reflecting on the Advice",
      narration: "Juan remembered the boy's words and realized that sometimes, going slowly is the fastest way.",
      character: "Juan: \"That wise boy was right. If I had gone slowly, I would have arrived much sooner.\"",
      illustration: scene7,
      floatingElements: {
        scene: { type: 'scene-illustration', image: scene7, position: 'center' }
      },
      question: "What can we learn from Juan's experience?",
      options: [
        { id: "A", text: "Always hurry", correct: false },
        { id: "B", text: "Listen to good advice", correct: true },
        { id: "C", text: "Ignore others", correct: false }
      ]
    },
    {
      id: 'page8',
      title: "Moral of the Story",
      narration: "Rushing can lead to mistakes. Taking your time and listening to advice can help you succeed.",
      character: "Narrator: \"Remember: Slow and steady wins the race. Good advice is worth listening to.\"",
      illustration: scene8,
      floatingElements: {
        scene: { type: 'scene-illustration', image: scene8, position: 'center' }
      },
      question: "Will you remember to take your time when doing important tasks?",
      options: [
        { id: "A", text: "Yes", correct: true },
        { id: "B", text: "No", correct: false },
        { id: "C", text: "Maybe", correct: false }
      ]
    }
  ];
  
  // CORRECTED useEffect TO LOCK POSITIONING ON COMPONENT MOUNT
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
  
  // CORRECTED useEffect FOR isLoaded WITH PROPER TYPE CASTING
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
          (dialogContainer as any).style.maxWidth = '800px';
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
    <div className={`min-h-screen flex flex-col bg-gradient-to-br from-green-900 via-green-800 to-green-950 ${isFullscreen ? 'book-fullscreen-mode' : ''}`}>
      {!isFullscreen && <Header variant="student" />}
      
      <main className={`flex-grow flex flex-col items-center justify-center ${isFullscreen ? 'p-0' : 'p-4 md:p-6'}`}>
        {!isFullscreen && (
          <div className="w-full max-w-7xl">
            <div className="flex justify-between items-center mb-6">
              <Link href="/student/twodanimation">
                <Button variant="outline" className="bg-transparent border-green-400 text-green-300 hover:bg-green-900/70 flex items-center gap-2">
                  <ChevronLeft size={16} /> Back to Stories
                </Button>
              </Link>
              <div className="text-center">
                <h1 className="text-2xl font-serif font-bold text-green-100">The Man with the Coconut</h1>
                <div className="text-green-300 text-sm">Page {currentPage + 1} of {storyPages.length}</div>
              </div>
              <div className="flex gap-2">
                <Button onClick={toggleFullscreen} className="bg-transparent border-green-400 text-green-300 hover:bg-green-900/70">
                  {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                </Button>
                <Button onClick={toggleMute} className="bg-transparent border-green-400 text-green-300 hover:bg-green-900/70">
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
              ? 'fixed inset-0 z-50 w-screen h-screen bg-gradient-to-br from-green-900 via-green-800 to-green-950 flex items-center justify-center' 
              : 'w-full max-w-7xl h-[75vh]'
          }`}
        >
          {/* Fullscreen controls */}
          {isFullscreen && (
            <div className="absolute top-4 right-4 z-10 flex space-x-2">
              <Button onClick={toggleFullscreen} className="bg-green-900/50 hover:bg-green-900/80 text-white rounded-full w-10 h-10 p-0 flex items-center justify-center">
                <Minimize size={16} />
              </Button>
              <Button onClick={toggleMute} className="bg-green-900/50 hover:bg-green-900/80 text-white rounded-full w-10 h-10 p-0 flex items-center justify-center">
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
                    <div className="absolute left-8 top-8 bottom-8 w-px bg-green-200/40"></div>
                    <div className="absolute left-12 top-8 bottom-8 w-px bg-green-100/30"></div>
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-xs text-green-600">
                      {(currentPage * 2) + 1}
                    </div>
                  </div>
                </div>

                {/* RIGHT PAGE - Animating page (flips on navigation) */}
                <div className="popup-page-right">
                  <div className="story-content">
                    {/* Right page content */}
                    <div className="absolute right-8 top-8 bottom-8 w-px bg-green-200/40"></div>
                    <div className="absolute right-12 top-8 bottom-8 w-px bg-green-100/30"></div>
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-xs text-green-600">
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
          <DialogContent className="max-w-md bg-green-50 z-[10001]">
            <DialogHeader>
              <DialogTitle className="text-green-800 font-serif">Question</DialogTitle>
              <DialogDescription className="text-green-700">
                {storyPages[currentPage].question}
              </DialogDescription>
            </DialogHeader>
            <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
              {storyPages[currentPage].options.map((option) => (
                <div key={option.id} className="flex items-center space-x-2 my-2">
                  <RadioGroupItem value={option.id} id={option.id} />
                  <Label htmlFor={option.id} className="text-green-800">{option.text}</Label>
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
                    <Button onClick={tryAgain} className="bg-green-600 hover:bg-green-700 text-white">
                      <RefreshCw size={16} className="mr-2" /> Try Again
                    </Button>
                  )}
                </>
              ) : (
                <Button 
                  onClick={handleAnswerSubmit} 
                  disabled={!selectedAnswer} 
                  className="bg-green-700 hover:bg-green-600 text-white"
                >
                  Submit
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Story Complete Dialog */}
        <Dialog open={isStoryComplete} onOpenChange={setIsStoryComplete}>
          <DialogContent className="max-w-md bg-green-50 z-[10001]">
            <DialogHeader>
              <DialogTitle className="text-green-800 font-serif">Story Complete!</DialogTitle>
              <DialogDescription className="text-green-700">
                You've reached the end of "The Man with the Coconut" story.
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-between mt-4">
              <Button onClick={restartStory} className="bg-green-700 hover:bg-green-600 text-white">
                <RefreshCw size={16} className="mr-2" /> Read Again
              </Button>
              <Link href="/student/twodanimation">
                <Button className="bg-green-700 hover:bg-green-600 text-white">
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