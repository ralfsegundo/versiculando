import { useState, useEffect, useRef } from 'react';
import { BIBLE_BOOKS, GROUP_COLORS, GROUP_THEMES, BEGINNER_PATH } from '../constants';
import { generateBookSummary, BookData, MindMapData } from '../services/bookData';
import { ArrowLeft, Map, List, BookOpen, Search, FileText, Clock, Heart, Lightbulb, Key, Hash, Users, CheckCircle2, Trash2, Navigation, Pencil, Palette, Copy, Sparkles, Check, MapPin, X, ArrowRight, Share2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useGamification, AVATARS } from '../services/gamification';
import { useNotes, NoteContext } from '../services/notes';
import { sharingService } from '../services/sharingService';

interface BookDetailProps {
  bookId: string;
  onBack: () => void;
}

// ── Skeleton Screen ───────────────────────────────────────────
// Exibido enquanto os dados carregam — dá sensação de velocidade
function BookDetailSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Tab bar skeleton */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {[120, 100, 90, 110, 80].map((w, i) => (
          <div key={i} className="h-9 rounded-full bg-stone-200 flex-shrink-0" style={{ width: w }} />
        ))}
      </div>

      {/* Hero card skeleton */}
      <div className="rounded-3xl bg-stone-100 border border-stone-200 p-6 space-y-4">
        <div className="h-5 w-1/3 rounded-full bg-stone-200" />
        <div className="space-y-2">
          <div className="h-3 rounded-full bg-stone-200 w-full" />
          <div className="h-3 rounded-full bg-stone-200 w-5/6" />
          <div className="h-3 rounded-full bg-stone-200 w-4/6" />
        </div>
        {/* Tags row */}
        <div className="flex gap-2 flex-wrap pt-1">
          {[80, 100, 70, 90].map((w, i) => (
            <div key={i} className="h-7 rounded-full bg-stone-200" style={{ width: w }} />
          ))}
        </div>
      </div>

      {/* Content cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="rounded-2xl bg-stone-100 border border-stone-200 p-5 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-stone-200" />
              <div className="h-4 w-24 rounded-full bg-stone-200" />
            </div>
            <div className="space-y-2">
              <div className="h-3 rounded-full bg-stone-200 w-full" />
              <div className="h-3 rounded-full bg-stone-200 w-4/5" />
            </div>
          </div>
        ))}
      </div>

      {/* Bottom action skeleton */}
      <div className="flex justify-center pt-2">
        <div className="h-12 w-48 rounded-full bg-stone-200" />
      </div>
    </div>
  );
}

export default function BookDetail({ bookId, onBack }: BookDetailProps) {
  const { addPoints, markBookCompleted, markBookVisited, markChapterRead, profile, addNote, userId } = useGamification();
  const book = BIBLE_BOOKS.find(b => b.id === bookId);
  const [data, setData] = useState<BookData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'mindmap' | 'timeline' | 'chapters' | 'search' | 'notes'>('mindmap');
  const [initialNoteContext, setInitialNoteContext] = useState<NoteContext | null>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  const colorClass = book ? GROUP_COLORS[book.group] : 'bg-stone-100 text-stone-900 border-stone-200';
  const textColor = colorClass.split(' ').find(c => c.startsWith('text-')) || 'text-stone-900';

  const handleAnotarCapitulo = (chapter: string | number, title: string) => {
    setInitialNoteContext({ chapter, chapterTitle: title });
    setActiveTab('notes');
  };

  const handleNavigateToChapter = (chapter: string | number) => {
    setActiveTab('chapters');
    setTimeout(() => {
      const element = document.getElementById(`chapter-${chapter}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('ring-4', 'ring-stone-400', 'transition-all', 'rounded-[2rem]');
        setTimeout(() => element.classList.remove('ring-4', 'ring-stone-400'), 2000);
      }
    }, 100);
  };

  const isGpsBook = BEGINNER_PATH.some(step => step.books.includes(bookId));

  useEffect(() => {
    if (!isGpsBook && !localStorage.getItem(`${userId}_seen_free_exploration_tooltip`)) {
      const timer = setTimeout(() => {
        setShowTooltip(true);
        localStorage.setItem(`${userId}_seen_free_exploration_tooltip`, 'true');
        
        // Auto hide after 3 seconds
        setTimeout(() => {
          setShowTooltip(false);
        }, 3000);
      }, 1500); // Show shortly after loading
      
      return () => clearTimeout(timer);
    }
  }, [isGpsBook]);
  const hasVisited = useRef(false);

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
            addPoints(10, `Visitou o livro ${book.name}`);
            hasVisited.current = true;
          }
        }
      })
      .catch(err => {
        console.error(err);
        if (isMounted) {
          setError('Ocorreu um erro ao gerar o resumo. Por favor, tente novamente.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [book, addPoints]);

  if (!book) return <div>Livro não encontrado</div>;

  const theme = GROUP_THEMES[book.group] || GROUP_THEMES['Pentateuco'];

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-stone-900 font-sans flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-14 md:h-16 flex items-center justify-between">
          <button 
            onClick={onBack}
            className="flex items-center gap-2 text-stone-500 hover:text-stone-900 transition-colors p-2 -ml-2 rounded-lg active:bg-stone-100"
          >
            <ArrowLeft size={20} />
            <span className="hidden sm:inline font-medium">Voltar</span>
          </button>
          
          <div className="flex items-center gap-2 md:gap-3">
            <span className={`hidden sm:inline-block px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${colorClass.split('hover:')[0]}`}>
              {book.group}
            </span>
            <h1 className="text-lg md:text-xl font-serif font-bold truncate max-w-[200px] sm:max-w-none">{book.name}</h1>
          </div>
          
          <div className="flex items-center w-[72px] sm:w-[88px]">
            {/* Empty div to balance the header (same width as the back button) */}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 md:py-8">
        {loading ? (
          <BookDetailSkeleton />
        ) : error ? (
          <div className="bg-red-50 text-red-800 p-6 rounded-2xl border border-red-200 text-center">
            <p>{error}</p>
            <button 
              onClick={() => {
                setLoading(true);
                setError('');
                generateBookSummary(book.name, book.chapters).then(setData).catch(() => setError('Erro novamente.')).finally(() => setLoading(false));
              }}
              className="mt-4 px-4 py-2 bg-red-100 hover:bg-red-200 rounded-lg font-medium transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        ) : data ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 md:space-y-8"
          >
            {/* Tab Content */}
            <div>
              {activeTab === 'mindmap' && <VisualMindMap data={data.mindmap} book={book} theme={theme} onNavigateToChapter={handleNavigateToChapter} />}
              {activeTab === 'timeline' && <TimelineGrid timeline={data.timeline} bookName={book.name} colorClass={colorClass} />}
              {activeTab === 'chapters' && <ChapterList chapters={data.chapters} colorClass={colorClass} onAnotar={handleAnotarCapitulo} bookId={book.id} readChapters={profile.readChapters?.[book.id] || []} onMarkChapterRead={(chapterNum) => markChapterRead(book.id, chapterNum, data.chapters.length)} onMarkAllChaptersRead={() => { data.chapters.forEach(ch => { const n = typeof ch.chapter === 'string' ? parseInt(ch.chapter) : ch.chapter as number; if (!(profile.readChapters?.[book.id] || []).includes(n)) markChapterRead(book.id, n, data.chapters.length); }); }} />}
              {activeTab === 'search' && <MainVersesGrid verses={data.mainVerses} bookName={book.name} colorClass={colorClass} />}
              {activeTab === 'notes' && <NotesSection bookId={book.id} bookName={book.name} colorClass={colorClass} initialContext={initialNoteContext} onClearContext={() => setInitialNoteContext(null)} onNavigateToChapter={handleNavigateToChapter} />}
            </div>

            {/* Gamification Actions */}
            <div className="mt-12 pt-8 border-t border-stone-200 flex justify-center pb-12 relative">
              {(() => {
                const totalChapters = data.chapters.length;
                const readCount = (profile.readChapters?.[book.id] || []).length;
                const allRead = readCount >= totalChapters;
                const progressPct = totalChapters > 0 ? Math.round((readCount / totalChapters) * 100) : 0;

                return profile.completedBooks.includes(book.id) ? (
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex items-center gap-2 text-stone-500 bg-stone-100 px-8 py-4 rounded-full font-bold text-lg border border-stone-200 cursor-default">
                      <CheckCircle2 size={24} />
                      Concluído ✓
                    </div>
                    {profile.discipleCompletedBooks?.includes(book.id) && (
                      <div className="flex items-center gap-2 text-orange-600 bg-orange-50 px-4 py-2 rounded-full text-sm font-bold border border-orange-200">
                        <Navigation size={14} />
                        Concluído pela Trilha do Discípulo 🧭
                      </div>
                    )}
                    {isGpsBook && !profile.discipleCompletedBooks?.includes(book.id) && (
                      <button
                        onClick={() => { markBookCompleted(book.id, true); onBack(); }}
                        className="flex items-center gap-2 px-6 py-3 rounded-full font-bold text-sm bg-orange-500 hover:bg-orange-600 text-white shadow-md hover:shadow-lg transition-all"
                      >
                        <Navigation size={16} />
                        Reconquistar pela Trilha do Discípulo (+50 pts)
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-5 w-full max-w-sm">
                    {/* Progress bar */}
                    <div className="w-full">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-bold text-stone-600">Capítulos lidos</span>
                        <span className="text-sm font-bold text-stone-800">{readCount}/{totalChapters}</span>
                      </div>
                      <div className="w-full bg-stone-200 rounded-full h-3 overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${allRead ? 'bg-emerald-500' : 'bg-indigo-400'}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${progressPct}%` }}
                          transition={{ duration: 0.5, ease: 'easeOut' }}
                        />
                      </div>
                      {!allRead && (
                        <p className="text-xs text-stone-400 mt-1.5 text-center">
                          Marque os capítulos lidos na aba <button onClick={() => setActiveTab('chapters')} className="underline text-indigo-500 font-semibold">Capítulos</button> para desbloquear a conclusão
                        </p>
                      )}
                    </div>

                    {/* Completion button */}
                    <div className="relative">
                      <button
                        onClick={() => { if (allRead) { markBookCompleted(book.id, isGpsBook); onBack(); } }}
                        disabled={!allRead}
                        className={`flex items-center gap-2 px-8 py-4 rounded-full font-bold text-lg transition-all ${
                          allRead
                            ? isGpsBook
                              ? 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg hover:shadow-xl hover:-translate-y-1'
                              : 'bg-stone-900 hover:bg-stone-800 text-white shadow-lg hover:shadow-xl hover:-translate-y-1'
                            : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                        }`}
                      >
                        <CheckCircle2 size={24} />
                        {allRead
                          ? (isGpsBook ? 'Marcar como concluído (+100 pts) ✓' : 'Marcar como lido (+50 pts)')
                          : `Leia todos os capítulos (${progressPct}%)`}
                      </button>

                      {/* Free Exploration Tooltip - only show when all chapters read and not GPS book */}
                      <AnimatePresence>
                        {showTooltip && !isGpsBook && allRead && (
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-64 bg-white text-stone-800 text-sm p-4 rounded-2xl shadow-xl border border-stone-200 text-center z-50 cursor-pointer"
                            onClick={() => setShowTooltip(false)}
                          >
                            <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b border-r border-stone-200 rotate-45"></div>
                            <p className="relative z-10 font-medium">
                              <span className="text-amber-600 font-bold">Explorando livremente? Ótimo!</span><br/>
                              Siga a Trilha do Discípulo para ganhar o dobro de pontos.
                            </p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                );
              })()}
            </div>
            <MainNavigation baseColor={colorClass.split(' ')[0]} textColor={textColor} activeTab={activeTab} setActiveTab={setActiveTab} />
          </motion.div>
        ) : null}
      </main>
    </div>
  );
}

function MainVersesGrid({ verses, bookName, colorClass }: { verses: BookData['mainVerses'], bookName: string, colorClass: string }) {
  const baseColor = colorClass.split(' ')[0];
  const textColor = colorClass.split(' ').find(c => c.startsWith('text-')) || 'text-stone-900';
  const borderColor = colorClass.split(' ').find(c => c.startsWith('border-')) || 'border-stone-200';
  const { addFavorite, userId, addEcoReaction, profile } = useGamification();
  const [favorites, setFavorites] = useState<Record<string, boolean>>(() => {
    try {
      const stored = localStorage.getItem(`${userId}_bible_favorites`);
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
  });
  const [ecoOpen, setEcoOpen] = useState<string | null>(null);

  const ECO_EMOJIS = [
    { emoji: '🙏', label: 'Me tocou' },
    { emoji: '💡', label: 'Aprendi algo' },
    { emoji: '😢', label: 'Me consolou' },
    { emoji: '🔥', label: 'Me desafiou' },
  ];

  const handleFavorite = (reference: string) => {
    if (!favorites[reference]) {
      const updated = { ...favorites, [reference]: true };
      setFavorites(updated);
      localStorage.setItem(`${userId}_bible_favorites`, JSON.stringify(updated));
      addFavorite();
    } else {
      const updated = { ...favorites };
      delete updated[reference];
      setFavorites(updated);
      localStorage.setItem(`${userId}_bible_favorites`, JSON.stringify(updated));
    }
  };

  if (!verses || verses.length === 0) {
    return (
      <div className="text-center py-12 text-stone-500">
        Versículos principais não disponíveis para este livro.
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-stone-900 mb-4">
          Principais Versículos: {bookName}
        </h2>
        <p className="text-stone-600 text-lg">Os trechos mais marcantes e importantes do livro</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {verses.map((verse, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1 }}
            key={idx} 
            className="bg-white border border-stone-200 rounded-[2rem] p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow relative flex flex-col h-full"
          >
            <div className="flex items-center gap-4 mb-6 border-b border-stone-100 pb-5">
              <div className={`w-12 h-12 rounded-full ${baseColor} border ${borderColor} flex items-center justify-center shrink-0 shadow-inner text-2xl`}>
                {verse.emoji}
              </div>
              <h3 className={`font-sans text-sm md:text-base font-black uppercase tracking-[0.1em] leading-tight ${textColor} flex-1`}>
                {verse.reference}
              </h3>
              <button 
                onClick={() => handleFavorite(verse.reference)}
                className={`p-2 rounded-full transition-colors ${favorites[verse.reference] ? 'text-rose-700 bg-rose-50' : 'text-stone-300 hover:text-rose-700 hover:bg-rose-50'}`}
              >
                <Heart size={20} className={favorites[verse.reference] ? 'fill-rose-700' : ''} />
              </button>
            </div>
            
            <div className="flex-1 flex flex-col">
              <p className="text-xl md:text-2xl font-serif italic text-stone-800 leading-relaxed mb-6">
                "{verse.text}"
              </p>

              <div className="mt-auto bg-stone-50 p-4 rounded-2xl border border-stone-100">
                <p className="text-stone-600 text-sm leading-relaxed">
                  <span className="font-bold text-stone-800 mr-1">Significado:</span>
                  {verse.explanation}
                </p>
              </div>

              {/* Eco Reactions */}
              <div className="mt-3 flex items-center gap-1.5">
                {ECO_EMOJIS.map(({ emoji, label }) => {
                  const isSelected = profile.ecoReactions?.[verse.reference] === emoji;
                  return (
                    <button
                      key={emoji}
                      onClick={() => {
                        addEcoReaction(verse.reference, emoji);
                        setEcoOpen(null);
                      }}
                      title={label}
                      className={`text-base rounded-full px-2 py-0.5 border transition-all active:scale-95 ${
                        isSelected
                          ? 'bg-amber-100 border-amber-300 ring-1 ring-amber-300'
                          : 'bg-stone-50 border-stone-200 hover:border-amber-200 hover:bg-amber-50'
                      }`}
                    >
                      {emoji}
                    </button>
                  );
                })}
                {profile.ecoReactions?.[verse.reference] && (
                  <span className="text-[10px] text-stone-400 ml-1 italic">
                    {ECO_EMOJIS.find(e => e.emoji === profile.ecoReactions?.[verse.reference])?.label}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function VisualMindMap({ data, book, theme, onNavigateToChapter }: { data: MindMapData, book: typeof BIBLE_BOOKS[0], theme: any, onNavigateToChapter: (chapter: string | number) => void }) {
  // Use the site's base colors for a more organic feel instead of the harsh theme colors
  const baseColor = GROUP_COLORS[book.group].split(' ')[0]; // e.g., bg-amber-100
  const textColor = GROUP_COLORS[book.group].split(' ').find(c => c.startsWith('text-')) || 'text-stone-900';
  const borderColor = GROUP_COLORS[book.group].split(' ').find(c => c.startsWith('border-')) || 'border-stone-200';
  const [activeSection, setActiveSection] = useState('section-summary');
  const [noteDrawerOpen, setNoteDrawerOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteSaved, setNoteSaved] = useState(false);
  const [selectedColor, setSelectedColor] = useState(NOTE_COLORS[0].id);
  const { addNote: addGamificationNote, userId } = useGamification();
  const { notes, addNote: saveNote, deleteNote, updateNote } = useNotes(book.id, userId);
  const [pillsScroll, setPillsScroll] = useState({ left: false, right: true });

  const handlePillsScroll = () => {
    const el = pillsScrollRef.current;
    if (!el) return;
    setPillsScroll({
      left: el.scrollLeft > 8,
      right: el.scrollLeft < el.scrollWidth - el.clientWidth - 8,
    });
  };
  const noteTextareaRef = useRef<HTMLTextAreaElement>(null);

  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [editingColor, setEditingColor] = useState(NOTE_COLORS[0].id);
  const [fabVisible, setFabVisible] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleStartEdit = (note: { id: string; text: string; color?: string }) => {
    setEditingNoteId(note.id);
    setEditingText(note.text);
    setEditingColor(note.color || NOTE_COLORS[0].id);
  };

  const handleSaveEdit = (id: string) => {
    if (editingText.trim()) {
      updateNote(id, editingText.trim(), editingColor);
    }
    setEditingNoteId(null);
    setEditingText('');
  };

  const handleCancelEdit = () => {
    setEditingNoteId(null);
    setEditingText('');
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSaveNote = () => {
    if (noteText.trim()) {
      saveNote(noteText.trim(), selectedColor);
      addGamificationNote();
      setNoteText('');
      setSelectedColor(NOTE_COLORS[0].id);
      setNoteSaved(true);
      setTimeout(() => setNoteSaved(false), 2000);
    }
  };

  // Hide FAB when near bottom (where "Marcar como concluído" lives)
  useEffect(() => {
    const handleScroll = () => {
      const scrolledToBottom =
        window.innerHeight + window.scrollY >= document.body.scrollHeight - 180;
      setFabVisible(!scrolledToBottom);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Focus textarea when drawer opens
  useEffect(() => {
    if (noteDrawerOpen && noteTextareaRef.current) {
      setTimeout(() => noteTextareaRef.current?.focus(), 100);
    }
  }, [noteDrawerOpen]);

  return (
    <div className="font-sans max-w-5xl mx-auto">

      {/* ── FLOATING NOTE BUTTON ── */}
      <AnimatePresence>
        {!noteDrawerOpen && fabVisible && (
          <motion.button
            key="fab"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setNoteDrawerOpen(true)}
            className={`fixed bottom-[5.5rem] xl:bottom-6 right-4 z-30 flex items-center justify-center w-14 h-14 rounded-full shadow-xl ${baseColor} ${textColor} border-2 ${borderColor}`}
            aria-label="Adicionar anotação"
          >
            <FileText size={24} />
            {notes.length > 0 && (
              <span className={`absolute -top-1 -right-1 w-5 h-5 rounded-full bg-white ${textColor} text-[10px] font-black flex items-center justify-center border ${borderColor} shadow-sm`}>
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
            {/* Backdrop */}
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
              onClick={() => setNoteDrawerOpen(false)}
            />

            {/* Drawer panel */}
            <motion.div
              key="drawer"
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="fixed bottom-0 left-0 right-0 z-[60] bg-white rounded-t-[2rem] shadow-2xl border-t border-stone-200 flex flex-col"
              style={{ maxHeight: '85vh' }}
            >
              {/* Handle */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-stone-200" />
              </div>

              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-full ${baseColor} border ${borderColor} flex items-center justify-center`}>
                    <FileText size={16} className={textColor} />
                  </div>
                  <div>
                    <h3 className="font-bold text-stone-900 text-base leading-tight">Minhas Anotações</h3>
                    <p className="text-stone-400 text-xs">{book.name} · {notes.length} nota{notes.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <button
                  onClick={() => setNoteDrawerOpen(false)}
                  className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500 transition-colors text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 overscroll-contain">

                {/* New note input */}
                <div className={`rounded-2xl border-2 p-4 transition-colors ${NOTE_COLORS.find(c => c.id === selectedColor)?.class || NOTE_COLORS[0].class} ${noteText ? borderColor : 'border-stone-200'}`}>
                  <textarea
                    ref={noteTextareaRef}
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    placeholder={`O que você aprendeu em ${book.name}?`}
                    rows={3}
                    className="w-full resize-none text-stone-800 placeholder-stone-400 text-sm leading-relaxed focus:outline-none bg-transparent"
                  />
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-200/50">
                    <div className="flex items-center gap-2">
                      <Palette size={14} className="text-stone-400" />
                      <div className="flex gap-1">
                        {NOTE_COLORS.map(color => (
                          <button
                            key={color.id}
                            onClick={() => setSelectedColor(color.id)}
                            className={`w-5 h-5 rounded-full border-2 transition-transform ${color.class} ${selectedColor === color.id ? 'scale-125 border-stone-400' : 'border-transparent hover:scale-110'}`}
                          />
                        ))}
                      </div>
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.95 }}
                      onClick={handleSaveNote}
                      disabled={!noteText.trim()}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-bold text-xs transition-all ${
                        noteText.trim()
                          ? `${baseColor} ${textColor} border ${borderColor} shadow-sm hover:shadow-md`
                          : 'bg-stone-100 text-stone-400 cursor-not-allowed'
                      }`}
                    >
                      {noteSaved ? (
                        <><CheckCircle2 size={13} /> Salvo!</>
                      ) : (
                        <><Sparkles size={13} /> Salvar</>
                      )}
                    </motion.button>
                  </div>
                </div>

                {/* Existing notes */}
                {notes.length === 0 ? (
                  <div className="text-center py-8 text-stone-400">
                    <FileText size={32} className="mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Nenhuma anotação ainda.<br />Escreva sua primeira reflexão acima!</p>
                  </div>
                ) : (
                  notes.map(note => {
                    const noteColorClass = NOTE_COLORS.find(c => c.id === (editingNoteId === note.id ? editingColor : note.color))?.class || NOTE_COLORS[0].class;
                    
                    return (
                      <motion.div
                        key={note.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`border rounded-2xl p-4 group relative transition-colors ${noteColorClass}`}
                      >
                        {editingNoteId === note.id ? (
                          /* ── EDIT MODE ── */
                          <>
                            <textarea
                              autoFocus
                              value={editingText}
                              onChange={e => setEditingText(e.target.value)}
                              rows={4}
                              className="w-full resize-none text-stone-800 text-sm leading-relaxed focus:outline-none bg-white/50 p-2 rounded-xl border border-stone-200/50"
                            />
                            <div className="flex items-center justify-between mt-3 pt-2 border-t border-stone-200/50">
                              <div className="flex items-center gap-2">
                                <Palette size={14} className="text-stone-400" />
                                <div className="flex gap-1">
                                  {NOTE_COLORS.map(color => (
                                    <button
                                      key={color.id}
                                      onClick={() => setEditingColor(color.id)}
                                      className={`w-5 h-5 rounded-full border-2 transition-transform ${color.class} ${editingColor === color.id ? 'scale-125 border-stone-400' : 'border-transparent hover:scale-110'}`}
                                    />
                                  ))}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={handleCancelEdit}
                                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-stone-500 hover:bg-stone-200/50 transition-colors"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={() => handleSaveEdit(note.id)}
                                  disabled={!editingText.trim()}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${editingText.trim() ? `bg-stone-900 text-white` : 'bg-stone-200 text-stone-400 cursor-not-allowed'}`}
                                >
                                  <CheckCircle2 size={13} /> Salvar
                                </button>
                              </div>
                            </div>
                          </>
                        ) : (
                          /* ── VIEW MODE ── */
                          <>
                            {note.context && (
                              <button
                                onClick={() => { setNoteDrawerOpen(false); onNavigateToChapter(note.context!.chapter!); }}
                                className="mb-3 flex items-center gap-1.5 bg-white/60 hover:bg-white text-stone-600 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-colors w-fit border border-stone-200/50 shadow-sm group/badge"
                              >
                                <MapPin size={10} className="text-stone-400 group-hover/badge:text-stone-600 transition-colors" />
                                Cap. {note.context.chapter}: {note.context.chapterTitle}
                                <ArrowRight size={10} className="ml-0.5 opacity-40 group-hover/badge:opacity-100 group-hover/badge:translate-x-0.5 transition-all" />
                              </button>
                            )}
                            <p className="text-stone-800 text-sm leading-relaxed whitespace-pre-wrap">{note.text}</p>
                            <div className="flex items-center justify-between mt-3 pt-2 border-t border-stone-200/50">
                              <span className="text-[10px] text-stone-400">
                                {new Date(note.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                              <div className="flex items-center gap-1 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all">
                                <button
                                  onClick={() => handleCopy(note.id, note.text)}
                                  className="p-1.5 text-stone-400 hover:text-stone-700 transition-colors rounded hover:bg-stone-200/50"
                                  title="Copiar texto"
                                >
                                  {copiedId === note.id ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
                                </button>
                                <button
                                  onClick={() => handleStartEdit(note)}
                                  className="p-1.5 text-stone-400 hover:text-stone-700 transition-colors rounded hover:bg-stone-200/50"
                                >
                                  <Pencil size={13} />
                                </button>
                                <button
                                  onClick={() => deleteNote(note.id)}
                                  className="p-1.5 text-red-400 hover:text-red-600 transition-colors rounded hover:bg-red-50"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </motion.div>
                    );
                  })
                )}

                <div className="h-4" />
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Header Section */}
      <div className="text-center mb-8 md:mb-16">
        <div className="inline-flex items-center justify-center gap-2 text-[9px] md:text-xs font-black tracking-[0.2em] uppercase text-stone-400 mb-4 bg-white px-4 py-2 rounded-full shadow-sm border border-stone-200">
          <span>{book.testament === 'VT' ? 'Antigo Testamento' : 'Novo Testamento'}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-stone-300"></span>
          <span className={textColor}>{book.group}</span>
        </div>

        <h1 className="text-4xl sm:text-5xl md:text-7xl lg:text-[5.5rem] font-serif font-bold text-stone-900 mb-4 leading-none tracking-tighter">
          {book.name}
        </h1>
        <p className="text-stone-500 text-base sm:text-lg md:text-2xl font-serif italic leading-relaxed max-w-2xl mx-auto px-4">
          "{data.meaning}"
        </p>
      </div>

      {/* Info Pills - Scrollable on mobile */}
      <div className="relative mb-8 md:mb-16">
        <div
          ref={pillsScrollRef}
          onScroll={handlePillsScroll}
          className="flex overflow-x-auto hide-scrollbar gap-2 md:flex-wrap md:justify-center md:gap-4 pb-1"
        >
          <InfoPill label="Autor" value={data.author} />
          <InfoPill label="Capítulos" value={book.chapters.toString()} />
          <InfoPill label="Abrev." value={data.abbreviation} />
          <InfoPill label="Versículos" value={data.verses} />
          <InfoPill label="Período" value={data.period} />
          <InfoPill label="Local" value={data.location} />
          <InfoPill label="Ordem" value={data.order} />
        </div>
        {/* Fade esquerda — aparece ao rolar */}
        <div className={`absolute left-0 top-0 bottom-1 w-10 bg-gradient-to-r from-[#fdfbf7] to-transparent pointer-events-none md:hidden transition-opacity duration-200 ${pillsScroll.left ? 'opacity-100' : 'opacity-0'}`} />
        {/* Fade direita — indica mais conteúdo */}
        <div className={`absolute right-0 top-0 bottom-1 w-10 bg-gradient-to-l from-[#fdfbf7] to-transparent pointer-events-none md:hidden transition-opacity duration-200 ${pillsScroll.right ? 'opacity-100' : 'opacity-0'}`} />
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-8 relative pb-24 xl:pb-0">
        
        {/* Hero Quote Card - Full Width */}
        <div className={`col-span-1 md:col-span-12 ${baseColor} bg-opacity-40 rounded-2xl md:rounded-[3rem] p-5 md:p-12 flex flex-col md:flex-row items-center gap-5 md:gap-12 border border-white shadow-sm relative overflow-hidden`}>
           <div className={`absolute -top-20 -right-20 w-64 h-64 rounded-full ${baseColor} opacity-60 blur-3xl`}></div>
           
           <div className={`w-20 h-20 md:w-48 md:h-48 bg-white rounded-full shadow-xl flex items-center justify-center shrink-0 z-10 border-4 border-white`}>
             <BookOpen className={`w-8 h-8 md:w-20 md:h-20 ${textColor} opacity-60`} />
           </div>

           <div className="flex-1 text-center md:text-left z-10">
             <div className="text-4xl md:text-7xl text-stone-400 font-serif leading-none mb-1 opacity-50">"</div>
             <p className="text-xl md:text-4xl font-serif italic font-medium text-stone-800 mb-4 leading-snug">
               {data.quote}
             </p>
             <p className={`text-xs font-black uppercase tracking-[0.2em] ${textColor}`}>
               — {data.quoteReference}
             </p>
           </div>
        </div>

        {/* Summary - 8 cols on desktop */}
        <div id="section-summary" className="col-span-1 md:col-span-12 lg:col-span-8 scroll-mt-24">
          <OrganicBox title="Resumo do Livro" baseColor={baseColor} borderColor={borderColor} isActive={activeSection === 'section-summary'}>
            <p className="text-stone-700 text-base md:text-lg leading-relaxed">
              {data.summary}
            </p>
          </OrganicBox>
        </div>

        {/* Historical Context - 4 cols on desktop */}
        <div id="section-history" className="col-span-1 md:col-span-12 lg:col-span-4 scroll-mt-24">
          <OrganicBox title="Contexto Histórico" baseColor={baseColor} borderColor={borderColor} isActive={activeSection === 'section-history'}>
            <p className="text-stone-700 text-base md:text-lg leading-relaxed">
              {data.historicalContext}
            </p>
          </OrganicBox>
        </div>

        {/* Practical Application - 8 cols on desktop */}
        <div id="section-application" className="col-span-1 md:col-span-12 lg:col-span-8 scroll-mt-24">
          <OrganicBox title="Aplicação Prática & Oração" baseColor={baseColor} borderColor={borderColor} isActive={activeSection === 'section-application'}>
            <p className="text-stone-700 text-base md:text-lg leading-relaxed">
              {data.practicalApplication}
            </p>
          </OrganicBox>
        </div>

        {/* Curiosity - 4 cols on desktop */}
        <div id="section-curiosity" className="col-span-1 md:col-span-12 lg:col-span-4 scroll-mt-24">
          <OrganicBox title="Curiosidade" baseColor={baseColor} borderColor={borderColor} isActive={activeSection === 'section-curiosity'}>
            <div className="bg-stone-50 p-5 rounded-2xl border border-stone-100 text-stone-700 text-base md:text-lg leading-relaxed">
              {data.curiosity}
            </div>
          </OrganicBox>
        </div>

        {/* Keywords - 4 cols on desktop */}
        <div id="section-keywords" className="col-span-1 md:col-span-12 lg:col-span-4 scroll-mt-24">
          <OrganicBox title="Palavras-Chave" baseColor={baseColor} borderColor={borderColor} isActive={activeSection === 'section-keywords'}>
            <div className="flex flex-wrap gap-2.5">
              {data.keywords.map((kw, idx) => (
                <span key={idx} className={`px-4 py-2 rounded-full text-sm font-bold tracking-wide ${baseColor} ${textColor} border ${borderColor} shadow-sm`}>
                  {kw}
                </span>
              ))}
            </div>
          </OrganicBox>
        </div>

        {/* Themes - 8 cols on desktop */}
        <div id="section-themes" className="col-span-1 md:col-span-12 lg:col-span-8 scroll-mt-24">
          <OrganicBox title="Principais Temas" baseColor={baseColor} borderColor={borderColor} isActive={activeSection === 'section-themes'}>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
              {data.themes.map((themeItem, idx) => (
                <li key={idx} className={`flex items-start gap-4 p-4 rounded-2xl bg-stone-50 border border-stone-100 hover:border-stone-200 transition-colors h-full ${idx === data.themes.length - 1 && data.themes.length % 2 !== 0 ? 'sm:col-span-2' : ''}`}>
                  <div className={`w-2.5 h-2.5 rounded-full ${textColor.replace('text-', 'bg-')} mt-1.5 shrink-0 opacity-70 shadow-sm`}></div>
                  <span className="text-stone-700 text-base leading-relaxed break-words">{themeItem}</span>
                </li>
              ))}
            </ul>
          </OrganicBox>
        </div>

        {/* Characters - 12 cols on desktop */}
        <div id="section-characters" className="col-span-1 md:col-span-12 lg:col-span-12 scroll-mt-24 mt-4">
          <div className={`bg-white border rounded-[2.5rem] p-8 md:p-12 transition-all duration-500 relative shadow-sm ${activeSection === 'section-characters' ? `${borderColor} shadow-md` : 'border-stone-200 hover:shadow-md'}`}>
            {/* Decorative background element */}
            <div className={`absolute top-0 right-0 w-64 h-64 rounded-full ${baseColor} opacity-20 blur-3xl pointer-events-none`}></div>
            
            <div className="flex flex-col md:flex-row md:items-center gap-6 mb-10 border-b border-stone-100 pb-8 relative z-10">
              <div className={`w-16 h-16 rounded-full ${baseColor} border-2 ${borderColor} flex items-center justify-center shrink-0 shadow-inner`}>
                <Users className={`w-8 h-8 ${textColor}`} />
              </div>
              <div>
                <h3 className="font-serif text-3xl md:text-4xl font-bold text-stone-900 mb-2">Personagens Chave</h3>
                <p className="text-stone-500 text-lg">As figuras centrais na narrativa deste livro</p>
              </div>
            </div>
            
            <div className="flex flex-wrap justify-center items-stretch gap-6 relative z-10">
              {data.names.map((person, idx) => (
                <div key={idx} className="w-full sm:w-[calc(50%-0.75rem)] lg:w-[calc(33.333%-1rem)] bg-stone-50 p-6 rounded-2xl border border-stone-200 hover:border-stone-300 shadow-sm hover:shadow-md transition-all flex flex-col relative overflow-hidden group">
                  <div className={`absolute top-0 left-0 w-full h-1 ${baseColor} opacity-70 group-hover:opacity-100 transition-opacity`}></div>
                  <span className="font-sans font-black text-stone-900 text-xl mb-3 block mt-1">{person.name}</span>
                  <span className="text-stone-600 text-base leading-relaxed block flex-1">{person.description}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}

function MainNavigation({ baseColor, textColor, activeTab, setActiveTab }: { baseColor: string, textColor: string, activeTab: string, setActiveTab: (s: any) => void }) {
  const mobileNavRef = useRef<HTMLDivElement>(null);

  const tabs = [
    { id: 'mindmap', label: 'Mapa', icon: <Map size={22} strokeWidth={activeTab === 'mindmap' ? 2.5 : 2} /> },
    { id: 'timeline', label: 'Linha', icon: <Clock size={22} strokeWidth={activeTab === 'timeline' ? 2.5 : 2} /> },
    { id: 'chapters', label: 'Capítulos', icon: <List size={22} strokeWidth={activeTab === 'chapters' ? 2.5 : 2} /> },
    { id: 'search', label: 'Versículos', icon: <Search size={22} strokeWidth={activeTab === 'search' ? 2.5 : 2} /> },
    { id: 'notes', label: 'Notas', icon: <FileText size={22} strokeWidth={activeTab === 'notes' ? 2.5 : 2} /> },
  ];

  return (
    <>
      {/* Desktop Floating Nav */}
      <div className="fixed right-4 top-1/2 -translate-y-1/2 z-40 hidden xl:flex flex-col gap-3 bg-white/80 backdrop-blur-md p-3 rounded-full shadow-lg border border-stone-200">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all group relative ${
              activeTab === tab.id ? `${baseColor} ${textColor} shadow-md` : 'text-stone-400 hover:bg-stone-100 hover:text-stone-700'
            }`}
            aria-label={tab.label}
          >
            {tab.icon}
            <span className="absolute right-full mr-4 px-3 py-1.5 bg-stone-800 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap">
              {tab.label}
              <span className="absolute top-1/2 -translate-y-1/2 -right-1 border-4 border-transparent border-l-stone-800"></span>
            </span>
          </button>
        ))}
      </div>

      {/* Mobile Bottom Nav — with labels */}
      <div 
        ref={mobileNavRef}
        className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-stone-200 pb-safe z-50 xl:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.06)]"
      >
        <div className="w-full flex justify-around items-center h-16 px-1">
          {tabs.map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`flex flex-col items-center justify-center flex-1 h-full transition-all active:scale-90 no-select ${
                  isActive ? textColor : 'text-stone-400'
                }`}
                aria-label={tab.label}
              >
                <div className={`flex items-center justify-center w-10 h-6 rounded-xl transition-all ${isActive ? baseColor + ' bg-opacity-30' : ''}`}>
                  {tab.icon}
                </div>
                <span className={`text-[9px] font-semibold mt-0.5 leading-none ${isActive ? '' : 'text-stone-400'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

function InfoPill({ label, value }: { label: string, value: string }) {
  return (
    <div className="flex flex-col items-center justify-center bg-stone-50 border-2 border-stone-200/60 rounded-xl px-3 py-2.5 min-w-[80px] md:min-w-[100px] shadow-sm hover:shadow-md hover:border-stone-300 transition-all shrink-0">
      <span className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.15em] text-stone-500 mb-1">{label}</span>
      <span className="text-xs md:text-sm font-sans font-bold text-stone-900 text-center">{value}</span>
    </div>
  );
}

function OrganicBox({ title, children, baseColor, borderColor, isActive }: { title: string, children: React.ReactNode, baseColor: string, borderColor: string, isActive?: boolean }) {
  return (
    <div className={`bg-white border rounded-[2rem] p-6 md:p-8 lg:p-10 transition-all duration-500 relative h-full ${isActive ? `${borderColor} shadow-md` : 'border-stone-200 shadow-sm hover:shadow-md'}`}>
      <div className="flex items-center gap-4 mb-6 border-b border-stone-100 pb-5">
        <div className={`w-10 h-10 rounded-full ${baseColor} border ${borderColor} flex items-center justify-center shrink-0 shadow-inner transition-transform duration-500 ${isActive ? 'scale-110' : ''}`}>
          <div className="w-2.5 h-2.5 rounded-full bg-white shadow-sm"></div>
        </div>
        <h3 className="font-sans text-sm md:text-base font-black uppercase tracking-[0.15em] text-stone-800">{title}</h3>
      </div>
      <div className="pt-2">
        {children}
      </div>
    </div>
  );
}

function TimelineGrid({ timeline, bookName, colorClass }: { timeline: BookData['timeline'], bookName: string, colorClass: string }) {
  const baseColor = colorClass.split(' ')[0]; // e.g., bg-purple-100
  const textColor = colorClass.split(' ').find(c => c.startsWith('text-')) || 'text-stone-900';
  const borderColor = colorClass.split(' ').find(c => c.startsWith('border-')) || 'border-stone-200';

  if (!timeline || timeline.length === 0) {
    return (
      <div className="text-center py-12 text-stone-500">
        Linha do tempo não disponível para este livro.
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-stone-900 mb-4">
          Linha do Tempo: {bookName}
        </h2>
        <p className="text-stone-600 text-lg">Os principais eventos em ordem cronológica</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
        {timeline.map((event, idx) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: idx * 0.1 }}
            key={idx} 
            className="bg-white border border-stone-200 rounded-[2rem] p-6 md:p-8 shadow-sm hover:shadow-md transition-shadow relative flex flex-col h-full"
          >
            <div className="flex items-center gap-4 mb-6 border-b border-stone-100 pb-5">
              <div className={`w-12 h-12 rounded-full ${baseColor} border ${borderColor} flex items-center justify-center shrink-0 shadow-inner`}>
                <span className={`font-sans font-black text-lg ${textColor} leading-none mt-0.5`}>{idx + 1}</span>
              </div>
              <h3 className="font-sans text-sm md:text-base font-black uppercase tracking-[0.1em] text-stone-800 leading-tight">
                {event.title}
              </h3>
            </div>
            
            <div className="flex-1 flex flex-col">
              <p className="text-stone-600 text-base leading-relaxed flex-1">
                {event.description}
              </p>

              <div className="mt-8 flex justify-end">
                <div className="text-5xl drop-shadow-sm bg-stone-50 w-20 h-20 rounded-[1.5rem] flex items-center justify-center border border-stone-100">
                  {event.emoji}
                </div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function ChapterCard({
  ch, idx, baseColor, textColor, isRead, onMarkChapterRead, bookId, chapterNum
}: {
  ch: BookData['chapters'][0];
  idx: number;
  baseColor: string;
  textColor: string;
  isRead: boolean;
  onMarkChapterRead: (n: number) => void;
  bookId: string;
  chapterNum: number;
  key?: any;
}) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [selectedColor, setSelectedColor] = useState(NOTE_COLORS[0].id);
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { addNote: addGamificationNote, userId } = useGamification();
  const { notes, addNote: saveNote } = useNotes(bookId, userId);

  // Notes for this specific chapter
  const chapterNotes = notes.filter(n => n.context?.chapter === chapterNum || n.context?.chapter === ch.chapter.toString());

  useEffect(() => {
    if (noteOpen && textareaRef.current) {
      setTimeout(() => textareaRef.current?.focus(), 150);
    }
  }, [noteOpen]);

  const handleSave = () => {
    if (!noteText.trim()) return;
    saveNote(noteText.trim(), selectedColor, { chapter: chapterNum, chapterTitle: ch.title as string });
    addGamificationNote();
    setNoteText('');
    setSelectedColor(NOTE_COLORS[0].id);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: Math.min(idx * 0.05, 0.5) }}
      className={`flex flex-col md:flex-row items-start gap-6 md:gap-12 ${idx % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}
    >
      {/* Chapter Number Circle */}
      <div className={`w-12 h-12 md:w-16 md:h-16 shrink-0 rounded-full flex items-center justify-center border-4 shadow-md z-10 px-1 transition-all duration-300 mt-6 ${isRead ? 'bg-emerald-500 border-emerald-300' : `${baseColor} border-white`}`}>
        {isRead
          ? <CheckCircle2 size={24} className="text-white" />
          : <span className={`font-sans font-black ${ch.chapter.toString().length > 4 ? 'text-xs md:text-sm tracking-tighter' : ch.chapter.toString().length > 2 ? 'text-sm md:text-base tracking-tight' : 'text-lg md:text-xl'} ${textColor} leading-none mt-0.5 whitespace-nowrap`}>{ch.chapter}</span>
        }
      </div>

      {/* Content Card */}
      <div id={`chapter-${ch.chapter}`} className={`rounded-[2rem] shadow-sm border flex-1 transition-all relative w-full overflow-hidden ${isRead ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-stone-200'} ${idx % 2 === 0 ? 'md:text-left' : 'md:text-right'}`}>
        {/* Connector Arrow for Desktop */}
        <div className={`hidden md:block absolute top-10 -translate-y-1/2 w-4 h-4 rotate-45 ${isRead ? 'bg-emerald-50 border-t border-l border-emerald-200' : 'bg-white border-t border-l border-stone-200'} ${idx % 2 === 0 ? '-left-2' : '-right-2 rotate-[225deg]'}`}></div>

        {/* Main content */}
        <div className="p-6 md:p-8">
          <h4 className="font-serif font-bold text-xl text-stone-900 mb-3">{ch.title}</h4>
          <p className="text-stone-600 text-base leading-relaxed">{ch.summary}</p>

          {/* Chapter notes preview */}
          {chapterNotes.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {chapterNotes.map(note => (
                <div key={note.id} className={`text-xs px-3 py-1.5 rounded-lg border text-stone-600 truncate max-w-[200px] ${NOTE_COLORS.find(c => c.id === note.color)?.class || NOTE_COLORS[0].class}`}>
                  ✍️ {note.text}
                </div>
              ))}
            </div>
          )}

          <div className={`mt-5 flex gap-3 flex-wrap ${idx % 2 === 0 ? 'justify-start' : 'md:justify-end justify-start'}`}>
            {/* Mark as read */}
            <button
              onClick={() => onMarkChapterRead(chapterNum)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border-2 border-b-4 transition-all active:border-b-2 active:translate-y-[2px] ${
                isRead
                  ? 'bg-emerald-50 border-emerald-300 text-emerald-700 hover:bg-emerald-100'
                  : 'bg-white border-stone-100 text-stone-600 hover:bg-stone-50 hover:border-stone-200'
              }`}
            >
              <CheckCircle2 size={15} className={isRead ? 'text-emerald-500' : 'text-stone-400'} />
              {isRead ? 'Lido ✓' : 'Marcar como lido'}
            </button>

            {/* Inline note toggle */}
            <button
              onClick={() => setNoteOpen(v => !v)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold border-2 border-b-4 transition-all active:border-b-2 active:translate-y-[2px] ${
                noteOpen
                  ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                  : 'bg-white border-stone-100 text-stone-600 hover:bg-stone-50 hover:border-stone-200'
              }`}
            >
              <Pencil size={15} className={noteOpen ? 'text-indigo-500' : 'text-stone-400'} />
              {chapterNotes.length > 0 ? `Anotações (${chapterNotes.length})` : 'Anotar'}
            </button>
          </div>
        </div>

        {/* Inline note drawer */}
        <AnimatePresence>
          {noteOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className={`border-t mx-0 px-6 md:px-8 py-6 ${isRead ? 'border-emerald-200 bg-emerald-50/60' : 'border-stone-100 bg-stone-50/60'}`}>
                {/* Context label */}
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-xl px-3 py-1.5 w-fit mb-4">
                  <MapPin size={12} />
                  Capítulo {ch.chapter} — {ch.title}
                </div>

                {/* Textarea */}
                <div className={`rounded-2xl p-4 border-2 mb-3 transition-colors ${NOTE_COLORS.find(c => c.id === selectedColor)?.class || NOTE_COLORS[0].class}`}>
                  <textarea
                    ref={textareaRef}
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSave(); }}
                    placeholder="O que Deus falou ao seu coração neste capítulo?"
                    className="w-full h-24 bg-transparent resize-none focus:outline-none placeholder:text-stone-400 text-stone-800 text-sm leading-relaxed"
                  />
                </div>

                {/* Color picker + save */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Palette size={14} className="text-stone-400" />
                    {NOTE_COLORS.map(color => (
                      <button
                        key={color.id}
                        onClick={() => setSelectedColor(color.id)}
                        className={`w-5 h-5 rounded-full border-2 transition-transform ${color.class} ${selectedColor === color.id ? 'scale-125 border-stone-400' : 'border-transparent hover:scale-110'}`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-stone-400">⌘↵ para salvar</span>
                    <button
                      onClick={handleSave}
                      disabled={!noteText.trim()}
                      className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                        saved
                          ? 'bg-emerald-500 text-white'
                          : 'bg-stone-900 hover:bg-stone-700 disabled:bg-stone-200 disabled:text-stone-400 text-white'
                      }`}
                    >
                      {saved ? <><Check size={14} /> Salvo!</> : <><Sparkles size={14} /> Salvar (+20 pts)</>}
                    </button>
                  </div>
                </div>

                {/* Existing notes for this chapter */}
                {chapterNotes.length > 0 && (
                  <div className="mt-4 space-y-2 border-t border-stone-200 pt-4">
                    <p className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">Suas anotações neste capítulo</p>
                    {chapterNotes.map(note => (
                      <div key={note.id} className={`rounded-xl px-4 py-3 border text-sm text-stone-700 leading-relaxed ${NOTE_COLORS.find(c => c.id === note.color)?.class || NOTE_COLORS[0].class}`}>
                        {note.text}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Empty space for desktop balancing */}
      <div className="hidden md:block flex-1"></div>
    </motion.div>
  );
}

function ChapterList({ chapters, colorClass, onAnotar, bookId, readChapters, onMarkChapterRead, onMarkAllChaptersRead }: {
  chapters: BookData['chapters'];
  colorClass: string;
  onAnotar: (chapter: string | number, title: string) => void;
  bookId: string;
  readChapters: number[];
  onMarkChapterRead: (chapterNum: number) => void;
  onMarkAllChaptersRead: () => void;
}) {
  const baseColor = colorClass.split(' ')[0];
  const textColor = colorClass.split(' ').find(c => c.startsWith('text-')) || 'text-stone-900';
  const readCount = readChapters.length;
  const total = chapters.length;
  const progressPct = total > 0 ? Math.round((readCount / total) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto relative px-4 md:px-0">
      <div className="text-center mb-8">
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-stone-900 mb-4">
          Resumo dos Capítulos
        </h2>
        <p className="text-stone-600 text-lg">Marque cada capítulo conforme você for lendo.</p>

        {/* Progress bar */}
        <div className="mt-6 max-w-xs mx-auto">
          <div className="flex justify-between text-sm font-bold text-stone-600 mb-1.5">
            <span>Progresso de leitura</span>
            <span>{readCount}/{total}</span>
          </div>
          <div className="w-full bg-stone-200 rounded-full h-3 overflow-hidden">
            <motion.div
              className={`h-full rounded-full ${progressPct === 100 ? 'bg-emerald-500' : 'bg-indigo-400'}`}
              initial={{ width: 0 }}
              animate={{ width: `${progressPct}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          {progressPct === 100 ? (
            <p className="text-emerald-600 font-bold text-sm mt-2">🎉 Todos os capítulos lidos! Marque o livro como concluído abaixo.</p>
          ) : total >= 10 && (
            <button
              onClick={onMarkAllChaptersRead}
              className="mt-3 text-xs font-bold text-indigo-500 hover:text-indigo-700 underline underline-offset-2 transition-colors"
            >
              Marcar todos como lidos de uma vez
            </button>
          )}
        </div>
      </div>

      {/* Vertical Timeline Line */}
      <div className="absolute left-[2.35rem] md:left-1/2 top-52 bottom-10 w-1 md:-ml-0.5 bg-stone-200 rounded-full"></div>

      <div className="space-y-12 relative z-10">
        {chapters.map((ch, idx) => {
          const chapterNum = typeof ch.chapter === 'string' ? parseInt(ch.chapter) : ch.chapter as number;
          const isRead = readChapters.includes(chapterNum);
          return (
            <ChapterCard
              key={idx}
              ch={ch}
              idx={idx}
              baseColor={baseColor}
              textColor={textColor}
              isRead={isRead}
              onMarkChapterRead={onMarkChapterRead}
              bookId={bookId}
              chapterNum={chapterNum}
            />
          );
        })}
      </div>
    </div>
  );
}

const NOTE_COLORS = [
  { id: 'default', class: 'bg-white border-stone-200' },
  { id: 'yellow', class: 'bg-yellow-50 border-yellow-200' },
  { id: 'blue', class: 'bg-blue-50 border-blue-200' },
  { id: 'green', class: 'bg-green-50 border-green-200' },
  { id: 'pink', class: 'bg-rose-50 border-rose-200' },
  { id: 'purple', class: 'bg-purple-50 border-purple-200' },
];

function NotesSection({ bookId, bookName, colorClass, initialContext, onClearContext, onNavigateToChapter }: { bookId: string, bookName: string, colorClass: string, initialContext: NoteContext | null, onClearContext: () => void, onNavigateToChapter: (chapter: string | number) => void }) {
  const { profile, userId, addNote: addGamificationNote } = useGamification();
  const { notes, addNote: saveNote, deleteNote, updateNote, toggleShare, setAllShared } = useNotes(bookId, userId);
  const [newNote, setNewNote] = useState('');
  const [selectedColor, setSelectedColor] = useState(NOTE_COLORS[0].id);
  const [currentContext, setCurrentContext] = useState<NoteContext | null>(initialContext);

  useEffect(() => {
    if (initialContext) {
      setCurrentContext(initialContext);
    }
  }, [initialContext]);
  
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [editingColor, setEditingColor] = useState(NOTE_COLORS[0].id);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [friendNotes, setFriendNotes] = useState<any[]>([]);

  useEffect(() => {
    if (profile.email) {
      loadFriendNotes();
    }
  }, [profile.email, bookId]);

  const loadFriendNotes = async () => {
    if (profile.email) {
      try {
        const shared = await sharingService.getSharedNotes(profile.email, bookId);
        setFriendNotes(shared);
      } catch (err) {
        console.error('Failed to load friend notes:', err);
      }
    }
  };

  const baseColor = colorClass.split(' ')[0];
  const textColor = colorClass.split(' ').find(c => c.startsWith('text-')) || 'text-stone-900';
  const borderColor = colorClass.split(' ').find(c => c.startsWith('border-')) || 'border-stone-200';

  const handleSave = () => {
    if (newNote.trim()) {
      saveNote(newNote.trim(), selectedColor, currentContext || undefined);
      addGamificationNote();
      setNewNote('');
      setSelectedColor(NOTE_COLORS[0].id);
      setCurrentContext(null);
      onClearContext();
    }
  };

  const handleStartEdit = (note: { id: string; text: string; color?: string }) => {
    setEditingNoteId(note.id);
    setEditingText(note.text);
    setEditingColor(note.color || NOTE_COLORS[0].id);
  };

  const handleSaveEdit = (id: string) => {
    if (editingText.trim()) updateNote(id, editingText.trim(), editingColor);
    setEditingNoteId(null);
    setEditingText('');
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleToggleShare = async (noteId: string) => {
    const isShared = toggleShare(noteId);
    if (profile.email) {
      if (isShared) {
        const note = notes.find(n => n.id === noteId);
        await sharingService.shareNote(profile.email, noteId, note);
      } else {
        await sharingService.unshareNote(profile.email, noteId);
      }
    }
  };

  const handleShareAll = async (shared: boolean) => {
    setAllShared(shared);
    if (profile.email) {
      if (shared) {
        await sharingService.shareNote(profile.email, 'ALL', undefined, undefined, true);
      } else {
        await sharingService.unshareNote(profile.email, 'ALL', true);
      }
    }
  };

  const allShared = notes.length > 0 && notes.every(n => n.isShared);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-stone-900 mb-4">
          Minhas Anotações: {bookName}
        </h2>
        <div className="flex flex-col items-center gap-4">
          <p className="text-stone-600 text-lg">Registre seus aprendizados, orações e reflexões.</p>
          
          {notes.length > 0 && (
            <button 
              onClick={() => handleShareAll(!allShared)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all border ${allShared ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300'}`}
            >
              <Share2 size={14} className={allShared ? 'fill-indigo-600' : ''} />
              {allShared ? 'Compartilhando tudo' : 'Compartilhar todas com amigos'}
            </button>
          )}
        </div>
      </div>

      <div className={`rounded-[2rem] p-6 md:p-8 shadow-sm border transition-colors mb-8 ${NOTE_COLORS.find(c => c.id === selectedColor)?.class || NOTE_COLORS[0].class}`}>
        {currentContext && (
          <div className="flex items-center justify-between bg-white/60 px-4 py-2.5 rounded-xl mb-4 border border-stone-200/50 shadow-sm">
            <span className="text-xs font-bold text-stone-600 flex items-center gap-2">
              <MapPin size={14} className="text-stone-400" />
              Anotando sobre: Capítulo {currentContext.chapter} - {currentContext.chapterTitle}
            </span>
            <button onClick={() => { setCurrentContext(null); onClearContext(); }} className="text-stone-400 hover:text-stone-600 transition-colors p-1 rounded-full hover:bg-stone-200/50">
              <X size={14} />
            </button>
          </div>
        )}
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="O que Deus falou ao seu coração neste livro?"
          className="w-full h-32 p-4 border border-stone-200/50 bg-white/50 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-stone-500 mb-4 placeholder:text-stone-400"
        />
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-2">
            <Palette size={16} className="text-stone-400" />
            <div className="flex gap-1.5">
              {NOTE_COLORS.map(color => (
                <button
                  key={color.id}
                  onClick={() => setSelectedColor(color.id)}
                  className={`w-6 h-6 rounded-full border-2 transition-transform ${color.class} ${selectedColor === color.id ? 'scale-125 border-stone-400' : 'border-transparent hover:scale-110'}`}
                  aria-label={`Cor ${color.id}`}
                />
              ))}
            </div>
          </div>
          
          <button
            onClick={handleSave}
            disabled={!newNote.trim()}
            className="w-full sm:w-auto bg-stone-900 hover:bg-stone-800 disabled:bg-stone-300 text-white px-6 py-3 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
          >
            <Sparkles size={18} />
            Salvar Anotação (+20 pts)
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {notes.length === 0 ? (
          <div className="text-center py-16 px-6 text-stone-500 bg-stone-50 rounded-[2rem] border border-stone-200 border-dashed flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-stone-100 mb-4">
              <FileText size={24} className="text-stone-300" />
            </div>
            <h3 className="text-lg font-bold text-stone-700 mb-2">Nenhuma anotação ainda</h3>
            <p className="max-w-md mx-auto">Use o espaço acima para registrar seus estudos, versículos favoritos ou orações sobre {bookName}.</p>
          </div>
        ) : (
          notes.map(note => {
            const noteColorClass = NOTE_COLORS.find(c => c.id === (editingNoteId === note.id ? editingColor : note.color))?.class || NOTE_COLORS[0].class;
            
            return (
              <div key={note.id} className={`rounded-2xl shadow-sm border p-6 relative group transition-colors ${noteColorClass}`}>
                {editingNoteId === note.id ? (
                  <>
                    <textarea
                      autoFocus
                      value={editingText}
                      onChange={e => setEditingText(e.target.value)}
                      rows={4}
                      className="w-full resize-none text-stone-800 text-base leading-relaxed focus:outline-none bg-white/50 p-3 rounded-xl border border-stone-200/50"
                    />
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mt-4 pt-3 border-t border-stone-200/50">
                      <div className="flex items-center gap-2">
                        <Palette size={16} className="text-stone-400" />
                        <div className="flex gap-1.5">
                          {NOTE_COLORS.map(color => (
                            <button
                              key={color.id}
                              onClick={() => setEditingColor(color.id)}
                              className={`w-6 h-6 rounded-full border-2 transition-transform ${color.class} ${editingColor === color.id ? 'scale-125 border-stone-400' : 'border-transparent hover:scale-110'}`}
                            />
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-2 w-full sm:w-auto">
                        <button
                          onClick={() => { setEditingNoteId(null); setEditingText(''); }}
                          className="flex-1 sm:flex-none px-4 py-2 rounded-xl text-sm font-semibold text-stone-600 hover:bg-stone-200/50 transition-colors"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={() => handleSaveEdit(note.id)}
                          disabled={!editingText.trim()}
                          className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-colors ${editingText.trim() ? `bg-stone-900 text-white` : 'bg-stone-200 text-stone-400 cursor-not-allowed'}`}
                        >
                          <CheckCircle2 size={15} /> Salvar
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    {note.context && (
                      <button
                        onClick={() => onNavigateToChapter(note.context!.chapter!)}
                        className="mb-4 flex items-center gap-1.5 bg-white/60 hover:bg-white text-stone-600 px-3 py-1.5 rounded-xl text-xs font-bold transition-colors w-fit border border-stone-200/50 shadow-sm group/badge"
                      >
                        <MapPin size={12} className="text-stone-400 group-hover/badge:text-stone-600 transition-colors" />
                        Capítulo {note.context.chapter}: {note.context.chapterTitle}
                        <ArrowRight size={12} className="ml-1 opacity-40 group-hover/badge:opacity-100 group-hover/badge:translate-x-0.5 transition-all" />
                      </button>
                    )}
                    <p className="text-stone-800 whitespace-pre-wrap leading-relaxed">{note.text}</p>
                    <div className="mt-6 flex justify-between items-center text-sm text-stone-400">
                      <div className="flex items-center gap-3">
                        <span>{new Date(note.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                        <button
                          onClick={() => handleToggleShare(note.id)}
                          className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-black transition-all ${note.isShared ? 'bg-indigo-100 text-indigo-600' : 'bg-stone-100 text-stone-400 hover:text-stone-600'}`}
                        >
                          <Share2 size={10} className={note.isShared ? 'fill-indigo-600' : ''} />
                          {note.isShared ? 'COMPARTILHADO' : 'COMPARTILHAR'}
                        </button>
                      </div>
                      <div className="flex items-center gap-1 sm:gap-3 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all">
                        <button
                          onClick={() => handleCopy(note.id, note.text)}
                          className="p-2 sm:p-0 sm:flex items-center gap-1 text-stone-400 hover:text-stone-700 transition-colors rounded-lg hover:bg-stone-200/50 sm:hover:bg-transparent"
                          title="Copiar texto"
                        >
                          {copiedId === note.id ? <Check size={15} className="text-green-500" /> : <Copy size={15} />}
                          <span className="hidden sm:inline">{copiedId === note.id ? 'Copiado' : 'Copiar'}</span>
                        </button>
                        <button
                          onClick={() => handleStartEdit(note)}
                          className="p-2 sm:p-0 sm:flex items-center gap-1 text-stone-400 hover:text-stone-700 transition-colors rounded-lg hover:bg-stone-200/50 sm:hover:bg-transparent"
                        >
                          <Pencil size={15} /> <span className="hidden sm:inline">Editar</span>
                        </button>
                        <button
                          onClick={() => deleteNote(note.id)}
                          className="p-2 sm:p-0 sm:flex items-center gap-1 text-red-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50 sm:hover:bg-transparent"
                        >
                          <Trash2 size={15} /> <span className="hidden sm:inline">Excluir</span>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Friends' Notes Section */}
      {friendNotes.length > 0 && (
        <div className="mt-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
              <Users size={20} />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-lg">Anotações de Amigos</h3>
              <p className="text-xs text-stone-500">O que seus amigos aprenderam neste livro</p>
            </div>
          </div>

          <div className="space-y-4">
            {friendNotes.map(note => (
              <div key={note.id} className={`rounded-2xl shadow-sm border p-6 bg-white border-stone-100`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-lg overflow-hidden border border-stone-200">
                    {note.ownerAvatarUrl ? (
                      <img src={note.ownerAvatarUrl} alt={note.ownerName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      AVATARS.find(a => a.id === note.ownerAvatarId)?.emoji || '👤'
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-stone-900 text-sm">{note.ownerName}</p>
                    <p className="text-[10px] text-stone-400 uppercase tracking-wider">Amigo</p>
                  </div>
                </div>

                {note.context && (
                  <div className="mb-4 flex items-center gap-1.5 bg-stone-50 text-stone-600 px-3 py-1.5 rounded-xl text-xs font-bold w-fit border border-stone-100">
                    <MapPin size={12} className="text-stone-400" />
                    Capítulo {note.context.chapter}: {note.context.chapterTitle}
                  </div>
                )}
                
                <p className="text-stone-800 whitespace-pre-wrap leading-relaxed">{note.text}</p>
                
                <div className="mt-4 pt-4 border-t border-stone-50 flex justify-between items-center text-[10px] text-stone-400 font-medium">
                  <span>{new Date(note.createdAt).toLocaleDateString('pt-BR')}</span>
                  <div className="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                    <Share2 size={10} />
                    COMPARTILHADO COM VOCÊ
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
