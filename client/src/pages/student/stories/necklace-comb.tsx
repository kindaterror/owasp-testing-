import { useState, useEffect, useRef, memo } from 'react';
import { Link } from 'wouter';
import Header from "@/components/layout/Header";
import { Button } from '@/components/ui/button';
import {
  ChevronLeft, ChevronRight, Home, Volume2, VolumeX,
  Check, Maximize, Minimize, RefreshCw, Sparkles, Moon, Gem
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import test2Gif from '@/assets/bookanimation/test2.gif';
import backgroundImage from '@/assets/bookanimation/background.png';
import '@/pages/student/stories/2danimatedstorybook.css';

type QAOption = { id: string; text: string; correct: boolean };

type Page = {
  id: string;
  title: string;
  narration: string;
  character?: string;
  illustration: string;
  question: string;
  options: QAOption[];
};

export default function NecklaceCombStory() {
  const [spreadStart, setSpreadStart] = useState(0);
  const [rightUnlocked, setRightUnlocked] = useState(false);
  const [pendingSide, setPendingSide] = useState<null | 'left' | 'right'>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isStoryComplete, setIsStoryComplete] = useState(false);

  // Loader + intro
  const [isBooting, setIsBooting] = useState(true);
  const [entered, setEntered] = useState(false);
  const [playOpen, setPlayOpen] = useState(false); // <— animate real pages

  const [selectedAnswer, setSelectedAnswer] = useState('');
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [feedback, setFeedback] = useState('');

  const rootRef = useRef<HTMLDivElement | null>(null);
  const bookRef = useRef<HTMLDivElement | null>(null);

  // Fullscreen tracking
  useEffect(() => {
    const onFsChange = () => {
      const on = !!document.fullscreenElement;
      setIsFullscreen(on);
      document.body.classList.toggle('book-fullscreen-mode', on);
    };
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('book-fullscreen-mode', isFullscreen);
    return () => document.body.classList.remove('book-fullscreen-mode');
  }, [isFullscreen]);

  // Preload assets, then show book and play opening
  useEffect(() => {
    const preload = (src: string) =>
      new Promise<void>((resolve) => {
        const img = new Image();
        img.onload = () => resolve();
        img.onerror = () => resolve();
        img.src = src;
      });

    let mounted = true;
    (async () => {
      await Promise.all([preload(backgroundImage), preload(test2Gif)]);
      await new Promise((r) => setTimeout(r, 700));
      if (!mounted) return;

      setIsBooting(false);
      setTimeout(() => {
        setEntered(true);
        setPlayOpen(true);
        // stop the class after the animation so layout is “clean”
        setTimeout(() => setPlayOpen(false), 950);
      }, 20);
    })();

    return () => { mounted = false; };
  }, []);

  const storyPages: Page[] = [
    { id: 'page1', title: "Birthday Girl Inday", narration: "In a little village lived a kind girl named Inday. It was her birthday!", character: "Inday: \"Wow! A necklace and a pretty comb!\"", illustration: test2Gif, question: "What do you get on your birthday?", options: [ { id: "A", text: "Toys", correct: true }, { id: "B", text: "Homework", correct: false }, { id: "C", text: "Vegetables", correct: false } ] },
    { id: 'page2', title: "A Low Sky!", narration: "Back then, the sky was very low. You could reach up and touch it!", character: "Inday: \"I'll keep my gifts on this fluffy cloud while I work.\"", illustration: test2Gif, question: "Where did Inday put her gifts?", options: [ { id: "A", text: "In a box", correct: false }, { id: "B", text: "On a cloud", correct: true }, { id: "C", text: "In her pocket", correct: false } ] },
    { id: 'page3', title: "The Big Bump", narration: "As she worked, her pestle bumped the sky!", character: "\"Oh no! What will happen now?\"", illustration: test2Gif, question: "What will happen to the sky?", options: [ { id: "A", text: "It jumps up", correct: true }, { id: "B", text: "It gets sleepy", correct: false }, { id: "C", text: "It sings a song", correct: false } ] },
    { id: 'page4', title: "Sky Flies Up!", narration: "The sky got scared and flew high, taking the cloud and her gifts!", character: "Inday: \"Oh no! My necklace and comb!\"", illustration: test2Gif, question: "Would you be sad too if you lost your gifts?", options: [ { id: "A", text: "Yes", correct: true }, { id: "B", text: "No", correct: false } ] },
    { id: 'page5', title: "A Beautiful Night", narration: "That night, Inday looked up and saw something magical.", character: "Inday: \"My comb is the moon, and my necklace is the stars!\"", illustration: test2Gif, question: "Where are Inday's gifts now?", options: [ { id: "A", text: "In the water", correct: false }, { id: "B", text: "In the sky", correct: true }, { id: "C", text: "On the floor", correct: false } ] },
    { id: 'page6', title: "The Sparkly Lesson", narration: "Even when we lose something, something beautiful can happen.", character: "\"And they lived happily ever after, looking at the beautiful night sky.\"", illustration: test2Gif, question: "What is the lesson of the story?", options: [ { id: "A", text: "Losing things can still lead to happy endings", correct: true }, { id: "B", text: "Don't work hard", correct: false }, { id: "C", text: "Hide gifts on clouds", correct: false } ] }
  ];

  const leftIndex = spreadStart;
  const rightIndex = spreadStart + 1;
  const [flipRightNow, setFlipRightNow] = useState(false);

  const typedCacheRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (pendingSide || isFlipping) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); handleNext(); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); handlePrev(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pendingSide, isFlipping]);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen?.({ navigationUI: 'hide' } as any);
      } else {
        await document.exitFullscreen();
      }
    } catch {
      const v = !isFullscreen;
      setIsFullscreen(v);
      document.body.classList.toggle('book-fullscreen-mode', v);
    }
  };

  const handleNext = () => {
    if (pendingSide || isFlipping) return;
    if (rightIndex >= storyPages.length) { setPendingSide('left'); return; }
    if (!rightUnlocked) setPendingSide('left'); else setPendingSide('right');
  };

  const handlePrev = () => {
    if (pendingSide || isFlipping) return;
    if (spreadStart > 0) {
      setIsFlipping(true);
      setTimeout(() => {
        setSpreadStart(prev => Math.max(0, prev - 2));
        setRightUnlocked(true);
        setIsFlipping(false);
      }, 500);
    }
  };

  const resetQuiz = () => { setSelectedAnswer(''); setHasAnswered(false); setIsCorrect(false); setFeedback(''); };

  const handleAnswerSubmit = () => {
    if (pendingSide == null) return;
    const pageIndex = pendingSide === 'left' ? leftIndex : rightIndex;
    const correct = storyPages[pageIndex].options.find(o => o.id === selectedAnswer)?.correct;
    setIsCorrect(!!correct);
    setHasAnswered(true);
    setFeedback(correct ? "Correct! You're ready to continue the story." : "That's not right. Try again!");
  };

  const tryAgain = () => resetQuiz();

  const continueAfterCorrect = () => {
    if (!isCorrect || pendingSide == null) return;
    if (pendingSide === 'left') {
      setRightUnlocked(true);
      setPendingSide(null);
      resetQuiz();
    } else {
      setPendingSide(null);
      resetQuiz();
      setFlipRightNow(true);
      setIsFlipping(true);
      setTimeout(() => {
        setSpreadStart(prev => prev + 2);
        setRightUnlocked(false);
        setIsFlipping(false);
        setFlipRightNow(false);
      }, 650);
    }
  };

  const toggleMute = () => setIsMuted(v => !v);
  const restartStory = () => {
    setSpreadStart(0);
    setRightUnlocked(false);
    setPendingSide(null);
    setIsStoryComplete(false);
    setFlipRightNow(false);
    resetQuiz();
  };

  const TypingText = memo(function TypingTextMemo({
    text, className, speed = 55, startDelay = 120, cacheKey, onDone,
  }: { text: string; className?: string; speed?: number; startDelay?: number; cacheKey: string; onDone?: () => void; }) {
    const alreadyTyped = typedCacheRef.current.has(cacheKey);
    const [out, setOut] = useState(alreadyTyped ? text : '');
    const [done, setDone] = useState(alreadyTyped);

    useEffect(() => {
      if (alreadyTyped) return;
      setOut(''); setDone(false);
      const start = setTimeout(() => {
        let i = 0;
        const id = setInterval(() => {
          i += 1;
          setOut(text.slice(0, i));
          if (i >= text.length) { clearInterval(id); setDone(true); typedCacheRef.current.add(cacheKey); onDone?.(); }
        }, speed);
      }, startDelay);
      return () => { clearTimeout(start); };
    }, [text, speed, startDelay, cacheKey, alreadyTyped, onDone]);

    return (
      <span className={`nc-typing ${className || ''}`}>
        {out}
        {!done && <span className="nc-caret" aria-hidden="true">|</span>}
      </span>
    );
  });

  const PageBlock = ({ page }: { page: Page }) => {
    const renderTyped = (fieldKey: string, text: string, className: string) => {
      const key = `${page.id}-${fieldKey}`;
      if (typedCacheRef.current.has(key)) return <span className={className}>{text}</span>;
      return <TypingText text={text} className={className} cacheKey={key} />;
    };

    return (
      <figure className="nc-figure">
        <div className="nc-imageFrame">
          <img src={page.illustration} alt="" className="nc-illustration" />
          <div className="nc-corner nc-corner--tl"><Gem size={14} /></div>
          <div className="nc-corner nc-corner--tr"><Sparkles size={14} /></div>
          <div className="nc-corner nc-corner--bl"><Sparkles size={14} /></div>
          <div className="nc-corner nc-corner--br"><Moon size={14} /></div>
        </div>

        <figcaption className="nc-caption">
          <h3 className="nc-title">{renderTyped('title', page.title, '')}</h3>
          <p className="nc-narration">{renderTyped('narration', page.narration, '')}</p>
          {!!page.character && <p className="nc-dialog">{renderTyped('character', page.character, '')}</p>}
        </figcaption>
      </figure>
    );
  };

  /* --------- INLINE FULLSCREEN CENTERING STYLES (override any CSS) --------- */
  const fsWrapStyle: React.CSSProperties | undefined = isFullscreen
    ? { position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', margin: 0, padding: 0, paddingTop: '3svh', zIndex: 3 }
    : undefined;

  const hardReset: React.CSSProperties | undefined = isFullscreen
    ? { position: 'relative', inset: 'auto', left: 'auto', top: 'auto', transform: 'none', margin: 0 }
    : undefined;

  const fsBookStyle: React.CSSProperties | undefined = isFullscreen
    ? { ...hardReset, aspectRatio: '3 / 2', width: 'min(1600px, 96vw)', height: 'auto', maxHeight: '92svh', display: 'block', transform: 'translateY(2svh)' }
    : undefined;

  return (
    <div
      ref={rootRef}
      className={`min-h-screen flex flex-col kid-theme ${isFullscreen ? 'book-fullscreen-mode' : ''} ${isBooting ? 'nc-booting' : ''}`}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700&family=Nunito:wght@500;700&display=swap');

        .kid-theme{ --kid-blue:#1A237E; --kid-sand:#E6D7C3; --kid-gold:#F4B400; --kid-ink:#2a2a2a;
          --kid-body:'Nunito',system-ui,-apple-system,Segoe UI,Roboto,sans-serif; --kid-display:'Baloo 2','Nunito',system-ui,sans-serif;
          --nc-sky-top:#EBF3FF; --nc-sky-mid:#DFEAFF; --nc-sky-deep:#CFDAFF; --nc-sky-vignette:rgba(26,35,126,0.18);
          position:relative; overflow-x:hidden;
          background:
            radial-gradient(1200px 600px at 45% -20%, rgba(244,180,0,0.08), transparent 70%),
            radial-gradient(900px 480px at 80% 0%, rgba(255,255,255,0.12), transparent 75%),
            linear-gradient(180deg, var(--nc-sky-top) 0%, var(--nc-sky-mid) 42%, var(--nc-sky-deep) 100%);
        }
        .kid-theme *{ font-family:var(--kid-body); }

        .nc-bg{ position:fixed; inset:0; z-index:0; background-position:center; background-repeat:no-repeat; background-size:cover; background-color:#0d2b55;
          opacity:.92; filter: blur(6px) brightness(1.02) saturate(1.05); transform: scale(1.06); pointer-events:none; }
        @media (max-width:820px){ .nc-bg{ background-size:contain; transform:none; } }

        .kid-theme::before{ content:""; position:fixed; inset:-10%; pointer-events:none;
          background:
            radial-gradient(80% 60% at 50% 55%, transparent 40%, rgba(0,0,0,0.05) 85%, rgba(0,0,0,0.08) 100%),
            radial-gradient(1200px 900px at 10% 10%, rgba(255,255,255,0.55), transparent 60%);
          mix-blend-mode:multiply; z-index:0;
        }

        @keyframes nc-sparkle{ 0%,100%{transform:translateY(0);opacity:.6} 50%{transform:translateY(-6px);opacity:.9} }
        .nc-spark-layer{ position:fixed; inset:0; pointer-events:none; z-index:0; background-image:
          radial-gradient(2px 2px at 20% 30%, rgba(255,255,255,0.8) 50%, transparent 51%),
          radial-gradient(2px 2px at 70% 20%, rgba(255,255,255,0.8) 50%, transparent 51%),
          radial-gradient(1.6px 1.6px at 85% 40%, rgba(255,255,255,0.7) 50%, transparent 51%),
          radial-gradient(1.8px 1.8px at 30% 70%, rgba(255,255,255,0.8) 50%, transparent 51%),
          radial-gradient(2.2px 2.2px at 60% 75%, rgba(255,255,255,0.75) 50%, transparent 51%),
          radial-gradient(1.6px 1.6px at 40% 15%, rgba(255,255,255,0.75) 50%, transparent 51%);
          animation:nc-sparkle 6.5s ease-in-out infinite; opacity:.5;
        }
        .nc-pearl-arc{ position:fixed; left:50%; transform:translateX(-50%); bottom:-10px; width:110vw; height:160px; z-index:0; pointer-events:none;
          background:
            radial-gradient(10px 10px at 5% 60%, rgba(255,255,255,0.9) 60%, transparent 62%),
            radial-gradient(10px 10px at 15% 75%, rgba(255,255,255,0.95) 60%, transparent 62%),
            radial-gradient(10px 10px at 25% 84%, rgba(255,255,255,0.92) 60%, transparent 62%),
            radial-gradient(10px 10px at 35% 89%, rgba(255,255,255,0.95) 60%, transparent 62%),
            radial-gradient(10px 10px at 45% 92%, rgba(255,255,255,0.92) 60%, transparent 62%),
            radial-gradient(10px 10px at 55% 92%, rgba(255,255,255,0.92) 60%, transparent 62%),
            radial-gradient(10px 10px at 65% 89%, rgba(255,255,255,0.95) 60%, transparent 62%),
            radial-gradient(10px 10px at 75% 84%, rgba(255,255,255,0.92) 60%, transparent 62%),
            radial-gradient(10px 10px at 85% 75%, rgba(255,255,255,0.95) 60%, transparent 62%),
            radial-gradient(10px 10px at 95% 60%, rgba(255,255,255,0.9) 60%, transparent 62%);
          filter: drop-shadow(0 6px 10px rgba(26,35,126,.12)); opacity:.85;
        }

        .kid-fore{ position:relative; z-index:2; }
        .popup-open-book-wrapper{ display:flex; justify-content:center; }
        .popup-book-container, .popup-flip-book-container{ margin-left:auto; margin-right:auto; }

        .kid-btn{ border-radius:999px; font-weight:700; }
        .kid-heading{ font-family:var(--kid-display); letter-spacing:.2px; }

        .nc-figure{ display:grid; grid-template-rows:auto 1fr; gap:12px; z-index:1; position:relative; }
        .nc-imageFrame{ position:relative; border-radius:18px; background:#fff; overflow:hidden;
          outline:3px solid rgba(255,255,255,0.6);
          box-shadow: inset 0 0 0 10px rgba(255,255,255,0.6), 0 8px 24px rgba(26,35,126,0.12), 0 3px 12px rgba(26,35,126,0.10);
          background-image:
            radial-gradient(circle at 10px 10px, rgba(255,255,255,0.9) 0 6px, transparent 7px),
            radial-gradient(circle at 32px 10px, rgba(255,255,255,0.9) 0 6px, transparent 7px),
            radial-gradient(circle at 54px 10px, rgba(255,255,255,0.9) 0 6px, transparent 7px);
          background-size:100% 20px; background-repeat:repeat-x;
        }
        .nc-illustration{ width:100%; height:clamp(220px,28vh,290px); object-fit:cover; display:block; }
        .nc-corner{ position:absolute; width:28px; height:28px; display:grid; place-items:center;
          background:rgba(255,255,255,0.7); border-radius:8px; color:var(--kid-blue); box-shadow:0 3px 8px rgba(26,35,126,.15); }
        .nc-corner--tl{ left:10px; top:10px } .nc-corner--tr{ right:10px; top:10px }
        .nc-corner--bl{ left:10px; bottom:10px } .nc-corner--br{ right:10px; bottom:10px }

        .nc-caption{ background:rgba(255,255,255,0.92); border:1px solid rgba(0,0,0,0.06); border-radius:16px; padding:14px 16px 16px; text-align:left;
          box-shadow:0 6px 18px rgba(26,35,126,0.08), 0 2px 8px rgba(26,35,126,0.06); min-height:140px; display:grid; gap:6px; }
        .nc-title{ font-family:var(--kid-display); font-size:1.15rem; color:var(--kid-blue); line-height:1.1; margin:0; }
        .nc-narration{ color:#374151; font-size:.98rem; line-height:1.35; margin:0; }
        .nc-dialog{ color:var(--kid-blue); font-style:italic; font-weight:700; margin:0; }

        .popup-page-left .story-content, .popup-page-right .story-content{ display:grid; grid-template-rows:auto 1fr; gap:14px; }
        .popup-page-nav-left, .popup-page-nav-right{ background:rgba(255,255,255,.85)!important; border:1px solid rgba(0,0,0,.06)!important; color:var(--kid-blue); }
        .popup-page-nav-left:hover, .popup-page-nav-right:hover{ background:#fff!important; box-shadow:0 10px 24px rgba(26,35,126,.15); }

        .popup-book-fold{ pointer-events:none; }

        .nc-typing{ white-space:pre-wrap; }
        .nc-caret{ margin-left:2px; animation:nc-blink 1s steps(1,end) infinite; }
        @keyframes nc-blink{ 0%,49%{opacity:1} 50%,100%{opacity:0} }

        .btn-solid-white{ background:#fff!important; color:var(--kid-blue)!important; border:1px solid rgba(0,0,0,0.06)!important; }
        .btn-solid-white:hover{ background:#fff!important; box-shadow:0 10px 24px rgba(26,35,126,.15); }

        .book-fullscreen-mode .kid-theme::before,
        .book-fullscreen-mode .nc-spark-layer,
        .book-fullscreen-mode .nc-pearl-arc,
        .book-fullscreen-mode .popup-book-surface,
        .book-fullscreen-mode .popup-book-fold { display:none; }

        /* Loader */
        .nc-loader{ position:fixed; inset:0; z-index:60; display:grid; place-items:center;
          background: radial-gradient(1200px 700px at 50% -10%, rgba(244,180,0,0.08), transparent 60%),
                      linear-gradient(180deg,#EBF3FF 0%,#DFEAFF 45%,#CFDAFF 100%);
          transition: opacity .4s ease, visibility .4s ease; }
        .nc-loader.hidden{ opacity:0; visibility:hidden; }
        .nc-load-card{ width:min(560px,92vw); border-radius:20px; padding:28px 28px 24px; background:#fff;
          box-shadow:0 30px 80px rgba(26,35,126,.20),0 14px 30px rgba(26,35,126,.14),0 6px 14px rgba(26,35,126,.10); text-align:center; }
        .nc-brand{ display:inline-grid; place-items:center; width:96px; height:96px; border-radius:50%;
          background: radial-gradient(#F4B400 0 45%, rgba(244,180,0,.45) 46% 100%); margin-inline:auto; box-shadow:0 8px 18px rgba(244,180,0,.35); position:relative; }
        .nc-beads{ position:absolute; inset:0; animation:nc-rotate 2.8s linear infinite; }
        .nc-beads::before,.nc-beads::after{ content:""; position:absolute; top:8px; left:50%; width:8px; height:8px; border-radius:50%; background:#fff; transform:translateX(-50%);
          box-shadow:0 24px 0 0 #fff,0 48px 0 0 #fff,0 72px 0 0 #fff,0 96px 0 0 rgba(255,255,255,.8); opacity:.9; }
        .nc-beads::after{ top:16px; opacity:.7; }
        @keyframes nc-rotate{ to{ transform:rotate(360deg);} }
        .nc-title-xl{ margin:14px 0 4px; font-family:var(--kid-display); font-weight:700; font-size:clamp(22px,2.4vw,28px); color:var(--kid-blue); letter-spacing:.2px; }
        .nc-subtle{ color:#475569; font-size:.95rem; }
        .nc-progress{ margin-top:18px; height:10px; width:100%; border-radius:999px; background:#eef2f7; overflow:hidden; position:relative; }
        .nc-progress>span{ position:absolute; inset:0; transform:translateX(-100%); animation:nc-indeterminate 1.2s cubic-bezier(.22,.61,.36,1) infinite;
          background:linear-gradient(90deg, rgba(34,197,94,0) 0%, rgba(34,197,94,.6) 40%, rgba(34,197,94,.95) 60%, rgba(34,197,94,0) 100%); }
        @keyframes nc-indeterminate{ 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }

        /* Entrance fade/zoom */
        .nc-enter{ opacity:0; transform:translateY(12px) scale(.985); }
        .nc-enter.nc-enter-active{ opacity:1; transform:translateY(0) scale(1); transition:opacity .45s ease, transform .45s ease; }

        /* Subtle lift */
        .popup-open-book-wrapper.nc-enter.nc-enter-active .popup-flip-book-container .popup-book-wrapper{
          animation:nc-lift 420ms cubic-bezier(.2,.9,.2,1) 60ms both;
        }
        @keyframes nc-lift{ from{ transform:translateY(6px) scale(.992);} to{ transform:translateY(0) scale(1);} }

        /* REAL page opening from spine (no overlay) */
        .popup-book-wrapper.nc-opening{ will-change: transform; }
        .popup-book-wrapper.nc-opening .popup-page-left,
        .popup-book-wrapper.nc-opening .popup-page-right{
          overflow:hidden;
        }
        .popup-book-wrapper.nc-opening .popup-page-left{
          clip-path: inset(0 50% 0 0 round 12px);
          animation: nc-open-left 950ms cubic-bezier(.19,1,.22,1) both;
        }
        .popup-book-wrapper.nc-opening .popup-page-right{
          clip-path: inset(0 0 0 50% round 12px);
          animation: nc-open-right 950ms cubic-bezier(.19,1,.22,1) both;
          animation-delay: 20ms;
        }
        @keyframes nc-open-left{
          0%{ clip-path: inset(0 50% 0 0 round 12px); }
          55%{ clip-path: inset(0 6% 0 0 round 12px); }
          100%{ clip-path: inset(0 0 0 0 round 12px); }
        }
        @keyframes nc-open-right{
          0%{ clip-path: inset(0 0 0 50% round 12px); }
          55%{ clip-path: inset(0 0 0 6% round 12px); }
          100%{ clip-path: inset(0 0 0 0 round 12px); }
        }
      `}</style>

      {/* Background layers */}
      <div className="nc-bg" style={{ backgroundImage: `url(${backgroundImage})` }} aria-hidden="true" />
      <div className="nc-spark-layer" />
      <div className="nc-pearl-arc" />

      {/* Loader */}
      <div className={`nc-loader ${isBooting ? '' : 'hidden'}`} aria-live="polite" aria-busy={isBooting}>
        <div className="nc-load-card">
          <div className="nc-brand"><div className="nc-beads" /></div>
          <div className="nc-title-xl">The Necklace and the Comb</div>
          <div className="nc-subtle">Setting the stage for a starry tale…</div>
          <div className="nc-progress" role="progressbar" aria-valuetext="Loading"><span /></div>
        </div>
      </div>

      <div className="kid-fore">
        {!isFullscreen && <Header variant="student" />}

        <main className={`flex-grow flex flex-col items-center justify-center ${isFullscreen ? 'p-0' : 'p-4 md:p-6'}`}>
          {!isFullscreen && (
            <div className="w-full max-w-7xl">
              <div className="flex justify-between items-center mb-6">
                <Link href="/student/twodanimation">
                  <Button variant="outline" className="kid-btn btn-solid-white flex items-center gap-2">
                    <ChevronLeft size={16} /> Back to Stories
                  </Button>
                </Link>
                <div className="text-center">
                  <h1 className="kid-heading text-2xl font-bold">The Necklace and the Comb</h1>
                  <div className="text-sm">
                    Page {Math.min(spreadStart + 1, storyPages.length)}
                    {rightUnlocked && rightIndex < storyPages.length ? `–${rightIndex + 1}` : ''} of {storyPages.length}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={toggleFullscreen} className="kid-btn">
                    {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                  </Button>
                  <Button onClick={toggleMute} className="kid-btn">
                    {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Book */}
          <div
            ref={bookRef}
            className={`popup-open-book-wrapper relative mx-auto ${entered ? 'nc-enter nc-enter-active' : 'nc-enter'}`}
            style={fsWrapStyle}
          >
            <div className="popup-book-container" style={hardReset}>
              <div
                className="popup-flip-book-container"
                key={isFullscreen ? 'fs' : 'norm'}
                style={fsBookStyle}
              >
                <div className={`popup-book-wrapper ${playOpen ? 'nc-opening' : ''}`}>
                  <div className="popup-book-fold" />

                  {/* Left page */}
                  <div className="popup-page-left">
                    <div className="story-content p-6">
                      {storyPages[leftIndex] && <PageBlock page={storyPages[leftIndex]} />}
                      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-xs">
                        {leftIndex + 1}
                      </div>
                    </div>
                  </div>

                  {/* Right page */}
                  <div className={`popup-page-right ${flipRightNow ? 'flipped' : ''}`}>
                    <div className="story-content p-6 text-center">
                      {rightUnlocked && storyPages[rightIndex] ? (
                        <>
                          <PageBlock page={storyPages[rightIndex]} />
                          <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-xs">
                            {rightIndex + 1}
                          </div>
                        </>
                      ) : (
                        <div className="h-full flex items-center justify-center opacity-40 text-sm italic">
                          <Sparkles className="mr-2" size={16} /> unlock the next page by answering the question
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Nav buttons on top so they remain clickable */}
                  <button
                    className="popup-page-nav-left"
                    onClick={handlePrev}
                    disabled={isFlipping || spreadStart === 0}
                    aria-label="Previous"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button
                    className="popup-page-nav-right"
                    onClick={handleNext}
                    disabled={isFlipping || pendingSide !== null}
                    aria-label="Next"
                  >
                    <ChevronRight size={24} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Question dialog */}
          <Dialog open={pendingSide !== null} onOpenChange={(open) => !open && setPendingSide(null)}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="kid-heading">Question</DialogTitle>
                <DialogDescription>
                  {pendingSide === 'left'
                    ? storyPages[leftIndex]?.question
                    : storyPages[rightIndex]?.question}
                </DialogDescription>
              </DialogHeader>

              <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
                {(pendingSide === 'left'
                  ? storyPages[leftIndex]?.options
                  : storyPages[rightIndex]?.options
                )?.map((opt) => (
                  <div key={opt.id} className="flex items-center space-x-2 my-2">
                    <RadioGroupItem value={opt.id} id={`opt-${opt.id}`} />
                    <Label htmlFor={`opt-${opt.id}`}>{opt.text}</Label>
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
                  isCorrect ? (
                    <Button onClick={continueAfterCorrect} className="kid-btn bg-green-600 hover:bg-green-700 text-white">
                      <Check size={16} className="mr-2" /> Continue
                    </Button>
                  ) : (
                    <Button onClick={tryAgain} className="kid-btn bg-blue-600 hover:bg-blue-700 text-white">
                      <RefreshCw size={16} className="mr-2" /> Try Again
                    </Button>
                  )
                ) : (
                  <Button onClick={handleAnswerSubmit} disabled={!selectedAnswer} className="kid-btn bg-blue-700 hover:bg-blue-600 text-white">
                    Submit
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Story complete */}
          <Dialog open={isStoryComplete} onOpenChange={setIsStoryComplete}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="kid-heading">Story Complete!</DialogTitle>
                <DialogDescription>
                  You’ve reached the end of "The Necklace and the Comb".
                </DialogDescription>
              </DialogHeader>
              <div className="flex justify-between mt-4">
                <Button onClick={restartStory} className="kid-btn bg-blue-700 hover:bg-blue-600 text-white">
                  <RefreshCw size={16} className="mr-2" /> Read Again
                </Button>
                <Link href="/student/twodanimation">
                  <Button className="kid-btn bg-blue-700 hover:bg-blue-600 text-white">
                    <Home size={16} className="mr-2" /> Back to Stories
                  </Button>
                </Link>
              </div>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </div>
  );
}
