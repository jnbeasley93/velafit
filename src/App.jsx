import { useState, useCallback } from 'react';
import { BrowserRouter } from 'react-router-dom';
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
import './App.css';

function AppInner() {
  const { user, onboardingCompleted } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [pendingPlanBuilder, setPendingPlanBuilder] = useState(false);

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

  return (
    <BrowserRouter>
      <Navbar
        onGetStarted={handleGetStarted}
        onLogin={handleLogin}
      />
      <Hero onBuildPlan={handleGetStarted} />
      <HowItWorks />
      <FeaturesGrid />
      <DailyBriefing />
      <MindJournal />
      <Nutrition />
      <Pricing onGetStarted={handleGetStarted} />
      <WaitlistCTA onSignUp={handleGetStarted} />
      <Footer />
      <PlanBuilderModal open={modalOpen} onClose={() => setModalOpen(false)} />
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
