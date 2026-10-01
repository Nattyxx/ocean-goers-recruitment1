import { useState, useEffect } from 'react';
import { Hero, StatsSection, AboutSection, ServicesSection, CTASection } from '../components/HomeSections';
import { AuthModal } from '../components/AuthModal';
import { StatusCheckModal } from '../components/StatusCheckModal';
import { useAuth } from '../lib/auth';
import { ApplyModal } from '../components/ApplyModal';
import { buildJobPostingJsonLd } from '../lib/seo';

interface Props {
  onNavigate: (page: string) => void;
}

export function HomePage({ onNavigate }: Props) {
  const { user, profile } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [statusOpen, setStatusOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);

  useEffect(() => {
    const script = document.createElement('script');
    script.id = 'homepage-jobposting-jsonld';
    script.setAttribute('type', 'application/ld+json');
    script.textContent = JSON.stringify([
      buildJobPostingJsonLd({
        title: 'Cruise Ship Staff — Multiple Positions Available Worldwide',
        description: 'Apply for cruise ship jobs across all departments including deck, engine, hospitality, food & beverage, housekeeping, entertainment, and more. Ocean Goers places qualified candidates with top cruise lines worldwide.',
        department: 'Multiple Departments',
      }),
    ]);
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, []);

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
        isApplicant={!!user && !profile?.is_admin}
        onDashboard={() => onNavigate('dashboard')}
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
