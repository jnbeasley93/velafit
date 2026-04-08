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
import './App.css';

function AppInner() {
  const { user } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [pendingPlanBuilder, setPendingPlanBuilder] = useState(false);

  const handleGetStarted = useCallback(() => {
    if (user) {
      setModalOpen(true);
    } else {
      setPendingPlanBuilder(true);
      setAuthOpen(true);
    }
  }, [user]);

  const handleAuthClose = useCallback(() => {
    setAuthOpen(false);
    setPendingPlanBuilder(false);
  }, []);

  const handleAuthSuccess = useCallback(() => {
    setAuthOpen(false);
    if (pendingPlanBuilder) {
      setPendingPlanBuilder(false);
      setModalOpen(true);
    }
  }, [pendingPlanBuilder]);

  return (
    <BrowserRouter>
      <Navbar
        onGetStarted={handleGetStarted}
        onLogin={() => setAuthOpen(true)}
      />
      <Hero onBuildPlan={handleGetStarted} />
      <HowItWorks />
      <FeaturesGrid />
      <DailyBriefing />
      <MindJournal />
      <Nutrition />
      <Pricing onGetStarted={handleGetStarted} />
      <WaitlistCTA onSignUp={() => setAuthOpen(true)} />
      <Footer />
      <PlanBuilderModal open={modalOpen} onClose={() => setModalOpen(false)} />
      <AuthModal
        open={authOpen}
        onClose={handleAuthClose}
        onSuccess={handleAuthSuccess}
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
