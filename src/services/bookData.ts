// ============================================================
//  bookData.ts — Conteúdo 100% via Supabase
//  Cache em 3 camadas: memória → localStorage → Supabase
// ============================================================

import { supabase } from '../lib/supabase';

export interface MindMapData {
  author: string;
  abbreviation: string;
  verses: string;
  period: string;
  location: string;
  order: string;
  meaning: string;
  summary: string;
  historicalContext: string;
  curiosity: string;
  practicalApplication: string;
  keywords: string[];
  themes: string[];
  names: { name: string; description: string }[];
  quote: string;
  quoteReference: string;
}

export interface ChapterSummary {
  chapter: string;
  title: string;
  summary: string;
}

export interface TimelineEvent {
  title: string;
  description: string;
  emoji: string;
}

export interface MainVerse {
  reference: string;
  text: string;
  explanation: string;
  emoji: string;
}

export interface BookData {
  mindmap: MindMapData;
  chapters: ChapterSummary[];
  timeline: TimelineEvent[];
  mainVerses: MainVerse[];
}

// ── Cache versioning ──────────────────────────────────────────
// Altere este número para forçar invalidação do cache em todos os dispositivos
const CACHE_VERSION = 'v1';
const CACHE_PREFIX = `book_cache_${CACHE_VERSION}_`;
const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

// ── Camada 1: Memória (dura a sessão inteira) ─────────────────
const memoryCache: Record<string, BookData> = {};

// ── Camada 2: localStorage (persiste entre sessões) ──────────
function getLocalCache(bookName: string): BookData | null {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + bookName);
    if (!raw) return null;
    const { data, timestamp } = JSON.parse(raw);
    // Expirado?
    if (Date.now() - timestamp > CACHE_MAX_AGE_MS) {
      localStorage.removeItem(CACHE_PREFIX + bookName);
      return null;
    }
    return data as BookData;
  } catch {
    return null;
  }
}

function setLocalCache(bookName: string, data: BookData) {
  try {
    localStorage.setItem(CACHE_PREFIX + bookName, JSON.stringify({
      data,
      timestamp: Date.now(),
    }));
  } catch (e) {
    // localStorage cheio — limpa caches antigos e tenta de novo
    pruneOldCaches();
    try {
      localStorage.setItem(CACHE_PREFIX + bookName, JSON.stringify({
        data,
        timestamp: Date.now(),
      }));
    } catch { /* sem espaço — tudo bem, memória ainda funciona */ }
  }
}

function pruneOldCaches() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('book_cache_'));
  // Remove versões antigas (diferente da versão atual)
  keys.forEach(k => {
    if (!k.startsWith(CACHE_PREFIX)) {
      localStorage.removeItem(k);
    }
  });
  // Se ainda lotado, remove os mais antigos
  const currentKeys = keys.filter(k => k.startsWith(CACHE_PREFIX));
  if (currentKeys.length > 30) {
    const withAge = currentKeys.map(k => {
      try { return { k, ts: JSON.parse(localStorage.getItem(k) || '{}').timestamp || 0 }; }
      catch { return { k, ts: 0 }; }
    }).sort((a, b) => a.ts - b.ts);
    withAge.slice(0, 10).forEach(({ k }) => localStorage.removeItem(k));
  }
}

// ── Busca principal: memória → localStorage → Supabase ──────────
export async function generateBookSummary(
  bookName: string,
  _chaptersCount: number
): Promise<BookData> {

  // 1. Memória (instantâneo)
  if (memoryCache[bookName]) {
    return memoryCache[bookName];
  }

  // 2. localStorage (< 1ms, sem rede)
  const cached = getLocalCache(bookName);
  if (cached) {
    memoryCache[bookName] = cached;
    return cached;
  }

  // 3. Supabase
  const fetchPromise = supabase
    .from('bible_books_data')
    .select('data')
    .eq('book_name', bookName)
    .single();

  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('timeout')), 8000)
  );

  const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as Awaited<typeof fetchPromise>;

  if (error || !data?.data) {
    throw new Error(`Livro "${bookName}" não encontrado no banco de dados.`);
  }

  const result = data.data as BookData;
  memoryCache[bookName] = result;
  setLocalCache(bookName, result);
  return result;
}

// ── Pré-carregamento em background ───────────────────────────
// Chame após o login para pre-popular o cache dos livros mais usados
export async function prefetchBooks(bookNames: string[]): Promise<void> {
  // Filtra apenas os que ainda não estão em cache
  const missing = bookNames.filter(name => !memoryCache[name] && !getLocalCache(name));
  if (missing.length === 0) return;

  try {
    const { data, error } = await supabase
      .from('bible_books_data')
      .select('book_name, data')
      .in('book_name', missing);

    if (error || !data) return;

    data.forEach(row => {
      const bookData = row.data as BookData;
      memoryCache[row.book_name] = bookData;
      setLocalCache(row.book_name, bookData);
    });

    console.log(`[bookData] Pré-carregados ${data.length} livros em background`);
  } catch (e) {
    // Silencioso — prefetch é opcional
  }
}

export function clearBookCache(bookName?: string) {
  if (bookName) {
    delete memoryCache[bookName];
    localStorage.removeItem(CACHE_PREFIX + bookName);
  } else {
    Object.keys(memoryCache).forEach(key => delete memoryCache[key]);
    Object.keys(localStorage)
      .filter(k => k.startsWith(CACHE_PREFIX))
      .forEach(k => localStorage.removeItem(k));
  }
}
