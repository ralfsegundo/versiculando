// ============================================================
//  sharingService.ts — 100% Supabase (sem server.ts / WebSocket)
//  Usa Supabase Realtime para notificações em tempo real.
// ============================================================

import { supabase } from '../lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

export interface Connection {
  user: {
    id: string;
    name: string;
    email: string;
    avatarId?: string;
    avatarUrl?: string;
  };
  status: 'pending' | 'accepted' | 'rejected';
  isRequester: boolean;
}

type ConnectionListener = (data: { type: string; [key: string]: any }) => void;

// Helper: query com timeout de segurança
async function withTimeout<T>(promise: Promise<T>, ms = 8000): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Supabase query timeout')), ms)
  );
  return Promise.race([promise, timeout]);
}

class SharingService {
  private channel: RealtimeChannel | null = null;
  private listeners: Set<ConnectionListener> = new Set();

  // ── Realtime ──────────────────────────────────────────────
  async register(profile: { id: string; email: string; name: string; avatarId?: string; avatarUrl?: string }) {
    try {
      await supabase
        .from('profiles')
        .update({ email: profile.email, name: profile.name, avatar_id: profile.avatarId, avatar_url: profile.avatarUrl })
        .eq('id', profile.id);
      this.subscribeToConnections(profile.email);
    } catch (e) {
      console.warn('[sharingService] register error:', e);
    }
  }

  private subscribeToConnections(email: string) {
    if (this.channel) {
      supabase.removeChannel(this.channel);
    }

    this.channel = supabase
      .channel(`connections:${email}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_connections',
          filter: `to_email=eq.${email}`,
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            this.notify({ type: 'CONNECTION_REQUEST', from: payload.new });
          } else if (payload.eventType === 'UPDATE') {
            const type = payload.new.status === 'accepted' ? 'CONNECTION_ACCEPTED' : 'CONNECTION_REJECTED';
            this.notify({ type, connection: payload.new });
          }
        }
      )
      .subscribe();
  }

  private notify(data: { type: string; [key: string]: any }) {
    this.listeners.forEach((l) => l(data));
  }

  addListener(l: ConnectionListener) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  unsubscribe() {
    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }
  }

  // ── Busca de Usuários ────────────────────────────────────
  async searchUsers(query: string) {
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('profiles')
          .select('id, name, email, avatar_id, avatar_url')
          .or(`email.ilike.%${query}%,name.ilike.%${query}%`)
          .limit(10)
      );
      if (error) { console.warn('[sharingService] searchUsers:', error.message); return []; }
      return (data || []).map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        avatarId: u.avatar_id,
        avatarUrl: u.avatar_url,
      }));
    } catch (e) {
      console.warn('[sharingService] searchUsers exception:', e);
      return [];
    }
  }

  // ── Conexões ─────────────────────────────────────────────
  async requestConnection(fromEmail: string, toEmail: string) {
    try {
      const { error } = await withTimeout(
        supabase.from('user_connections').upsert(
          { from_email: fromEmail, to_email: toEmail, status: 'pending' },
          { onConflict: 'from_email,to_email' }
        )
      );
      if (error) { console.warn('[sharingService] requestConnection:', error.message); return { success: false }; }
      return { success: true };
    } catch (e) {
      console.warn('[sharingService] requestConnection exception:', e);
      return { success: false };
    }
  }

  async respondToConnection(fromEmail: string, toEmail: string, status: 'accepted' | 'rejected') {
    try {
      const { error } = await withTimeout(
        supabase
          .from('user_connections')
          .update({ status })
          .eq('from_email', fromEmail)
          .eq('to_email', toEmail)
      );
      if (error) { console.warn('[sharingService] respondToConnection:', error.message); return { success: false }; }
      return { success: true };
    } catch (e) {
      console.warn('[sharingService] respondToConnection exception:', e);
      return { success: false };
    }
  }

  async getConnections(email: string): Promise<Connection[]> {
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('user_connections')
          .select('id, from_email, to_email, status')
          .or(`from_email.eq.${email},to_email.eq.${email}`)
          .in('status', ['pending', 'accepted'])
      );

      if (error) { console.warn('[sharingService] getConnections:', error.message); return []; }
      if (!data || data.length === 0) return [];

      const otherEmails = data.map((row: any) =>
        row.from_email === email ? row.to_email : row.from_email
      );
      const uniqueEmails = [...new Set(otherEmails)];

      const { data: profiles } = await withTimeout(
        supabase
          .from('profiles')
          .select('id, name, email, avatar_id, avatar_url')
          .in('email', uniqueEmails)
      );

      const profileMap = new Map((profiles || []).map((p: any) => [p.email, p]));

      return data.map((row: any) => {
        const isRequester = row.from_email === email;
        const otherEmail = isRequester ? row.to_email : row.from_email;
        const other = profileMap.get(otherEmail);
        return {
          user: {
            id: other?.id || '',
            name: other?.name || otherEmail,
            email: otherEmail,
            avatarId: other?.avatar_id,
            avatarUrl: other?.avatar_url,
          },
          status: row.status as 'pending' | 'accepted',
          isRequester,
        };
      });
    } catch (e) {
      console.warn('[sharingService] getConnections exception:', e);
      return [];
    }
  }

  // ── Compartilhamento de Notas ────────────────────────────
  async shareNote(userId: string, noteId: string, noteContent?: any, sharedWithEmail?: string, isAll?: boolean) {
    try {
      const payload: any = {
        owner_id: userId,
        note_id: noteId,
        note_content: noteContent || null,
        shared_with_email: sharedWithEmail || null,
        is_public: !!isAll,
      };
      const { error } = await withTimeout(
        supabase.from('shared_notes').upsert(payload, { onConflict: 'owner_id,note_id' })
      );
      if (error) { console.warn('[sharingService] shareNote:', error.message); return { success: false }; }
      return { success: true };
    } catch (e) {
      console.warn('[sharingService] shareNote exception:', e);
      return { success: false };
    }
  }

  async unshareNote(userId: string, noteId: string, isAll?: boolean) {
    try {
      let query = supabase
        .from('shared_notes')
        .delete()
        .eq('owner_id', userId)
        .eq('note_id', noteId);

      if (!isAll) {
        query = query.eq('is_public', false);
      }

      const { error } = await withTimeout(query);
      if (error) { console.warn('[sharingService] unshareNote:', error.message); return { success: false }; }
      return { success: true };
    } catch (e) {
      console.warn('[sharingService] unshareNote exception:', e);
      return { success: false };
    }
  }

  async getSharedNotes(email: string, bookId: string) {
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('shared_notes')
          .select('note_id, note_content, owner_id, profiles(name, email, avatar_id, avatar_url)')
          .or(`is_public.eq.true,shared_with_email.eq.${email}`)
          .eq('note_content->>bookId', bookId)
      );
      if (error) { console.warn('[sharingService] getSharedNotes:', error.message); return []; }
      return data || [];
    } catch (e) {
      console.warn('[sharingService] getSharedNotes exception:', e);
      return [];
    }
  }
}

export const sharingService = new SharingService();
