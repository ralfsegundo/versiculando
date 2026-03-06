import { BIBLE_BOOKS, BEGINNER_PATH } from '../constants';
import { useGamification } from '../services/gamification';
import { CheckCircle2, Star, BookOpen, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';

interface JourneyMapProps {
  onSelectBook: (bookId: string) => void;
}

const GROUP_META: Record<string, { emoji: string; color: string; glow: string; bg: string; badge: string; track: string }> = {
  'Pentateuco':          { emoji: '📜', color: 'text-amber-700',   glow: 'shadow-amber-300/60',   bg: 'bg-amber-50',   badge: 'bg-amber-100 text-amber-800 border-amber-200',     track: 'bg-amber-400' },
  'Livros Históricos':   { emoji: '⚔️',  color: 'text-emerald-700', glow: 'shadow-emerald-300/60', bg: 'bg-emerald-50', badge: 'bg-emerald-100 text-emerald-800 border-emerald-200', track: 'bg-emerald-500' },
  'Livros Sapienciais':  { emoji: '🕊️', color: 'text-purple-700',  glow: 'shadow-purple-300/60',  bg: 'bg-purple-50',  badge: 'bg-purple-100 text-purple-800 border-purple-200',   track: 'bg-purple-500' },
  'Livros Proféticos':   { emoji: '🔥', color: 'text-blue-700',    glow: 'shadow-blue-300/60',    bg: 'bg-blue-50',    badge: 'bg-blue-100 text-blue-800 border-blue-200',         track: 'bg-blue-500' },
  'Evangelhos':          { emoji: '✝️', color: 'text-rose-700',    glow: 'shadow-rose-300/60',    bg: 'bg-rose-50',    badge: 'bg-rose-100 text-rose-800 border-rose-200',         track: 'bg-rose-500' },
  'Atos dos Apóstolos':  { emoji: '⚡', color: 'text-teal-700',    glow: 'shadow-teal-300/60',    bg: 'bg-teal-50',    badge: 'bg-teal-100 text-teal-800 border-teal-200',         track: 'bg-teal-500' },
  'Cartas Paulinas':     { emoji: '✉️', color: 'text-indigo-700',  glow: 'shadow-indigo-300/60',  bg: 'bg-indigo-50',  badge: 'bg-indigo-100 text-indigo-800 border-indigo-200',   track: 'bg-indigo-500' },
  'Cartas Católicas':    { emoji: '🌿', color: 'text-violet-700',  glow: 'shadow-violet-300/60',  bg: 'bg-violet-50',  badge: 'bg-violet-100 text-violet-800 border-violet-200',   track: 'bg-violet-500' },
  'Apocalipse':          { emoji: '🌟', color: 'text-fuchsia-700', glow: 'shadow-fuchsia-300/60', bg: 'bg-fuchsia-50', badge: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200', track: 'bg-fuchsia-500' },
};

function groupBooks() {
  const groups: { group: string; books: typeof BIBLE_BOOKS }[] = [];
  let current: { group: string; books: typeof BIBLE_BOOKS } | null = null;
  for (const book of BIBLE_BOOKS) {
    if (!current || current.group !== book.group) {
      current = { group: book.group, books: [] };
      groups.push(current);
    }
    current.books.push(book);
  }
  return groups;
}

export default function JourneyMap({ onSelectBook }: JourneyMapProps) {
  const { profile } = useGamification();
  const bookGroups = groupBooks();
  const totalBooks = BIBLE_BOOKS.length;
  const completedCount = profile.completedBooks.length;
  const progressPct = Math.round((completedCount / totalBooks) * 100);

  const discipleOrder = BEGINNER_PATH.flatMap((step: any) => step.books);
  const nextDiscipleBookId = discipleOrder.find((id: string) => !profile.completedBooks.includes(id));

  // Pré-computa o índice global de cada livro para exibição correta
  const globalIndexMap = new Map<string, number>();
  BIBLE_BOOKS.forEach((book, idx) => globalIndexMap.set(book.id, idx + 1));

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-stone-900 font-sans pb-28 pt-5 md:pt-8">
      <div className="max-w-2xl mx-auto px-4 sm:px-6">

        {/* Header */}
        <header className="mb-8 relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 via-amber-600 to-orange-700 p-5 md:p-7 text-white shadow-lg shadow-amber-200">
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/5 rounded-full" />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/5 rounded-full" />
          <div className="relative flex items-center gap-4">
            <div className="text-4xl md:text-5xl shrink-0">🗺️</div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-3xl font-serif font-bold leading-tight">Mapa da Jornada</h1>
              <p className="text-amber-100 text-xs md:text-sm mt-0.5">
                {completedCount === 0
                  ? 'Sua jornada está começando — bom caminho!'
                  : completedCount === totalBooks
                    ? '🎉 Jornada completa! Que conquista!'
                    : `${totalBooks - completedCount} livros restantes`}
              </p>
            </div>
          </div>
          <div className="relative mt-5">
            <div className="flex justify-between items-center mb-1.5">
              <span className="text-xs font-bold text-amber-100">{completedCount} de {totalBooks} livros</span>
              <span className="text-sm font-black text-white">{progressPct}%</span>
            </div>
            <div className="h-3 bg-black/20 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-white rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
              />
            </div>
          </div>
        </header>

        {/* Groups */}
        {bookGroups.map((section, sectionIdx) => {
          const meta = GROUP_META[section.group] || GROUP_META['Pentateuco'];
          const sectionCompleted = section.books.filter(b => profile.completedBooks.includes(b.id)).length;
          const sectionPct = Math.round((sectionCompleted / section.books.length) * 100);

          return (
            <div key={section.group} className="mb-10">
              {/* Section header */}
              <motion.div
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: sectionIdx * 0.05 }}
                className="flex items-center gap-3 mb-3 px-1"
              >
                <span className="text-2xl">{meta.emoji}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className={`text-xs font-black uppercase tracking-wider ${meta.color}`}>{section.group}</h2>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.badge}`}>
                      {sectionCompleted}/{section.books.length}
                    </span>
                    {sectionPct === 100 && (
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200">✓ Completo</span>
                    )}
                  </div>
                  <div className="mt-1 h-1 bg-stone-200 rounded-full overflow-hidden max-w-[100px]">
                    <div className={`h-full ${meta.track} rounded-full transition-all duration-700`} style={{ width: `${sectionPct}%` }} />
                  </div>
                </div>
              </motion.div>

              {/* Books */}
              <div className="relative">
                <div className="absolute left-[22px] top-0 bottom-0 w-0.5 bg-stone-100 z-0" />
                <div className="space-y-2">
                  {section.books.map((book, bookIdx) => {
                    const nodeNum = globalIndexMap.get(book.id) ?? bookIdx + 1;
                    const isCompleted = profile.completedBooks.includes(book.id);
                    const isVisited = profile.visitedBooks?.includes(book.id) && !isCompleted;
                    const isNext = book.id === nextDiscipleBookId;

                    return (
                      <motion.div
                        key={book.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: sectionIdx * 0.05 + bookIdx * 0.025 }}
                        className="relative z-10"
                      >
                        <button
                          onClick={() => onSelectBook(book.id)}
                          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl border transition-all active:scale-[0.98] text-left group ${
                            isCompleted
                              ? 'bg-white border-amber-200 shadow-sm hover:shadow-md hover:border-amber-300'
                              : isNext
                                ? `${meta.bg} border-2 shadow-md hover:shadow-lg`
                                : isVisited
                                  ? 'bg-white border-stone-200 hover:border-stone-300 hover:shadow-sm'
                                  : 'bg-white/70 border-stone-100 hover:border-stone-200 hover:bg-white'
                          }`}
                        >
                          {/* Node */}
                          <div className={`relative shrink-0 w-11 h-11 rounded-full flex items-center justify-center border-2 transition-all ${
                            isCompleted
                              ? 'bg-amber-400 border-amber-300 text-white shadow-md shadow-amber-200'
                              : isNext
                                ? `bg-white border-current ${meta.color} shadow-lg ${meta.glow}`
                                : isVisited
                                  ? 'bg-stone-100 border-stone-300 text-stone-500'
                                  : 'bg-stone-50 border-stone-200 text-stone-400'
                          }`}>
                            {isNext && <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-current" />}
                            {isCompleted ? (
                              <CheckCircle2 size={18} />
                            ) : isNext ? (
                              <Star size={16} className="fill-current relative z-10" />
                            ) : isVisited ? (
                              <BookOpen size={15} />
                            ) : (
                              <span className="text-[11px] font-bold">{nodeNum}</span>
                            )}
                          </div>

                          {/* Info */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {isNext && (
                                <span className={`text-[9px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded-full border shrink-0 ${meta.badge}`}>⭐ Próximo</span>
                              )}
                              {isCompleted && (
                                <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded-full border border-amber-200 shrink-0">✓ Lido</span>
                              )}
                            </div>
                            <h3 className={`font-serif font-bold text-sm leading-tight mt-0.5 ${
                              isCompleted ? 'text-stone-900' : isNext ? meta.color : 'text-stone-600'
                            }`}>
                              {book.name}
                            </h3>
                            <p className="text-[11px] text-stone-400 font-medium">{book.chapters} cap.</p>
                          </div>

                          <ChevronRight size={15} className={`shrink-0 transition-transform group-hover:translate-x-0.5 ${
                            isCompleted ? 'text-amber-400' : isNext ? meta.color : 'text-stone-300'
                          }`} />
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {/* Footer */}
        <div className="text-center py-8">
          <p className="text-stone-400 text-sm font-medium">
            {completedCount === totalBooks
              ? '🏆 Você completou toda a Bíblia. Extraordinário!'
              : '📖 Continue — cada capítulo é um passo na jornada.'}
          </p>
        </div>

      </div>
    </div>
  );
}
