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

class SharingService {
  private channel: RealtimeChannel | null = null;
  private listeners: Set<ConnectionListener> = new Set();

  // ── Realtime ──────────────────────────────────────────────
  async register(profile: { id: string; email: string; name: string; avatarId?: string; avatarUrl?: string }) {
    await supabase
      .from('profiles')
      .update({ email: profile.email, name: profile.name, avatar_id: profile.avatarId, avatar_url: profile.avatarUrl })
      .eq('id', profile.id);

    this.subscribeToConnections(profile.email);
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
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, avatar_id, avatar_url')
      .or(`email.ilike.%${query}%,name.ilike.%${query}%`)
      .limit(10);

    if (error) throw error;
    return (data || []).map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      avatarId: u.avatar_id,
      avatarUrl: u.avatar_url,
    }));
  }

  // ── Conexões ─────────────────────────────────────────────
  async requestConnection(fromEmail: string, toEmail: string) {
    const { error } = await supabase.from('user_connections').upsert(
      { from_email: fromEmail, to_email: toEmail, status: 'pending' },
      { onConflict: 'from_email,to_email' }
    );
    if (error) throw error;
    return { success: true };
  }

  async respondToConnection(fromEmail: string, toEmail: string, status: 'accepted' | 'rejected') {
    const { error } = await supabase
      .from('user_connections')
      .update({ status })
      .eq('from_email', fromEmail)
      .eq('to_email', toEmail);
    if (error) throw error;
    return { success: true };
  }

  async getConnections(email: string): Promise<Connection[]> {
    // Busca as conexões sem depender de foreign key join (a tabela usa TEXT, não FK para profiles)
    const { data, error } = await supabase
      .from('user_connections')
      .select('id, from_email, to_email, status')
      .or(`from_email.eq.${email},to_email.eq.${email}`)
      .neq('status', 'rejected');

    if (error) throw error;
    if (!data || data.length === 0) return [];

    // Coleta todos os emails dos outros usuários para buscar perfis em lote
    const otherEmails = data.map((row: any) =>
      row.from_email === email ? row.to_email : row.from_email
    );
    const uniqueEmails = [...new Set(otherEmails)];

    // Busca perfis em lote (uma única query)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, email, avatar_id, avatar_url')
      .in('email', uniqueEmails);

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
        status: row.status,
        isRequester,
      };
    });
  }

  // ── Compartilhamento de Notas ────────────────────────────
  async shareNote(userId: string, noteId: string, noteContent?: any, sharedWithEmail?: string, isAll?: boolean) {
    const payload: any = {
      owner_id: userId,
      note_id: noteId,
      note_content: noteContent || null,
      shared_with_email: sharedWithEmail || null,
      is_public: !!isAll,
    };

    const { error } = await supabase
      .from('shared_notes')
      .upsert(payload, { onConflict: 'owner_id,note_id' });
    if (error) throw error;
    return { success: true };
  }

  async unshareNote(userId: string, noteId: string, isAll?: boolean) {
    let query = supabase
      .from('shared_notes')
      .delete()
      .eq('owner_id', userId)
      .eq('note_id', noteId);

    if (!isAll) {
      query = query.eq('is_public', false);
    }

    const { error } = await query;
    if (error) throw error;
    return { success: true };
  }

  async getSharedNotes(email: string, bookId: string) {
    const { data, error } = await supabase
      .from('shared_notes')
      .select('note_id, note_content, owner_id, profiles(name, email, avatar_id, avatar_url)')
      .or(`is_public.eq.true,shared_with_email.eq.${email}`)
      .eq('note_content->>bookId', bookId);

    if (error) throw error;
    return data || [];
  }
}

export const sharingService = new SharingService();
