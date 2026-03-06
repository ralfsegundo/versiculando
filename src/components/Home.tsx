import { useState, useEffect, useRef } from 'react';
import { BIBLE_BOOKS, GROUP_COLORS } from '../constants';
import { Book, Library, Search, BookOpen, Sun, CheckCircle2, ArrowRight, Info, MapPin, Lock, Trophy, Download, X, Navigation } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useGamification } from '../services/gamification';

interface HomeProps {
  onSelectBook: (bookId: string) => void;
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

export default function Home({ onSelectBook, welcomeMessage, onDismissWelcome }: HomeProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const { profile, accessDailyVerse, showFloatingPoints, userId } = useGamification();
  const [dailyVerseRead, setDailyVerseRead] = useState<boolean>(() => {
    // Only "read" if it was already read TODAY
    const lastRead = localStorage.getItem('daily_verse_last_read');
    if (!lastRead) return false;
    const today = new Date().toDateString();
    return new Date(lastRead).toDateString() === today;
  });
  const [animatingBooks, setAnimatingBooks] = useState<string[]>([]);
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);
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

  const normalize = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const filteredBooks = BIBLE_BOOKS.filter(book =>
    normalize(book.name).includes(normalize(searchTerm)) ||
    normalize(book.group).includes(normalize(searchTerm))
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

        {/* Streak banner — aparece quando streak >= 2 */}
        {profile.streak >= 2 && (
          <div className="max-w-xl mx-auto mb-4">
            <div className="bg-gradient-to-r from-orange-500 to-amber-500 rounded-xl px-4 py-2.5 flex items-center gap-3 shadow-sm">
              <span className="text-2xl">🔥</span>
              <div className="flex-1">
                <p className="text-white font-bold text-sm leading-tight">
                  {profile.streak} dias seguidos!
                </p>
                <p className="text-orange-100 text-xs">
                  {profile.streak < 7 ? `Mais ${7 - profile.streak} dia${7 - profile.streak > 1 ? 's' : ''} para a conquista Fogo do Espírito ⚡` :
                   profile.streak < 30 ? `Incrível! Continue para ${30 - profile.streak} dias ainda mais!` :
                   'Você é uma inspiração! 30+ dias seguidos! 🏆'}
                </p>
              </div>
              <div className="text-white font-black text-2xl">{profile.streak}</div>
            </div>
          </div>
        )}

        {/* Card "Por onde começar" — só para usuários sem nenhuma visita */}
        {(profile.visitedBooks?.length || 0) === 0 && profile.completedBooks.length === 0 && (
          <div className="max-w-xl mx-auto mb-6">
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-2xl p-5 text-center shadow-sm">
              <div className="text-3xl mb-2">📖</div>
              <h3 className="font-serif font-bold text-stone-900 text-lg mb-1">Por onde começar?</h3>
              <p className="text-stone-500 text-sm mb-4">Recomendamos começar pela primeira carta de São João — curta, profunda e perfeita para iniciantes.</p>
              <button
                onClick={() => onSelectBook('1jn')}
                className="bg-amber-500 hover:bg-amber-400 text-white font-bold px-6 py-3 rounded-xl shadow-sm active:scale-95 transition-all flex items-center gap-2 mx-auto"
              >
                Começar por 1 João <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Continue Where You Left Off Card */}
        {(() => {
          const hasAccessedAnyBook = (profile.visitedBooks?.length || 0) > 0 || profile.completedBooks.length > 0;
          if (!hasAccessedAnyBook) return null;

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

        {/* Daily Verse Card — some ao marcar como lido */}
        {!dailyVerseRead && (() => {
          // Versículo diferente a cada dia do ano (determinístico — mesmo para todos os usuários)
          const DAILY_VERSES = [
            { text: 'O Senhor é o meu pastor; nada me faltará.', ref: 'Sl 23,1' },
            { text: 'Tudo posso naquele que me fortalece.', ref: 'Fl 4,13' },
            { text: 'Não temas, porque eu sou contigo.', ref: 'Is 41,10' },
            { text: 'O amor é paciente, o amor é bondoso.', ref: '1Cor 13,4' },
            { text: 'Buscai primeiro o Reino de Deus e a sua justiça.', ref: 'Mt 6,33' },
            { text: 'Sede fortes e corajosos. Não temais.', ref: 'Dt 31,6' },
            { text: 'Confia no Senhor de todo o teu coração.', ref: 'Pv 3,5' },
            { text: 'No começo, Deus criou os céus e a terra.', ref: 'Gn 1,1' },
            { text: 'Amarás o teu próximo como a ti mesmo.', ref: 'Mt 22,39' },
            { text: 'Deus é amor.', ref: '1Jo 4,8' },
            { text: 'Alegrai-vos sempre no Senhor.', ref: 'Fl 4,4' },
            { text: 'A fé sem obras é morta.', ref: 'Tg 2,26' },
            { text: 'Eu sou o caminho, a verdade e a vida.', ref: 'Jo 14,6' },
            { text: 'Sede a luz do mundo.', ref: 'Mt 5,14' },
            { text: 'A misericórdia do Senhor dura para sempre.', ref: 'Sl 136,1' },
            { text: 'Vós sois o sal da terra.', ref: 'Mt 5,13' },
            { text: 'Nada vos separe do amor de Deus.', ref: 'Rm 8,39' },
            { text: 'Orai sem cessar.', ref: '1Ts 5,17' },
            { text: 'A sabedoria começa pelo temor do Senhor.', ref: 'Pv 9,10' },
            { text: 'Sede misericordiosos como vosso Pai é misericordioso.', ref: 'Lc 6,36' },
            { text: 'Não vos conformeis com este século.', ref: 'Rm 12,2' },
            { text: 'Com Deus nada é impossível.', ref: 'Lc 1,37' },
            { text: 'Bem-aventurados os puros de coração.', ref: 'Mt 5,8' },
            { text: 'O Senhor é minha luz e minha salvação.', ref: 'Sl 27,1' },
            { text: 'Sede santos, pois eu sou santo.', ref: '1Pd 1,16' },
            { text: 'Onde está o teu tesouro, lá está o teu coração.', ref: 'Mt 6,21' },
            { text: 'Jesus Cristo é o mesmo, ontem, hoje e sempre.', ref: 'Hb 13,8' },
            { text: 'O coração do homem planeja o seu caminho, mas o Senhor dirige os seus passos.', ref: 'Pv 16,9' },
            { text: 'Derramai diante dele o vosso coração.', ref: 'Sl 62,9' },
            { text: 'Posso tudo naquele que me fortalece.', ref: 'Fl 4,13' },
            { text: 'Sede fortes no Senhor e na força do seu poder.', ref: 'Ef 6,10' },
          ];
          const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
          const verse = DAILY_VERSES[dayOfYear % DAILY_VERSES.length];
          return (
            <div className="max-w-xl mx-auto mb-4">
              <div className="bg-stone-900 rounded-xl p-3 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-5"><Sun size={60} /></div>
                <div className="relative z-10 flex items-center gap-2.5">
                  <Sun size={16} className="text-amber-400 shrink-0" />
                  <p className="flex-1 text-sm font-serif italic text-stone-100 leading-snug">
                    "{verse.text}"
                    <span className="not-italic font-bold text-amber-400 ml-1.5 text-[11px]">{verse.ref}</span>
                  </p>
                  <button
                    onClick={handleReadDailyVerse}
                    className="px-3 py-1.5 rounded-full font-bold text-xs bg-amber-400 hover:bg-amber-300 text-stone-900 shadow-sm active:scale-95 shrink-0 transition-all"
                  >
                    +15 pts
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Global Progress Bar */}
        {profile.completedBooks.length > 0 && (
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

        {filteredBooks.length === 0 && (
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

    </div>
  );
}
