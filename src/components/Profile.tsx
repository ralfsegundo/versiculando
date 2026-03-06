import React, { useState, useRef, useEffect } from 'react';
import { useGamification, BADGES, BadgeId, AVATARS } from '../services/gamification';
import { Flame, Star, Trophy, Target, Award, Lock, Calendar, BookOpen, Heart, Edit3, Share2, X, Download, Instagram, MessageCircle, Clock, Users, Search, UserPlus, Check, UserMinus, Upload, Shield } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import { sharingService, Connection } from '../services/sharingService';

const TITLES = [
  { name: 'Iniciante', min: 0, max: 100 },
  { name: 'Discípulo', min: 101, max: 500 },
  { name: 'Apóstolo', min: 501, max: 2000 },
  { name: 'Profeta', min: 2001, max: 4999 },
  { name: 'Santo', min: 5000, max: Infinity },
];

export default function Profile({ isAdmin = false, onOpenAdmin }: { isAdmin?: boolean; onOpenAdmin?: () => void }) {
  const { profile, badges, weeklyChallenge, updateProfile, userId } = useGamification();
  const [isAvatarModalOpen, setIsAvatarModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState(profile.name);
  const [editEmail, setEditEmail] = useState(profile.email || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [showPointsBreakdown, setShowPointsBreakdown] = useState(false);
  const [pointsButtonRect, setPointsButtonRect] = useState<DOMRect | null>(null);
  const pointsButtonRef = useRef<HTMLButtonElement>(null);
  const shareRef = useRef<HTMLDivElement>(null);

  // Social State
  const [connections, setConnections] = useState<Connection[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const hasSupabase = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      if (hasSupabase) {
        const { supabase } = await import('../lib/supabase');
        
        // Update auth email if changed
        if (editEmail !== profile.email) {
          const { error: authError } = await supabase.auth.updateUser({ email: editEmail });
          if (authError) throw authError;
        }

        // Update profile name (usa userId já disponível no contexto)
        if (userId) {
          const { error: profileError } = await supabase
            .from('profiles')
            .update({ name: editName, email: editEmail })
            .eq('id', userId);
          if (profileError) throw profileError;
        }
      }
      
      updateProfile({ name: editName, email: editEmail });
      setIsEditModalOpen(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      alert(error.message || 'Erro ao atualizar perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      if (hasSupabase) {
        const { supabase } = await import('../lib/supabase');
        await supabase.auth.signOut();
      }
      // Limpa todo o localStorage
      localStorage.clear();

      // Remove Service Workers
      if ('serviceWorker' in navigator) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const r of registrations) await r.unregister();
      }

      // Limpa cache do PWA
      const cacheNames = await caches.keys();
      for (const name of cacheNames) await caches.delete(name);

      window.location.reload();
    } catch (error) {
      console.error('Error logging out:', error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  useEffect(() => {
    if (profile.email) {
      loadConnections();
      const removeListener = sharingService.addListener((data) => {
        if (data.type === 'CONNECTION_REQUEST' || data.type === 'CONNECTION_ACCEPTED') {
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
    const results = await sharingService.searchUsers(searchQuery);
    setSearchResults(results.filter((u: any) => u.email !== profile.email));
    setIsSearching(false);
  };

  const handleRequestConnection = async (toEmail: string) => {
    if (profile.email) {
      await sharingService.requestConnection(profile.email, toEmail);
      loadConnections();
      setSearchResults([]);
      setSearchQuery('');
    }
  };

  const handleRespond = async (fromEmail: string, status: 'accepted' | 'rejected') => {
    if (profile.email) {
      await sharingService.respondToConnection(fromEmail, profile.email, status);
      loadConnections();
    }
  };

  const getFlameSize = (streak: number) => {
    if (streak >= 30) return 'w-16 h-16 text-orange-500';
    if (streak >= 7) return 'w-12 h-12 text-orange-400';
    return 'w-8 h-8 text-orange-300';
  };

  const getFlameBg = (streak: number) => {
    if (streak >= 30) return 'bg-orange-100 border-orange-200';
    if (streak >= 7) return 'bg-orange-50 border-orange-100';
    return 'bg-stone-50 border-stone-200';
  };

  const completedPercentage = Math.round((profile.completedBooks.length / 73) * 100);

  // --- Title Progress Logic ---
  const currentTitleIndex = TITLES.findIndex(t => t.name === profile.title);
  const nextTitle = TITLES[currentTitleIndex + 1];
  const currentTitleDef = TITLES[currentTitleIndex];
  
  let titleProgress = 100;
  if (nextTitle) {
    const pointsInCurrentTier = profile.points - currentTitleDef.min;
    const pointsNeededForNextTier = nextTitle.min - currentTitleDef.min;
    titleProgress = Math.min(100, Math.max(0, (pointsInCurrentTier / pointsNeededForNextTier) * 100));
  }

  // --- Next Achievement Logic ---
  const getNextAchievement = () => {
    const lockedBadges = (Object.keys(BADGES) as BadgeId[]).filter(id => !badges.find(b => b.id === id));
    if (lockedBadges.length === 0) return null;

    // Prioritize specific badges based on progress
    if (lockedBadges.includes('escriba')) {
      return { ...BADGES['escriba'], missing: `Faça mais ${10 - profile.notesCount} anotações para desbloquear Escriba`, progress: (profile.notesCount / 10) * 100 };
    }
    if (lockedBadges.includes('coracao_aberto')) {
      return { ...BADGES['coracao_aberto'], missing: `Favorite mais ${20 - profile.favoritesCount} versículos para desbloquear Coração Aberto`, progress: (profile.favoritesCount / 20) * 100 };
    }
    if (lockedBadges.includes('madrugador')) {
      return { ...BADGES['madrugador'], missing: `Acesse o versículo do dia mais ${30 - profile.dailyVerseCount} vezes para desbloquear Madrugador`, progress: (profile.dailyVerseCount / 30) * 100 };
    }
    
    // Fallback to first locked
    const firstLocked = BADGES[lockedBadges[0]];
    return { ...firstLocked, missing: `Continue sua jornada para desbloquear ${firstLocked.title}`, progress: 0 };
  };
  const nextAchievement = getNextAchievement();

  // --- Weekly Activity Logic ---
  const today = new Date();
  const currentDayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Get start of current week (Sunday)
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - currentDayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);

  const weekDays = Array.from({ length: 7 }).map((_, i) => {
    const date = new Date(startOfWeek);
    date.setDate(startOfWeek.getDate() + i);
    const dateString = date.toISOString().split('T')[0];
    
    // Check if user has activity on this day
    const hasActivity = profile.weeklyActivity?.some(actDate => actDate.startsWith(dateString));
    const isToday = i === currentDayOfWeek;
    
    return { day: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][i], hasActivity, isToday };
  });
  const activeDaysCount = weekDays.filter(d => d.hasActivity).length;

  // --- Share Logic ---
  const handleShare = async () => {
    if (!shareRef.current) return;
    setIsSharing(true);
    try {
      const canvas = await html2canvas(shareRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#fdfbf7',
      });
      
      const image = canvas.toDataURL('image/png');
      
      // Try native share first
      if (navigator.share) {
        try {
          // Convert data URL to blob manually to avoid fetch issues with data URLs in some environments
          const byteString = atob(image.split(',')[1]);
          const mimeString = image.split(',')[0].split(':')[1].split(';')[0];
          const ab = new ArrayBuffer(byteString.length);
          const ia = new Uint8Array(ab);
          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
          }
          const blob = new Blob([ab], { type: mimeString });
          
          const file = new File([blob], 'minha-jornada-biblica.png', { type: 'image/png' });
          await navigator.share({
            title: 'Minha Jornada Bíblica',
            text: `Estou estudando a Bíblia Católica completa! Já concluí ${completedPercentage}% e desbloqueei ${badges.length} conquistas.`,
            files: [file]
          });
          setIsSharing(false);
          return;
        } catch (e) {
          console.log('Native share failed or cancelled', e);
        }
      }
      
      // Fallback to download
      const link = document.createElement('a');
      link.href = image;
      link.download = 'minha-jornada-biblica.png';
      link.click();
      
    } catch (error) {
      console.error('Error generating share image:', error);
      alert('Não foi possível gerar a imagem para compartilhamento.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      updateProfile({ avatarUrl: base64String, avatarId: undefined });
      setIsAvatarModalOpen(false);
    };
    reader.readAsDataURL(file);
  };

  const currentAvatar = AVATARS.find(a => a.id === profile.avatarId) || AVATARS[0];

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-stone-900 font-sans pb-28 pt-6 md:pt-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header Profile */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-stone-100 mb-4 relative overflow-hidden">
          <div className="flex items-center gap-3 mb-3">
            <button onClick={() => setIsAvatarModalOpen(true)} className="w-14 h-14 rounded-full bg-rose-100 flex items-center justify-center text-3xl font-bold border-[3px] border-amber-400 shadow-md hover:scale-105 transition-transform relative group overflow-hidden shrink-0" title="Mudar Avatar">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : currentAvatar.emoji}
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Edit3 size={16} className="text-white" /></div>
            </button>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <h1 className="text-base font-serif font-bold text-stone-900 leading-tight truncate">{profile.name}</h1>
                <button onClick={() => setIsEditModalOpen(true)} className="p-1.5 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors" title="Editar Perfil">
                  <Edit3 size={14} />
                </button>
              </div>
              {profile.joinDate && <p className="text-[11px] text-stone-400 mt-0.5">⛪ {new Date(profile.joinDate).toLocaleDateString('pt-BR')}</p>}
            </div>
          </div>
          <div className="flex items-center gap-2 mb-2.5">
            <span className="bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full text-xs font-semibold flex items-center gap-1">
              <Award size={12} />{profile.title}
            </span>
            <div className="relative">
              <button
                ref={pointsButtonRef}
                onClick={() => { if (pointsButtonRef.current) setPointsButtonRect(pointsButtonRef.current.getBoundingClientRect()); setShowPointsBreakdown(v => !v); }}
                className="bg-stone-100 text-stone-600 px-2.5 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 hover:bg-stone-200 transition-colors"
              >
                <Star size={12} className="text-amber-500 fill-amber-500" />
                {profile.points} pts
              </button>
              <AnimatePresence>
                {showPointsBreakdown && pointsButtonRect && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowPointsBreakdown(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="fixed bg-stone-900 text-white text-xs p-3.5 rounded-2xl shadow-2xl z-50"
                      style={{ width: 'min(230px, 80vw)', top: pointsButtonRect.bottom + 8, right: window.innerWidth - pointsButtonRect.right }}
                    >
                      <div className="absolute -top-1.5 right-5 w-3 h-3 bg-stone-900 rotate-45 rounded-sm" />
                      <p className="text-stone-400 font-bold uppercase tracking-wider text-[10px] mb-2">Detalhamento</p>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center gap-4"><span className="text-stone-400">Exploração livre</span><span className="font-bold">{profile.pointsBreakdown?.freeExploration || 0} pts</span></div>
                        <div className="flex justify-between items-center gap-4"><span className="text-stone-400">Trilha do Discípulo</span><span className="font-bold text-amber-400">{profile.pointsBreakdown?.discipleTrail || 0} pts</span></div>
                        <div className="flex justify-between items-center gap-4"><span className="text-stone-400">Bônus de fases</span><span className="font-bold text-orange-400">{profile.pointsBreakdown?.bonus || 0} pts</span></div>
                        <div className="pt-2 border-t border-stone-700 flex justify-between items-center gap-4"><span className="font-bold text-white">Total</span><span className="font-black text-amber-400">{profile.points} pts</span></div>
                      </div>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
          {nextTitle && (
            <div className="group relative">
              <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${titleProgress}%` }} transition={{ duration: 1, ease: "easeOut" }} className="h-full bg-amber-400 rounded-full" />
              </div>
              <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-stone-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-40">
                {profile.points} / {nextTitle.min} pts para {nextTitle.name}
              </div>
            </div>
          )}
        </div>

                {/* Stats Grid — estilo Duolingo */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {/* Streak — destaque maior */}
          <div className={`col-span-3 rounded-2xl p-3.5 border-2 flex items-center gap-3 overflow-hidden relative ${
            profile.streak >= 7 ? 'bg-gradient-to-r from-orange-500 to-amber-400 border-orange-400' :
            profile.streak >= 1 ? 'bg-orange-50 border-orange-200' :
            'bg-stone-50 border-stone-200'
          }`}>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-5xl opacity-10 pointer-events-none select-none">🔥</div>
            <motion.div
              animate={profile.streak >= 1 ? { rotate: [-3, 3, -3] } : {}}
              transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
              className="text-3xl leading-none"
            >🔥</motion.div>
            <div className="flex-1 min-w-0">
              <p className={`text-2xl font-black leading-none ${profile.streak >= 7 ? 'text-white' : 'text-stone-900'}`}>
                {profile.streak} <span className={`text-base font-semibold ${profile.streak >= 7 ? 'text-white/80' : 'text-stone-500'}`}>{profile.streak === 1 ? 'dia' : 'dias'}</span>
              </p>
              <p className={`text-xs font-bold mt-0.5 ${profile.streak >= 7 ? 'text-white/80' : 'text-stone-500'}`}>
                {profile.streak === 0 ? 'Comece hoje!' : profile.streak < 7 ? `Faltam ${7 - profile.streak} para 7 🔥` : profile.streak < 30 ? `Rumo a 30 dias!` : '30+ dias! Incrível! 🏆'}
              </p>
            </div>
            <div className={`shrink-0 text-right ${profile.streak >= 7 ? 'text-white/80' : 'text-stone-400'}`}>
              <p className="text-[10px] font-bold uppercase tracking-wider">melhor</p>
              <p className={`text-lg font-black ${profile.streak >= 7 ? 'text-white' : 'text-stone-700'}`}>{Math.max(profile.streak, profile.longestStreak || 0)}</p>
            </div>
          </div>

          {/* Livros */}
          <div className="bg-white rounded-xl p-3 border border-stone-100 shadow-sm flex flex-col items-center gap-1 text-center">
            <div className="text-xl">📚</div>
            <span className="text-lg font-black text-stone-900 leading-none">{profile.completedBooks.length}</span>
            <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wide leading-tight">Livros</span>
            <div className="w-full h-1 bg-stone-100 rounded-full overflow-hidden mt-1">
              <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${(profile.completedBooks.length / 73) * 100}%` }} />
            </div>
          </div>

          {/* Anotações */}
          <div className="bg-white rounded-xl p-3 border border-stone-100 shadow-sm flex flex-col items-center gap-1 text-center">
            <div className="text-xl">✏️</div>
            <span className="text-lg font-black text-stone-900 leading-none">{profile.notesCount}</span>
            <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wide leading-tight">Anotações</span>
          </div>

          {/* Favoritos */}
          <div className="bg-white rounded-xl p-3 border border-stone-100 shadow-sm flex flex-col items-center gap-1 text-center">
            <div className="text-xl">❤️</div>
            <span className="text-lg font-black text-stone-900 leading-none">{profile.favoritesCount}</span>
            <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wide leading-tight">Favoritos</span>
          </div>
        </div>

        {/* Next Achievement Card — mais impactante */}
        {nextAchievement && (
          <div className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl p-4 border-2 border-amber-200 mb-4 flex items-center gap-3 relative overflow-hidden">
            <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-amber-100/50 to-transparent pointer-events-none" />
            <div className="w-14 h-14 rounded-2xl bg-white border-2 border-amber-100 flex items-center justify-center text-3xl shrink-0 shadow-sm">
              {nextAchievement.emoji}
            </div>
            <div className="flex-1 min-w-0 relative z-10">
              <p className="text-[9px] text-amber-600 font-black uppercase tracking-widest mb-0.5">🎯 Quase lá!</p>
              <p className="font-black text-stone-900 text-sm leading-tight">{nextAchievement.title}</p>
              <p className="text-stone-500 text-xs mt-0.5 mb-2 leading-snug line-clamp-1">{nextAchievement.missing}</p>
              <div className="w-full h-2 bg-amber-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${nextAchievement.progress}%` }}
                  transition={{ duration: 1.2, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #f59e0b, #fbbf24)' }}
                />
              </div>
              <p className="text-[10px] text-amber-600 font-bold mt-1">{Math.round(nextAchievement.progress)}%</p>
            </div>
          </div>
        )}

        {/* Weekly Challenge */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4 border border-purple-100 mb-4 relative overflow-hidden">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center">
                <Calendar size={15} className="text-purple-600" />
              </div>
              <h3 className="font-bold text-purple-900 text-sm">Desafio da Semana</h3>
            </div>
            <div className="bg-amber-400 text-amber-900 px-2.5 py-1 rounded-lg flex items-center gap-1 shrink-0 font-bold text-xs">
              <Star size={12} className="fill-amber-900" />
              +{weeklyChallenge.rewardPoints} pts
            </div>
          </div>
          
          <p className="text-purple-900 font-bold text-base leading-tight mb-1">
            {weeklyChallenge.title}
          </p>
          <p className="text-purple-700/70 text-xs mb-3">
            {weeklyChallenge.description}
          </p>
          
          <div className="flex justify-between text-xs text-purple-800 mb-1.5 font-bold">
            <span>Progresso</span>
            <span>{weeklyChallenge.progress} / {weeklyChallenge.target}</span>
          </div>
          <div className="w-full h-2 bg-purple-100 rounded-full overflow-hidden mb-2">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${(weeklyChallenge.progress / weeklyChallenge.target) * 100}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-gradient-to-r from-purple-500 to-fuchsia-500 rounded-full"
            />
          </div>
          <div className="text-[10px] text-purple-500 font-medium flex items-center gap-1">
            <Clock size={10} />
            Termina em {Math.ceil((new Date(weeklyChallenge.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} dias
          </div>
        </div>

        {/* Weekly Activity Chart - includes progress */}
        <div className="bg-white rounded-2xl p-3.5 border border-stone-100 shadow-sm mb-4">
          <div className="flex justify-between items-center mb-2.5">
            <h3 className="font-bold text-stone-900 text-sm">Atividade — 12 semanas</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-emerald-600">{completedPercentage}%</span>
              <div className="w-14 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${completedPercentage}%` }} transition={{ duration: 1 }} className="h-full bg-emerald-500 rounded-full" />
              </div>
            </div>
          </div>

          {/* Contribution graph — 12 semanas × 7 dias */}
          {(() => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const WEEKS = 12;
            const totalDays = WEEKS * 7;
            // Alinha para domingo anterior
            const startDate = new Date(today);
            startDate.setDate(today.getDate() - (today.getDay()) - (WEEKS - 1) * 7);

            const activitySet = new Set(
              (profile.weeklyActivity || []).map(d => d.split('T')[0])
            );

            // Build grid: columns = weeks, rows = days of week
            const weeks: { date: Date; active: boolean; isToday: boolean; isFuture: boolean }[][] = [];
            for (let w = 0; w < WEEKS; w++) {
              const week = [];
              for (let d = 0; d < 7; d++) {
                const date = new Date(startDate);
                date.setDate(startDate.getDate() + w * 7 + d);
                const dateStr = date.toISOString().split('T')[0];
                week.push({
                  date,
                  active: activitySet.has(dateStr),
                  isToday: dateStr === today.toISOString().split('T')[0],
                  isFuture: date > today,
                });
              }
              weeks.push(week);
            }

            const monthLabels = weeks.map((week, i) => {
              const firstDay = week[0].date;
              return (i === 0 || firstDay.getDate() <= 7)
                ? { idx: i, label: firstDay.toLocaleDateString('pt-BR', { month: 'short' }) }
                : null;
            }).filter(Boolean);

            const totalActive = [...activitySet].filter(d => {
              const date = new Date(d);
              return date >= startDate && date <= today;
            }).length;

            return (
              <div className="overflow-x-auto pb-1">
                {/* Month labels */}
                <div className="flex gap-[3px] mb-1 ml-0">
                  {weeks.map((_, i) => {
                    const label = monthLabels.find(m => m?.idx === i);
                    return (
                      <div key={i} className="w-[14px] flex-shrink-0">
                        {label && (
                          <span className="text-[8px] text-stone-400 font-medium capitalize">
                            {label.label.replace('.', '')}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
                {/* Grid */}
                <div className="flex gap-[3px]">
                  {weeks.map((week, wi) => (
                    <div key={wi} className="flex flex-col gap-[3px]">
                      {week.map((day, di) => (
                        <div
                          key={di}
                          title={day.date.toLocaleDateString('pt-BR')}
                          className={`w-[14px] h-[14px] rounded-[3px] flex-shrink-0 transition-all ${
                            day.isFuture
                              ? 'bg-stone-100'
                              : day.active
                              ? 'bg-amber-400'
                              : 'bg-stone-100'
                          } ${day.isToday ? 'ring-1 ring-amber-500 ring-offset-[1px]' : ''}`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-stone-500">
                    <strong className="text-stone-900">{totalActive}</strong> dias ativos nas últimas 12 semanas
                  </p>
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-stone-400">menos</span>
                    <div className="w-2.5 h-2.5 rounded-[2px] bg-stone-100" />
                    <div className="w-2.5 h-2.5 rounded-[2px] bg-amber-200" />
                    <div className="w-2.5 h-2.5 rounded-[2px] bg-amber-400" />
                    <span className="text-[10px] text-stone-400">mais</span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>

        {/* Badges */}
        <div>
          <h2 className="text-base font-bold text-stone-900 mb-3 flex items-center gap-2">
            <Trophy size={18} className="text-amber-500" />
            Minhas Conquistas
          </h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {(Object.keys(BADGES) as BadgeId[]).map((badgeId) => {
              const badgeDef = BADGES[badgeId];
              const unlockedBadge = badges.find(b => b.id === badgeId);
              const isUnlocked = !!unlockedBadge;

              return (
                <div 
                  key={badgeId}
                  className={`relative p-4 rounded-2xl border flex flex-col items-center text-center transition-all min-h-[140px] justify-center ${
                    isUnlocked 
                      ? 'bg-white border-amber-200 shadow-sm ring-1 ring-amber-100/50' 
                      : 'bg-stone-50/80 border-stone-100'
                  }`}
                >
                  {!isUnlocked && (
                    <div className="absolute top-3 right-3 text-stone-300">
                      <Lock size={14} />
                    </div>
                  )}
                  <div className={`text-3xl mb-2 transition-all ${isUnlocked ? 'scale-110' : 'grayscale opacity-30'}`}>
                    {isUnlocked ? badgeDef.emoji : '🔒'}
                  </div>
                  <h4 className={`font-bold text-sm mb-1 leading-tight ${isUnlocked ? 'text-stone-900' : 'text-stone-400'}`}>
                    {isUnlocked ? badgeDef.title : '???'}
                  </h4>
                  <p className="text-[11px] text-stone-500 leading-relaxed px-1">
                    {isUnlocked ? badgeDef.description : 'Continue sua jornada para descobrir'}
                  </p>
                  {isUnlocked && unlockedBadge.unlockedAt && (
                    <span className="text-[10px] text-amber-700 font-bold mt-2 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-100">
                      {new Date(unlockedBadge.unlockedAt).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Avatar Selection Modal */}
      <AnimatePresence>
        {isAvatarModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm"
            onClick={() => setIsAvatarModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-serif font-bold text-stone-900">Escolha seu Avatar</h2>
                <button 
                  onClick={() => setIsAvatarModalOpen(false)}
                  className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="mb-6">
                <label className="flex items-center justify-center gap-2 w-full p-4 border-2 border-dashed border-stone-200 rounded-2xl bg-stone-50 hover:bg-stone-100 hover:border-indigo-300 transition-colors cursor-pointer text-stone-600 font-medium">
                  <Upload size={20} className="text-indigo-500" />
                  Carregar Foto do Dispositivo
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleFileUpload}
                  />
                </label>
              </div>
              
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                {AVATARS.map(avatar => (
                  <button
                    key={avatar.id}
                    onClick={() => {
                      updateProfile({ avatarId: avatar.id, avatarUrl: undefined });
                      setIsAvatarModalOpen(false);
                    }}
                    className={`flex flex-col items-center gap-2 p-3 rounded-2xl transition-all ${
                      profile.avatarId === avatar.id && !profile.avatarUrl
                        ? 'bg-amber-50 border-2 border-amber-400 shadow-sm' 
                        : 'bg-stone-50 border-2 border-transparent hover:bg-stone-100'
                    }`}
                  >
                    <span className="text-3xl">{avatar.emoji}</span>
                    <span className="text-[10px] font-bold text-stone-600 text-center leading-tight">{avatar.name}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Profile Modal */}
      <AnimatePresence>
        {isEditModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-sm"
            onClick={() => setIsEditModalOpen(false)}
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl p-6 md:p-8 max-w-md w-full shadow-xl"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-serif font-bold text-stone-900">Editar Perfil</h2>
                <button 
                  onClick={() => setIsEditModalOpen(false)}
                  className="p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-4 mb-8">
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1">Nome</label>
                  <input 
                    type="text" 
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none transition-all"
                    placeholder="Seu nome"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-stone-700 mb-1">Email</label>
                  <input 
                    type="email" 
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-stone-200 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20 outline-none transition-all"
                    placeholder="seu@email.com"
                  />
                  <p className="text-xs text-stone-500 mt-1">
                    Se você alterar seu email, precisará confirmá-lo no novo endereço.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                <button 
                  onClick={handleSaveProfile}
                  disabled={isSaving || !editName.trim() || !editEmail.trim()}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Check size={20} />
                      Salvar Alterações
                    </>
                  )}
                </button>
                
                <button 
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="w-full bg-stone-100 hover:bg-rose-50 text-stone-600 hover:text-rose-700 font-bold py-3.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isLoggingOut ? (
                    <div className="w-5 h-5 border-2 border-stone-400/30 border-t-stone-400 rounded-full animate-spin" />
                  ) : (
                    'Sair da Conta'
                  )}
                </button>

                {isAdmin && onOpenAdmin && (
                  <button
                    onClick={() => { setIsEditModalOpen(false); onOpenAdmin(); }}
                    className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2"
                  >
                    <Shield size={18} />
                    Painel Admin
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hidden Share View (9:16 format) */}
      <div className="fixed top-0 left-0 -z-50 pointer-events-none opacity-0">
        <div 
          ref={shareRef} 
          className="w-[1080px] h-[1920px] bg-[#fdfbf7] flex flex-col items-center justify-center p-20 relative overflow-hidden"
        >
          {/* Decorative Background */}
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-rose-50/50 via-[#fdfbf7] to-amber-50/50"></div>
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-rose-100 rounded-full blur-3xl opacity-50"></div>
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-amber-100 rounded-full blur-3xl opacity-50"></div>

          <div className="relative z-10 flex flex-col items-center w-full max-w-2xl bg-white/80 backdrop-blur-md p-16 rounded-[3rem] shadow-2xl border border-white">
            <div className="w-48 h-48 rounded-full bg-rose-100 flex items-center justify-center text-8xl font-bold border-8 border-amber-400 shadow-xl mb-12 overflow-hidden">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                currentAvatar.emoji
              )}
            </div>
            
            <h1 className="text-6xl font-serif font-bold text-stone-900 mb-4 text-center">{profile.name}</h1>
            
            <div className="flex items-center gap-4 mb-16">
              <span className="bg-rose-100 text-rose-800 px-6 py-2 rounded-full text-2xl font-semibold flex items-center gap-2">
                <Award size={32} />
                {profile.title}
              </span>
              <span className="bg-stone-100 text-stone-600 px-6 py-2 rounded-full text-2xl font-medium flex items-center gap-2">
                <Star size={32} className="text-amber-500 fill-amber-500" />
                {profile.points} pts
              </span>
            </div>

            <div className="w-full bg-stone-50 rounded-3xl p-10 border border-stone-200 mb-16">
              <h3 className="text-3xl font-bold text-stone-900 mb-8 text-center">Minha Jornada Bíblica</h3>
              
              <div className="flex justify-between items-end mb-4">
                <span className="text-2xl text-stone-500 font-medium">Progresso de Leitura</span>
                <span className="text-4xl font-black text-emerald-600">{completedPercentage}%</span>
              </div>
              <div className="w-full h-6 bg-stone-200 rounded-full overflow-hidden mb-12">
                <div 
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${completedPercentage}%` }}
                />
              </div>

              <div className="grid grid-cols-2 gap-8">
                <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm flex flex-col items-center justify-center text-center">
                  <Trophy size={48} className="text-amber-500 mb-4" />
                  <span className="text-5xl font-black text-stone-900 mb-2">{badges.length}</span>
                  <span className="text-lg font-bold text-stone-500 uppercase tracking-wider">Conquistas</span>
                </div>
                <div className="bg-white rounded-2xl p-6 border border-stone-100 shadow-sm flex flex-col items-center justify-center text-center">
                  <Flame size={48} className="text-orange-500 mb-4" />
                  <span className="text-5xl font-black text-stone-900 mb-2">{profile.streak}</span>
                  <span className="text-lg font-bold text-stone-500 uppercase tracking-wider">Dias Seguidos</span>
                </div>
              </div>
            </div>

            <p className="text-3xl font-serif italic text-stone-600 text-center leading-relaxed">
              "Estou estudando a Bíblia Católica completa no Versiculando."
            </p>
          </div>
          
          <div className="absolute bottom-12 text-stone-400 text-2xl font-medium tracking-widest uppercase">
            versiculando.com.br
          </div>
        </div>
      </div>

    </div>
  );
}
