import { useState, useEffect, useRef } from 'react';
import { BIBLE_BOOKS, GROUP_COLORS, GROUP_THEMES, BEGINNER_PATH } from '../constants';
import { generateBookSummary, BookData, MindMapData } from '../services/bookData';
import {
  ArrowLeft, Map, List, BookOpen, Search, FileText, Clock, Heart,
  Lightbulb, Key, Hash, Users, CheckCircle2, Trash2, Navigation,
  Pencil, Palette, Copy, Sparkles, Check, MapPin, X, ArrowRight,
  Share2, Flame, Star, Lock, Zap, Trophy
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useGamification, AVATARS } from '../services/gamification';
import { useNotes, NoteContext } from '../services/notes';
import { sharingService } from '../services/sharingService';

interface BookDetailProps {
  bookId: string;
  onBack: () => void;
}

const NOTE_COLORS = [
  { id: 'default', class: 'bg-white border-stone-200' },
  { id: 'yellow',  class: 'bg-yellow-50 border-yellow-200' },
  { id: 'blue',    class: 'bg-blue-50 border-blue-200' },
  { id: 'green',   class: 'bg-green-50 border-green-200' },
  { id: 'pink',    class: 'bg-rose-50 border-rose-200' },
  { id: 'purple',  class: 'bg-purple-50 border-purple-200' },
];

// ── Skeleton ──────────────────────────────────────────────────
function BookDetailSkeleton({ accent }: { accent: string }) {
  return (
    <div className="animate-pulse space-y-5 px-4 pt-4">
      <div className={`h-40 rounded-3xl ${accent} opacity-30`} />
      <div className="flex gap-2">
        {[80,90,70,100,75].map((w,i) => (
          <div key={i} className="h-10 rounded-2xl bg-stone-200 flex-shrink-0" style={{width:w}} />
        ))}
      </div>
      {[1,2,3].map(i => (
        <div key={i} className="h-28 rounded-3xl bg-stone-100 border border-stone-200" />
      ))}
    </div>
  );
}

// ── DuoButton — botão com borda inferior estilo Duolingo ──────
function DuoButton({
  children, onClick, disabled, color = 'amber', size = 'md', className = '',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  color?: 'amber' | 'green' | 'stone' | 'red' | 'indigo';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const colors = {
    amber:  'bg-amber-400 hover:bg-amber-500  border-amber-600  text-amber-900',
    green:  'bg-emerald-500 hover:bg-emerald-600 border-emerald-700 text-white',
    stone:  'bg-stone-800 hover:bg-stone-900  border-stone-950  text-white',
    red:    'bg-red-400 hover:bg-red-500    border-red-600    text-white',
    indigo: 'bg-indigo-500 hover:bg-indigo-600 border-indigo-700 text-white',
  };
  const sizes = {
    sm: 'px-4 py-2 text-sm rounded-xl',
    md: 'px-6 py-3 text-sm rounded-2xl',
    lg: 'px-8 py-4 text-base rounded-2xl',
  };
  return (
    <motion.button
      whileTap={!disabled ? { y: 2 } : {}}
      onClick={onClick}
      disabled={disabled}
      className={`font-black border-b-4 active:border-b-0 active:border-t-[3px] transition-all flex items-center justify-center gap-2 shadow-sm
        ${sizes[size]} ${disabled ? 'bg-stone-200 border-stone-300 text-stone-400 cursor-not-allowed shadow-none' : colors[color]}
        ${className}`}
    >
      {children}
    </motion.button>
  );
}

// ── XP Pill ───────────────────────────────────────────────────
function XpPill({ xp, color = 'amber' }: { xp: number | string; color?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-black
      ${color === 'amber' ? 'bg-amber-100 text-amber-700 border border-amber-200' :
        color === 'green'  ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
        'bg-stone-100 text-stone-600 border border-stone-200'}`}>
      <Star size={10} className="fill-current" />+{xp} XP
    </span>
  );
}

// ── Main Component ────────────────────────────────────────────
export default function BookDetail({ bookId, onBack }: BookDetailProps) {
  const { addPoints, markBookCompleted, markBookVisited, markChapterRead, markAllChaptersRead, profile, addNote, userId } = useGamification();
  const book = BIBLE_BOOKS.find(b => b.id === bookId);
  const [data, setData] = useState<BookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'overview' | 'timeline' | 'chapters' | 'verses' | 'notes'>('overview');
  const [initialNoteContext, setInitialNoteContext] = useState<NoteContext | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  const colorClass = book ? GROUP_COLORS[book.group] : 'bg-stone-100 text-stone-900 border-stone-200';
  const theme = book ? (GROUP_THEMES[book.group] || GROUP_THEMES['Pentateuco']) : GROUP_THEMES['Pentateuco'];
  const baseColor = colorClass.split(' ')[0];
  const textColor = colorClass.split(' ').find(c => c.startsWith('text-')) || 'text-stone-900';
  const borderColor = colorClass.split(' ').find(c => c.startsWith('border-')) || 'border-stone-200';

  const handleAnotarCapitulo = (chapter: string | number, title: string) => {
    setInitialNoteContext({ chapter, chapterTitle: title });
    setActiveTab('notes');
  };

  const handleNavigateToChapter = (chapter: string | number) => {
    setActiveTab('chapters');
    setTimeout(() => {
      const el = document.getElementById(`chapter-${chapter}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.classList.add('ring-4', 'ring-amber-400', 'transition-all');
        setTimeout(() => el.classList.remove('ring-4', 'ring-amber-400'), 2000);
      }
    }, 100);
  };

  const isGpsBook = BEGINNER_PATH.some(step => step.books.includes(bookId));
  const hasVisited = useRef(false);

  useEffect(() => {
    if (!isGpsBook && !localStorage.getItem(`${userId}_seen_free_exploration_tooltip`)) {
      const timer = setTimeout(() => {
        setShowTooltip(true);
        localStorage.setItem(`${userId}_seen_free_exploration_tooltip`, 'true');
        setTimeout(() => setShowTooltip(false), 3500);
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [isGpsBook]);

  useEffect(() => {
    if (!book) return;
    let isMounted = true;
    setLoading(true);
    setError('');
    markBookVisited(book.id);
    generateBookSummary(book.name, book.chapters)
      .then(result => {
        if (isMounted) {
          setData(result);
          setLoading(false);
          if (!hasVisited.current) {
            addPoints(10, `Visitou ${book.name}`, 'freeExploration');
            hasVisited.current = true;
          }
        }
      })
      .catch(() => { if (isMounted) { setError('Erro ao gerar resumo.'); setLoading(false); } });
    return () => { isMounted = false; };
  }, [book]);

  if (!book) return <div className="p-8 text-center text-stone-500">Livro não encontrado</div>;

  const totalChapters = data?.chapters?.length ?? book.chapters;
  const readCount = (profile.readChapters?.[book.id] || []).length;
  const progressPct = totalChapters > 0 ? Math.round((readCount / totalChapters) * 100) : 0;
  const allRead = readCount >= totalChapters;
  const isCompleted = profile.completedBooks.includes(book.id);

  const TABS = [
    { id: 'overview',  label: 'Visão Geral', icon: <Map size={16} /> },
    { id: 'chapters',  label: 'Capítulos',   icon: <List size={16} /> },
    { id: 'timeline',  label: 'Linha do Tempo', icon: <Clock size={16} /> },
    { id: 'verses',    label: 'Versículos',  icon: <Search size={16} /> },
    { id: 'notes',     label: 'Anotações',   icon: <FileText size={16} /> },
  ] as const;

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-stone-900 font-sans flex flex-col pb-32">

      {/* ── HEADER estilo Duolingo ── */}
      <header className="sticky top-0 z-30 bg-white border-b-2 border-stone-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          {/* Voltar */}
          <button
            onClick={onBack}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-stone-500 hover:bg-stone-100 transition-colors shrink-0"
          >
            <ArrowLeft size={22} />
          </button>

          {/* Progresso central */}
          <div className="flex-1 flex flex-col justify-center gap-0.5">
            <div className="flex items-center justify-between">
              <span className={`text-[10px] font-black uppercase tracking-wider ${textColor}`}>
                {book.group}
              </span>
              <span className="text-[10px] font-bold text-stone-400">
                {readCount}/{totalChapters} cap.
              </span>
            </div>
            <div className="w-full h-3 bg-stone-100 rounded-full overflow-hidden border border-stone-200">
              <motion.div
                className={`h-full rounded-full relative ${
                  isCompleted ? 'bg-gradient-to-r from-amber-400 to-yellow-300' :
                  allRead     ? 'bg-gradient-to-r from-emerald-400 to-emerald-500' :
                                'bg-gradient-to-r from-indigo-400 to-indigo-500'
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${isCompleted ? 100 : progressPct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
              </motion.div>
            </div>
          </div>

          {/* XP badge / streak */}
          <div className="flex items-center gap-1.5 shrink-0">
            {profile.streak > 0 && (
              <div className="flex items-center gap-1 bg-orange-50 border border-orange-200 rounded-xl px-2 py-1">
                <Flame size={13} className="text-orange-500" />
                <span className="text-xs font-black text-orange-600">{profile.streak}</span>
              </div>
            )}
            <div className={`flex items-center gap-1 ${baseColor} border ${borderColor} rounded-xl px-2 py-1`}>
              <Star size={12} className={`fill-current ${textColor}`} />
              <span className={`text-xs font-black ${textColor}`}>{profile.points}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto w-full px-4">

        {/* ── HERO do livro ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className={`mt-5 rounded-3xl overflow-hidden border-2 ${borderColor} shadow-md`}
        >
          {/* Banner colorido */}
          <div className={`${baseColor} px-6 pt-6 pb-4 relative overflow-hidden`}>
            <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/20 rounded-full" />
            <div className="absolute -bottom-4 -left-4 w-20 h-20 bg-white/10 rounded-full" />

            <div className="relative flex items-start justify-between gap-3">
              <div className="flex-1">
                {/* Testamento badge */}
                <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/40 ${textColor} mb-2`}>
                  {book.testament === 'VT' ? '📜 Antigo Testamento' : '✝️ Novo Testamento'}
                </span>
                <h1 className={`text-3xl font-serif font-black ${textColor} leading-tight`}>{book.name}</h1>
                {data && (
                  <p className={`text-sm font-medium mt-1 ${textColor} opacity-75 italic`}>
                    "{data.meaning}"
                  </p>
                )}
              </div>

              {/* Círculo de conclusão */}
              <div className={`shrink-0 w-16 h-16 rounded-2xl bg-white/30 border-2 border-white/50 flex flex-col items-center justify-center shadow-sm`}>
                {isCompleted ? (
                  <>
                    <Trophy size={20} className={textColor} />
                    <span className={`text-[9px] font-black ${textColor} mt-0.5`}>LIDO</span>
                  </>
                ) : (
                  <>
                    <span className={`text-2xl font-black ${textColor} leading-none`}>{progressPct}</span>
                    <span className={`text-[9px] font-black ${textColor}`}>%</span>
                  </>
                )}
              </div>
            </div>

            {/* Info chips */}
            {data && (
              <div className="relative flex flex-wrap gap-2 mt-4">
                {[
                  { label: book.chapters + ' capítulos' },
                  { label: data.author },
                  { label: data.period },
                ].map((chip, i) => (
                  <span key={i} className={`text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/40 ${textColor} border border-white/30`}>
                    {chip.label}
                  </span>
                ))}
                {isGpsBook && (
                  <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white text-orange-600 border border-orange-200 flex items-center gap-1">
                    <Navigation size={10} /> Trilha do Discípulo
                  </span>
                )}
              </div>
            )}
          </div>

          {/* XP reward strip */}
          <div className="bg-white px-6 py-3 flex items-center justify-between border-t-2 border-stone-100">
            <span className="text-xs font-bold text-stone-500">Recompensas por concluir</span>
            <div className="flex items-center gap-2">
              <XpPill xp={isGpsBook ? 100 : 50} color={isGpsBook ? 'green' : 'amber'} />
              {isGpsBook && <XpPill xp="Trilha" color="green" />}
            </div>
          </div>
        </motion.div>

        {/* ── TABS estilo Duolingo pill ── */}
        <div className="mt-4 flex gap-1.5 overflow-x-auto hide-scrollbar pb-1">
          {TABS.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <motion.button
                key={tab.id}
                whileTap={{ scale: 0.94 }}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-sm font-bold whitespace-nowrap transition-all border-b-2 shrink-0
                  ${isActive
                    ? `${baseColor} ${textColor} ${borderColor} border-b-4 shadow-sm`
                    : 'bg-white text-stone-500 border-stone-200 hover:bg-stone-50'
                  }`}
              >
                {tab.icon}
                {tab.label}
                {tab.id === 'notes' && (
                  <NotesBadge bookId={bookId} userId={userId} />
                )}
              </motion.button>
            );
          })}
        </div>

        {/* ── CONTEÚDO ── */}
        {loading ? (
          <BookDetailSkeleton accent={baseColor} />
        ) : error ? (
          <div className="mt-6 bg-red-50 border-2 border-red-200 rounded-3xl p-6 text-center">
            <p className="text-red-700 font-bold mb-3">{error}</p>
            <DuoButton color="red" onClick={() => {
              setLoading(true); setError('');
              generateBookSummary(book.name, book.chapters).then(setData).catch(() => setError('Erro novamente.')).finally(() => setLoading(false));
            }}>Tentar novamente</DuoButton>
          </div>
        ) : data ? (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="mt-5"
            >
              {activeTab === 'overview'  && <OverviewTab data={data} book={book} theme={theme} colorClass={colorClass} onNavigateToChapter={handleNavigateToChapter} userId={userId} />}
              {activeTab === 'chapters'  && <ChapterList chapters={data.chapters ?? []} colorClass={colorClass} onAnotar={handleAnotarCapitulo} bookId={book.id} readChapters={profile.readChapters?.[book.id] || []} onMarkChapterRead={n => markChapterRead(book.id, n, (data.chapters ?? []).length)} onMarkAllChaptersRead={() => { const nums = (data.chapters ?? []).map(ch => typeof ch.chapter === 'string' ? parseInt(ch.chapter) : ch.chapter as number); markAllChaptersRead(book.id, nums); }} />}
              {activeTab === 'timeline'  && <TimelineTab timeline={data.timeline} bookName={book.name} colorClass={colorClass} />}
              {activeTab === 'verses'    && <VersesTab verses={data.mainVerses} bookName={book.name} colorClass={colorClass} />}
              {activeTab === 'notes'     && <NotesSection bookId={book.id} bookName={book.name} colorClass={colorClass} initialContext={initialNoteContext} onClearContext={() => setInitialNoteContext(null)} onNavigateToChapter={handleNavigateToChapter} />}
            </motion.div>
          </AnimatePresence>
        ) : null}
      </div>

      {/* ── BOTTOM ACTION BAR — fixo, estilo Duolingo ── */}
      {data && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t-2 border-stone-100 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="max-w-2xl mx-auto">
            {isCompleted ? (
              <div className="flex items-center gap-3">
                <div className="flex-1 flex items-center gap-2 bg-amber-50 border-2 border-amber-200 rounded-2xl px-4 py-3">
                  <Trophy size={20} className="text-amber-500 shrink-0" />
                  <div>
                    <p className="font-black text-amber-800 text-sm">Livro Concluído! 🎉</p>
                    {profile.discipleCompletedBooks?.includes(book.id) && (
                      <p className="text-[11px] text-orange-600 font-bold">✓ Trilha do Discípulo</p>
                    )}
                  </div>
                </div>
                {isGpsBook && !profile.discipleCompletedBooks?.includes(book.id) && (
                  <DuoButton color="green" size="sm" onClick={() => { markBookCompleted(book.id, true); onBack(); }}>
                    <Navigation size={14} /> Reconquistar (+50 XP)
                  </DuoButton>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {/* Mini progress */}
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-xs font-bold text-stone-500">Progresso</span>
                    <span className="text-xs font-black text-stone-700">{readCount}/{totalChapters} cap.</span>
                  </div>
                  <div className="h-3 bg-stone-100 rounded-full overflow-hidden border border-stone-200">
                    <motion.div
                      className={`h-full rounded-full ${allRead ? 'bg-emerald-500' : 'bg-indigo-400'}`}
                      animate={{ width: `${progressPct}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  {!allRead && (
                    <p className="text-[10px] text-stone-400 mt-0.5">
                      Marque capítulos na aba{' '}
                      <button onClick={() => setActiveTab('chapters')} className="text-indigo-500 font-bold underline">Capítulos</button>
                    </p>
                  )}
                </div>

                {/* Botão de conclusão */}
                <div className="relative shrink-0">
                  <DuoButton
                    color={allRead ? (isGpsBook ? 'green' : 'stone') : 'stone'}
                    disabled={!allRead}
                    onClick={() => { if (allRead) { markBookCompleted(book.id, isGpsBook); onBack(); } }}
                  >
                    {allRead ? (
                      <><CheckCircle2 size={16} /> Concluir {isGpsBook ? '(+100 XP)' : '(+50 XP)'}</>
                    ) : (
                      <><Lock size={14} /> {progressPct}%</>
                    )}
                  </DuoButton>

                  {/* Tooltip exploração livre */}
                  <AnimatePresence>
                    {showTooltip && !isGpsBook && allRead && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="absolute bottom-full right-0 mb-3 w-60 bg-stone-900 text-white text-xs p-4 rounded-2xl shadow-2xl z-50"
                        onClick={() => setShowTooltip(false)}
                      >
                        <div className="absolute -bottom-1.5 right-6 w-3 h-3 bg-stone-900 rotate-45" />
                        <p className="font-bold text-amber-400 mb-1">💡 Dica!</p>
                        <p>Siga a Trilha do Discípulo para ganhar o dobro de XP.</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Small badge showing note count ───────────────────────────
function NotesBadge({ bookId, userId }: { bookId: string; userId: string | null }) {
  const { notes } = useNotes(bookId, userId);
  if (notes.length === 0) return null;
  return (
    <span className="w-4 h-4 rounded-full bg-stone-800 text-white text-[9px] font-black flex items-center justify-center">
      {notes.length}
    </span>
  );
}

// ══════════════════════════════════════════════════════════════
// OVERVIEW TAB — "Mapa" reformulado
// ══════════════════════════════════════════════════════════════
function OverviewTab({ data, book, theme, colorClass, onNavigateToChapter, userId }: {
  data: BookData;
  book: typeof BIBLE_BOOKS[0];
  theme: any;
  colorClass: string;
  onNavigateToChapter: (ch: string | number) => void;
  userId: string | null;
}) {
  const baseColor  = colorClass.split(' ')[0];
  const textColor  = colorClass.split(' ').find(c => c.startsWith('text-')) || 'text-stone-900';
  const borderColor = colorClass.split(' ').find(c => c.startsWith('border-')) || 'border-stone-200';

  const { addNote: addGamificationNote } = useGamification();
  const { notes, addNote: saveNote } = useNotes(book.id, userId);
  const [noteDrawerOpen, setNoteDrawerOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [selectedColor, setSelectedColor] = useState(NOTE_COLORS[0].id);
  const [noteSaved, setNoteSaved] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [editingColor, setEditingColor] = useState(NOTE_COLORS[0].id);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [fabVisible, setFabVisible] = useState(true);
  const noteTextareaRef = useRef<HTMLTextAreaElement>(null);
  const { deleteNote, updateNote } = useNotes(book.id, userId);

  useEffect(() => {
    const handleScroll = () => {
      setFabVisible(window.innerHeight + window.scrollY < document.body.scrollHeight - 200);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (noteDrawerOpen) setTimeout(() => noteTextareaRef.current?.focus(), 100);
  }, [noteDrawerOpen]);

  const handleSaveNote = () => {
    if (noteText.trim()) {
      saveNote(noteText.trim(), selectedColor);
      addGamificationNote();
      setNoteText(''); setSelectedColor(NOTE_COLORS[0].id);
      setNoteSaved(true); setTimeout(() => setNoteSaved(false), 2000);
    }
  };

  const handleSaveEdit = (id: string) => {
    if (editingText.trim()) updateNote(id, editingText.trim(), editingColor);
    setEditingNoteId(null); setEditingText('');
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id); setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4 pb-4">

      {/* ── VERSÍCULO EM DESTAQUE ── */}
      <div className={`${baseColor} border-2 ${borderColor} rounded-3xl p-5 relative overflow-hidden`}>
        <div className="absolute -top-6 -right-6 w-24 h-24 bg-white/20 rounded-full" />
        <p className={`text-[10px] font-black uppercase tracking-widest ${textColor} opacity-70 mb-2`}>✨ Versículo do Livro</p>
        <p className={`text-lg font-serif italic font-semibold ${textColor} leading-snug mb-2`}>
          "{data.quote}"
        </p>
        <p className={`text-xs font-black uppercase tracking-widest ${textColor} opacity-60`}>— {data.quoteReference}</p>
      </div>

      {/* ── CARDS DUOLINGO: Summary + Context ── */}
      <DuoCard icon="📖" title="Resumo" accent={baseColor} border={borderColor}>
        <p className="text-stone-600 text-sm leading-relaxed">{data.summary}</p>
      </DuoCard>

      <DuoCard icon="🏛️" title="Contexto Histórico" accent={baseColor} border={borderColor}>
        <p className="text-stone-600 text-sm leading-relaxed">{data.historicalContext}</p>
      </DuoCard>

      <DuoCard icon="🙏" title="Aplicação Prática & Oração" accent={baseColor} border={borderColor}>
        <p className="text-stone-600 text-sm leading-relaxed">{data.practicalApplication}</p>
      </DuoCard>

      {/* ── TEMAS — grid de pills ── */}
      <DuoCard icon="💡" title="Principais Temas" accent={baseColor} border={borderColor}>
        <div className="flex flex-wrap gap-2">
          {(data.themes ?? []).map((t, i) => (
            <span key={i} className={`text-xs font-bold px-3 py-1.5 rounded-full ${baseColor} ${textColor} border ${borderColor}`}>
              {t}
            </span>
          ))}
        </div>
      </DuoCard>

      {/* ── PALAVRAS-CHAVE ── */}
      <DuoCard icon="🔑" title="Palavras-Chave" accent={baseColor} border={borderColor}>
        <div className="flex flex-wrap gap-2">
          {(data.keywords ?? []).map((kw, i) => (
            <span key={i} className="text-xs font-bold px-3 py-1.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200">
              #{kw}
            </span>
          ))}
        </div>
      </DuoCard>

      {/* ── PERSONAGENS — cards horizontais ── */}
      <DuoCard icon="👤" title="Personagens" accent={baseColor} border={borderColor}>
        <div className="space-y-3">
          {(data.names ?? []).map((person, i) => (
            <div key={i} className={`flex items-start gap-3 p-3 rounded-2xl ${baseColor} border ${borderColor} bg-opacity-40`}>
              <div className={`w-8 h-8 rounded-xl ${baseColor} border ${borderColor} flex items-center justify-center shrink-0 font-black text-sm ${textColor}`}>
                {person.name[0]}
              </div>
              <div>
                <p className={`font-black text-sm ${textColor}`}>{person.name}</p>
                <p className="text-xs text-stone-500 leading-relaxed">{person.description}</p>
              </div>
            </div>
          ))}
        </div>
      </DuoCard>

      {/* ── CURIOSIDADE ── */}
      <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-2">💎 Curiosidade</p>
        <p className="text-stone-700 text-sm leading-relaxed">{data.curiosity}</p>
      </div>

      {/* ── FAB Notas ── */}
      <AnimatePresence>
        {!noteDrawerOpen && fabVisible && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.93 }}
            onClick={() => setNoteDrawerOpen(true)}
            className={`fixed bottom-[5.5rem] right-4 z-30 w-14 h-14 rounded-full shadow-xl border-2 border-b-4 flex items-center justify-center ${baseColor} ${borderColor}`}
          >
            <FileText size={22} className={textColor} />
            {notes.length > 0 && (
              <span className={`absolute -top-1 -right-1 w-5 h-5 rounded-full bg-stone-900 text-white text-[9px] font-black flex items-center justify-center`}>
                {notes.length}
              </span>
            )}
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── NOTE DRAWER ── */}
      <AnimatePresence>
        {noteDrawerOpen && (
          <>
            <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
              onClick={() => setNoteDrawerOpen(false)} />
            <motion.div
              initial={{ y:'100%' }} animate={{ y:0 }} exit={{ y:'100%' }}
              transition={{ type:'spring', damping:28, stiffness:320 }}
              className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-3xl shadow-2xl border-t-2 border-stone-100 flex flex-col"
              style={{ maxHeight:'85vh' }}
            >
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1.5 rounded-full bg-stone-200" />
              </div>
              <div className="flex items-center justify-between px-5 py-3 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl ${baseColor} border ${borderColor} flex items-center justify-center`}>
                    <FileText size={14} className={textColor} />
                  </div>
                  <div>
                    <p className="font-black text-stone-900 text-sm">Minhas Anotações</p>
                    <p className="text-stone-400 text-xs">{book.name} · {notes.length} nota{notes.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <button onClick={() => setNoteDrawerOpen(false)}
                  className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 font-bold text-sm">✕</button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 overscroll-contain">
                {/* Nova nota */}
                <div className={`rounded-2xl border-2 p-4 ${NOTE_COLORS.find(c=>c.id===selectedColor)?.class || NOTE_COLORS[0].class}`}>
                  <textarea ref={noteTextareaRef} value={noteText} onChange={e=>setNoteText(e.target.value)}
                    placeholder={`O que você aprendeu em ${book.name}?`} rows={3}
                    className="w-full resize-none text-stone-800 placeholder-stone-400 text-sm leading-relaxed focus:outline-none bg-transparent" />
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-200/50">
                    <div className="flex items-center gap-1.5">
                      <Palette size={13} className="text-stone-400" />
                      <div className="flex gap-1">
                        {NOTE_COLORS.map(color => (
                          <button key={color.id} onClick={()=>setSelectedColor(color.id)}
                            className={`w-5 h-5 rounded-full border-2 transition-transform ${color.class} ${selectedColor===color.id?'scale-125 border-stone-400':'border-transparent'}`} />
                        ))}
                      </div>
                    </div>
                    <DuoButton size="sm" color="stone" onClick={handleSaveNote} disabled={!noteText.trim()}>
                      {noteSaved ? <><Check size={13}/> Salvo!</> : <><Sparkles size={13}/> +25 XP</>}
                    </DuoButton>
                  </div>
                </div>
                {/* Notas existentes */}
                {notes.length === 0 ? (
                  <div className="text-center py-8 text-stone-400">
                    <FileText size={28} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nenhuma anotação ainda.</p>
                  </div>
                ) : notes.map(note => (
                  <motion.div key={note.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}}
                    className={`border rounded-2xl p-4 group ${NOTE_COLORS.find(c=>c.id===(editingNoteId===note.id?editingColor:note.color))?.class||NOTE_COLORS[0].class}`}>
                    {editingNoteId === note.id ? (
                      <>
                        <textarea autoFocus value={editingText} onChange={e=>setEditingText(e.target.value)} rows={3}
                          className="w-full resize-none text-stone-800 text-sm focus:outline-none bg-white/50 p-2 rounded-xl border border-stone-200/50" />
                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-stone-200/50">
                          <div className="flex gap-1">
                            {NOTE_COLORS.map(c=>(
                              <button key={c.id} onClick={()=>setEditingColor(c.id)}
                                className={`w-5 h-5 rounded-full border-2 transition-transform ${c.class} ${editingColor===c.id?'scale-125 border-stone-400':'border-transparent'}`} />
                            ))}
                          </div>
                          <div className="flex gap-2">
                            <button onClick={()=>{setEditingNoteId(null);setEditingText('');}}
                              className="px-3 py-1.5 rounded-lg text-xs text-stone-500 hover:bg-stone-200/50">Cancelar</button>
                            <DuoButton size="sm" color="stone" onClick={()=>handleSaveEdit(note.id)} disabled={!editingText.trim()}>
                              <CheckCircle2 size={13}/> Salvar
                            </DuoButton>
                          </div>
                        </div>
                      </>
                    ) : (
                      <>
                        {note.context && (
                          <button onClick={()=>{setNoteDrawerOpen(false);onNavigateToChapter(note.context!.chapter!);}}
                            className="mb-3 flex items-center gap-1.5 bg-white/60 hover:bg-white text-stone-600 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-stone-200/50 w-fit">
                            <MapPin size={10}/> Cap. {note.context.chapter}: {note.context.chapterTitle} <ArrowRight size={10}/>
                          </button>
                        )}
                        <p className="text-stone-800 text-sm leading-relaxed whitespace-pre-wrap">{note.text}</p>
                        <div className="flex items-center justify-between mt-3 pt-2 border-t border-stone-200/50">
                          <span className="text-[10px] text-stone-400">{new Date(note.createdAt).toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})}</span>
                          <div className="flex gap-1">
                            <button onClick={()=>handleCopy(note.id,note.text)} className="p-1.5 text-stone-400 hover:text-stone-700 rounded">
                              {copiedId===note.id?<Check size={13} className="text-green-500"/>:<Copy size={13}/>}
                            </button>
                            <button onClick={()=>{setEditingNoteId(note.id);setEditingText(note.text);setEditingColor(note.color||'default');}}
                              className="p-1.5 text-stone-400 hover:text-stone-700 rounded"><Pencil size={13}/></button>
                            <button onClick={()=>deleteNote(note.id)} className="p-1.5 text-red-400 hover:text-red-600 rounded"><Trash2 size={13}/></button>
                          </div>
                        </div>
                      </>
                    )}
                  </motion.div>
                ))}
                <div className="h-4"/>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── DuoCard — card genérico estilo Duolingo ──────────────────
function DuoCard({ icon, title, children, accent, border }: {
  icon: string; title: string; children: React.ReactNode; accent: string; border: string;
}) {
  return (
    <div className="bg-white border-2 border-stone-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
      <div className={`flex items-center gap-2 px-5 py-3 border-b-2 border-stone-100 ${accent} bg-opacity-50`}>
        <span className="text-lg">{icon}</span>
        <h3 className="font-black text-stone-800 text-sm uppercase tracking-wider">{title}</h3>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// CHAPTERS TAB — cards estilo "lições" Duolingo
// ══════════════════════════════════════════════════════════════
function ChapterList({ chapters, colorClass, onAnotar, bookId, readChapters, onMarkChapterRead, onMarkAllChaptersRead }: {
  chapters: BookData['chapters'];
  colorClass: string;
  onAnotar: (ch: string | number, title: string) => void;
  bookId: string;
  readChapters: number[];
  onMarkChapterRead: (n: number) => void;
  onMarkAllChaptersRead: () => void;
}) {
  const baseColor  = colorClass.split(' ')[0];
  const textColor  = colorClass.split(' ').find(c => c.startsWith('text-')) || 'text-stone-900';
  const borderColor = colorClass.split(' ').find(c => c.startsWith('border-')) || 'border-stone-200';
  const readCount  = readChapters.length;
  const total      = chapters.length;
  const progressPct = total > 0 ? Math.round((readCount / total) * 100) : 0;

  return (
    <div className="space-y-4 pb-4">
      {/* Progress header */}
      <div className="bg-white border-2 border-stone-100 rounded-3xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-black uppercase tracking-wider text-stone-500">Capítulos Lidos</span>
          <span className={`text-sm font-black ${progressPct===100?'text-emerald-600':'text-indigo-600'}`}>
            {readCount}/{total}
          </span>
        </div>
        <div className="h-4 bg-stone-100 rounded-full overflow-hidden border border-stone-200">
          <motion.div
            className={`h-full rounded-full relative ${progressPct===100?'bg-gradient-to-r from-emerald-400 to-emerald-500':'bg-gradient-to-r from-indigo-400 to-indigo-500'}`}
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent rounded-full" />
          </motion.div>
        </div>
        {progressPct === 100 ? (
          <motion.p initial={{opacity:0}} animate={{opacity:1}} className="text-emerald-600 font-bold text-xs mt-2 text-center">
            🎉 Todos os capítulos lidos! Conclua o livro na barra abaixo.
          </motion.p>
        ) : total >= 10 && (
          <button onClick={onMarkAllChaptersRead}
            className="mt-2 text-xs font-bold text-indigo-500 hover:text-indigo-700 underline underline-offset-2 w-full text-center">
            Marcar todos como lidos de uma vez
          </button>
        )}
      </div>

      {/* Chapter cards estilo "lições" */}
      {chapters.map((ch, idx) => {
        const chapterNum = typeof ch.chapter === 'string' ? parseInt(ch.chapter) : ch.chapter as number;
        const isRead = readChapters.includes(chapterNum);
        return (
          <ChapterCard key={idx} ch={ch} idx={idx} baseColor={baseColor} textColor={textColor}
            borderColor={borderColor} isRead={isRead} onMarkChapterRead={onMarkChapterRead}
            bookId={bookId} chapterNum={chapterNum} />
        );
      })}
    </div>
  );
}

function ChapterCard({ ch, idx, baseColor, textColor, borderColor, isRead, onMarkChapterRead, bookId, chapterNum }: {
  ch: BookData['chapters'][0]; idx: number; baseColor: string; textColor: string; borderColor: string;
  isRead: boolean; onMarkChapterRead: (n: number) => void; bookId: string; chapterNum: number;
}) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [selectedColor, setSelectedColor] = useState(NOTE_COLORS[0].id);
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { addNote: addGamificationNote, userId } = useGamification();
  const { notes, addNote: saveNote } = useNotes(bookId, userId);
  const chapterNotes = notes.filter(n => n.context?.chapter === chapterNum || n.context?.chapter === ch.chapter.toString());

  useEffect(() => {
    if (noteOpen) setTimeout(() => textareaRef.current?.focus(), 150);
  }, [noteOpen]);

  const handleSave = () => {
    if (!noteText.trim()) return;
    saveNote(noteText.trim(), selectedColor, { chapter: chapterNum, chapterTitle: ch.title as string });
    addGamificationNote();
    setNoteText(''); setSelectedColor(NOTE_COLORS[0].id);
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  };

  return (
    <motion.div
      id={`chapter-${ch.chapter}`}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: Math.min(idx * 0.04, 0.4) }}
      className={`rounded-3xl border-2 overflow-hidden transition-all shadow-sm
        ${isRead
          ? 'bg-emerald-50 border-emerald-200 shadow-emerald-100'
          : 'bg-white border-stone-100 hover:border-stone-200'
        }`}
    >
      {/* Top strip — número e título */}
      <div className={`flex items-center gap-3 px-5 py-4 ${isRead ? 'border-b-2 border-emerald-200' : 'border-b-2 border-stone-100'}`}>
        {/* Número / check */}
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center border-b-4 shrink-0 font-black text-sm transition-all
          ${isRead
            ? 'bg-emerald-500 border-emerald-700 text-white shadow-sm'
            : `${baseColor} ${borderColor} ${textColor}`
          }`}>
          {isRead ? <CheckCircle2 size={18} /> : chapterNum}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className={`font-black text-sm leading-tight truncate ${isRead ? 'text-emerald-800' : 'text-stone-900'}`}>
            {ch.title}
          </h4>
          {isRead && <p className="text-[11px] text-emerald-600 font-bold">✓ Capítulo lido</p>}
        </div>
        <XpPill xp={5} color={isRead ? 'green' : 'stone'} />
      </div>

      {/* Conteúdo */}
      <div className="px-5 py-4">
        <p className="text-stone-600 text-sm leading-relaxed">{ch.summary}</p>

        {/* Notas deste capítulo */}
        {chapterNotes.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {chapterNotes.map(note => (
              <span key={note.id} className={`text-[11px] px-2.5 py-1 rounded-full border truncate max-w-[180px] ${NOTE_COLORS.find(c=>c.id===note.color)?.class||NOTE_COLORS[0].class}`}>
                ✍️ {note.text}
              </span>
            ))}
          </div>
        )}

        {/* Botões */}
        <div className="flex items-center gap-2 mt-4 flex-wrap">
          <motion.button
            whileTap={{ scale: 0.93, y: 1 }}
            onClick={() => onMarkChapterRead(chapterNum)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-black border-b-[3px] transition-all active:border-b-0 active:border-t-[2px]
              ${isRead
                ? 'bg-emerald-100 border-emerald-300 text-emerald-700 hover:bg-emerald-200'
                : 'bg-stone-100 border-stone-300 text-stone-600 hover:bg-stone-200'
              }`}
          >
            <CheckCircle2 size={14} className={isRead ? 'text-emerald-500' : 'text-stone-400'} />
            {isRead ? 'Lido ✓' : 'Marcar lido'}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.93 }}
            onClick={() => setNoteOpen(v => !v)}
            className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-black border-b-[3px] transition-all active:border-b-0
              ${noteOpen
                ? 'bg-indigo-100 border-indigo-300 text-indigo-700'
                : 'bg-stone-100 border-stone-300 text-stone-600 hover:bg-stone-200'
              }`}
          >
            <Pencil size={14} />
            {chapterNotes.length > 0 ? `Notas (${chapterNotes.length})` : 'Anotar'}
          </motion.button>
        </div>
      </div>

      {/* Drawer de nota inline */}
      <AnimatePresence>
        {noteOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className={`border-t-2 px-5 py-5 space-y-3
              ${isRead ? 'border-emerald-200 bg-emerald-50/60' : 'border-stone-100 bg-stone-50/60'}`}>
              <div className="flex items-center gap-2 text-[11px] font-black text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-1.5 w-fit">
                <MapPin size={11} /> Cap. {ch.chapter} — {ch.title}
              </div>
              <div className={`rounded-2xl p-4 border-2 ${NOTE_COLORS.find(c=>c.id===selectedColor)?.class||NOTE_COLORS[0].class}`}>
                <textarea ref={textareaRef} value={noteText} onChange={e=>setNoteText(e.target.value)}
                  onKeyDown={e=>{if(e.key==='Enter'&&(e.metaKey||e.ctrlKey))handleSave();}}
                  placeholder="O que Deus falou ao seu coração neste capítulo?"
                  className="w-full h-20 bg-transparent resize-none focus:outline-none placeholder:text-stone-400 text-stone-800 text-sm leading-relaxed" />
              </div>
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <Palette size={13} className="text-stone-400" />
                  {NOTE_COLORS.map(color => (
                    <button key={color.id} onClick={()=>setSelectedColor(color.id)}
                      className={`w-5 h-5 rounded-full border-2 transition-transform ${color.class} ${selectedColor===color.id?'scale-125 border-stone-400':'border-transparent'}`} />
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-stone-400">⌘↵ salvar</span>
                  <DuoButton size="sm" color={saved ? 'green' : 'stone'} onClick={handleSave} disabled={!noteText.trim()}>
                    {saved ? <><Check size={13}/> Salvo!</> : <><Sparkles size={13}/> +25 XP</>}
                  </DuoButton>
                </div>
              </div>
              {chapterNotes.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-stone-200">
                  <p className="text-[10px] font-black text-stone-400 uppercase tracking-wider">Suas notas aqui</p>
                  {chapterNotes.map(note => (
                    <div key={note.id} className={`rounded-xl px-4 py-3 border text-xs text-stone-700 ${NOTE_COLORS.find(c=>c.id===note.color)?.class||NOTE_COLORS[0].class}`}>
                      {note.text}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ══════════════════════════════════════════════════════════════
// TIMELINE TAB
// ══════════════════════════════════════════════════════════════
function TimelineTab({ timeline, bookName, colorClass }: { timeline: BookData['timeline']; bookName: string; colorClass: string }) {
  const baseColor  = colorClass.split(' ')[0];
  const textColor  = colorClass.split(' ').find(c => c.startsWith('text-')) || 'text-stone-900';
  const borderColor = colorClass.split(' ').find(c => c.startsWith('border-')) || 'border-stone-200';

  if (!timeline?.length) return (
    <div className="text-center py-12 text-stone-400">Linha do tempo não disponível.</div>
  );

  return (
    <div className="space-y-3 pb-4">
      <p className="text-xs font-black uppercase tracking-wider text-stone-400 text-center mb-4">
        📅 Linha do Tempo — {bookName}
      </p>
      {timeline.map((event, idx) => (
        <motion.div key={idx}
          initial={{ opacity: 0, x: -12 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ delay: idx * 0.06 }}
          className="bg-white border-2 border-stone-100 rounded-3xl overflow-hidden shadow-sm"
        >
          <div className={`flex items-center gap-3 px-5 py-3 border-b-2 border-stone-100 ${baseColor} bg-opacity-40`}>
            <div className={`w-8 h-8 rounded-xl ${baseColor} border-b-2 ${borderColor} flex items-center justify-center font-black text-sm ${textColor}`}>
              {idx + 1}
            </div>
            <h4 className="font-black text-stone-800 text-sm uppercase tracking-wide">{event.title}</h4>
            <span className="text-2xl ml-auto">{event.emoji}</span>
          </div>
          <div className="px-5 py-4">
            <p className="text-stone-600 text-sm leading-relaxed">{event.description}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// VERSES TAB
// ══════════════════════════════════════════════════════════════
function VersesTab({ verses, bookName, colorClass }: { verses: BookData['mainVerses']; bookName: string; colorClass: string }) {
  const baseColor  = colorClass.split(' ')[0];
  const textColor  = colorClass.split(' ').find(c => c.startsWith('text-')) || 'text-stone-900';
  const borderColor = colorClass.split(' ').find(c => c.startsWith('border-')) || 'border-stone-200';
  const { addFavorite, userId, addEcoReaction, profile } = useGamification();
  const [favorites, setFavorites] = useState<Record<string, boolean>>(() => {
    try { return JSON.parse(localStorage.getItem(`${userId}_bible_favorites`) || '{}'); }
    catch { return {}; }
  });

  const ECO_EMOJIS = [
    { emoji: '🙏', label: 'Me tocou' }, { emoji: '💡', label: 'Aprendi' },
    { emoji: '😢', label: 'Me consolou' }, { emoji: '🔥', label: 'Me desafiou' },
  ];

  const handleFavorite = (ref: string) => {
    const updated = { ...favorites };
    if (updated[ref]) delete updated[ref];
    else { updated[ref] = true; addFavorite(); }
    setFavorites(updated);
    localStorage.setItem(`${userId}_bible_favorites`, JSON.stringify(updated));
  };

  if (!verses?.length) return (
    <div className="text-center py-12 text-stone-400">Versículos não disponíveis.</div>
  );

  return (
    <div className="space-y-4 pb-4">
      <p className="text-xs font-black uppercase tracking-wider text-stone-400 text-center">
        📖 Versículos Principais — {bookName}
      </p>
      {verses.map((verse, idx) => (
        <motion.div key={idx}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: idx * 0.06 }}
          className="bg-white border-2 border-stone-100 rounded-3xl overflow-hidden shadow-sm"
        >
          {/* Header */}
          <div className={`flex items-center justify-between px-5 py-3 border-b-2 border-stone-100 ${baseColor} bg-opacity-40`}>
            <div className="flex items-center gap-2">
              <span className="text-xl">{verse.emoji}</span>
              <span className={`text-xs font-black uppercase tracking-wide ${textColor}`}>{verse.reference}</span>
            </div>
            <button onClick={() => handleFavorite(verse.reference)}
              className={`p-2 rounded-xl transition-all border-b-2 active:border-b-0 ${favorites[verse.reference] ? `bg-rose-100 border-rose-300 text-rose-600` : `bg-white/60 border-stone-200 text-stone-400 hover:text-rose-500`}`}>
              <Heart size={16} className={favorites[verse.reference] ? 'fill-rose-600' : ''} />
            </button>
          </div>

          {/* Texto */}
          <div className="px-5 py-4 space-y-3">
            <p className="text-stone-800 text-base font-serif italic leading-relaxed">"{verse.text}"</p>
            <div className="bg-stone-50 border border-stone-100 rounded-2xl p-3">
              <p className="text-stone-500 text-xs leading-relaxed">
                <span className="font-bold text-stone-700">Significado: </span>{verse.explanation}
              </p>
            </div>
            {/* Eco reactions */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {ECO_EMOJIS.map(({ emoji, label }) => {
                const isSelected = profile.ecoReactions?.[verse.reference] === emoji;
                return (
                  <button key={emoji} onClick={() => addEcoReaction(verse.reference, emoji)} title={label}
                    className={`text-sm rounded-full px-2.5 py-1 border-b-2 active:border-b-0 transition-all
                      ${isSelected ? 'bg-amber-100 border-amber-300' : 'bg-stone-50 border-stone-200 hover:bg-amber-50 hover:border-amber-200'}`}>
                    {emoji}
                  </button>
                );
              })}
              {profile.ecoReactions?.[verse.reference] && (
                <span className="text-[10px] text-stone-400 italic ml-1">
                  {ECO_EMOJIS.find(e => e.emoji === profile.ecoReactions?.[verse.reference])?.label}
                </span>
              )}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// NOTES SECTION (tab dedicada)
// ══════════════════════════════════════════════════════════════
function NotesSection({ bookId, bookName, colorClass, initialContext, onClearContext, onNavigateToChapter }: {
  bookId: string; bookName: string; colorClass: string;
  initialContext: NoteContext | null; onClearContext: () => void;
  onNavigateToChapter: (ch: string | number) => void;
}) {
  const { profile, userId, addNote: addGamificationNote } = useGamification();
  const { notes, addNote: saveNote, deleteNote, updateNote, toggleShare, setAllShared } = useNotes(bookId, userId);
  const [newNote, setNewNote] = useState('');
  const [selectedColor, setSelectedColor] = useState(NOTE_COLORS[0].id);
  const [currentContext, setCurrentContext] = useState<NoteContext | null>(initialContext);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [editingColor, setEditingColor] = useState(NOTE_COLORS[0].id);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [friendNotes, setFriendNotes] = useState<any[]>([]);

  const baseColor  = colorClass.split(' ')[0];
  const textColor  = colorClass.split(' ').find(c => c.startsWith('text-')) || 'text-stone-900';
  const borderColor = colorClass.split(' ').find(c => c.startsWith('border-')) || 'border-stone-200';

  useEffect(() => { if (initialContext) setCurrentContext(initialContext); }, [initialContext]);

  useEffect(() => {
    if (profile.email) sharingService.getSharedNotes(profile.email, bookId).then(setFriendNotes).catch(() => {});
  }, [profile.email, bookId]);

  const handleSave = () => {
    if (!newNote.trim()) return;
    saveNote(newNote.trim(), selectedColor, currentContext || undefined);
    addGamificationNote();
    setNewNote(''); setSelectedColor(NOTE_COLORS[0].id);
    setCurrentContext(null); onClearContext();
  };

  const handleSaveEdit = (id: string) => {
    if (editingText.trim()) updateNote(id, editingText.trim(), editingColor);
    setEditingNoteId(null); setEditingText('');
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id); setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleShare = async (noteId: string) => {
    const isShared = toggleShare(noteId);
    if (profile.email) {
      const note = notes.find(n => n.id === noteId);
      if (isShared) await sharingService.shareNote(profile.email, noteId, note);
      else await sharingService.unshareNote(profile.email, noteId);
    }
  };

  const allShared = notes.length > 0 && notes.every(n => n.isShared);

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-wider text-stone-400">✍️ Anotações — {bookName}</p>
        {notes.length > 0 && (
          <button onClick={() => { setAllShared(!allShared); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-black border-b-2 transition-all
              ${allShared ? 'bg-indigo-100 border-indigo-300 text-indigo-700' : 'bg-stone-100 border-stone-200 text-stone-500'}`}>
            <Share2 size={11} className={allShared ? 'fill-indigo-600' : ''} />
            {allShared ? 'Compartilhando' : 'Compartilhar'}
          </button>
        )}
      </div>

      {/* Nova nota */}
      <div className={`rounded-3xl border-2 overflow-hidden shadow-sm ${NOTE_COLORS.find(c=>c.id===selectedColor)?.class||NOTE_COLORS[0].class}`}>
        {currentContext && (
          <div className="flex items-center justify-between bg-white/60 px-5 py-2.5 border-b border-stone-200/50">
            <span className="text-xs font-bold text-indigo-700 flex items-center gap-1.5">
              <MapPin size={12}/> Cap. {currentContext.chapter} — {currentContext.chapterTitle}
            </span>
            <button onClick={() => { setCurrentContext(null); onClearContext(); }} className="p-1 rounded-full hover:bg-stone-200/50 text-stone-400">
              <X size={13}/>
            </button>
          </div>
        )}
        <div className="px-5 pt-4 pb-3">
          <textarea value={newNote} onChange={e => setNewNote(e.target.value)}
            placeholder="O que Deus falou ao seu coração neste livro?"
            className="w-full h-28 bg-transparent resize-none focus:outline-none placeholder:text-stone-400 text-stone-800 text-sm leading-relaxed" />
        </div>
        <div className="flex items-center justify-between px-5 py-3 border-t border-stone-200/40">
          <div className="flex items-center gap-1.5">
            <Palette size={13} className="text-stone-400" />
            {NOTE_COLORS.map(c => (
              <button key={c.id} onClick={() => setSelectedColor(c.id)}
                className={`w-5 h-5 rounded-full border-2 transition-transform ${c.class} ${selectedColor===c.id?'scale-125 border-stone-400':'border-transparent'}`} />
            ))}
          </div>
          <DuoButton size="sm" color="stone" onClick={handleSave} disabled={!newNote.trim()}>
            <Sparkles size={13}/> Salvar (+25 XP)
          </DuoButton>
        </div>
      </div>

      {/* Lista de notas */}
      {notes.length === 0 ? (
        <div className="text-center py-14 text-stone-400 bg-white border-2 border-dashed border-stone-200 rounded-3xl">
          <FileText size={28} className="mx-auto mb-2 opacity-30"/>
          <p className="text-sm font-bold text-stone-500">Nenhuma anotação ainda</p>
          <p className="text-xs mt-1">Escreva sua primeira reflexão sobre {bookName}</p>
        </div>
      ) : notes.map(note => {
        const noteColorClass = NOTE_COLORS.find(c=>c.id===(editingNoteId===note.id?editingColor:note.color))?.class||NOTE_COLORS[0].class;
        return (
          <div key={note.id} className={`rounded-3xl border-2 overflow-hidden shadow-sm group ${noteColorClass}`}>
            {editingNoteId === note.id ? (
              <div className="p-5 space-y-3">
                <textarea autoFocus value={editingText} onChange={e=>setEditingText(e.target.value)} rows={4}
                  className="w-full resize-none text-stone-800 text-sm focus:outline-none bg-white/60 p-3 rounded-2xl border border-stone-200/50" />
                <div className="flex items-center justify-between">
                  <div className="flex gap-1">
                    {NOTE_COLORS.map(c=>(
                      <button key={c.id} onClick={()=>setEditingColor(c.id)}
                        className={`w-5 h-5 rounded-full border-2 ${c.class} ${editingColor===c.id?'scale-125 border-stone-400':'border-transparent'}`}/>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={()=>{setEditingNoteId(null);setEditingText('');}}
                      className="px-3 py-1.5 rounded-xl text-xs text-stone-500 hover:bg-stone-200/50">Cancelar</button>
                    <DuoButton size="sm" color="stone" onClick={()=>handleSaveEdit(note.id)} disabled={!editingText.trim()}>
                      <Check size={13}/> Salvar
                    </DuoButton>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-5">
                {note.context && (
                  <button onClick={()=>onNavigateToChapter(note.context!.chapter!)}
                    className="mb-3 flex items-center gap-1.5 bg-white/70 hover:bg-white px-3 py-1.5 rounded-xl text-[11px] font-bold text-stone-600 border border-stone-200/50 w-fit">
                    <MapPin size={10}/> Cap. {note.context.chapter}: {note.context.chapterTitle} <ArrowRight size={10}/>
                  </button>
                )}
                <p className="text-stone-800 text-sm leading-relaxed whitespace-pre-wrap">{note.text}</p>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-stone-200/50">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-stone-400">
                      {new Date(note.createdAt).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'})}
                    </span>
                    <button onClick={()=>handleToggleShare(note.id)}
                      className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-black border-b-2 active:border-b-0 ${note.isShared?'bg-indigo-100 border-indigo-300 text-indigo-700':'bg-stone-100 border-stone-200 text-stone-400'}`}>
                      <Share2 size={9}/>{note.isShared?'COMPARTILHADO':'COMPARTILHAR'}
                    </button>
                  </div>
                  <div className="flex gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all">
                    <button onClick={()=>handleCopy(note.id,note.text)} className="p-1.5 text-stone-400 hover:text-stone-700 rounded">
                      {copiedId===note.id?<Check size={13} className="text-green-500"/>:<Copy size={13}/>}
                    </button>
                    <button onClick={()=>{setEditingNoteId(note.id);setEditingText(note.text);setEditingColor(note.color||'default');}}
                      className="p-1.5 text-stone-400 hover:text-stone-700 rounded"><Pencil size={13}/></button>
                    <button onClick={()=>deleteNote(note.id)} className="p-1.5 text-red-400 hover:text-red-600 rounded"><Trash2 size={13}/></button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Notas de amigos */}
      {friendNotes.length > 0 && (
        <div className="mt-6 space-y-3">
          <div className="flex items-center gap-2 px-1">
            <Users size={14} className="text-indigo-500" />
            <p className="text-xs font-black uppercase tracking-wider text-stone-400">Notas de Amigos</p>
          </div>
          {friendNotes.map(note => (
            <div key={note.id} className="bg-white border-2 border-indigo-100 rounded-3xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-sm border border-indigo-200 overflow-hidden">
                  {note.ownerAvatarUrl
                    ? <img src={note.ownerAvatarUrl} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer"/>
                    : AVATARS.find(a=>a.id===note.ownerAvatarId)?.emoji||'👤'}
                </div>
                <div>
                  <p className="font-black text-stone-900 text-xs">{note.ownerName}</p>
                  <p className="text-[10px] text-indigo-500 font-bold">COMPARTILHOU COM VOCÊ</p>
                </div>
              </div>
              <p className="text-stone-700 text-sm leading-relaxed">{note.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
