import { useState, useEffect } from 'react';
import { Heart, Brain, Users, Zap, Wind, Moon, ArrowRight, Lock, CheckCircle2, Clock, Flame, ChevronRight, MapPin, BookOpen, Compass, Star, Trophy, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchTrails, fetchUserProgress, getTrailCompletedDays, Trail, UserTrailProgress } from '../services/trails';
import { useGamification } from '../services/gamification';
import { BIBLE_BOOKS, BEGINNER_PATH } from '../constants';
import confetti from 'canvas-confetti';
import { getStreakMultiplier } from '../services/gamification';
import BibleGames from './BibleGames';

interface TrailsProps {
  onSelectTrail: (trail: Trail) => void;
  onSelectBook: (bookId: string) => void;
}

const CATEGORY_META: Record<string, { icon: typeof Heart; gradient: string; bg: string; border: string; label: string }> = {
  relacionamento: { icon: Heart,  gradient: 'from-rose-600 to-pink-700',    bg: 'bg-rose-50',    border: 'border-rose-200',  label: 'Relacionamentos' },
  'saude-mental': { icon: Brain,  gradient: 'from-violet-500 to-purple-600', bg: 'bg-violet-50',  border: 'border-violet-200',label: 'Saúde Mental' },
  espiritualidade:{ icon: Wind,   gradient: 'from-sky-500 to-blue-600',      bg: 'bg-sky-50',     border: 'border-sky-200',   label: 'Espiritualidade' },
  vicios:         { icon: Zap,    gradient: 'from-amber-500 to-orange-600',  bg: 'bg-amber-50',   border: 'border-amber-200', label: 'Vícios' },
  sofrimento:     { icon: Moon,   gradient: 'from-slate-500 to-stone-600',   bg: 'bg-slate-50',   border: 'border-slate-200', label: 'Sofrimento' },
  comunidade:     { icon: Users,  gradient: 'from-emerald-500 to-teal-600',  bg: 'bg-emerald-50', border: 'border-emerald-200',label: 'Comunidade' },
};

const DEFAULT_META = CATEGORY_META['espiritualidade'];

const FALLBACK_TRAILS: Trail[] = [
  { id: 'infidelidade', slug: 'infidelidade', title: 'Infidelidade — O Caminho do Perdão', description: 'Encontre cura, perdão e renovação pelo olhar da fé católica após a traição no casamento.', duration_days: 7, category: 'relacionamento', emoji: '💔', is_premium: false, order_index: 1 },
  { id: 'depressao', slug: 'depressao', title: 'Depressão — A Luz nas Trevas', description: 'Descubra na Bíblia o conforto de Deus para os momentos mais escuros da alma.', duration_days: 7, category: 'saude-mental', emoji: '🌑', is_premium: false, order_index: 2 },
  { id: 'solidao', slug: 'solidao', title: 'Solidão — Deus como Companhia', description: 'Aprenda a transformar a solidão em encontro com Deus e consigo mesmo.', duration_days: 5, category: 'espiritualidade', emoji: '🕊️', is_premium: false, order_index: 3 },
  { id: 'vicios', slug: 'vicios', title: 'Vícios — Libertação pelo Evangelho', description: 'Um caminho de 7 dias para sair da escravidão dos vícios pela força da fé.', duration_days: 7, category: 'vicios', emoji: '⛓️', is_premium: false, order_index: 4 },
  { id: 'ansiedade', slug: 'ansiedade', title: 'Ansiedade — Paz que Excede', description: 'Encontre a paz que excede todo entendimento através da Palavra de Deus.', duration_days: 5, category: 'saude-mental', emoji: '🌪️', is_premium: true, order_index: 5 },
  { id: 'luto', slug: 'luto', title: 'Luto — A Esperança da Ressurreição', description: 'Percorra o caminho da perda com a promessa cristã da vida eterna.', duration_days: 7, category: 'sofrimento', emoji: '🌿', is_premium: true, order_index: 6 },
];

// O Caminho do Discípulo cobre os 6 primeiros passos do BEGINNER_PATH (NT + introdução ao VT).
// Os passos 7-12 formam a "Jornada Profunda" (VT completo + Paulo completo).
// Se BEGINNER_PATH crescer, ajuste este valor.
const DISCIPLE_PATH_LENGTH = Math.min(6, BEGINNER_PATH.length);

export default function Trails({ onSelectTrail, onSelectBook }: TrailsProps) {
  const { profile, addPoints, showFloatingPoints, userId } = useGamification();
  const [trails, setTrails] = useState<Trail[]>([]);
  const [progress, setProgress] = useState<UserTrailProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('todos');
  const [activeTab, setActiveTab] = useState<'caminho' | 'tematicas'>('caminho');
  const [showDeepJourney, setShowDeepJourney] = useState(
    () => userId ? localStorage.getItem(`${userId}_sage_journey_unlocked`) === 'true' : false
  );
  const [completedStepModal, setCompletedStepModal] = useState<number | null>(null);
  const [showGraduationModal, setShowGraduationModal] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const fetchedTrails = await fetchTrails();
        const trailsToUse = fetchedTrails.length > 0 ? fetchedTrails : FALLBACK_TRAILS;
        setTrails(trailsToUse);
        if (userId) {
          setShowDeepJourney(localStorage.getItem(`${userId}_sage_journey_unlocked`) === 'true');
          const prog = await fetchUserProgress(userId);
          setProgress(prog);
        }
      } catch {
        setTrails(FALLBACK_TRAILS);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId]);

  // Detect completed beginner path steps
  useEffect(() => {
    if (activeTab !== 'caminho') return;
    let allStepsCompleted = true;
    BEGINNER_PATH.forEach((step, index) => {
      const isCompleted = step.books.every(id => profile.completedBooks.includes(id));
      const wasCompleted = localStorage.getItem(`${userId}_step_completed_${index}`);
      if (!isCompleted) allStepsCompleted = false;
      if (isCompleted && !wasCompleted) {
        localStorage.setItem(`${userId}_step_completed_${index}`, 'true');
        if (index === DISCIPLE_PATH_LENGTH - 1) {
          const wasGraduated = localStorage.getItem(`${userId}_disciple_trail_graduated`);
          if (!wasGraduated) {
            localStorage.setItem(`${userId}_disciple_trail_graduated`, 'true');
            // XP de conclusão gerenciado pelo gamification.tsx (com guard anti-duplicação)
            // Aqui apenas dispara o confetti e modal de graduação
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
        const stepXp = Math.round(300 * getStreakMultiplier(profile.streak));
        addPoints(stepXp, `Concluiu o Passo ${index + 1} da trilha`, 'bonus');
        showFloatingPoints(stepXp, 'bonus_step');
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#f59e0b', '#10b981', '#3b82f6', '#ef4444'] });
      }
    });
    const wasTrailCompleted = localStorage.getItem(`${userId}_trail_completed`);
    if (allStepsCompleted && !wasTrailCompleted) {
      localStorage.setItem(`${userId}_trail_completed`, 'true');
      // XP de conclusão da Trilha gerenciado pelo gamification.tsx (markBookCompleted)
      // Aqui apenas dispara o confetti e modal de graduação
    }
  }, [profile.completedBooks, activeTab, addPoints, showFloatingPoints, userId]);

  // ── Thematic trails helpers ──
  const categories = ['todos', ...Array.from(new Set(trails.map(t => t.category)))];
  const filtered = activeCategory === 'todos' ? trails : trails.filter(t => t.category === activeCategory);
  const getTrailProgress = (trail: Trail) => {
    const completed = getTrailCompletedDays(progress, trail.id);
    return { completed: completed.length, total: trail.duration_days };
  };
  const isStarted = (trail: Trail) => getTrailCompletedDays(progress, trail.id).length > 0;
  const isFinished = (trail: Trail) => { const { completed, total } = getTrailProgress(trail); return completed >= total; };
  const startedCount = trails.filter(t => isStarted(t) && !isFinished(t)).length;
  const finishedCount = trails.filter(t => isFinished(t)).length;

  // ── Beginner path helpers ──
  const discipleSteps = BEGINNER_PATH.slice(0, DISCIPLE_PATH_LENGTH);
  const deepSteps = BEGINNER_PATH.slice(DISCIPLE_PATH_LENGTH);
  const allDiscipleBookIds = discipleSteps.flatMap(step => step.books);
  const allBeginnerBookIds = BEGINNER_PATH.flatMap(step => step.books);
  const completedBeginnerBooks = allBeginnerBookIds.filter(id => profile.completedBooks.includes(id));
  const completedDiscipleBooks = allDiscipleBookIds.filter(id => profile.completedBooks.includes(id));
  const visitedBeginnerBooks = allBeginnerBookIds.filter(id => profile.visitedBooks?.includes(id));
  const isFirstTime = visitedBeginnerBooks.length === 0 && completedBeginnerBooks.length === 0;
  const isDiscipleCompleted = discipleSteps.every(step => step.books.every(id => profile.completedBooks.includes(id)));
  const progressPercentage = Math.round((completedBeginnerBooks.length / allBeginnerBookIds.length) * 100);
  const discipleProgressPercentage = Math.round((completedDiscipleBooks.length / allDiscipleBookIds.length) * 100);

  let currentStepIndex = 0;
  let currentBookId = BEGINNER_PATH[0].books[0];
  for (let i = 0; i < BEGINNER_PATH.length; i++) {
    const step = BEGINNER_PATH[i];
    const uncompletedBook = step.books.find(id => !profile.completedBooks.includes(id));
    if (uncompletedBook) { currentStepIndex = i; currentBookId = uncompletedBook; break; }
  }
  const currentBook = BIBLE_BOOKS.find(b => b.id === currentBookId);

  const renderStepBlock = (step: typeof BEGINNER_PATH[0], index: number, globalIndex: number) => {
    const isUnlocked = globalIndex <= currentStepIndex;
    const isCompleted = step.books.every(id => profile.completedBooks.includes(id));
    const stepCompletedBooks = step.books.filter(id => profile.completedBooks.includes(id)).length;
    const totalStepBooks = step.books.length;
    const estimatedWeeks = Math.max(1, Math.ceil((step.books.reduce((sum, id) => sum + (BIBLE_BOOKS.find(b => b.id === id)?.chapters || 0), 0) * 3) / (15 * 7)));
    const stepPct = totalStepBooks > 0 ? Math.round((stepCompletedBooks / totalStepBooks) * 100) : 0;
    return (
      <motion.div key={globalIndex} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: globalIndex * 0.06 }}
        className={`relative z-10 md:pl-16 ${!isUnlocked ? 'opacity-60' : ''}`}>
        {/* Timeline dot (desktop) */}
        <div className={`hidden md:flex absolute left-4 -translate-x-1/2 top-1 w-9 h-9 rounded-full items-center justify-center font-bold text-sm border-4 border-[#fdfbf7] transition-colors shadow-md ${isCompleted ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' : isUnlocked ? 'bg-stone-900 text-white' : 'bg-stone-200 text-stone-400'}`}>
          {isCompleted ? '✓' : globalIndex + 1}
        </div>
        <div className="mb-3">
          <div className="flex items-center gap-2 mb-1">
            <span className={`md:hidden w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${isCompleted ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' : isUnlocked ? 'bg-stone-900 text-white' : 'bg-stone-200 text-stone-400'}`}>
              {isCompleted ? '✓' : globalIndex + 1}
            </span>
            <h2 className={`text-base font-serif font-bold flex-1 leading-tight ${isCompleted ? 'text-amber-600' : isUnlocked ? 'text-stone-900' : 'text-stone-400'}`}>{step.title}</h2>
            {isCompleted && (
              <span className="shrink-0 bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-200">✓ Concluído</span>
            )}
            {isUnlocked && !isCompleted && (
              <span className="shrink-0 text-[10px] font-bold text-stone-500">{stepCompletedBooks}/{totalStepBooks}</span>
            )}
          </div>
          <p className={`text-sm md:ml-0 ml-9 leading-snug line-clamp-2 ${isUnlocked ? 'text-stone-500' : 'text-stone-400 italic'}`}>{step.description}</p>
          <div className="flex items-center gap-3 md:ml-0 ml-9 mt-1.5">
            <p className="text-[11px] text-stone-400">⏱ ~{estimatedWeeks} {estimatedWeeks === 1 ? 'semana' : 'semanas'}</p>
            {isUnlocked && !isCompleted && stepCompletedBooks > 0 && (
              <div className="flex-1 max-w-24 h-1.5 bg-stone-200 rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all" style={{ width: `${stepPct}%` }} />
              </div>
            )}
          </div>
        </div>
        <div className="md:ml-0 ml-9 relative">
          {!isUnlocked && (
            <div className="absolute inset-0 z-20 bg-[#fdfbf7]/70 backdrop-blur-[2px] flex flex-col items-center justify-center rounded-2xl border border-stone-200/50">
              <div className="bg-white p-3 rounded-full shadow-sm mb-2 text-stone-400"><Lock size={22} /></div>
              <p className="text-sm font-bold text-stone-500">Conclua o Passo {globalIndex} para desbloquear</p>
            </div>
          )}
          <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {step.books.map((bookId, bookIdx) => {
              const book = BIBLE_BOOKS.find(b => b.id === bookId)!;
              const isBookCompleted = profile.completedBooks.includes(bookId);
              const isBookInProgress = profile.visitedBooks?.includes(bookId) && !isBookCompleted;
              const isBookNotStarted = !isBookCompleted && !isBookInProgress;
              return (
                <motion.button key={book.id}
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: (globalIndex * 0.06) + (bookIdx * 0.03) }}
                  onClick={() => isUnlocked && onSelectBook(book.id)} disabled={!isUnlocked}
                  className={`p-2.5 rounded-xl flex flex-col items-center justify-center text-center transition-all relative group
                    ${isBookCompleted ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.2)]' 
                    : isBookInProgress ? 'bg-gradient-to-br from-orange-50 to-amber-50 border-2 border-orange-400' 
                    : 'bg-white border-2 border-dashed border-stone-200 hover:border-stone-300'}
                    ${isUnlocked ? 'hover:shadow-md active:scale-95 cursor-pointer' : 'cursor-not-allowed'}`}>
                  {isBookInProgress && (
                    <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-sm uppercase tracking-wider hidden sm:block">
                      lendo
                    </div>
                  )}
                  {isBookCompleted && (
                    <div className="absolute top-1.5 right-1.5 text-amber-500">
                      <CheckCircle2 size={13} className="fill-amber-100" />
                    </div>
                  )}
                  <span className={`text-[9px] font-bold uppercase tracking-wider mb-0.5 hidden sm:block truncate w-full text-center
                    ${isBookNotStarted ? 'text-stone-300' : isBookInProgress ? 'text-orange-400' : 'text-amber-500'}`}>{book.group}</span>
                  <span className={`font-serif text-sm font-bold leading-tight
                    ${isBookNotStarted ? 'text-stone-600' : isBookInProgress ? 'text-orange-900' : 'text-amber-800'}`}>{book.name}</span>
                  <span className={`text-[10px] mt-1 font-medium
                    ${isBookNotStarted ? 'text-stone-400' : isBookInProgress ? 'text-orange-500' : 'text-amber-600'}`}>{book.chapters} cap.</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fdfbf7] pb-28">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-5 md:pt-8 space-y-6 animate-pulse">
          {/* Header skeleton */}
          <div className="rounded-3xl bg-gradient-to-br from-amber-100 to-orange-100 h-36 w-full" />
          {/* Tabs skeleton */}
          <div className="flex gap-2">
            <div className="flex-1 h-11 rounded-xl bg-stone-200" />
            <div className="flex-1 h-11 rounded-xl bg-stone-100" />
          </div>
          {/* Banner skeleton */}
          <div className="h-20 rounded-2xl bg-stone-100" />
          {/* Progress bar skeleton */}
          <div className="h-3 rounded-full bg-stone-200" />
          {/* Step blocks skeleton */}
          {[1, 2, 3].map(i => (
            <div key={i} className="space-y-3">
              <div className="h-5 w-48 rounded-full bg-stone-200" />
              <div className="h-4 w-72 rounded-full bg-stone-100" />
              <div className="grid grid-cols-3 gap-2">
                {[1,2,3,4,5,6].map(j => <div key={j} className="h-16 rounded-xl bg-stone-100" />)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-stone-900 font-sans pb-28">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-5 md:pt-8">

        {/* Header */}
        <header className="mb-6 relative rounded-3xl overflow-hidden bg-gradient-to-br from-rose-500 via-pink-500 to-orange-400 p-5 md:p-7 shadow-lg shadow-rose-200/60">
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full" />
            <div className="absolute -bottom-8 -left-4 w-40 h-40 bg-white/10 rounded-full" />
            <div className="absolute top-1/2 right-16 w-16 h-16 bg-white/10 rounded-full" />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center border border-white/30 shrink-0">
                <Heart size={20} className="text-white" fill="white" />
              </div>
              <div>
                <h1 className="text-xl md:text-2xl font-serif font-bold text-white tracking-tight">Trilhas de Fé</h1>
                <p className="text-white/75 text-xs font-medium">Caminhos para os desafios da vida</p>
              </div>
            </div>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/20">
                <Flame size={12} className="text-amber-200" />
                <span className="text-white font-bold text-xs">{startedCount > 0 ? `${startedCount} em andamento` : 'Comece sua jornada'}</span>
              </div>
              {finishedCount > 0 && (
                <div className="flex items-center gap-1.5 bg-white/20 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/20">
                  <CheckCircle2 size={12} className="text-emerald-200" />
                  <span className="text-white font-bold text-xs">{finishedCount} concluída{finishedCount > 1 ? 's' : ''}</span>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Tab switcher */}
        <div className="flex bg-stone-100 p-1 rounded-2xl gap-1 mb-6">
          <button onClick={() => setActiveTab('caminho')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 ${activeTab === 'caminho' ? 'bg-white text-stone-900 shadow-md' : 'text-stone-400 hover:text-stone-600'}`}>
            🧭 <span className="hidden xs:inline">Por onde começar?</span><span className="xs:hidden">Caminho</span>
          </button>
          <button onClick={() => setActiveTab('tematicas')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all active:scale-95 ${activeTab === 'tematicas' ? 'bg-white text-stone-900 shadow-md' : 'text-stone-400 hover:text-stone-600'}`}>
            🎮 Jogos Bíblicos
          </button>
        </div>

        {/* ══ TAB: POR ONDE COMEÇAR? ══ */}
        {activeTab === 'caminho' && (
          <div>
            {isFirstTime ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-br from-amber-400 via-orange-400 to-amber-500 rounded-3xl p-6 md:p-8 mb-8 shadow-lg shadow-amber-200/60 relative overflow-hidden text-center">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Compass size={120} /></div>
                <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-white/10 rounded-full" />
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-16 h-16 bg-white/20 backdrop-blur-sm text-white rounded-2xl flex items-center justify-center mb-4 shadow-md border border-white/30 text-3xl">🧭</div>
                  <h2 className="text-2xl md:text-3xl font-serif font-bold text-white mb-2">Sua jornada começa aqui</h2>
                  <p className="text-amber-100 mb-6 max-w-md text-sm">Siga o caminho recomendado pela tradição católica e leia a Bíblia do jeito certo.</p>
                  <button onClick={() => onSelectBook(BEGINNER_PATH[0].books[0])}
                    className="bg-white text-amber-600 hover:bg-amber-50 font-bold py-3 px-8 rounded-2xl shadow-md hover:shadow-lg transition-all active:scale-95 text-base flex items-center gap-2">
                    Começar Agora <ArrowRight size={18} />
                  </button>
                </div>
              </motion.div>
            ) : currentBook ? (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl p-4 mb-8 border-2 border-amber-200 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl shadow-md flex items-center justify-center text-2xl shrink-0">📖</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 text-amber-600 font-bold text-[10px] uppercase tracking-wider mb-0.5">
                      <MapPin size={10} /> Você está aqui
                    </div>
                    <h2 className="font-serif font-bold text-stone-900 text-base leading-tight truncate">{currentBook.name}</h2>
                    <p className="text-stone-400 text-xs mt-0.5">{currentBook.chapters} cap. · ~{currentBook.chapters * 3} min</p>
                  </div>
                  <button onClick={() => onSelectBook(currentBook.id)}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white font-bold py-2.5 px-4 rounded-xl shadow-md transition-all shrink-0 flex items-center gap-1.5 text-sm">
                    Continuar <ArrowRight size={15} />
                  </button>
                </div>
              </motion.div>
            ) : null}

            <div className="mb-8 pr-12">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-stone-600">
                  {isDiscipleCompleted && showDeepJourney
                    ? <>🧭 Jornada do Sábio · <strong className="text-purple-600">{progressPercentage}% concluído</strong></>
                    : <>📍 Passo {Math.min(currentStepIndex + 1, DISCIPLE_PATH_LENGTH)}/{DISCIPLE_PATH_LENGTH} · <strong className="text-amber-600">{discipleProgressPercentage}% concluído</strong></>
                  }
                </span>
                <span className="text-[10px] font-bold text-stone-400">{completedBeginnerBooks.length}/{allBeginnerBookIds.length} livros</span>
              </div>
              <div className="w-full h-3 bg-stone-200 rounded-full overflow-hidden relative">
                <motion.div initial={{ width: 0 }} animate={{ width: `${isDiscipleCompleted && showDeepJourney ? progressPercentage : discipleProgressPercentage}%` }} transition={{ duration: 1, ease: 'easeOut' }}
                  className={`h-full rounded-full relative overflow-hidden ${isDiscipleCompleted && showDeepJourney ? 'bg-gradient-to-r from-purple-400 to-indigo-500' : 'bg-gradient-to-r from-amber-400 to-orange-500'}`}>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer" />
                </motion.div>
              </div>
            </div>

            <div className="mb-5 flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shrink-0 shadow-md shadow-amber-200/50 text-lg">🏅</div>
              <div>
                <h2 className="text-sm font-bold text-stone-900 leading-tight">Trilha do Discípulo</h2>
                <p className="text-[11px] text-stone-400">6 passos · Para quem está começando</p>
              </div>
              {isDiscipleCompleted && (
                <div className="ml-auto flex items-center gap-1.5 bg-amber-100 text-amber-700 text-[11px] font-bold px-3 py-1.5 rounded-full border border-amber-200"><Trophy size={11} /> Concluída!</div>
              )}
            </div>

            <div className="space-y-8 relative mb-12">
              <div className="absolute left-4 md:left-8 top-8 bottom-8 w-0.5 bg-stone-200 hidden md:block"></div>
              {discipleSteps.map((step, index) => renderStepBlock(step, index, index))}
            </div>

            {!isDiscipleCompleted && (
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
                className="relative rounded-3xl overflow-hidden border border-purple-200 bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 p-6 md:p-8 text-center">
                <div className="absolute top-4 left-6 text-purple-200"><Star size={18} fill="currentColor" /></div>
                <div className="absolute top-8 right-10 text-indigo-200"><Star size={12} fill="currentColor" /></div>
                <div className="absolute bottom-6 left-12 text-blue-200"><Star size={10} fill="currentColor" /></div>
                <div className="absolute bottom-4 right-6 text-purple-200"><Star size={16} fill="currentColor" /></div>
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-14 h-14 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-purple-200"><Lock size={22} className="text-white" /></div>
                  <p className="text-xs font-bold uppercase tracking-widest text-purple-500 mb-2">Aguardando você</p>
                  <h3 className="text-2xl font-serif font-bold text-stone-800 mb-2">Jornada do Sábio</h3>
                  <p className="text-stone-500 text-sm max-w-sm mb-4">6 novos passos pelos profetas, a história de Israel e o Apocalipse. Disponível ao concluir a Trilha do Discípulo.</p>
                  <div className="flex items-center gap-2 text-purple-400 text-sm font-medium"><ChevronDown size={16} className="animate-bounce" /> Conclua o Passo 6 para desbloquear</div>
                </div>
              </motion.div>
            )}

            {isDiscipleCompleted && showDeepJourney && (
              <>
                <div className="relative flex items-center gap-4 my-4">
                  <div className="flex-1 h-px bg-gradient-to-r from-amber-200 to-purple-300"></div>
                  <div className="flex items-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-full shadow-md whitespace-nowrap"><Star size={12} fill="white" /> Jornada do Sábio</div>
                  <div className="flex-1 h-px bg-gradient-to-l from-indigo-200 to-purple-300"></div>
                </div>
                <p className="text-center text-sm text-stone-500 mb-10">Você se formou na Trilha do Discípulo. Agora é hora de mergulhar fundo na Palavra.</p>
                <div className="space-y-8 relative">
                  <div className="absolute left-4 md:left-8 top-8 bottom-8 w-0.5 bg-gradient-to-b from-purple-200 to-indigo-200 hidden md:block"></div>
                  {deepSteps.map((step, index) => renderStepBlock(step, index, index + DISCIPLE_PATH_LENGTH))}
                </div>
              </>
            )}

            {isDiscipleCompleted && !showDeepJourney && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                className="relative rounded-3xl overflow-hidden border-2 border-purple-300 bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-50 p-6 md:p-8 text-center shadow-lg shadow-purple-100">
                <div className="absolute top-4 left-6 text-purple-300"><Star size={18} fill="currentColor" /></div>
                <div className="absolute top-6 right-8 text-indigo-200"><Star size={14} fill="currentColor" /></div>
                <div className="absolute bottom-5 left-10 text-blue-200"><Star size={11} fill="currentColor" /></div>
                <div className="absolute bottom-4 right-5 text-purple-200"><Star size={16} fill="currentColor" /></div>
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-purple-200 animate-pulse"><Star size={28} className="text-white" fill="white" /></div>
                  <p className="text-xs font-bold uppercase tracking-widest text-purple-500 mb-2">Desbloqueada!</p>
                  <h3 className="text-2xl md:text-3xl font-serif font-bold text-stone-900 mb-3">Jornada do Sábio</h3>
                  <p className="text-stone-600 text-sm max-w-sm mb-6">Profetas, a história épica de Israel, os deuterocanônicos, Paulo completo e o Apocalipse. 6 novos passos para quem quer dominar a Bíblia inteira.</p>
                  <button onClick={() => { localStorage.setItem(`${userId}_sage_journey_unlocked`, 'true'); setShowDeepJourney(true); confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#a855f7', '#6366f1', '#3b82f6'] }); }}
                    className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-3 px-8 rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 text-lg">
                    Iniciar Jornada do Sábio <ArrowRight size={20} />
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        )}

        {/* ══ TAB: JOGOS BÍBLICOS ══ */}
        {activeTab === 'tematicas' && (
          <BibleGames />
        )}
      </div>

      {/* Graduation Modal */}
      <AnimatePresence>
        {showGraduationModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/70 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.85, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.85, y: 30 }} transition={{ type: 'spring', damping: 20, stiffness: 260 }} className="bg-white rounded-[2rem] max-w-md w-full shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-br from-amber-400 via-orange-400 to-amber-500 p-8 text-center relative overflow-hidden">
                <div className="relative z-10">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 300 }} className="w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4 border-4 border-white/40"><Trophy size={48} className="text-white" /></motion.div>
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                    <p className="text-amber-100 font-bold text-xs uppercase tracking-widest mb-1">Parabéns, Discípulo!</p>
                    <h2 className="text-3xl font-serif font-bold text-white mb-1">Trilha do Discípulo Concluída!</h2>
                    <p className="text-amber-100 text-sm">Você leu os livros essenciais da Bíblia Católica</p>
                  </motion.div>
                </div>
              </div>
              <div className="p-6 md:p-8">
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-6 text-center"><p className="text-amber-800 font-bold text-lg">+500 pontos conquistados! 🏆</p><p className="text-amber-600 text-sm mt-1">Uma conquista espiritual que ficará para sempre</p></div>
                <p className="text-stone-600 text-center text-sm mb-6">Agora você conhece os Evangelhos, as Cartas de Paulo, Atos dos Apóstolos, Gênesis, Êxodo e os livros sapienciais.</p>
                <div className="space-y-3">
                  <button onClick={() => { localStorage.setItem(`${userId}_sage_journey_unlocked`, 'true'); setShowDeepJourney(true); setShowGraduationModal(false); setTimeout(() => confetti({ particleCount: 80, spread: 60, origin: { y: 0.7 }, colors: ['#a855f7', '#6366f1'] }), 200); }}
                    className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-between group shadow-md shadow-purple-200">
                    <div className="text-left"><p className="font-bold">Iniciar a Jornada do Sábio</p><p className="text-purple-200 text-xs font-normal">Profetas, História de Israel, Apocalipse…</p></div>
                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button onClick={() => setShowGraduationModal(false)} className="w-full bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold py-4 px-6 rounded-xl transition-all flex items-center justify-between group">
                    <div className="text-left"><p className="font-bold">Explorar livremente</p><p className="text-stone-400 text-xs font-normal">Navegar pelos 73 livros sem trilha</p></div>
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
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }} className="bg-white rounded-[2rem] p-8 max-w-md w-full text-center shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-amber-100 to-white"></div>
              <div className="relative z-10">
                <div className="w-20 h-20 bg-amber-400 text-white rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-200 animate-bounce"><Trophy size={40} /></div>
                <h2 className="text-3xl font-serif font-bold text-stone-900 mb-2">Passo {completedStepModal + 1} concluído!</h2>
                <p className="text-stone-600 mb-6">Você completou todos os livros desta fase. {BEGINNER_PATH[completedStepModal].description}</p>
                <div className="bg-amber-50 rounded-2xl p-4 mb-8 border border-amber-100"><p className="text-amber-800 font-bold">+200 pontos ganhos!</p></div>
                <button onClick={() => setCompletedStepModal(null)} className="w-full bg-stone-900 hover:bg-stone-800 text-white font-bold py-4 px-6 rounded-xl transition-colors flex items-center justify-center gap-2">
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
