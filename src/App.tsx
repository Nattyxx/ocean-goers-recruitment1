import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { ToastProvider } from './lib/toast';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AuthModal } from './components/AuthModal';
import { StatusCheckModal } from './components/StatusCheckModal';
import { FullPageSpinner } from './components/ui/Spinner';
import { HomePage } from './pages/HomePage';
import { DashboardPage } from './pages/DashboardPage';
import { DocumentsPage } from './pages/DocumentsPage';
import { NotificationsPage } from './pages/NotificationsPage';
import { TrackingPage } from './pages/TrackingPage';
import { PaymentPage } from './pages/PaymentPage';
import { AdminPage } from './pages/AdminPage';
import {
  AboutPage, ContactPage, ServicesPage, MessagesPage, SupportPage,
  SettingsPage, PrivacyPage, TermsPage,
} from './pages/InfoPages';

const PROTECTED_PAGES = ['dashboard', 'documents', 'notifications', 'tracking', 'payment', 'messages', 'support', 'settings'];

function AppContent() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState('home');
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [statusOpen, setStatusOpen] = useState(false);

  const navigate = (p: string) => {
    if (PROTECTED_PAGES.includes(p) && !user) {
      setAuthMode('login');
      setAuthOpen(true);
      return;
    }
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  // Redirect to dashboard after login if on a protected page attempt
  useEffect(() => {
    if (user && authOpen) {
      setAuthOpen(false);
    }
  }, [user, authOpen]);

  if (loading) return <FullPageSpinner label="Loading Ocean Goers..." />;

  const renderPage = () => {
    switch (page) {
      case 'home': return <HomePage onNavigate={navigate} />;
      case 'dashboard': return user ? <DashboardPage onNavigate={navigate} /> : <HomePage onNavigate={navigate} />;
      case 'documents': return user ? <DocumentsPage /> : <HomePage onNavigate={navigate} />;
      case 'notifications': return user ? <NotificationsPage /> : <HomePage onNavigate={navigate} />;
      case 'tracking': return user ? <TrackingPage onNavigate={navigate} /> : <HomePage onNavigate={navigate} />;
      case 'payment': return user ? <PaymentPage /> : <HomePage onNavigate={navigate} />;
      case 'admin': return user ? <AdminPage onNavigate={navigate} /> : <HomePage onNavigate={navigate} />;
      case 'messages': return user ? <MessagesPage /> : <HomePage onNavigate={navigate} />;
      case 'support': return user ? <SupportPage /> : <HomePage onNavigate={navigate} />;
      case 'settings': return user ? <SettingsPage /> : <HomePage onNavigate={navigate} />;
      case 'about': return <AboutPage />;
      case 'services': return <ServicesPage />;
      case 'contact': return <ContactPage />;
      case 'privacy': return <PrivacyPage />;
      case 'terms': return <TermsPage />;
      default: return <HomePage onNavigate={navigate} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Navbar
        onLogin={() => openAuth('login')}
        onApply={() => (user ? navigate('documents') : openAuth('signup'))}
        onStatus={() => setStatusOpen(true)}
        onNavigate={navigate}
        currentPage={page}
      />
      <main className="flex-1">
        {renderPage()}
      </main>
      <Footer onNavigate={navigate} />

      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode={authMode} />
      <StatusCheckModal open={statusOpen} onClose={() => setStatusOpen(false)} />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}
