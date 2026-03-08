import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { BEGINNER_PATH, BIBLE_BOOKS } from '../constants';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import { sharingService } from './sharingService';
import { supabase } from '../lib/supabase';
import { scheduleStreakNotification, cancelStreakNotification, markTodayActive } from './notifications';

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
  longestStreak: number;
  lastActiveDate: string;
  title: string;
  completedBooks: string[];
  discipleCompletedBooks: string[];
  visitedBooks?: string[];
  readChapters?: Record<string, number[]>;
  xpChapters?: Record<string, number[]>;
  notesCount: number;
  favoritesCount: number;
  dailyVerseCount: number;
  completedPlans: number;
  streakFreezes: number;
  lastFreezeEarnedWeek?: string;
  lastDailyMissionDate?: string;
  dailyMissionStreak: number;
  leagueId?: string;
  ecoReactions?: Record<string, string>;
  bibleFavorites?: Record<string, boolean>;
  bibleFavoritesEver?: Record<string, boolean>;
  // Novos campos para persistência remota
  onboardingDone?: boolean;
  lastDailyVerseDate?: string;
  lastFlashChallengeWeek?: string;
  lastSaintSeenDate?: string;
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

export type FloatingPointType = 'free' | 'disciple' | 'bonus_step' | 'bonus_trail' | 'streak';

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
  missao_diaria: { id: 'missao_diaria', title: 'Missão Cumprida', description: 'Completou 7 missões diárias', emoji: '📋' },
  comunhao_santos: { id: 'comunhao_santos', title: 'Comunhão dos Santos', description: 'Encontrou 10 santos do dia', emoji: '✨' },
  guerreiro_luz: { id: 'guerreiro_luz', title: 'Guerreiro da Luz', description: 'Completou um desafio relâmpago', emoji: '⚔️' },
  eco_vivo: { id: 'eco_vivo', title: 'Eco Vivo', description: 'Reagiu a 15 versículos com Eco', emoji: '🔊' },
  graca_dia: { id: 'graca_dia', title: 'Graça Recebida', description: 'Usou a Graça do Dia pela primeira vez', emoji: '🕊️' },
};

export const getTitleByPoints = (points: number): string => {
  if (points >= 15000) return 'Santo';
  if (points >= 6000)  return 'Doutor';
  if (points >= 2500)  return 'Profeta';
  if (points >= 800)   return 'Apóstolo';
  if (points >= 200)   return 'Discípulo';
  return 'Iniciante';
};

export const getStreakMultiplier = (streak: number): number => {
  if (streak >= 30) return 2.0;
  if (streak >= 14) return 1.5;
  if (streak >= 7)  return 1.25;
  return 1.0;
};

export const applyMultiplier = (base: number, streak: number): number =>
  Math.round(base * getStreakMultiplier(streak));

// --- Initial State ---

const getInitialProfile = (): UserProfile => ({
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
  longestStreak: 0,
  lastActiveDate: new Date().toISOString(),
  title: 'Iniciante',
  completedBooks: [],
  discipleCompletedBooks: [],
  visitedBooks: [],
  readChapters: {},
  xpChapters: {},
  notesCount: 0,
  favoritesCount: 0,
  dailyVerseCount: 0,
  completedPlans: 0,
  streakFreezes: 1,
  dailyMissionStreak: 0,
  ecoReactions: {},
  bibleFavorites: {},
  bibleFavoritesEver: {},
  onboardingDone: false,
});

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
  markAllChaptersRead: (bookId: string, chapterNums: number[]) => void;
  addNote: () => void;
  addFavorite: () => void;
  updateFavorites: (favorites: Record<string, boolean>, favoritesEver: Record<string, boolean>) => void;
  accessDailyVerse: () => void;
  completePlan: () => void;
  checkStreak: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  showFloatingPoints: (amount: number, type: FloatingPointType) => void;
  useStreakFreeze: () => boolean;
  completeDailyMission: (missionDate?: string) => void;
  addEcoReaction: (verseRef: string, emoji: string) => void;
  recordSaintEncounter: (saintKey: string) => void;
  completeFlashChallenge: () => void;
  notificationTrigger: boolean;
  clearNotificationTrigger: () => void;
  triggerNotificationPrompt: () => void;
}

export const GamificationContext = createContext<GamificationContextType | null>(null);

export function GamificationProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(getInitialProfile());
  const [badges, setBadges] = useState<Badge[]>([]);
  const [floatingPoints, setFloatingPoints] = useState<FloatingPoint[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [supabaseReady, setSupabaseReady] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const isLoadingFromSupabase = useRef(false);
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasCheckedStreak = useRef(false);
  const [notificationTrigger, setNotificationTrigger] = useState(false);
  const notifAlreadyTriggered = useRef(false);

  const fireNotificationTrigger = useCallback(() => {
    if (notifAlreadyTriggered.current) return;
    notifAlreadyTriggered.current = true;
    setNotificationTrigger(true);
  }, []);

  const clearNotificationTrigger = useCallback(() => {
    setNotificationTrigger(false);
  }, []);

  useEffect(() => {
    cancelStreakNotification();
    markTodayActive();
  }, []);

  useEffect(() => {
    if (profile.streak > 0) {
      scheduleStreakNotification(profile.streak);
    }
  }, [profile.streak]);

  const WEEKLY_CHALLENGES: Omit<WeeklyChallenge, 'id' | 'progress' | 'deadline' | 'completed'>[] = [
    { title: 'Conclua 3 livros esta semana', description: 'Complete a leitura de qualquer 3 livros.', target: 3, rewardPoints: 300 },
    { title: 'Conclua 5 livros esta semana', description: 'Complete a leitura de qualquer 5 livros.', target: 5, rewardPoints: 500 },
    { title: 'Conclua 2 livros do NT esta semana', description: 'Leia e complete 2 livros do Novo Testamento.', target: 2, rewardPoints: 250 },
    { title: 'Conclua 4 livros esta semana', description: 'Complete a leitura de qualquer 4 livros.', target: 4, rewardPoints: 400 },
  ];

  const getStoredChallenge = (): WeeklyChallenge => {
    const pool = WEEKLY_CHALLENGES;
    const template = pool[Math.floor(Math.random() * pool.length)];
    return {
      ...template,
      id: `week-${Date.now()}`,
      progress: 0,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      completed: false,
    };
  };

  const [weeklyChallenge, setWeeklyChallenge] = useState<WeeklyChallenge>(getStoredChallenge);

  // Load from Supabase on mount/auth change
  useEffect(() => {
    const loadSupabaseData = async () => {
      const hasSupabase = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!hasSupabase) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) {
          setSupabaseReady(true);
          return;
        }

        setUserId(session.user.id);
        isLoadingFromSupabase.current = true;

        const { data: profileData } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
        const { data: badgesData } = await supabase.from('user_badges').select('*').eq('user_id', session.user.id);

        if (profileData) {
          setProfile({
            ...getInitialProfile(),
            id: session.user.id,
            name: profileData.name || 'Peregrino',
            email: session.user.email || '',
            avatarId: profileData.avatar_id || 'cruz',
            avatarUrl: profileData.avatar_url,
            joinDate: profileData.join_date,
            weeklyActivity: profileData.weekly_activity || [],
            points: profileData.points || 0,
            pointsBreakdown: profileData.points_breakdown || { freeExploration: 0, discipleTrail: 0, bonus: 0 },
            streak: profileData.streak || 0,
            longestStreak: profileData.longest_streak || 0,
            lastActiveDate: profileData.last_active_date || new Date().toISOString(),
            title: profileData.title || 'Iniciante',
            completedBooks: profileData.completed_books || [],
            discipleCompletedBooks: profileData.disciple_completed_books || [],
            visitedBooks: profileData.visited_books || [],
            readChapters: profileData.read_chapters || {},
            xpChapters: profileData.xp_chapters || {},
            notesCount: profileData.notes_count || 0,
            favoritesCount: profileData.favorites_count || 0,
            dailyVerseCount: profileData.daily_verse_count || 0,
            completedPlans: profileData.completed_plans || 0,
            streakFreezes: profileData.streak_freezes || 1,
            lastFreezeEarnedWeek: profileData.last_freeze_earned_week,
            lastDailyMissionDate: profileData.last_daily_mission_date,
            dailyMissionStreak: profileData.daily_mission_streak || 0,
            onboardingDone: profileData.onboarding_done || false,
            lastDailyVerseDate: profileData.last_daily_verse_date,
            lastFlashChallengeWeek: profileData.last_flash_challenge_week,
            lastSaintSeenDate: profileData.last_saint_seen_date,
          });
        }

        if (badgesData) {
          setBadges(badgesData.map(b => ({
            id: b.badge_id as BadgeId,
            title: b.title,
            description: b.description,
            emoji: b.emoji,
            unlockedAt: b.unlocked_at
          })));
        }

        setSupabaseReady(true);
        isLoadingFromSupabase.current = false;
      } catch (err) {
        console.error('[gamification] loadSupabaseData error:', err);
        setSupabaseReady(true);
      }
    };

    loadSupabaseData();
  }, []);

  // Save to Supabase (Debounced)
  useEffect(() => {
    if (!userId || isLoadingFromSupabase.current || !supabaseReady) return;

    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    saveDebounceRef.current = setTimeout(async () => {
      setIsSyncing(true);
      try {
        await supabase.from('profiles').upsert({
          id: userId,
          name: profile.name,
          avatar_id: profile.avatarId,
          avatar_url: profile.avatarUrl,
          weekly_activity: profile.weeklyActivity,
          points: profile.points,
          points_breakdown: profile.pointsBreakdown,
          streak: profile.streak,
          longest_streak: profile.longestStreak,
          last_active_date: profile.lastActiveDate,
          title: profile.title,
          completed_books: profile.completedBooks,
          disciple_completed_books: profile.discipleCompletedBooks,
          visited_books: profile.visitedBooks,
          read_chapters: profile.readChapters,
          xp_chapters: profile.xpChapters,
          notes_count: profile.notesCount,
          favorites_count: profile.favoritesCount,
          daily_verse_count: profile.dailyVerseCount,
          completed_plans: profile.completedPlans,
          streak_freezes: profile.streakFreezes,
          last_freeze_earned_week: profile.lastFreezeEarnedWeek,
          last_daily_mission_date: profile.lastDailyMissionDate,
          daily_mission_streak: profile.dailyMissionStreak,
          onboarding_done: profile.onboardingDone,
          last_daily_verse_date: profile.lastDailyVerseDate,
          last_flash_challenge_week: profile.lastFlashChallengeWeek,
          last_saint_seen_date: profile.lastSaintSeenDate,
          updated_at: new Date().toISOString()
        });
      } catch (err) {
        console.warn('[gamification] saveToSupabase error:', err);
      } finally {
        setIsSyncing(false);
      }
    }, 2000);

    return () => {
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    };
  }, [profile, userId, supabaseReady]);

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
      
      if (userId) {
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

  const checkBadges = (newProfile: UserProfile, currentBadges: Badge[] = badges) => {
    if (newProfile.completedBooks.length >= 1) unlockBadge('semente_fe');
    const pentateuch = ['gen', 'exo', 'lev', 'num', 'deu'];
    if (pentateuch.every(id => newProfile.completedBooks.includes(id))) unlockBadge('leitor_pentateuco');
    if (newProfile.streak >= 7) unlockBadge('fogo_espirito');
    const ntBooksCount = newProfile.completedBooks.filter(id => ['mat', 'mrk', 'luk', 'jhn', 'act', 'rom', '1co', '2co', 'gal', 'eph', 'php', 'col', '1th', '2th', '1ti', '2ti', 'tit', 'phm', 'heb', 'jas', '1pe', '2pe', '1jn', '2jn', '3jn', 'jud', 'rev'].includes(id)).length;
    if (ntBooksCount >= 27) unlockBadge('pomba_paz');
    if (newProfile.completedBooks.length >= 73) unlockBadge('servo_fiel');
    if (newProfile.notesCount >= 10) unlockBadge('escriba');
    if (newProfile.favoritesCount >= 20) unlockBadge('coracao_aberto');
    if (newProfile.dailyVerseCount >= 30) unlockBadge('madrugador');
    if (newProfile.completedPlans >= 1) unlockBadge('peregrino');
    const totalOtherBadges = Object.keys(BADGES).filter(id => id !== 'doutor_fe').length;
    if (currentBadges.length >= totalOtherBadges && !currentBadges.find(b => b.id === 'doutor_fe')) unlockBadge('doutor_fe');
  };

  const addPoints = (amount: number, reason: string, category?: 'freeExploration' | 'discipleTrail' | 'bonus') => {
    setProfile(prev => {
      const newPoints = prev.points + amount;
      const newBreakdown = { ...(prev.pointsBreakdown || { freeExploration: 0, discipleTrail: 0, bonus: 0 }) };
      if (category) newBreakdown[category] += amount;
      const newProfile = {
        ...prev,
        points: newPoints,
        pointsBreakdown: newBreakdown,
        title: getTitleByPoints(newPoints)
      };
      return newProfile;
    });
  };

  const checkStreak = () => {
    const now = new Date();
    const toDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

    setProfile(prev => {
      const lastActive = new Date(prev.lastActiveDate);
      const diffDays = Math.round((toDay(now) - toDay(lastActive)) / (1000 * 60 * 60 * 24));

      let newStreak = prev.streak;
      let newFreezes = prev.streakFreezes ?? 1;

      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const isoWeek = Math.ceil(((now.getTime() - startOfYear.getTime()) / 86400000 + startOfYear.getDay() + 1) / 7);
      const weekKey = `${now.getFullYear()}-W${isoWeek}`;
      if (prev.lastFreezeEarnedWeek !== weekKey && newFreezes < 2) {
        newFreezes = Math.min(2, newFreezes + 1);
      }

      if (diffDays === 0) {
        if (newStreak === 0) newStreak = 1;
        const newProfile = { ...prev, streak: newStreak, longestStreak: Math.max(prev.longestStreak || 0, newStreak), streakFreezes: newFreezes, lastFreezeEarnedWeek: weekKey, lastActiveDate: now.toISOString() };
        checkBadges(newProfile);
        return newProfile;
      } else if (diffDays === 1) {
        newStreak += 1;
      } else if (diffDays === 2 && newFreezes > 0) {
        newFreezes -= 1;
        newStreak += 1;
        unlockBadge('graca_dia');
      } else {
        newStreak = 1;
      }

      const newProfile = {
        ...prev,
        streak: newStreak,
        longestStreak: Math.max(prev.longestStreak || 0, newStreak),
        streakFreezes: newFreezes,
        lastFreezeEarnedWeek: weekKey,
        lastActiveDate: now.toISOString()
      };
      checkBadges(newProfile);
      return newProfile;
    });
  };

  const useStreakFreeze = (): boolean => {
    if (profile.streakFreezes <= 0) return false;
    setProfile(prev => ({
      ...prev,
      streakFreezes: prev.streakFreezes - 1,
    }));
    unlockBadge('graca_dia');
    return true;
  };

  const completeDailyMission = (_missionDate?: string) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    if (profile.lastDailyMissionDate === today) return;
    setProfile(prev => {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const newMissionStreak = (prev.lastDailyMissionDate === yesterdayStr)
        ? prev.dailyMissionStreak + 1
        : 1;
      const newProfile = { ...prev, lastDailyMissionDate: today, dailyMissionStreak: newMissionStreak };
      if (newMissionStreak >= 7) unlockBadge('missao_diaria');
      return newProfile;
    });
    const xp = applyMultiplier(50, profile.streak);
    addPoints(xp, 'Missão diária concluída', 'bonus');
    showFloatingPoints(xp, 'bonus_step');
    fireNotificationTrigger();
  };

  const addEcoReaction = (verseRef: string, emoji: string) => {
    setProfile(prev => {
      const current = prev.ecoReactions || {};
      const newEco = { ...current, [verseRef]: emoji };
      const ecoCount = Object.keys(newEco).length;
      const newProfile = { ...prev, ecoReactions: newEco };
      if (ecoCount >= 15) unlockBadge('eco_vivo');
      return newProfile;
    });
  };

  const recordSaintEncounter = (saintKey: string) => {
    setProfile(prev => {
      const today = new Date().toISOString().split('T')[0];
      if (prev.lastSaintSeenDate === today) return prev;
      const xp = applyMultiplier(10, prev.streak);
      addPoints(xp, `Encontrou ${saintKey}`, 'freeExploration');
      showFloatingPoints(xp, 'free');
      return { ...prev, lastSaintSeenDate: today };
    });
  };

  const completeFlashChallenge = () => {
    unlockBadge('guerreiro_luz');
    const xp = applyMultiplier(300, profile.streak);
    addPoints(xp, 'Desafio relâmpago concluído', 'bonus');
    showFloatingPoints(xp, 'bonus_trail');
  };

  const markBookCompleted = (bookId: string, isGps: boolean = false) => {
    const bookData = BIBLE_BOOKS.find(b => b.id === bookId);
    const chapters = bookData?.chapters || 1;
    setProfile(prev => {
      const alreadyCompleted = prev.completedBooks.includes(bookId);
      if (alreadyCompleted) return prev;
      const mult = getStreakMultiplier(prev.streak);
      const xp = isGps ? Math.round((100 + chapters * 2) * mult) : Math.round((50 + chapters * 1) * mult);
      const newProfile = {
        ...prev,
        completedBooks: [...prev.completedBooks, bookId],
        points: prev.points + xp,
        title: getTitleByPoints(prev.points + xp)
      };
      showFloatingPoints(xp, isGps ? 'disciple' : 'free');
      checkBadges(newProfile);
      return newProfile;
    });
  };

  const markBookVisited = (bookId: string) => {
    setProfile(prev => {
      if (prev.visitedBooks?.includes(bookId)) return prev;
      return { ...prev, visitedBooks: [...(prev.visitedBooks || []), bookId] };
    });
  };

  const markChapterRead = (bookId: string, chapterNum: number, _totalChapters: number) => {
    setProfile(prev => {
      const current = prev.readChapters?.[bookId] || [];
      if (current.includes(chapterNum)) return prev;
      const newChapters = [...current, chapterNum];
      const xp = applyMultiplier(5, prev.streak);
      addPoints(xp, `Leu cap ${chapterNum} de ${bookId}`, 'freeExploration');
      showFloatingPoints(xp, 'free');
      return { ...prev, readChapters: { ...prev.readChapters, [bookId]: newChapters } };
    });
  };

  const markAllChaptersRead = (bookId: string, chapterNums: number[]) => {
    setProfile(prev => ({
      ...prev,
      readChapters: { ...prev.readChapters, [bookId]: chapterNums }
    }));
  };

  const addNote = () => {
    setProfile(prev => {
      const newProfile = { ...prev, notesCount: prev.notesCount + 1 };
      checkBadges(newProfile);
      return newProfile;
    });
    const xp = applyMultiplier(25, profile.streak);
    addPoints(xp, 'Fez uma anotação', 'freeExploration');
    showFloatingPoints(xp, 'free');
  };

  const addFavorite = () => {
    setProfile(prev => {
      const newProfile = { ...prev, favoritesCount: prev.favoritesCount + 1 };
      checkBadges(newProfile);
      return newProfile;
    });
  };

  const updateFavorites = (favorites: Record<string, boolean>, favoritesEver: Record<string, boolean>) => {
    setProfile(prev => ({ ...prev, bibleFavorites: favorites, bibleFavoritesEver: favoritesEver }));
  };

  const accessDailyVerse = () => {
    setProfile(prev => {
      const today = new Date().toISOString().split('T')[0];
      if (prev.lastDailyVerseDate === today) return prev;
      const newProfile = { ...prev, dailyVerseCount: prev.dailyVerseCount + 1, lastDailyVerseDate: today };
      const xp = applyMultiplier(15, prev.streak);
      addPoints(xp, 'Acessou versículo do dia', 'freeExploration');
      showFloatingPoints(xp, 'free');
      checkBadges(newProfile);
      fireNotificationTrigger();
      return newProfile;
    });
  };

  const completePlan = () => {
    setProfile(prev => {
      const newProfile = { ...prev, completedPlans: prev.completedPlans + 1 };
      checkBadges(newProfile);
      return newProfile;
    });
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    setProfile(prev => ({ ...prev, ...updates }));
  };

  useEffect(() => {
    if (supabaseReady && !hasCheckedStreak.current) {
      hasCheckedStreak.current = true;
      checkStreak();
    }
  }, [supabaseReady]);

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
      markAllChaptersRead,
      addNote,
      addFavorite,
      updateFavorites,
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
      notificationTrigger,
      clearNotificationTrigger,
      triggerNotificationPrompt: fireNotificationTrigger,
    }}>
      {children}
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
              <div className="text-stone-700 font-bold text-2xl drop-shadow-md">
                +{fp.amount} XP {fp.type === 'disciple' ? '⭐' : ''}
              </div>
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
