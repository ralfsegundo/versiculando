import { useState, useEffect } from 'react';
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
import Admin from './components/Admin';
import { GamificationProvider } from './services/gamification';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
import { Session } from '@supabase/supabase-js';
import { Trail } from './services/trails';

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
    }).catch(() => {
      setIsInitializing(false);
    });

    // Timeout de segurança — garante que o loading nunca trava
    // 6s para cobrir conexões mais lentas
    const timeout = setTimeout(() => setIsInitializing(false), 6000);

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
    setSelectedBookId(config.startBookId);

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
      <div className="min-h-screen flex items-center justify-center bg-stone-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600" />
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

      {selectedBookId ? (
        <BookDetail bookId={selectedBookId} onBack={() => setSelectedBookId(null)} />
      ) : selectedTrail ? (
        <TrailDetail trail={selectedTrail} onBack={() => setSelectedTrail(null)} />
      ) : (
        <>
          <Navigation currentTab={currentTab} onTabChange={setCurrentTab} />

          {currentTab === 'home' && (
            <Home
              onSelectBook={setSelectedBookId}
              welcomeMessage={welcomeMessage}
              onDismissWelcome={() => {
                setWelcomeMessage(null);
                localStorage.removeItem('onboarding_welcome');
              }}
            />
          )}
          {currentTab === 'journey'    && <JourneyMap onSelectBook={setSelectedBookId} />}
          {currentTab === 'trails'     && <Trails onSelectTrail={setSelectedTrail} onSelectBook={setSelectedBookId} />}
          {currentTab === 'community'  && <Community />}
          {currentTab === 'profile'    && (
            <Profile
              isAdmin={isAdmin}
              onOpenAdmin={() => setShowAdmin(true)}
            />
          )}

          <Navigation currentTab={currentTab} onTabChange={setCurrentTab} />
        </>
      )}
    </GamificationProvider>
  );
}
