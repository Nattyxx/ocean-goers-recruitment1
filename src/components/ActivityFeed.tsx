import { useEffect, useState } from 'react';
import {
  User, FileText, Upload, CreditCard, CheckCircle2, Calendar,
  Settings, Bell, Ship, FileCheck, type LucideIcon,
} from 'lucide-react';
import { fetchActivity, type ActivityLog } from '../lib/activity';
import { useAuth } from '../lib/auth';
import { Skeleton } from './ui/Skeleton';

const actionConfig: Record<string, { icon: LucideIcon; color: string }> = {
  account_created: { icon: User, color: 'from-ocean-500 to-ocean-700' },
  application_submitted: { icon: FileText, color: 'from-violet-500 to-violet-700' },
  document_uploaded: { icon: Upload, color: 'from-emerald-500 to-emerald-700' },
  passport_uploaded: { icon: Upload, color: 'from-emerald-500 to-emerald-700' },
  payment_uploaded: { icon: CreditCard, color: 'from-amber-500 to-amber-700' },
  payment_verified: { icon: CheckCircle2, color: 'from-teal-500 to-teal-700' },
  interview_scheduled: { icon: Calendar, color: 'from-sky-500 to-sky-700' },
  status_changed: { icon: Bell, color: 'from-rose-500 to-rose-700' },
  profile_updated: { icon: Settings, color: 'from-slate-500 to-slate-700' },
  document_approved: { icon: FileCheck, color: 'from-emerald-500 to-emerald-700' },
  document_rejected: { icon: FileText, color: 'from-rose-500 to-rose-700' },
  visa_processing: { icon: Ship, color: 'from-ocean-500 to-ocean-700' },
  job_offer: { icon: FileText, color: 'from-gold-400 to-gold-600' },
  deployment: { icon: Ship, color: 'from-ocean-600 to-ocean-800' },
};

const defaultConfig = { icon: Bell, color: 'from-slate-400 to-slate-600' };

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function formatAction(action: string): string {
  return action.split('_').map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

export function ActivityFeed({ limit = 10 }: { limit?: number }) {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    fetchActivity(user.id, limit).then((data) => {
      setActivities(data);
      setLoading(false);
    });
  }, [user, limit]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-8">
        <Bell className="w-10 h-10 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-400">No recent activity.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activities.map((activity, i) => {
        const config = actionConfig[activity.action] ?? defaultConfig;
        const Icon = config.icon;
        return (
          <div
            key={activity.id}
            className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-100 hover:shadow-sm transition-all animate-fade-in"
            style={{ animationDelay: `${i * 0.04}s` }}
          >
            <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${config.color} flex items-center justify-center flex-shrink-0`}>
              <Icon className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ocean-900">{formatAction(activity.action)}</p>
              {activity.description && <p className="text-xs text-slate-500 truncate">{activity.description}</p>}
            </div>
            <span className="text-xs text-slate-400 flex-shrink-0">{timeAgo(activity.created_at)}</span>
          </div>
        );
      })}
    </div>
  );
}
