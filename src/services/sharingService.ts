import { UserProfile } from "./gamification";

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

class SharingService {
  private ws: WebSocket | null = null;
  private listeners: Set<(data: any) => void> = new Set();

  async register(profile: UserProfile) {
    try {
      await fetch('/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: profile.id,
          name: profile.name,
          email: profile.email,
          avatarId: profile.avatarId,
          avatarUrl: profile.avatarUrl
        })
      });
      this.connectWS(profile.email!);
    } catch (e) {
      console.error("Failed to register user", e);
    }
  }

  private connectWS(email: string) {
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}`);
    this.ws = ws;
    
    ws.onopen = () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'IDENTIFY', email }));
      }
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.listeners.forEach(l => l(data));
    };

    ws.onclose = () => {
      if (this.ws === ws) {
        this.ws = null;
      }
      setTimeout(() => this.connectWS(email), 5000);
    };
  }

  addListener(l: (data: any) => void) {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  async searchUsers(query: string) {
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
    return await res.json();
  }

  async requestConnection(fromEmail: string, toEmail: string) {
    const res = await fetch('/api/connections/request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromEmail, toEmail })
    });
    return await res.json();
  }

  async respondToConnection(fromEmail: string, toEmail: string, status: 'accepted' | 'rejected') {
    const res = await fetch('/api/connections/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fromEmail, toEmail, status })
    });
    return await res.json();
  }

  async getConnections(email: string): Promise<Connection[]> {
    const res = await fetch(`/api/connections/${email}`);
    return await res.json();
  }

  async shareNote(email: string, noteId: string, noteContent?: any, sharedWithEmail?: string, isAll?: boolean) {
    const res = await fetch('/api/notes/share', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, noteId, noteContent, sharedWithEmail, isAll })
    });
    return await res.json();
  }

  async unshareNote(email: string, noteId: string, isAll?: boolean) {
    const res = await fetch('/api/notes/unshare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, noteId, isAll })
    });
    return await res.json();
  }

  async getSharedNotes(email: string, bookId: string) {
    const res = await fetch(`/api/notes/shared/${email}?bookId=${bookId}`);
    return await res.json();
  }
}

export const sharingService = new SharingService();
