import { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
import WorkoutHistory from './components/WorkoutHistory';
import Dashboard from './components/Dashboard';
import { QuickSessionFAB, QuickSessionModal } from './components/QuickSession';
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
  const [ratingData, setRatingData] = useState({ sessionMins: 30, isImpromptu: false, exercisesCompleted: [], journalEntry: null });
  const [sessionOpen, setSessionOpen] = useState(false);
  const [sessionData, setSessionData] = useState(null);
  const [sessionMins, setSessionMins] = useState(30);
  const [sessionIsImpromptu, setSessionIsImpromptu] = useState(false);

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

  const [quickSessionOpen, setQuickSessionOpen] = useState(false);

  const handleStartSession = useCallback((mins, { impromptu = false, bodyweightOnly = false } = {}) => {
    const noMindGames = fitnessProfile?.mind_games?.includes('No mind games') ?? false;
    const intensity = profile?.intensity_level ?? 2;
    // If bodyweight only, override the profile equipment
    const fp = bodyweightOnly
      ? { ...fitnessProfile, equipment: ['None — bodyweight only'] }
      : fitnessProfile;
    const session = buildSession(fp, mins, noMindGames, intensity);
    setSessionMins(mins);
    setSessionIsImpromptu(impromptu);
    setSessionData(session);
    setSessionOpen(true);
  }, [fitnessProfile, profile]);

  const handleQuickStart = useCallback(({ minutes, bodyweightOnly }) => {
    setQuickSessionOpen(false);
    handleStartSession(minutes, { impromptu: true, bodyweightOnly });
  }, [handleStartSession]);

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
            user ? (
              <Navigate to="/dashboard" replace />
            ) : (
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
            )
          }
        />
        <Route
          path="/dashboard"
          element={
            user ? (
              <Dashboard
                onStartSession={handleStartSession}
                onBuildPlan={() => setModalOpen(true)}
                onQuickSession={() => setQuickSessionOpen(true)}
              />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route path="/settings" element={<Settings />} />
        <Route path="/history" element={<WorkoutHistory />} />
        {/* Marketing page accessible even when logged in via direct path */}
        <Route
          path="/home"
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
      </Routes>
      {user && (
        <QuickSessionFAB onClick={() => setQuickSessionOpen(true)} />
      )}
      <QuickSessionModal
        open={quickSessionOpen}
        onClose={() => setQuickSessionOpen(false)}
        onStart={handleQuickStart}
      />
      <PlanBuilderModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onStartSession={handleStartSession}
      />
      <SessionPlayer
        open={sessionOpen}
        session={sessionData}
        sessionMins={sessionMins}
        isImpromptu={sessionIsImpromptu}
        onClose={() => setSessionOpen(false)}
        onRequestRating={(data) => {
          setRatingData(data);
          setRatingOpen(true);
        }}
      />
      <PostWorkoutRating
        open={ratingOpen}
        onClose={() => { setRatingOpen(false); setSessionIsImpromptu(false); }}
        sessionLength={ratingData.sessionMins}
        isImpromptu={ratingData.isImpromptu}
        exercisesCompleted={ratingData.exercisesCompleted}
        journalEntry={ratingData.journalEntry}
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
