// VelaFit build April 13
import { useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import HowItWorks from './components/HowItWorks';
import FeaturesGrid from './components/FeaturesGrid';
import DailyBriefing from './components/DailyBriefing';
import MindJournal from './components/MindJournal';
import NutritionPreview from './components/NutritionPreview';
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
import Settle from './components/Settle';
import Sharpen from './components/Sharpen';
import JournalHistory from './components/JournalHistory';
import { QuickSessionFAB, QuickSessionModal } from './components/QuickSession';
import LogActivityModal from './components/LogActivityModal';
import EditScheduleModal from './components/EditScheduleModal';
import InstallPrompt from './components/InstallPrompt';
import About, { AboutSections } from './components/About';
import Nutrition from './components/Nutrition';
import Research from './components/Research';
import Learn from './components/Learn';
import { ThemeProvider } from './contexts/ThemeContext';
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
  const [ratingData, setRatingData] = useState({ sessionMins: 30, isImpromptu: false, exercisesCompleted: [], exerciseObjects: [], sessionId: null, journalEntry: null });
  const [sessionOpen, setSessionOpen] = useState(false);
  const [sessionData, setSessionData] = useState(null);
  const [sessionMins, setSessionMins] = useState(30);
  const [sessionIsImpromptu, setSessionIsImpromptu] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

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
  const [logActivityOpen, setLogActivityOpen] = useState(false);
  const [logActivityPrefill, setLogActivityPrefill] = useState(null);
  const [editScheduleOpen, setEditScheduleOpen] = useState(false);

  const openLogActivity = useCallback((prefill = null) => {
    setLogActivityPrefill(prefill);
    setLogActivityOpen(true);
  }, []);

  const handleStartSession = useCallback((mins, { impromptu = false, bodyweightOnly = false } = {}) => {
    console.log('[App] handleStartSession:', { mins, impromptu, bodyweightOnly });
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
    console.log('[App] handleQuickStart:', { minutes, bodyweightOnly });
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
              // Marketing page is a fixed dark-green brand aesthetic — pin it to
              // the light theme so its cream-on-green text stays readable even
              // when the user has dark mode enabled (otherwise --green-deep
              // inverts to light and washes out the cream body text).
              <div data-theme="light">
                <Hero onBuildPlan={handleGetStarted} />
                <HowItWorks />
                <FeaturesGrid />
                <DailyBriefing />
                <MindJournal />
                <NutritionPreview />
                <AboutSections />
                <Pricing onGetStarted={handleGetStarted} />
                <WaitlistCTA onSignUp={handleGetStarted} />
                <Footer />
              </div>
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
                onLogActivity={() => openLogActivity()}
                onEditSchedule={() => setEditScheduleOpen(true)}
              />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/settle"
          element={user ? <Settle /> : <Navigate to="/" replace />}
        />
        <Route
          path="/sharpen"
          element={user ? <Sharpen /> : <Navigate to="/" replace />}
        />
        <Route
          path="/settings"
          element={<Settings onEditSchedule={() => setEditScheduleOpen(true)} />}
        />
        <Route
          path="/history"
          element={<WorkoutHistory onRepeatLog={openLogActivity} />}
        />
        <Route
          path="/journal"
          element={user ? <JournalHistory /> : <Navigate to="/" replace />}
        />
        <Route path="/about" element={<About />} />
        <Route
          path="/nutrition"
          element={user ? <Nutrition /> : <Navigate to="/" replace />}
        />
        <Route
          path="/research"
          element={user ? <Research /> : <Navigate to="/" replace />}
        />
        <Route
          path="/learn"
          element={user ? <Learn /> : <Navigate to="/" replace />}
        />
        {/* Marketing page accessible even when logged in via direct path */}
        <Route
          path="/home"
          element={
            <div data-theme="light">
              <Hero onBuildPlan={handleGetStarted} />
              <HowItWorks />
              <FeaturesGrid />
              <DailyBriefing />
              <MindJournal />
              <Nutrition />
              <Pricing onGetStarted={handleGetStarted} />
              <WaitlistCTA onSignUp={handleGetStarted} />
              <Footer />
            </div>
          }
        />
      </Routes>
      {user && (
        <QuickSessionFAB onClick={() => setQuickSessionOpen(true)} />
      )}
      <LogActivityModal
        open={logActivityOpen}
        onClose={() => setLogActivityOpen(false)}
        prefill={logActivityPrefill}
      />
      <EditScheduleModal
        open={editScheduleOpen}
        onClose={() => setEditScheduleOpen(false)}
      />
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
          console.log('[App] onRequestRating received:', data);
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
        exerciseObjects={ratingData.exerciseObjects}
        sessionId={ratingData.sessionId}
        journalEntry={ratingData.journalEntry}
      />
      <OnboardingSurvey
        open={onboardingOpen}
        onComplete={handleOnboardingComplete}
        onShowInstallPrompt={() => setShowInstallPrompt(true)}
      />
      <InstallPrompt
        open={showInstallPrompt}
        onClose={() => setShowInstallPrompt(false)}
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
    <ThemeProvider>
      <AuthProvider>
        <AppInner />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
