import { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import HowItWorks from './components/HowItWorks';
import FeaturesGrid from './components/FeaturesGrid';
import DailyBriefing from './components/DailyBriefing';
import MindJournal from './components/MindJournal';
import Nutrition from './components/Nutrition';
import Pricing from './components/Pricing';
import WaitlistCTA from './components/WaitlistCTA';
import Footer from './components/Footer';
import PlanBuilderModal from './components/PlanBuilderModal';
import AuthModal from './components/AuthModal';
import OnboardingSurvey from './components/OnboardingSurvey';
import PostWorkoutRating from './components/PostWorkoutRating';
import SessionPlayer from './components/SessionPlayer';
import Settings from './components/Settings';
import { buildSession } from './lib/buildSession';
import './App.css';

function AppInner() {
  const { user, onboardingCompleted, fitnessProfile, profile } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [pendingPlanBuilder, setPendingPlanBuilder] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [ratingSessionLength, setRatingSessionLength] = useState(30);
  const [sessionOpen, setSessionOpen] = useState(false);
  const [sessionData, setSessionData] = useState(null);
  const [sessionMins, setSessionMins] = useState(30);

  const handleGetStarted = useCallback(() => {
    if (user) {
      if (!onboardingCompleted) {
        setPendingPlanBuilder(true);
        setOnboardingOpen(true);
      } else {
        setModalOpen(true);
      }
    } else {
      setPendingPlanBuilder(true);
      setAuthMode('signup');
      setAuthOpen(true);
    }
  }, [user, onboardingCompleted]);

  const handleLogin = useCallback(() => {
    setAuthMode('login');
    setAuthOpen(true);
  }, []);

  const handleAuthClose = useCallback(() => {
    setAuthOpen(false);
    setPendingPlanBuilder(false);
  }, []);

  const handleAuthSuccess = useCallback(() => {
    setAuthOpen(false);
    if (pendingPlanBuilder) {
      // After auth, check if onboarding is needed
      setOnboardingOpen(true);
    }
  }, [pendingPlanBuilder]);

  const handleOnboardingComplete = useCallback(() => {
    setOnboardingOpen(false);
    if (pendingPlanBuilder) {
      setPendingPlanBuilder(false);
      setModalOpen(true);
    }
  }, [pendingPlanBuilder]);

  const handleStartSession = useCallback((mins) => {
    const noMindGames = fitnessProfile?.mind_games?.includes('No mind games') ?? false;
    const intensity = profile?.intensity_level ?? 2;
    const session = buildSession(fitnessProfile, mins, noMindGames, intensity);
    setSessionMins(mins);
    setSessionData(session);
    setSessionOpen(true);
  }, [fitnessProfile, profile]);

  return (
    <BrowserRouter>
      <Navbar
        onGetStarted={handleGetStarted}
        onLogin={handleLogin}
      />
      <Routes>
        <Route
          path="/"
          element={
            <>
              <Hero onBuildPlan={handleGetStarted} />
              <HowItWorks />
              <FeaturesGrid />
              <DailyBriefing />
              <MindJournal />
              <Nutrition />
              <Pricing onGetStarted={handleGetStarted} />
              <WaitlistCTA onSignUp={handleGetStarted} />
              <Footer />
            </>
          }
        />
        <Route path="/settings" element={<Settings />} />
      </Routes>
      <PlanBuilderModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onStartSession={handleStartSession}
      />
      <SessionPlayer
        open={sessionOpen}
        session={sessionData}
        sessionMins={sessionMins}
        onClose={() => setSessionOpen(false)}
        onRequestRating={(mins) => {
          setRatingSessionLength(mins);
          setRatingOpen(true);
        }}
      />
      <PostWorkoutRating
        open={ratingOpen}
        onClose={() => setRatingOpen(false)}
        sessionLength={ratingSessionLength}
      />
      <OnboardingSurvey
        open={onboardingOpen}
        onComplete={handleOnboardingComplete}
      />
      <AuthModal
        open={authOpen}
        onClose={handleAuthClose}
        onSuccess={handleAuthSuccess}
        initialMode={authMode}
      />
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppInner />
    </AuthProvider>
  );
}

export default App;
