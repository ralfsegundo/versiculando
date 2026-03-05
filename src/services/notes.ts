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

export function useNotes(bookId: string) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const localKey = (uid: string | null) => uid ? `${uid}_bible_notes` : 'bible_notes';

  useEffect(() => {
    const loadNotes = async () => {
      const hasSupabase = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (hasSupabase) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUserId(session.user.id);
          
          const { data, error } = await supabase
            .from('bible_notes')
            .select('*')
            .eq('user_id', session.user.id)
            .eq('book_id', bookId)
            .order('timestamp', { ascending: false });
            
          if (!error && data) {
            setNotes(data.map(n => ({
              id: n.id,
              bookId: n.book_id,
              text: n.text,
              createdAt: n.timestamp,
              color: n.color,
              context: { chapter: n.chapter }
            })));
            return;
          }
        }
      }

      // Fallback to local storage (prefixed by userId)
      const uid = (await supabase.auth.getSession()).data.session?.user.id ?? null;
      const storedNotes = localStorage.getItem(localKey(uid));
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
  }, [bookId]);

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
          verse: 1, // Default verse if not specified
          text: text,
          color: color,
          timestamp: newNote.createdAt
        }).select().single();
        
        if (!error && data) {
          newNote.id = data.id;
        }
      } catch (err) {
        console.error('Error adding note to Supabase', err);
      }
    }
    
    // Only write to localStorage as fallback (no Supabase)
    if (!userId) {
      const storedNotes = localStorage.getItem(localKey(userId));
      const allNotes: Note[] = storedNotes ? JSON.parse(storedNotes) : [];
      const updatedNotes = [...allNotes, newNote];
      localStorage.setItem(localKey(userId), JSON.stringify(updatedNotes));
    }
    setNotes(prev => [newNote, ...prev]);
  };

  const deleteNote = async (id: string) => {
    if (userId) {
      try {
        await supabase.from('bible_notes').delete().eq('id', id).eq('user_id', userId);
      } catch (err) {
        console.error('Error deleting note from Supabase', err);
      }
    }
    
    const storedNotes = localStorage.getItem(localKey(userId));
    if (storedNotes) {
      const allNotes: Note[] = JSON.parse(storedNotes);
      const updatedNotes = allNotes.filter(n => n.id !== id);
      localStorage.setItem(localKey(userId), JSON.stringify(updatedNotes));
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
        console.error('Error updating note in Supabase', err);
      }
    }
    
    const storedNotes = localStorage.getItem(localKey(userId));
    if (storedNotes) {
      const allNotes: Note[] = JSON.parse(storedNotes);
      const updatedNotes = allNotes.map(n => n.id === id ? { ...n, text: newText, color: color !== undefined ? color : n.color } : n);
      localStorage.setItem(localKey(userId), JSON.stringify(updatedNotes));
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
      const updatedNotes = allNotes.map(n => n.bookId === bookId ? { ...n, isShared: shared } : n);
      localStorage.setItem(localKey(userId), JSON.stringify(updatedNotes));
      setNotes(prev => prev.map(n => ({ ...n, isShared: shared })));
    }
  };

  return { notes, addNote, deleteNote, updateNote, toggleShare, setAllShared };
}
