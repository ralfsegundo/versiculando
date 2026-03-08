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
import { supabase } from './lib/supabase';
import { prefetchBooks } from './services/bookData';
import Auth from './components/Auth';
import { Session } from '@supabase/supabase-js';
import { Trail } from './services/trails';
import { BEGINNER_PATH, BIBLE_BOOKS } from './constants';

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
  const { profile, updateProfile } = useGamification();
  const [session, setSession] = useState<Session | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [selectedBookId, setSelectedBookId] = useState<string | null>(null);
  const [selectedTrail, setSelectedTrail] = useState<Trail | null>(null);
  const [currentTab, setCurrentTab] = useState<'home' | 'journey' | 'trails' | 'profile' | 'community'>('home');
  const [showAdmin, setShowAdmin] = useState(false);

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
    const config = getWelcomeConfig(onboardingProfile);
    updateProfile({ onboardingDone: true });
    setSelectedBookId(config.startBookId);
  };

  if (isInitializing) return null;

  if (!session) return <Auth onAuthSuccess={() => {}} />;

  if (!profile.onboardingDone) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <div className="min-h-screen bg-[#fdfbf7] pb-24">
      <OfflineBanner />
      <StreakNotificationBanner />
      
      {currentTab === 'home' && (
        <Home 
          onNavigateToBook={setSelectedBookId} 
          onNavigateToTrail={setSelectedTrail}
        />
      )}
      {currentTab === 'journey' && <JourneyMap onNavigateToBook={setSelectedBookId} />}
      {currentTab === 'trails' && <Trails onNavigateToTrail={setSelectedTrail} />}
      {currentTab === 'community' && <Community />}
      {currentTab === 'profile' && <Profile onLogout={() => supabase.auth.signOut()} />}

      {selectedBookId && (
        <BookDetail
          bookId={selectedBookId}
          onBack={() => setSelectedBookId(null)}
        />
      )}

      {selectedTrail && (
        <TrailDetail
          trail={selectedTrail}
          onBack={() => setSelectedTrail(null)}
        />
      )}

      <Navigation currentTab={currentTab} onTabChange={setCurrentTab} />
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
