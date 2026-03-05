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

// Busca todas as trilhas ativas
export async function fetchTrails(): Promise<Trail[]> {
  const { data, error } = await supabase
    .from('trails')
    .select('*')
    .eq('is_active', true)
    .order('order_index');

  if (error || !data) return [];
  return data as Trail[];
}

// Busca os dias de uma trilha
export async function fetchTrailDays(trailId: string): Promise<TrailDay[]> {
  const { data, error } = await supabase
    .from('trail_days')
    .select('*')
    .eq('trail_id', trailId)
    .order('day_number');

  if (error || !data) return [];
  return data as TrailDay[];
}

// Busca o progresso do usuário em todas as trilhas
export async function fetchUserProgress(userId: string): Promise<UserTrailProgress[]> {
  const { data, error } = await supabase
    .from('user_trail_progress')
    .select('trail_id, day_number, completed_at')
    .eq('user_id', userId);

  if (error || !data) return [];
  return data as UserTrailProgress[];
}

// Marca um dia como concluído
export async function completeTrailDay(
  userId: string,
  trailId: string,
  dayNumber: number
): Promise<boolean> {
  const { error } = await supabase
    .from('user_trail_progress')
    .upsert({
      user_id: userId,
      trail_id: trailId,
      day_number: dayNumber,
      completed_at: new Date().toISOString(),
    }, { onConflict: 'user_id,trail_id,day_number' });

  return !error;
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
