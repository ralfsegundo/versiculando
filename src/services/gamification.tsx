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
  // Capítulos que já geraram XP — separado de readChapters para evitar
  // re-award ao desmarcar e remarcar. XP é one-way: dado uma vez, nunca mais.
  xpChapters?: Record<string, number[]>;
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
  // Favoritos de versículos — sincronizados com Supabase
  bibleFavorites?: Record<string, boolean>;     // verseRef -> true (favoritos ativos)
  bibleFavoritesEver?: Record<string, boolean>; // verseRef -> true (já foi favoritado alguma vez — one-way para badge)
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
  // Novos
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

// Multiplicador de XP baseado na streak do usuário
export const getStreakMultiplier = (streak: number): number => {
  if (streak >= 30) return 2.0;
  if (streak >= 14) return 1.5;
  if (streak >= 7)  return 1.25;
  return 1.0;
};

// Aplica multiplicador e arredonda para inteiro
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
// In a real app, this would be entirely managed by Supabase.
// We use local storage here to ensure the preview works without a real Supabase DB setup.

const getLocalProfile = (): UserProfile => {
  const stored = safeStorage.getItem('user_profile');
  if (stored) {
    const parsed = JSON.parse(stored);
    // Migration: add discipleCompletedBooks if not present
    if (!parsed.discipleCompletedBooks) parsed.discipleCompletedBooks = [];
    if (!parsed.readChapters) parsed.readChapters = {};
    if (!parsed.xpChapters) parsed.xpChapters = {};
    if (parsed.streakFreezes === undefined) parsed.streakFreezes = 1; // começa com 1 graça
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
  // Sinal para mostrar o prompt de notificação após uma conquista real
  notificationTrigger: boolean;
  clearNotificationTrigger: () => void;
  // Chamado por componentes externos (ex: jogos) para disparar o prompt
  triggerNotificationPrompt: () => void;
}

export const GamificationContext = createContext<GamificationContextType | null>(null);

export function GamificationProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(getLocalProfile());
  const [badges, setBadges] = useState<Badge[]>(getLocalBadges());
  const [floatingPoints, setFloatingPoints] = useState<FloatingPoint[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [supabaseReady, setSupabaseReady] = useState(false); // true após merge do Supabase (ou timeout)
  const [userId, setUserId] = useState<string | null>(null);
  // Controla se o perfil foi carregado do Supabase — evita salvar de volta logo após carregar
  const isLoadingFromSupabase = useRef(false);
  const saveDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasCheckedStreak = useRef(false);

  // Sinal para o prompt de notificação — disparado após primeira conquista real
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

  // ── Notificações de streak ──────────────────────────────────
  // Ao abrir o app: cancela notificação pendente (usuário já está ativo)
  useEffect(() => {
    cancelStreakNotification();
    markTodayActive();
  }, []);

  // Quando o streak muda (atividade feita): agenda notificação para 21h
  // caso o usuário não volte mais hoje
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

  // Desafios personalizados por tempo disponível (do onboarding)
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
        if (!session?.user) {
          setSupabaseReady(true); // sem sessão — libera checkStreak com dados locais
          return;
        }

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
          setProfile(prev => {
            // ─────────────────────────────────────────────────────────────
            // CORREÇÃO: race condition entre localStorage e Supabase.
            //
            // Fluxo do bug:
            //   1. Usuário ganha XP → localStorage atualizado imediatamente
            //   2. Supabase ainda não foi salvo (debounce 2s em andamento)
            //   3. Reload → localStorage carrega o valor correto em `prev`
            //   4. loadSupabaseData retorna dados desatualizados do Supabase
            //   5. `...profileData` sobrescreve `prev` → XP e progresso perdidos
            //
            // Estratégia: para campos monotônicos (só crescem), local vence
            // se for maior. Para arrays de progresso, fazemos união.
            // Para metadados de identidade, Supabase é canônico.
            // ─────────────────────────────────────────────────────────────

            // União de arrays — preserva itens locais não ainda sincronizados
            const mergeArrays = (local: string[], remote: string[]) =>
              Array.from(new Set([...remote, ...local]));

            // União de Record<bookId, number[]> (readChapters, xpChapters)
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

            // ATENÇÃO: NÃO usar ...profileData aqui — ele injeta campos snake_case
            // do banco (last_active_date, completed_books, etc.) diretamente no
            // profile, corrompendo os campos camelCase já mapeados abaixo.
            // Cada campo deve ser mapeado explicitamente.
            //
            // lastActiveDate: SEMPRE mantém o local (prev) — nunca puxar do Supabase.
            // O Supabase pode estar atrasado (debounce), e se checkStreak() rodar
            // logo depois com uma data de ontem, o streak incrementa a cada reload.

            // Streak: se Supabase tem lastActiveDate mais recente (outro dispositivo),
            // confiar no valor dele — pode ter sido resetado corretamente lá.
            // Se local é mais recente (mesmo dispositivo, debounce pendente), local vence.
            const remoteLastActive = profileData.last_active_date
              ? new Date(profileData.last_active_date).getTime() : 0;
            const localLastActive = prev.lastActiveDate
              ? new Date(prev.lastActiveDate).getTime() : 0;
            const remoteIsNewer = remoteLastActive > localLastActive;
            const mergedStreak = remoteIsNewer
              ? (profileData.streak ?? prev.streak)
              : Math.max(prev.streak, profileData.streak ?? 0);

            return {
              ...prev,
              // Metadados de identidade — Supabase é canônico
              name:          profileData.name          || prev.name,
              email:         profileData.email         || authEmail,
              avatarId:      profileData.avatar_id     || prev.avatarId,
              avatarUrl:     profileData.avatar_url    || prev.avatarUrl,
              joinDate:      profileData.join_date     || prev.joinDate,
              weeklyActivity: profileData.weekly_activity || prev.weeklyActivity || [],
              // lastActiveDate: local sempre vence — evita checkStreak() falso no reload
              lastActiveDate: prev.lastActiveDate,
              // Campos monotônicos — local vence se maior (nunca perder progresso)
              points:          mergedPoints,
              title:           getTitleByPoints(mergedPoints),
              notesCount:      Math.max(prev.notesCount,      profileData.notes_count       ?? 0),
              favoritesCount:  Math.max(prev.favoritesCount,  profileData.favorites_count   ?? 0),
              dailyVerseCount: Math.max(prev.dailyVerseCount, profileData.daily_verse_count ?? 0),
              completedPlans:  Math.max(prev.completedPlans,  profileData.completed_plans   ?? 0),
              streak:          mergedStreak,
              longestStreak:   Math.max(prev.longestStreak || 0, profileData.longest_streak ?? 0),
              streakFreezes:   profileData.streak_freezes ?? prev.streakFreezes ?? 1,
              lastFreezeEarnedWeek: profileData.last_freeze_earned_week || prev.lastFreezeEarnedWeek,
              lastDailyMissionDate: profileData.last_daily_mission_date
                ? profileData.last_daily_mission_date.split('T')[0]
                : prev.lastDailyMissionDate,
              dailyMissionStreak:   Math.max(prev.dailyMissionStreak || 0, profileData.daily_mission_streak ?? 0),
              // Arrays de progresso — união (local pode ter itens ainda não sincronizados)
              completedBooks:         mergeArrays(prev.completedBooks,          profileData.completed_books          || []),
              discipleCompletedBooks: mergeArrays(prev.discipleCompletedBooks,  profileData.disciple_completed_books || []),
              visitedBooks:           mergeArrays(prev.visitedBooks || [],      profileData.visited_books            || []),
              // Maps de capítulos lidos/XP — união por livro
              readChapters: mergeChapterMaps(prev.readChapters, profileData.read_chapters),
              xpChapters:   mergeChapterMaps(prev.xpChapters,   profileData.xp_chapters),
              // Breakdown de pontos — local vence campo a campo
              pointsBreakdown: {
                freeExploration: Math.max(
                  prev.pointsBreakdown?.freeExploration ?? 0,
                  profileData.points_breakdown?.freeExploration ?? 0
                ),
                discipleTrail: Math.max(
                  prev.pointsBreakdown?.discipleTrail ?? 0,
                  profileData.points_breakdown?.discipleTrail ?? 0
                ),
                bonus: Math.max(
                  prev.pointsBreakdown?.bonus ?? 0,
                  profileData.points_breakdown?.bonus ?? 0
                ),
              },
              // Eco reactions — merge: local sobrescreve Supabase (mais recente)
              ecoReactions: { ...(profileData.eco_reactions || {}), ...(prev.ecoReactions || {}) },
              // Favoritos — merge: união (nunca perder favoritos de nenhum dispositivo)
              bibleFavorites:     { ...(profileData.bible_favorites     || {}), ...(prev.bibleFavorites     || {}) },
              bibleFavoritesEver: { ...(profileData.bible_favorites_ever || {}), ...(prev.bibleFavoritesEver || {}) },
            };
          });
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
        setTimeout(() => {
          isLoadingFromSupabase.current = false;
          setSupabaseReady(true);
        }, 500);
      } catch (e) {
        console.warn('[gamification] loadSupabaseData error:', e);
        isLoadingFromSupabase.current = false;
        setSupabaseReady(true); // mesmo em erro, libera o checkStreak com dados locais
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
          longest_streak: profile.longestStreak || 0,
          streak_freezes: profile.streakFreezes,
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
          eco_reactions: profile.ecoReactions || {},
          bible_favorites: profile.bibleFavorites || {},
          bible_favorites_ever: profile.bibleFavoritesEver || {},
          last_daily_mission_date: profile.lastDailyMissionDate || null,
          last_freeze_earned_week: profile.lastFreezeEarnedWeek || null,
          daily_mission_streak: profile.dailyMissionStreak || 0,
          updated_at: new Date().toISOString()
        });
      } catch (err) {
        console.warn('[gamification] saveToSupabase error:', err);
      } finally {
        setIsSyncing(false);
      }
    }, 2000);

    // Limpa o debounce ao desmontar o componente
    return () => {
      if (saveDebounceRef.current) clearTimeout(saveDebounceRef.current);
    };
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

  // CORREÇÃO BUG 5: recebe currentBadges como parâmetro para evitar usar o
  // valor stale do closure quando chamado de dentro de setProfile().
  // Sem isso, badges.length sempre reflete o estado no momento da captura da closure,
  // não o estado atual — fazendo o badge 'doutor_fe' nunca disparar.
  const checkBadges = (newProfile: UserProfile, currentBadges: Badge[] = badges) => {
    if (newProfile.completedBooks.length >= 1) unlockBadge('semente_fe');
    
    // Check Pentateuch (Gen, Exo, Lev, Num, Deu)
    const pentateuch = ['gen', 'exo', 'lev', 'num', 'deu'];
    if (pentateuch.every(id => newProfile.completedBooks.includes(id))) unlockBadge('leitor_pentateuco');
    
    if (newProfile.streak >= 7) unlockBadge('fogo_espirito');
    
    // Check NT (27 books)
    const ntBooksCount = newProfile.completedBooks.filter(id => ['mat', 'mrk', 'luk', 'jhn', 'act', 'rom', '1co', '2co', 'gal', 'eph', 'php', 'col', '1th', '2th', '1ti', '2ti', 'tit', 'phm', 'heb', 'jas', '1pe', '2pe', '1jn', '2jn', '3jn', 'jud', 'rev'].includes(id)).length;
    if (ntBooksCount >= 27) unlockBadge('pomba_paz');
    
    if (newProfile.completedBooks.length >= 73) unlockBadge('servo_fiel');
    if (newProfile.notesCount >= 10) unlockBadge('escriba');
    if (newProfile.favoritesCount >= 20) unlockBadge('coracao_aberto');
    if (newProfile.dailyVerseCount >= 30) unlockBadge('madrugador');
    if (newProfile.completedPlans >= 1) unlockBadge('peregrino');
    
    // Doutor da Fé: usa currentBadges (valor atual, não stale)
    const totalOtherBadges = Object.keys(BADGES).filter(id => id !== 'doutor_fe').length;
    if (currentBadges.length >= totalOtherBadges && !currentBadges.find(b => b.id === 'doutor_fe')) unlockBadge('doutor_fe');
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
    const toDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

    setProfile(prev => {
      const lastActive = new Date(prev.lastActiveDate);
      const diffDays = Math.round((toDay(now) - toDay(lastActive)) / (1000 * 60 * 60 * 24));

      let newStreak = prev.streak;
      let newFreezes = prev.streakFreezes ?? 1;

      // Ganhar 1 Graça por semana (máx 2)
      // ISO week-of-year: garante que a chave seja única por semana calendário real
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
        longestStreak: Math.max(prev.longestStreak || 0, newStreak),
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
  const completeDailyMission = (_missionDate?: string) => {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const localStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    const today = localStr(now);
    if (profile.lastDailyMissionDate === today) return; // já completou hoje
    setProfile(prev => {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = localStr(yesterday);
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
      // Dá XP pela descoberta do santo (a UI exibe "XP registrado")
      const xp = applyMultiplier(10, profile.streak);
      addPoints(xp, `Encontrou ${saintKey}`, 'freeExploration');
      showFloatingPoints(xp, 'free');
    }
  };

  // Badge: desafio relâmpago
  const completeFlashChallenge = () => {
    unlockBadge('guerreiro_luz');
    const xp = applyMultiplier(300, profile.streak);
    addPoints(xp, 'Desafio relâmpago concluído', 'bonus');
    showFloatingPoints(xp, 'bonus_trail');
  };

  const markBookCompleted = (bookId: string, isGps: boolean = false) => {
    const bookData = BIBLE_BOOKS.find(b => b.id === bookId);
    const chapters = bookData?.chapters || 1;

    // CORREÇÃO BUG 3: todas as decisões dentro do setProfile para atomicidade.
    // Usar profile.completedBooks fora do setProfile é inseguro com closures concorrentes.
    // CORREÇÃO BUG 1: fórmula real inclui capítulos — livre: 50+cap, trilha: 100+cap*2
    let earnedXp = 0;
    let earnedCategory: 'freeExploration' | 'discipleTrail' = 'freeExploration';
    let earnedType: 'free' | 'disciple' = 'free';
    let earnedReason = '';
    let isFirstCompletion = false;
    let isReconquest = false;
    let didCompleteTrial = false;

    setProfile(prev => {
      const alreadyCompleted = prev.completedBooks.includes(bookId);
      const alreadyDisciple  = (prev.discipleCompletedBooks || []).includes(bookId);
      const mult = getStreakMultiplier(prev.streak);

      if (!alreadyCompleted) {
        // Primeira conclusão
        earnedXp = isGps
          ? Math.round((100 + chapters * 2) * mult)
          : Math.round((50 + chapters * 1) * mult);
        earnedCategory = isGps ? 'discipleTrail' : 'freeExploration';
        earnedType     = isGps ? 'disciple' : 'free';
        earnedReason   = `Completou ${bookData?.name || bookId}${isGps ? ' (Trilha)' : ''}`;
        isFirstCompletion = true;

        const newCompletedBooks = [...prev.completedBooks, bookId];
        const newProfile = {
          ...prev,
          completedBooks: newCompletedBooks,
          discipleCompletedBooks: isGps
            ? [...(prev.discipleCompletedBooks || []), bookId]
            : (prev.discipleCompletedBooks || []),
        };
        checkBadges(newProfile, badges);

        // Verifica conclusão da Trilha do Discípulo
        const discipleBookIds = BEGINNER_PATH.flatMap(step => step.books);
        const allDiscipleNow = discipleBookIds.every(
          id => id === bookId || prev.completedBooks.includes(id)
        );
        if (allDiscipleNow && newProfile.completedPlans < 1) {
          didCompleteTrial = true;
          return { ...newProfile, completedPlans: newProfile.completedPlans + 1 };
        }
        return newProfile;

      } else if (isGps && !alreadyDisciple) {
        // Reconquista pela Trilha — livro já foi lido livremente antes
        earnedXp       = Math.round((50 + chapters * 1) * mult);
        earnedCategory = 'discipleTrail';
        earnedType     = 'disciple';
        earnedReason   = `Reconquistou ${bookData?.name || bookId} pela Trilha`;
        isReconquest   = true;

        return {
          ...prev,
          discipleCompletedBooks: [...(prev.discipleCompletedBooks || []), bookId],
        };
      }

      return prev; // já estava tudo concluído, sem mudança
    });

    // Dispara XP e efeitos APÓS o setState ser enfileirado
    setTimeout(() => {
      if (earnedXp > 0) {
        addPoints(earnedXp, earnedReason, earnedCategory);
        showFloatingPoints(earnedXp, earnedType);
        fireNotificationTrigger();
      }

      if (isFirstCompletion) {
        // Atualiza desafio semanal
        setWeeklyChallenge(prev => {
          if (prev.completed) return prev;
          const newProgress = prev.progress + 1;
          const completed   = newProgress >= prev.target;
          if (completed) {
            setTimeout(() => {
              addPoints(prev.rewardPoints, `Desafio semanal concluido: ${prev.title}`, 'bonus');
              showFloatingPoints(prev.rewardPoints, 'bonus_trail');
            }, 300);
          }
          return { ...prev, progress: newProgress, completed };
        });

        // Post no feed da comunidade
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
            const action   = isGps
              ? `concluiu "${bookName}" pela Trilha do Discípulo 🧭`
              : `concluiu o livro de "${bookName}" 📖`;
            supabase.from('community_feed').insert({
              user_name: profile.name, user_email: profile.email,
              avatar_id: profile.avatarId || '', action,
            }).then(() => {}).catch(() => {});
          }
        }

        // Bônus épico pela conclusão da Trilha do Discípulo
        if (didCompleteTrial) {
          const trailKey = `trail_disciple_xp_awarded_${userId || 'local'}`;
          if (!safeStorage.getItem(trailKey)) {
            safeStorage.setItem(trailKey, 'true');
            setTimeout(() => {
              addPoints(1000, 'Trilha do Discípulo completa! 🏆', 'bonus');
              showFloatingPoints(1000, 'bonus_trail');
            }, 300);
          }
        }
      }
    }, 0);
  };

  const markBookVisited = (bookId: string) => {
    if (!profile.visitedBooks?.includes(bookId)) {
      setProfile(prev => ({
        ...prev,
        visitedBooks: [...(prev.visitedBooks || []), bookId]
      }));
      // Visita não gera XP — apenas registra para histórico e desbloqueio de conteúdo
    }
  };

  const markChapterRead = (bookId: string, chapterNum: number, _totalChapters: number) => {
    setProfile(prev => {
      const currentRead   = prev.readChapters?.[bookId]  || [];
      const alreadyEarned = (prev.xpChapters?.[bookId]   || []).includes(chapterNum);
      const isAlreadyRead = currentRead.includes(chapterNum);

      // Toggle visual do estado lido/não-lido
      const updatedRead = isAlreadyRead
        ? currentRead.filter(c => c !== chapterNum)
        : [...currentRead, chapterNum];

      // XP só na PRIMEIRA vez que o capítulo é marcado — nunca ao remarcar
      if (!isAlreadyRead && !alreadyEarned) {
        const xp = applyMultiplier(5, prev.streak);
        const updatedXpChapters = [...(prev.xpChapters?.[bookId] || []), chapterNum];
        setTimeout(() => {
          addPoints(xp, `Leu capítulo ${chapterNum} de ${bookId}`, 'freeExploration');
          showFloatingPoints(xp, 'free');
          fireNotificationTrigger();
        }, 0);
        return {
          ...prev,
          readChapters: { ...(prev.readChapters || {}), [bookId]: updatedRead },
          xpChapters:   { ...(prev.xpChapters   || {}), [bookId]: updatedXpChapters },
        };
      }

      return {
        ...prev,
        readChapters: { ...(prev.readChapters || {}), [bookId]: updatedRead },
      };
    });
  };

  // Marca todos os capítulos de uma vez, gerando apenas 1 notificação de XP.
  // CORREÇÃO BUG 4: usar N × applyMultiplier(5) para consistência com marcar individualmente.
  // Usa xpChapters como guard — ignora capítulos que já geraram XP, mesmo que estejam desmarcados.
  const markAllChaptersRead = (bookId: string, chapterNums: number[]) => {
    setProfile(prev => {
      const currentRead   = prev.readChapters?.[bookId] || [];
      const alreadyEarned = prev.xpChapters?.[bookId]   || [];

      // Capítulos não lidos visualmente
      const newReadChapters = chapterNums.filter(n => !currentRead.includes(n));
      // Capítulos que ainda não geraram XP (subconjunto — pode ser menor)
      const newXpChapters   = chapterNums.filter(n => !alreadyEarned.includes(n));

      if (newReadChapters.length === 0 && newXpChapters.length === 0) return prev;

      const updatedRead       = [...currentRead, ...newReadChapters.filter(n => !currentRead.includes(n))];
      const updatedXpChapters = [...alreadyEarned, ...newXpChapters];

      if (newXpChapters.length > 0) {
        const xpPerChapter = applyMultiplier(5, prev.streak);
        const totalXp      = xpPerChapter * newXpChapters.length;
        setTimeout(() => {
          addPoints(totalXp, `Marcou ${newXpChapters.length} capítulos de ${bookId}`, 'freeExploration');
          showFloatingPoints(totalXp, 'free');
        }, 0);
      }

      return {
        ...prev,
        readChapters: { ...(prev.readChapters || {}), [bookId]: updatedRead },
        xpChapters:   { ...(prev.xpChapters   || {}), [bookId]: updatedXpChapters },
      };
    });
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
    // Favoritar não gera XP — alimenta contador para badges (Coração Aberto)
  };

  // Atualiza favoritos no perfil (sincroniza com Supabase via debounce normal)
  const updateFavorites = (
    favorites: Record<string, boolean>,
    favoritesEver: Record<string, boolean>
  ) => {
    setProfile(prev => ({
      ...prev,
      bibleFavorites: favorites,
      bibleFavoritesEver: favoritesEver,
    }));
  };

  const accessDailyVerse = () => {
    setProfile(prev => {
      const newProfile = { ...prev, dailyVerseCount: prev.dailyVerseCount + 1 };
      checkBadges(newProfile);
      return newProfile;
    });
    const xp = applyMultiplier(15, profile.streak);
    addPoints(xp, 'Acessou versículo do dia', 'freeExploration');
    showFloatingPoints(xp, 'free');
    fireNotificationTrigger();
  };

  const completePlan = () => {
    setProfile(prev => {
      const newProfile = { ...prev, completedPlans: prev.completedPlans + 1 };
      checkBadges(newProfile);
      return newProfile;
    });
  };

  // Check streak on mount — aguarda o Supabase carregar para ter lastActiveDate correto
  useEffect(() => {
    const hasSupabase = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;
    // Sem Supabase: roda imediatamente com dados locais
    // Com Supabase: aguarda supabaseReady para ter lastActiveDate do banco
    if (!hasSupabase || supabaseReady) {
      if (hasCheckedStreak.current) return;
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
      
      {/* Floating XP Overlay */}
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
                <div className="text-stone-700 font-bold text-2xl drop-shadow-md">
                  +{fp.amount} XP
                </div>
              )}
              {fp.type === 'disciple' && (
                <div className="text-amber-500 font-bold text-3xl drop-shadow-lg flex items-center gap-2 bg-white/80 backdrop-blur-sm px-4 py-2 rounded-full border border-amber-200">
                  +{fp.amount} XP ⭐
                </div>
              )}
              {fp.type === 'bonus_step' && (
                <div className="text-orange-500 font-black text-4xl drop-shadow-xl flex items-center gap-2 bg-white/90 backdrop-blur-sm px-6 py-3 rounded-full border-2 border-orange-300">
                  +{fp.amount} XP BÔNUS!
                </div>
              )}
              {fp.type === 'bonus_trail' && (
                <div className="text-amber-400 font-black text-5xl drop-shadow-2xl flex items-center gap-3 bg-stone-900/90 backdrop-blur-md px-8 py-4 rounded-full border-4 border-amber-400">
                  +{fp.amount} XP 🏆
                </div>
              )}
              {fp.type === 'streak' && (
                <div className="text-rose-500 font-black text-3xl drop-shadow-xl flex items-center gap-2 bg-white/90 backdrop-blur-sm px-5 py-2.5 rounded-full border-2 border-rose-300">
                  🔥 {fp.amount}x STREAK!
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
