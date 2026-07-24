import { useEffect, useState, useCallback } from 'react';
import {
  MessageSquare, CalendarClock, FileWarning, CreditCard, Plane, ClipboardList,
  Bell, CheckCheck, Trash2,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { supabase } from '../lib/supabase';
import { GlassCard } from '../components/ui/GlassCard';
import { Spinner } from '../components/ui/Spinner';
import { NOTIF_TYPES } from '../lib/constants';

const icons: Record<string, typeof Bell> = {
  message: MessageSquare, interview: CalendarClock, missing_document: FileWarning,
  payment: CreditCard, visa: Plane, application: ClipboardList,
};

const typeStyles: Record<string, string> = {
  message: 'from-sky-500 to-sky-700',
  interview: 'from-violet-500 to-violet-700',
  missing_document: 'from-amber-500 to-amber-700',
  payment: 'from-emerald-500 to-emerald-700',
  visa: 'from-ocean-500 to-ocean-700',
  application: 'from-rose-500 to-rose-700',
};

interface Notif {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export function NotificationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setNotifs((data as Notif[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ read: true }).eq('id', id);
    setNotifs((n) => n.map((x) => x.id === id ? { ...x, read: true } : x));
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false);
    setNotifs((n) => n.map((x) => ({ ...x, read: true })));
    toast('All notifications marked as read.', 'success');
  };

  const deleteNotif = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    setNotifs((n) => n.filter((x) => x.id !== id));
  };

  const filtered = filter === 'all' ? notifs : notifs.filter((n) => n.type === filter);
  const unreadCount = notifs.filter((n) => !n.read).length;

  if (loading) {
    return (
      <div className="pt-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center min-h-[60vh]"><Spinner size={48} className="text-ocean-600" /></div>
      </div>
    );
  }

  return (
    <div className="pt-20 pb-12 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in-fast">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-3xl text-ocean-900 mb-1">Notifications</h1>
          <p className="text-slate-600">{unreadCount > 0 ? `${unreadCount} unread notification${unreadCount > 1 ? 's' : ''}` : 'You\'re all caught up!'}</p>
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="flex items-center gap-2 text-sm font-medium text-ocean-600 hover:text-ocean-700 px-4 py-2 rounded-full bg-ocean-50 hover:bg-ocean-100 transition-colors">
            <CheckCheck className="w-4 h-4" /> Mark all read
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === 'all' ? 'bg-ocean-700 text-white' : 'bg-white text-ocean-700 border border-slate-200 hover:bg-slate-50'}`}
        >
          All
        </button>
        {NOTIF_TYPES.map((t) => {
          const Icon = icons[t.key] ?? Bell;
          return (
            <button
              key={t.key}
              onClick={() => setFilter(t.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === t.key ? 'bg-ocean-700 text-white' : 'bg-white text-ocean-700 border border-slate-200 hover:bg-slate-50'}`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <GlassCard className="text-center py-12">
            <Bell className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No notifications to display.</p>
          </GlassCard>
        ) : (
          filtered.map((n, i) => {
            const Icon = icons[n.type] ?? Bell;
            return (
              <div
                key={n.id}
                className={`glass-card p-4 flex items-start gap-4 animate-fade-in transition-all ${!n.read ? 'border-l-4 border-l-ocean-500' : ''}`}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${typeStyles[n.type] ?? 'from-slate-500 to-slate-700'} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="font-display font-semibold text-sm text-ocean-900">{n.title}</h4>
                    {!n.read && <span className="w-2 h-2 rounded-full bg-ocean-500" />}
                  </div>
                  <p className="text-sm text-slate-600">{n.message}</p>
                  <p className="text-xs text-slate-400 mt-1">{new Date(n.created_at).toLocaleString()}</p>
                </div>
                <div className="flex flex-col gap-1">
                  {!n.read && (
                    <button onClick={() => markRead(n.id)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-ocean-600 transition-colors" title="Mark read">
                      <CheckCheck className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => deleteNotif(n.id)} className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-colors" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
