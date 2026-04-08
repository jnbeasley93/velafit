import { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
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

function App() {
  const [modalOpen, setModalOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const openModal = () => setModalOpen(true);

  return (
    <AuthProvider>
      <BrowserRouter>
        <Navbar
          onGetStarted={openModal}
          onLogin={() => setAuthOpen(true)}
        />
        <Hero onBuildPlan={openModal} />
        <HowItWorks />
        <FeaturesGrid />
        <DailyBriefing />
        <MindJournal />
        <Nutrition />
        <Pricing onGetStarted={openModal} />
        <WaitlistCTA />
        <Footer />
        <PlanBuilderModal open={modalOpen} onClose={() => setModalOpen(false)} />
        <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
