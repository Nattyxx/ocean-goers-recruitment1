import { useState, useEffect, useCallback } from 'react';
import { useSEO } from './lib/seo';
import { AuthProvider, useAuth } from './lib/auth';
import { ToastProvider } from './lib/toast';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { AuthModal } from './components/AuthModal';
import { StatusCheckModal } from './components/StatusCheckModal';
import { SupportButton } from './components/SupportButton';
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
import { InterviewPage } from './pages/InterviewPage';
import { ResourcesPage } from './pages/ResourcesPage';
import { SupportPage as NewSupportPage } from './pages/SupportPage';
import { NotFoundPage } from './pages/NotFoundPage';
import { DashboardLayout } from './components/DashboardLayout';
import {
  AboutPage, ContactPage, ServicesPage, MessagesPage,
  SettingsPage, PrivacyPage, TermsPage,
} from './pages/InfoPages';

const PROTECTED_PAGES = ['dashboard', 'documents', 'notifications', 'tracking', 'payment', 'interview', 'messages', 'support', 'settings', 'resources', 'admin', 'blog-admin', 'notification-center'];

const DASHBOARD_PAGES = ['dashboard', 'documents', 'notifications', 'tracking', 'payment', 'interview', 'messages', 'support', 'settings', 'resources'];

// Whitelist of all legitimate routes. Anything not in this map renders the 404 page.
const ROUTE_MAP: Record<string, string> = {
  '': 'home',
  '/': 'home',
  '/about': 'about',
  '/services': 'services',
  '/blog': 'blog',
  '/blog/:slug': 'blog-article',
  '/track': 'tracking',
  '/tracking': 'tracking',
  '/contact': 'contact',
  '/privacy': 'privacy',
  '/terms': 'terms',
  '/dashboard': 'dashboard',
  '/documents': 'documents',
  '/notifications': 'notifications',
  '/payment': 'payment',
  '/interview': 'interview',
  '/resources': 'resources',
  '/admin': 'admin',
  '/blog-admin': 'blog-admin',
  '/notification-center': 'notification-center',
  '/messages': 'messages',
  '/support': 'support',
  '/settings': 'settings',
  '/reset-password': 'reset-password',
};

const VALID_PAGES = new Set(Object.values(ROUTE_MAP));

function parseUrlPath(): { page: string; params: Record<string, unknown> } {
  const path = window.location.pathname.replace(/\/+$/, '') || '';
  const hash = window.location.hash.slice(1);
  const hashParams = new URLSearchParams(hash);
  const type = hashParams.get('type');

  // Supabase password-recovery links put type=recovery in the hash.
  if (type === 'recovery') {
    return { page: 'reset-password', params: {} };
  }

  // Exact route match
  if (path in ROUTE_MAP) {
    return { page: ROUTE_MAP[path], params: {} };
  }

  // Dynamic blog article route: /blog/<slug>
  if (path.startsWith('/blog/')) {
    const slug = path.slice('/blog/'.length);
    if (slug) return { page: 'blog-article', params: { slug } };
  }

  // Unknown route → 404
  return { page: 'not-found', params: {} };
}

function pageToUrl(page: string, params?: Record<string, unknown>): string {
  if (page === 'home') return '/';
  if (page === 'blog-article' && params?.slug) return `/blog/${params.slug}`;
  if (page === 'reset-password') return '/reset-password';
  const entry = Object.entries(ROUTE_MAP).find(([, v]) => v === page);
  return entry ? entry[0] : `/${page}`;
}

function AppContent() {
  const { user, loading, signOut } = useAuth();
  const [{ page, params: pageParams }, setPageState] = useState(() => parseUrlPath());
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  const [statusOpen, setStatusOpen] = useState(false);

  useSEO(page);

  // Sync state with browser back/forward
  useEffect(() => {
    const onPopState = () => setPageState(parseUrlPath());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = useCallback((p: string, params?: Record<string, unknown>) => {
    if (!VALID_PAGES.has(p)) {
      setPageState({ page: 'not-found', params: {} });
      window.history.pushState({}, '', `/${p}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (PROTECTED_PAGES.includes(p) && !user) {
      setAuthMode('login');
      setAuthOpen(true);
      return;
    }

    const url = pageToUrl(p, params);
    window.history.pushState({}, '', url);
    setPageState({ page: p, params: params ?? {} });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [user]);

  // Redirect to dashboard after login if on a protected page attempt
  useEffect(() => {
    if (user && authOpen) {
      setAuthOpen(false);
    }
  }, [user, authOpen]);

  const openAuth = (mode: 'login' | 'signup') => {
    setAuthMode(mode);
    setAuthOpen(true);
  };

  if (loading) return <FullPageSpinner label="Loading Ocean Goers..." />;

  // Password reset route takes over the entire screen (no navbar/footer).
  if (page === 'reset-password') {
    const finishReset = () => {
      window.history.replaceState({}, '', '/');
      setPageState({ page: 'home', params: {} });
      setAuthMode('login');
      setAuthOpen(true);
    };
    return <ResetPasswordPage onComplete={finishReset} />;
  }

  // 404 page — full screen, no navbar/footer, matches Ocean Goers branding.
  if (page === 'not-found') {
    return <NotFoundPage onNavigate={navigate} />;
  }

  const renderPage = () => {
    switch (page) {
      case 'home': return <HomePage onNavigate={navigate} />;
      case 'dashboard': return user ? <DashboardPage onNavigate={navigate} /> : <HomePage onNavigate={navigate} />;
      case 'documents': return user ? <DocumentsPage /> : <HomePage onNavigate={navigate} />;
      case 'notifications': return user ? <NotificationsPage /> : <HomePage onNavigate={navigate} />;
      case 'tracking': return user ? <TrackingPage onNavigate={navigate} /> : <HomePage onNavigate={navigate} />;
      case 'payment': return user ? <PaymentPage /> : <HomePage onNavigate={navigate} />;
      case 'interview': return user ? <InterviewPage /> : <HomePage onNavigate={navigate} />;
      case 'resources': return user ? <ResourcesPage /> : <HomePage onNavigate={navigate} />;
      case 'admin': return user ? <AdminPage onNavigate={navigate} /> : <HomePage onNavigate={navigate} />;
      case 'blog': return <BlogPage onNavigate={navigate} />;
      case 'blog-article': return <BlogArticlePage slug={pageParams.slug as string} onNavigate={navigate} />;
      case 'blog-admin': return user ? <BlogAdminPage onNavigate={navigate} /> : <HomePage onNavigate={navigate} />;
      case 'notification-center': return user ? <NotificationCenterPage onNavigate={navigate} /> : <HomePage onNavigate={navigate} />;
      case 'messages': return user ? <MessagesPage /> : <HomePage onNavigate={navigate} />;
      case 'support': return user ? <NewSupportPage /> : <HomePage onNavigate={navigate} />;
      case 'settings': return user ? <SettingsPage /> : <HomePage onNavigate={navigate} />;
      case 'about': return <AboutPage />;
      case 'services': return <ServicesPage />;
      case 'contact': return <ContactPage />;
      case 'privacy': return <PrivacyPage />;
      case 'terms': return <TermsPage />;
      default: return <NotFoundPage onNavigate={navigate} />;
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
        {user && DASHBOARD_PAGES.includes(page) ? (
          <DashboardLayout currentPage={page} onNavigate={navigate} onSignOut={async () => { await signOut(); navigate('home'); }}>
            {renderPage()}
          </DashboardLayout>
        ) : (
          renderPage()
        )}
      </main>
      <Footer onNavigate={navigate} />

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        initialMode={authMode}
        onGotoDashboard={() => navigate('dashboard')}
      />
      <StatusCheckModal open={statusOpen} onClose={() => setStatusOpen(false)} />
      <SupportButton />
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
