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
import NotificationPrompt from './components/NotificationBanner';
import Admin from './components/Admin';
import { GamificationProvider, useGamification } from './services/gamification';
import { supabase } from './lib/supabase';
import Auth from './components/Auth';
import { Session } from '@supabase/supabase-js';
import { Trail } from './services/trails';

const ADMIN_EMAIL = 'ralfsegundo@gmail.com';

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

function AppContent() {
  const { profile, updateProfile, isReady, loadError } = useGamification();
  const [session, setSession] = useState<Session | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [selectedTrail, setSelectedTrail] = useState<Trail | null>(null);
  const [currentTab, setCurrentTab] = useState<'home' | 'journey' | 'trails' | 'profile' | 'community'>('home');
  const [showAdmin, setShowAdmin] = useState(false);
  const [welcomeMessage, setWelcomeMessage] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsInitializing(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleOnboardingComplete = async (onboardingProfile: OnboardingProfile) => {
    try { localStorage.setItem('onboarding_profile', JSON.stringify(onboardingProfile)); } catch (e) { /* ignore */ }
    const config = getWelcomeConfig(onboardingProfile);
    
    updateProfile({ onboardingDone: true, onboardingProfile });
    setCurrentTab(config.startTab);
    
    if (config.message && config.startTab === 'home') {
      setWelcomeMessage(config.message);
    }
    
    if (config.startBookId) {
      setTimeout(() => setSelectedBookId(config.startBookId), 100);
    }
  };

  if (loadError) {
    return (
      <div className="min-h-screen bg-[#fdfbf7] flex flex-col items-center justify-center p-8 text-center">
        <div className="text-5xl mb-4">📶</div>
        <h1 className="text-2xl font-serif font-bold text-stone-900 mb-2">Conexão Necessária</h1>
        <p className="text-stone-500 mb-8 max-w-sm">
          Parece que você está offline e este é o seu primeiro acesso neste dispositivo. 
          Por favor, conecte-se à internet para carregarmos seu perfil e proteger o seu progresso.
        </p>
        <button 
          onClick={() => window.location.reload()} 
          className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-3.5 px-8 rounded-2xl shadow-md transition-colors active:scale-95"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  if (isInitializing || !isReady) return null;

  if (!session) return <Auth onAuthSuccess={() => {}} />;

  if (!profile.onboardingDone) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen bg-[#fdfbf7] pb-24">
      <OfflineBanner />
      <StreakNotificationBanner />
      
      {/* Esconde as abas principais se um livro, trilha ou painel admin estiver aberto */}
      <div style={{ display: (selectedBookId || selectedTrail || showAdmin) ? 'none' : 'block' }}>
        {currentTab === 'home' && (
          <Home
            onSelectBook={setSelectedBookId}
            welcomeMessage={welcomeMessage}
            onDismissWelcome={() => setWelcomeMessage(null)}
          />
        )}
        {currentTab === 'journey' && <JourneyMap onSelectBook={setSelectedBookId} />}
        {currentTab === 'trails' && <Trails onSelectTrail={setSelectedTrail} onSelectBook={setSelectedBookId} />}
        {currentTab === 'community' && <Community />}
        {currentTab === 'profile' && <Profile isAdmin={session.user.email === ADMIN_EMAIL} onOpenAdmin={() => setShowAdmin(true)} />}
      </div>

      {selectedBookId && !showAdmin && (
        <BookDetail
          bookId={selectedBookId}
          onBack={() => setSelectedBookId(null)}
        />
      )}

      {selectedTrail && !showAdmin && (
        <TrailDetail
          trail={selectedTrail}
          onBack={() => setSelectedTrail(null)}
        />
      )}

      {showAdmin && (
        <div className="fixed inset-0 z-[100] bg-white overflow-y-auto">
          <Admin onExit={() => setShowAdmin(false)} />
        </div>
      )}

      {/* Esconde a barra de navegação global se uma tela de detalhe estiver aberta */}
      {!(selectedBookId || selectedTrail || showAdmin) && (
        <Navigation currentTab={currentTab} onTabChange={setCurrentTab} />
      )}
    </div>
  );
}

export default function App() {
  return (
    <GamificationProvider>
      <AppContent />
    </GamificationProvider>
  );
}