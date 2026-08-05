import { useState, useEffect } from 'react';
import { Ship, Menu, X, LogOut, LayoutDashboard, Bell, ShieldCheck, FileText, Mail } from 'lucide-react';
import { useAuth } from '../lib/auth';

interface Props {
  onLogin: () => void;
  onApply: () => void;
  onStatus: () => void;
  onNavigate: (page: string) => void;
  currentPage: string;
}

export function Navbar({ onLogin, onApply, onStatus, onNavigate, currentPage }: Props) {
  const { user, profile, signOut } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleNav = (page: string) => {
    onNavigate(page);
    setMobileOpen(false);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        scrolled ? 'bg-white/80 backdrop-blur-xl shadow-glass' : 'bg-transparent'
      }`}
    >
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <button onClick={() => handleNav('home')} className="flex items-center gap-2.5 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ocean-600 to-ocean-800 flex items-center justify-center shadow-md group-hover:scale-105 transition-transform">
            <Ship className="w-5 h-5 text-gold-400" />
          </div>
          <div className="text-left">
            <span className={`font-display font-bold text-lg leading-none ${scrolled ? 'text-ocean-900' : 'text-white'}`}>
              Ocean Goers
            </span>
            <span className={`block text-[10px] tracking-widest uppercase ${scrolled ? 'text-ocean-500' : 'text-ocean-200'}`}>
              Cruise Recruitment
            </span>
          </div>
        </button>

        <div className="hidden lg:flex items-center gap-1">
          {['home', 'about', 'services', 'blog', 'tracking', 'contact'].map((p) => (
            <button
              key={p}
              onClick={() => handleNav(p)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors capitalize ${
                currentPage === p
                  ? scrolled ? 'bg-ocean-100 text-ocean-700' : 'bg-white/15 text-white'
                  : scrolled ? 'text-ocean-700 hover:bg-ocean-50' : 'text-ocean-50 hover:bg-white/10'
              }`}
            >
              {p === 'home' ? 'Home' : p === 'about' ? 'About' : p === 'services' ? 'Services' : p === 'blog' ? 'Career Resources' : p === 'tracking' ? 'Track' : 'Contact'}
            </button>
          ))}
        </div>

        <div className="hidden lg:flex items-center gap-3">
          {user ? (
            <>
              <button
                onClick={() => onNavigate('notifications')}
                className="relative p-2 rounded-full hover:bg-ocean-50 transition-colors"
                title="Notifications"
              >
                <Bell className={`w-5 h-5 ${scrolled ? 'text-ocean-700' : 'text-white'}`} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-gold-400 rounded-full" />
              </button>
              <button
                onClick={() => onNavigate('dashboard')}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-ocean-100 text-ocean-700 font-medium text-sm hover:bg-ocean-200 transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </button>
              {profile?.is_admin && (
                <button
                  onClick={() => onNavigate('admin')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-colors ${
                    currentPage === 'admin'
                      ? 'bg-gold-100 text-gold-700'
                      : 'bg-gold-50 text-gold-700 hover:bg-gold-100'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  Admin
                </button>
              )}
              {profile?.is_admin && (
                <button
                  onClick={() => onNavigate('blog-admin')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-colors ${
                    currentPage === 'blog-admin'
                      ? 'bg-ocean-100 text-ocean-700'
                      : 'text-ocean-700 hover:bg-ocean-50'
                  } ${scrolled ? '' : 'text-white hover:bg-white/10'}`}
                >
                  <FileText className="w-4 h-4" />
                  Blog
                </button>
              )}
              {profile?.is_admin && (
                <button
                  onClick={() => onNavigate('notification-center')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium text-sm transition-colors ${
                    currentPage === 'notification-center'
                      ? 'bg-gold-100 text-gold-700'
                      : 'text-gold-700 hover:bg-gold-50'
                  } ${scrolled ? '' : 'text-gold-300 hover:bg-white/10'}`}
                >
                  <Mail className="w-4 h-4" />
                  Notifications
                </button>
              )}
              <button
                onClick={signOut}
                className="p-2 rounded-full hover:bg-rose-50 transition-colors"
                title="Sign out"
              >
                <LogOut className={`w-5 h-5 ${scrolled ? 'text-ocean-700' : 'text-white'}`} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={onStatus}
                className={`text-sm font-medium px-4 py-2 rounded-full transition-colors ${
                  scrolled ? 'text-ocean-700 hover:bg-ocean-50' : 'text-white hover:bg-white/10'
                }`}
              >
                Check Status
              </button>
              <button onClick={onLogin} className="btn-ghost text-sm">
                Login
              </button>
              <button onClick={onApply} className="btn-gold text-sm">
                Apply Now
              </button>
            </>
          )}
        </div>

        <button
          onClick={() => setMobileOpen((s) => !s)}
          className={`lg:hidden p-2 rounded-lg ${scrolled ? 'text-ocean-900' : 'text-white'}`}
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {mobileOpen && (
        <div className="lg:hidden bg-white/95 backdrop-blur-xl border-t border-slate-200 animate-fade-in-fast">
          <div className="px-4 py-4 space-y-1">
            {['home', 'about', 'services', 'blog', 'tracking', 'contact'].map((p) => (
              <button
                key={p}
                onClick={() => handleNav(p)}
                className={`block w-full text-left px-4 py-3 rounded-xl font-medium capitalize ${
                  currentPage === p ? 'bg-ocean-100 text-ocean-700' : 'text-ocean-700 hover:bg-slate-50'
                }`}
              >
                {p === 'home' ? 'Home' : p === 'about' ? 'About' : p === 'services' ? 'Services' : p === 'blog' ? 'Career Resources' : p === 'tracking' ? 'Track Application' : 'Contact'}
              </button>
            ))}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              {user ? (
                <>
                  <button onClick={() => handleNav('dashboard')} className="btn-ocean w-full text-sm">Dashboard</button>
                  {profile?.is_admin && (
                    <>
                      <button onClick={() => handleNav('admin')} className="btn-gold w-full text-sm flex items-center justify-center gap-2">
                        <ShieldCheck className="w-4 h-4" /> Admin
                      </button>
                      <button onClick={() => handleNav('blog-admin')} className="btn-ghost w-full text-sm text-ocean-700 border-ocean-200 flex items-center justify-center gap-2">
                        <FileText className="w-4 h-4" /> Blog Management
                      </button>
                      <button onClick={() => handleNav('notification-center')} className="btn-gold w-full text-sm flex items-center justify-center gap-2">
                        <Mail className="w-4 h-4" /> Notification Center
                      </button>
                    </>
                  )}
                  <button onClick={() => handleNav('notifications')} className="btn-ghost w-full text-sm text-ocean-700 border-ocean-200">Notifications</button>
                  <button onClick={signOut} className="w-full text-sm text-rose-600 font-medium py-3">Sign Out</button>
                </>
              ) : (
                <>
                  <button onClick={() => { onStatus(); setMobileOpen(false); }} className="w-full text-sm text-ocean-700 font-medium py-3">Check Status</button>
                  <button onClick={() => { onLogin(); setMobileOpen(false); }} className="btn-ghost w-full text-sm text-ocean-700 border-ocean-200">Login</button>
                  <button onClick={() => { onApply(); setMobileOpen(false); }} className="btn-gold w-full text-sm">Apply Now</button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
