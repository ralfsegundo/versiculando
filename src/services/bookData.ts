// ============================================================
//  bookData.ts — Conteúdo 100% via Supabase
//  O Gemini não é chamado aqui. Todo conteúdo vem do banco.
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

// Cache em memória — evita múltiplas chamadas ao banco na mesma sessão
const memoryCache: Record<string, BookData> = {};

export async function generateBookSummary(
  bookName: string,
  _chaptersCount: number
): Promise<BookData> {

  // 1. Cache em memória
  if (memoryCache[bookName]) {
    return memoryCache[bookName];
  }

  // 2. Busca no Supabase
  const { data, error } = await supabase
    .from('bible_books_data')
    .select('data')
    .eq('book_name', bookName)
    .single();

  if (error || !data) {
    throw new Error(
      `O conteúdo do livro "${bookName}" ainda não está disponível. Em breve será adicionado! 📖`
    );
  }

  const result = data.data as BookData;

  // 3. Salva em cache
  memoryCache[bookName] = result;

  return result;
}

export function clearBookCache(bookName?: string) {
  if (bookName) {
    delete memoryCache[bookName];
  } else {
    Object.keys(memoryCache).forEach(key => delete memoryCache[key]);
  }
}