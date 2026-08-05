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
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { BlogPage } from './pages/BlogPage';
import { BlogArticlePage } from './pages/BlogArticlePage';
import { BlogAdminPage } from './pages/BlogAdminPage';
import { NotificationCenterPage } from './pages/NotificationCenterPage';
import {
  AboutPage, ContactPage, ServicesPage, MessagesPage, SupportPage,
  SettingsPage, PrivacyPage, TermsPage,
} from './pages/InfoPages';

const PROTECTED_PAGES = ['dashboard', 'documents', 'notifications', 'tracking', 'payment', 'messages', 'support', 'settings', 'admin', 'blog-admin', 'notification-center'];

function AppContent() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState('home');
  const [pageParams, setPageParams] = useState<Record<string, unknown>>({});
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [statusOpen, setStatusOpen] = useState(false);
  const [isResetRoute, setIsResetRoute] = useState(false);

  // Detect the password-reset route. Supabase recovery links put type=recovery
  // and the tokens in the URL hash. The path may be /reset-password (when the
  // redirectTo URL is in Supabase's allowed list) or / (when Supabase falls back
  // to the Site URL). We check both the path and the hash so the recovery flow
  // works regardless of which URL Supabase generates.
  useEffect(() => {
    const path = window.location.pathname.replace(/\/$/, '');
    const hash = window.location.hash.slice(1);
    const params = new URLSearchParams(hash);
    const type = params.get('type');

    if (type === 'recovery') {
      if (path !== '/reset-password') {
        window.history.replaceState({}, '', `/reset-password${window.location.hash}`);
      }
      setIsResetRoute(true);
    } else if (path === '/reset-password') {
      setIsResetRoute(true);
    }
  }, []);

  const finishReset = () => {
    setIsResetRoute(false);
    // Clear the reset URL so the user lands on the normal home page.
    window.history.replaceState({}, '', '/');
    setPage('home');
    setAuthMode('login');
    setAuthOpen(true);
  };

  const navigate = (p: string, params?: Record<string, unknown>) => {
    if (PROTECTED_PAGES.includes(p) && !user) {
      setAuthMode('login');
      setAuthOpen(true);
      return;
    }
    setPage(p);
    setPageParams(params ?? {});
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

  // Password reset route takes over the entire screen (no navbar/footer).
  if (isResetRoute) {
    return <ResetPasswordPage onComplete={finishReset} />;
  }

  const renderPage = () => {
    switch (page) {
      case 'home': return <HomePage onNavigate={navigate} />;
      case 'dashboard': return user ? <DashboardPage onNavigate={navigate} /> : <HomePage onNavigate={navigate} />;
      case 'documents': return user ? <DocumentsPage /> : <HomePage onNavigate={navigate} />;
      case 'notifications': return user ? <NotificationsPage /> : <HomePage onNavigate={navigate} />;
      case 'tracking': return user ? <TrackingPage onNavigate={navigate} /> : <HomePage onNavigate={navigate} />;
      case 'payment': return user ? <PaymentPage /> : <HomePage onNavigate={navigate} />;
      case 'admin': return user ? <AdminPage onNavigate={navigate} /> : <HomePage onNavigate={navigate} />;
      case 'blog': return <BlogPage onNavigate={navigate} />;
      case 'blog-article': return <BlogArticlePage slug={pageParams.slug as string} onNavigate={navigate} />;
      case 'blog-admin': return user ? <BlogAdminPage onNavigate={navigate} /> : <HomePage onNavigate={navigate} />;
      case 'notification-center': return user ? <NotificationCenterPage onNavigate={navigate} /> : <HomePage onNavigate={navigate} />;
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

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        initialMode={authMode}
        onGotoDashboard={() => navigate('dashboard')}
      />
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
