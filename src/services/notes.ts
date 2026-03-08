import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface NoteContext {
  chapter?: string | number;
  chapterTitle?: string;
}

export interface Note {
  id: string;
  bookId: string;
  text: string;
  createdAt: string;
  color?: string;
  context?: NoteContext;
  isShared?: boolean;
}

export function useNotes(bookId: string, userId: string | null = null) {
  const [notes, setNotes] = useState<Note[]>([]);

  const localKey = (uid: string | null) => uid ? `${uid}_bible_notes` : 'bible_notes';

  useEffect(() => {
    const loadNotes = async () => {
      const hasSupabase = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (hasSupabase && userId) {
        try {
          const { data, error } = await supabase
            .from('bible_notes')
            .select('*')
            .eq('user_id', userId)
            .eq('book_id', bookId)
            .order('timestamp', { ascending: false });

          if (!error && data) {
            let localByTimestamp: Record<string, Note> = {};
            let missingLocalNotes: Note[] = [];
            
            try {
              const storedNotes = localStorage.getItem(localKey(userId));
              if (storedNotes) {
                const allLocal: Note[] = JSON.parse(storedNotes);
                const remoteIds = new Set(data.map(n => n.id));
                
                allLocal.filter(n => n.bookId === bookId).forEach(n => {
                  localByTimestamp[n.createdAt] = n;
                  // Recupera notas feitas offline que ainda não estão no Supabase
                  if (!remoteIds.has(n.id) && !n.id.includes('-')) {
                     missingLocalNotes.push(n);
                     // Faz o upload silencioso da nota offline
                     supabase.from('bible_notes').insert({
                        user_id: userId, 
                        book_id: bookId, 
                        chapter: n.context?.chapter ? parseInt(n.context.chapter.toString()) : 1, 
                        verse: 1, 
                        text: n.text, 
                        color: n.color, 
                        timestamp: n.createdAt
                     }).then();
                  }
                });
              }
            } catch { /* ignora erros de parse local */ }

            const remoteNotesMapped = data.map(n => {
              const localMatch = localByTimestamp[n.timestamp];
              return {
                id: n.id,
                bookId: n.book_id,
                text: n.text,
                createdAt: n.timestamp,
                color: n.color,
                context: {
                  chapter: n.chapter,
                  chapterTitle: localMatch?.context?.chapterTitle,
                },
              };
            });

            // Une as notas remotas com as notas offline resgatadas
            const mergedNotes = [...missingLocalNotes, ...remoteNotesMapped].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
            setNotes(mergedNotes);
            return;
          }
        } catch (e) {
          console.warn('[notes] loadNotes error:', e);
        }
      }

      // Fallback to localStorage
      const storedNotes = localStorage.getItem(localKey(userId));
      if (storedNotes) {
        try {
          const allNotes: Note[] = JSON.parse(storedNotes);
          setNotes(allNotes.filter(n => n.bookId === bookId).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        } catch (e) {
          console.error('Failed to parse notes', e);
        }
      }
    };

    loadNotes();
  }, [bookId, userId]);

  const addNote = async (text: string, color?: string, context?: NoteContext) => {
    const newNote: Note = {
      id: Date.now().toString(),
      bookId,
      text,
      createdAt: new Date().toISOString(),
      color,
      context,
    };

    if (userId) {
      try {
        const { data, error } = await supabase.from('bible_notes').insert({
          user_id: userId,
          book_id: bookId,
          chapter: context?.chapter ? parseInt(context.chapter.toString()) : 1,
          verse: 1,
          text,
          color,
          timestamp: newNote.createdAt
        }).select().single();

        if (!error && data) {
          newNote.id = data.id;
        }
      } catch (err) {
        console.warn('[notes] addNote error:', err);
      }
    }
    const storedNotes = localStorage.getItem(localKey(userId));
    const allNotes: Note[] = storedNotes ? JSON.parse(storedNotes) : [];
    localStorage.setItem(localKey(userId), JSON.stringify([...allNotes, newNote]));
    setNotes(prev => [newNote, ...prev]);
  };

  const deleteNote = async (id: string) => {
    if (userId) {
      try {
        await supabase.from('bible_notes').delete().eq('id', id).eq('user_id', userId);
      } catch (err) {
        console.warn('[notes] deleteNote error:', err);
      }
    }
    const storedNotes = localStorage.getItem(localKey(userId));
    if (storedNotes) {
      const allNotes: Note[] = JSON.parse(storedNotes);
      localStorage.setItem(localKey(userId), JSON.stringify(allNotes.filter(n => n.id !== id)));
    }
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  const updateNote = async (id: string, newText: string, color?: string) => {
    if (userId) {
      try {
        const updateData: any = { text: newText };
        if (color !== undefined) updateData.color = color;
        await supabase.from('bible_notes').update(updateData).eq('id', id).eq('user_id', userId);
      } catch (err) {
        console.warn('[notes] updateNote error:', err);
      }
    }
    const storedNotes = localStorage.getItem(localKey(userId));
    if (storedNotes) {
      const allNotes: Note[] = JSON.parse(storedNotes);
      localStorage.setItem(localKey(userId), JSON.stringify(allNotes.map(n => n.id === id ? { ...n, text: newText, color: color !== undefined ? color : n.color } : n)));
    }
    setNotes(prev => prev.map(n => n.id === id ? { ...n, text: newText, color: color !== undefined ? color : n.color } : n));
  };

  const toggleShare = (id: string) => {
    const storedNotes = localStorage.getItem(localKey(userId));
    if (storedNotes) {
      const allNotes: Note[] = JSON.parse(storedNotes);
      const updatedNotes = allNotes.map(n => n.id === id ? { ...n, isShared: !n.isShared } : n);
      localStorage.setItem(localKey(userId), JSON.stringify(updatedNotes));
      setNotes(prev => prev.map(n => n.id === id ? { ...n, isShared: !n.isShared } : n));
      return updatedNotes.find(n => n.id === id)?.isShared;
    }
    return false;
  };

  const setAllShared = (shared: boolean) => {
    const storedNotes = localStorage.getItem(localKey(userId));
    if (storedNotes) {
      const allNotes: Note[] = JSON.parse(storedNotes);
      localStorage.setItem(localKey(userId), JSON.stringify(allNotes.map(n => n.bookId === bookId ? { ...n, isShared: shared } : n)));
      setNotes(prev => prev.map(n => ({ ...n, isShared: shared })));
    }
  };

  return { notes, addNote, deleteNote, updateNote, toggleShare, setAllShared };
}
