// ============================================================
//  trails.ts — Serviço de Trilhas Temáticas
//  Leitura e progresso via Supabase + Cache Local (PWA-proof)
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
async function withTimeout<T>(promise: Promise<T>, ms = 8000): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Supabase query timeout')), ms)
  );
  return Promise.race([promise, timeout]);
}

// ============================================================
// Helpers de Cache Local (A vacina contra o reload do PWA)
// ============================================================
const getLocalProgress = (userId: string): UserTrailProgress[] => {
  try {
    const stored = localStorage.getItem(`trail_progress_${userId}`);
    return stored ? JSON.parse(stored) : [];
  } catch { return []; }
};

const saveLocalProgress = (userId: string, progress: UserTrailProgress[]) => {
  try {
    localStorage.setItem(`trail_progress_${userId}`, JSON.stringify(progress));
  } catch {}
};

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
  const localProgress = getLocalProgress(userId);

  try {
    const { data, error } = await withTimeout(
      supabase
        .from('user_trail_progress')
        .select('trail_id, day_number, completed_at')
        .eq('user_id', userId)
    );

    if (error) {
      console.warn('[trails] fetchUserProgress:', error.message);
      return localProgress; // Se der erro ou offline, confia no que está no aparelho
    }

    // Merge: O que o PWA deixou passar do banco + o que você salvou no local
    const remoteProgress = (data || []) as UserTrailProgress[];
    const mergedMap = new Map<string, UserTrailProgress>();

    remoteProgress.forEach(p => mergedMap.set(`${p.trail_id}_${p.day_number}`, p));
    localProgress.forEach(p => {
      // Se o local diz que completou, mas o banco omitiu pelo cache maldito, o local vence
      if (!mergedMap.has(`${p.trail_id}_${p.day_number}`)) {
        mergedMap.set(`${p.trail_id}_${p.day_number}`, p);
      }
    });

    const merged = Array.from(mergedMap.values());
    saveLocalProgress(userId, merged); // Atualiza a verdade no aparelho
    return merged;

  } catch (e) {
    console.warn('[trails] fetchUserProgress exception:', e);
    return localProgress;
  }
}

// Marca um dia como concluído
export async function completeTrailDay(
  userId: string,
  trailId: string,
  dayNumber: number
): Promise<boolean> {
  
  // 1. SALVA NO LOCAL IMEDIATAMENTE. O PWA nunca mais vai esquecer no reload.
  const currentLocal = getLocalProgress(userId);
  const alreadyExists = currentLocal.some(p => p.trail_id === trailId && p.day_number === dayNumber);
  if (!alreadyExists) {
    const newLocal = [...currentLocal, { trail_id: trailId, day_number: dayNumber, completed_at: new Date().toISOString() }];
    saveLocalProgress(userId, newLocal);
  }

  // 2. TENTA SALVAR NO BANCO DE DADOS
  try {
    const { error } = await withTimeout(
      supabase.from('user_trail_progress').upsert({
        user_id: userId,
        trail_id: trailId,
        day_number: dayNumber,
        completed_at: new Date().toISOString(),
      }, { onConflict: 'user_id,trail_id,day_number' })
    );
    
    if (error) { 
      console.warn('[trails] completeTrailDay Supabase error:', error.message); 
    }
    
    // Retornamos true mesmo se der timeout de rede, pois o usuário já avançou via cache local
    return true;
  } catch (e) {
    console.warn('[trails] completeTrailDay exception:', e);
    return true; // Padrão "Offline-First"
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
