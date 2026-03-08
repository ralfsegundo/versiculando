import React, { useState, useEffect, ElementType } from 'react';
import { supabase } from '../lib/supabase';
import {
  Users, BookOpen, BarChart2, Bell, LogOut,
  Plus, Trash2, Edit3, Save, X, ChevronDown,
  ChevronRight, Eye, EyeOff, Send, TrendingUp,
  Shield, Menu, AlertCircle, CheckCircle2
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Profile {
  id: string;
  name: string;
  email: string;
  points: number;
  streak: number;
  title: string;
  join_date: string;
}

interface Trail {
  id: string;
  slug: string;
  title: string;
  description: string;
  duration_days: number;
  category: string;
  emoji: string;
  is_premium: boolean;
  is_active: boolean;
  order_index: number;
}

interface TrailDay {
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

type Tab = 'dashboard' | 'users' | 'trails' | 'notifications';

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3000); return () => clearTimeout(t); }, []);
  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium animate-fade-in ${type === 'success' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'}`}>
      {type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
      {message}
    </div>
  );
}

// ─── Dashboard Tab ────────────────────────────────────────────────────────────

function DashboardTab({ stats }: { stats: { users: number; trails: number; progress: number } }) {
  const cards = [
    { label: 'Usuários cadastrados', value: stats.users, icon: Users, color: 'bg-violet-500', light: 'bg-violet-50 text-violet-700' },
    { label: 'Trilhas ativas', value: stats.trails, icon: BookOpen, color: 'bg-amber-500', light: 'bg-amber-50 text-amber-700' },
    { label: 'Dias completados', value: stats.progress, icon: TrendingUp, color: 'bg-emerald-500', light: 'bg-emerald-50 text-emerald-700' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-stone-800 mb-1">Visão Geral</h2>
        <p className="text-sm text-stone-500">Resumo do Versiculando em tempo real</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, color, light }) => (
          <div key={label} className="bg-white rounded-2xl p-5 border border-stone-100 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">{label}</span>
              <div className={`w-8 h-8 rounded-xl ${color} flex items-center justify-center`}>
                <Icon size={16} className="text-white" />
              </div>
            </div>
            <p className="text-3xl font-black text-stone-800">{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-stone-100 shadow-sm p-5">
        <h3 className="text-sm font-bold text-stone-700 mb-3 flex items-center gap-2">
          <Shield size={14} className="text-amber-500" /> Acesso Admin
        </h3>
        <p className="text-sm text-stone-500 leading-relaxed">
          Você está no painel de administração do Versiculando. Aqui você pode gerenciar usuários,
          editar trilhas e conteúdo, enviar notificações e acompanhar estatísticas de uso.
        </p>
        <div className="mt-3 text-xs text-stone-400">
          ⚠️ Alterações feitas aqui afetam todos os usuários em tempo real.
        </div>
      </div>
    </div>
  );
}

// ─── Users Tab ────────────────────────────────────────────────────────────────

function UsersTab({ toast }: { toast: (m: string, t: 'success' | 'error') => void }) {
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    setLoading(true);
    const { data } = await supabase.from('profiles').select('*').order('join_date', { ascending: false });
    setUsers(data || []);
    setLoading(false);
  }

  async function deleteUser(id: string) {
    if (!confirm('Tem certeza que quer excluir este usuário? Esta ação é irreversível.')) return;
    setDeleting(id);
    const { error } = await supabase.from('profiles').delete().eq('id', id);
    if (error) { toast('Erro ao excluir usuário', 'error'); }
    else { toast('Usuário excluído', 'success'); loadUsers(); }
    setDeleting(null);
  }

  const filtered = users.filter(u =>
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-stone-800">Usuários</h2>
          <p className="text-sm text-stone-500">{users.length} cadastrados</p>
        </div>
      </div>

      <input
        type="text"
        placeholder="Buscar por nome ou email..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
      />

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-stone-400 py-12 text-sm">Nenhum usuário encontrado</p>
      ) : (
        <div className="space-y-2">
          {filtered.map(user => (
            <div key={user.id} className="bg-white rounded-2xl border border-stone-100 p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {(user.name || user.email || '?')[0].toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-stone-800 text-sm truncate">{user.name || 'Sem nome'}</p>
                  <p className="text-xs text-stone-400 truncate">{user.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">{user.points || 0} pts</span>
                    <span className="text-xs text-stone-400">🔥 {user.streak || 0} dias</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => deleteUser(user.id)}
                disabled={deleting === user.id}
                className="p-2 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors flex-shrink-0"
              >
                {deleting === user.id
                  ? <div className="w-4 h-4 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
                  : <Trash2 size={16} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Trails Tab ───────────────────────────────────────────────────────────────

function TrailsTab({ toast }: { toast: (m: string, t: 'success' | 'error') => void }) {
  const [trails, setTrails] = useState<Trail[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTrail, setExpandedTrail] = useState<string | null>(null);
  const [trailDays, setTrailDays] = useState<Record<string, TrailDay[]>>({});
  const [editingTrail, setEditingTrail] = useState<Trail | null>(null);
  const [editingDay, setEditingDay] = useState<TrailDay | null>(null);
  const [saving, setSaving] = useState(false);
  const [showNewTrail, setShowNewTrail] = useState(false);
  const [newTrail, setNewTrail] = useState({ slug: '', title: '', description: '', duration_days: 7, category: 'espiritualidade', emoji: '📖', is_premium: false });

  useEffect(() => { loadTrails(); }, []);

  async function loadTrails() {
    setLoading(true);
    const { data } = await supabase.from('trails').select('*').order('order_index');
    setTrails(data || []);
    setLoading(false);
  }

  async function loadDays(trailId: string) {
    if (trailDays[trailId]) return;
    const { data } = await supabase.from('trail_days').select('*').eq('trail_id', trailId).order('day_number');
    setTrailDays(prev => ({ ...prev, [trailId]: data || [] }));
  }

  async function toggleTrail(id: string) {
    if (expandedTrail === id) { setExpandedTrail(null); return; }
    setExpandedTrail(id);
    await loadDays(id);
  }

  async function saveTrail() {
    if (!editingTrail) return;
    setSaving(true);
    const { error } = await supabase.from('trails').update({
      title: editingTrail.title,
      description: editingTrail.description,
      emoji: editingTrail.emoji,
      is_premium: editingTrail.is_premium,
      is_active: editingTrail.is_active,
      category: editingTrail.category,
    }).eq('id', editingTrail.id);
    setSaving(false);
    if (error) toast('Erro ao salvar trilha', 'error');
    else { toast('Trilha salva!', 'success'); setEditingTrail(null); loadTrails(); }
  }

  async function saveDay() {
    if (!editingDay) return;
    setSaving(true);
    const { error } = await supabase.from('trail_days').update({
      title: editingDay.title,
      reading: editingDay.reading,
      reflection: editingDay.reflection,
      verse: editingDay.verse,
      verse_reference: editingDay.verse_reference,
      practice: editingDay.practice,
      emoji: editingDay.emoji,
    }).eq('id', editingDay.id);
    setSaving(false);
    if (error) toast('Erro ao salvar dia', 'error');
    else {
      toast('Dia salvo!', 'success');
      setTrailDays(prev => ({
        ...prev,
        [editingDay.trail_id]: prev[editingDay.trail_id].map(d => d.id === editingDay.id ? editingDay : d)
      }));
      setEditingDay(null);
    }
  }

  async function createTrail() {
    setSaving(true);
    const { error } = await supabase.from('trails').insert([{ ...newTrail, is_active: true, order_index: trails.length + 1 }]);
    setSaving(false);
    if (error) toast('Erro ao criar trilha: ' + error.message, 'error');
    else { toast('Trilha criada!', 'success'); setShowNewTrail(false); setNewTrail({ slug: '', title: '', description: '', duration_days: 7, category: 'espiritualidade', emoji: '📖', is_premium: false }); loadTrails(); }
  }

  async function deleteTrail(id: string) {
    if (!confirm('Excluir esta trilha e todos os seus dias?')) return;
    const { error } = await supabase.from('trails').delete().eq('id', id);
    if (error) toast('Erro ao excluir', 'error');
    else { toast('Trilha excluída', 'success'); loadTrails(); }
  }

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-stone-800">Trilhas</h2>
          <p className="text-sm text-stone-500">{trails.length} trilhas cadastradas</p>
        </div>
        <button onClick={() => setShowNewTrail(true)} className="flex items-center gap-1.5 bg-amber-500 text-white text-sm font-semibold px-3 py-2 rounded-xl hover:bg-amber-600 transition-colors">
          <Plus size={15} /> Nova
        </button>
      </div>

      {/* Nova trilha */}
      {showNewTrail && (
        <div className="bg-white rounded-2xl border-2 border-amber-300 p-4 space-y-3">
          <h3 className="font-bold text-stone-800 text-sm">Nova Trilha</h3>
          {[
            { label: 'Emoji', key: 'emoji', placeholder: '📖' },
            { label: 'Slug (único)', key: 'slug', placeholder: 'minha-trilha' },
            { label: 'Título', key: 'title', placeholder: 'Título da trilha' },
            { label: 'Descrição', key: 'description', placeholder: 'Descrição breve...' },
          ].map(({ label, key, placeholder }) => (
            <div key={key}>
              <label className="text-xs font-semibold text-stone-500 mb-1 block">{label}</label>
              <input value={(newTrail as any)[key]} onChange={e => setNewTrail(p => ({ ...p, [key]: e.target.value }))}
                placeholder={placeholder}
                className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
            </div>
          ))}
          <div className="flex gap-2">
            <button onClick={createTrail} disabled={saving} className="flex-1 bg-amber-500 text-white text-sm font-bold py-2 rounded-xl hover:bg-amber-600 disabled:opacity-50">
              {saving ? 'Salvando...' : 'Criar Trilha'}
            </button>
            <button onClick={() => setShowNewTrail(false)} className="px-4 py-2 text-stone-500 text-sm font-semibold rounded-xl hover:bg-stone-100">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de trilhas */}
      {trails.map(trail => (
        <div key={trail.id} className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
          {/* Cabeçalho da trilha */}
          <div className="flex items-center gap-3 p-4">
            <span className="text-2xl">{trail.emoji}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-stone-800 text-sm truncate">{trail.title}</p>
                {!trail.is_active && <span className="text-xs bg-stone-100 text-stone-400 px-2 py-0.5 rounded-full">Inativa</span>}
                {trail.is_premium && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Premium</span>}
              </div>
              <p className="text-xs text-stone-400">{trail.duration_days} dias · {trail.category}</p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setEditingTrail(trail)} className="p-2 text-stone-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-colors">
                <Edit3 size={15} />
              </button>
              <button onClick={() => deleteTrail(trail.id)} className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors">
                <Trash2 size={15} />
              </button>
              <button onClick={() => toggleTrail(trail.id)} className="p-2 text-stone-400 hover:text-stone-700 rounded-xl transition-colors">
                {expandedTrail === trail.id ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
              </button>
            </div>
          </div>

          {/* Dias da trilha */}
          {expandedTrail === trail.id && (
            <div className="border-t border-stone-100 bg-stone-50/50">
              {(trailDays[trail.id] || []).map(day => (
                <div key={day.id} className="flex items-center gap-3 px-4 py-3 border-b border-stone-100 last:border-0">
                  <span className="text-base">{day.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-stone-700">Dia {day.day_number} · {day.title}</p>
                    <p className="text-xs text-stone-400 truncate">{day.verse_reference} — "{day.verse.substring(0, 50)}..."</p>
                  </div>
                  <button onClick={() => setEditingDay({ ...day })} className="p-1.5 text-stone-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors">
                    <Edit3 size={14} />
                  </button>
                </div>
              ))}
              {(trailDays[trail.id] || []).length === 0 && (
                <p className="text-center text-stone-400 text-xs py-4">Nenhum dia cadastrado ainda</p>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Modal editar trilha */}
      {editingTrail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-stone-800">Editar Trilha</h3>
              <button onClick={() => setEditingTrail(null)} className="p-1 text-stone-400 hover:text-stone-700"><X size={18} /></button>
            </div>
            {[
              { label: 'Título', key: 'title' },
              { label: 'Emoji', key: 'emoji' },
              { label: 'Categoria', key: 'category' },
              { label: 'Descrição', key: 'description' },
            ].map(({ label, key }) => (
              <div key={key}>
                <label className="text-xs font-semibold text-stone-500 mb-1 block">{label}</label>
                <input value={(editingTrail as any)[key]} onChange={e => setEditingTrail(p => p ? { ...p, [key]: e.target.value } : p)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
              </div>
            ))}
            <div className="flex gap-3 pt-1">
              <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
                <input type="checkbox" checked={editingTrail.is_active} onChange={e => setEditingTrail(p => p ? { ...p, is_active: e.target.checked } : p)} className="rounded" />
                Ativa
              </label>
              <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer">
                <input type="checkbox" checked={editingTrail.is_premium} onChange={e => setEditingTrail(p => p ? { ...p, is_premium: e.target.checked } : p)} className="rounded" />
                Premium
              </label>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={saveTrail} disabled={saving} className="flex-1 bg-amber-500 text-white font-bold py-2.5 rounded-xl hover:bg-amber-600 disabled:opacity-50 text-sm">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
              <button onClick={() => setEditingTrail(null)} className="px-4 py-2.5 text-stone-500 font-semibold rounded-xl hover:bg-stone-100 text-sm">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal editar dia */}
      {editingDay && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-stone-800">Dia {editingDay.day_number} — {editingDay.title}</h3>
              <button onClick={() => setEditingDay(null)} className="p-1 text-stone-400 hover:text-stone-700"><X size={18} /></button>
            </div>
            {[
              { label: 'Título', key: 'title', multiline: false },
              { label: 'Emoji', key: 'emoji', multiline: false },
              { label: 'Leitura (ex: Salmo 23)', key: 'reading', multiline: false },
              { label: 'Versículo', key: 'verse', multiline: true },
              { label: 'Referência (ex: João 3,16)', key: 'verse_reference', multiline: false },
              { label: 'Reflexão', key: 'reflection', multiline: true },
              { label: 'Prática (opcional)', key: 'practice', multiline: true },
            ].map(({ label, key, multiline }) => (
              <div key={key}>
                <label className="text-xs font-semibold text-stone-500 mb-1 block">{label}</label>
                {multiline ? (
                  <textarea rows={3} value={(editingDay as any)[key] || ''} onChange={e => setEditingDay(p => p ? { ...p, [key]: e.target.value } : p)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
                ) : (
                  <input value={(editingDay as any)[key] || ''} onChange={e => setEditingDay(p => p ? { ...p, [key]: e.target.value } : p)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
                )}
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <button onClick={saveDay} disabled={saving} className="flex-1 bg-amber-500 text-white font-bold py-2.5 rounded-xl hover:bg-amber-600 disabled:opacity-50 text-sm">
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
              <button onClick={() => setEditingDay(null)} className="px-4 py-2.5 text-stone-500 font-semibold rounded-xl hover:bg-stone-100 text-sm">
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Notifications Tab ────────────────────────────────────────────────────────

function NotificationsTab({ toast }: { toast: (m: string, t: 'success' | 'error') => void }) {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [history, setHistory] = useState<{ title: string; message: string; sent_at: string }[]>([]);

  // Carrega histórico do localStorage
  useEffect(() => {
    const saved = localStorage.getItem('admin_notifications');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  async function sendNotification() {
    if (!title.trim() || !message.trim()) { toast('Preencha título e mensagem', 'error'); return; }
    setSending(true);

    // Salva na tabela de notificações (se existir) ou no localStorage como log
    const entry = { title, message, sent_at: new Date().toISOString() };
    const updated = [entry, ...history];
    setHistory(updated);
    localStorage.setItem('admin_notifications', JSON.stringify(updated.slice(0, 20)));

    // Aqui você pode integrar com um serviço de push notifications real
    // Por ora, registra o envio com sucesso
    setTimeout(() => {
      setSending(false);
      toast(`Notificação "${title}" registrada para envio`, 'success');
      setTitle('');
      setMessage('');
    }, 800);
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-stone-800">Notificações</h2>
        <p className="text-sm text-stone-500">Envie mensagens para todos os usuários</p>
      </div>

      <div className="bg-white rounded-2xl border border-stone-100 p-4 space-y-3">
        <div>
          <label className="text-xs font-semibold text-stone-500 mb-1 block">Título</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Ex: Nova trilha disponível!"
            className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400" />
        </div>
        <div>
          <label className="text-xs font-semibold text-stone-500 mb-1 block">Mensagem</label>
          <textarea rows={4} value={message} onChange={e => setMessage(e.target.value)} placeholder="Escreva a mensagem para os usuários..."
            className="w-full px-3 py-2.5 rounded-xl border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none" />
        </div>
        <button onClick={sendNotification} disabled={sending}
          className="w-full flex items-center justify-center gap-2 bg-amber-500 text-white font-bold py-2.5 rounded-xl hover:bg-amber-600 disabled:opacity-50 transition-colors text-sm">
          {sending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send size={15} />}
          {sending ? 'Enviando...' : 'Enviar para todos'}
        </button>
      </div>

      {history.length > 0 && (
        <div>
          <h3 className="text-sm font-bold text-stone-700 mb-2">Histórico</h3>
          <div className="space-y-2">
            {history.map((n, i) => (
              <div key={i} className="bg-white rounded-xl border border-stone-100 p-3">
                <div className="flex justify-between items-start">
                  <p className="font-semibold text-stone-800 text-sm">{n.title}</p>
                  <span className="text-xs text-stone-400">{new Date(n.sent_at).toLocaleDateString('pt-BR')}</span>
                </div>
                <p className="text-xs text-stone-500 mt-1">{n.message}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Admin Component ─────────────────────────────────────────────────────

export default function Admin({ onExit }: { onExit: () => void }) {
  const [tab, setTab] = useState<Tab>('dashboard');
  const [stats, setStats] = useState({ users: 0, trails: 0, progress: 0 });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => { loadStats(); }, []);

  async function loadStats() {
    const [{ count: users }, { count: trails }, { count: progress }] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('trails').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('user_trail_progress').select('*', { count: 'exact', head: true }),
    ]);
    setStats({ users: users || 0, trails: trails || 0, progress: progress || 0 });
  }

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
  }

  const tabs: { id: Tab; label: string; icon: ElementType }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart2 },
    { id: 'users', label: 'Usuários', icon: Users },
    { id: 'trails', label: 'Trilhas', icon: BookOpen },
    { id: 'notifications', label: 'Notificações', icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-stone-50">
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="bg-white border-b border-stone-200 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-amber-500 rounded-lg flex items-center justify-center">
              <Shield size={14} className="text-white" />
            </div>
            <span className="font-black text-stone-800">Admin</span>
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-semibold">Versiculando</span>
          </div>
          <button onClick={onExit} className="flex items-center gap-1.5 text-xs text-stone-400 hover:text-stone-700 px-3 py-1.5 rounded-xl hover:bg-stone-100 transition-colors font-semibold">
            <LogOut size={13} /> Sair
          </button>
        </div>

        {/* Tabs */}
        <div className="max-w-2xl mx-auto px-4 flex gap-1 pb-2 overflow-x-auto">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors ${tab === id ? 'bg-amber-500 text-white' : 'text-stone-500 hover:bg-stone-100'}`}>
              <Icon size={13} /> {label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-5 pb-20">
        {tab === 'dashboard' && <DashboardTab stats={stats} />}
        {tab === 'users' && <UsersTab toast={showToast} />}
        {tab === 'trails' && <TrailsTab toast={showToast} />}
        {tab === 'notifications' && <NotificationsTab toast={showToast} />}
      </div>
    </div>
  );
}
