import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import { BEGINNER_PATH, BIBLE_BOOKS } from '../constants';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../lib/supabase';
import { scheduleStreakNotification, cancelStreakNotification, markTodayActive } from './notifications';
import type { RealtimeChannel } from '@supabase/supabase-js';

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
  onboardingDone?: boolean;
  lastDailyVerseDate?: string;
  flashChallengeDone?: string;
  saintsEncountered?: string[];
  lastLectioDate?: string;
  onboardingProfile?: any;
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

const applyPointsToProfile = (prev: UserProfile, amount: number, category?: 'freeExploration' | 'discipleTrail' | 'bonus'): UserProfile => {
  const newPoints = prev.points + amount;
  const newBreakdown = { ...(prev.pointsBreakdown || { freeExploration: 0, discipleTrail: 0, bonus: 0 }) };
  if (category) newBreakdown[category] += amount;
  return {
    ...prev,
    points: newPoints,
    pointsBreakdown: newBreakdown,
    title: getTitleByPoints(newPoints)
  };
};

// --- Initial State ---

const getInitialProfile = (): UserProfile => ({
  id: 'local-user',
  name: 'Peregrino',
  email: '',
  avatarId: 'cruz',
  joinDate: new Date().toISOString(),
  weeklyActivity: [new Date().toISOString()],
  points: 0,
  pointsBreakdown: { freeExploration: 0, discipleTrail: 0, bonus: 0 },
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
  saintsEncountered: [],
});

// --- Context ---

interface GamificationContextType {
  profile: UserProfile;
  userId: string | null;
  badges: Badge[];
  weeklyChallenge: WeeklyChallenge;
  isReady: boolean;
  loadError: boolean;
  addPoints: (amount: number, reason: string, category?: 'freeExploration' | 'discipleTrail' | 'bonus') => void;
  markBookCompleted: (bookId: string, isGps?: boolean) => void;
  markBookVisited: (bookId: string) => void;
  markChapterRead: (bookId: string, chapterNum: number, totalChapters: number) => void;
  markAllChaptersRead: (bookId: string, chapterNums: number[]) => void;
  addNote: () => void;
  addFavorite: () => void;
  updateFavorites: (favorites: Record<string, boolean>, favoritesEver: Record<string, boolean>) => void;
  accessDailyVerse: (dateStr?: string) => void;
  completePlan: () => void;
  checkStreak: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  showFloatingPoints: (amount: number, type: FloatingPointType) => void;
  useStreakFreeze: () => boolean;
  completeDailyMission: (missionDate?: string) => void;
  addEcoReaction: (verseRef: string, emoji: string) => void;
  recordSaintEncounter: (saintKey: string) => void;
  completeFlashChallenge: (weekKey: string) => void;
  completeLectio: (dateStr: string) => void;
  notificationTrigger: boolean;
  clearNotificationTrigger: () => void;
  triggerNotificationPrompt: () => void;
}

export const GamificationContext = createContext<GamificationContextType | null>(null);

export function GamificationProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(getInitialProfile());
  const [badges, setBadges] = useState<Badge[]>([]);
  const [floatingPoints, setFloatingPoints] = useState<FloatingPoint[]>([]);
  const [supabaseReady, setSupabaseReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  
  const isLoadingFromSupabase = useRef(false);
  const pendingSavesCount = useRef(0);
  
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncChannel = useRef<RealtimeChannel | null>(null);
  const nativeBroadcast = useRef<BroadcastChannel | null>(null);
  
  const hasCheckedStreak = useRef(false);
  const [notificationTrigger, setNotificationTrigger] = useState(false);
  const notifAlreadyTriggered = useRef(false);

  const updateStateFromUserAction = useCallback((updater: (prev: UserProfile) => UserProfile) => {
    pendingSavesCount.current += 1;
    setProfile(updater);
  }, []);

  const updateWeeklyChallengeFromUserAction = useCallback((updater: (prev: WeeklyChallenge) => WeeklyChallenge) => {
    pendingSavesCount.current += 1;
    setWeeklyChallenge(updater);
  }, []);

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

  const fetchProfileData = useCallback(async (uid: string, sessionEmail?: string) => {
    let profileData = null;
    let badgesData = null;
    let isNewUser = false;

    try {
      const profileRes = await supabase.from('profiles').select('*').eq('id', uid).single();
      
      if (profileRes.error) {
        if (profileRes.error.code === 'PGRST116') {
          // Novo usuário (trigger pode ainda não ter finalizado)
          isNewUser = true;
        } else {
          throw profileRes.error;
        }
      } else {
        profileData = profileRes.data;
      }

      if (!isNewUser) {
        const badgesRes = await supabase.from('user_badges').select('*').eq('user_id', uid);
        badgesData = badgesRes.data;
      }
    } catch (err) {
      console.warn('[gamification] Erro de rede no Supabase. Tentando cache local...', err);
      const cached = localStorage.getItem(`versiculando_profile_${uid}`);
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          setProfile(prev => pendingSavesCount.current > 0 ? prev : parsed);
          // Podemos recuperar os badges cacheados aqui se quisermos, mas o perfil é essencial.
          return;
        } catch (e) {}
      }
      
      // ALERTA CRÍTICO: Se chegamos aqui, o usuário NÃO tem internet e NÃO tem cache.
      // Retornar um erro impede que a aplicação o sobrescreva com zeros.
      throw new Error("Erro de rede e nenhum cache offline disponível.");
    }

    if (pendingSavesCount.current > 0) return;

    if (isNewUser || !profileData) {
      // Usuário realmente novo. 
      const newProfile = { ...getInitialProfile(), id: uid, email: sessionEmail || '' };
      localStorage.setItem(`versiculando_profile_${uid}`, JSON.stringify(newProfile));
      setProfile(prev => pendingSavesCount.current > 0 ? prev : newProfile);
      setWeeklyChallenge(getStoredChallenge());
      setBadges([]);
      return;
    }

    let localOnboardingDone = false;
    try { localOnboardingDone = !!localStorage.getItem('onboarding_profile'); } catch (e) {}
    const finalOnboardingDone = profileData.onboarding_done || localOnboardingDone || false;

    const newProfile: UserProfile = {
      ...getInitialProfile(),
      id: uid,
      name: profileData.name || 'Peregrino',
      email: sessionEmail || profileData.email || '',
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
      streakFreezes: profileData.streak_freezes ?? 1,
      lastFreezeEarnedWeek: profileData.last_freeze_earned_week,
      lastDailyMissionDate: profileData.last_daily_mission_date,
      dailyMissionStreak: profileData.daily_mission_streak || 0,
      onboardingDone: finalOnboardingDone,
      lastDailyVerseDate: profileData.last_daily_verse_date,
      flashChallengeDone: profileData.flash_challenge_done,
      saintsEncountered: profileData.saints_encountered || [],
      lastLectioDate: profileData.last_lectio_date,
      onboardingProfile: profileData.onboarding_profile,
      ecoReactions: profileData.eco_reactions || {},
      bibleFavorites: profileData.bible_favorites || {},
      bibleFavoritesEver: profileData.bible_favorites_ever || {},
    };

    // Cache local imediato para prevenir perdas futuras
    localStorage.setItem(`versiculando_profile_${uid}`, JSON.stringify(newProfile));
    setProfile(prev => pendingSavesCount.current > 0 ? prev : newProfile);

    if (profileData.weekly_challenge) {
      const challenge = profileData.weekly_challenge as WeeklyChallenge;
      if (new Date(challenge.deadline).getTime() < Date.now()) {
        setWeeklyChallenge(getStoredChallenge());
      } else {
        setWeeklyChallenge(challenge);
      }
    } else {
      setWeeklyChallenge(getStoredChallenge());
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
  }, []);

  // Inicialização e Auth
  useEffect(() => {
    const loadSupabaseData = async (sessionUser: any) => {
      const hasSupabase = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!hasSupabase) {
        setSupabaseReady(true);
        return;
      }

      if (!sessionUser) {
        setProfile(getInitialProfile());
        setBadges([]);
        setUserId(null);
        setSupabaseReady(true);
        setLoadError(false);
        return;
      }

      if (userId !== sessionUser.id) {
         setSupabaseReady(false);
      }

      setUserId(sessionUser.id);
      isLoadingFromSupabase.current = true;
      
      try {
        await fetchProfileData(sessionUser.id, sessionUser.email);
        setSupabaseReady(true);
        setLoadError(false);
      } catch (err) {
        // Falha crítica (offline e sem cache local).
        // Evitamos setar supabaseReady para true, protegendo os dados da nuvem contra sobrescrita.
        console.error("Carregamento do Supabase abortado para prevenir perda de dados:", err);
        setLoadError(true);
      } finally {
        isLoadingFromSupabase.current = false;
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      loadSupabaseData(session?.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      loadSupabaseData(session?.user);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfileData]);

  // Canais de Sincronização em Tempo Real
  useEffect(() => {
    if (!userId || !supabaseReady) return;

    const channel = supabase.channel(`sync_${userId}`);
    channel.on('broadcast', { event: 'profile_updated' }, () => {
      if (pendingSavesCount.current === 0) fetchProfileData(userId);
    });
    channel.subscribe();
    syncChannel.current = channel;

    try {
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel(`native_sync_${userId}`);
        bc.onmessage = (event) => {
          if (event.data === 'profile_updated' && pendingSavesCount.current === 0) {
            fetchProfileData(userId);
          }
        };
        nativeBroadcast.current = bc;
      }
    } catch (e) {
      console.warn('[gamification] BroadcastChannel indisponível', e);
    }

    const handleFocus = () => {
      if (pendingSavesCount.current === 0) fetchProfileData(userId);
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') handleFocus();
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibility);

    const pollInterval = setInterval(() => {
      if (document.visibilityState === 'visible' && pendingSavesCount.current === 0) {
        fetchProfileData(userId);
      }
    }, 10000);

    return () => {
      supabase.removeChannel(channel);
      syncChannel.current = null;
      if (nativeBroadcast.current) {
        nativeBroadcast.current.close();
        nativeBroadcast.current = null;
      }
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibility);
      clearInterval(pollInterval);
    };
  }, [userId, supabaseReady, fetchProfileData]);

  // Save to Supabase e LocalStorage
  useEffect(() => {
    if (!userId || isLoadingFromSupabase.current || !supabaseReady) return;
    if (pendingSavesCount.current === 0) return;

    if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    
    saveDebounceRef.current = setTimeout(async () => {
      const currentSaveId = pendingSavesCount.current;
      
      // Sempre salvar localmente primeiro como salvaguarda
      try {
        localStorage.setItem(`versiculando_profile_${userId}`, JSON.stringify(profile));
      } catch(e) {}
      
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
          flash_challenge_done: profile.flashChallengeDone,
          saints_encountered: profile.saintsEncountered,
          last_lectio_date: profile.lastLectioDate,
          onboarding_profile: profile.onboardingProfile,
          eco_reactions: profile.ecoReactions,
          bible_favorites: profile.bibleFavorites,
          bible_favorites_ever: profile.bibleFavoritesEver,
          weekly_challenge: weeklyChallenge,
          updated_at: new Date().toISOString()
        });

        if (syncChannel.current) {
          syncChannel.current.send({
            type: 'broadcast',
            event: 'profile_updated',
            payload: { timestamp: Date.now() }
          });
        }
        if (nativeBroadcast.current) {
          nativeBroadcast.current.postMessage('profile_updated');
        }
      } catch (err) {
        console.warn('[gamification] Erro ao salvar no Supabase:', err);
      } finally {
        if (pendingSavesCount.current === currentSaveId) {
          pendingSavesCount.current = 0;
        }
      }
    }, 400);

    return () => {
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    };
  }, [profile, weeklyChallenge, userId, supabaseReady]);

  const triggerConfetti = () => {
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 }, colors: ['#FFD700', '#FFA500', '#FF4500', '#87CEEB', '#32CD32'] });
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
            user_id: userId, badge_id: badgeId, title: badgeDef.title,
            description: badgeDef.description, emoji: badgeDef.emoji, unlocked_at: unlockedAt
          });
        } catch (err) { console.error('Error syncing badge to Supabase', err); }
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
    updateStateFromUserAction(prev => applyPointsToProfile(prev, amount, category));
  };

  const checkStreak = () => {
    const now = new Date();
    const toDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

    updateStateFromUserAction(prev => {
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

      let newActivity = prev.weeklyActivity || [];
      const todayStr = now.toISOString().split('T')[0];
      if (!newActivity.some(d => d.startsWith(todayStr))) {
        newActivity = [...newActivity, now.toISOString()];
      }

      if (diffDays === 0) {
        if (newStreak === 0) newStreak = 1;
        const newProfile = { ...prev, streak: newStreak, longestStreak: Math.max(prev.longestStreak || 0, newStreak), streakFreezes: newFreezes, lastFreezeEarnedWeek: weekKey, lastActiveDate: now.toISOString(), weeklyActivity: newActivity };
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

      const newProfile = { ...prev, streak: newStreak, longestStreak: Math.max(prev.longestStreak || 0, newStreak), streakFreezes: newFreezes, lastFreezeEarnedWeek: weekKey, lastActiveDate: now.toISOString(), weeklyActivity: newActivity };
      checkBadges(newProfile);
      return newProfile;
    });
  };

  const useStreakFreeze = (): boolean => {
    if (profile.streakFreezes <= 0) return false;
    updateStateFromUserAction(prev => ({ ...prev, streakFreezes: prev.streakFreezes - 1 }));
    unlockBadge('graca_dia');
    return true;
  };

  const completeDailyMission = (_missionDate?: string) => {
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    updateStateFromUserAction(prev => {
      if (prev.lastDailyMissionDate === today) return prev;
      
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
      
      const newMissionStreak = (prev.lastDailyMissionDate === yesterdayStr) ? prev.dailyMissionStreak + 1 : 1;
      const xp = applyMultiplier(50, prev.streak);
      
      let next = { ...prev, lastDailyMissionDate: today, dailyMissionStreak: newMissionStreak };
      next = applyPointsToProfile(next, xp, 'bonus');
      
      setTimeout(() => {
        if (newMissionStreak >= 7) unlockBadge('missao_diaria');
        showFloatingPoints(xp, 'bonus_step');
        fireNotificationTrigger();
      }, 0);
      
      return next;
    });
  };

  const addEcoReaction = (verseRef: string, emoji: string) => {
    updateStateFromUserAction(prev => {
      const current = prev.ecoReactions || {};
      const newEco = { ...current, [verseRef]: emoji };
      const ecoCount = Object.keys(newEco).length;
      const next = { ...prev, ecoReactions: newEco };
      if (ecoCount >= 15) unlockBadge('eco_vivo');
      return next;
    });
  };

  const recordSaintEncounter = (saintKey: string) => {
    updateStateFromUserAction(prev => {
      if (prev.saintsEncountered?.includes(saintKey)) return prev;
      const newSaints = [...(prev.saintsEncountered || []), saintKey];
      const xp = applyMultiplier(10, prev.streak);
      
      let next = { ...prev, saintsEncountered: newSaints };
      next = applyPointsToProfile(next, xp, 'freeExploration');
      
      setTimeout(() => {
        if (newSaints.length >= 10) unlockBadge('comunhao_santos');
        showFloatingPoints(xp, 'free');
      }, 0);
      
      return next;
    });
  };

  const completeFlashChallenge = (weekKey: string) => {
    updateStateFromUserAction(prev => {
      if (prev.flashChallengeDone === weekKey) return prev;
      const xp = applyMultiplier(300, prev.streak);
      let next = { ...prev, flashChallengeDone: weekKey };
      next = applyPointsToProfile(next, xp, 'bonus');
      
      setTimeout(() => {
        unlockBadge('guerreiro_luz');
        showFloatingPoints(xp, 'bonus_trail');
      }, 0);
      
      return next;
    });
  };

  const completeLectio = (dateStr: string) => {
    updateStateFromUserAction(prev => {
      if (prev.lastLectioDate === dateStr) return prev;
      const xp = applyMultiplier(20, prev.streak);
      let next = { ...prev, lastLectioDate: dateStr };
      next = applyPointsToProfile(next, xp, 'freeExploration');
      
      setTimeout(() => showFloatingPoints(xp, 'free'), 0);
      return next;
    });
  };

  const markBookCompleted = (bookId: string, isGps: boolean = false) => {
    const bookData = BIBLE_BOOKS.find(b => b.id === bookId);
    const chapters = bookData?.chapters || 1;
    
    updateStateFromUserAction(prev => {
      if (prev.completedBooks.includes(bookId)) return prev;
      const xp = isGps 
        ? Math.round((100 + chapters * 2) * getStreakMultiplier(prev.streak))
        : Math.round((50 + chapters * 1) * getStreakMultiplier(prev.streak));
        
      let next = { ...prev, completedBooks: [...prev.completedBooks, bookId] };
      next = applyPointsToProfile(next, xp, isGps ? 'discipleTrail' : 'freeExploration');
      
      setTimeout(() => {
        showFloatingPoints(xp, isGps ? 'disciple' : 'free');
        checkBadges(next);
      }, 0);
      
      return next;
    });

    updateWeeklyChallengeFromUserAction(prev => {
      if (prev.completed) return prev;
      let isEligible = true;
      if (prev.title.includes('NT')) {
         const bd = BIBLE_BOOKS.find(b => b.id === bookId);
         if (bd?.testament !== 'NT') isEligible = false;
      }
      if (isEligible) {
         const newProgress = prev.progress + 1;
         if (newProgress >= prev.target) {
            setTimeout(() => {
              addPoints(prev.rewardPoints, 'Desafio Semanal', 'bonus');
              showFloatingPoints(prev.rewardPoints, 'bonus_trail');
            }, 1000);
            return { ...prev, progress: newProgress, completed: true };
         }
         return { ...prev, progress: newProgress };
      }
      return prev;
    });
  };

  const markBookVisited = (bookId: string) => {
    updateStateFromUserAction(prev => {
      if (prev.visitedBooks?.includes(bookId)) return prev;
      return { ...prev, visitedBooks: [...(prev.visitedBooks || []), bookId] };
    });
  };

  const markChapterRead = (bookId: string, chapterNum: number, _totalChapters: number) => {
    updateStateFromUserAction(prev => {
      const current = prev.readChapters?.[bookId] || [];
      if (current.includes(chapterNum)) return prev;
      
      const newChapters = [...current, chapterNum];
      const xp = applyMultiplier(5, prev.streak);
      
      let next = { ...prev, readChapters: { ...prev.readChapters, [bookId]: newChapters } };
      next = applyPointsToProfile(next, xp, 'freeExploration');
      
      setTimeout(() => showFloatingPoints(xp, 'free'), 0);
      return next;
    });
  };

  const markAllChaptersRead = (bookId: string, chapterNums: number[]) => {
    updateStateFromUserAction(prev => ({
      ...prev, readChapters: { ...prev.readChapters, [bookId]: chapterNums }
    }));
  };

  const addNote = () => {
    updateStateFromUserAction(prev => {
      const xp = applyMultiplier(25, prev.streak);
      let next = { ...prev, notesCount: prev.notesCount + 1 };
      next = applyPointsToProfile(next, xp, 'freeExploration');
      
      setTimeout(() => {
        checkBadges(next);
        showFloatingPoints(xp, 'free');
      }, 0);
      return next;
    });
  };

  const addFavorite = () => {
    updateStateFromUserAction(prev => {
      const next = { ...prev, favoritesCount: prev.favoritesCount + 1 };
      setTimeout(() => checkBadges(next), 0);
      return next;
    });
  };

  const updateFavorites = (favorites: Record<string, boolean>, favoritesEver: Record<string, boolean>) => {
    updateStateFromUserAction(prev => ({ ...prev, bibleFavorites: favorites, bibleFavoritesEver: favoritesEver }));
  };

  const accessDailyVerse = (dateStr?: string) => {
    const now = new Date();
    const today = dateStr || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    updateStateFromUserAction(prev => {
      if (prev.lastDailyVerseDate === today) return prev;
      const xp = applyMultiplier(15, prev.streak);
      let next = { ...prev, dailyVerseCount: prev.dailyVerseCount + 1, lastDailyVerseDate: today };
      next = applyPointsToProfile(next, xp, 'freeExploration');
      
      setTimeout(() => {
        checkBadges(next);
        showFloatingPoints(xp, 'free');
        fireNotificationTrigger();
      }, 0);
      return next;
    });
  };

  const completePlan = () => {
    updateStateFromUserAction(prev => {
      const next = { ...prev, completedPlans: prev.completedPlans + 1 };
      setTimeout(() => checkBadges(next), 0);
      return next;
    });
  };

  const updateProfile = (updates: Partial<UserProfile>) => {
    updateStateFromUserAction(prev => ({ ...prev, ...updates }));
  };

  useEffect(() => {
    if (supabaseReady && !hasCheckedStreak.current) {
      hasCheckedStreak.current = true;
      checkStreak();
    }
  }, [supabaseReady]);

  return (
    <GamificationContext.Provider value={{
      profile, userId, badges, weeklyChallenge, isReady: supabaseReady, loadError,
      addPoints, markBookCompleted, markBookVisited, markChapterRead, markAllChaptersRead,
      addNote, addFavorite, updateFavorites, accessDailyVerse, completePlan, checkStreak,
      updateProfile, showFloatingPoints, useStreakFreeze, completeDailyMission,
      addEcoReaction, recordSaintEncounter, completeFlashChallenge, completeLectio,
      notificationTrigger, clearNotificationTrigger, triggerNotificationPrompt: fireNotificationTrigger,
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