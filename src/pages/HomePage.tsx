import { useState } from 'react';
import { Hero, StatsSection, AboutSection, ServicesSection, CTASection } from '../components/HomeSections';
import { AuthModal } from '../components/AuthModal';
import { StatusCheckModal } from '../components/StatusCheckModal';
import { useAuth } from '../lib/auth';
import { ApplyModal } from '../components/ApplyModal';

interface Props {
  onNavigate: (page: string) => void;
}

export function HomePage({ onNavigate }: Props) {
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [statusOpen, setStatusOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);

  const openAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  const handleApply = () => {
    if (user) {
      setApplyOpen(true);
    } else {
      openAuth('signup');
    }
  };

  return (
    <div className="animate-fade-in-fast">
      <Hero
        onApply={handleApply}
        onLogin={() => openAuth('login')}
        onStatus={() => setStatusOpen(true)}
      />
      <StatsSection />
      <AboutSection />
      <ServicesSection />
      <CTASection onApply={handleApply} />

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode={authMode} />
      <StatusCheckModal open={statusOpen} onClose={() => setStatusOpen(false)} />
      <ApplyModal open={applyOpen} onClose={() => setApplyOpen(false)} onNavigate={onNavigate} />
    </div>
  );
}
