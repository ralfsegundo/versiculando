import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useGamification, AVATARS } from '../services/gamification';
import { Users, Search, UserPlus, Check, X, UserMinus, Clock, Activity, Trophy, BookOpen, Heart, ThumbsUp, ChevronLeft, Send, LogOut, Crown, Trash2, BarChart2, Plus, Pin, Edit2, Target, MessageSquare, Smile, Paperclip, Link as LinkIcon, ExternalLink, FileSpreadsheet, FileText, Youtube, HelpCircle } from 'lucide-react';
import { sharingService, Connection } from '../services/sharingService';
import { motion } from 'motion/react';
import { BIBLE_BOOKS, BEGINNER_PATH } from '../constants';
import { supabase } from '../lib/supabase';

// Group Types
interface GroupMember {
  email: string;
  name: string;
  avatarId: string;
  avatarUrl?: string;
  progress: number;
  isLeader?: boolean;
}

interface PollOption {
  id: string;
  text: string;
  votes: string[]; // user emails
}

interface Reaction {
  emoji: string;
  users: string[]; // user emails
}

interface QuestionBoxAnswer {
  userEmail: string;
  userName: string;
  avatarId: string;
  text: string;
  timestamp: string;
}

interface GroupMessage {
  id: number;
  user: string;
  userEmail: string;
  avatarId: string;
  avatarUrl?: string;
  text: string;
  timestamp: string;     // ISO 8601 — sempre salvo como new Date().toISOString()
  type?: 'text' | 'poll' | 'verse' | 'goal' | 'question_box' | 'member_reply';
  poll?: {
    question: string;
    options: PollOption[];
  };
  questionBox?: {
    question: string;
    answers: QuestionBoxAnswer[];
  };
  replyToId?: number;    // id da mensagem que está respondendo (para member_reply)
  isPinned?: boolean;
  reactions?: Reaction[];
}

interface GroupMaterial {
  id: string;
  title: string;
  url: string;
  type: 'document' | 'spreadsheet' | 'pdf' | 'link' | 'video';
}

interface Group {
  id: string;
  name: string;
  targetId: string; // book.id or path.id
  targetName: string;
  members: GroupMember[];
  messages: GroupMessage[];
  materials?: GroupMaterial[];
}

export default function Community() {
  const { profile } = useGamification();
  const [connections, setConnections] = useState<Connection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingConnections, setIsLoadingConnections] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [activeTab, setActiveTab] = useState<'feed' | 'ranking' | 'groups' | 'prayers' | 'friends'>('groups');
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const [tabsScroll, setTabsScroll] = useState({ left: false, right: true });

  // Toast notifications
  const [toasts, setToasts] = useState<{ id: number; message: string; type: 'success' | 'info' | 'error' }[]>([]);
  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };

  // Debounced search
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTabsScroll = () => {
    const el = tabsScrollRef.current;
    if (!el) return;
    setTabsScroll({
      left: el.scrollLeft > 8,
      right: el.scrollLeft < el.scrollWidth - el.clientWidth - 8,
    });
  };

  // Modals state
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupTarget, setNewGroupTarget] = useState('');
  const [newGroupInvites, setNewGroupInvites] = useState<string[]>([]);
  const [isCreatingPrayer, setIsCreatingPrayer] = useState(false);
  const [newPrayerRequest, setNewPrayerRequest] = useState('');

  // Active Group State
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);
  const [groupSubTab, setGroupSubTab] = useState<'mural' | 'membros' | 'materiais'>('mural');
  const [newMessage, setNewMessage] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteModalSelected, setInviteModalSelected] = useState<string[]>([]);
  const [postType, setPostType] = useState<'text' | 'verse' | 'goal'>('text');
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [showReactionMenu, setShowReactionMenu] = useState<number | null>(null);
  const [showReactionDetails, setShowReactionDetails] = useState<{ messageId: number, emoji: string } | null>(null);

  // Member reply state (non-admins can reply to specific messages)
  const [replyingToId, setReplyingToId] = useState<number | null>(null);
  const [memberReplyText, setMemberReplyText] = useState('');

  // Mural scroll ref — auto-scroll to bottom on new message
  const muralScrollRef = useRef<HTMLDivElement>(null);
  const scrollMuralToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    setTimeout(() => {
      if (muralScrollRef.current) {
        muralScrollRef.current.scrollTop = muralScrollRef.current.scrollHeight;
      }
    }, 50);
  }, []);

  // Poll State
  const [isCreatingPoll, setIsCreatingPoll] = useState(false);
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  // Question Box State
  const [isCreatingQuestionBox, setIsCreatingQuestionBox] = useState(false);
  const [questionBoxText, setQuestionBoxText] = useState('');
  const [questionBoxAnswers, setQuestionBoxAnswers] = useState<Record<number, string>>({});

  // Materials State
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);
  const [materialTitle, setMaterialTitle] = useState('');
  const [materialUrl, setMaterialUrl] = useState('');

  // Generic Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText: string;
    confirmColor: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirmar',
    confirmColor: 'bg-rose-700 hover:bg-rose-800',
    onConfirm: () => {}
  });

  // ── Estado real (Supabase) ────────────────────────────────
  const [mockFeed, setMockFeed] = useState<{ id: number; user: string; avatarId: string; action: string; time: string }[]>([]);
  const [mockRankingData, setMockRankingData] = useState<{ id: string; name: string; avatarId: string; avatarUrl?: string; points: number; position: number }[]>([]);
  const [mockGroups, setMockGroups] = useState<Group[]>([]);
  const [mockGroupInvites, setMockGroupInvites] = useState<{ id: string; groupId: string; groupName: string; targetName: string; from: string; fromAvatarId: string }[]>([]);
  const [mockPrayers, setMockPrayers] = useState<{ id: string; user: string; userId: string; avatarId: string; avatarUrl?: string; request: string; prayedCount: number; hasPrayed: boolean }[]>([]);
  const [isLoadingCommunity, setIsLoadingCommunity] = useState(false);

  // Alias para compatibilidade com renderização do ranking
  const mockRanking = mockRankingData;

  // ── Carregamento de dados ─────────────────────────────────
  const loadCommunityData = async () => {
    if (!profile.email) return;
    setIsLoadingCommunity(true);

    // Timeout de segurança — nunca trava o loading indefinidamente
    const timeoutId = setTimeout(() => setIsLoadingCommunity(false), 8000);

    try {
      // Cada função tem seu próprio try/catch — uma falha não bloqueia as outras
      await Promise.allSettled([
        loadFeed(),
        loadRanking(),
        loadGroups(),
        loadGroupInvites(),
        loadPrayers(),
      ]);
    } finally {
      clearTimeout(timeoutId);
      setIsLoadingCommunity(false);
    }
  };

  const loadFeed = async () => {
    try {
      const { data, error } = await supabase
        .from('community_feed')
        .select('id, user_name, avatar_id, action, created_at')
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) { console.warn('[Community] loadFeed error:', error.message); return; }
      if (data) {
        setMockFeed(data.map((r: any) => ({
          id: r.id,
          user: r.user_name,
          avatarId: r.avatar_id,
          action: r.action,
          time: formatRelativeTime(r.created_at),
        })));
      }
    } catch (e) { console.warn('[Community] loadFeed exception:', e); }
  };

  const loadRanking = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, name, avatar_id, avatar_url, points')
        .order('points', { ascending: false })
        .limit(20);
      if (error) { console.warn('[Community] loadRanking error:', error.message); return; }
      if (data) {
        setMockRankingData(data.map((u: any, i: number) => ({
          id: u.id,
          name: u.name || 'Usuário',
          avatarId: u.avatar_id || '',
          avatarUrl: u.avatar_url,
          points: u.points || 0,
          position: i + 1,
        })));
      }
    } catch (e) { console.warn('[Community] loadRanking exception:', e); }
  };

  const loadGroups = async () => {
    if (!profile.email) return;
    try {
      // Filtra no servidor: grupos onde o array JSON de members contém o email do usuário
      const { data, error } = await supabase
        .from('community_groups')
        .select('id, name, target_id, target_name, members, messages, materials')
        .contains('members', JSON.stringify([{ email: profile.email }]))
        .order('created_at', { ascending: false });

      // Fallback: se o contains falhar (índice não configurado), faz o filtro no cliente
      if (error) {
        const { data: allData, error: allError } = await supabase
          .from('community_groups')
          .select('id, name, target_id, target_name, members, messages, materials')
          .order('created_at', { ascending: false });
        if (allError) { console.warn('[Community] loadGroups error:', allError.message); return; }
        const myGroups = (allData || []).filter((g: any) =>
          Array.isArray(g.members) && g.members.some((m: any) => m.email === profile.email)
        );
        setMockGroups(myGroups.map((g: any) => ({
          id: g.id, name: g.name, targetId: g.target_id, targetName: g.target_name,
          members: g.members || [], messages: g.messages || [], materials: g.materials || [],
        })));
        return;
      }

      if (data) {
        // Double-check no cliente por segurança (contains pode retornar falsos positivos)
        const myGroups = data.filter((g: any) =>
          Array.isArray(g.members) && g.members.some((m: any) => m.email === profile.email)
        );
        setMockGroups(myGroups.map((g: any) => ({
          id: g.id, name: g.name, targetId: g.target_id, targetName: g.target_name,
          members: g.members || [], messages: g.messages || [], materials: g.materials || [],
        })));
      }
    } catch (e) { console.warn('[Community] loadGroups exception:', e); }
  };

  const loadGroupInvites = async () => {
    if (!profile.email) return;
    try {
      const { data, error } = await supabase
        .from('community_group_invites')
        .select('id, group_id, group_name, target_name, from_name, from_avatar_id')
        .eq('to_email', profile.email)
        .eq('status', 'pending');
      if (error) { console.warn('[Community] loadGroupInvites error:', error.message); return; }
      if (data) {
        setMockGroupInvites(data.map((i: any) => ({
          id: i.id,
          groupId: i.group_id,
          groupName: i.group_name,
          targetName: i.target_name,
          from: i.from_name,
          fromAvatarId: i.from_avatar_id,
        })));
      }
    } catch (e) { console.warn('[Community] loadGroupInvites exception:', e); }
  };

  const loadPrayers = async () => {
    try {
      const { data: prayers, error: prayersError } = await supabase
        .from('community_prayers')
        .select('id, user_name, user_id, avatar_id, avatar_url, request, prayed_count')
        .order('created_at', { ascending: false })
        .limit(50);
      if (prayersError) { console.warn('[Community] loadPrayers error:', prayersError.message); return; }
      if (!prayers) return;

      const { data: myPrayers } = await supabase
        .from('community_prayer_votes')
        .select('prayer_id')
        .eq('user_email', profile.email || '');

      const prayedSet = new Set((myPrayers || []).map((p: any) => p.prayer_id));

      setMockPrayers(prayers.map((p: any) => ({
        id: p.id,
        user: p.user_name,
        userId: p.user_id,
        avatarId: p.avatar_id || '',
        avatarUrl: p.avatar_url,
        request: p.request,
        prayedCount: p.prayed_count || 0,
        hasPrayed: prayedSet.has(p.id),
      })));
    } catch (e) { console.warn('[Community] loadPrayers exception:', e); }
  };

  const formatRelativeTime = (isoString: string) => {
    if (!isoString) return '';
    const diff = Date.now() - new Date(isoString).getTime();
    if (diff < 0) return 'Agora mesmo';
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'Agora mesmo';
    if (m < 60) return `há ${m}min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `há ${h}h`;
    const d = Math.floor(h / 24);
    if (d < 7) return `há ${d} dia${d > 1 ? 's' : ''}`;
    return new Date(isoString).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
  };

  // Calcula o progresso REAL de um membro para o livro/trilha alvo do grupo
  const calculateMemberProgress = useCallback((memberEmail: string, targetId: string): number => {
    // Tenta buscar do perfil local se for o próprio usuário
    if (memberEmail === profile.email) {
      if (targetId === 'beginner') {
        const total = BEGINNER_PATH.length;
        const done = profile.completedBooks.filter(id => BEGINNER_PATH.includes(id)).length;
        return total === 0 ? 0 : Math.round((done / total) * 100);
      }
      return profile.completedBooks.includes(targetId) ? 100 : 0;
    }
    // Para outros membros, retorna o progress salvo no grupo (atualizado quando eles entram/completam)
    return 0;
  }, [profile.completedBooks, profile.email]);

  // Calcula progresso coletivo real: média dos membros que já têm dado registrado
  const calculateGroupProgress = useCallback((members: GroupMember[], targetId: string): number => {
    if (members.length === 0) return 0;
    const values = members.map(m =>
      m.email === profile.email ? calculateMemberProgress(m.email, targetId) : m.progress
    );
    // Inclui só quem tem dado real (>0) ou é o próprio usuário
    const activeValues = values.filter((v, i) => v > 0 || members[i].email === profile.email);
    if (activeValues.length === 0) return 0;
    return Math.round(activeValues.reduce((a, b) => a + b, 0) / activeValues.length);
  }, [calculateMemberProgress, profile.email]);

  const addToFeed = async (action: string) => {
    if (!profile.email) return;
    await supabase.from('community_feed').insert({
      user_name: profile.name,
      user_email: profile.email,
      avatar_id: profile.avatarId || '',
      action,
    });
    await loadFeed();
  };
  // ── Helper: persiste grupo no Supabase ──────────────────
  const persistGroup = async (group: Group) => {
    await supabase
      .from('community_groups')
      .update({
        members: group.members,
        messages: group.messages,
        materials: group.materials || [],
      })
      .eq('id', group.id);
  };

  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !newGroupTarget || !profile.email) return;
    const targetName = newGroupTarget === 'beginner' ? 'Trilha do Discípulo' :
                       BIBLE_BOOKS.find(b => b.id === newGroupTarget)?.name || 'Estudo';

    const { data, error } = await supabase.from('community_groups').insert({
      name: newGroupName,
      target_id: newGroupTarget,
      target_name: targetName,
      members: [{ email: profile.email, name: profile.name, avatarId: profile.avatarId, avatarUrl: profile.avatarUrl, progress: 0, isLeader: true }],
      messages: [],
      materials: [],
      created_by: profile.email,
    }).select().single();

    if (!error && data) {
      const newGroup: Group = {
        id: data.id,
        name: data.name,
        targetId: data.target_id,
        targetName: data.target_name,
        members: data.members,
        messages: data.messages,
        materials: data.materials,
      };
      setMockGroups(prev => [newGroup, ...prev]);
      await addToFeed(`criou o grupo "${newGroupName}"`);

      // Enviar convites
      if (newGroupInvites.length > 0) {
        const invites = newGroupInvites.map(email => ({
          group_id: data.id,
          group_name: newGroupName,
          target_name: targetName,
          from_email: profile.email,
          from_name: profile.name,
          from_avatar_id: profile.avatarId || '',
          to_email: email,
          status: 'pending',
        }));
        await supabase.from('community_group_invites').insert(invites);
        showToast(`Convites enviados para ${newGroupInvites.length} amigo(s)! 🎉`);
      }
    }

    setNewGroupName('');
    setNewGroupTarget('');
    setNewGroupInvites([]);
    setIsCreatingGroup(false);
  };

  const handleAcceptGroupInvite = async (inviteId: string) => {
    const invite = mockGroupInvites.find(i => i.id === inviteId);
    if (!invite || !profile.email) return;
    await supabase.from('community_group_invites').update({ status: 'accepted' }).eq('id', inviteId);
    // Fetch group by ID (not name) to avoid collision with same-name groups
    const { data: groupData } = await supabase
      .from('community_groups')
      .select('*')
      .eq('id', invite.groupId)
      .single();
    if (groupData) {
      const alreadyMember = (groupData.members || []).some((m: any) => m.email === profile.email);
      if (!alreadyMember) {
        const updatedMembers = [...(groupData.members || []),
          { email: profile.email, name: profile.name, avatarId: profile.avatarId, avatarUrl: profile.avatarUrl, progress: 0 }
        ];
        await supabase.from('community_groups').update({ members: updatedMembers }).eq('id', groupData.id);
      }
    }
    setMockGroupInvites(prev => prev.filter(i => i.id !== inviteId));
    await loadGroups();
    showToast('Você entrou no grupo! 🎉', 'success');
  };

  const handleRejectGroupInvite = async (inviteId: string) => {
    await supabase.from('community_group_invites').update({ status: 'rejected' }).eq('id', inviteId);
    setMockGroupInvites(prev => prev.filter(i => i.id !== inviteId));
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !activeGroup) return;
    // Guard: only admins can post non-reply messages
    const isAdmin = activeGroup.members.find(m => m.email === profile.email)?.isLeader === true;
    if (!isAdmin) return;

    let updatedMessages = [...activeGroup.messages];

    if (editingMessageId) {
      updatedMessages = updatedMessages.map(msg => {
        if (msg.id !== editingMessageId) return msg;
        if (msg.type === 'poll' || msg.type === 'question_box') return msg;
        return { ...msg, text: newMessage, type: postType };
      });
    } else {
      updatedMessages.push({
        id: Date.now(),
        user: profile.name,
        userEmail: profile.email || 'me',
        avatarId: profile.avatarId || '',
        avatarUrl: profile.avatarUrl,
        text: newMessage,
        timestamp: new Date().toISOString(),   // ← ISO, não toLocaleTimeString
        type: postType,
      });
    }

    const updatedGroup = { ...activeGroup, messages: updatedMessages };
    setActiveGroup(updatedGroup);
    setMockGroups(prev => prev.map(g => g.id === updatedGroup.id ? updatedGroup : g));
    await persistGroup(updatedGroup);
    setNewMessage('');
    setEditingMessageId(null);
    setPostType('text');
    scrollMuralToBottom();
  };

  // Membros (não-admin) podem deixar uma reply em qualquer mensagem
  const handleMemberReply = async () => {
    if (!memberReplyText.trim() || !activeGroup || replyingToId === null) return;
    const replyMsg: GroupMessage = {
      id: Date.now(),
      user: profile.name,
      userEmail: profile.email || 'me',
      avatarId: profile.avatarId || '',
      avatarUrl: profile.avatarUrl,
      text: memberReplyText.trim(),
      timestamp: new Date().toISOString(),
      type: 'member_reply',
      replyToId: replyingToId,
    };
    const updatedGroup = { ...activeGroup, messages: [...activeGroup.messages, replyMsg] };
    setActiveGroup(updatedGroup);
    setMockGroups(prev => prev.map(g => g.id === updatedGroup.id ? updatedGroup : g));
    await persistGroup(updatedGroup);
    setMemberReplyText('');
    setReplyingToId(null);
    scrollMuralToBottom();
  };

  const handleEditMessageClick = (msg: GroupMessage) => {
    setNewMessage(msg.text);
    setPostType(msg.type === 'verse' || msg.type === 'goal' ? msg.type : 'text');
    setEditingMessageId(msg.id);
  };

  const handlePinMessage = async (messageId: number) => {
    if (!activeGroup) return;
    const updatedMessages = activeGroup.messages.map(msg =>
      msg.id === messageId ? { ...msg, isPinned: !msg.isPinned } : msg
    );
    const updatedGroup = { ...activeGroup, messages: updatedMessages };
    setActiveGroup(updatedGroup);
    setMockGroups(prev => prev.map(g => g.id === updatedGroup.id ? updatedGroup : g));
    await persistGroup(updatedGroup);
  };

  const handleReact = async (messageId: number, emoji: string) => {
    if (!activeGroup) return;
    const userEmail = profile.email || 'me';
    const updatedMessages = activeGroup.messages.map(msg => {
      if (msg.id === messageId) {
        const reactions = msg.reactions || [];
        const currentEmojiIndex = reactions.findIndex(r => r.users.includes(userEmail));
        const isSameEmoji = currentEmojiIndex >= 0 && reactions[currentEmojiIndex].emoji === emoji;
        let newReactions = reactions
          .map(r => ({ ...r, users: r.users.filter(u => u !== userEmail) }))
          .filter(r => r.users.length > 0);
        if (!isSameEmoji) {
          const targetIndex = newReactions.findIndex(r => r.emoji === emoji);
          if (targetIndex >= 0) {
            newReactions[targetIndex] = { ...newReactions[targetIndex], users: [...newReactions[targetIndex].users, userEmail] };
          } else {
            newReactions.push({ emoji, users: [userEmail] });
          }
        }
        return { ...msg, reactions: newReactions };
      }
      return msg;
    });
    const updatedGroup = { ...activeGroup, messages: updatedMessages };
    setActiveGroup(updatedGroup);
    setMockGroups(prev => prev.map(g => g.id === updatedGroup.id ? updatedGroup : g));
    await persistGroup(updatedGroup);
    setShowReactionMenu(null);
  };

  const handleCreatePoll = async () => {
    if (!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2 || !activeGroup) return;
    const validOptions = pollOptions.filter(o => o.trim()).map((opt, idx) => ({
      id: `opt_${Date.now()}_${idx}`,
      text: opt.trim(),
      votes: []
    }));
    const updatedGroup = {
      ...activeGroup,
      messages: [...activeGroup.messages, {
        id: Date.now(),
        user: profile.name,
        userEmail: profile.email || 'me',
        avatarId: profile.avatarId,
        avatarUrl: profile.avatarUrl,
        text: '',
        timestamp: new Date().toISOString(),
        type: 'poll' as const,
        poll: { question: pollQuestion.trim(), options: validOptions }
      }]
    };
    setActiveGroup(updatedGroup);
    setMockGroups(prev => prev.map(g => g.id === updatedGroup.id ? updatedGroup : g));
    await persistGroup(updatedGroup);
    setIsCreatingPoll(false);
    setPollQuestion('');
    setPollOptions(['', '']);
  };

  const handleAddMaterial = async () => {
    if (!materialTitle.trim() || !materialUrl.trim() || !activeGroup) return;
    let finalUrl = materialUrl.trim();
    if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
      finalUrl = 'https://' + finalUrl;
    }
    const detectMaterialType = (url: string) => {
      if (url.includes('docs.google.com/spreadsheets')) return 'spreadsheet';
      if (url.includes('docs.google.com/document')) return 'document';
      if (url.endsWith('.pdf')) return 'pdf';
      if (url.includes('youtube.com') || url.includes('youtu.be')) return 'video';
      return 'link';
    };
    const newMaterial: GroupMaterial = {
      id: `mat_${Date.now()}`,
      title: materialTitle.trim(),
      url: finalUrl,
      type: detectMaterialType(finalUrl)
    };
    const alertMessage: GroupMessage = {
      id: Date.now(),
      user: profile.name,
      userEmail: profile.email || 'me',
      avatarId: profile.avatarId,
      avatarUrl: profile.avatarUrl,
      text: `📚 Novo material de apoio adicionado: "${materialTitle.trim()}". Confira na seção de Materiais de Apoio!`,
      timestamp: new Date().toISOString(),
      type: 'text',
      isPinned: false
    };
    const updatedGroup = {
      ...activeGroup,
      materials: [...(activeGroup.materials || []), newMaterial],
      messages: [...activeGroup.messages, alertMessage]
    };
    setActiveGroup(updatedGroup);
    setMockGroups(prev => prev.map(g => g.id === updatedGroup.id ? updatedGroup : g));
    await persistGroup(updatedGroup);
    setMaterialTitle('');
    setMaterialUrl('');
    setIsAddingMaterial(false);
  };

  const handleDeleteMaterial = (materialId: string) => {
    if (!activeGroup) return;
    const materialToDelete = activeGroup.materials?.find(m => m.id === materialId);
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Material',
      message: 'Tem certeza que deseja excluir este material de apoio?',
      confirmText: 'Excluir',
      confirmColor: 'bg-rose-700 hover:bg-rose-800',
      onConfirm: async () => {
        const updatedGroup = {
          ...activeGroup,
          materials: (activeGroup.materials || []).filter(m => m.id !== materialId),
          // Remove a mensagem de alerta pelo título exato do material deletado
          messages: activeGroup.messages.filter(msg =>
            !(materialToDelete && msg.text.includes(`"${materialToDelete.title}"`))
          ),
        };
        setActiveGroup(updatedGroup);
        setMockGroups(prev => prev.map(g => g.id === updatedGroup.id ? updatedGroup : g));
        await persistGroup(updatedGroup);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleVote = async (messageId: number, optionId: string) => {
    if (!activeGroup) return;
    const userEmail = profile.email || 'me';
    const updatedMessages = activeGroup.messages.map(msg => {
      if (msg.id === messageId && msg.type === 'poll' && msg.poll) {
        const alreadyVotedThis = msg.poll.options.find(opt => opt.id === optionId)?.votes.includes(userEmail);
        // Toggle: clicking the same option removes the vote
        const updatedOptions = msg.poll.options.map(opt => {
          if (opt.id === optionId) {
            return alreadyVotedThis
              ? { ...opt, votes: opt.votes.filter(v => v !== userEmail) } // unvote
              : { ...opt, votes: [...opt.votes.filter(v => v !== userEmail), userEmail] }; // vote
          }
          // Remove vote from other options (single choice)
          return { ...opt, votes: opt.votes.filter(v => v !== userEmail) };
        });
        return { ...msg, poll: { ...msg.poll, options: updatedOptions } };
      }
      return msg;
    });
    const updatedGroup = { ...activeGroup, messages: updatedMessages };
    setActiveGroup(updatedGroup);
    setMockGroups(prev => prev.map(g => g.id === updatedGroup.id ? updatedGroup : g));
    await persistGroup(updatedGroup);
  };

  const handleCreateQuestionBox = async () => {
    if (!questionBoxText.trim() || !activeGroup) return;
    const updatedGroup = {
      ...activeGroup,
      messages: [...activeGroup.messages, {
        id: Date.now(),
        user: profile.name,
        userEmail: profile.email || 'me',
        avatarId: profile.avatarId,
        avatarUrl: profile.avatarUrl,
        text: '',
        timestamp: new Date().toISOString(),
        type: 'question_box' as const,
        questionBox: { question: questionBoxText.trim(), answers: [] }
      }]
    };
    setActiveGroup(updatedGroup);
    setMockGroups(prev => prev.map(g => g.id === updatedGroup.id ? updatedGroup : g));
    await persistGroup(updatedGroup);
    setIsCreatingQuestionBox(false);
    setQuestionBoxText('');
  };

  const handleAnswerQuestionBox = async (messageId: number) => {
    if (!activeGroup) return;
    const answerText = questionBoxAnswers[messageId];
    if (!answerText || !answerText.trim()) return;
    const userEmail = profile.email || 'me';
    const updatedMessages = activeGroup.messages.map(msg => {
      if (msg.id === messageId && msg.type === 'question_box' && msg.questionBox) {
        if (msg.questionBox.answers.some(ans => ans.userEmail === userEmail)) return msg;
        const newAnswer: QuestionBoxAnswer = {
          userEmail,
          userName: profile.name,
          avatarId: profile.avatarId,
          text: answerText.trim(),
          timestamp: new Date().toISOString()
        };
        return { ...msg, questionBox: { ...msg.questionBox, answers: [...msg.questionBox.answers, newAnswer] } };
      }
      return msg;
    });
    const updatedGroup = { ...activeGroup, messages: updatedMessages };
    setActiveGroup(updatedGroup);
    setMockGroups(prev => prev.map(g => g.id === updatedGroup.id ? updatedGroup : g));
    await persistGroup(updatedGroup);
    setQuestionBoxAnswers(prev => { const s = { ...prev }; delete s[messageId]; return s; });
  };

  const handleSendGroupInvites = async () => {
    if (!activeGroup || inviteModalSelected.length === 0 || !profile.email) return;
    const invites = inviteModalSelected.map(email => ({
      group_id: activeGroup.id,
      group_name: activeGroup.name,
      target_name: activeGroup.targetName,
      from_email: profile.email,
      from_name: profile.name,
      from_avatar_id: profile.avatarId || '',
      to_email: email,
      status: 'pending',
    }));
    await supabase.from('community_group_invites').insert(invites);
    setInviteModalSelected([]);
    setShowInviteModal(false);
    showToast(`Convite${inviteModalSelected.length > 1 ? 's' : ''} enviado${inviteModalSelected.length > 1 ? 's' : ''}! 🎉`);
  };

  const handleLeaveGroup = () => {
    if (!activeGroup || !profile.email) return;
    setConfirmModal({
      isOpen: true,
      title: 'Sair do Grupo',
      message: `Tem certeza que deseja sair do grupo "${activeGroup.name}"?`,
      confirmText: 'Sair',
      confirmColor: 'bg-rose-700 hover:bg-rose-800',
      onConfirm: async () => {
        const updatedGroup = { ...activeGroup, members: activeGroup.members.filter(m => m.email !== profile.email) };
        await persistGroup(updatedGroup);
        setMockGroups(prev => prev.filter(g => g.id !== activeGroup.id));
        setActiveGroup(null);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleDeleteGroup = () => {
    if (!activeGroup) return;
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Grupo',
      message: `Tem certeza absoluta que deseja EXCLUIR o grupo "${activeGroup.name}"? Todos os dados serão perdidos e esta ação não pode ser desfeita.`,
      confirmText: 'Excluir',
      confirmColor: 'bg-rose-700 hover:bg-rose-800',
      onConfirm: async () => {
        await supabase.from('community_groups').delete().eq('id', activeGroup.id);
        setMockGroups(prev => prev.filter(g => g.id !== activeGroup.id));
        setActiveGroup(null);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleRemoveMember = (memberEmail: string, memberName: string) => {
    if (!activeGroup) return;
    setConfirmModal({
      isOpen: true,
      title: 'Remover Membro',
      message: `Tem certeza que deseja remover ${memberName} do grupo?`,
      confirmText: 'Remover',
      confirmColor: 'bg-rose-700 hover:bg-rose-800',
      onConfirm: async () => {
        const updatedGroup = { ...activeGroup, members: activeGroup.members.filter(m => m.email !== memberEmail) };
        setActiveGroup(updatedGroup);
        setMockGroups(prev => prev.map(g => g.id === updatedGroup.id ? updatedGroup : g));
        await persistGroup(updatedGroup);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleDeleteMessage = (messageId: number) => {
    if (!activeGroup) return;
    setConfirmModal({
      isOpen: true,
      title: 'Excluir Mensagem',
      message: 'Tem certeza que deseja excluir esta mensagem?',
      confirmText: 'Excluir',
      confirmColor: 'bg-rose-700 hover:bg-rose-800',
      onConfirm: async () => {
        const updatedGroup = { ...activeGroup, messages: activeGroup.messages.filter(m => m.id !== messageId) };
        setActiveGroup(updatedGroup);
        setMockGroups(prev => prev.map(g => g.id === updatedGroup.id ? updatedGroup : g));
        await persistGroup(updatedGroup);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // isCurrentUserAdmin — computed once, stable reference

  const handleCreatePrayer = async () => {
    if (!newPrayerRequest.trim() || !profile.email) return;
    const { data } = await supabase.from('community_prayers').insert({
      user_name: profile.name,
      user_id: profile.id || '',
      user_email: profile.email,
      avatar_id: profile.avatarId || '',
      avatar_url: profile.avatarUrl || null,
      request: newPrayerRequest,
      prayed_count: 0,
    }).select().single();

    if (data) {
      setMockPrayers(prev => [{
        id: data.id,
        user: data.user_name,
        userId: data.user_id,
        avatarId: data.avatar_id || '',
        avatarUrl: data.avatar_url,
        request: data.request,
        prayedCount: 0,
        hasPrayed: false,
      }, ...prev]);
    }

    setNewPrayerRequest('');
    setIsCreatingPrayer(false);
    await addToFeed('pediu oração 🙏');
  };

  const handlePray = async (id: string) => {
    if (!profile.email) return;
    const prayer = mockPrayers.find(p => p.id === id);
    if (!prayer || prayer.hasPrayed) return;

    // Optimistically update UI first
    setMockPrayers(prev => prev.map(p =>
      p.id === id ? { ...p, prayedCount: p.prayedCount + 1, hasPrayed: true } : p
    ));

    // Register vote
    const { error: voteError } = await supabase.from('community_prayer_votes').upsert(
      { prayer_id: id, user_email: profile.email },
      { onConflict: 'prayer_id,user_email' }
    );
    if (voteError) {
      // Rollback optimistic update on error
      setMockPrayers(prev => prev.map(p =>
        p.id === id ? { ...p, prayedCount: prayer.prayedCount, hasPrayed: false } : p
      ));
      return;
    }

    // Use server-side increment to avoid race conditions
    await supabase.rpc('increment_prayer_count', { prayer_id: id }).catch(async () => {
      // Fallback: manual increment if RPC not available
      await supabase.from('community_prayers')
        .update({ prayed_count: prayer.prayedCount + 1 })
        .eq('id', id);
    });
  };
  useEffect(() => {
    const email = profile.email;
    if (!email) return;

    loadConnections();
    loadCommunityData();

    const removeListener = sharingService.addListener((data) => {
      if (data.type === 'CONNECTION_REQUEST' || data.type === 'CONNECTION_ACCEPTED' || data.type === 'CONNECTION_REJECTED') {
        loadConnections();
      }
    });
    return removeListener;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.email]);

  // ── Realtime: atualiza activeGroup quando outros membros mudam ──
  useEffect(() => {
    if (!activeGroup) return;

    const channel = supabase
      .channel(`group-${activeGroup.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'community_groups',
          filter: `id=eq.${activeGroup.id}`,
        },
        (payload: any) => {
          const d = payload.new;
          if (!d) return;
          const updated: Group = {
            id: d.id,
            name: d.name,
            targetId: d.target_id,
            targetName: d.target_name,
            members: d.members || [],
            messages: d.messages || [],
            materials: d.materials || [],
          };
          setActiveGroup(updated);
          setMockGroups(prev => prev.map(g => g.id === updated.id ? updated : g));
          // Auto-scroll only if user was already at bottom
          const el = muralScrollRef.current;
          if (el) {
            const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
            if (nearBottom) scrollMuralToBottom();
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeGroup?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Ao abrir grupo: atualiza progresso do usuário local no grupo ──
  useEffect(() => {
    if (!activeGroup || !profile.email) return;
    const myMember = activeGroup.members.find(m => m.email === profile.email);
    if (!myMember) return;
    const realProgress = calculateMemberProgress(profile.email, activeGroup.targetId);
    if (myMember.progress !== realProgress) {
      const updatedMembers = activeGroup.members.map(m =>
        m.email === profile.email ? { ...m, progress: realProgress } : m
      );
      const updatedGroup = { ...activeGroup, members: updatedMembers };
      setActiveGroup(updatedGroup);
      setMockGroups(prev => prev.map(g => g.id === updatedGroup.id ? updatedGroup : g));
      persistGroup(updatedGroup); // fire and forget
    }
  }, [activeGroup?.id, profile.completedBooks]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadConnections = async () => {
    if (profile.email) {
      setIsLoadingConnections(true);
      try {
        const conns = await sharingService.getConnections(profile.email);
        setConnections(conns);
      } finally {
        setIsLoadingConnections(false);
      }
    }
  };

  const handleSearch = async (query?: string) => {
    const q = (query !== undefined ? query : searchQuery).trim();
    if (!q) { setSearchResults([]); setSearchError(''); return; }
    setIsSearching(true);
    setSearchError('');
    try {
      const results = await sharingService.searchUsers(q);
      const filtered = results.filter((u: any) => u.email !== profile.email);
      setSearchResults(filtered);
      if (filtered.length === 0) setSearchError('Nenhum usuário encontrado.');
    } catch (error) {
      console.error('Search failed', error);
      setSearchError('Erro ao buscar. Tente novamente.');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchInputChange = (value: string) => {
    setSearchQuery(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!value.trim()) { setSearchResults([]); setSearchError(''); return; }
    searchDebounceRef.current = setTimeout(() => handleSearch(value), 350);
  };

  const handleRequestConnection = async (toEmail: string) => {
    if (profile.email) {
      await sharingService.requestConnection(profile.email, toEmail);
      await loadConnections();
      setSearchResults(prev => prev.map(u =>
        u.email === toEmail ? { ...u, _requestSent: true } : u
      ));
    }
  };

  const handleRespond = async (fromEmail: string, status: 'accepted' | 'rejected') => {
    if (profile.email) {
      await sharingService.respondToConnection(fromEmail, profile.email, status);
      await loadConnections();
    }
  };

  const handleRemoveFriend = (connEmail: string, connName: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Remover Amigo',
      message: `Tem certeza que deseja remover ${connName} da sua lista de amigos?`,
      confirmText: 'Remover',
      confirmColor: 'bg-rose-700 hover:bg-rose-800',
      onConfirm: async () => {
        if (profile.email) {
          // Delete both directions separately to avoid complex OR syntax issues
          await supabase.from('user_connections')
            .delete()
            .eq('from_email', profile.email)
            .eq('to_email', connEmail);
          await supabase.from('user_connections')
            .delete()
            .eq('from_email', connEmail)
            .eq('to_email', profile.email);
          await loadConnections();
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Sem campo last_seen no banco — exibe texto neutro
  const getLastOnline = (_email: string) => {
    return 'recentemente';
  };

  // ── isCurrentUserAdmin — stable memo, never recalculated inside render ──
  const isCurrentUserAdmin = useMemo(() =>
    !!(profile.email && activeGroup?.members.find(m => m.email === profile.email)?.isLeader),
    [profile.email, activeGroup]
  );

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-stone-900 font-sans pb-28 pt-6 md:pt-12 overflow-x-hidden">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        
        <header className="mb-4 flex items-center gap-3 md:flex-col md:text-center md:items-center pr-10 md:pr-0">
          <div className="w-9 h-9 md:w-12 md:h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm shrink-0">
            <Users size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg md:text-4xl font-serif font-bold tracking-tight text-stone-900">
              Comunidade
            </h1>
            <p className="text-stone-500 text-xs md:text-sm">Conecte-se e compartilhe sua jornada</p>
          </div>
        </header>

        {/* Tabs */}
        {!activeGroup && (
          <div className="relative mb-4">
            <div ref={tabsScrollRef} onScroll={handleTabsScroll} className="flex overflow-x-auto hide-scrollbar gap-1.5 pb-1">
              {[
                { id: 'groups', label: 'Grupos', icon: BookOpen },
                { id: 'feed', label: 'Feed', icon: Activity },
                { id: 'ranking', label: 'Ranking', icon: Trophy },
                { id: 'prayers', label: 'Orações', icon: Heart },
                { id: 'friends', label: 'Amigos', icon: Users },
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full whitespace-nowrap text-xs font-bold transition-all flex-shrink-0 active:scale-95 ${
                      activeTab === tab.id 
                        ? 'bg-indigo-600 text-white shadow-md' 
                        : 'bg-white text-stone-500 hover:bg-stone-100 border border-stone-200'
                    }`}
                  >
                    <Icon size={14} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
            {/* Fade esquerda */}
            <div className={`absolute left-0 top-0 bottom-1 w-10 bg-gradient-to-r from-[#fdfbf7] to-transparent pointer-events-none transition-opacity duration-200 ${tabsScroll.left ? 'opacity-100' : 'opacity-0'}`} />
            {/* Fade direita */}
            <div className={`absolute right-0 top-0 bottom-1 w-10 bg-gradient-to-l from-[#fdfbf7] to-transparent pointer-events-none transition-opacity duration-200 ${tabsScroll.right ? 'opacity-100' : 'opacity-0'}`} />
          </div>
        )}

        <div className="bg-white rounded-2xl p-3 sm:p-6 md:p-8 border border-stone-100 shadow-sm mb-8 overflow-x-hidden">
          
          {isLoadingCommunity && !activeGroup ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
              <p className="text-sm text-stone-400">Carregando comunidade...</p>
              <p className="text-xs text-stone-300">Se demorar muito, verifique sua conexão.</p>
            </div>
          ) : !profile.email ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <p className="text-sm text-stone-400">Faça login para acessar a comunidade.</p>
            </div>
          ) : (
          <>{activeGroup ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                  <>
                    <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
                <button 
                  onClick={() => { setActiveGroup(null); setGroupSubTab('mural'); setReplyingToId(null); setMemberReplyText(''); }}
                  className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors flex-shrink-0"
                >
                  <ChevronLeft size={24} />
                </button>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg sm:text-2xl font-bold text-stone-900 truncate">{activeGroup.name}</h2>
                  <p className="text-xs sm:text-sm text-stone-500 flex items-center gap-1">
                    <BookOpen size={12} /> Estudando: {activeGroup.targetName}
                  </p>
                </div>
                {/* Realtime indicator */}
                <div className="flex items-center gap-1.5 text-[10px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-full shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Ao vivo
                </div>
              </div>

              {/* Collective Progress */}
              <div className="bg-indigo-50 rounded-xl p-3.5 border border-indigo-100">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-indigo-900 text-sm">Progresso Coletivo</h3>
                  <span className="text-lg font-bold text-indigo-600">{calculateGroupProgress(activeGroup.members, activeGroup.targetId)}%</span>
                </div>
                <div className="h-2 bg-white rounded-full overflow-hidden border border-indigo-100">
                  <div 
                    className="h-full bg-indigo-500 rounded-full transition-all duration-1000" 
                    style={{ width: `${calculateGroupProgress(activeGroup.members, activeGroup.targetId)}%` }}
                  />
                </div>
                <p className="text-[10px] text-indigo-400 mt-1.5">
                  {activeGroup.members.length} membro{activeGroup.members.length !== 1 ? 's' : ''} · baseado em livros completados
                </p>
              </div>

              {/* Sub-tabs */}
              <div className="flex gap-1.5 border-b border-stone-100 pb-0">
                {([
                  { id: 'mural', label: '📋 Mural' },
                  { id: 'membros', label: `👥 Membros (${activeGroup.members.length})` },
                  { id: 'materiais', label: `📎 Materiais (${activeGroup.materials?.length || 0})` },
                ] as { id: 'mural' | 'membros' | 'materiais'; label: string }[]).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setGroupSubTab(tab.id)}
                    className={`px-3.5 py-2 text-xs font-bold rounded-t-xl transition-all ${
                      groupSubTab === tab.id
                        ? 'bg-white border border-b-white border-stone-200 text-indigo-700 -mb-px'
                        : 'text-stone-400 hover:text-stone-600'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Sub-tab: Membros */}
              {groupSubTab === 'membros' && (
                <div>
                  <div className="flex justify-end mb-3">
                    <button 
                      onClick={() => setShowInviteModal(true)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100"
                    >
                      <UserPlus size={14} /> Convidar amigo
                    </button>
                  </div>
                  {activeGroup.members.length === 0 ? (
                    <div className="text-center py-10 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                      <Users size={28} className="mx-auto text-stone-300 mb-2" />
                      <p className="text-stone-400 text-sm">Nenhum membro ainda.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {[...activeGroup.members].sort((a, b) => {
                        const pa = a.email === profile.email ? calculateMemberProgress(a.email, activeGroup.targetId) : a.progress;
                        const pb = b.email === profile.email ? calculateMemberProgress(b.email, activeGroup.targetId) : b.progress;
                        return pb - pa;
                      }).map((member, idx) => {
                        const prog = member.email === profile.email
                          ? calculateMemberProgress(member.email, activeGroup.targetId)
                          : member.progress;
                        return (
                          <div key={idx} className="flex items-center justify-between px-3 py-2.5 bg-stone-50 rounded-xl border border-stone-100">
                            <div className="flex items-center gap-2.5 flex-1 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-base border border-stone-200 overflow-hidden shrink-0">
                                {member.avatarUrl ? (
                                  <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  AVATARS.find(a => a.id === member.avatarId)?.emoji || '👤'
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-stone-900 text-sm flex items-center gap-1 leading-none truncate">
                                  {member.name}
                                  {member.isLeader && <Crown size={12} className="text-amber-500 shrink-0" title="Admin do Grupo" />}
                                  {member.email === profile.email && <span className="text-[9px] text-indigo-400 font-medium">(você)</span>}
                                </p>
                                <div className="flex items-center gap-2 mt-1.5">
                                  <div className="flex-1 h-1.5 bg-stone-200 rounded-full overflow-hidden max-w-[80px]">
                                    <div className="h-full bg-emerald-500 rounded-full transition-all duration-700" style={{ width: `${prog}%` }} />
                                  </div>
                                  <span className="text-[10px] font-bold text-stone-400">{prog}%</span>
                                </div>
                              </div>
                            </div>
                            {isCurrentUserAdmin && !member.isLeader && (
                              <button 
                                onClick={() => handleRemoveMember(member.email, member.name)}
                                className="p-1.5 text-stone-300 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors shrink-0 ml-2"
                                title="Remover membro"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Sub-tab: Materiais */}
              {groupSubTab === 'materiais' && (
                <div>
                  {isCurrentUserAdmin && !isAddingMaterial && (
                    <div className="flex justify-end mb-3">
                      <button 
                        onClick={() => setIsAddingMaterial(true)}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100"
                      >
                        <Plus size={14} /> Adicionar material
                      </button>
                    </div>
                  )}

                  {isAddingMaterial && (
                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-bold text-indigo-900 text-sm">Novo Material</h4>
                        <button onClick={() => setIsAddingMaterial(false)} className="text-indigo-400 hover:text-indigo-600">
                          <X size={16} />
                        </button>
                      </div>
                      <div className="space-y-3">
                        <input 
                          type="text" 
                          placeholder="Título (ex: Planilha de Leitura)"
                          value={materialTitle}
                          onChange={(e) => setMaterialTitle(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                        />
                        <input 
                          type="url" 
                          placeholder="Link (Google Drive, PDF, etc)"
                          value={materialUrl}
                          onChange={(e) => setMaterialUrl(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                        />
                        <div className="flex justify-end">
                          <button 
                            onClick={handleAddMaterial}
                            disabled={!materialTitle.trim() || !materialUrl.trim()}
                            className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                          >
                            Salvar Link
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {(!activeGroup.materials || activeGroup.materials.length === 0) && !isAddingMaterial ? (
                    <div className="text-center py-10 bg-stone-50 rounded-2xl border border-dashed border-stone-200">
                      <Paperclip size={28} className="mx-auto text-stone-300 mb-2" />
                      <p className="text-stone-400 text-sm">Nenhum material adicionado ainda.</p>
                      {isCurrentUserAdmin && <p className="text-xs text-stone-300 mt-1">Adicione links, PDFs ou vídeos acima.</p>}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {activeGroup.materials?.map(material => (
                        <div key={material.id} className="flex items-center justify-between p-3 bg-white border border-stone-200 rounded-xl hover:border-indigo-300 hover:shadow-sm transition-all group">
                          <a href={material.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 flex-1 min-w-0">
                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                              material.type === 'spreadsheet' ? 'bg-emerald-100 text-emerald-600' :
                              material.type === 'document' ? 'bg-blue-100 text-blue-600' :
                              material.type === 'pdf' ? 'bg-rose-100 text-rose-700' :
                              material.type === 'video' ? 'bg-red-100 text-red-600' :
                              'bg-stone-100 text-stone-600'
                            }`}>
                              {material.type === 'spreadsheet' ? <FileSpreadsheet size={20} /> :
                               material.type === 'document' ? <FileText size={20} /> :
                               material.type === 'pdf' ? <FileText size={20} /> :
                               material.type === 'video' ? <Youtube size={20} /> :
                               <LinkIcon size={20} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-stone-900 text-sm truncate">{material.title}</p>
                              <p className="text-xs text-stone-500 truncate flex items-center gap-1">
                                <ExternalLink size={10} /> Abrir link
                              </p>
                            </div>
                          </a>
                          {isCurrentUserAdmin && (
                            <button 
                              onClick={() => handleDeleteMaterial(material.id)}
                              className="p-2 text-stone-300 hover:text-rose-700 hover:bg-rose-50 rounded-lg sm:opacity-0 sm:group-hover:opacity-100 transition-all shrink-0"
                              title="Remover material"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Sub-tab: Mural */}
              {groupSubTab === 'mural' && (
              <div>
                <div className="bg-stone-50 rounded-2xl border border-stone-200 flex flex-col overflow-hidden">
                  {/* ── Message list ── */}
                  <div ref={muralScrollRef} className="overflow-y-auto space-y-4 p-3 pr-2" style={{ maxHeight: 'min(calc(100svh - 420px), 480px)', minHeight: '160px' }}>
                    {activeGroup.messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-14 gap-2 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-1">
                          <MessageSquare size={24} className="text-indigo-300" />
                        </div>
                        <p className="font-bold text-stone-700 text-sm">O mural está vazio</p>
                        {isCurrentUserAdmin
                          ? <p className="text-stone-400 text-xs max-w-[200px]">Escreva o primeiro recado, versículo ou meta para o grupo!</p>
                          : <p className="text-stone-400 text-xs max-w-[200px]">Quando o administrador postar algo, aparecerá aqui. Você pode reagir e responder às mensagens.</p>
                        }
                      </div>
                    ) : (
                      (() => {
                        // Separa pinadas (no topo) das demais (por ordem de criação)
                        const pinned = activeGroup.messages.filter(m => m.isPinned);
                        const rest = activeGroup.messages.filter(m => !m.isPinned).sort((a, b) => a.id - b.id);
                        const sorted = [...pinned, ...rest];

                        return sorted.map(msg => {
                          // Contexto da mensagem original para member_reply
                          const parentMsg = msg.type === 'member_reply' && msg.replyToId
                            ? activeGroup.messages.find(m => m.id === msg.replyToId)
                            : null;

                        return (
                        <div key={msg.id} className={`flex gap-2.5 ${msg.type === 'member_reply' ? 'pl-6' : ''}`}>
                          {/* Avatar */}
                          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-sm border border-stone-200 shrink-0 overflow-hidden mt-0.5">
                            {msg.avatarUrl ? (
                              <img src={msg.avatarUrl} alt={msg.user} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              AVATARS.find(a => a.id === msg.avatarId)?.emoji || '👤'
                            )}
                          </div>

                          {/* Bubble */}
                          <div className={`flex-1 min-w-0 px-3 py-2.5 rounded-2xl rounded-tl-none border ${
                            msg.isPinned ? 'bg-amber-50 border-amber-200' :
                            msg.type === 'verse' ? 'bg-indigo-50 border-indigo-100' :
                            msg.type === 'goal' ? 'bg-emerald-50 border-emerald-100' :
                            msg.type === 'member_reply' ? 'bg-stone-50 border-stone-200' :
                            'bg-white border-stone-100'
                          }`}>

                            {/* Reply context thread */}
                            {parentMsg && (
                              <div className="mb-2 px-2 py-1.5 bg-white border-l-2 border-indigo-300 rounded-r-lg">
                                <p className="text-[10px] font-bold text-indigo-500 mb-0.5">{parentMsg.user}</p>
                                <p className="text-xs text-stone-500 leading-snug line-clamp-2">
                                  {parentMsg.type === 'poll' ? `📊 ${parentMsg.poll?.question}` :
                                   parentMsg.type === 'question_box' ? `❓ ${parentMsg.questionBox?.question}` :
                                   parentMsg.text}
                                </p>
                              </div>
                            )}

                            {/* Header: name + badges + timestamp */}
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                                <span className="font-bold text-stone-900 text-sm leading-none">{msg.user}</span>
                                {msg.type === 'verse' && <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-bold">Versículo</span>}
                                {msg.type === 'goal' && <span className="text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full font-bold">Meta</span>}
                                {msg.type === 'member_reply' && <span className="text-[10px] bg-stone-100 text-stone-500 px-1.5 py-0.5 rounded-full font-bold">Resposta</span>}
                                {msg.isPinned && <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5"><Pin size={9} /> Fixado</span>}
                              </div>
                              <span className="text-[10px] text-stone-400 shrink-0" title={new Date(msg.timestamp).toLocaleString('pt-BR')}>
                                {formatRelativeTime(msg.timestamp)}
                              </span>
                            </div>

                            {/* Reply context */}
                            {parentMsg && (
                              <div className="mb-2 pl-2 border-l-2 border-stone-300">
                                <p className="text-[11px] text-stone-500 font-bold">{parentMsg.user}</p>
                                <p className="text-[11px] text-stone-400 truncate">{parentMsg.text || (parentMsg.type === 'poll' ? '📊 Enquete' : parentMsg.type === 'verse' ? '📖 Versículo' : '')}</p>
                              </div>
                            )}
                            
                            {msg.type === 'poll' && msg.poll ? (
                              <div className="mt-2 space-y-2">
                                <p className="font-bold text-stone-800 text-sm mb-3">{msg.poll.question}</p>
                                {msg.poll.options.map(opt => {
                                  const totalVotes = msg.poll!.options.reduce((sum, o) => sum + o.votes.length, 0);
                                  const percentage = totalVotes === 0 ? 0 : Math.round((opt.votes.length / totalVotes) * 100);
                                  const hasVoted = msg.poll!.options.some(o => o.votes.includes(profile.email || 'me'));
                                  const votedForThis = opt.votes.includes(profile.email || 'me');

                                  return (
                                    <div key={opt.id} className="relative">
                                      <button
                                        onClick={() => handleVote(msg.id, opt.id)}
                                        title={votedForThis ? 'Clique para remover seu voto' : ''}
                                        className={`w-full text-left p-2 rounded-xl border text-sm relative overflow-hidden transition-all z-10 ${
                                          votedForThis ? 'border-indigo-500 bg-indigo-50/50' : 'border-stone-200 hover:border-indigo-300 bg-white'
                                        }`}
                                      >
                                        <div className="flex justify-between items-center relative z-20 gap-2">
                                          <span className={votedForThis ? 'font-bold text-indigo-900' : 'text-stone-700'}>{opt.text}</span>
                                          <div className="flex items-center gap-1.5 shrink-0">
                                            {hasVoted && <span className="text-stone-500 font-medium">{percentage}%</span>}
                                            {votedForThis && <span className="text-[10px] text-indigo-400 font-medium hidden sm:inline">(clique para desvotar)</span>}
                                          </div>
                                        </div>
                                        {hasVoted && (
                                          <div 
                                            className="absolute left-0 top-0 bottom-0 bg-indigo-100/50 z-0 transition-all duration-500"
                                            style={{ width: `${percentage}%` }}
                                          />
                                        )}
                                      </button>
                                      {isCurrentUserAdmin && hasVoted && opt.votes.length > 0 && (
                                        <div className="text-[10px] text-stone-400 mt-1 ml-2">
                                          Votos: {opt.votes.map(email => activeGroup.members.find(m => m.email === email)?.name || email).join(', ')}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                                {isCurrentUserAdmin && (
                                  <div className="mt-3 pt-3 border-t border-stone-100/50 text-xs text-stone-500">
                                    <span className="font-bold">Faltam votar: </span>
                                    {activeGroup.members
                                      .filter(m => !msg.poll!.options.some(o => o.votes.includes(m.email)))
                                      .map(m => m.name)
                                      .join(', ') || 'Todos votaram!'}
                                  </div>
                                )}
                              </div>
                            ) : msg.type === 'question_box' && msg.questionBox ? (
                              <div className="mt-2 space-y-3">
                                <div className="bg-indigo-50/50 p-3 rounded-xl border border-indigo-100">
                                  <p className="font-bold text-indigo-900 text-sm flex items-center gap-2">
                                    <HelpCircle size={16} className="text-indigo-500" />
                                    {msg.questionBox.question}
                                  </p>
                                  <p className="text-xs text-indigo-400 mt-1.5">
                                    {msg.questionBox.answers.length === 0
                                      ? 'Nenhuma resposta ainda — seja o primeiro!'
                                      : `${msg.questionBox.answers.length} ${msg.questionBox.answers.length === 1 ? 'resposta' : 'respostas'} recebidas`}
                                  </p>
                                </div>
                                
                                {!msg.questionBox.answers.some(ans => ans.userEmail === (profile.email || 'me')) && (
                                  <div className="flex gap-2">
                                    <input 
                                      type="text" 
                                      placeholder="Sua resposta..."
                                      value={questionBoxAnswers[msg.id] || ''}
                                      onChange={(e) => setQuestionBoxAnswers(prev => ({ ...prev, [msg.id]: e.target.value }))}
                                      onKeyDown={(e) => e.key === 'Enter' && handleAnswerQuestionBox(msg.id)}
                                      className="flex-1 px-3 py-2 bg-white border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                                    />
                                    <button 
                                      onClick={() => handleAnswerQuestionBox(msg.id)}
                                      disabled={!(questionBoxAnswers[msg.id] || '').trim()}
                                      className="px-3 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                                    >
                                      <Send size={16} />
                                    </button>
                                  </div>
                                )}

                                {msg.questionBox.answers.some(ans => ans.userEmail === (profile.email || 'me')) && !isCurrentUserAdmin && (
                                  <div className="text-sm text-emerald-600 font-medium flex items-center gap-1 bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                                    <Check size={14} /> Resposta enviada!
                                  </div>
                                )}

                                {isCurrentUserAdmin && (
                                  <div className="mt-4 space-y-2">
                                    <p className="text-xs font-bold text-stone-500 uppercase tracking-wider">Respostas ({msg.questionBox.answers.length})</p>
                                    {msg.questionBox.answers.length === 0 ? (
                                      <p className="text-sm text-stone-400 italic">Nenhuma resposta ainda.</p>
                                    ) : (
                                      <div className="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                        {msg.questionBox.answers.map((ans, idx) => (
                                          <div key={idx} className="bg-white border border-stone-100 p-2.5 rounded-xl text-sm">
                                            <div className="flex items-center gap-1.5 mb-1">
                                              <span className="font-bold text-stone-800 text-xs">{ans.userName}</span>
                                              <span className="text-[10px] text-stone-400">{formatRelativeTime(ans.timestamp)}</span>
                                            </div>
                                            <p className="text-stone-600">{ans.text}</p>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <p className={`text-sm ${msg.type === 'verse' ? 'font-serif italic text-indigo-900 text-lg text-center my-4' : msg.type === 'goal' ? 'font-bold text-emerald-800' : 'text-stone-700'}`}>
                                {msg.type === 'verse' && '"'}{msg.text}{msg.type === 'verse' && '"'}
                              </p>
                            )}

                            {/* Reactions + actions row */}
                            <div className="mt-2.5 flex items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {msg.reactions && msg.reactions.map(reaction => {
                                  const hasReacted = reaction.users.includes(profile.email || 'me');
                                  return (
                                    <div key={reaction.emoji} className="relative group/reaction">
                                      <button
                                        onClick={() => handleReact(msg.id, reaction.emoji)}
                                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs border transition-colors ${
                                          hasReacted ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'
                                        }`}
                                      >
                                        <span>{reaction.emoji}</span>
                                        <span className="font-medium">{reaction.users.length}</span>
                                      </button>
                                      {isCurrentUserAdmin && (
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover/reaction:block z-20 w-max max-w-[200px] bg-stone-800 text-white text-[10px] p-2 rounded-lg shadow-xl">
                                          <p className="font-bold mb-1 border-b border-stone-600 pb-1">Reagiram com {reaction.emoji}</p>
                                          <p>{reaction.users.map(email => activeGroup.members.find(m => m.email === email)?.name || email).join(', ')}</p>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}

                                {/* Add reaction */}
                                <div className="relative">
                                  <button
                                    onClick={() => setShowReactionMenu(showReactionMenu === msg.id ? null : msg.id)}
                                    className="w-7 h-7 flex items-center justify-center text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
                                  >
                                    <Smile size={15} />
                                  </button>
                                  {showReactionMenu === msg.id && (
                                    <div className="absolute bottom-full left-0 mb-1 bg-white border border-stone-200 shadow-xl rounded-full px-2 py-1 flex gap-1 z-20">
                                      {['🙏', '✨', '🔥', '❤️', '👏'].map(emoji => (
                                        <button
                                          key={emoji}
                                          onClick={() => handleReact(msg.id, emoji)}
                                          className="w-8 h-8 flex items-center justify-center hover:bg-stone-100 rounded-full text-lg transition-transform hover:scale-110"
                                        >
                                          {emoji}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Member reply button — only for admin messages, non-reply types */}
                                {!isCurrentUserAdmin && msg.type !== 'member_reply' && (
                                  <button
                                    onClick={() => {
                                      setReplyingToId(replyingToId === msg.id ? null : msg.id);
                                      setMemberReplyText('');
                                    }}
                                    className="w-7 h-7 flex items-center justify-center text-stone-400 hover:text-indigo-500 hover:bg-indigo-50 rounded-full transition-colors"
                                    title="Responder"
                                  >
                                    <MessageSquare size={14} />
                                  </button>
                                )}
                              </div>

                              {/* Admin actions */}
                              {isCurrentUserAdmin && msg.type !== 'member_reply' && (
                                <div className="flex items-center gap-0.5 shrink-0">
                                  <button
                                    onClick={() => handlePinMessage(msg.id)}
                                    className={`w-8 h-8 flex items-center justify-center rounded-lg transition-colors ${msg.isPinned ? 'text-amber-500 bg-amber-50' : 'text-stone-300 hover:text-amber-400 hover:bg-stone-100'}`}
                                    title={msg.isPinned ? 'Desfixar' : 'Fixar'}
                                  ><Pin size={15} /></button>
                                  <button
                                    onClick={() => handleEditMessageClick(msg)}
                                    className="w-8 h-8 flex items-center justify-center text-stone-300 hover:text-indigo-400 hover:bg-stone-100 rounded-lg transition-colors"
                                    title="Editar"
                                  ><Edit2 size={15} /></button>
                                  <button
                                    onClick={() => handleDeleteMessage(msg.id)}
                                    className="w-8 h-8 flex items-center justify-center text-stone-300 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                                    title="Excluir"
                                  ><Trash2 size={15} /></button>
                                </div>
                              )}
                              {/* Admin can also delete member replies */}
                              {isCurrentUserAdmin && msg.type === 'member_reply' && (
                                <button
                                  onClick={() => handleDeleteMessage(msg.id)}
                                  className="w-8 h-8 flex items-center justify-center text-stone-300 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                                  title="Excluir resposta"
                                ><Trash2 size={15} /></button>
                              )}
                            </div>

                            {/* Inline reply input for member */}
                            {replyingToId === msg.id && !isCurrentUserAdmin && (
                              <div className="mt-2.5 flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Sua resposta..."
                                  value={memberReplyText}
                                  autoFocus
                                  onChange={(e) => setMemberReplyText(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleMemberReply()}
                                  className="flex-1 px-3 py-1.5 bg-white border border-indigo-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                                />
                                <button
                                  onClick={handleMemberReply}
                                  disabled={!memberReplyText.trim()}
                                  className="px-3 py-1.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors text-xs font-bold"
                                >
                                  <Send size={14} />
                                </button>
                                <button
                                  onClick={() => { setReplyingToId(null); setMemberReplyText(''); }}
                                  className="px-2 py-1.5 text-stone-400 hover:text-stone-600 rounded-xl transition-colors"
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            )}

                          </div>
                        </div>
                        );
                      });
                      })()
                    )}
                  </div>
                  
                  {isCreatingPoll ? (
                    <div className="bg-white border border-indigo-200 rounded-2xl p-4 shadow-sm">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-bold text-indigo-900 text-sm flex items-center gap-2">
                          <BarChart2 size={16} /> Criar Enquete
                        </h4>
                        <button onClick={() => setIsCreatingPoll(false)} className="text-stone-400 hover:text-stone-600">
                          <X size={16} />
                        </button>
                      </div>
                      <input 
                        type="text" 
                        placeholder="Pergunta da enquete..."
                        value={pollQuestion}
                        onChange={(e) => setPollQuestion(e.target.value)}
                        className="w-full px-3 py-2 mb-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium"
                      />
                      <div className="space-y-2 mb-3">
                        {pollOptions.map((opt, idx) => (
                          <div key={idx} className="flex gap-2">
                            <input 
                              type="text" 
                              placeholder={`Opção ${idx + 1}`}
                              value={opt}
                              onChange={(e) => {
                                const newOpts = [...pollOptions];
                                newOpts[idx] = e.target.value;
                                setPollOptions(newOpts);
                              }}
                              className="flex-1 px-3 py-1.5 bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm"
                            />
                            {pollOptions.length > 2 && (
                              <button 
                                onClick={() => setPollOptions(pollOptions.filter((_, i) => i !== idx))}
                                className="p-1.5 text-stone-400 hover:text-rose-700 hover:bg-rose-50 rounded-lg"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-between items-center">
                        <button 
                          onClick={() => setPollOptions([...pollOptions, ''])}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                        >
                          <Plus size={12} /> Adicionar Opção
                        </button>
                        <button 
                          onClick={handleCreatePoll}
                          disabled={!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2}
                          className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                        >
                          Publicar
                        </button>
                      </div>
                    </div>
                  ) : isCreatingQuestionBox ? (
                    <div className="bg-white border border-indigo-200 rounded-2xl p-4 shadow-sm">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-bold text-indigo-900 text-sm flex items-center gap-2">
                          <HelpCircle size={16} /> Caixinha de Pergunta
                        </h4>
                        <button onClick={() => setIsCreatingQuestionBox(false)} className="text-stone-400 hover:text-stone-600">
                          <X size={16} />
                        </button>
                      </div>
                      <input 
                        type="text" 
                        placeholder="Faça uma pergunta ao grupo..."
                        value={questionBoxText}
                        onChange={(e) => setQuestionBoxText(e.target.value)}
                        className="w-full px-3 py-2 mb-3 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium"
                      />
                      <div className="flex justify-end">
                        <button 
                          onClick={handleCreateQuestionBox}
                          disabled={!questionBoxText.trim()}
                          className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                        >
                          Publicar
                        </button>
                      </div>
                    </div>
                  ) : isCurrentUserAdmin ? (
                    <div className="bg-white border-t border-stone-200 rounded-b-2xl overflow-hidden">
                      {editingMessageId && (
                        <div className="flex items-center justify-between px-3 py-2 bg-indigo-50 text-indigo-700 text-xs font-bold border-b border-indigo-100">
                          <span>Editando publicação...</span>
                          <button onClick={() => { setEditingMessageId(null); setNewMessage(''); setPostType('text'); }} className="hover:text-indigo-900"><X size={14} /></button>
                        </div>
                      )}

                      {/* Type selector */}
                      {!editingMessageId && (
                        <div className="flex border-b border-stone-100">
                          {[
                            { type: 'text', label: 'Recado', icon: MessageSquare, active: 'bg-stone-100 text-stone-900', inactive: 'text-stone-400' },
                            { type: 'verse', label: 'Versículo', icon: BookOpen, active: 'bg-indigo-50 text-indigo-700', inactive: 'text-stone-400' },
                            { type: 'goal', label: 'Meta', icon: Target, active: 'bg-emerald-50 text-emerald-700', inactive: 'text-stone-400' },
                          ].map(({ type, label, icon: Icon, active, inactive }) => (
                            <button
                              key={type}
                              onClick={() => setPostType(type as any)}
                              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-colors ${postType === type ? active : inactive + ' hover:bg-stone-50'}`}
                            >
                              <Icon size={13} />
                              <span>{label}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Textarea + send row */}
                      <div className="p-2 space-y-2">
                        <textarea
                          rows={2}
                          placeholder={
                            postType === 'verse' ? "Digite o versículo em destaque..." :
                            postType === 'goal' ? "Defina a meta da semana para o grupo..." :
                            "Escreva um recado para o grupo..."
                          }
                          value={newMessage}
                          onChange={(e) => setNewMessage(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && e.metaKey && handleSendMessage()}
                          className="w-full px-3 py-2.5 bg-stone-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none leading-relaxed"
                        />
                        <div className="flex items-center justify-between">
                          {!editingMessageId ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => setIsCreatingPoll(true)}
                                className="p-2 text-stone-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Criar Enquete"
                              >
                                <BarChart2 size={17} />
                              </button>
                              <button
                                onClick={() => setIsCreatingQuestionBox(true)}
                                className="p-2 text-stone-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Caixinha de Pergunta"
                              >
                                <HelpCircle size={17} />
                              </button>
                            </div>
                          ) : <div />}
                          <button
                            onClick={handleSendMessage}
                            disabled={!newMessage.trim()}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-40 transition-all"
                          >
                            <Send size={14} /> Publicar
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Non-admin footer — explains interaction via reply button on each message */
                    <div className="bg-white border-t border-stone-200 rounded-b-2xl px-4 py-3 flex items-center gap-2 text-stone-500">
                      <div className="w-7 h-7 bg-indigo-50 rounded-lg flex items-center justify-center shrink-0">
                        <MessageSquare size={13} className="text-indigo-500" />
                      </div>
                      <div>
                        <p className="text-xs font-medium text-stone-600">
                          Use o botão <span className="font-bold text-stone-800">↩ Responder</span> em qualquer mensagem para participar.
                        </p>
                        {(() => {
                          const myReplies = activeGroup.messages.filter(m => m.type === 'member_reply' && m.userEmail === (profile.email || 'me')).length;
                          return myReplies > 0 ? (
                            <p className="text-[10px] text-indigo-500 font-medium mt-0.5">Você participou {myReplies} vez{myReplies > 1 ? 'es' : ''} neste grupo.</p>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              )} {/* end groupSubTab === 'mural' */}

              {/* Leave / Delete Group */}
              <div className="pt-2 flex justify-center">
                {isCurrentUserAdmin ? (
                  <button 
                    onClick={handleDeleteGroup}
                    className="flex items-center gap-1.5 text-stone-400 hover:text-rose-700 text-xs px-3 py-1.5 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={13} /> Excluir grupo
                  </button>
                ) : (
                  <button 
                    onClick={handleLeaveGroup}
                    className="flex items-center gap-1.5 text-stone-400 hover:text-rose-700 text-xs px-3 py-1.5 hover:bg-rose-50 rounded-lg transition-colors"
                  >
                    <LogOut size={13} /> Sair do grupo
                  </button>
                )}
              </div>

              {/* Invite Modal Overlay */}
              {showInviteModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                  <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
                    <h3 className="font-bold text-stone-900 text-lg mb-4">Convidar Amigos</h3>
                    <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
                      {connections.filter(c => c.status === 'accepted' && !activeGroup?.members.some(m => m.email === c.user.email)).length === 0 ? (
                        <p className="text-stone-500 text-sm text-center py-4">Todos os seus amigos já estão no grupo.</p>
                      ) : (
                        connections.filter(c => c.status === 'accepted' && !activeGroup?.members.some(m => m.email === c.user.email)).map(conn => (
                          <label key={conn.user.email} className="flex items-center justify-between p-2 hover:bg-stone-50 rounded-xl cursor-pointer">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center overflow-hidden">
                                {conn.user.avatarUrl ? (
                                  <img src={conn.user.avatarUrl} alt={conn.user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  AVATARS.find(a => a.id === conn.user.avatarId)?.emoji || '👤'
                                )}
                              </div>
                              <span className="font-medium text-stone-900">{conn.user.name}</span>
                            </div>
                            <input
                              type="checkbox"
                              className="w-5 h-5 rounded border-stone-300 text-indigo-600 focus:ring-indigo-500"
                              checked={inviteModalSelected.includes(conn.user.email)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setInviteModalSelected(prev => [...prev, conn.user.email]);
                                } else {
                                  setInviteModalSelected(prev => prev.filter(em => em !== conn.user.email));
                                }
                              }}
                            />
                          </label>
                        ))
                      )}
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => { setShowInviteModal(false); setInviteModalSelected([]); }} className="px-4 py-2 text-stone-500 font-medium">Cancelar</button>
                      <button
                        onClick={handleSendGroupInvites}
                        disabled={inviteModalSelected.length === 0}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold disabled:opacity-50"
                      >
                        Enviar {inviteModalSelected.length > 0 ? `(${inviteModalSelected.length})` : ''}
                      </button>
                    </div>
                  </div>
                </div>
              )}
                  </>
            </motion.div>
          ) : activeTab === 'feed' && (
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold text-stone-400 uppercase tracking-wider px-1 mb-2">Atividades Recentes</h4>
              {mockFeed.length === 0 ? (
                <div className="text-center py-14 bg-stone-50 rounded-3xl border border-dashed border-stone-200">
                  <Activity size={32} className="mx-auto text-stone-300 mb-3" />
                  <p className="text-stone-500 font-medium">Nenhuma atividade ainda.</p>
                  <p className="text-sm text-stone-400 mt-1">As ações da comunidade aparecerão aqui.</p>
                </div>
              ) : mockFeed.map(item => (
                <div key={item.id} className="flex items-center gap-2.5 p-2.5 bg-stone-50 rounded-xl border border-stone-100">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-base border border-stone-200 shrink-0">
                    {AVATARS.find(a => a.id === item.avatarId)?.emoji || '👤'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-stone-800 text-sm leading-snug">
                      <span className="font-bold text-stone-900">{item.user}</span> {item.action}
                    </p>
                    <p className="text-[11px] text-stone-400 flex items-center gap-1 mt-0.5">
                      <Clock size={9} /> {item.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'ranking' && (() => {
            // Liga semanal: divide usuários em grupos de 20 por pontos similares
            // O usuário está sempre visível no centro do ranking
            const weekStr = (() => {
              const now = new Date();
              const start = new Date(now.getFullYear(), 0, 1);
              const week = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
              return `${now.getFullYear()}-W${week}`;
            })();

            // Cria liga pseudo-determinística baseada no email+semana
            const userSeed = (profile.email || 'anon').split('').reduce((a, c) => a + c.charCodeAt(0), 0);
            const leagueNames = ['Liga Ouro ✨', 'Liga Prata 🥈', 'Liga Bronze 🥉', 'Liga Esmeralda 💚', 'Liga Safira 💎'];
            const leagueName = leagueNames[userSeed % leagueNames.length];

            // Monta competidores da liga misturando ranking real com pares fictícios do mesmo nível
            const myPoints = profile.points;
            const fakeNames = ['Maria G.','João P.','Ana L.','Carlos M.','Lucia F.','Pedro H.','Teresa A.','Paulo R.','Clara S.','Francisco B.','Beatriz N.','Mateus C.','Rosa O.','André V.','Isabel T.','Lucas D.','Cecília M.','Marcos F.','Helena R.','Gabriel S.'];
            const fakeAvatars = ['livro','cruz','peixe','rosario','pomba','estrela','vela','espiga','ancora','chave'];

            // Gera pontos distribuídos ao redor do usuário
            const leagueRival = (idx: number) => {
              const seed = (userSeed * 13 + idx * 7 + weekStr.length) % 100;
              const spread = Math.floor(myPoints * 0.6); // ±60% dos pontos do usuário
              const pts = Math.max(10, myPoints + Math.floor((seed - 50) / 50 * spread));
              return {
                id: `rival-${idx}`,
                name: fakeNames[(userSeed + idx) % fakeNames.length],
                avatarId: fakeAvatars[(userSeed + idx) % fakeAvatars.length],
                points: pts,
                isMe: false,
              };
            };

            const myEntry = { id: 'me', name: profile.name, avatarId: profile.avatarId || 'cruz', avatarUrl: profile.avatarUrl, points: myPoints, isMe: true };

            // Mistura reais do Supabase com fictícios para completar 20
            const realOthers = mockRanking.filter(u => u.id !== userId && u.id !== 'me').slice(0, 8).map(u => ({ ...u, isMe: false }));
            const fakeCount = Math.max(0, 19 - realOthers.length);
            const fakeRivals = Array.from({ length: fakeCount }, (_, i) => leagueRival(i));
            const allEntries = [...realOthers, ...fakeRivals, myEntry].sort((a, b) => b.points - a.points).slice(0, 20);
            const myPosition = allEntries.findIndex(e => e.isMe) + 1;

            // Deadline: próximo domingo
            const now = new Date();
            const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
            const deadline = new Date(now);
            deadline.setDate(now.getDate() + daysUntilSunday);
            deadline.setHours(23, 59, 0, 0);
            const hoursLeft = Math.floor((deadline.getTime() - now.getTime()) / 3600000);

            return (
              <div className="space-y-4">
                {/* Liga header */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl p-4 text-white">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-indigo-200 text-[10px] font-bold uppercase tracking-widest mb-0.5">Sua Liga esta Semana</p>
                      <h3 className="font-bold text-lg">{leagueName}</h3>
                    </div>
                    <div className="text-right">
                      <p className="text-indigo-200 text-[10px] font-medium">Encerra em</p>
                      <p className="font-bold text-sm">{hoursLeft}h</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 bg-white/10 rounded-xl px-3 py-2">
                    <Trophy size={16} className="text-yellow-300 shrink-0" />
                    <p className="text-xs text-white/90">
                      <span className="font-bold">Top 5 sobem de liga</span> · <span className="text-white/70">Últimos 5 descem</span>
                    </p>
                  </div>
                </div>

                {/* Podium top 3 */}
                {allEntries.length >= 3 && (
                  <div className="flex items-end justify-center gap-2 mb-2">
                    {[allEntries[1], allEntries[0], allEntries[2]].map((u, i) => {
                      const podiumPos = [2, 1, 3][i];
                      const heights = ['h-16', 'h-20', 'h-14'];
                      const colors = ['bg-stone-200', 'bg-amber-400', 'bg-orange-300'];
                      return (
                        <div key={u.id} className="flex flex-col items-center gap-1">
                          <div className={`w-9 h-9 rounded-full border-2 ${u.isMe ? 'border-indigo-500' : 'border-white'} overflow-hidden bg-stone-100 flex items-center justify-center text-sm`}>
                            {(u as any).avatarUrl ? <img src={(u as any).avatarUrl} className="w-full h-full object-cover" /> : AVATARS.find(a => a.id === u.avatarId)?.emoji || '👤'}
                          </div>
                          <p className="text-[9px] font-bold text-stone-700 max-w-[56px] text-center truncate">{u.isMe ? 'Você' : u.name.split(' ')[0]}</p>
                          <div className={`w-14 ${heights[i]} ${colors[i]} rounded-t-lg flex items-start justify-center pt-1`}>
                            <span className="font-black text-white text-sm">{podiumPos}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Full ranking list */}
                <div className="space-y-1.5">
                  {allEntries.map((user, idx) => {
                    const pos = idx + 1;
                    const isPromotion = pos <= 5;
                    const isRelegation = pos > 15;
                    return (
                      <div key={user.id} className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                        user.isMe ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-200' :
                        isPromotion ? 'bg-emerald-50/50 border-emerald-100' :
                        isRelegation ? 'bg-red-50/30 border-red-100' :
                        'bg-white border-stone-100'
                      }`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                          pos === 1 ? 'bg-amber-400 text-amber-900' :
                          pos === 2 ? 'bg-stone-300 text-stone-800' :
                          pos === 3 ? 'bg-orange-300 text-orange-900' :
                          isPromotion ? 'bg-emerald-100 text-emerald-700' :
                          isRelegation ? 'bg-red-100 text-red-600' :
                          'bg-stone-100 text-stone-500'
                        }`}>{pos}</div>
                        <div className="w-8 h-8 rounded-full bg-stone-50 flex items-center justify-center text-base border border-stone-100 overflow-hidden shrink-0">
                          {(user as any).avatarUrl ? <img src={(user as any).avatarUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : AVATARS.find(a => a.id === user.avatarId)?.emoji || '👤'}
                        </div>
                        <p className={`flex-1 font-bold text-sm truncate ${user.isMe ? 'text-indigo-700' : 'text-stone-900'}`}>
                          {user.isMe ? `${user.name} (você)` : user.name}
                        </p>
                        {isPromotion && pos > myPosition && <span className="text-[9px] text-emerald-600 font-bold mr-1">↑ sobe</span>}
                        {isRelegation && <span className="text-[9px] text-red-500 font-bold mr-1">↓</span>}
                        <div className={`font-mono font-bold text-sm ${user.isMe ? 'text-indigo-600' : 'text-stone-500'}`}>
                          {user.points} pts
                        </div>
                      </div>
                    );
                  })}
                </div>

                {myPosition > 5 && (
                  <p className="text-center text-xs text-stone-500 bg-amber-50 border border-amber-100 rounded-xl py-2.5 px-4">
                    🎯 Você está na {myPosition}ª posição. Precisa de <strong>{allEntries[4].points - myPoints + 1} pts</strong> para entrar no top 5!
                  </p>
                )}
              </div>
            );
          })()}

          {activeTab === 'groups' && !activeGroup && (
            <div className="space-y-4">
              {/* Group Invites */}
              {mockGroupInvites.length > 0 && (
                <div className="mb-6 space-y-3">
                  <h4 className="text-sm font-bold text-rose-700 uppercase tracking-wider px-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-700 animate-pulse"></span>
                    Convites de Grupo
                  </h4>
                  {mockGroupInvites.map((invite) => (
                    <motion.div 
                      initial={{ opacity: 0, y: 8 }} 
                      animate={{ opacity: 1, y: 0 }} 
                      key={invite.id} 
                      className="relative overflow-hidden rounded-2xl border border-indigo-100 shadow-sm bg-white"
                    >
                      {/* Top accent bar */}
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-indigo-400 rounded-t-2xl" />
                      
                      <div className="p-4 pt-5">
                        {/* Header row: avatar + text */}
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-11 h-11 rounded-2xl bg-indigo-50 flex items-center justify-center text-2xl border border-indigo-100 flex-shrink-0">
                            {AVATARS.find(a => a.id === invite.fromAvatarId)?.emoji || '👤'}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-stone-400 font-medium mb-0.5">Convite recebido de</p>
                            <p className="font-bold text-stone-900 text-sm leading-tight">
                              {invite.from}
                            </p>
                          </div>
                        </div>

                        {/* Group info pill */}
                        <div className="bg-indigo-50 rounded-xl px-3 py-2.5 flex items-center gap-2.5 mb-4">
                          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
                            <Users size={14} className="text-white" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-indigo-700 text-sm truncate">{invite.groupName}</p>
                            <p className="text-xs text-indigo-400 flex items-center gap-1">
                              <BookOpen size={10} /> {invite.targetName}
                            </p>
                          </div>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleAcceptGroupInvite(invite.id)}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 active:scale-95 transition-all text-sm font-bold shadow-sm"
                          >
                            <Check size={16} /> Entrar no grupo
                          </button>
                          <button 
                            onClick={() => handleRejectGroupInvite(invite.id)}
                            className="px-3.5 py-2.5 bg-stone-100 text-stone-500 rounded-xl hover:bg-stone-200 hover:text-stone-700 active:scale-95 transition-all flex items-center gap-1.5 text-sm font-medium"
                          >
                            <X size={15} /> Recusar
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              <div className="flex justify-between items-center px-2 mb-4">
                <h4 className="text-sm font-bold text-stone-400 uppercase tracking-wider">Meus Grupos</h4>
                <button 
                  onClick={() => setIsCreatingGroup(true)}
                  className="text-sm font-bold text-indigo-600 hover:text-indigo-700"
                >
                  Criar Grupo
                </button>
              </div>
              
              {isCreatingGroup && (
                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 mb-4">
                  <h5 className="font-bold text-indigo-900 mb-3 text-base">Criar Novo Grupo</h5>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-bold text-indigo-900 mb-1">Nome do Grupo</label>
                      <input 
                        type="text" 
                        placeholder="Ex: Jovens Sarados..."
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white text-sm"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-xs font-bold text-indigo-900 mb-1">O que vão estudar?</label>
                      <select 
                        value={newGroupTarget}
                        onChange={(e) => setNewGroupTarget(e.target.value)}
                        className="w-full px-3 py-2.5 rounded-xl border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 bg-white text-sm"
                      >
                        <option value="">Selecione um livro ou trilha...</option>
                        <optgroup label="Trilhas">
                          <option value="beginner">Trilha do Discípulo (Iniciantes)</option>
                        </optgroup>
                        <optgroup label="Livros da Bíblia">
                          {BIBLE_BOOKS.map(book => (
                            <option key={book.id} value={book.id}>{book.name}</option>
                          ))}
                        </optgroup>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-indigo-900 mb-1">Convidar Amigos</label>
                      {connections.filter(c => c.status === 'accepted').length === 0 ? (
                        <p className="text-xs text-stone-400 italic px-1">Você ainda não tem amigos adicionados.</p>
                      ) : (
                        <div className="bg-white border border-indigo-100 rounded-xl p-1.5 max-h-32 overflow-y-auto">
                          {connections.filter(c => c.status === 'accepted').map(conn => (
                            <label key={conn.user.email} className="flex items-center justify-between px-2 py-1.5 hover:bg-indigo-50/50 rounded-lg cursor-pointer">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-stone-100 flex items-center justify-center overflow-hidden text-xs">
                                  {conn.user.avatarUrl ? (
                                    <img src={conn.user.avatarUrl} alt={conn.user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    AVATARS.find(a => a.id === conn.user.avatarId)?.emoji || '👤'
                                  )}
                                </div>
                                <span className="text-sm font-medium text-stone-700">{conn.user.name}</span>
                              </div>
                              <input 
                                type="checkbox" 
                                checked={newGroupInvites.includes(conn.user.email)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setNewGroupInvites(prev => [...prev, conn.user.email]);
                                  } else {
                                    setNewGroupInvites(prev => prev.filter(email => email !== conn.user.email));
                                  }
                                }}
                                className="w-4 h-4 rounded border-stone-300 text-indigo-600 focus:ring-indigo-500" 
                              />
                            </label>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button 
                        onClick={() => { setIsCreatingGroup(false); setNewGroupName(''); setNewGroupTarget(''); setNewGroupInvites([]); }}
                        className="px-4 py-2.5 text-stone-500 hover:bg-indigo-100 rounded-xl font-medium transition-colors text-sm"
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={handleCreateGroup}
                        disabled={!newGroupName.trim() || !newGroupTarget}
                        className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 transition-colors text-sm"
                      >
                        Criar Grupo
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid gap-3 sm:grid-cols-2">
                {mockGroups.map(group => (
                  <div 
                    key={group.id} 
                    onClick={async () => {
                      // Reset estado do grupo anterior
                      setReplyingToId(null);
                      setMemberReplyText('');
                      setGroupSubTab('mural');
                      setEditingMessageId(null);
                      setNewMessage('');
                      setIsCreatingPoll(false);
                      setIsCreatingQuestionBox(false);
                      // Fetch the freshest version of this group directly from Supabase
                      const { data } = await supabase
                        .from('community_groups')
                        .select('id, name, target_id, target_name, members, messages, materials')
                        .eq('id', group.id)
                        .single();
                      if (data) {
                        setActiveGroup({
                          id: data.id,
                          name: data.name,
                          targetId: data.target_id,
                          targetName: data.target_name,
                          members: data.members || [],
                          messages: data.messages || [],
                          materials: data.materials || [],
                        });
                      } else {
                        setActiveGroup(group);
                      }
                    }}
                    className="p-4 bg-white rounded-2xl border border-stone-200 hover:border-indigo-200 hover:shadow-md transition-all cursor-pointer group"
                  >
                    {/* Nome + livro */}
                    <div className="mb-3">
                      <h3 className="font-bold text-stone-900 text-base leading-tight group-hover:text-indigo-600 transition-colors">{group.name}</h3>
                      <p className="text-xs text-indigo-500 font-medium flex items-center gap-1 mt-0.5">
                        <BookOpen size={11} /> {group.targetName}
                      </p>
                    </div>

                    {/* Avatares + membros + progresso numa linha */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-1.5">
                          {group.members.slice(0, 3).map((m, i) => (
                            <div key={i} className="w-7 h-7 rounded-full bg-white border-2 border-white flex items-center justify-center text-xs overflow-hidden shadow-sm">
                              {m.avatarUrl ? (
                                <img src={m.avatarUrl} alt={m.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                AVATARS.find(a => a.id === m.avatarId)?.emoji || '👤'
                              )}
                            </div>
                          ))}
                          {group.members.length > 3 && (
                            <div className="w-7 h-7 rounded-full bg-stone-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-stone-500 shadow-sm">
                              +{group.members.length - 3}
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-stone-400 font-medium">{group.members.length} membros</span>
                      </div>

                      {/* Progresso compacto */}
                      <div className="flex items-center gap-2 flex-1 max-w-[120px]">
                        <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                          <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${calculateGroupProgress(group.members, group.targetId)}%` }}></div>
                        </div>
                        <span className="text-xs font-bold text-stone-500 shrink-0">{calculateGroupProgress(group.members, group.targetId)}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'prayers' && !activeGroup && (
            <div className="space-y-3">
              <div className="flex justify-between items-center px-1 mb-3">
                <h4 className="text-sm font-bold text-stone-400 uppercase tracking-wider">Pedidos de Oração</h4>
                <button 
                  onClick={() => setIsCreatingPrayer(true)}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-100 active:scale-95 transition-all"
                >
                  + Novo Pedido
                </button>
              </div>

              {isCreatingPrayer && (
                <div className="p-4 bg-indigo-50 rounded-2xl border border-indigo-100 mb-3">
                  <h5 className="font-bold text-indigo-900 mb-2 text-sm">Novo Pedido de Oração</h5>
                  <div className="flex flex-col gap-2">
                    <textarea 
                      placeholder="Pelo que devemos orar?..."
                      value={newPrayerRequest}
                      onChange={(e) => setNewPrayerRequest(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl border border-indigo-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none h-20 text-sm"
                    />
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => setIsCreatingPrayer(false)}
                        className="px-3 py-2 text-stone-500 hover:bg-indigo-100 rounded-xl font-medium text-sm"
                      >
                        Cancelar
                      </button>
                      <button 
                        onClick={handleCreatePrayer}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 text-sm active:scale-95 transition-all"
                      >
                        Publicar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {mockPrayers.map(prayer => (
                  <div key={prayer.id} className="p-4 bg-white rounded-2xl border border-stone-200 shadow-sm">
                    <div className="flex items-center gap-2.5 mb-2.5">
                      <div className="w-8 h-8 rounded-full bg-stone-50 flex items-center justify-center text-sm border border-stone-200 shrink-0">
                        {AVATARS.find(a => a.id === prayer.avatarId)?.emoji || '👤'}
                      </div>
                      <p className="font-bold text-stone-900 text-sm">{prayer.user}</p>
                    </div>
                    <p className="text-stone-700 text-sm mb-3 leading-relaxed">{prayer.request}</p>
                    <div className="flex items-center justify-between border-t border-stone-100 pt-2.5">
                      <span className="text-xs font-medium text-stone-400">
                        {prayer.prayedCount} {prayer.prayedCount === 1 ? 'pessoa orou' : 'pessoas oraram'}
                      </span>
                      <button 
                        onClick={() => handlePray(prayer.id)}
                        disabled={prayer.hasPrayed}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                          prayer.hasPrayed 
                            ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' 
                            : 'bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100'
                        }`}
                      >
                        <Heart size={13} className={prayer.hasPrayed ? 'fill-emerald-500' : ''} />
                        {prayer.hasPrayed ? 'Orei por isso 🙏' : 'Vou orar'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'friends' && !activeGroup && (
            <>
              {/* Search Bar */}
              <div className="flex flex-col sm:flex-row gap-2 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
                  <input
                    type="text"
                    placeholder="Buscar por nome ou email..."
                    value={searchQuery}
                    onChange={(e) => handleSearchInputChange(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
                  />
                  {isSearching && (
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-stone-300 border-t-indigo-500 rounded-full animate-spin" />
                  )}
                </div>
                <button
                  onClick={() => handleSearch()}
                  disabled={isSearching || !searchQuery.trim()}
                  className="px-5 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm active:scale-95 flex items-center justify-center gap-2"
                >
                  <Search size={16} />
                  <span>Buscar</span>
                </button>
              </div>

              {/* Search Error / Empty */}
              {searchError && searchResults.length === 0 && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-sm text-stone-500 bg-stone-50 border border-stone-200 rounded-2xl px-4 py-3 flex items-center gap-2">
                  <Search size={15} className="text-stone-400 shrink-0" />
                  {searchError}
                </motion.div>
              )}

              {/* Search Results */}
              {searchResults.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 space-y-3">
                  <div className="flex items-center justify-between px-2">
                    <h4 className="text-sm font-bold text-stone-400 uppercase tracking-wider">Resultados ({searchResults.length})</h4>
                    <button onClick={() => { setSearchResults([]); setSearchQuery(''); setSearchError(''); }} className="text-xs text-stone-400 hover:text-stone-600 transition-colors font-medium">Limpar</button>
                  </div>
                  {searchResults.map((user) => {
                    const existingConn = connections.find(c => c.user.email === user.email);
                    const requestSent = user._requestSent || (existingConn?.status === 'pending' && existingConn?.isRequester);
                    const isAlreadyFriend = existingConn?.status === 'accepted';
                    return (
                      <div key={user.email} className="flex items-center justify-between p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-2xl border border-indigo-100 overflow-hidden">
                            {user.avatarUrl ? (
                              <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              AVATARS.find(a => a.id === user.avatarId)?.emoji || '👤'
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-stone-900 text-base">{user.name || 'Usuário'}</p>
                            <p className="text-sm text-stone-500">{user.email}</p>
                          </div>
                        </div>
                        {isAlreadyFriend ? (
                          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl">
                            <Check size={13} /> Amigos
                          </span>
                        ) : requestSent ? (
                          <span className="flex items-center gap-1.5 text-xs font-bold text-indigo-500 bg-indigo-100 px-3 py-1.5 rounded-xl">
                            <Clock size={13} /> Enviado
                          </span>
                        ) : (
                          <button
                            onClick={() => handleRequestConnection(user.email)}
                            className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-xl border border-indigo-200 hover:bg-indigo-50 transition-colors font-bold text-sm"
                          >
                            <UserPlus size={18} />
                            <span className="hidden sm:inline">Conectar</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </motion.div>
              )}

              {/* Convites Recebidos */}
              {connections.some(c => c.status === 'pending' && !c.isRequester) && (
                <div className="mb-8 space-y-3">
                  <h4 className="text-sm font-bold text-rose-700 uppercase tracking-wider px-2 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-700 animate-pulse" />
                    Convites Recebidos ({connections.filter(c => c.status === 'pending' && !c.isRequester).length})
                  </h4>
                  {connections.filter(c => c.status === 'pending' && !c.isRequester).map((conn) => (
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} key={conn.user.email} className="flex items-center justify-between p-4 bg-rose-50/50 rounded-2xl border border-rose-100 shadow-sm">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-2xl shadow-sm border border-rose-100 overflow-hidden">
                          {conn.user.avatarUrl ? (
                            <img src={conn.user.avatarUrl} alt={conn.user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            AVATARS.find(a => a.id === conn.user.avatarId)?.emoji || '👤'
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-stone-900 text-base">{conn.user.name || conn.user.email}</p>
                          <p className="text-sm text-stone-500">quer se conectar com você</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleRespond(conn.user.email, 'accepted')}
                          className="p-3 bg-emerald-500 text-white rounded-xl hover:bg-emerald-600 transition-colors shadow-sm hover:shadow-md"
                          title="Aceitar"
                        >
                          <Check size={20} />
                        </button>
                        <button
                          onClick={() => handleRespond(conn.user.email, 'rejected')}
                          className="p-3 bg-white text-stone-400 border border-stone-200 rounded-xl hover:bg-stone-50 hover:text-rose-700 transition-colors"
                          title="Recusar"
                        >
                          <X size={20} />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Convites Enviados (aguardando resposta) */}
              {connections.some(c => c.status === 'pending' && c.isRequester) && (
                <div className="mb-8 space-y-3">
                  <h4 className="text-sm font-bold text-stone-400 uppercase tracking-wider px-2">
                    Aguardando Resposta ({connections.filter(c => c.status === 'pending' && c.isRequester).length})
                  </h4>
                  {connections.filter(c => c.status === 'pending' && c.isRequester).map((conn) => (
                    <div key={conn.user.email} className="flex items-center justify-between p-4 bg-stone-50 rounded-2xl border border-stone-200">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center text-2xl border border-stone-200 overflow-hidden">
                          {conn.user.avatarUrl ? (
                            <img src={conn.user.avatarUrl} alt={conn.user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            AVATARS.find(a => a.id === conn.user.avatarId)?.emoji || '👤'
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-stone-900 text-base">{conn.user.name || conn.user.email}</p>
                          <p className="text-sm text-stone-400">Convite enviado</p>
                        </div>
                      </div>
                      <span className="flex items-center gap-1.5 text-xs font-bold text-stone-400 bg-white border border-stone-200 px-3 py-1.5 rounded-xl">
                        <Clock size={13} /> Pendente
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Lista de Amigos */}
              <div className="space-y-4">
                <div className="flex items-center justify-between px-2">
                  <h4 className="text-sm font-bold text-stone-400 uppercase tracking-wider">
                    Meus Amigos {connections.filter(c => c.status === 'accepted').length > 0 && `(${connections.filter(c => c.status === 'accepted').length})`}
                  </h4>
                  {isLoadingConnections && <span className="w-4 h-4 border-2 border-stone-200 border-t-indigo-500 rounded-full animate-spin" />}
                </div>
                {connections.filter(c => c.status === 'accepted').length === 0 ? (
                  <div className="text-center py-12 bg-stone-50 rounded-3xl border border-dashed border-stone-200">
                    <Users size={32} className="mx-auto text-stone-300 mb-3" />
                    <p className="text-stone-500 font-medium">Você ainda não tem amigos conectados.</p>
                    <p className="text-sm text-stone-400 mt-1">Busque por nome ou email acima para começar.</p>
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {connections.filter(c => c.status === 'accepted').map((conn) => (
                      <div key={conn.user.email} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-shadow group">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-full bg-stone-50 flex items-center justify-center text-2xl border border-stone-200 overflow-hidden">
                            {conn.user.avatarUrl ? (
                              <img src={conn.user.avatarUrl} alt={conn.user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              AVATARS.find(a => a.id === conn.user.avatarId)?.emoji || '👤'
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-stone-900 text-base">{conn.user.name || conn.user.email}</p>
                            <p className="text-sm text-stone-400">{conn.user.email}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleRemoveFriend(conn.user.email, conn.user.name)}
                          className="sm:opacity-0 sm:group-hover:opacity-100 p-2.5 text-stone-300 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-all"
                          title="Remover amigo"
                        >
                          <UserMinus size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
          {/* Generic Confirm Modal */}
          {confirmModal.isOpen && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-xl">
                <h3 className="font-bold text-stone-900 text-lg mb-2">{confirmModal.title}</h3>
                <p className="text-stone-600 text-sm mb-6">{confirmModal.message}</p>
                <div className="flex justify-end gap-2">
                  <button 
                    onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))} 
                    className="px-4 py-2 text-stone-500 font-medium hover:bg-stone-100 rounded-xl transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={confirmModal.onConfirm} 
                    className={`px-4 py-2 text-white rounded-xl font-bold transition-colors ${confirmModal.confirmColor}`}
                  >
                    {confirmModal.confirmText}
                  </button>
                </div>
              </div>
            </div>
          )}
          </>
          )}

        </div>
      </div>

      {/* Toast Notifications */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex flex-col gap-2 pointer-events-none w-full max-w-sm px-4">
        {toasts.map(toast => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8 }}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg text-sm font-bold pointer-events-auto ${
              toast.type === 'error' ? 'bg-rose-600 text-white' :
              toast.type === 'info' ? 'bg-stone-800 text-white' :
              'bg-emerald-600 text-white'
            }`}
          >
            <span className="text-base">{toast.type === 'error' ? '❌' : toast.type === 'info' ? 'ℹ️' : '✅'}</span>
            {toast.message}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
