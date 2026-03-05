import { useState, useEffect, useRef } from 'react';
import { useGamification, AVATARS } from '../services/gamification';
import { Users, Search, UserPlus, Check, X, UserMinus, Clock, Activity, Trophy, BookOpen, Heart, ThumbsUp, ChevronLeft, Send, LogOut, Crown, Trash2, BarChart2, Plus, Pin, Edit2, Target, MessageSquare, Smile, Paperclip, Link as LinkIcon, ExternalLink, FileSpreadsheet, FileText, Youtube, HelpCircle } from 'lucide-react';
import { sharingService, Connection } from '../services/sharingService';
import { motion } from 'motion/react';
import { BIBLE_BOOKS, BEGINNER_PATH } from '../constants';

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
  timestamp: string;
  type?: 'text' | 'poll' | 'verse' | 'goal' | 'question_box';
  poll?: {
    question: string;
    options: PollOption[];
  };
  questionBox?: {
    question: string;
    answers: QuestionBoxAnswer[];
  };
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
  id: number;
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
  const [activeTab, setActiveTab] = useState<'feed' | 'ranking' | 'groups' | 'prayers' | 'friends'>('feed');
  const tabsScrollRef = useRef<HTMLDivElement>(null);
  const [tabsScroll, setTabsScroll] = useState({ left: false, right: true });

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
  const [newMessage, setNewMessage] = useState('');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [postType, setPostType] = useState<'text' | 'verse' | 'goal'>('text');
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [showReactionMenu, setShowReactionMenu] = useState<number | null>(null);
  const [showReactionDetails, setShowReactionDetails] = useState<{ messageId: number, emoji: string } | null>(null);
  
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

  // Mock Data
  const [mockFeed, setMockFeed] = useState([
    { id: 1, user: 'Maria', avatarId: 'maria', action: 'concluiu Êxodo ⭐', time: 'há 2h' },
    { id: 2, user: 'João', avatarId: 'jose', action: 'leu 3 capítulos de Gênesis', time: 'há 5h' },
    { id: 3, user: 'Ana', avatarId: 'teresinha', action: 'desbloqueou a conquista "Madrugador" 🌅', time: 'há 1 dia' },
  ]);

  const mockRanking = [
    { id: 1, name: 'João', avatarId: 'jose', points: 1250, position: 1 },
    { id: 2, name: 'Maria', avatarId: 'maria', points: 1100, position: 2 },
    { id: 3, name: profile.name, avatarId: profile.avatarId, avatarUrl: profile.avatarUrl, points: profile.points, position: 3 },
    { id: 4, name: 'Ana', avatarId: 'teresinha', points: 850, position: 4 },
  ].sort((a, b) => b.points - a.points).map((u, i) => ({ ...u, position: i + 1 }));

  const [mockGroups, setMockGroups] = useState<Group[]>([
    { 
      id: 1, 
      name: 'Jovens Sarados', 
      targetId: 'genesis',
      targetName: 'Gênesis',
      members: [
        { email: 'joao@example.com', name: 'João', avatarId: 'jose', progress: 80, isLeader: true },
        { email: profile.email || 'me', name: profile.name, avatarId: profile.avatarId, avatarUrl: profile.avatarUrl, progress: 45 },
        { email: 'maria@example.com', name: 'Maria', avatarId: 'maria', progress: 10 }
      ],
      messages: [
        { id: 1, user: 'João', userEmail: 'joao@example.com', avatarId: 'jose', text: 'Pessoal, vamos tentar terminar o capítulo 5 hoje!', timestamp: '10:00', type: 'text' }
      ]
    },
    { 
      id: 2, 
      name: 'Estudo de Apocalipse', 
      targetId: 'apocalipse',
      targetName: 'Apocalipse',
      members: [
        { email: 'ana@example.com', name: 'Ana', avatarId: 'teresinha', progress: 100, isLeader: true },
        { email: profile.email || 'me', name: profile.name, avatarId: profile.avatarId, avatarUrl: profile.avatarUrl, progress: 60 }
      ],
      messages: []
    },
  ]);

  const [mockGroupInvites, setMockGroupInvites] = useState([
    { id: 101, groupName: 'Leitura Anual', targetName: 'Bíblia Toda', from: 'Pedro', fromAvatarId: 'peixe' }
  ]);

  const [mockPrayers, setMockPrayers] = useState([
    { id: 1, user: 'Ana', avatarId: 'teresinha', request: 'Pela saúde da minha mãe que fará uma cirurgia amanhã.', prayedCount: 5, hasPrayed: false },
    { id: 2, user: 'João', avatarId: 'jose', request: 'Por uma porta de emprego.', prayedCount: 12, hasPrayed: true },
  ]);

  const handleCreateGroup = () => {
    if (!newGroupName.trim() || !newGroupTarget) return;
    
    const targetName = newGroupTarget === 'beginner' ? 'Trilha do Discípulo' : 
                       BIBLE_BOOKS.find(b => b.id === newGroupTarget)?.name || 'Estudo';

    const newGroup: Group = {
      id: Date.now(),
      name: newGroupName,
      targetId: newGroupTarget,
      targetName: targetName,
      members: [
        { email: profile.email || 'me', name: profile.name, avatarId: profile.avatarId, avatarUrl: profile.avatarUrl, progress: 0, isLeader: true }
      ],
      messages: []
    };

    setMockGroups(prev => [newGroup, ...prev]);
    setNewGroupName('');
    setNewGroupTarget('');
    setNewGroupInvites([]);
    setIsCreatingGroup(false);
    
    // Add to feed
    setMockFeed(prev => [
      { id: Date.now(), user: profile.name, avatarId: profile.avatarId, action: `criou o grupo "${newGroupName}"`, time: 'Agora mesmo' },
      ...prev
    ]);

    if (newGroupInvites.length > 0) {
      alert(`Convites enviados para ${newGroupInvites.length} amigo(s)!`);
    }
  };

  const handleAcceptGroupInvite = (inviteId: number) => {
    setMockGroupInvites(prev => prev.filter(i => i.id !== inviteId));
    alert('Você entrou no grupo!');
    // In a real app, this would add the user to the group in the backend
  };

  const handleRejectGroupInvite = (inviteId: number) => {
    setMockGroupInvites(prev => prev.filter(i => i.id !== inviteId));
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !activeGroup) return;
    
    let updatedMessages = [...activeGroup.messages];

    if (editingMessageId) {
      updatedMessages = updatedMessages.map(msg => 
        msg.id === editingMessageId ? { ...msg, text: newMessage, type: postType } : msg
      );
    } else {
      updatedMessages.push({
        id: Date.now(),
        user: profile.name,
        userEmail: profile.email || 'me',
        avatarId: profile.avatarId,
        avatarUrl: profile.avatarUrl,
        text: newMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        type: postType
      });
    }

    const updatedGroup = {
      ...activeGroup,
      messages: updatedMessages
    };
    
    setActiveGroup(updatedGroup);
    setMockGroups(prev => prev.map(g => g.id === updatedGroup.id ? updatedGroup : g));
    setNewMessage('');
    setEditingMessageId(null);
    setPostType('text');
  };

  const handleEditMessageClick = (msg: GroupMessage) => {
    setNewMessage(msg.text);
    setPostType(msg.type === 'verse' || msg.type === 'goal' ? msg.type : 'text');
    setEditingMessageId(msg.id);
  };

  const handlePinMessage = (messageId: number) => {
    if (!activeGroup) return;
    const updatedMessages = activeGroup.messages.map(msg => 
      msg.id === messageId ? { ...msg, isPinned: !msg.isPinned } : msg
    );
    const updatedGroup = { ...activeGroup, messages: updatedMessages };
    setActiveGroup(updatedGroup);
    setMockGroups(prev => prev.map(g => g.id === updatedGroup.id ? updatedGroup : g));
  };

  const handleReact = (messageId: number, emoji: string) => {
    if (!activeGroup) return;
    const userEmail = profile.email || 'me';

    const updatedMessages = activeGroup.messages.map(msg => {
      if (msg.id === messageId) {
        const reactions = msg.reactions || [];

        // Find if user already reacted with any emoji
        const currentEmojiIndex = reactions.findIndex(r => r.users.includes(userEmail));
        const isSameEmoji = currentEmojiIndex >= 0 && reactions[currentEmojiIndex].emoji === emoji;

        // Remove user from their current reaction (if any)
        let newReactions = reactions
          .map(r => ({ ...r, users: r.users.filter(u => u !== userEmail) }))
          .filter(r => r.users.length > 0);

        // If it's a different emoji (or no previous reaction), add user to new emoji
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
    setShowReactionMenu(null);
  };

  const handleCreatePoll = () => {
    if (!pollQuestion.trim() || pollOptions.filter(o => o.trim()).length < 2 || !activeGroup) return;

    const validOptions = pollOptions.filter(o => o.trim()).map((opt, idx) => ({
      id: `opt_${Date.now()}_${idx}`,
      text: opt.trim(),
      votes: []
    }));

    const updatedGroup = {
      ...activeGroup,
      messages: [
        ...activeGroup.messages,
        {
          id: Date.now(),
          user: profile.name,
          userEmail: profile.email || 'me',
          avatarId: profile.avatarId,
          avatarUrl: profile.avatarUrl,
          text: '',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'poll' as const,
          poll: {
            question: pollQuestion.trim(),
            options: validOptions
          }
        }
      ]
    };

    setActiveGroup(updatedGroup);
    setMockGroups(prev => prev.map(g => g.id === updatedGroup.id ? updatedGroup : g));
    setIsCreatingPoll(false);
    setPollQuestion('');
    setPollOptions(['', '']);
  };

  const handleAddMaterial = () => {
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
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: 'text',
      isPinned: true
    };

    const updatedGroup = {
      ...activeGroup,
      materials: [...(activeGroup.materials || []), newMaterial],
      messages: [...activeGroup.messages, alertMessage]
    };

    setActiveGroup(updatedGroup);
    setMockGroups(prev => prev.map(g => g.id === updatedGroup.id ? updatedGroup : g));
    
    setMaterialTitle('');
    setMaterialUrl('');
    setIsAddingMaterial(false);
  };

  const handleDeleteMaterial = (materialId: string) => {
    if (!activeGroup) return;
    
    const materialToDelete = activeGroup.materials?.find(m => m.id === materialId);
    if (!materialToDelete) return;

    const expectedMessageText = `Compartilhou um material: ${materialToDelete.title}`;

    setConfirmModal({
      isOpen: true,
      title: 'Excluir Material',
      message: 'Tem certeza que deseja excluir este material de apoio?',
      confirmText: 'Excluir',
      confirmColor: 'bg-rose-700 hover:bg-rose-800',
      onConfirm: () => {
        const updatedGroup = {
          ...activeGroup,
          materials: (activeGroup.materials || []).filter(m => m.id !== materialId),
          messages: activeGroup.messages.filter(msg => msg.text !== expectedMessageText)
        };
        setActiveGroup(updatedGroup);
        setMockGroups(prev => prev.map(g => g.id === updatedGroup.id ? updatedGroup : g));
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleVote = (messageId: number, optionId: string) => {
    if (!activeGroup) return;
    const userEmail = profile.email || 'me';

    const updatedMessages = activeGroup.messages.map(msg => {
      if (msg.id === messageId && msg.type === 'poll' && msg.poll) {
        // Check if user already voted for this same option (toggle off not desired, just allow change)
        const alreadyVotedThis = msg.poll.options.find(opt => opt.id === optionId)?.votes.includes(userEmail);
        if (alreadyVotedThis) return msg; // Already voted for this option, no change needed

        // Remove previous vote (if any) and add new vote
        const updatedOptions = msg.poll.options.map(opt => {
          if (opt.id === optionId) {
            // Add vote to selected option
            return { ...opt, votes: [...opt.votes.filter(v => v !== userEmail), userEmail] };
          }
          // Remove vote from other options
          return { ...opt, votes: opt.votes.filter(v => v !== userEmail) };
        });

        return { ...msg, poll: { ...msg.poll, options: updatedOptions } };
      }
      return msg;
    });

    const updatedGroup = { ...activeGroup, messages: updatedMessages };
    setActiveGroup(updatedGroup);
    setMockGroups(prev => prev.map(g => g.id === updatedGroup.id ? updatedGroup : g));
  };

  const handleCreateQuestionBox = () => {
    if (!questionBoxText.trim() || !activeGroup) return;

    const updatedGroup = {
      ...activeGroup,
      messages: [
        ...activeGroup.messages,
        {
          id: Date.now(),
          user: profile.name,
          userEmail: profile.email || 'me',
          avatarId: profile.avatarId,
          avatarUrl: profile.avatarUrl,
          text: '',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'question_box' as const,
          questionBox: {
            question: questionBoxText.trim(),
            answers: []
          }
        }
      ]
    };

    setActiveGroup(updatedGroup);
    setMockGroups(prev => prev.map(g => g.id === updatedGroup.id ? updatedGroup : g));
    setIsCreatingQuestionBox(false);
    setQuestionBoxText('');
  };

  const handleAnswerQuestionBox = (messageId: number) => {
    if (!activeGroup) return;
    const answerText = questionBoxAnswers[messageId];
    if (!answerText || !answerText.trim()) return;

    const userEmail = profile.email || 'me';

    const updatedMessages = activeGroup.messages.map(msg => {
      if (msg.id === messageId && msg.type === 'question_box' && msg.questionBox) {
        // Check if user already answered
        const hasAnswered = msg.questionBox.answers.some(ans => ans.userEmail === userEmail);
        if (hasAnswered) return msg;

        const newAnswer: QuestionBoxAnswer = {
          userEmail,
          userName: profile.name,
          avatarId: profile.avatarId,
          text: answerText.trim(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };

        return {
          ...msg,
          questionBox: {
            ...msg.questionBox,
            answers: [...msg.questionBox.answers, newAnswer]
          }
        };
      }
      return msg;
    });

    const updatedGroup = { ...activeGroup, messages: updatedMessages };
    setActiveGroup(updatedGroup);
    setMockGroups(prev => prev.map(g => g.id === updatedGroup.id ? updatedGroup : g));
    
    // Clear the input for this message
    setQuestionBoxAnswers(prev => {
      const newState = { ...prev };
      delete newState[messageId];
      return newState;
    });
  };

  const handleLeaveGroup = () => {
    if (!activeGroup) return;
    setConfirmModal({
      isOpen: true,
      title: 'Sair do Grupo',
      message: `Tem certeza que deseja sair do grupo "${activeGroup.name}"?`,
      confirmText: 'Sair',
      confirmColor: 'bg-rose-700 hover:bg-rose-800',
      onConfirm: () => {
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
      onConfirm: () => {
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
      onConfirm: () => {
        const updatedGroup = {
          ...activeGroup,
          members: activeGroup.members.filter(m => m.email !== memberEmail)
        };
        setActiveGroup(updatedGroup);
        setMockGroups(prev => prev.map(g => g.id === updatedGroup.id ? updatedGroup : g));
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
      onConfirm: () => {
        const updatedGroup = {
          ...activeGroup,
          messages: activeGroup.messages.filter(m => m.id !== messageId)
        };
        setActiveGroup(updatedGroup);
        setMockGroups(prev => prev.map(g => g.id === updatedGroup.id ? updatedGroup : g));
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const calculateGroupProgress = (members: GroupMember[]) => {
    if (members.length === 0) return 0;
    const total = members.reduce((sum, m) => sum + m.progress, 0);
    return Math.round(total / members.length);
  };

  const handleCreatePrayer = () => {
    if (!newPrayerRequest.trim()) return;
    setMockPrayers(prev => [
      { id: Date.now(), user: profile.name, avatarId: profile.avatarId, request: newPrayerRequest, prayedCount: 0, hasPrayed: false },
      ...prev
    ]);
    setNewPrayerRequest('');
    setIsCreatingPrayer(false);
    
    // Add to feed
    setMockFeed(prev => [
      { id: Date.now(), user: profile.name, avatarId: profile.avatarId, action: 'pediu oração 🙏', time: 'Agora mesmo' },
      ...prev
    ]);
  };

  const handlePray = (id: number) => {
    setMockPrayers(prev => prev.map(p => {
      if (p.id === id && !p.hasPrayed) {
        return { ...p, prayedCount: p.prayedCount + 1, hasPrayed: true };
      }
      return p;
    }));
  };

  useEffect(() => {
    if (profile.email) {
      loadConnections();
      const removeListener = sharingService.addListener((data) => {
        if (data.type === 'CONNECTION_REQUEST' || data.type === 'CONNECTION_ACCEPTED' || data.type === 'CONNECTION_REJECTED') {
          loadConnections();
        }
      });
      return removeListener;
    }
  }, [profile.email]);

  const loadConnections = async () => {
    if (profile.email) {
      const conns = await sharingService.getConnections(profile.email);
      setConnections(conns);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await sharingService.searchUsers(searchQuery);
      setSearchResults(results.filter((u: any) => u.email !== profile.email));
    } catch (error) {
      console.error('Search failed', error);
    } finally {
      setIsSearching(false);
    }
  };

  const handleRequestConnection = async (toEmail: string) => {
    if (profile.email) {
      await sharingService.requestConnection(profile.email, toEmail);
      loadConnections();
      setSearchResults([]);
      setSearchQuery('');
      alert('Convite enviado!');
    }
  };

  const handleRespond = async (fromEmail: string, status: 'accepted' | 'rejected') => {
    if (profile.email) {
      await sharingService.respondToConnection(fromEmail, profile.email, status);
      loadConnections();
    }
  };

  // Mock last online for demo purposes
  const getLastOnline = (email: string) => {
    const hash = email.split('').reduce((a, b) => a + b.charCodeAt(0), 0);
    const minutes = hash % 60;
    if (minutes < 5) return 'Agora mesmo';
    if (minutes < 60) return `Há ${minutes} minutos`;
    return `Há ${Math.floor(minutes / 10)} horas`;
  };

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
                { id: 'feed', label: 'Feed', icon: Activity },
                { id: 'ranking', label: 'Ranking', icon: Trophy },
                { id: 'groups', label: 'Grupos', icon: BookOpen },
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
          
          {/* Active Group View */}
          {activeGroup ? (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {(() => {
                const isCurrentUserAdmin = activeGroup.members.find(m => (m.email === profile.email || m.email === 'me'))?.isLeader;
                return (
                  <>
                    <div className="flex items-center gap-3 border-b border-stone-100 pb-4">
                <button 
                  onClick={() => setActiveGroup(null)}
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
              </div>

              {/* Collective Progress */}
              <div className="bg-indigo-50 rounded-xl p-3.5 border border-indigo-100">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-bold text-indigo-900 text-sm">Progresso Coletivo</h3>
                  <span className="text-lg font-bold text-indigo-600">{calculateGroupProgress(activeGroup.members)}%</span>
                </div>
                <div className="h-2 bg-white rounded-full overflow-hidden border border-indigo-100">
                  <div 
                    className="h-full bg-indigo-500 rounded-full transition-all duration-1000" 
                    style={{ width: `${calculateGroupProgress(activeGroup.members)}%` }}
                  ></div>
                </div>
              </div>

              {/* Members List */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-stone-900 text-sm">Membros ({activeGroup.members.length})</h3>
                  <button 
                    onClick={() => setShowInviteModal(true)}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                  >
                    <UserPlus size={14} /> Convidar
                  </button>
                </div>
                <div className="space-y-2">
                  {activeGroup.members.sort((a, b) => b.progress - a.progress).map((member, idx) => (
                    <div key={idx} className="flex items-center justify-between px-3 py-2 bg-stone-50 rounded-xl border border-stone-100">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-base border border-stone-200 overflow-hidden shrink-0">
                          {member.avatarUrl ? (
                            <img src={member.avatarUrl} alt={member.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            AVATARS.find(a => a.id === member.avatarId)?.emoji || '👤'
                          )}
                        </div>
                        <div>
                          <p className="font-bold text-stone-900 text-sm flex items-center gap-1 leading-none">
                            {member.name}
                            {member.isLeader && <Crown size={12} className="text-amber-500" title="Admin do Grupo" />}
                          </p>
                          <div className="w-20 h-1.5 bg-stone-200 rounded-full mt-1.5 overflow-hidden">
                            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${member.progress}%` }}></div>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-stone-400">{member.progress}%</span>
                        {isCurrentUserAdmin && !member.isLeader && (
                          <button 
                            onClick={() => handleRemoveMember(member.email, member.name)}
                            className="p-1.5 text-stone-300 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Remover membro"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Materiais de Apoio */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-bold text-stone-900 text-sm flex items-center gap-1.5">
                    <Paperclip size={15} className="text-indigo-500" /> Materiais de Apoio
                  </h3>
                  {isCurrentUserAdmin && !isAddingMaterial && (
                    <button 
                      onClick={() => setIsAddingMaterial(true)}
                      className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                    >
                      <Plus size={14} /> Adicionar
                    </button>
                  )}
                </div>

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
                  <p className="text-xs text-stone-400 italic px-1">Nenhum material adicionado ainda.</p>
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
                            className="p-2 text-stone-300 hover:text-rose-700 hover:bg-rose-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all shrink-0"
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

              {/* Message Board */}
              <div>
                <h3 className="font-bold text-stone-900 mb-4">Mural do Grupo</h3>
                <div className="bg-stone-50 rounded-2xl border border-stone-200 flex flex-col overflow-hidden">
                  <div className="overflow-y-auto space-y-4 p-3 pr-2" style={{ maxHeight: 'calc(100svh - 480px)' }}>
                    {activeGroup.messages.length === 0 ? (
                      <p className="text-center text-stone-400 text-sm mt-10">Nenhuma publicação ainda. O administrador do grupo postará novidades aqui!</p>
                    ) : (
                      [...activeGroup.messages].sort((a, b) => {
                        if (a.isPinned && !b.isPinned) return -1;
                        if (!a.isPinned && b.isPinned) return 1;
                        return a.id - b.id;
                      }).map(msg => (
                        <div key={msg.id} className="flex gap-2.5">
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
                            'bg-white border-stone-100'
                          }`}>

                            {/* Header: name + badges + timestamp */}
                            <div className="flex items-center justify-between gap-2 mb-1.5">
                              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                                <span className="font-bold text-stone-900 text-sm leading-none">{msg.user}</span>
                                {msg.type === 'verse' && <span className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full font-bold">Versículo</span>}
                                {msg.type === 'goal' && <span className="text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded-full font-bold">Meta</span>}
                                {msg.isPinned && <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-bold flex items-center gap-0.5"><Pin size={9} /> Fixado</span>}
                              </div>
                              <span className="text-[10px] text-stone-400 shrink-0">{msg.timestamp}</span>
                            </div>
                            
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
                                        disabled={false}
                                        className={`w-full text-left p-2 rounded-xl border text-sm relative overflow-hidden transition-all z-10 ${
                                          votedForThis ? 'border-indigo-500 bg-indigo-50/50' : 'border-stone-200 hover:border-indigo-300 bg-white'
                                        }`}
                                      >
                                        <div className="flex justify-between relative z-20">
                                          <span className={votedForThis ? 'font-bold text-indigo-900' : 'text-stone-700'}>{opt.text}</span>
                                          {hasVoted && <span className="text-stone-500 font-medium">{percentage}%</span>}
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
                                </div>
                                
                                {!isCurrentUserAdmin && !msg.questionBox.answers.some(ans => ans.userEmail === (profile.email || 'me')) && (
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

                                {!isCurrentUserAdmin && msg.questionBox.answers.some(ans => ans.userEmail === (profile.email || 'me')) && (
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
                                              <span className="text-[10px] text-stone-400">{ans.timestamp}</span>
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

                            {/* Reactions + Admin actions */}
                            <div className="mt-2.5 flex items-center justify-between gap-2">
                              <div className="flex flex-wrap items-center gap-1.5">
                                {msg.reactions && msg.reactions.map(reaction => {
                                  const hasReacted = reaction.users.includes(profile.email || 'me');
                                  return (
                                    <div key={reaction.emoji} className="relative group">
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
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-20 w-max max-w-[200px] bg-stone-800 text-white text-[10px] p-2 rounded-lg shadow-xl">
                                          <p className="font-bold mb-1 border-b border-stone-600 pb-1">Reagiram com {reaction.emoji}</p>
                                          <p>{reaction.users.map(email => activeGroup.members.find(m => m.email === email)?.name || email).join(', ')}</p>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}

                                {/* Add reaction button */}
                                <div className="relative">
                                  <button
                                    onClick={() => setShowReactionMenu(showReactionMenu === msg.id ? null : msg.id)}
                                    className="w-7 h-7 flex items-center justify-center text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
                                  >
                                    <Smile size={15} />
                                  </button>
                                  {showReactionMenu === msg.id && (
                                    <div className="absolute bottom-full left-0 mb-1 bg-white border border-stone-200 shadow-xl rounded-full px-2 py-1 flex gap-1 z-20">
                                      {['🙏', '✨', '🔥'].map(emoji => (
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
                              </div>

                              {/* Admin actions — larger touch targets, right side */}
                              {isCurrentUserAdmin && (
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
                            </div>

                          </div>
                        </div>
                      ))
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
                    <div className="bg-stone-100 text-stone-500 text-sm text-center py-3 rounded-b-2xl border-t border-stone-200">
                      Apenas o administrador pode publicar neste mural.
                    </div>
                  )}
                </div>
              </div>

              {/* Leave / Delete Group — discreto no rodapé */}
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
                      {connections.filter(c => c.status === 'accepted').length === 0 ? (
                        <p className="text-stone-500 text-sm text-center py-4">Você não tem amigos para convidar.</p>
                      ) : (
                        connections.filter(c => c.status === 'accepted').map(conn => (
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
                            <input type="checkbox" className="w-5 h-5 rounded border-stone-300 text-indigo-600 focus:ring-indigo-500" />
                          </label>
                        ))
                      )}
                    </div>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setShowInviteModal(false)} className="px-4 py-2 text-stone-500 font-medium">Cancelar</button>
                      <button onClick={() => { alert('Convites enviados!'); setShowInviteModal(false); }} className="px-4 py-2 bg-indigo-600 text-white rounded-xl font-bold">Enviar</button>
                    </div>
                  </div>
                </div>
              )}
                  </>
                );
              })()}
            </motion.div>
          ) : activeTab === 'feed' && (
            <div className="space-y-2">
              <h4 className="text-[11px] font-bold text-stone-400 uppercase tracking-wider px-1 mb-2">Atividades Recentes</h4>
              {mockFeed.map(item => (
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

          {activeTab === 'ranking' && (
            <div className="space-y-3">
              <h4 className="text-sm font-bold text-stone-400 uppercase tracking-wider px-1 mb-4">Ranking Semanal</h4>
              <div className="space-y-2.5">
                {mockRanking.map((user) => (
                  <div key={user.id} className={`flex items-center justify-between p-3 rounded-2xl border ${
                    user.position === 1 ? 'bg-amber-50 border-amber-200' :
                    user.position === 2 ? 'bg-stone-100 border-stone-300' :
                    user.position === 3 ? 'bg-orange-50 border-orange-200' :
                    'bg-white border-stone-100'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        user.position === 1 ? 'bg-amber-400 text-amber-900' :
                        user.position === 2 ? 'bg-stone-300 text-stone-800' :
                        user.position === 3 ? 'bg-orange-300 text-orange-900' :
                        'bg-stone-100 text-stone-500'
                      }`}>
                        {user.position}
                      </div>
                      <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-lg border border-stone-200 overflow-hidden shrink-0">
                        {user.avatarUrl ? (
                          <img src={user.avatarUrl} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : (
                          AVATARS.find(a => a.id === user.avatarId)?.emoji || '👤'
                        )}
                      </div>
                      <p className="font-bold text-stone-900 text-sm">{user.name}</p>
                    </div>
                    <div className="font-mono font-bold text-indigo-600 text-sm">
                      {user.points} pts
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

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
                            className="px-3.5 py-2.5 bg-stone-100 text-stone-400 rounded-xl hover:bg-stone-200 hover:text-stone-600 active:scale-95 transition-all"
                            title="Recusar"
                          >
                            <X size={16} />
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
                    onClick={() => setActiveGroup(group)}
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
                          <div className="h-full bg-indigo-500 rounded-full transition-all" style={{ width: `${calculateGroupProgress(group.members)}%` }}></div>
                        </div>
                        <span className="text-xs font-bold text-stone-500 shrink-0">{calculateGroupProgress(group.members)}%</span>
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
                        <ThumbsUp size={13} />
                        {prayer.hasPrayed ? 'Orei por isso' : 'Vou orar'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'friends' && !activeGroup && (
            <>
              {/* Search */}
          <div className="flex flex-col sm:flex-row gap-2 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" size={18} />
              <input 
                type="text" 
                placeholder="Buscar por nome ou email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
              />
            </div>
            <button 
              onClick={handleSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="px-5 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-colors disabled:opacity-50 text-sm active:scale-95"
            >
              {isSearching ? '...' : 'Buscar'}
            </button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-8 space-y-3">
              <h4 className="text-sm font-bold text-stone-400 uppercase tracking-wider px-2">Resultados da Busca</h4>
              {searchResults.map((user) => {
                const isConnected = connections.find(c => c.user.email === user.email);
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
                        <p className="font-bold text-stone-900 text-base">{user.name}</p>
                        <p className="text-sm text-stone-500">{user.email}</p>
                      </div>
                    </div>
                    {!isConnected ? (
                      <button 
                        onClick={() => handleRequestConnection(user.email)}
                        className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 rounded-xl border border-indigo-200 hover:bg-indigo-50 transition-colors font-bold text-sm"
                      >
                        <UserPlus size={18} />
                        <span className="hidden sm:inline">Conectar</span>
                      </button>
                    ) : (
                      <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-3 py-1.5 rounded-xl">
                        {isConnected.status === 'pending' ? 'Pendente' : 'Conectado'}
                      </span>
                    )}
                  </div>
                );
              })}
            </motion.div>
          )}

          {/* Pending Requests */}
          {connections.some(c => c.status === 'pending' && !c.isRequester) && (
            <div className="mb-8 space-y-3">
              <h4 className="text-sm font-bold text-rose-700 uppercase tracking-wider px-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-rose-700 animate-pulse"></span>
                Convites Recebidos
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
                      <p className="font-bold text-stone-900 text-base">{conn.user.name}</p>
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

          {/* Connections List */}
          <div className="space-y-4">
            <h4 className="text-sm font-bold text-stone-400 uppercase tracking-wider px-2">Meus Amigos</h4>
            {connections.filter(c => c.status === 'accepted').length === 0 ? (
              <div className="text-center py-12 bg-stone-50 rounded-3xl border border-dashed border-stone-200">
                <Users size={32} className="mx-auto text-stone-300 mb-3" />
                <p className="text-stone-500 font-medium">Você ainda não tem amigos conectados.</p>
                <p className="text-sm text-stone-400 mt-1">Busque por nome ou email acima para começar.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {connections.filter(c => c.status === 'accepted').map((conn) => (
                  <div key={conn.user.email} className="flex items-center justify-between p-4 bg-white rounded-2xl border border-stone-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <div className="w-12 h-12 rounded-full bg-stone-50 flex items-center justify-center text-2xl border border-stone-200 overflow-hidden">
                          {conn.user.avatarUrl ? (
                            <img src={conn.user.avatarUrl} alt={conn.user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            AVATARS.find(a => a.id === conn.user.avatarId)?.emoji || '👤'
                          )}
                        </div>
                        <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white rounded-full"></div>
                      </div>
                      <div>
                        <p className="font-bold text-stone-900 text-base">{conn.user.name}</p>
                        <div className="flex items-center gap-1 text-xs text-stone-400 mt-0.5">
                          <Clock size={12} />
                          <span>Visto {getLastOnline(conn.user.email)}</span>
                        </div>
                      </div>
                    </div>
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

        </div>
      </div>
    </div>
  );
}
