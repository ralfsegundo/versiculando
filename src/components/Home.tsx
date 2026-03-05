import { useState, useEffect, useRef } from 'react';
import { BIBLE_BOOKS, GROUP_COLORS, BEGINNER_PATH } from '../constants';
import { Book, Library, Search, BookOpen, Compass, ListOrdered, Sun, CheckCircle2, ArrowRight, Info, MapPin, Lock, Trophy, Download, X, Navigation, Star, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useGamification } from '../services/gamification';
import { supabase } from '../lib/supabase';
import confetti from 'canvas-confetti';

// Passos 1-6 = Trilha do Discípulo (iniciante), 7-12 = Jornada do Sábio (avançado)
const DISCIPLE_PATH_LENGTH = 6;

interface HomeProps {
  onSelectBook: (bookId: string) => void;
  viewMode: 'canonical' | 'beginners';
  onViewModeChange: (mode: 'canonical' | 'beginners') => void;
  welcomeMessage?: string | null;
  onDismissWelcome?: () => void;
}

// PWA Install Hook
function usePWAInstall() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [dismissed, setDismissed] = useState(() => 
    localStorage.getItem('pwa_banner_dismissed') === 'true'
  );

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setIsInstallable(false);
    }
  };

  const dismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa_banner_dismissed', 'true');
  };

  return { isInstallable, isInstalled, install, dismiss, dismissed };
}

export default function Home({ onSelectBook, viewMode, onViewModeChange, welcomeMessage, onDismissWelcome }: HomeProps) {
  const [userId, setUserId] = useState<string>('anonymous');
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUserId(session.user.id);
    });
  }, []);
  const [searchTerm, setSearchTerm] = useState('');
  const { profile, accessDailyVerse, addPoints, showFloatingPoints } = useGamification();
  const [dailyVerseRead, setDailyVerseRead] = useState<boolean>(() => {
    // Only "read" if it was already read TODAY
    const lastRead = localStorage.getItem('daily_verse_last_read');
    if (!lastRead) return false;
    const today = new Date().toDateString();
    return new Date(lastRead).toDateString() === today;
  });
  const [animatingBooks, setAnimatingBooks] = useState<string[]>([]);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
  const [completedStepModal, setCompletedStepModal] = useState<number | null>(null);
  const [showGraduationModal, setShowGraduationModal] = useState(false);
  const [showDeepJourney, setShowDeepJourney] = useState(() =>
    localStorage.getItem(`${userId}_sage_journey_unlocked`) === 'true'
  );
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { isInstallable, install, dismiss, dismissed } = usePWAInstall();

  const handleReadDailyVerse = () => {
    if (!dailyVerseRead) {
      accessDailyVerse(); // internally calls addPoints(15) and checks Madrugador badge
      showFloatingPoints(15, 'free');
      localStorage.setItem('daily_verse_last_read', new Date().toISOString());
      setDailyVerseRead(true);
    }
  };

  // Check for newly visited books to animate
  useEffect(() => {
    const newlyVisited = profile.visitedBooks?.filter(
      id => !profile.completedBooks.includes(id) && !localStorage.getItem(`${userId}_animated_${id}`)
    ) || [];
    
    if (newlyVisited.length > 0) {
      setAnimatingBooks(newlyVisited);
      newlyVisited.forEach(id => localStorage.setItem(`${userId}_animated_${id}`, 'true'));
      
      const timer = setTimeout(() => {
        setAnimatingBooks([]);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [profile.visitedBooks, profile.completedBooks]);

  // Check for newly completed steps
  useEffect(() => {
    if (viewMode !== 'beginners') return;
    
    let allStepsCompleted = true;

    BEGINNER_PATH.forEach((step, index) => {
      const isCompleted = step.books.every(id => profile.completedBooks.includes(id));
      const wasCompleted = localStorage.getItem(`${userId}_step_completed_${index}`);
      
      if (!isCompleted) {
        allStepsCompleted = false;
      }
      
      if (isCompleted && !wasCompleted) {
        localStorage.setItem(`${userId}_step_completed_${index}`, 'true');

        // Passo 6 (index 5) = conclusão da Trilha do Discípulo → modal de graduação
        if (index === DISCIPLE_PATH_LENGTH - 1) {
          const wasGraduated = localStorage.getItem(`${userId}_disciple_trail_graduated`);
          if (!wasGraduated) {
            localStorage.setItem(`${userId}_disciple_trail_graduated`, 'true');
            addPoints(500, 'Concluiu a Trilha do Discípulo!', 'bonus');
            showFloatingPoints(500, 'bonus_step');
            setTimeout(() => {
              confetti({ particleCount: 200, spread: 100, origin: { y: 0.5 }, colors: ['#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#ef4444'] });
              setTimeout(() => confetti({ particleCount: 150, spread: 120, origin: { y: 0.6 }, angle: 60, colors: ['#f59e0b', '#fcd34d'] }), 400);
              setTimeout(() => confetti({ particleCount: 150, spread: 120, origin: { y: 0.6 }, angle: 120, colors: ['#10b981', '#34d399'] }), 700);
              setShowGraduationModal(true);
            }, 600);
            return;
          }
        }

        setCompletedStepModal(index);
        addPoints(200, `Concluiu o Passo ${index + 1} da trilha`, 'bonus');
        showFloatingPoints(200, 'bonus_step');
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#f59e0b', '#10b981', '#3b82f6', '#ef4444']
        });
      }
    });

    // Check for entire trail completion
    const wasTrailCompleted = localStorage.getItem(`${userId}_trail_completed`);
    if (allStepsCompleted && !wasTrailCompleted) {
      localStorage.setItem(`${userId}_trail_completed`, 'true');
      addPoints(500, 'Concluiu a Trilha do Discípulo', 'bonus');
      setTimeout(() => {
        showFloatingPoints(500, 'bonus_trail');
      }, 1500); // Show shortly after step bonus
    }
  }, [profile.completedBooks, viewMode, addPoints, showFloatingPoints]);

  const filteredBooks = BIBLE_BOOKS.filter(book =>
    book.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    book.group.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const vtBooks = filteredBooks.filter(b => b.testament === 'VT');
  const ntBooks = filteredBooks.filter(b => b.testament === 'NT');

  const getBookState = (bookId: string) => {
    const isDiscipleCompleted = profile.discipleCompletedBooks?.includes(bookId);
    if (profile.completedBooks.includes(bookId)) return isDiscipleCompleted ? 'disciple_completed' : 'completed';
    if (profile.visitedBooks?.includes(bookId)) return 'visited';
    return 'not_visited';
  };

  const getGroupStats = (groupName: string) => {
    const groupBooks = BIBLE_BOOKS.filter(b => b.group === groupName);
    const total = groupBooks.length;
    const completed = groupBooks.filter(b => profile.completedBooks.includes(b.id)).length;
    const visited = groupBooks.filter(b => profile.visitedBooks?.includes(b.id)).length;
    return { total, completed, visited };
  };

  const handleTooltipOpen = (groupName: string) => {
    if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
    setActiveTooltip(groupName);
  };

  const handleTooltipClose = () => {
    tooltipTimeoutRef.current = setTimeout(() => {
      setActiveTooltip(null);
    }, 300);
  };

  const renderGroupHeader = (groupName: string) => {
    const stats = getGroupStats(groupName);
    const isCompleted = stats.completed === stats.total;
    const isTooltipActive = activeTooltip === groupName;

    return (
      <div 
        className="relative flex items-center justify-between mb-4 mt-8 first:mt-0"
        onMouseEnter={() => handleTooltipOpen(groupName)}
        onMouseLeave={handleTooltipClose}
        onTouchStart={() => handleTooltipOpen(groupName)}
        onTouchEnd={handleTooltipClose}
      >
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-bold text-stone-800 uppercase tracking-wider">{groupName}</h3>
          <Info size={14} className="text-stone-400 cursor-help" />
        </div>
        
        <div className={`text-sm font-bold flex items-center gap-1 ${isCompleted ? 'text-amber-500' : 'text-stone-400'}`}>
          {stats.completed}/{stats.total}
          {isCompleted && <CheckCircle2 size={16} />}
        </div>

        <AnimatePresence>
          {isTooltipActive && (
            <motion.div 
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="absolute bottom-full left-0 mb-2 w-64 bg-stone-900 text-white p-4 rounded-xl shadow-xl z-50 pointer-events-none"
            >
              <h4 className="font-bold mb-2 text-amber-400">{groupName}</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-stone-400">Total de livros:</span>
                  <span className="font-bold">{stats.total}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Visitados:</span>
                  <span className="font-bold">{stats.visited}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Concluídos:</span>
                  <span className="font-bold text-emerald-400">{stats.completed}</span>
                </div>
              </div>
              <div className="absolute -bottom-2 left-6 w-4 h-4 bg-stone-900 rotate-45"></div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  const renderBookGrid = (books: typeof BIBLE_BOOKS, showHeaders = false) => {
    // Group books if headers are requested
    const groupedBooks = showHeaders 
      ? books.reduce((acc, book) => {
          if (!acc[book.group]) acc[book.group] = [];
          acc[book.group].push(book);
          return acc;
        }, {} as Record<string, typeof BIBLE_BOOKS>)
      : { 'All': books };

    return (
      <div className="space-y-8">
        {Object.entries(groupedBooks).map(([groupName, groupBooks]) => (
          <div key={groupName}>
            {showHeaders && groupName !== 'All' && renderGroupHeader(groupName)}
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {groupBooks.map((book) => {
                const state = getBookState(book.id);
                const isAnimating = animatingBooks.includes(book.id);
                const baseColorClass = GROUP_COLORS[book.group] || 'bg-gray-100';
                
                let cardClass = '';
                if (state === 'not_visited') {
                  cardClass = 'bg-transparent border-2 border-dashed border-stone-200 opacity-75 hover:opacity-100';
                } else if (state === 'visited') {
                  cardClass = `${baseColorClass} relative`;
                } else if (state === 'completed') {
                  cardClass = `${baseColorClass} ring-2 ring-amber-400 ring-offset-2 shadow-amber-200/50 relative overflow-hidden`;
                } else if (state === 'disciple_completed') {
                  cardClass = `${baseColorClass} ring-2 ring-offset-2 shadow-lg relative overflow-hidden ring-orange-500 shadow-orange-200/60`;
                }

                return (
                  <motion.button
                    whileHover={{ scale: 1.03 }}
                    whileTap={{ scale: 0.97 }}
                    key={book.id}
                    onClick={() => onSelectBook(book.id)}
                    initial={isAnimating ? { backgroundColor: '#f5f5f4', opacity: 0.7 } : false}
                    animate={isAnimating ? { 
                      backgroundColor: state === 'visited' ? 'var(--tw-colors-amber-100)' : '#f5f5f4',
                      opacity: 1 
                    } : false}
                    transition={{ duration: 0.8 }}
                    className={`p-3 rounded-xl flex flex-col items-center justify-center text-center transition-all shadow-sm hover:shadow-md active:scale-95 ${cardClass}`}
                  >
                    {state === 'visited' && (
                      <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                    )}
                    {state === 'completed' && (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-tr from-amber-400/0 via-amber-400/10 to-amber-400/0 animate-pulse"></div>
                        <div className="absolute top-1.5 right-1.5 text-amber-500">
                          <CheckCircle2 size={14} className="fill-amber-100" />
                        </div>
                      </>
                    )}
                    {state === 'disciple_completed' && (
                      <>
                        <div className="absolute inset-0 bg-gradient-to-tr from-orange-400/0 via-orange-400/15 to-orange-400/0"></div>
                        <div className="absolute top-1.5 right-1.5 text-orange-500">
                          <Navigation size={12} className="fill-orange-100" />
                        </div>
                        <div className="absolute top-1.5 left-1.5">
                          <div className="w-1.5 h-1.5 bg-orange-400 rounded-full animate-ping"></div>
                        </div>
                      </>
                    )}
                    <span className={`text-[9px] sm:text-[10px] font-bold uppercase tracking-wider mb-1 ${state === 'not_visited' ? 'text-stone-400' : 'opacity-70'} hidden sm:block`}>
                      {book.group}
                    </span>
                    <span className={`font-serif text-sm font-bold leading-tight ${state === 'not_visited' ? 'text-stone-600' : ''}`}>
                      {book.name}
                    </span>
                    <span className={`text-[10px] mt-1.5 font-medium ${state === 'not_visited' ? 'text-stone-400' : 'opacity-75'}`}>
                      {book.chapters} cap.
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderBeginnerPath = () => {
    const discipleSteps = BEGINNER_PATH.slice(0, DISCIPLE_PATH_LENGTH);
    const deepSteps = BEGINNER_PATH.slice(DISCIPLE_PATH_LENGTH);

    const allDiscipleBookIds = discipleSteps.flatMap(step => step.books);
    const allBeginnerBookIds = BEGINNER_PATH.flatMap(step => step.books);
    const completedBeginnerBooks = allBeginnerBookIds.filter(id => profile.completedBooks.includes(id));
    const completedDiscipleBooks = allDiscipleBookIds.filter(id => profile.completedBooks.includes(id));
    const visitedBeginnerBooks = allBeginnerBookIds.filter(id => profile.visitedBooks?.includes(id));
    
    const isFirstTime = visitedBeginnerBooks.length === 0 && completedBeginnerBooks.length === 0;
    const isDiscipleCompleted = discipleSteps.every(step => step.books.every(id => profile.completedBooks.includes(id)));
    
    let currentStepIndex = 0;
    let currentBookId = BEGINNER_PATH[0].books[0];
    
    for (let i = 0; i < BEGINNER_PATH.length; i++) {
      const step = BEGINNER_PATH[i];
      const uncompletedBook = step.books.find(id => !profile.completedBooks.includes(id));
      if (uncompletedBook) {
        currentStepIndex = i;
        currentBookId = uncompletedBook;
        break;
      }
    }

    const currentBook = BIBLE_BOOKS.find(b => b.id === currentBookId);
    const totalBeginnerBooksCount = allBeginnerBookIds.length;
    const progressPercentage = Math.round((completedBeginnerBooks.length / totalBeginnerBooksCount) * 100);
    const discipleProgressPercentage = Math.round((completedDiscipleBooks.length / allDiscipleBookIds.length) * 100);

    const renderStepBlock = (step: typeof BEGINNER_PATH[0], index: number, globalIndex: number) => {
      const isUnlocked = globalIndex <= currentStepIndex;
      const isCompleted = step.books.every(id => profile.completedBooks.includes(id));
      const stepCompletedBooks = step.books.filter(id => profile.completedBooks.includes(id)).length;
      const totalStepBooks = step.books.length;
      const estimatedWeeks = Math.max(1, Math.ceil((step.books.reduce((sum, id) => sum + (BIBLE_BOOKS.find(b => b.id === id)?.chapters || 0), 0) * 3) / (15 * 7)));

      return (
        <div key={globalIndex} className={`relative z-10 md:pl-16 ${!isUnlocked ? 'opacity-75' : ''}`}>
          <div className={`hidden md:flex absolute left-4 -translate-x-1/2 top-0 w-8 h-8 rounded-full items-center justify-center font-bold text-sm border-4 border-[#fdfbf7] transition-colors ${isCompleted ? 'bg-amber-400 text-white' : isUnlocked ? 'bg-stone-900 text-white' : 'bg-stone-300 text-stone-500'}`}>
            {isCompleted ? <CheckCircle2 size={16} /> : globalIndex + 1}
          </div>
          
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`md:hidden w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${isCompleted ? 'bg-amber-400 text-white' : isUnlocked ? 'bg-stone-900 text-white' : 'bg-stone-300 text-stone-500'}`}>
                {isCompleted ? <CheckCircle2 size={12} /> : globalIndex + 1}
              </span>
              <h2 className={`text-base font-serif font-bold flex-1 leading-tight ${isCompleted ? 'text-amber-600' : isUnlocked ? 'text-stone-900' : 'text-stone-400'}`}>
                {step.title}
              </h2>
              <span className={`text-xs font-bold shrink-0 ${isCompleted ? 'text-amber-500' : isUnlocked ? 'text-stone-400' : 'invisible'}`}>
                {isUnlocked ? `${stepCompletedBooks}/${totalStepBooks}` : ''}{isCompleted && ' ✓'}
              </span>
            </div>
            <p className={`text-sm md:ml-0 ml-8 leading-snug line-clamp-2 ${isUnlocked ? 'text-stone-500' : 'text-stone-400 italic'}`}>{step.description}</p>
            <p className="text-[11px] text-stone-400 md:ml-0 ml-8 mt-0.5">
              ⏱ ~{estimatedWeeks} {estimatedWeeks === 1 ? 'semana' : 'semanas'}
            </p>
          </div>
          
          <div className="md:ml-0 ml-11 relative">
            {!isUnlocked && (
              <div className="absolute inset-0 z-20 bg-[#fdfbf7]/60 backdrop-blur-[1px] flex flex-col items-center justify-center rounded-2xl border border-stone-200/50">
                <div className="bg-white p-3 rounded-full shadow-sm mb-2 text-stone-400">
                  <Lock size={24} />
                </div>
                <p className="text-sm font-bold text-stone-500">Conclua o Passo {globalIndex} para desbloquear</p>
              </div>
            )}
            
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
              {step.books.map(bookId => {
                const book = BIBLE_BOOKS.find(b => b.id === bookId)!;
                const isBookCompleted = profile.completedBooks.includes(bookId);
                const isBookInProgress = profile.visitedBooks?.includes(bookId) && !isBookCompleted;
                const isBookNotStarted = !isBookCompleted && !isBookInProgress;
                
                let cardClass = '';
                if (isBookNotStarted) cardClass = 'bg-white border-2 border-dashed border-stone-200';
                else if (isBookInProgress) cardClass = 'bg-orange-50 border-2 border-orange-400 relative';
                else if (isBookCompleted) cardClass = 'bg-emerald-50/50 border-2 border-emerald-400 relative shadow-[0_0_15px_rgba(52,211,153,0.15)]';

                return (
                  <button
                    key={book.id}
                    onClick={() => isUnlocked && onSelectBook(book.id)}
                    disabled={!isUnlocked}
                    className={`p-3 rounded-xl flex flex-col items-center justify-center text-center transition-all ${cardClass} ${isUnlocked ? 'hover:shadow-md active:scale-95' : ''}`}
                  >
                    {isBookInProgress && (
                      <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-sm uppercase tracking-wider hidden sm:block">
                        Em progresso
                      </div>
                    )}
                    {isBookCompleted && (
                      <div className="absolute top-1.5 right-1.5 text-amber-500">
                        <CheckCircle2 size={14} className="fill-amber-100" />
                      </div>
                    )}
                    <span className={`text-[9px] font-bold uppercase tracking-wider mb-1 ${isBookNotStarted ? 'text-stone-400' : isBookInProgress ? 'text-orange-700/70' : 'text-emerald-700/70'} hidden sm:block`}>
                      {book.group}
                    </span>
                    <span className={`font-serif text-sm font-bold leading-tight ${isBookNotStarted ? 'text-stone-600' : isBookInProgress ? 'text-orange-900' : 'text-emerald-900'}`}>
                      {book.name}
                    </span>
                    <span className={`text-[10px] mt-1.5 font-medium ${isBookNotStarted ? 'text-stone-400' : isBookInProgress ? 'text-orange-700/70' : 'text-emerald-700/70'}`}>
                      {book.chapters} cap.
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="mt-8">
        {/* Top Action Card */}
        {isFirstTime ? (
          <div className="bg-gradient-to-br from-amber-100 to-orange-100 rounded-3xl p-6 md:p-8 mb-8 shadow-sm border border-amber-200 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <Compass size={120} />
            </div>
            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 bg-amber-500 text-white rounded-full flex items-center justify-center mb-4 shadow-md">
                <Compass size={32} />
              </div>
              <h2 className="text-2xl md:text-3xl font-serif font-bold text-amber-900 mb-2">Sua jornada começa aqui</h2>
              <p className="text-amber-800 mb-6 max-w-md">Siga o caminho recomendado pela tradição católica e leia a Bíblia do jeito certo.</p>
              <button 
                onClick={() => onSelectBook(BEGINNER_PATH[0].books[0])}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-full shadow-md hover:shadow-lg transition-all w-full sm:w-auto text-lg"
              >
                Começar Agora →
              </button>
            </div>
          </div>
        ) : currentBook ? (
          <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 mb-8 shadow-sm border border-amber-200 relative overflow-hidden">
            <div className="flex items-center gap-3 relative z-10">
              {/* Icon */}
              <div className="w-11 h-11 bg-white rounded-xl shadow-sm border border-amber-100 flex items-center justify-center text-amber-500 shrink-0">
                <BookOpen size={20} />
              </div>
              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 text-amber-700 font-bold text-[10px] uppercase tracking-wider mb-0.5">
                  <MapPin size={10} /> Você está aqui
                </div>
                <h2 className="font-serif font-bold text-stone-900 text-base leading-tight truncate">{currentBook.name}</h2>
                <p className="text-stone-500 text-xs mt-0.5">
                  {currentBook.chapters} cap. · ~{currentBook.chapters * 3} min
                </p>
              </div>
              {/* CTA */}
              <button
                onClick={() => onSelectBook(currentBook.id)}
                className="bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold py-2.5 px-4 rounded-xl shadow-sm transition-all shrink-0 flex items-center gap-1.5 text-sm"
              >
                Continuar <ArrowRight size={15} />
              </button>
            </div>
          </div>
        ) : null}

        {/* Overall Progress Bar */}
        <div className="mb-8 pr-12">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-medium text-stone-500">
              {isDiscipleCompleted && showDeepJourney
                ? <>Jornada do Sábio · <strong className="text-stone-700">{progressPercentage}%</strong></>
                : <>Passo {Math.min(currentStepIndex + 1, DISCIPLE_PATH_LENGTH)}/{DISCIPLE_PATH_LENGTH} · <strong className="text-stone-700">{discipleProgressPercentage}% concluído</strong></>
              }
            </span>
          </div>
          <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${isDiscipleCompleted && showDeepJourney ? progressPercentage : discipleProgressPercentage}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className={`h-full rounded-full ${isDiscipleCompleted && showDeepJourney ? 'bg-purple-500' : 'bg-amber-400'}`}
            />
          </div>
        </div>

        {/* ── TRILHA DO DISCÍPULO (Passos 1-6) ── */}
        <div className="mb-5 flex items-center gap-2.5">
          <div className="w-7 h-7 bg-amber-400 rounded-lg flex items-center justify-center shrink-0">
            <MapPin size={13} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-stone-900 leading-tight">Trilha do Discípulo</h2>
            <p className="text-[11px] text-stone-400">6 passos · Para quem está começando</p>
          </div>
          {isDiscipleCompleted && (
            <div className="ml-auto flex items-center gap-1 bg-amber-100 text-amber-700 text-[11px] font-bold px-2.5 py-1 rounded-full">
              <Trophy size={11} /> Concluída!
            </div>
          )}
        </div>

        <div className="space-y-8 relative mb-12">
          <div className="absolute left-4 md:left-8 top-8 bottom-8 w-0.5 bg-stone-200 hidden md:block"></div>
          {discipleSteps.map((step, index) => renderStepBlock(step, index, index))}
        </div>

        {/* ── DIVISOR / TEASER / JORNADA PROFUNDA ── */}
        {!isDiscipleCompleted && (
          // Teaser card — Trilha do Discípulo não concluída ainda
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="relative rounded-3xl overflow-hidden border border-purple-200 bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 p-6 md:p-8 text-center"
          >
            {/* decorative stars */}
            <div className="absolute top-4 left-6 text-purple-200"><Star size={18} fill="currentColor" /></div>
            <div className="absolute top-8 right-10 text-indigo-200"><Star size={12} fill="currentColor" /></div>
            <div className="absolute bottom-6 left-12 text-blue-200"><Star size={10} fill="currentColor" /></div>
            <div className="absolute bottom-4 right-6 text-purple-200"><Star size={16} fill="currentColor" /></div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-purple-200">
                <Lock size={22} className="text-white" />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-purple-500 mb-2">Aguardando você</p>
              <h3 className="text-2xl font-serif font-bold text-stone-800 mb-2">Jornada do Sábio</h3>
              <p className="text-stone-500 text-sm max-w-sm mb-4">
                6 novos passos pelos profetas, a história de Israel e o Apocalipse. Disponível ao concluir a Trilha do Discípulo.
              </p>
              <div className="flex items-center gap-2 text-purple-400 text-sm font-medium">
                <ChevronDown size={16} className="animate-bounce" />
                Conclua o Passo 6 para desbloquear
              </div>
            </div>
          </motion.div>
        )}

        {isDiscipleCompleted && showDeepJourney && (
          <>
            {/* Divisor de trilhas */}
            <div className="relative flex items-center gap-4 my-4">
              <div className="flex-1 h-px bg-gradient-to-r from-amber-200 to-purple-300"></div>
              <div className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-md whitespace-nowrap">
                <Star size={12} fill="white" /> Jornada do Sábio
              </div>
              <div className="flex-1 h-px bg-gradient-to-l from-indigo-200 to-purple-300"></div>
            </div>

            <p className="text-center text-sm text-stone-500 mb-10">
              Você se formou na Trilha do Discípulo. Agora é hora de mergulhar fundo na Palavra.
            </p>

            <div className="space-y-8 relative">
              <div className="absolute left-4 md:left-8 top-8 bottom-8 w-0.5 bg-gradient-to-b from-purple-200 to-indigo-200 hidden md:block"></div>
              {deepSteps.map((step, index) => renderStepBlock(step, index, index + DISCIPLE_PATH_LENGTH))}
            </div>
          </>
        )}

        {isDiscipleCompleted && !showDeepJourney && (
          // Trilha do Discípulo concluída mas usuário ainda não aceitou a Jornada do Sábio
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative rounded-3xl overflow-hidden border-2 border-purple-300 bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 p-6 md:p-8 text-center shadow-lg shadow-purple-100"
          >
            <div className="absolute top-4 left-6 text-purple-300"><Star size={18} fill="currentColor" /></div>
            <div className="absolute top-6 right-8 text-indigo-200"><Star size={14} fill="currentColor" /></div>
            <div className="absolute bottom-5 left-10 text-blue-200"><Star size={11} fill="currentColor" /></div>
            <div className="absolute bottom-4 right-5 text-purple-200"><Star size={16} fill="currentColor" /></div>

            <div className="relative z-10 flex flex-col items-center">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-purple-200 animate-pulse">
                <Star size={28} className="text-white" fill="white" />
              </div>
              <p className="text-xs font-bold uppercase tracking-widest text-purple-500 mb-2">Desbloqueada!</p>
              <h3 className="text-2xl md:text-3xl font-serif font-bold text-stone-900 mb-3">Jornada do Sábio</h3>
              <p className="text-stone-600 text-sm max-w-sm mb-6">
                Profetas, a história épica de Israel, os deuterocanônicos, Paulo completo e o Apocalipse. 6 novos passos para quem quer dominar a Bíblia inteira.
              </p>
              <button
                onClick={() => {
                  localStorage.setItem(`${userId}_sage_journey_unlocked`, 'true');
                  setShowDeepJourney(true);
                  confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#a855f7', '#6366f1', '#3b82f6'] });
                }}
                className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-3 px-8 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 text-lg"
              >
                Iniciar Jornada do Sábio <ArrowRight size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-stone-900 font-sans pb-28">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 md:pt-8">
        <header className="mb-4 md:mb-8 flex items-center justify-center gap-2.5 md:flex-col pr-10 md:pr-0">
          <div className="w-8 h-8 md:w-9 md:h-9 bg-stone-900 text-[#fdfbf7] rounded-xl flex items-center justify-center shadow-md shrink-0">
            <Library size={16} />
          </div>
          <h1 className="text-lg md:text-4xl font-serif font-bold tracking-tight text-stone-900">
            Versiculando
          </h1>
        </header>

        {/* Banner de boas-vindas personalizado (pós-onboarding) */}
        <AnimatePresence>
          {welcomeMessage && (
            <motion.div
              initial={{ opacity: 0, y: -16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -16, scale: 0.98 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="max-w-xl mx-auto mb-6"
            >
              <div className="bg-gradient-to-br from-stone-900 to-stone-800 text-white rounded-2xl p-5 flex items-start gap-4 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400/10 rounded-full -translate-y-1/2 translate-x-1/2" />
                <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                  <span className="text-lg">👋</span>
                </div>
                <div className="flex-1 relative z-10">
                  <p className="font-bold text-sm text-amber-400 mb-0.5 uppercase tracking-wider">Bem-vindo!</p>
                  <p className="text-stone-200 text-sm leading-relaxed">{welcomeMessage}</p>
                </div>
                <button
                  onClick={onDismissWelcome}
                  className="text-stone-500 hover:text-white transition-colors shrink-0 mt-0.5 relative z-10"
                >
                  <X size={18} />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* PWA Install Banner */}
        <AnimatePresence>
          {isInstallable && !dismissed && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-xl mx-auto mb-6"
            >
              <div className="bg-stone-900 text-white rounded-2xl p-4 flex items-center justify-between gap-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-amber-400 rounded-xl flex items-center justify-center shrink-0">
                    <Download size={18} className="text-stone-900" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">Instalar no celular</p>
                    <p className="text-xs text-stone-400">Acesse offline como um app nativo</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={install}
                    className="bg-amber-400 text-stone-900 font-bold text-xs px-3 py-2 rounded-lg hover:bg-amber-300 transition-colors whitespace-nowrap"
                  >
                    Instalar
                  </button>
                  <button onClick={dismiss} className="text-stone-400 hover:text-white transition-colors p-1">
                    <X size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Continue Where You Left Off Card */}
        {(() => {
          const allGpsBooks = BEGINNER_PATH.flatMap(step => step.books);
          const hasStartedGps = allGpsBooks.some(bookId => profile.visitedBooks?.includes(bookId) || profile.completedBooks.includes(bookId));
          const hasCompletedGps = allGpsBooks.every(bookId => profile.completedBooks.includes(bookId));
          const hasAccessedAnyBook = (profile.visitedBooks?.length || 0) > 0 || profile.completedBooks.length > 0;

          if (!hasAccessedAnyBook) {
            // Só mostra o card se o usuário estiver na aba Ordem Bíblica
            // Na aba "Por Onde Começar?" o próprio conteúdo já faz o convite
            if (viewMode === 'beginners') return null;
            return (
              <div className="max-w-xl mx-auto mb-6">
                <button 
                  onClick={() => onViewModeChange('beginners')}
                  className="w-full bg-stone-900 text-white rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all group text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-stone-800">
                      <BookOpen size={20} className="text-amber-400" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-serif font-bold text-lg leading-tight group-hover:text-amber-400 transition-colors">📖 Por onde começar?</h4>
                      <p className="text-sm text-stone-300 mt-0.5">Siga nossa trilha recomendada</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm font-bold text-stone-900 bg-amber-400 px-3 py-1.5 rounded-lg group-hover:bg-amber-300 transition-colors shrink-0">
                    <ArrowRight size={16} />
                  </div>
                </button>
              </div>
            );
          }

          if (hasCompletedGps) {
            return (
              <div className="max-w-xl mx-auto mb-6">
                <div className="w-full bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-center shadow-sm text-center">
                  <p className="font-bold text-amber-800 flex items-center gap-2">
                    <Trophy size={20} className="text-amber-500" />
                    Trilha do Discípulo concluída! Explore livremente.
                  </p>
                </div>
              </div>
            );
          }

          if (hasStartedGps && !hasCompletedGps) {
            if (viewMode === 'beginners') return null;

            let nextGpsBookId = null;
            let nextGpsStepIndex = 0;
            for (let i = 0; i < BEGINNER_PATH.length; i++) {
              const step = BEGINNER_PATH[i];
              const pendingBook = step.books.find(id => !profile.completedBooks.includes(id));
              if (pendingBook) {
                nextGpsBookId = pendingBook;
                nextGpsStepIndex = i + 1;
                break;
              }
            }

            if (nextGpsBookId) {
              const book = BIBLE_BOOKS.find(b => b.id === nextGpsBookId);
              if (book) {
                return (
                  <div className="max-w-xl mx-auto mb-4">
                    <button
                      onClick={() => onSelectBook(book.id)}
                      className="w-full bg-orange-50 border border-orange-200 rounded-2xl p-3.5 flex items-center gap-3 shadow-sm hover:shadow-md active:scale-[0.99] transition-all text-left group"
                    >
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${GROUP_COLORS[book.group] || 'bg-orange-100'}`}>
                        <MapPin size={16} className="text-orange-600" />
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest mb-0.5">
                          Trilha do Discípulo · Passo {nextGpsStepIndex}
                        </p>
                        <h4 className="font-serif font-bold text-stone-900 text-base leading-tight truncate group-hover:text-orange-700 transition-colors">
                          {book.name}
                        </h4>
                      </div>
                      {/* Arrow */}
                      <div className="w-9 h-9 bg-orange-500 group-hover:bg-orange-600 rounded-xl flex items-center justify-center shrink-0 transition-colors shadow-sm">
                        <ArrowRight size={16} className="text-white" />
                      </div>
                    </button>
                  </div>
                );
              }
            }
          }

          // Fallback to last accessed book (free exploration)
          const inProgressBookId = profile.visitedBooks?.slice().reverse().find(id => !profile.completedBooks.includes(id)) 
            || BIBLE_BOOKS.find(b => !profile.completedBooks.includes(b.id))?.id;
          
          const inProgressBook = BIBLE_BOOKS.find(b => b.id === inProgressBookId);

          if (!inProgressBook) return null;

          return (
            <div className="max-w-xl mx-auto mb-6">
              <button 
                onClick={() => onSelectBook(inProgressBook.id)}
                className="w-full bg-[#fdf8ed] border border-amber-200/60 rounded-2xl p-4 flex items-center justify-between shadow-sm hover:shadow-md transition-all group text-left"
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${GROUP_COLORS[inProgressBook.group] || 'bg-stone-100'}`}>
                    <BookOpen size={20} className="opacity-70" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-0.5">Continue estudando</p>
                    <h4 className="font-serif font-bold text-stone-900 text-lg leading-tight group-hover:text-amber-700 transition-colors">{inProgressBook.name}</h4>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-sm font-bold text-amber-600 bg-amber-100/50 px-3 py-1.5 rounded-lg group-hover:bg-amber-100 transition-colors shrink-0">
                  <span className="hidden sm:inline">Continuar</span> <ArrowRight size={16} />
                </div>
              </button>
            </div>
          );
        })()}

        {/* View Mode Toggle */}
        <div className="flex justify-center mb-5 md:mb-12">
          <div className="bg-stone-100 p-1 rounded-xl flex gap-1 w-full sm:w-auto">
            <button
              onClick={() => onViewModeChange('canonical')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap active:scale-95 ${
                viewMode === 'canonical' 
                  ? 'bg-white text-stone-900 shadow-sm' 
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              <ListOrdered size={16} />
              <span className="text-sm">Ordem Bíblica</span>
            </button>
            <button
              onClick={() => onViewModeChange('beginners')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-lg font-medium transition-all whitespace-nowrap active:scale-95 ${
                viewMode === 'beginners' 
                  ? 'bg-white text-stone-900 shadow-sm' 
                  : 'text-stone-500 hover:text-stone-700'
              }`}
            >
              <Compass size={16} />
              <span className="text-sm">Por Onde Começar?</span>
            </button>
          </div>
        </div>


        {/* Daily Verse Card — só na aba canônica, some ao marcar como lido */}
        {viewMode === 'canonical' && !dailyVerseRead && <div className="max-w-xl mx-auto mb-4">
          <div className="bg-stone-900 rounded-xl p-3 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-5"><Sun size={60} /></div>
            <div className="relative z-10 flex items-center gap-2.5">
              <Sun size={16} className="text-amber-400 shrink-0" />
              <p className="flex-1 text-sm font-serif italic text-stone-100 leading-snug">
                "O Senhor é o meu pastor; nada me faltará."
                <span className="not-italic font-bold text-amber-400 ml-1.5 text-[11px]">Sl 23:1</span>
              </p>
              <button
                onClick={handleReadDailyVerse}
                className="px-3 py-1.5 rounded-full font-bold text-xs bg-amber-400 hover:bg-amber-300 text-stone-900 shadow-sm active:scale-95 shrink-0 transition-all"
              >
                +15 pts
              </button>
            </div>
          </div>
        </div>}

        {/* Global Progress Bar — só aparece após ter pelo menos 1 livro, e só na aba canônica */}
        {profile.completedBooks.length > 0 && viewMode === 'canonical' && (
          <div className="max-w-xl mx-auto mb-4">
            <div className="flex justify-between items-center mb-1.5 px-0.5">
              <span className="text-xs font-medium text-stone-500">
                <strong className="text-stone-800">{profile.completedBooks.length}</strong> de 73 livros estudados
              </span>
              <span className="text-xs font-bold text-amber-600">
                {Math.round((profile.completedBooks.length / 73) * 100)}%
              </span>
            </div>
            <div className="w-full h-2 bg-stone-200 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(profile.completedBooks.length / 73) * 100}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
                className="h-full bg-amber-400 rounded-full"
              />
            </div>
          </div>
        )}
        {viewMode === 'canonical' ? (
          <>
            {/* Search Bar */}
            <div className="mb-4">
              <div className="relative w-full max-w-xl mx-auto shadow-md shadow-stone-200/50 rounded-xl">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <Search className="h-4 w-4 text-stone-400" />
                </div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-4 py-3 border border-stone-200 rounded-xl leading-5 bg-white/90 backdrop-blur-md placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-stone-400 focus:border-stone-400 text-sm transition-all"
                  placeholder="Buscar livro ou categoria..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            {/* Legend */}
            <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 mb-5 w-fit mx-auto">
              <div className="flex items-center gap-1.5 text-xs text-stone-400">
                <div className="w-3 h-3 border border-dashed border-stone-300 rounded-sm shrink-0"></div>
                <span>Não visitado</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-stone-400">
                <div className="w-3 h-3 bg-amber-100 rounded-sm relative shrink-0">
                  <div className="absolute top-0 right-0 w-1 h-1 bg-orange-500 rounded-full"></div>
                </div>
                <span>Visitado</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-stone-400">
                <CheckCircle2 size={12} className="text-amber-500 shrink-0" />
                <span>Concluído</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-stone-400">
                <Navigation size={12} className="text-orange-500 shrink-0" />
                <span>Via Trilha do Discípulo</span>
              </div>
            </div>
            {vtBooks.length > 0 && (
              <section className="mb-10 md:mb-12">
                <div className="flex items-center gap-2 mb-4 border-b border-stone-200 pb-2.5">
                  <Book className="text-stone-400 w-4 h-4 shrink-0" />
                  <h2 className="text-sm md:text-2xl font-serif font-semibold text-stone-800">Antigo Testamento</h2>
                  <div className="ml-auto shrink-0">
                    {(() => {
                      const totalVtCompleted = BIBLE_BOOKS.filter(b => b.testament === 'VT' && profile.completedBooks.includes(b.id)).length;
                      const isAllCompleted = totalVtCompleted === 46;
                      return (
                        <span className={`text-xs font-bold ${isAllCompleted ? 'text-amber-600' : 'text-stone-400'}`}>
                          {totalVtCompleted}/46
                        </span>
                      );
                    })()}
                  </div>
                </div>
                {renderBookGrid(vtBooks)}
              </section>
            )}

            {ntBooks.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-4 border-b border-stone-200 pb-2.5">
                  <Book className="text-stone-400 w-4 h-4 shrink-0" />
                  <h2 className="text-sm md:text-2xl font-serif font-semibold text-stone-800">Novo Testamento</h2>
                  <div className="ml-auto shrink-0">
                    {(() => {
                      const totalNtCompleted = BIBLE_BOOKS.filter(b => b.testament === 'NT' && profile.completedBooks.includes(b.id)).length;
                      const isAllCompleted = totalNtCompleted === 27;
                      return (
                        <span className={`text-xs font-bold ${isAllCompleted ? 'text-amber-600' : 'text-stone-400'}`}>
                          {totalNtCompleted}/27
                        </span>
                      );
                    })()}
                  </div>
                </div>
                {renderBookGrid(ntBooks)}
              </section>
            )}
          </>
        ) : (
          renderBeginnerPath()
        )}

        {filteredBooks.length === 0 && viewMode === 'canonical' && (
          <div className="text-center py-20 text-stone-500">
            <p className="text-lg">Nenhum livro encontrado para "{searchTerm}".</p>
            <button
              onClick={() => setSearchTerm('')}
              className="mt-4 text-stone-900 font-medium underline underline-offset-4"
            >
              Limpar busca
            </button>
          </div>
        )}

        {/* Extra Resources Section */}
        <section className="mt-20 pt-12 border-t border-stone-200">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-serif font-bold text-stone-900 mb-3">Recursos Extras para sua Fé</h2>
            <p className="text-stone-600">Aprofunde seus conhecimentos com nossos guias visuais complementares.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-stone-200 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row items-center gap-6">
              <div className="w-16 h-16 bg-rose-100 text-rose-700 rounded-2xl flex items-center justify-center shrink-0">
                <BookOpen size={32} />
              </div>
              <div>
                <h3 className="text-xl font-serif font-bold text-stone-900 mb-2">Manual dos Sacramentos</h3>
                <p className="text-stone-600 text-sm leading-relaxed">Entenda de forma simples e visual cada um dos sete sacramentos, sua origem bíblica e sentido espiritual.</p>
                <button className="mt-4 text-rose-700 font-bold text-sm uppercase tracking-wider hover:underline">Em breve</button>
              </div>
            </div>

            <div className="bg-white p-6 md:p-8 rounded-[2rem] border border-stone-200 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row items-center gap-6">
              <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center shrink-0">
                <Library size={32} />
              </div>
              <div>
                <h3 className="text-xl font-serif font-bold text-stone-900 mb-2">Manual da Missa</h3>
                <p className="text-stone-600 text-sm leading-relaxed">Um guia didático que explica passo a passo o significado de cada momento da celebração eucarística.</p>
                <button className="mt-4 text-indigo-600 font-bold text-sm uppercase tracking-wider hover:underline">Em breve</button>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Graduation Modal — ao concluir o Passo 6 */}
      <AnimatePresence>
        {showGraduationModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.85, y: 30 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.85, y: 30 }}
              transition={{ type: 'spring', damping: 20, stiffness: 260 }}
              className="bg-white rounded-[2rem] max-w-md w-full shadow-2xl overflow-hidden"
            >
              {/* Header com gradiente */}
              <div className="bg-gradient-to-br from-amber-400 via-orange-400 to-amber-500 p-8 text-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-20">
                  {[...Array(12)].map((_, i) => (
                    <Star key={i} size={i % 3 === 0 ? 20 : 12} fill="white" className="absolute text-white"
                      style={{ top: `${Math.random() * 100}%`, left: `${Math.random() * 100}%`, opacity: 0.4 + Math.random() * 0.6 }} />
                  ))}
                </div>
                <div className="relative z-10">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.2, type: 'spring', stiffness: 300 }}
                    className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white/40"
                  >
                    <Trophy size={48} className="text-white" />
                  </motion.div>
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                    <p className="text-amber-100 font-bold text-xs uppercase tracking-widest mb-1">Parabéns, Discípulo!</p>
                    <h2 className="text-3xl font-serif font-bold text-white mb-1">Trilha do Discípulo Concluída!</h2>
                    <p className="text-amber-100 text-sm">Você leu os livros essenciais da Bíblia Católica</p>
                  </motion.div>
                </div>
              </div>

              {/* Corpo */}
              <div className="p-6 md:p-8">
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-6 text-center">
                  <p className="text-amber-800 font-bold text-lg">+500 pontos conquistados! 🏆</p>
                  <p className="text-amber-600 text-sm mt-1">Uma conquista espiritual que ficará para sempre</p>
                </div>

                <p className="text-stone-600 text-center text-sm mb-6">
                  Agora você conhece os Evangelhos, as Cartas de Paulo, Atos dos Apóstolos, Gênesis, Êxodo e os livros sapienciais. O que deseja fazer a seguir?
                </p>

                <div className="space-y-3">
                  <button
                    onClick={() => {
                      localStorage.setItem(`${userId}_sage_journey_unlocked`, 'true');
                      setShowDeepJourney(true);
                      setShowGraduationModal(false);
                      setTimeout(() => confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 }, colors: ['#a855f7', '#6366f1'] }), 200);
                    }}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-between group shadow-md shadow-purple-200"
                  >
                    <div className="text-left">
                      <p className="font-bold">Iniciar a Jornada do Sábio</p>
                      <p className="text-purple-200 text-xs font-normal">Profetas, História de Israel, Apocalipse…</p>
                    </div>
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>

                  <button
                    onClick={() => {
                      setShowGraduationModal(false);
                    }}
                    className="w-full bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-between group"
                  >
                    <div className="text-left">
                      <p className="font-bold">Explorar livremente</p>
                      <p className="text-stone-400 text-xs font-normal">Navegar pelos 73 livros sem trilha</p>
                    </div>
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Step Completed Modal */}
      <AnimatePresence>
        {completedStepModal !== null && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white rounded-[2rem] p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-amber-100 to-white"></div>
              
              <div className="relative z-10">
                <div className="w-20 h-20 bg-amber-400 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-200 animate-bounce">
                  <Trophy size={40} />
                </div>
                
                <h2 className="text-3xl font-serif font-bold text-stone-900 mb-2">Passo {completedStepModal + 1} concluído!</h2>
                <p className="text-stone-600 mb-6">
                  Você completou todos os livros desta fase. {BEGINNER_PATH[completedStepModal].description}
                </p>
                
                <div className="bg-amber-50 rounded-2xl p-4 mb-8 border border-amber-100">
                  <p className="text-amber-800 font-bold">+200 pontos ganhos!</p>
                </div>
                
                <button 
                  onClick={() => setCompletedStepModal(null)}
                  className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {completedStepModal < BEGINNER_PATH.length - 1 ? `Ir para o Passo ${completedStepModal + 2}` : 'Ver Jornada Completa'} <ArrowRight size={20} />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
