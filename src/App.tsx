import { useState, useEffect, useCallback, useRef } from 'react';
import Home from './components/Home';
import BookDetail from './components/BookDetail';
import Profile from './components/Profile';
import JourneyMap from './components/JourneyMap';
import Navigation from './components/Navigation';
import Community from './components/Community';
import Onboarding, { OnboardingProfile, getWelcomeConfig } from './components/Onboarding';
import Trails from './components/Trails';
import TrailDetail from './components/TrailDetail';
import OfflineBanner from './components/OfflineBanner';
import NotificationPrompt from './components/NotificationBanner';
import Admin from './components/Admin';
import { GamificationProvider, useGamification } from './services/gamification';

// Wrapper interno — lê streak e trigger do contexto, passa ao prompt
function StreakNotificationBanner() {
  const { profile, notificationTrigger, clearNotificationTrigger } = useGamification();
  return (
    <NotificationPrompt
      streak={profile.streak}
      trigger={notificationTrigger}
      onDone={clearNotificationTrigger}
    />
  );
}
import { supabase } from './lib/supabase';
import { prefetchBooks } from './services/bookData';
import Auth from './components/Auth';
import { Session } from '@supabase/supabase-js';
import { Trail } from './services/trails';
import { BEGINNER_PATH, BIBLE_BOOKS } from './constants';

// Email do administrador — só este usuário vê o acesso ao painel admin
const ADMIN_EMAIL = 'ralfsegundo@gmail.com';

// Registra o Service Worker para modo offline (apenas em produção real)
const isAIStudio = window.location.hostname.includes('run.app') || window.location.hostname.includes('aistudio');
if ('serviceWorker' in navigator && !isAIStudio) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then(reg => console.log('[SW] Registrado:', reg.scope))
      .catch(err => console.error('[SW] Erro:', err));
  });
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false);

  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [selectedTrail, setSelectedTrail] = useState<Trail | null>(null);
  const [currentTab, setCurrentTab] = useState<'home' | 'journey' | 'trails' | 'profile' | 'community'>('home');
  const [homeViewMode, setHomeViewMode] = useState<'canonical' | 'beginners'>(() => {
    const savedProfile = localStorage.getItem('onboarding_profile');
    if (savedProfile) {
      try {
        const profile = JSON.parse(savedProfile);
        return profile.experience === 'regular' && profile.goal === 'complete'
          ? 'canonical'
          : 'beginners';
      } catch { return 'beginners'; }
    }
    return 'beginners';
  });

  // ── Botão voltar no PWA (Android) ────────────────────────────
  const [showExitToast, setShowExitToast] = useState(false);
  const exitToastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selectedBookIdRef = useRef<string | null>(null);
  const selectedTrailRef = useRef<Trail | null>(null);
  const currentTabRef = useRef<'home' | 'journey' | 'trails' | 'profile' | 'community'>('home');
  const showExitToastRef = useRef(false);

  useEffect(() => { selectedBookIdRef.current = selectedBookId; }, [selectedBookId]);
  useEffect(() => { selectedTrailRef.current = selectedTrail; }, [selectedTrail]);
  useEffect(() => { currentTabRef.current = currentTab; }, [currentTab]);
  useEffect(() => { showExitToastRef.current = showExitToast; }, [showExitToast]);

  // Wrappers de navegação
  const pushNavState = useCallback((state: object) => {
    window.history.pushState(state, '');
  }, []);

  const navigateToBook = useCallback((bookId: string) => {
    setSelectedBookId(bookId);
    pushNavState({ type: 'book', bookId });
  }, [pushNavState]);

  const navigateToTrail = useCallback((trail: Trail) => {
    setSelectedTrail(trail);
    pushNavState({ type: 'trail', trailId: trail.id });
  }, [pushNavState]);

  const navigateToTab = useCallback((tab: 'home' | 'journey' | 'trails' | 'profile' | 'community') => {
    setSelectedBookId(null);
    setSelectedTrail(null);
    setCurrentTab(tab);
    if (tab !== 'home') pushNavState({ type: 'tab', tab });
  }, [pushNavState]);

  useEffect(() => {
    // Empurra barreira inicial para o popstate ter algo para interceptar
    window.history.pushState({ type: 'guard' }, '');
    window.history.pushState({ type: 'guard' }, '');

    const handlePopState = () => {
      // Navega para trás dentro do app
      if (selectedBookIdRef.current) {
        setSelectedBookId(null);
        window.history.pushState({ type: 'guard' }, '');
        return;
      }
      if (selectedTrailRef.current) {
        setSelectedTrail(null);
        window.history.pushState({ type: 'guard' }, '');
        return;
      }
      if (currentTabRef.current !== 'home') {
        setCurrentTab('home');
        window.history.pushState({ type: 'guard' }, '');
        return;
      }

      // Está na home — lógica de "toque duas vezes para sair"
      if (showExitToastRef.current) {
        // Segunda vez — deixa o app fechar normalmente (não re-empurra)
        return;
      }

      // Primeira vez — mostra toast e re-empurra barreira
      setShowExitToast(true);
      showExitToastRef.current = true;
      window.history.pushState({ type: 'guard' }, '');

      // Esconde o toast após 2.5s
      if (exitToastTimerRef.current) clearTimeout(exitToastTimerRef.current);
      exitToastTimerRef.current = setTimeout(() => {
        setShowExitToast(false);
        showExitToastRef.current = false;
      }, 2500);
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (exitToastTimerRef.current) clearTimeout(exitToastTimerRef.current);
    };
  }, []);
  // ─────────────────────────────────────────────────────────────
  const [onboardingDone, setOnboardingDone] = useState(
    () => localStorage.getItem('onboarding_done') === 'true'
  );
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(
    () => localStorage.getItem('onboarding_welcome') || null
  );

  const hasSupabase = import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY;

  useEffect(() => {
    if (!hasSupabase) {
      setIsInitializing(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsInitializing(false);

      // Pré-carrega os livros da Trilha do Discípulo em background
      // Roda depois que a UI já está visível, sem bloquear nada
      if (session?.user) {
        const beginnerBookIds = BEGINNER_PATH.flatMap(step => step.books);
        const beginnerBookNames = beginnerBookIds
          .map(id => BIBLE_BOOKS.find(b => b.id === id)?.name)
          .filter(Boolean) as string[];
        setTimeout(() => prefetchBooks(beginnerBookNames), 1500);
      }
    }).catch((err) => {
      console.warn('[App] Erro ao obter sessão:', err);
      setIsInitializing(false);
    });

    // Timeout de segurança — 4s é suficiente para a maioria das conexões
    // Garante que o loading nunca trava mesmo em erros silenciosos de rede
    const timeout = setTimeout(() => setIsInitializing(false), 4000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);
      if (event === 'SIGNED_IN' && session?.user) {
        const savedUserId = localStorage.getItem('current_user_id');
        localStorage.setItem('current_user_id', session.user.id);

        if (savedUserId !== session.user.id) {
          // Usuário diferente neste dispositivo — limpa estado local e faz query ao banco
          localStorage.removeItem('onboarding_done');
          localStorage.removeItem('onboarding_profile');
          localStorage.removeItem('onboarding_welcome');
          localStorage.removeItem('user_profile');
          localStorage.removeItem('user_badges');
          localStorage.removeItem('weekly_challenge');
          // Reseta o prompt de notificação para o novo usuário ver
          localStorage.removeItem('notif_prompt_done_v3');
          localStorage.removeItem('last_active_day_notif');
          // Limpa chaves antigas de Community sem userId (versões anteriores)
          localStorage.removeItem('feed_last_seen_id');
          localStorage.removeItem('groups_last_seen_ts');
          localStorage.removeItem('prayers_last_seen_ts');
          setOnboardingDone(false);
          setWelcomeMessage(null);
          setShowAdmin(false);

          // Verifica se já fez onboarding em outro dispositivo (só quando é usuário novo aqui)
          try {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('onboarding_done')
              .eq('id', session.user.id)
              .single();
            if (profileData?.onboarding_done) {
              localStorage.setItem('onboarding_done', 'true');
              setOnboardingDone(true);
            }
          } catch { /* ignora — onboarding local prevalece */ }
        }
        // Se savedUserId === session.user.id, usa o estado local (não faz query)
      }
    });

    return () => {
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [hasSupabase]);

  const handleOnboardingComplete = async (profile: OnboardingProfile) => {
    const config = getWelcomeConfig(profile);
    localStorage.setItem('onboarding_done', 'true');
    localStorage.setItem('onboarding_profile', JSON.stringify(profile));
    localStorage.setItem('onboarding_welcome', config.message);
    setWelcomeMessage(config.message);
    setHomeViewMode(config.recommendation);
    setOnboardingDone(true);
    navigateToBook(config.startBookId);

    // Salva no banco para persistir entre dispositivos
    if (session?.user?.id) {
      await supabase
        .from('profiles')
        .update({ onboarding_done: true })
        .eq('id', session.user.id);
    }
  };

  const isAdmin = session?.user?.email === ADMIN_EMAIL;

  if (isInitializing) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#fdfbf7] gap-4">
        <div className="relative">
          <div className="w-16 h-16 bg-stone-900 rounded-2xl flex items-center justify-center shadow-xl">
            <span className="text-amber-400 text-2xl">📖</span>
          </div>
          {/* Anel pulsante */}
          <div className="absolute inset-0 rounded-2xl border-2 border-amber-400/50 animate-ping" />
        </div>
        <div className="text-center">
          <p className="font-serif font-bold text-stone-900 text-lg">Versiculando</p>
          <p className="text-stone-400 text-sm mt-0.5">Preparando sua jornada...</p>
        </div>
        <div className="flex gap-1.5 mt-2">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-amber-400 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (hasSupabase && !session) {
    return <Auth onAuthSuccess={() => {}} />;
  }

  if (!onboardingDone) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  // Painel admin — só acessível para o email admin
  if (isAdmin && showAdmin) {
    return <Admin onExit={() => setShowAdmin(false)} />;
  }

  return (
    <GamificationProvider>
      {/* Banner de offline — aparece em todas as telas */}
      <OfflineBanner />
      {/* Banner de permissão de notificação de streak */}
      <StreakNotificationBanner />

      {/* Toast "toque novamente para sair" — estilo Instagram */}
      {showExitToast && (
        <div
          style={{
            position: 'fixed',
            bottom: '80px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(28,25,23,0.92)',
            color: '#fff',
            padding: '10px 22px',
            borderRadius: '24px',
            fontSize: '14px',
            fontWeight: 600,
            zIndex: 9999,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            animation: 'fadeInUp 0.2s ease',
          }}
        >
          Toque novamente para sair
        </div>
      )}

      {selectedBookId ? (
        <BookDetail bookId={selectedBookId} onBack={() => setSelectedBookId(null)} />
      ) : selectedTrail ? (
        <TrailDetail trail={selectedTrail} onBack={() => setSelectedTrail(null)} />
      ) : (
        <>
          {currentTab === 'home' && (
            <Home
              onSelectBook={navigateToBook}
              welcomeMessage={welcomeMessage}
              onDismissWelcome={() => {
                setWelcomeMessage(null);
                localStorage.removeItem('onboarding_welcome');
              }}
            />
          )}
          {currentTab === 'journey'    && <JourneyMap onSelectBook={navigateToBook} />}
          {currentTab === 'trails'     && <Trails onSelectTrail={navigateToTrail} onSelectBook={navigateToBook} />}
          {currentTab === 'community'  && <Community />}
          {currentTab === 'profile'    && (
            <Profile
              isAdmin={isAdmin}
              onOpenAdmin={() => setShowAdmin(true)}
            />
          )}

          <Navigation currentTab={currentTab} onTabChange={navigateToTab} />
        </>
      )}
    </GamificationProvider>
  );
}
