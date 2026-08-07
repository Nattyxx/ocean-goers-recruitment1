import { useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  LayoutDashboard, FileText, Upload, CreditCard, Calendar, MessageSquare,
  Bell, BookOpen, User, LifeBuoy, LogOut, Menu, X, Settings, ChevronRight,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { StatusBadge } from './ui/StatusBadge';

interface DashboardLayoutProps {
  currentPage: string;
  onNavigate: (page: string) => void;
  onSignOut: () => void;
  children: ReactNode;
}

const NAV_ITEMS = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'tracking', label: 'My Application', icon: FileText },
  { key: 'documents', label: 'Documents', icon: Upload },
  { key: 'payment', label: 'Payment', icon: CreditCard },
  { key: 'interview', label: 'Interview', icon: Calendar },
  { key: 'messages', label: 'Messages', icon: MessageSquare },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'resources', label: 'Resources', icon: BookOpen },
  { key: 'settings', label: 'Profile', icon: User },
  { key: 'support', label: 'Support', icon: LifeBuoy },
];

export function DashboardLayout({ currentPage, onNavigate, onSignOut, children }: DashboardLayoutProps) {
  const { profile } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifCount, setNotifCount] = useState(0);
  const [messageCount, setMessageCount] = useState(0);
  const [appStatus, setAppStatus] = useState<string | null>(null);

  const loadHeaderData = useCallback(async () => {
    if (!profile) return;
    const [notifRes, msgRes, appRes] = await Promise.all([
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', profile.id).eq('read', false),
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', profile.id).eq('type', 'message').eq('read', false),
      supabase.from('applications').select('status').eq('user_id', profile.id).order('submitted_at', { ascending: false }).limit(1).maybeSingle(),
    ]);
    setNotifCount(notifRes.count ?? 0);
    setMessageCount(msgRes.count ?? 0);
    setAppStatus((appRes.data as { status: string } | null)?.status ?? null);
  }, [profile]);

  useEffect(() => {
    loadHeaderData();
    const interval = setInterval(loadHeaderData, 30000);
    return () => clearInterval(interval);
  }, [loadHeaderData]);

  const handleNav = (page: string) => {
    onNavigate(page);
    setSidebarOpen(false);
  };

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-white/10">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-ocean-600 to-ocean-800 flex items-center justify-center flex-shrink-0">
          <LayoutDashboard className="w-5 h-5 text-gold-400" />
        </div>
        <div>
          <p className="font-display font-bold text-white text-sm leading-none">Ocean Goers</p>
          <p className="text-[10px] text-ocean-300 tracking-widest uppercase mt-0.5">Dashboard</p>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = currentPage === item.key;
          return (
            <button
              key={item.key}
              onClick={() => handleNav(item.key)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'bg-gold-400 text-ocean-900 shadow-sm'
                  : 'text-ocean-200 hover:bg-white/10 hover:text-white'
              }`}
            >
              <item.icon className="w-4 h-4 flex-shrink-0" />
              <span>{item.label}</span>
              {item.key === 'notifications' && notifCount > 0 && (
                <span className={`ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-ocean-900 text-gold-400' : 'bg-rose-500 text-white'}`}>
                  {notifCount}
                </span>
              )}
              {item.key === 'messages' && messageCount > 0 && (
                <span className={`ml-auto text-xs font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-ocean-900 text-gold-400' : 'bg-sky-500 text-white'}`}>
                  {messageCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-white/10">
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-300 hover:bg-rose-500/20 hover:text-rose-200 transition-all"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-gradient-to-b from-ocean-900 to-ocean-950 fixed inset-y-0 left-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <>
          <div className="lg:hidden fixed inset-0 bg-black/50 z-40 animate-fade-in-fast" onClick={() => setSidebarOpen(false)} />
          <aside className="lg:hidden fixed inset-y-0 left-0 w-64 bg-gradient-to-b from-ocean-900 to-ocean-950 z-50 flex flex-col animate-slide-in-left">
            <button onClick={() => setSidebarOpen(false)} className="absolute top-4 right-4 p-1.5 rounded-lg text-ocean-200 hover:bg-white/10">
              <X className="w-5 h-5" />
            </button>
            {sidebarContent}
          </aside>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 lg:ml-64 flex flex-col min-h-screen">
        {/* Dashboard Header */}
        <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-xl border-b border-slate-200 h-16 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-ocean-700 hover:bg-slate-100"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ocean-600 to-ocean-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-gold-400" />
                )}
              </div>
              <div className="hidden sm:block">
                <p className="font-display font-semibold text-sm text-ocean-900 leading-none">{profile?.full_name ?? 'Applicant'}</p>
                {appStatus && <div className="mt-1"><StatusBadge status={appStatus as any} size="sm" /></div>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onNavigate('notifications')}
              className="relative p-2.5 rounded-xl text-ocean-700 hover:bg-ocean-50 transition-colors"
              aria-label="Notifications"
            >
              <Bell className="w-5 h-5" />
              {notifCount > 0 && (
                <span className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {notifCount > 9 ? '9+' : notifCount}
                </span>
              )}
            </button>
            <button
              onClick={() => onNavigate('messages')}
              className="relative p-2.5 rounded-xl text-ocean-700 hover:bg-ocean-50 transition-colors"
              aria-label="Messages"
            >
              <MessageSquare className="w-5 h-5" />
              {messageCount > 0 && (
                <span className="absolute top-1 right-1 min-w-4 h-4 px-1 bg-sky-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {messageCount > 9 ? '9+' : messageCount}
                </span>
              )}
            </button>
            <button
              onClick={() => onNavigate('settings')}
              className="p-2.5 rounded-xl text-ocean-700 hover:bg-ocean-50 transition-colors"
              aria-label="Settings"
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
