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

const getLocalProfile = (): UserProfile => {
  const stored = safeStorage.getItem('user_profile');
  if (stored) {
    const parsed = JSON.parse(stored);
    if (!parsed.discipleCompletedBooks) parsed.discipleCompletedBooks = [];
    if (!parsed.readChapters) parsed.readChapters = {};
    if (!parsed.xpChapters) parsed.xpChapters = {};
    if (parsed.streakFreezes === undefined) parsed.streakFreezes = 1;
    if (parsed.dailyMissionStreak === undefined) parsed.dailyMissionStreak = 0;
    if (!parsed.ecoReactions) parsed.ecoReactions = {};
    if (!parsed.bibleFavorites) parsed.bibleFavorites = {};
    if (!parsed.bibleFavoritesEver) parsed.bibleFavoritesEver = {};
    if (parsed.longestStreak === undefined) parsed.longestStreak = parsed.streak || 0;
    return parsed;
  }
  return {
    id: 'local-user',
    name: 'Peregrino',
    email: '',
    avatarId: 'cruz',
    joinDate: new Date().toISOString(),
    weeklyActivity: [],
    points: 0,
    pointsBreakdown: { freeExploration: 0, discipleTrail: 0, bonus: 0 },
    streak: 0,
    longestStreak: 0,
    // FIX CRÍTICO PARA ABA ANÔNIMA:
    // Retornamos uma data muito antiga. Assim, quando a aba anônima bater no Supabase,
    // o banco de dados SEMPRE vai vencer o merge, pois a data do banco será mais recente.
    lastActiveDate: '2000-01-01T00:00:00.000Z',
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
  const [profile, setProfile] = useState<UserProfile>(getLocalProfile());
  const [badges, setBadges] = useState<Badge[]>(getLocalBadges());
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
    if (localStorage.getItem('notif_prompt_done_v3')) return;
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

  const getPersonalizedChallenges = (): typeof WEEKLY_CHALLENGES => {
    try {
      const saved = localStorage.getItem('onboarding_profile');
      if (!saved) return WEEKLY_CHALLENGES;
      const { timePerDay, goal } = JSON.parse(saved);
      if (timePerDay === '5') {
        return [
          { title: 'Leia 1 livro esta semana', description: 'Pequenos passos levam longe. Conclua qualquer 1 livro.', target: 1, rewardPoints: 150 },
          { title: 'Acesse o versículo do dia 5 vezes', description: 'Uma dose diária da Palavra. 5 dias seguidos.', target: 5, rewardPoints: 200 },
        ];
      }
      if (timePerDay === '15') {
        return [
          { title: 'Conclua 2 livros esta semana', description: '15 minutos por dia, resultados reais.', target: 2, rewardPoints: 250 },
          { title: 'Conclua 3 livros esta semana', description: 'Continue no ritmo. Mais 3 livros!', target: 3, rewardPoints: 300 },
        ];
      }
      if (timePerDay === '60') {
        return [
          { title: 'Conclua 7 livros esta semana', description: 'Você tem tempo e disposição. Use os dois!', target: 7, rewardPoints: 600 },
          { title: 'Conclua 5 livros esta semana', description: 'Semana intensa. Bora lá!', target: 5, rewardPoints: 500 },
        ];
      }
      if (goal === 'complete') {
        return [
          { title: 'Conclua 5 livros esta semana', description: 'Rumo aos 73! Mais 5 livros.', target: 5, rewardPoints: 500 },
          { title: 'Conclua 4 livros esta semana', description: 'Cada livro é um passo para a meta.', target: 4, rewardPoints: 400 },
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
        if (new Date(parsed.deadline) > new Date()) return parsed;
      } catch { /* ignore */ }
    }
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
        if (!session?.user) {
          setSupabaseReady(true);
          return;
        }

        setUserId(session.user.id);
        const authEmail = session.user.email || '';

        isLoadingFromSupabase.current = true;

        const { data: profileData } = await Promise.race([
          supabase.from('profiles').select('*').eq('id', session.user.id).single(),
          new Promise<{ data: null; error: Error }>((resolve) =>
            setTimeout(() => resolve({ data: null, error: new Error('timeout') }), 6000)
          ),
        ]) as any;

        if (profileData) {
          setProfile(prev => {
            const mergeArrays = (local: string[], remote: string[]) =>
              Array.from(new Set([...remote, ...local]));

            const mergeChapterMaps = (
              local: Record<string, number[]> = {},
              remote: Record<string, number[]> = {}
            ): Record<string, number[]> => {
              const keys = Array.from(new Set([...Object.keys(local), ...Object.keys(remote)]));
              const result: Record<string, number[]> = {};
              for (const k of keys) {
                result[k] = Array.from(new Set([...(remote[k] || []), ...(local[k] || [])]));
              }
              return result;
            };

            const mergedPoints = Math.max(prev.points, profileData.points ?? 0);

            // FIX: Comparamos as datas de forma segura. 
            // O ano 2000 da aba anônima sempre perderá para o banco de dados real.
            const remoteLastActive = profileData.last_active_date
              ? new Date(profileData.last_active_date).getTime() : 0;
            const localLastActive = prev.lastActiveDate
              ? new Date(prev.lastActiveDate).getTime() : 0;
            
            const remoteIsNewer = remoteLastActive > localLastActive;
            
            const mergedLastActiveDate = remoteIsNewer 
              ? profileData.last_active_date 
              : prev.lastActiveDate;

            const mergedStreak = remoteIsNewer
              ? (profileData.streak ?? prev.streak)
              : Math.max(prev.streak, profileData.streak ?? 0);

            return {
              ...prev,
              name:          profileData.name          || prev.name,
              email:         profileData.email         || authEmail,
              avatarId:      profileData.avatar_id     || prev.avatarId,
              avatarUrl:     profileData.avatar_url    || prev.avatarUrl,
              joinDate:      profileData.join_date     || prev.joinDate,
              weeklyActivity: profileData.weekly_activity || prev.weeklyActivity || [],
              
              // Agora a data obedece a quem for verdadeiramente mais recente
              lastActiveDate:  mergedLastActiveDate,
              streak:          mergedStreak,
              
              points:          mergedPoints,
              title:           getTitleByPoints(mergedPoints),
              notesCount:      Math.max(prev.notesCount,      profileData.notes_count       ?? 0),
              favoritesCount:  Math.max(prev.favoritesCount,  profileData.favorites_count   ?? 0),
              dailyVerseCount: Math.max(prev.dailyVerseCount, profileData.daily_verse_count ?? 0),
              completedPlans:  Math.max(prev.completedPlans,  profileData.completed_plans   ?? 0),
              longestStreak:   Math.max(prev.longestStreak || 0, profileData.longest_streak ?? 0),
              streakFreezes:   profileData.streak_freezes ?? prev.streakFreezes ?? 1,
              lastFreezeEarnedWeek: profileData.last_freeze_earned_week || prev.lastFreezeEarnedWeek,
              lastDailyMissionDate: profileData.last_daily_mission_date || prev.lastDailyMissionDate,
              dailyMissionStreak:   Math.max(prev.dailyMissionStreak || 0, profileData.daily_mission_streak ?? 0),
              completedBooks:         mergeArrays(prev.completedBooks,          profileData.completed_books          || []),
              discipleCompletedBooks: mergeArrays(prev.discipleCompletedBooks,  profileData.disciple_completed_books || []),
              visitedBooks:           mergeArrays(prev.visitedBooks || [],      profileData.visited_books            || []),
              readChapters: mergeChapterMaps(prev.readChapters, profileData.read_chapters),
              xpChapters
