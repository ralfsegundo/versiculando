import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { BEGINNER_PATH } from '../constants';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import { sharingService } from './sharingService';
import { supabase } from '../lib/supabase';

// --- Types ---

export const AVATARS = [
  { id: 'cruz', emoji: '✝️', name: 'Cruz' },
  { id: 'pomba', emoji: '🕊️', name: 'Pomba' },
  { id: 'rosario', emoji: '📿', name: 'Rosário' },
  { id: 'biblia', emoji: '📖', name: 'Bíblia' },
  { id: 'calice', emoji: '🍷', name: 'Cálice' },
  { id: 'peixe', emoji: '🐟', name: 'Peixe' },
  { id: 'maria', emoji: '👑', name: 'Maria' },
  { id: 'jose', emoji: '🔨', name: 'José' },
  { id: 'francisco', emoji: '🐺', name: 'Francisco' },
  { id: 'teresinha', emoji: '🌹', name: 'Teresinha' },
  { id: 'anjo', emoji: '👼', name: 'Anjo' },
  { id: 'joaopaulo', emoji: '🇻🇦', name: 'João Paulo II' },
];

export type BadgeId = 
  | 'semente_fe' 
  | 'leitor_pentateuco' 
  | 'fogo_espirito' 
  | 'pomba_paz' 
  | 'servo_fiel' 
  | 'escriba' 
  | 'coracao_aberto' 
  | 'madrugador' 
  | 'peregrino' 
  | 'doutor_fe'
  | 'missao_diaria'
  | 'comunhao_santos'
  | 'guerreiro_luz'
  | 'eco_vivo'
  | 'graca_dia';

export interface Badge {
  id: BadgeId;
  title: string;
  description: string;
  emoji: string;
  unlockedAt?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  avatarUrl?: string;
  avatarId?: string;
  email?: string;
  joinDate?: string;
  weeklyActivity?: string[];
  points: number;
  pointsBreakdown?: {
    freeExploration: number;
    discipleTrail: number;
    bonus: number;
  };
  streak: number;
  lastActiveDate: string;
  title: string;
  completedBooks: string[];
  discipleCompletedBooks: string[];
  visitedBooks?: string[];
  readChapters?: Record<string, number[]>;
  notesCount: number;
  favoritesCount: number;
  dailyVerseCount: number;
  completedPlans: number;
  // Streak freeze ("Graça do Dia")
  streakFreezes: number;          // quantas graças disponíveis (máx 2)
  lastFreezeEarnedWeek?: string;  // semana ISO em que ganhou a última graça
  // Missão diária
  lastDailyMissionDate?: string;
  dailyMissionStreak: number;
  // Liga semanal
  leagueId?: string;
  // Eco reactions
  ecoReactions?: Record<string, string>; // verseRef -> emoji usado
}

export interface WeeklyChallenge {
  id: string;
  title: string;
  description: string;
  target: number;
  progress: number;
  rewardPoints: number;
  rewardBadge?: string;
  deadline: string;
  completed: boolean;
}

export type FloatingPointType = 'free' | 'disciple' | 'bonus_step' | 'bonus_trail';

interface FloatingPoint {
  id: number;
  amount: number;
  type: FloatingPointType;
}

// --- Constants ---

export const BADGES: Record<BadgeId, Omit<Badge, 'unlockedAt'>> = {
  semente_fe: { id: 'semente_fe', title: 'Semente da Fé', description: 'Estudou o primeiro livro', emoji: '🌱' },
  leitor_pentateuco: { id: 'leitor_pentateuco', title: 'Leitor do Pentateuco', description: 'Completou os 5 primeiros livros', emoji: '📖' },
  fogo_espirito: { id: 'fogo_espirito', title: 'Fogo do Espírito', description: 'Estudou 7 dias seguidos', emoji: '⚡' },
  pomba_paz: { id: 'pomba_paz', title: 'Pomba da Paz', description: 'Completou todo o Novo Testamento', emoji: '🕊️' },
  servo_fiel: { id: 'servo_fiel', title: 'Servo Fiel', description: 'Completou os 73 livros', emoji: '👑' },
  escriba: { id: 'escriba', title: 'Escriba', description: 'Fez 10 anotações pessoais', emoji: '✍️' },
  coracao_aberto: { id: 'coracao_aberto', title: 'Coração Aberto', description: 'Favoritou 20 versículos', emoji: '❤️' },
  madrugador: { id: 'madrugador', title: 'Madrugador', description: 'Acessou o versículo do dia 30 vezes', emoji: '🌅' },
  peregrino: { id: 'peregrino', title: 'Peregrino', description: 'Completou um plano de leitura inteiro', emoji: '🎯' },
  doutor_fe: { id: 'doutor_fe', title: 'Doutor da Fé', description: 'Desbloqueou todas as conquistas', emoji: '🏆' },
  // Novos
  missao_diaria: { id: 'missao_diaria', title: 'Missão Cumprida', description: 'Completou 7 missões diárias', emoji: '📋' },
  comunhao_santos: { id: 'comunhao_santos', title: 'Comunhão dos Santos', description: 'Encontrou 10 santos do dia', emoji: '✨' },
  guerreiro_luz: { id: 'guerreiro_luz', title: 'Guerreiro da Luz', description: 'Completou um desafio relâmpago', emoji: '⚔️' },
  eco_vivo: { id: 'eco_vivo', title: 'Eco Vivo', description: 'Reagiu a 15 versículos com Eco', emoji: '🔊' },
  graca_dia: { id: 'graca_dia', title: 'Graça Recebida', description: 'Usou a Graça do Dia pela primeira vez', emoji: '🕊️' },
};

export const getTitleByPoints = (points: number): string => {
  if (points >= 5000) return 'Santo';
  if (points >= 2001) return 'Profeta';
  if (points >= 501) return 'Apóstolo';
  if (points >= 101) return 'Discípulo';
  return 'Iniciante';
};

// --- Safe localStorage wrapper ---
const safeStorage = {
  getItem: (key: string): string | null => {
    try { return localStorage.getItem(key); } catch { return null; }
  },
  setItem: (key: string, value: string): void => {
    try { localStorage.setItem(key, value); } catch { /* ignore */ }
  }
};

// --- Mock Data / Local Storage Fallback ---
// In a real app, this would be entirely managed by Supabase.
// We use local storage here to ensure the preview works without a real Supabase DB setup.

const getLocalProfile = (): UserProfile => {
  const stored = safeStorage.getItem('user_profile');
  if (stored) {
    const parsed = JSON.parse(stored);
    // Migration: add discipleCompletedBooks if not present
    if (!parsed.discipleCompletedBooks) parsed.discipleCompletedBooks = [];
    if (!parsed.readChapters) parsed.readChapters = {};
    if (parsed.streakFreezes === undefined) parsed.streakFreezes = 1; // começa com 1 graça
    if (parsed.dailyMissionStreak === undefined) parsed.dailyMissionStreak = 0;
    if (!parsed.ecoReactions) parsed.ecoReactions = {};
    return parsed;
  }
  return {
    id: 'local-user',
    name: 'Peregrino',
    email: '',
    avatarId: 'cruz',
    joinDate: new Date().toISOString(),
    weeklyActivity: [new Date().toISOString()],
    points: 0,
    pointsBreakdown: {
      freeExploration: 0,
      discipleTrail: 0,
      bonus: 0,
    },
    streak: 0,
    lastActiveDate: new Date().toISOString(),
    title: 'Iniciante',
    completedBooks: [],
    discipleCompletedBooks: [],
    visitedBooks: [],
    readChapters: {},
    notesCount: 0,
    favoritesCount: 0,
    dailyVerseCount: 0,
    completedPlans: 0,
    streakFreezes: 1,
    dailyMissionStreak: 0,
    ecoReactions: {},
  };
};

const getLocalBadges = (): Badge[] => {
  const stored = safeStorage.getItem('user_badges');
  if (stored) return JSON.parse(stored);
  return [];
};

// --- Context ---

interface GamificationContextType {
  profile: UserProfile;
  userId: string | null;
  badges: Badge[];
  weeklyChallenge: WeeklyChallenge;
  addPoints: (amount: number, reason: string, category?: 'freeExploration' | 'discipleTrail' | 'bonus') => void;
  markBookCompleted: (bookId: string, isGps?: boolean) => void;
  markBookVisited: (bookId: string) => void;
  markChapterRead: (bookId: string, chapterNum: number, totalChapters: number) => void;
  addNote: () => void;
  addFavorite: () => void;
  accessDailyVerse: () => void;
  completePlan: () => void;
  checkStreak: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  showFloatingPoints: (amount: number, type: FloatingPointType) => void;
  useStreakFreeze: () => boolean;
  completeDailyMission: (missionDate: string) => void;
  addEcoReaction: (verseRef: string, emoji: string) => void;
  recordSaintEncounter: (saintKey: string) => void;
  completeFlashChallenge: () => void;
}

export const GamificationContext = createContext<GamificationContextType | null>(null);

export function GamificationProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(getLocalProfile());
  const [badges, setBadges] = useState<Badge[]>(getLocalBadges());
  const [floatingPoints, setFloatingPoints] = useState<FloatingPoint[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  // Controla se o perfil foi carregado do Supabase — evita salvar de volta logo após carregar
  const isLoadingFromSupabase = useRef(false);
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const WEEKLY_CHALLENGES: Omit<WeeklyChallenge, 'id' | 'progress' | 'deadline' | 'completed'>[] = [
    { title: 'Conclua 3 livros esta semana', description: 'Complete a leitura de qualquer 3 livros.', target: 3, rewardPoints: 100 },
    { title: 'Conclua 5 livros esta semana', description: 'Complete a leitura de qualquer 5 livros.', target: 5, rewardPoints: 150 },
    { title: 'Conclua 2 livros do NT esta semana', description: 'Leia e complete 2 livros do Novo Testamento.', target: 2, rewardPoints: 80 },
    { title: 'Conclua 4 livros esta semana', description: 'Complete a leitura de qualquer 4 livros.', target: 4, rewardPoints: 120 },
  ];

  // Desafios personalizados por tempo disponível (do onboarding)
  const getPersonalizedChallenges = (): typeof WEEKLY_CHALLENGES => {
    try {
      const saved = localStorage.getItem('onboarding_profile');
      if (!saved) return WEEKLY_CHALLENGES;
      const { timePerDay, goal } = JSON.parse(saved);
      if (timePerDay === '5') {
        return [
          { title: 'Leia 1 livro esta semana', description: 'Pequenos passos levam longe. Conclua qualquer 1 livro.', target: 1, rewardPoints: 50 },
          { title: 'Acesse o versículo do dia 5 vezes', description: 'Uma dose diária da Palavra. 5 dias seguidos.', target: 5, rewardPoints: 60 },
        ];
      }
      if (timePerDay === '15') {
        return [
          { title: 'Conclua 2 livros esta semana', description: '15 minutos por dia, resultados reais.', target: 2, rewardPoints: 75 },
          { title: 'Conclua 3 livros esta semana', description: 'Continue no ritmo. Mais 3 livros!', target: 3, rewardPoints: 100 },
        ];
      }
      if (timePerDay === '60') {
        return [
          { title: 'Conclua 7 livros esta semana', description: 'Você tem tempo e disposição. Use os dois!', target: 7, rewardPoints: 200 },
          { title: 'Conclua 5 livros esta semana', description: 'Semana intensa. Bora lá!', target: 5, rewardPoints: 150 },
        ];
      }
      if (goal === 'complete') {
        return [
          { title: 'Conclua 5 livros esta semana', description: 'Rumo aos 73! Mais 5 livros.', target: 5, rewardPoints: 150 },
          { title: 'Conclua 4 livros esta semana', description: 'Cada livro é um passo para a meta.', target: 4, rewardPoints: 120 },
        ];
      }
    } catch { /* ignora */ }
    return WEEKLY_CHALLENGES;
  };

  const getStoredChallenge = (): WeeklyChallenge => {
    const stored = safeStorage.getItem('weekly_challenge');
    if (stored) {
      try {
        const parsed: WeeklyChallenge = JSON.parse(stored);
        // Still valid if deadline hasn't passed
        if (new Date(parsed.deadline) > new Date()) return parsed;
      } catch { /* ignore */ }
    }
    // Generate a new challenge using personalized pool
    const pool = getPersonalizedChallenges();
    const template = pool[Math.floor(Math.random() * pool.length)];
    const challenge: WeeklyChallenge = {
      ...template,
      id: `week-${Date.now()}`,
      progress: 0,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      completed: false,
    };
    safeStorage.setItem('weekly_challenge', JSON.stringify(challenge));
    return challenge;
  };

  const [weeklyChallenge, setWeeklyChallenge] = useState<WeeklyChallenge>(getStoredChallenge);

  // Load from Supabase on mount/auth change
  useEffect(() => {
    const loadSupabaseData = async () => {
      const hasSupabase = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!hasSupabase) return;

      try {
        const sessionResult = await Promise.race([
          supabase.auth.getSession(),
          new Promise<never>((_, reject) => setTimeout(() => reject(new Error('session timeout')), 5000)),
        ]) as Awaited<ReturnType<typeof supabase.auth.getSession>>;

        const session = sessionResult?.data?.session;
        if (!session?.user) return;

        setUserId(session.user.id);
        const authEmail = session.user.email || '';

        // Marca que estamos carregando do Supabase — evita o saveToSupabase disparar logo em seguida
        isLoadingFromSupabase.current = true;

        // Load profile
        const { data: profileData } = await Promise.race([
          supabase.from('profiles').select('*').eq('id', session.user.id).single(),
          new Promise<{ data: null; error: Error }>((resolve) =>
            setTimeout(() => resolve({ data: null, error: new Error('timeout') }), 6000)
          ),
        ]) as any;

        if (profileData) {
          setProfile(prev => ({
            ...prev,
            ...profileData,
            email: profileData.email || authEmail,
            completedBooks: profileData.completed_books || [],
            discipleCompletedBooks: profileData.disciple_completed_books || [],
            visitedBooks: profileData.visited_books || [],
            readChapters: profileData.read_chapters || {},
            pointsBreakdown: profileData.points_breakdown || prev.pointsBreakdown,
            weeklyActivity: profileData.weekly_activity || [],
            avatarId: profileData.avatar_id || prev.avatarId,
            avatarUrl: profileData.avatar_url || prev.avatarUrl,
            lastActiveDate: profileData.last_active_date || prev.lastActiveDate,
            joinDate: profileData.join_date || prev.joinDate,
            notesCount: profileData.notes_count || 0,
            favoritesCount: profileData.favorites_count || 0,
            dailyVerseCount: profileData.daily_verse_count || 0,
            completedPlans: profileData.completed_plans || 0,
          }));
        } else {
          setProfile(prev => ({ ...prev, email: authEmail }));
        }

        // Load badges
        const { data: badgesData } = await Promise.race([
          supabase.from('user_badges').select('*').eq('user_id', session.user.id),
          new Promise<{ data: null; error: Error }>((resolve) =>
            setTimeout(() => resolve({ data: null, error: new Error('timeout') }), 5000)
          ),
        ]) as any;

        if (badgesData && badgesData.length > 0) {
          setBadges(badgesData.map((b: any) => ({
            id: b.badge_id as BadgeId,
            title: b.title,
            description: b.description,
            emoji: b.emoji,
            unlockedAt: b.unlocked_at
          })));
        }

        // Aguarda o React processar os setState antes de liberar o save
        setTimeout(() => { isLoadingFromSupabase.current = false; }, 500);
      } catch (e) {
        console.warn('[gamification] loadSupabaseData error:', e);
        isLoadingFromSupabase.current = false;
      }
    };
    
    loadSupabaseData();
  }, []);

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  };

  useEffect(() => {
    if (profile.email && userId) {
      sharingService.register(profile);
    }
  }, [profile.email, profile.avatarId, profile.avatarUrl, profile.name, userId]);

  // Salva no Supabase com debounce de 2s — evita flood de requests
  // e não salva enquanto estiver carregando dados do Supabase
  useEffect(() => {
    safeStorage.setItem('user_profile', JSON.stringify(profile));
    safeStorage.setItem('user_badges', JSON.stringify(badges));
    safeStorage.setItem('weekly_challenge', JSON.stringify(weeklyChallenge));

    // Não salva se: sem userId, sem Supabase, ou se acabou de carregar do banco
    if (!userId || isLoadingFromSupabase.current) return;

    const hasSupabase = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!hasSupabase) return;

    // Debounce: cancela saves anteriores, aguarda 2s de inatividade antes de salvar
    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(async () => {
      if (isSyncing) return;
      setIsSyncing(true);
      try {
        await supabase.from('profiles').upsert({
          id: userId,
          name: profile.name,
          email: profile.email,
          avatar_id: profile.avatarId,
          avatar_url: profile.avatarUrl,
          join_date: profile.joinDate,
          weekly_activity: profile.weeklyActivity,
          points: profile.points,
          points_breakdown: profile.pointsBreakdown,
          streak: profile.streak,
          last_active_date: profile.lastActiveDate,
          title: profile.title,
          completed_books: profile.completedBooks,
          disciple_completed_books: profile.discipleCompletedBooks,
          visited_books: profile.visitedBooks,
          read_chapters: profile.readChapters,
          notes_count: profile.notesCount,
          favorites_count: profile.favoritesCount,
          daily_verse_count: profile.dailyVerseCount,
          completed_plans: profile.completedPlans,
          updated_at: new Date().toISOString()
        });
      } catch (err) {
        console.warn('[gamification] saveToSupabase error:', err);
      } finally {
        setIsSyncing(false);
      }
    }, 2000);
  }, [profile, userId]);

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FFA500', '#FF4500', '#87CEEB', '#32CD32']
    });
  };

  const showFloatingPoints = useCallback((amount: number, type: FloatingPointType) => {
    const id = Date.now() + Math.random();
    setFloatingPoints(prev => [...prev, { id, amount, type }]);
    setTimeout(() => {
      setFloatingPoints(prev => prev.filter(fp => fp.id !== id));
    }, 3000);
  }, []);

  const unlockBadge = async (badgeId: BadgeId) => {
    if (!badges.find(b => b.id === badgeId)) {
      const badgeDef = BADGES[badgeId];
      const unlockedAt = new Date().toISOString();
      const newBadge = { ...badgeDef, unlockedAt };
      setBadges(prev => [...prev, newBadge]);
      triggerConfetti();
      
      const hasSupabase = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (userId && hasSupabase) {
        try {
          await supabase.from('user_badges').insert({
            user_id: userId,
            badge_id: badgeId,
            title: badgeDef.title,
            description: badgeDef.description,
            emoji: badgeDef.emoji,
            unlocked_at: unlockedAt
          });
        } catch (err) {
          console.error('Error syncing badge to Supabase', err);
        }
      }
    }
  };

  const checkBadges = (newProfile: UserProfile) => {
    if (newProfile.completedBooks.length >= 1) unlockBadge('semente_fe');
    
    // Check Pentateuch (Gen, Exo, Lev, Num, Deu)
    const pentateuch = ['gen', 'exo', 'lev', 'num', 'deu'];
    if (pentateuch.every(id => newProfile.completedBooks.includes(id))) unlockBadge('leitor_pentateuco');
    
    if (newProfile.streak >= 7) unlockBadge('fogo_espirito');
    
    // Check NT (27 books) - simplified check here
    const ntBooksCount = newProfile.completedBooks.filter(id => ['mat', 'mrk', 'luk', 'jhn', 'act', 'rom', '1co', '2co', 'gal', 'eph', 'php', 'col', '1th', '2th', '1ti', '2ti', 'tit', 'phm', 'heb', 'jas', '1pe', '2pe', '1jn', '2jn', '3jn', 'jud', 'rev'].includes(id)).length;
    if (ntBooksCount >= 27) unlockBadge('pomba_paz');
    
    if (newProfile.completedBooks.length >= 73) unlockBadge('servo_fiel');
    if (newProfile.notesCount >= 10) unlockBadge('escriba');
    if (newProfile.favoritesCount >= 20) unlockBadge('coracao_aberto');
    if (newProfile.dailyVerseCount >= 30) unlockBadge('madrugador');
    if (newProfile.completedPlans >= 1) unlockBadge('peregrino');
    
    if (badges.length >= 9 && !badges.find(b => b.id === 'doutor_fe')) unlockBadge('doutor_fe');
  };

  const addPoints = (amount: number, reason: string, category?: 'freeExploration' | 'discipleTrail' | 'bonus') => {
    setProfile(prev => {
      const newPoints = prev.points + amount;
      const newBreakdown = { ...(prev.pointsBreakdown || { freeExploration: 0, discipleTrail: 0, bonus: 0 }) };
      if (category) {
        newBreakdown[category] += amount;
      }

      const newProfile = {
        ...prev,
        points: newPoints,
        pointsBreakdown: newBreakdown,
        title: getTitleByPoints(newPoints)
      };

      // Log to localStorage event log for future Supabase sync
      const eventLog = JSON.parse(safeStorage.getItem('points_event_log') || '[]');
      eventLog.push({
        type: reason,
        points: amount,
        category,
        timestamp: new Date().toISOString()
      });
      safeStorage.setItem('points_event_log', JSON.stringify(eventLog));

      return newProfile;
    });
  };

  const checkStreak = () => {
    const now = new Date();
    const lastActive = new Date(profile.lastActiveDate);

    const toDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diffDays = Math.round((toDay(now) - toDay(lastActive)) / (1000 * 60 * 60 * 24));

    setProfile(prev => {
      let newStreak = prev.streak;
      let newFreezes = prev.streakFreezes ?? 1;

      // Ganhar 1 Graça por semana (máx 2)
      const weekKey = `${now.getFullYear()}-W${Math.ceil(now.getDate() / 7)}`;
      if (prev.lastFreezeEarnedWeek !== weekKey && newFreezes < 2) {
        newFreezes = Math.min(2, newFreezes + 1);
      }

      if (diffDays === 0) {
        if (newStreak === 0) newStreak = 1;
        const newProfile = { ...prev, streak: newStreak, streakFreezes: newFreezes, lastFreezeEarnedWeek: weekKey, lastActiveDate: now.toISOString() };
        checkBadges(newProfile);
        return newProfile;
      } else if (diffDays === 1) {
        newStreak += 1;
      } else if (diffDays === 2 && newFreezes > 0) {
        // Usou Graça automaticamente para 1 dia perdido
        newFreezes -= 1;
        newStreak += 1; // mantém streak
        unlockBadge('graca_dia');
      } else {
        newStreak = 1;
      }

      const newProfile = {
        ...prev,
        streak: newStreak,
        streakFreezes: newFreezes,
        lastFreezeEarnedWeek: weekKey,
        lastActiveDate: now.toISOString()
      };
      checkBadges(newProfile);
      return newProfile;
    });
  };

  // Usa Graça do Dia manualmente (o usuário pode clicar se viu que perdeu um dia)
  const useStreakFreeze = (): boolean => {
    if (profile.streakFreezes <= 0) return false;
    setProfile(prev => ({
      ...prev,
      streakFreezes: prev.streakFreezes - 1,
    }));
    unlockBadge('graca_dia');
    return true;
  };

  // Completa missão diária
  const completeDailyMission = (missionDate: string) => {
    const today = new Date().toISOString().split('T')[0];
    if (profile.lastDailyMissionDate === today) return; // já completou hoje
    setProfile(prev => {
      const newMissionStreak = (prev.lastDailyMissionDate === new Date(Date.now() - 86400000).toISOString().split('T')[0])
        ? prev.dailyMissionStreak + 1
        : 1;
      const newProfile = { ...prev, lastDailyMissionDate: today, dailyMissionStreak: newMissionStreak };
      if (newMissionStreak >= 7) unlockBadge('missao_diaria');
      return newProfile;
    });
    addPoints(25, 'Missão diária concluída', 'bonus');
    showFloatingPoints(25, 'bonus_step');
  };

  // Eco reaction em versículo
  const addEcoReaction = (verseRef: string, emoji: string) => {
    setProfile(prev => {
      const current = prev.ecoReactions || {};
      const newEco = { ...current, [verseRef]: emoji };
      const ecoCount = Object.keys(newEco).length;
      const newProfile = { ...prev, ecoReactions: newEco };
      if (ecoCount >= 15) unlockBadge('eco_vivo');
      return newProfile;
    });
    // Salva no Supabase em background
    const hasSupabase = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (hasSupabase && profile.email) {
      supabase.from('verse_eco_reactions').upsert({
        user_email: profile.email,
        verse_ref: verseRef,
        emoji,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_email,verse_ref' }).then(() => {}).catch(() => {});
    }
  };

  // Badge: encontrou santo do dia
  const recordSaintEncounter = (saintKey: string) => {
    const key = 'saints_encountered';
    const existing: string[] = JSON.parse(safeStorage.getItem(key) || '[]');
    if (!existing.includes(saintKey)) {
      const updated = [...existing, saintKey];
      safeStorage.setItem(key, JSON.stringify(updated));
      if (updated.length >= 10) unlockBadge('comunhao_santos');
    }
  };

  // Badge: desafio relâmpago
  const completeFlashChallenge = () => {
    unlockBadge('guerreiro_luz');
    addPoints(200, 'Desafio relâmpago concluído', 'bonus');
    showFloatingPoints(200, 'bonus_trail');
  };

  const markBookCompleted = (bookId: string, isGps: boolean = false) => {
    if (!profile.completedBooks.includes(bookId)) {
      setProfile(prev => {
        const newCompletedBooks = [...prev.completedBooks, bookId];
        const newProfile = {
          ...prev,
          completedBooks: newCompletedBooks,
          discipleCompletedBooks: isGps
            ? [...(prev.discipleCompletedBooks || []), bookId]
            : (prev.discipleCompletedBooks || []),
        };
        checkBadges(newProfile);
        return newProfile;
      });

      // Update WeeklyChallenge progress if this book matches the challenge
      setWeeklyChallenge(prev => {
        if (prev.completed) return prev;
        const newProgress = prev.progress + 1;
        const completed = newProgress >= prev.target;
        return { ...prev, progress: newProgress, completed };
      });

      if (isGps) {
        addPoints(100, `Completou livro ${bookId} na Trilha do Discípulo`, 'discipleTrail');
        showFloatingPoints(100, 'disciple');
      } else {
        addPoints(50, `Completou livro ${bookId} livremente`, 'freeExploration');
        showFloatingPoints(50, 'free');
      }

      // Post automático no feed da comunidade
      if (profile.email) {
        const hasSupabase = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (hasSupabase) {
          const BIBLE_BOOKS_MAP: Record<string, string> = {
            'gen':'Gênesis','exo':'Êxodo','lev':'Levítico','num':'Números','deu':'Deuteronômio',
            'jos':'Josué','jdg':'Juízes','rut':'Rute','1sa':'1 Samuel','2sa':'2 Samuel',
            '1ki':'1 Reis','2ki':'2 Reis','1ch':'1 Crônicas','2ch':'2 Crônicas','ezr':'Esdras',
            'neh':'Neemias','tob':'Tobias','jdt':'Judite','est':'Ester','1ma':'1 Macabeus',
            '2ma':'2 Macabeus','job':'Jó','psa':'Salmos','pro':'Provérbios','ecc':'Eclesiastes',
            'sng':'Cânticos','wis':'Sabedoria','sir':'Eclesiástico','isa':'Isaías','jer':'Jeremias',
            'lam':'Lamentações','bar':'Baruc','ezk':'Ezequiel','dan':'Daniel','hos':'Oseias',
            'jol':'Joel','amo':'Amós','oba':'Obadias','jon':'Jonas','mic':'Miqueias','nam':'Naum',
            'hab':'Habacuque','zep':'Sofonias','hag':'Ageu','zec':'Zacarias','mal':'Malaquias',
            'mat':'Mateus','mrk':'Marcos','luk':'Lucas','jhn':'João','act':'Atos','rom':'Romanos',
            '1co':'1 Coríntios','2co':'2 Coríntios','gal':'Gálatas','eph':'Efésios','php':'Filipenses',
            'col':'Colossenses','1th':'1 Tessalonicenses','2th':'2 Tessalonicenses','1ti':'1 Timóteo',
            '2ti':'2 Timóteo','tit':'Tito','phm':'Filemom','heb':'Hebreus','jas':'Tiago',
            '1pe':'1 Pedro','2pe':'2 Pedro','1jn':'1 João','2jn':'2 João','3jn':'3 João',
            'jud':'Judas','rev':'Apocalipse',
          };
          const bookName = BIBLE_BOOKS_MAP[bookId] || bookId;
          const action = isGps
            ? `concluiu "${bookName}" pela Trilha do Discípulo 🧭`
            : `concluiu o livro de "${bookName}" 📖`;
          supabase.from('community_feed').insert({
            user_name: profile.name,
            user_email: profile.email,
            avatar_id: profile.avatarId || '',
            action,
          }).then(() => {}).catch(() => {});
        }
      }

      // Check if entire Trilha do Discípulo is now complete → trigger completePlan
      const discipleBookIds = BEGINNER_PATH.flatMap(step => step.books);
      const allDiscipleCompleted = discipleBookIds.every(
        id => id === bookId || profile.completedBooks.includes(id)
      );
      if (allDiscipleCompleted) {
        setProfile(prev => {
          const newProfile = { ...prev, completedPlans: prev.completedPlans + 1 };
          checkBadges(newProfile);
          return newProfile;
        });
      }

    } else if (isGps && !profile.discipleCompletedBooks?.includes(bookId)) {
      // Book already completed freely, now completing via Trilha do Discipulo — register completion
      setProfile(prev => ({
        ...prev,
        discipleCompletedBooks: [...(prev.discipleCompletedBooks || []), bookId],
      }));
      addPoints(50, `Reconquistou ${bookId} pela Trilha do Discípulo`, 'discipleTrail');
      showFloatingPoints(50, 'disciple');
    }
  };

  const markBookVisited = (bookId: string) => {
    if (!profile.visitedBooks?.includes(bookId)) {
      setProfile(prev => ({
        ...prev,
        visitedBooks: [...(prev.visitedBooks || []), bookId]
      }));
      addPoints(10, `Visitou livro ${bookId}`, 'freeExploration');
      showFloatingPoints(10, 'free');
    }
  };

  const markChapterRead = (bookId: string, chapterNum: number, _totalChapters: number) => {
    setProfile(prev => {
      const currentRead = prev.readChapters?.[bookId] || [];
      const isAlreadyRead = currentRead.includes(chapterNum);
      const updatedRead = isAlreadyRead
        ? currentRead.filter(c => c !== chapterNum)
        : [...currentRead, chapterNum];
      return {
        ...prev,
        readChapters: { ...(prev.readChapters || {}), [bookId]: updatedRead }
      };
    });
  };

  const addNote = () => {
    setProfile(prev => {
      const newProfile = { ...prev, notesCount: prev.notesCount + 1 };
      checkBadges(newProfile);
      return newProfile;
    });
    addPoints(20, 'Fez uma anotação', 'freeExploration');
  };

  const addFavorite = () => {
    setProfile(prev => {
      const newProfile = { ...prev, favoritesCount: prev.favoritesCount + 1 };
      checkBadges(newProfile);
      return newProfile;
    });
    addPoints(5, 'Favoritou um versículo', 'freeExploration');
  };

  const accessDailyVerse = () => {
    setProfile(prev => {
      const newProfile = { ...prev, dailyVerseCount: prev.dailyVerseCount + 1 };
      checkBadges(newProfile);
      return newProfile;
    });
    addPoints(15, 'Acessou versículo do dia', 'freeExploration');
  };

  const completePlan = () => {
    setProfile(prev => {
      const newProfile = { ...prev, completedPlans: prev.completedPlans + 1 };
      checkBadges(newProfile);
      return newProfile;
    });
  };

  // Check streak on mount
  useEffect(() => {
    checkStreak();
  }, []);

  return (
    <GamificationContext.Provider value={{
      profile,
      userId,
      badges,
      weeklyChallenge,
      addPoints,
      markBookCompleted,
      markBookVisited,
      markChapterRead,
      addNote,
      addFavorite,
      accessDailyVerse,
      completePlan,
      checkStreak,
      updateProfile,
      showFloatingPoints,
      useStreakFreeze,
      completeDailyMission,
      addEcoReaction,
      recordSaintEncounter,
      completeFlashChallenge,
    }}>
      {children}
      
      {/* Floating Points Overlay */}
      <div className="fixed inset-0 pointer-events-none z-[100] flex items-center justify-center">
        <AnimatePresence>
          {floatingPoints.map(fp => (
            <motion.div
              key={fp.id}
              initial={{ opacity: 0, y: 50, scale: 0.8 }}
              animate={{ opacity: 1, y: -50, scale: 1 }}
              exit={{ opacity: 0, y: -100, scale: 1.2 }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              className="absolute"
            >
              {fp.type === 'free' && (
                <div className="text-stone-900 font-bold text-2xl drop-shadow-md">
                  +{fp.amount} pts
                </div>
              )}
              {fp.type === 'disciple' && (
                <div className="text-amber-500 font-bold text-3xl drop-shadow-lg flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-amber-200">
                  +{fp.amount} pts ⭐
                </div>
              )}
              {fp.type === 'bonus_step' && (
                <div className="text-orange-500 font-black text-4xl drop-shadow-xl flex items-center gap-2 bg-white/90 backdrop-blur-sm px-6 py-3 rounded-full border-2 border-orange-300">
                  +{fp.amount} pts BÔNUS!
                </div>
              )}
              {fp.type === 'bonus_trail' && (
                <div className="text-amber-400 font-black text-5xl drop-shadow-2xl flex items-center gap-3 bg-stone-900/90 backdrop-blur-md px-8 py-4 rounded-full border-4 border-amber-400">
                  +{fp.amount} pts 🏆
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </GamificationContext.Provider>
  );
}

export const useGamification = () => {
  const context = useContext(GamificationContext);
  if (!context) throw new Error('useGamification must be used within GamificationProvider');
  return context;
};
