import { useState, useEffect, useRef } from 'react';
import { BIBLE_BOOKS, GROUP_COLORS } from '../constants';
import { Book, Library, Search, BookOpen, Sun, CheckCircle2, ArrowRight, Info, Download, X, Navigation, Zap, Star, Shield } from 'lucide-react';
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
  const { profile, accessDailyVerse, showFloatingPoints, userId, useStreakFreeze, completeDailyMission, recordSaintEncounter, completeFlashChallenge } = useGamification();

  // ── Dados do dia (determinísticos por dia do ano) ──────────
  const DAY_OF_YEAR = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const TODAY_STR = new Date().toISOString().split('T')[0];

  // 1. Versículo do dia rotativo
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
  const todayVerse = DAILY_VERSES[DAY_OF_YEAR % DAILY_VERSES.length];

  // 2. Santo do dia
  const SAINTS = [
    { key: 'joao_batista', name: 'São João Batista', date: '24/06', phrase: 'É preciso que Ele cresça e eu diminua.', emoji: '🌊' },
    { key: 'pedro_paulo', name: 'São Pedro e São Paulo', date: '29/06', phrase: 'Tu és o Cristo, o Filho do Deus vivo.', emoji: '⚓' },
    { key: 'maria', name: 'Nossa Senhora', date: '15/08', phrase: 'Faça-se em mim segundo a tua palavra.', emoji: '🌹' },
    { key: 'francisco', name: 'São Francisco de Assis', date: '04/10', phrase: 'Começa por fazer o que é necessário.', emoji: '🕊️' },
    { key: 'teresinha', name: 'Santa Teresinha', date: '01/10', phrase: 'O amor não é sentido, mas demonstrado.', emoji: '🌸' },
    { key: 'agostinho', name: 'Santo Agostinho', date: '28/08', phrase: 'Nosso coração é inquieto enquanto não repousa em Ti.', emoji: '📚' },
    { key: 'tomaz_aquino', name: 'São Tomás de Aquino', date: '28/01', phrase: 'A fé e a razão não se contradizem.', emoji: '🧠' },
    { key: 'domingos', name: 'São Domingos', date: '08/08', phrase: 'A fé sem obras é morta.', emoji: '📿' },
    { key: 'jose', name: 'São José', date: '19/03', phrase: 'Homem justo, que ouve em silêncio e age com fé.', emoji: '🔨' },
    { key: 'paulo', name: 'São Paulo', date: '25/01', phrase: 'Tudo posso naquele que me fortalece.', emoji: '✉️' },
    { key: 'joao_evangelista', name: 'São João Evangelista', date: '27/12', phrase: 'Deus é amor; quem permanece no amor permanece em Deus.', emoji: '❤️' },
    { key: 'tiago', name: 'São Tiago', date: '25/07', phrase: 'A fé sem obras é morta.', emoji: '🛤️' },
    { key: 'bartolomeu', name: 'São Bartolomeu', date: '24/08', phrase: 'Pode vir algo de bom de Nazaré?', emoji: '🌿' },
    { key: 'lucas', name: 'São Lucas', date: '18/10', phrase: 'Ele sarou a todos.', emoji: '🏥' },
    { key: 'marcos', name: 'São Marcos', date: '25/04', phrase: 'Convertei-vos e crede no Evangelho.', emoji: '🦁' },
    { key: 'mateus', name: 'São Mateus', date: '21/09', phrase: 'Sede misericordiosos como vosso Pai.', emoji: '💰' },
    { key: 'andre', name: 'Santo André', date: '30/11', phrase: 'Encontrei o Messias.', emoji: '🎣' },
    { key: 'filipe', name: 'São Filipe', date: '03/05', phrase: 'Senhor, mostra-nos o Pai.', emoji: '🌟' },
    { key: 'atanasio', name: 'Santo Atanásio', date: '02/05', phrase: 'O Verbo de Deus se fez homem para que nós nos tornemos Deus.', emoji: '⛪' },
    { key: 'monica', name: 'Santa Mônica', date: '27/08', phrase: 'Chorei tanto por ti, filho meu.', emoji: '💧' },
    { key: 'cecilia', name: 'Santa Cecília', date: '22/11', phrase: 'Cantai ao Senhor um cântico novo.', emoji: '🎵' },
    { key: 'catarina', name: 'Santa Catarina de Sena', date: '29/04', phrase: 'Sê quem és e serás grande.', emoji: '🌺' },
    { key: 'inacio', name: 'Santo Inácio de Loyola', date: '31/07', phrase: 'Tudo para a maior glória de Deus.', emoji: '⚔️' },
    { key: 'teresa_avila', name: 'Santa Teresa de Ávila', date: '15/10', phrase: 'Deus basta.', emoji: '🏰' },
    { key: 'bento', name: 'São Bento', date: '11/07', phrase: 'Ora et Labora — Ora e Trabalha.', emoji: '📖' },
    { key: 'cristovao', name: 'São Cristóvão', date: '25/07', phrase: 'Carreguei o mundo inteiro em meus ombros.', emoji: '🌍' },
    { key: 'valentim', name: 'São Valentim', date: '14/02', phrase: 'O amor é o maior presente.', emoji: '💝' },
    { key: 'patrício', name: 'São Patrício', date: '17/03', phrase: 'Cristo à minha frente, Cristo atrás de mim.', emoji: '☘️' },
    { key: 'nicolau', name: 'São Nicolau', date: '06/12', phrase: 'Dar sem esperar receber.', emoji: '🎁' },
    { key: 'sebastiao', name: 'São Sebastião', date: '20/01', phrase: 'A fé é o escudo do cristão.', emoji: '🎯' },
    { key: 'antonio', name: 'Santo Antônio', date: '13/06', phrase: 'Se procuras milagres, olha para a Cruz.', emoji: '🔑' },
  ];
  const todaySaint = SAINTS[DAY_OF_YEAR % SAINTS.length];

  // 3. Missão diária
  const DAILY_MISSIONS = [
    { id: 'leia_1cap', text: 'Leia 1 capítulo da Bíblia e medite por 1 minuto', bookId: null },
    { id: 'favorita_versiculo', text: 'Favorite um versículo que te tocou hoje', bookId: null },
    { id: 'anota_reflexao', text: 'Escreva uma anotação de pelo menos 2 linhas', bookId: null },
    { id: 'leia_evangelhos', text: 'Leia qualquer capítulo dos Evangelhos', bookId: 'mat' },
    { id: 'leia_salmos', text: 'Leia qualquer Salmo em voz alta', bookId: 'psa' },
    { id: 'leia_provérbios', text: 'Leia um capítulo de Provérbios', bookId: 'pro' },
    { id: 'leia_jo', text: 'Leia um capítulo do Evangelho de João', bookId: 'jhn' },
    { id: 'versículo_memoria', text: 'Decore o versículo do dia de cor', bookId: null },
    { id: 'compartilha', text: 'Compartilhe o app com um amigo', bookId: null },
    { id: 'leia_atos', text: 'Leia um capítulo dos Atos dos Apóstolos', bookId: 'act' },
    { id: 'leia_romanos', text: 'Leia um capítulo de Romanos', bookId: 'rom' },
    { id: 'reflexao_santo', text: 'Leia sobre o santo do dia e aplique sua frase à sua vida', bookId: null },
    { id: 'leia_genesis', text: 'Leia um capítulo do Gênesis', bookId: 'gen' },
    { id: 'leia_isaias', text: 'Leia um capítulo de Isaías', bookId: 'isa' },
  ];
  const todayMission = DAILY_MISSIONS[DAY_OF_YEAR % DAILY_MISSIONS.length];

  // 4. Desafio relâmpago (aparece por 48h a cada semana)
  const FLASH_CHALLENGES = [
    { id: 'salmos_subida', text: 'Leia os Salmos de Subida (120-134) antes de domingo', bookId: 'psa', hours: 48 },
    { id: 'cartas_joao', text: 'Leia as 3 cartas de João hoje', bookId: '1jn', hours: 24 },
    { id: 'filipenses', text: 'Leia Filipenses inteiro (4 cap.) em 48h', bookId: 'php', hours: 48 },
    { id: 'jonas', text: 'Leia Jonas completo (só 4 capítulos!)', bookId: 'jon', hours: 24 },
    { id: 'rute', text: 'Leia o livro de Rute (4 capítulos) hoje', bookId: 'rut', hours: 24 },
    { id: 'efesios', text: 'Leia Efésios inteiro antes de amanhã', bookId: 'eph', hours: 36 },
    { id: 'discurso_montanha', text: 'Leia o Sermão da Montanha (Mt 5-7)', bookId: 'mat', hours: 24 },
  ];
  const weekOfYear = Math.floor(DAY_OF_YEAR / 7);
  const flashChallenge = FLASH_CHALLENGES[weekOfYear % FLASH_CHALLENGES.length];
  const flashDayOfWeek = DAY_OF_YEAR % 7; // Aparece nos dias 0-1 da semana (48h)
  const showFlashChallenge = flashDayOfWeek < 2;
  const flashDismissed = localStorage.getItem(`flash_dismissed_${weekOfYear}`) === 'true';
  const flashCompleted = localStorage.getItem(`flash_done_${weekOfYear}`) === 'true';
  const [flashVisible, setFlashVisible] = useState(showFlashChallenge && !flashDismissed);

  // Santo do dia — expandido ou não
  const [saintExpanded, setSaintExpanded] = useState(false);

  // Streak freeze state
  const [showFreezeUsed, setShowFreezeUsed] = useState(false);
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

  // Para iniciantes (experience=never/little), mostra NT antes do VT
  const onboardingExperience = (() => {
    try { return JSON.parse(localStorage.getItem('onboarding_profile') || '{}').experience; } catch { return null; }
  })();
  const showNTFirst = onboardingExperience === 'never' || onboardingExperience === 'little';

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
                  {profile.streak < 7 ? `Mais ${7 - profile.streak} dia${7 - profile.streak > 1 ? 's' : ''} para Fogo do Espírito ⚡` :
                   profile.streak < 30 ? `Rumo a 30 dias! Faltam ${30 - profile.streak}.` :
                   'Você é uma inspiração! 30+ dias seguidos! 🏆'}
                </p>
              </div>
              {/* Graças disponíveis */}
              <div className="flex items-center gap-1 bg-white/20 rounded-lg px-2 py-1">
                <Shield size={12} className="text-white" />
                <span className="text-white font-bold text-xs">{profile.streakFreezes ?? 0}</span>
              </div>
            </div>
            {showFreezeUsed && (
              <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="text-center text-xs text-orange-600 font-bold mt-1">
                🕊️ Graça do Dia usada! Seu streak foi protegido.
              </motion.p>
            )}
          </div>
        )}

        {/* ── Desafio Relâmpago ⚡ (48h, 1x por semana) ──────── */}
        <AnimatePresence>
          {flashVisible && !flashCompleted && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-xl mx-auto mb-4">
              <div className="bg-gradient-to-r from-violet-600 to-purple-700 rounded-2xl p-4 shadow-lg relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
                <button onClick={() => { localStorage.setItem(`flash_dismissed_${weekOfYear}`, 'true'); setFlashVisible(false); }}
                  className="absolute top-3 right-3 text-white/50 hover:text-white transition-colors z-10">
                  <X size={16} />
                </button>
                <div className="flex items-start gap-3 relative z-10">
                  <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                    <Zap size={20} className="text-yellow-300" />
                  </div>
                  <div className="flex-1 pr-4">
                    <p className="text-yellow-300 text-[10px] font-bold uppercase tracking-widest mb-0.5">⚡ Desafio Relâmpago — {flashChallenge.hours}h</p>
                    <p className="text-white font-bold text-sm leading-snug mb-3">{flashChallenge.text}</p>
                    <div className="flex items-center gap-2">
                      {flashChallenge.bookId && (
                        <button onClick={() => onSelectBook(flashChallenge.bookId!)}
                          className="bg-white text-purple-700 font-bold text-xs px-4 py-1.5 rounded-full active:scale-95 transition-all">
                          Ir para o livro →
                        </button>
                      )}
                      <button onClick={() => {
                        localStorage.setItem(`flash_done_${weekOfYear}`, 'true');
                        completeFlashChallenge();
                        setFlashVisible(false);
                      }} className="bg-yellow-400 text-stone-900 font-bold text-xs px-4 py-1.5 rounded-full active:scale-95 transition-all">
                        Concluí! +200pts
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Missão do Dia 📋 ──────────────────────────────── */}
        {(() => {
          const missionDone = profile.lastDailyMissionDate === TODAY_STR;
          return (
            <div className="max-w-xl mx-auto mb-4">
              <div className={`rounded-2xl p-4 border transition-all ${missionDone ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-stone-200 shadow-sm'}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${missionDone ? 'bg-emerald-100' : 'bg-amber-100'}`}>
                    {missionDone ? <CheckCircle2 size={18} className="text-emerald-600" /> : <Star size={18} className="text-amber-600" />}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${missionDone ? 'text-emerald-600' : 'text-amber-600'}`}>
                        Missão do Dia {profile.dailyMissionStreak > 1 ? `· ${profile.dailyMissionStreak} dias 🔥` : ''}
                      </p>
                      {!missionDone && <span className="text-[10px] text-stone-400 font-medium">+25 pts</span>}
                    </div>
                    <p className={`text-sm font-medium leading-snug ${missionDone ? 'text-emerald-700 line-through opacity-60' : 'text-stone-900'}`}>
                      {todayMission.text}
                    </p>
                    {!missionDone && (
                      <div className="flex items-center gap-2 mt-2.5">
                        {todayMission.bookId && (
                          <button onClick={() => onSelectBook(todayMission.bookId!)}
                            className="text-xs text-amber-700 font-bold bg-amber-50 border border-amber-200 px-3 py-1 rounded-full active:scale-95 transition-all">
                            Abrir livro →
                          </button>
                        )}
                        <button onClick={() => completeDailyMission(TODAY_STR)}
                          className="text-xs text-stone-700 font-bold bg-stone-100 hover:bg-stone-200 border border-stone-200 px-3 py-1 rounded-full active:scale-95 transition-all">
                          Concluí ✓
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── Lectio Divina do Dia 📖 ───────────────────────── */}
        {(() => {
          const LECTIO = [
            { ref: 'Mt 5,1-12', title: 'Bem-aventuranças', text: 'Bem-aventurados os pobres de espírito, pois deles é o Reino dos Céus...', bookId: 'mat', reflection: 'O que significa ser pobre de espírito no meu dia a dia?' },
            { ref: 'Jo 15,1-8', title: 'A Videira e os Ramos', text: 'Eu sou a videira verdadeira e meu Pai é o agricultor...', bookId: 'jhn', reflection: 'Como permaneço unido a Cristo nesta semana?' },
            { ref: 'Sl 23', title: 'O Senhor é meu Pastor', text: 'O Senhor é o meu pastor; nada me faltará. Em verdes pastagens me faz repousar...', bookId: 'psa', reflection: 'Em que área da minha vida preciso confiar mais no Senhor?' },
            { ref: 'Rm 8,28-39', title: 'Nada nos Separa', text: 'Sabemos que tudo concorre para o bem daqueles que amam a Deus...', bookId: 'rom', reflection: 'O que me impede de crer que Deus está no controle?' },
            { ref: 'Lc 15,11-32', title: 'O Filho Pródigo', text: 'Um homem tinha dois filhos. O mais novo disse ao pai: Pai, dá-me a parte da herança...', bookId: 'luk', reflection: 'Qual filho me representa mais hoje — o que voltou ou o que ficou?' },
            { ref: '1Cor 13', title: 'Hino ao Amor', text: 'Ainda que eu falasse as línguas dos homens e dos anjos, se não tiver amor...', bookId: '1co', reflection: 'Em quais relações preciso praticar mais o amor descrito por Paulo?' },
            { ref: 'Is 40,28-31', title: 'Os que esperam no Senhor', text: 'Não sabes? Não ouviste? O Senhor é o Deus eterno...', bookId: 'isa', reflection: 'Onde estou cansado e preciso de renovação divina?' },
            { ref: 'Ef 6,10-18', title: 'A Armadura de Deus', text: 'Revesti-vos de toda a armadura de Deus para poderdes resistir...', bookId: 'eph', reflection: 'Qual parte da armadura espiritual mais negligencio?' },
            { ref: 'Fl 4,4-9', title: 'A Paz de Deus', text: 'Alegrai-vos sempre no Senhor! Repito: alegrai-vos!...', bookId: 'php', reflection: 'O que me rouba a paz e como posso entregar isso a Deus?' },
            { ref: 'Jo 3,1-17', title: 'Nascer de Novo', text: 'Havia um fariseu chamado Nicodemos, membro do Sinédrio...', bookId: 'jhn', reflection: 'O que precisa renascer em mim?' },
            { ref: 'Tg 1,2-8', title: 'Fé na Tribulação', text: 'Meus irmãos, considerai uma grande alegria quando sofreis várias provações...', bookId: 'jas', reflection: 'Qual provação atual pode estar me tornando mais sábio?' },
            { ref: 'Hb 11,1-12', title: 'Os Heróis da Fé', text: 'A fé é a garantia das coisas que se esperam e a prova das que não se veem...', bookId: 'heb', reflection: 'Em que área preciso agir mais pela fé do que pelo que vejo?' },
            { ref: 'Ap 21,1-7', title: 'A Nova Criação', text: 'Vi um novo céu e uma nova terra, pois o primeiro céu e a primeira terra tinham passado...', bookId: 'rev', reflection: 'Como esta esperança muda a forma como enfrento as dificuldades?' },
            { ref: 'Mc 1,14-20', title: 'Seguir a Jesus', text: 'Depois que João foi preso, Jesus foi para a Galileia pregar o Evangelho de Deus...', bookId: 'mrk', reflection: 'O que precisaria largar para seguir Jesus mais de perto?' },
          ];
          const lectio = LECTIO[DAY_OF_YEAR % LECTIO.length];
          const lectioKey = `lectio_done_${TODAY_STR}`;
          const lectioDone = localStorage.getItem(lectioKey) === 'true';

          return (
            <div className="max-w-xl mx-auto mb-4">
              <div className="bg-stone-50 border border-stone-200 rounded-2xl overflow-hidden shadow-sm">
                <div className="bg-gradient-to-r from-stone-800 to-stone-900 px-4 py-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen size={14} className="text-amber-400" />
                    <span className="text-amber-400 text-[10px] font-bold uppercase tracking-widest">Lectio Divina · {lectio.ref}</span>
                  </div>
                  {lectioDone && <span className="text-emerald-400 text-[10px] font-bold">✓ Lida hoje</span>}
                </div>
                <div className="p-4">
                  <h4 className="font-serif font-bold text-stone-900 text-base mb-1">{lectio.title}</h4>
                  <p className="text-stone-600 text-sm italic leading-relaxed mb-3">"{lectio.text}"</p>
                  <div className="bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 mb-3">
                    <p className="text-[10px] font-bold text-amber-700 uppercase tracking-wider mb-0.5">Pergunta para meditação</p>
                    <p className="text-sm text-stone-700 leading-snug">{lectio.reflection}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => onSelectBook(lectio.bookId)}
                      className="flex-1 bg-stone-900 text-white font-bold text-xs py-2 rounded-xl active:scale-95 transition-all">
                      Ler o trecho completo →
                    </button>
                    {!lectioDone && (
                      <button onClick={() => {
                        localStorage.setItem(lectioKey, 'true');
                        // pequeno bônus
                        window.dispatchEvent(new CustomEvent('lectio-done'));
                      }}
                        className="bg-stone-100 text-stone-700 font-bold text-xs py-2 px-3 rounded-xl border border-stone-200 active:scale-95 transition-all">
                        Meditei ✓
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── Santo do Dia ✨ ──────────────────────────────── */}
        {(() => {
          const saintKey = `saint_seen_${TODAY_STR}`;
          const saintSeen = localStorage.getItem(saintKey) === 'true';
          return (
            <div className="max-w-xl mx-auto mb-4">
              <button onClick={() => {
                setSaintExpanded(v => !v);
                if (!saintSeen) {
                  localStorage.setItem(saintKey, 'true');
                  recordSaintEncounter(todaySaint.key);
                }
              }}
                className="w-full bg-white border border-stone-200 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-sm hover:shadow-md transition-all text-left">
                <span className="text-2xl">{todaySaint.emoji}</span>
                <div className="flex-1">
                  <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest">Santo do Dia</p>
                  <p className="font-serif font-bold text-stone-900 text-sm">{todaySaint.name}</p>
                </div>
                <span className={`text-stone-400 transition-transform ${saintExpanded ? 'rotate-180' : ''}`}>▾</span>
              </button>
              <AnimatePresence>
                {saintExpanded && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden">
                    <div className="bg-white border border-t-0 border-stone-200 rounded-b-2xl px-4 pb-4 pt-3">
                      <p className="text-stone-500 text-xs mb-2">Festa: {todaySaint.date}</p>
                      <blockquote className="border-l-4 border-amber-400 pl-3 italic text-stone-700 text-sm leading-relaxed">
                        "{todaySaint.phrase}"
                      </blockquote>
                      {!saintSeen && (
                        <p className="text-[10px] text-emerald-600 font-bold mt-2">✨ Novo santo encontrado!</p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })()}

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

          // Personaliza o rótulo pelo objetivo do onboarding
          let continueLabel = 'Continue estudando';
          try {
            const op = JSON.parse(localStorage.getItem('onboarding_profile') || '{}');
            if (op.goal === 'prayer') continueLabel = 'Ore com a Palavra hoje';
            else if (op.goal === 'knowledge') continueLabel = 'Continue aprendendo';
            else if (op.goal === 'complete') continueLabel = `${profile.completedBooks.length}/73 livros — continue!`;
            else if (op.goal === 'faith') continueLabel = 'Aprofunde sua fé hoje';
          } catch { /* ignora */ }

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
                    <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-0.5">{continueLabel}</p>
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
          return (
            <div className="max-w-xl mx-auto mb-4">
              <div className="bg-stone-900 rounded-xl p-3 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-2 opacity-5"><Sun size={60} /></div>
                <div className="relative z-10 flex items-center gap-2.5">
                  <Sun size={16} className="text-amber-400 shrink-0" />
                  <p className="flex-1 text-sm font-serif italic text-stone-100 leading-snug">
                    "{todayVerse.text}"
                    <span className="not-italic font-bold text-amber-400 ml-1.5 text-[11px]">{todayVerse.ref}</span>
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

            {/* Para iniciantes: NT primeiro (mais acessível). Para experientes: ordem canônica VT→NT */}
            {showNTFirst && ntBooks.length > 0 && (
              <section className="mb-10 md:mb-12">
                <div className="flex items-center gap-2 mb-1 border-b border-stone-200 pb-2.5">
                  <Book className="text-stone-400 w-4 h-4 shrink-0" />
                  <h2 className="text-sm md:text-2xl font-serif font-semibold text-stone-800">Novo Testamento</h2>
                  <div className="ml-auto shrink-0">
                    {(() => {
                      const totalNtCompleted = BIBLE_BOOKS.filter(b => b.testament === 'NT' && profile.completedBooks.includes(b.id)).length;
                      return <span className={`text-xs font-bold ${totalNtCompleted === 27 ? 'text-amber-600' : 'text-stone-400'}`}>{totalNtCompleted}/27</span>;
                    })()}
                  </div>
                </div>
                <p className="text-xs text-stone-400 mb-4 italic">Recomendado para quem está começando — mais direto e acessível.</p>
                {renderBookGrid(ntBooks, true)}
              </section>
            )}

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
                {renderBookGrid(vtBooks, true)}
              </section>
            )}

            {!showNTFirst && ntBooks.length > 0 && (
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
                {renderBookGrid(ntBooks, true)}
              </section>
            )}
          </>

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
