import { useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
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
import './App.css';

function App() {
  const [modalOpen, setModalOpen] = useState(false);
  const openModal = () => setModalOpen(true);

  return (
    <BrowserRouter>
      <Navbar onGetStarted={openModal} />
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
    </BrowserRouter>
  );
}

export default App;
