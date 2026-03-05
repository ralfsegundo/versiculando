import { BIBLE_BOOKS, GROUP_COLORS, BEGINNER_PATH } from '../constants';
import { useGamification } from '../services/gamification';
import { CheckCircle2, Map as MapIcon, Star, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';

interface JourneyMapProps {
  onSelectBook: (bookId: string) => void;
}

export default function JourneyMap({ onSelectBook }: JourneyMapProps) {
  const { profile } = useGamification();

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-stone-900 font-sans pb-28 pt-5 md:pt-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <header className="mb-6 flex items-center gap-3 md:flex-col md:text-center md:items-center pr-10 md:pr-0">
          <div className="w-9 h-9 md:w-12 md:h-12 bg-amber-500 text-white rounded-xl flex items-center justify-center shadow-md shrink-0">
            <MapIcon size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg md:text-3xl font-serif font-bold tracking-tight text-stone-900">Mapa da Jornada</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-stone-500"><strong className="text-stone-800">{profile.completedBooks.length}</strong>/73</span>
              <div className="flex-1 max-w-[80px] h-1.5 bg-stone-200 rounded-full overflow-hidden">
                <div className="h-full bg-amber-400 rounded-full" style={{ width: `${(profile.completedBooks.length / 73) * 100}%` }} />
              </div>
              <span className="text-xs font-bold text-amber-600">{Math.round((profile.completedBooks.length / 73) * 100)}%</span>
            </div>
          </div>
        </header>

        <div className="relative py-8">
          {/* The Golden Path Line */}
          <div className="absolute left-1/2 top-0 bottom-0 w-1 md:w-2 bg-stone-200 -translate-x-1/2 rounded-full z-0"></div>
          
          <div className="space-y-5 md:space-y-8">
            {BIBLE_BOOKS.map((book, index) => {
              const isCompleted = profile.completedBooks.includes(book.id);
              const isVisited = profile.visitedBooks?.includes(book.id) && !isCompleted;

              // Find next recommended book from Trilha do Discípulo
              const discipleOrder = BEGINNER_PATH.flatMap(step => step.books);
              const nextDiscipleBookId = discipleOrder.find(id => !profile.completedBooks.includes(id));
              const isNextRecommended = book.id === nextDiscipleBookId;

              // No books are locked — user can access any book freely
              const isLocked = false;
              
              const isLeft = index % 2 === 0;
              
              const groupColorClass = GROUP_COLORS[book.group] || '';
              const textColorClass = groupColorClass.split(' ').find(c => c.startsWith('text-')) || 'text-stone-500';

              return (
                <div key={book.id} className={`relative z-10 flex items-center justify-center w-full`}>
                  
                  {/* Path connection to node */}
                  {index < BIBLE_BOOKS.length - 1 && (
                    <div className={`absolute top-1/2 left-1/2 w-1.5 md:w-4 h-20 md:h-32 -translate-x-1/2 -z-10 ${
                      isCompleted ? 'bg-amber-400' : 'bg-stone-200'
                    }`}></div>
                  )}
                  
                  <div className={`flex w-full ${isLeft ? 'flex-row-reverse' : 'flex-row'} items-center justify-center gap-2 md:gap-8`}>
                    
                    {/* Empty space for alternating layout */}
                    <div className="flex-1 hidden md:block"></div>
                    
                    {/* The Node */}
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onSelectBook(book.id)}
                      className={`relative rounded-full flex items-center justify-center border-4 shadow-lg transition-all z-20 shrink-0 active:scale-95 ${
                        isCompleted
                          ? 'w-12 h-12 md:w-20 md:h-20 bg-amber-400 border-white text-white shadow-amber-400/40'
                          : isNextRecommended
                            ? 'w-12 h-12 md:w-20 md:h-20 bg-white border-amber-400 text-amber-500 shadow-amber-400/20'
                            : isVisited
                              ? 'w-12 h-12 md:w-20 md:h-20 bg-indigo-50 border-indigo-300 text-indigo-500'
                              : 'w-10 h-10 md:w-16 md:h-16 bg-white border-stone-200 text-stone-400 shadow-sm'
                      }`}
                    >
                      {isNextRecommended && (
                        <div className="absolute inset-0 rounded-full bg-amber-400 animate-ping opacity-30"></div>
                      )}
                      
                      {isCompleted ? (
                        <CheckCircle2 size={18} className="md:w-8 md:h-8" />
                      ) : isNextRecommended ? (
                        <Star size={18} className="md:w-8 md:h-8 fill-amber-100 relative z-10" />
                      ) : isVisited ? (
                        <BookOpen size={15} className="md:w-7 md:h-7" />
                      ) : (
                        <BookOpen size={13} className="md:w-6 md:h-6 opacity-50" />
                      )}
                      
                      {/* Number badge */}
                      <div className={`absolute -top-1 -right-1 w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-[8px] md:text-[10px] font-bold border-2 border-white ${
                        isCompleted ? 'bg-emerald-500 text-white' : isVisited ? 'bg-indigo-400 text-white' : 'bg-stone-300 text-stone-600'
                      }`}>
                        {index + 1}
                      </div>
                    </motion.button>
                    
                    {/* Book Info Card */}
                    <div className={`flex-1 ${isLeft ? 'text-right pr-2 md:pr-0' : 'text-left pl-2 md:pl-0'}`}>
                      <div className={`inline-block p-2 md:p-3 rounded-xl border shadow-sm transition-all ${
                        isCompleted ? 'bg-white border-amber-200' :
                        isNextRecommended ? 'bg-white border-amber-400 shadow-md' :
                        isVisited ? 'bg-indigo-50 border-indigo-200' :
                        'bg-stone-50 border-stone-200'
                      }`}>
                        {isNextRecommended && (
                          <span className="text-[9px] font-bold text-amber-600 bg-amber-100 rounded-full px-2 py-0.5 mb-1 inline-block">⭐ Próximo</span>
                        )}
                        <span className={`text-[9px] md:text-xs font-bold uppercase tracking-wider mb-0.5 block ${textColorClass} hidden sm:block`}>
                          {book.group}
                        </span>
                        <h3 className={`font-serif text-sm md:text-base font-bold leading-tight ${
                          isCompleted ? 'text-stone-900' : 'text-stone-700'
                        }`}>
                          {book.name}
                        </h3>
                        <p className="text-[10px] md:text-xs text-stone-500 mt-0.5 font-medium">{book.chapters} cap.</p>
                      </div>
                    </div>
                    
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        
      </div>
    </div>
  );
}
