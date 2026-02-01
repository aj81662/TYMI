import { Navigation } from './components/Navigation';
import { HeroSection } from './components/HeroSection';
import { MissionSection } from './components/MissionSection';
import { ProblemSection } from './components/ProblemSection';
import { TeamSection } from './components/TeamSection';
import { Footer } from './components/Footer';

export default function App() {
  return (
    <div className="min-h-screen">
      <Navigation />
      <HeroSection />
      <MissionSection />
      <ProblemSection />
      <TeamSection />
      <Footer />
    </div>
  );
}