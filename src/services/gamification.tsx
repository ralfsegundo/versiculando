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
  if (streak >=
