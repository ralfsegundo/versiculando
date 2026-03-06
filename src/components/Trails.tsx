import { useState, useEffect } from 'react';
import { Heart, Brain, Users, Zap, Wind, Moon, ArrowRight, Lock, CheckCircle2, Clock, Flame, ChevronRight, MapPin, BookOpen, Compass, Star, Trophy, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchTrails, fetchUserProgress, getTrailCompletedDays, Trail, UserTrailProgress } from '../services/trails';
import { supabase } from '../lib/supabase';
import { useGamification } from '../services/gamification';
import { BIBLE_BOOKS, BEGINNER_PATH } from '../constants';
import confetti from 'canvas-confetti';

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

const DISCIPLE_PATH_LENGTH = 6;

export default function Trails({ onSelectTrail, onSelectBook }: TrailsProps) {
  const { profile, addPoints, showFloatingPoints } = useGamification();
  const [trails, setTrails] = useState<Trail[]>([]);
  const [progress, setProgress] = useState<UserTrailProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('todos');
  const [activeTab, setActiveTab] = useState<'caminho' | 'tematicas'>('caminho');
  const [userId, setUserId] = useState<string>('anonymous');
  const [showDeepJourney, setShowDeepJourney] = useState(false);
  const [completedStepModal, setCompletedStepModal] = useState<number | null>(null);
  const [showGraduationModal, setShowGraduationModal] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUserId(session.user.id);
        setShowDeepJourney(localStorage.getItem(`${session.user.id}_sage_journey_unlocked`) === 'true');
      }
    });
  }, []);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const [fetchedTrails, session] = await Promise.all([fetchTrails(), supabase.auth.getSession()]);
        const trailsToUse = fetchedTrails.length > 0 ? fetchedTrails : FALLBACK_TRAILS;
        setTrails(trailsToUse);
        if (session.data.session?.user) {
          const prog = await fetchUserProgress(session.data.session.user.id);
          setProgress(prog);
        }
      } catch {
        setTrails(FALLBACK_TRAILS);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

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
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 }, colors: ['#f59e0b', '#10b981', '#3b82f6', '#ef4444'] });
      }
    });
    const wasTrailCompleted = localStorage.getItem(`${userId}_trail_completed`);
    if (allStepsCompleted && !wasTrailCompleted) {
      localStorage.setItem(`${userId}_trail_completed`, 'true');
      addPoints(500, 'Concluiu a Trilha do Discípulo', 'bonus');
      setTimeout(() => showFloatingPoints(500, 'bonus_trail'), 1500);
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
            <h2 className={`text-base font-serif font-bold flex-1 leading-tight ${isCompleted ? 'text-amber-600' : isUnlocked ? 'text-stone-900' : 'text-stone-400'}`}>{step.title}</h2>
            <span className={`text-xs font-bold shrink-0 ${isCompleted ? 'text-amber-500' : isUnlocked ? 'text-stone-400' : 'invisible'}`}>
              {isUnlocked ? `${stepCompletedBooks}/${totalStepBooks}` : ''}{isCompleted && ' ✓'}
            </span>
          </div>
          <p className={`text-sm md:ml-0 ml-8 leading-snug line-clamp-2 ${isUnlocked ? 'text-stone-500' : 'text-stone-400 italic'}`}>{step.description}</p>
          <p className="text-[11px] text-stone-400 md:ml-0 ml-8 mt-0.5">⏱ ~{estimatedWeeks} {estimatedWeeks === 1 ? 'semana' : 'semanas'}</p>
        </div>
        <div className="md:ml-0 ml-11 relative">
          {!isUnlocked && (
            <div className="absolute inset-0 z-20 bg-[#fdfbf7]/60 backdrop-blur-[1px] flex flex-col items-center justify-center rounded-2xl border border-stone-200/50">
              <div className="bg-white p-3 rounded-full shadow-sm mb-2 text-stone-400"><Lock size={24} /></div>
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
                <button key={book.id} onClick={() => isUnlocked && onSelectBook(book.id)} disabled={!isUnlocked}
                  className={`p-3 rounded-xl flex flex-col items-center justify-center text-center transition-all ${cardClass} ${isUnlocked ? 'hover:shadow-md active:scale-95' : ''}`}>
                  {isBookInProgress && <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full shadow-sm uppercase tracking-wider hidden sm:block">Em progresso</div>}
                  {isBookCompleted && <div className="absolute top-1.5 right-1.5 text-amber-500"><CheckCircle2 size={14} className="fill-amber-100" /></div>}
                  <span className={`text-[9px] font-bold uppercase tracking-wider mb-1 ${isBookNotStarted ? 'text-stone-400' : isBookInProgress ? 'text-orange-700/70' : 'text-emerald-700/70'} hidden sm:block`}>{book.group}</span>
                  <span className={`font-serif text-sm font-bold leading-tight ${isBookNotStarted ? 'text-stone-600' : isBookInProgress ? 'text-orange-900' : 'text-emerald-900'}`}>{book.name}</span>
                  <span className={`text-[10px] mt-1.5 font-medium ${isBookNotStarted ? 'text-stone-400' : isBookInProgress ? 'text-orange-700/70' : 'text-emerald-700/70'}`}>{book.chapters} cap.</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fdfbf7] flex items-center justify-center pb-28">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" />
          <p className="text-sm text-stone-500">Carregando trilhas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-stone-900 font-sans pb-28">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 pt-5 md:pt-8">

        {/* Header */}
        <header className="mb-6 pr-10 md:pr-0">
          <div className="flex items-center gap-3 md:flex-col md:text-center md:items-center">
            <div className="w-9 h-9 md:w-12 md:h-12 bg-gradient-to-br from-rose-600 to-pink-700 text-white rounded-xl flex items-center justify-center shadow-md shrink-0">
              <Heart size={18} className="md:w-6 md:h-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg md:text-3xl font-serif font-bold tracking-tight text-stone-900">Trilhas</h1>
              <p className="text-xs md:text-sm text-stone-500 mt-0.5">Caminhos de fé para os desafios da vida</p>
            </div>
          </div>
        </header>

        {/* Tab switcher */}
        <div className="flex bg-stone-100 p-1 rounded-xl gap-1 mb-6">
          <button onClick={() => setActiveTab('caminho')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-medium text-sm transition-all active:scale-95 ${activeTab === 'caminho' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
            <Compass size={15} /> Por onde começar?
          </button>
          <button onClick={() => setActiveTab('tematicas')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg font-medium text-sm transition-all active:scale-95 ${activeTab === 'tematicas' ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-700'}`}>
            <Heart size={15} /> Trilhas Temáticas
          </button>
        </div>

        {/* ══ TAB: POR ONDE COMEÇAR? ══ */}
        {activeTab === 'caminho' && (
          <div>
            {isFirstTime ? (
              <div className="bg-gradient-to-br from-amber-100 to-orange-100 rounded-3xl p-6 md:p-8 mb-8 shadow-sm border border-amber-200 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10"><Compass size={120} /></div>
                <div className="relative z-10 flex flex-col items-center">
                  <div className="w-16 h-16 bg-amber-500 text-white rounded-full flex items-center justify-center mb-4 shadow-md"><Compass size={32} /></div>
                  <h2 className="text-2xl md:text-3xl font-serif font-bold text-amber-900 mb-2">Sua jornada começa aqui</h2>
                  <p className="text-amber-800 mb-6 max-w-md">Siga o caminho recomendado pela tradição católica e leia a Bíblia do jeito certo.</p>
                  <button onClick={() => onSelectBook(BEGINNER_PATH[0].books[0])} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 px-8 rounded-full shadow-md hover:shadow-lg transition-all w-full sm:w-auto text-lg">Começar Agora →</button>
                </div>
              </div>
            ) : currentBook ? (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-4 mb-8 shadow-sm border border-amber-200">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-white rounded-xl shadow-sm border border-amber-100 flex items-center justify-center text-amber-500 shrink-0"><BookOpen size={20} /></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 text-amber-700 font-bold text-[10px] uppercase tracking-wider mb-0.5"><MapPin size={10} /> Você está aqui</div>
                    <h2 className="font-serif font-bold text-stone-900 text-base leading-tight truncate">{currentBook.name}</h2>
                    <p className="text-stone-500 text-xs mt-0.5">{currentBook.chapters} cap. · ~{currentBook.chapters * 3} min</p>
                  </div>
                  <button onClick={() => onSelectBook(currentBook.id)} className="bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-bold py-2.5 px-4 rounded-xl shadow-sm transition-all shrink-0 flex items-center gap-1.5 text-sm">
                    Continuar <ArrowRight size={15} />
                  </button>
                </div>
              </div>
            ) : null}

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
                <motion.div initial={{ width: 0 }} animate={{ width: `${isDiscipleCompleted && showDeepJourney ? progressPercentage : discipleProgressPercentage}%` }} transition={{ duration: 1, ease: 'easeOut' }}
                  className={`h-full rounded-full ${isDiscipleCompleted && showDeepJourney ? 'bg-purple-500' : 'bg-amber-400'}`} />
              </div>
            </div>

            <div className="mb-5 flex items-center gap-2.5">
              <div className="w-7 h-7 bg-amber-400 rounded-lg flex items-center justify-center shrink-0"><MapPin size={13} className="text-white" /></div>
              <div>
                <h2 className="text-sm font-bold text-stone-900 leading-tight">Trilha do Discípulo</h2>
                <p className="text-[11px] text-stone-400">6 passos · Para quem está começando</p>
              </div>
              {isDiscipleCompleted && (
                <div className="ml-auto flex items-center gap-1 bg-amber-100 text-amber-700 text-[11px] font-bold px-2.5 py-1 rounded-full"><Trophy size={11} /> Concluída!</div>
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

        {/* ══ TAB: TRILHAS TEMÁTICAS ══ */}
        {activeTab === 'tematicas' && (
          <div>
            {(startedCount > 0 || finishedCount > 0) && (
              <div className="flex gap-3 mb-6">
                {startedCount > 0 && <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2"><Flame size={14} className="text-amber-500" /><span className="text-xs font-bold text-amber-800">{startedCount} em andamento</span></div>}
                {finishedCount > 0 && <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2"><CheckCircle2 size={14} className="text-emerald-500" /><span className="text-xs font-bold text-emerald-800">{finishedCount} concluídas</span></div>}
              </div>
            )}

            <div className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide -mx-4 px-4">
              {categories.map((cat: any) => {
                const meta = cat === 'todos' ? null : CATEGORY_META[cat as keyof typeof CATEGORY_META] || DEFAULT_META;
                const isActive = activeCategory === cat;
                return (
                  <button key={cat} onClick={() => setActiveCategory(cat)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-all active:scale-95 ${isActive ? 'bg-stone-900 text-white shadow-sm' : 'bg-stone-100 text-stone-500 hover:bg-stone-200'}`}>
                    {cat === 'todos' ? 'Todas' : (meta?.label || cat)}
                  </button>
                );
              })}
            </div>

            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {filtered.map((trail, index) => {
                  const meta = CATEGORY_META[trail.category] || DEFAULT_META;
                  const { completed, total } = getTrailProgress(trail);
                  const started = isStarted(trail);
                  const finished = isFinished(trail);
                  const progressPct = total > 0 ? Math.round((completed / total) * 100) : 0;
                  return (
                    <motion.div key={trail.id} layout initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ delay: index * 0.05 }}>
                      <button onClick={() => !trail.is_premium && onSelectTrail(trail)}
                        className={`w-full text-left rounded-2xl border overflow-hidden transition-all active:scale-[0.99] shadow-sm hover:shadow-md ${trail.is_premium ? 'opacity-75 cursor-default' : 'cursor-pointer'} ${meta.border} bg-white`}>
                        <div className={`h-1.5 w-full bg-gradient-to-r ${meta.gradient}`} />
                        <div className="p-4">
                          <div className="flex items-start gap-3">
                            <div className={`w-11 h-11 rounded-xl ${meta.bg} flex items-center justify-center shrink-0`}><span className="text-xl">{trail.emoji}</span></div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${meta.bg.replace('bg-', 'text-').replace('-50', '-600')}`}>{meta.label}</span>
                                    {trail.is_premium && <span className="flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider text-amber-600 bg-amber-100 px-1.5 py-0.5 rounded-full"><Lock size={9} /> Premium</span>}
                                    {finished && <span className="flex items-center gap-0.5 text-[9px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full"><CheckCircle2 size={9} /> Concluída</span>}
                                  </div>
                                  <h3 className="font-serif font-bold text-stone-900 text-base leading-tight">{trail.title}</h3>
                                  <p className="text-xs text-stone-500 mt-1 leading-relaxed line-clamp-2">{trail.description}</p>
                                </div>
                                {!trail.is_premium ? (
                                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-gradient-to-br ${meta.gradient} text-white shadow-sm mt-0.5`}><ChevronRight size={16} /></div>
                                ) : (
                                  <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 bg-stone-100 text-stone-400 mt-0.5"><Lock size={14} /></div>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-2.5">
                                <div className="flex items-center gap-1 text-[11px] text-stone-400 font-medium"><Clock size={11} />{trail.duration_days} dias</div>
                                {started && !finished && <div className="flex items-center gap-1 text-[11px] font-bold text-amber-600"><Flame size={11} />{completed}/{total} dias</div>}
                              </div>
                              {started && (
                                <div className="mt-2">
                                  <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                                    <motion.div initial={{ width: 0 }} animate={{ width: `${progressPct}%` }} transition={{ duration: 0.8, ease: 'easeOut' }} className={`h-full rounded-full bg-gradient-to-r ${meta.gradient}`} />
                                  </div>
                                </div>
                              )}
                              {!trail.is_premium ? (
                                <div className={`mt-2.5 text-[11px] font-bold ${meta.bg.replace('bg-', 'text-').replace('-50', '-600')}`}>
                                  {finished ? '✓ Trilha concluída · Ver novamente' : started ? 'Continuar trilha →' : 'Começar trilha →'}
                                </div>
                              ) : (
                                <div className="mt-2.5 text-[11px] font-bold text-stone-400">Em breve</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {filtered.length === 0 && (
              <div className="text-center py-16 text-stone-400">
                <Heart size={32} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhuma trilha nesta categoria ainda.</p>
              </div>
            )}

            <div className="mt-10 text-center">
              <p className="text-xs text-stone-400 leading-relaxed">Novas trilhas são adicionadas regularmente.<br />Todo conteúdo é baseado na Bíblia Católica.</p>
            </div>
          </div>
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
