// ============================================================
//  trails.ts — Serviço de Trilhas Temáticas
//  Leitura e progresso 100% via Supabase
// ============================================================

import { supabase } from '../lib/supabase';

export interface Trail {
  id: string;
  slug: string;
  title: string;
  description: string;
  duration_days: number;
  category: string;
  emoji: string;
  is_premium: boolean;
  order_index: number;
}

export interface TrailDay {
  id: string;
  trail_id: string;
  day_number: number;
  title: string;
  reading: string;
  reflection: string;
  verse: string;
  verse_reference: string;
  practice: string | null;
  emoji: string;
}

export interface UserTrailProgress {
  trail_id: string;
  day_number: number;
  completed_at: string;
}

// Helper: query com timeout de segurança
async function withTimeout<T>(promise: PromiseLike<T> | Promise<T>, ms = 8000): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Supabase query timeout')), ms)
  );
  return Promise.race([promise as Promise<T>, timeout]);
}

// Busca todas as trilhas ativas
export async function fetchTrails(): Promise<Trail[]> {
  try {
    const { data, error } = await withTimeout(
      supabase.from('trails').select('*').eq('is_active', true).order('order_index')
    );
    if (error) { console.warn('[trails] fetchTrails:', error.message); return []; }
    return (data || []) as Trail[];
  } catch (e) {
    console.warn('[trails] fetchTrails exception:', e);
    return [];
  }
}

// Busca os dias de uma trilha
export async function fetchTrailDays(trailId: string): Promise<TrailDay[]> {
  try {
    const { data, error } = await withTimeout(
      supabase.from('trail_days').select('*').eq('trail_id', trailId).order('day_number')
    );
    if (error) { console.warn('[trails] fetchTrailDays:', error.message); return []; }
    return (data || []) as TrailDay[];
  } catch (e) {
    console.warn('[trails] fetchTrailDays exception:', e);
    return [];
  }
}

// Busca o progresso do usuário em todas as trilhas
export async function fetchUserProgress(userId: string): Promise<UserTrailProgress[]> {
  try {
    const { data, error } = await withTimeout(
      supabase.from('user_trail_progress').select('trail_id, day_number, completed_at').eq('user_id', userId)
    );
    if (error) { console.warn('[trails] fetchUserProgress:', error.message); return []; }
    return (data || []) as UserTrailProgress[];
  } catch (e) {
    console.warn('[trails] fetchUserProgress exception:', e);
    return [];
  }
}

// Marca um dia como concluído
export async function completeTrailDay(
  userId: string,
  trailId: string,
  dayNumber: number
): Promise<boolean> {
  try {
    const { error } = await withTimeout(
      supabase.from('user_trail_progress').upsert({
        user_id: userId,
        trail_id: trailId,
        day_number: dayNumber,
        completed_at: new Date().toISOString(),
      }, { onConflict: 'user_id,trail_id,day_number' })
    );
    if (error) { console.warn('[trails] completeTrailDay:', error.message); return false; }
    return true;
  } catch (e) {
    console.warn('[trails] completeTrailDay exception:', e);
    return false;
  }
}

// Retorna quantos dias de uma trilha o usuário completou
export function getTrailCompletedDays(
  progress: UserTrailProgress[],
  trailId: string
): number[] {
  return progress
    .filter(p => p.trail_id === trailId)
    .map(p => p.day_number);
}
