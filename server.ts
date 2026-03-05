import express from "express";
import { createServer as createViteServer } from "vite";
import { WebSocketServer, WebSocket } from "ws";
import { createServer } from "http";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const httpServer = createServer(app);

  app.use(express.json({ limit: '10mb' }));

  // In-memory storage (resets on server restart)
  const users: Record<string, { id: string; name: string; email: string; avatarId?: string; avatarUrl?: string }> = {};
  const connections: Array<{ from: string; to: string; status: 'pending' | 'accepted' | 'rejected' }> = [];
  const sharedNotes: Record<string, Set<string>> = {}; // ownerId -> Set of noteIds shared with everyone
  const sharedNotesContent: Record<string, any> = {}; // noteId -> note content
  const specificNoteShares: Array<{ noteId: string; ownerId: string; sharedWith: string }> = [];

  // API Routes
  app.post("/api/users/register", (req, res) => {
    const { id, name, email, avatarId, avatarUrl } = req.body;
    if (!email) return res.status(400).json({ error: "Email is required" });
    users[email] = { id, name, email, avatarId, avatarUrl };
    res.json({ success: true, user: users[email] });
  });

  app.get("/api/users/search", (req, res) => {
    const { q } = req.query;
    if (!q || typeof q !== 'string') return res.json([]);
    const results = Object.values(users).filter(u => 
      u.email.toLowerCase().includes(q.toLowerCase()) || 
      u.name.toLowerCase().includes(q.toLowerCase())
    );
    res.json(results);
  });

  app.post("/api/connections/request", (req, res) => {
    const { fromEmail, toEmail } = req.body;
    if (!users[fromEmail] || !users[toEmail]) return res.status(404).json({ error: "User not found" });
    
    const existing = connections.find(c => 
      (c.from === fromEmail && c.to === toEmail) || 
      (c.from === toEmail && c.to === fromEmail)
    );
    if (existing) return res.status(400).json({ error: "Connection already exists" });

    connections.push({ from: fromEmail, to: toEmail, status: 'pending' });
    broadcastToUser(toEmail, { type: 'CONNECTION_REQUEST', from: users[fromEmail] });
    res.json({ success: true });
  });

  app.post("/api/connections/respond", (req, res) => {
    const { fromEmail, toEmail, status } = req.body;
    const conn = connections.find(c => c.from === fromEmail && c.to === toEmail);
    if (!conn) return res.status(404).json({ error: "Connection not found" });
    
    conn.status = status;
    if (status === 'accepted') {
      broadcastToUser(fromEmail, { type: 'CONNECTION_ACCEPTED', to: users[toEmail] });
    }
    res.json({ success: true });
  });

  app.get("/api/connections/:email", (req, res) => {
    const { email } = req.params;
    const userConns = connections.filter(c => c.from === email || c.to === email);
    const result = userConns.map(c => {
      const otherEmail = c.from === email ? c.to : c.from;
      return {
        user: users[otherEmail],
        status: c.status,
        isRequester: c.from === email
      };
    });
    res.json(result);
  });

  app.post("/api/notes/share", (req, res) => {
    const { email, noteId, noteContent, sharedWithEmail, isAll } = req.body;
    if (isAll) {
      if (!sharedNotes[email]) sharedNotes[email] = new Set();
      sharedNotes[email].add('ALL');
      // For ALL, we'd need all notes content, but for now we'll just handle individual shares
    } else {
      if (sharedWithEmail) {
        specificNoteShares.push({ noteId, ownerId: email, sharedWith: sharedWithEmail });
      } else {
        if (!sharedNotes[email]) sharedNotes[email] = new Set();
        sharedNotes[email].add(noteId);
      }
      if (noteContent) {
        sharedNotesContent[noteId] = { ...noteContent, ownerEmail: email, ownerName: users[email]?.name, ownerAvatarId: users[email]?.avatarId, ownerAvatarUrl: users[email]?.avatarUrl };
      }
    }
    res.json({ success: true });
  });

  app.post("/api/notes/unshare", (req, res) => {
    const { email, noteId, isAll } = req.body;
    if (isAll) {
      if (sharedNotes[email]) sharedNotes[email].delete('ALL');
    } else {
      if (sharedNotes[email]) sharedNotes[email].delete(noteId);
      delete sharedNotesContent[noteId];
      const index = specificNoteShares.findIndex(s => s.noteId === noteId && s.ownerId === email);
      if (index > -1) specificNoteShares.splice(index, 1);
    }
    res.json({ success: true });
  });

  app.get("/api/notes/shared/:email", (req, res) => {
    const { email } = req.params;
    const { bookId } = req.query;
    
    const userConns = connections.filter(c => 
      (c.from === email || c.to === email) && c.status === 'accepted'
    );
    
    const friendEmails = userConns.map(c => c.from === email ? c.to : c.from);
    const result: any[] = [];

    Object.values(sharedNotesContent).forEach(note => {
      if (friendEmails.includes(note.ownerEmail) && note.bookId === bookId) {
        result.push(note);
      }
    });
    res.json(result);
  });

  // WebSocket Setup
  const wss = new WebSocketServer({ server: httpServer });
  const clients = new Map<string, WebSocket>();

  wss.on("connection", (ws) => {
    ws.on("message", (message) => {
      const data = JSON.parse(message.toString());
      if (data.type === 'IDENTIFY') {
        clients.set(data.email, ws);
      }
    });
    ws.on("close", () => {
      for (const [email, client] of clients.entries()) {
        if (client === ws) {
          clients.delete(email);
          break;
        }
      }
    });
  });

  function broadcastToUser(email: string, data: any) {
    const client = clients.get(email);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  }

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
