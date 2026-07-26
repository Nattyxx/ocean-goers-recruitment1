import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { Spinner } from '../components/ui/Spinner';
import { GlassCard } from '../components/ui/GlassCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ApplicationTimeline } from '../components/ApplicationTimeline';
import { FileText, Calendar, Ship, ArrowRight } from 'lucide-react';

interface Props {
  onNavigate: (page: string) => void;
}

interface AppData {
  id: string;
  position: string;
  status: string;
  current_step: number;
  submitted_at: string;
}

interface DocRow {
  id: string;
}

export function TrackingPage({ onNavigate }: Props) {
  const { user, profile } = useAuth();
  const [app, setApp] = useState<AppData | null>(null);
  const [docCount, setDocCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('applications').select('*').eq('user_id', user.id).order('submitted_at', { ascending: false }).limit(1).maybeSingle();
    setApp(data as AppData | null);
    const { count } = await supabase.from('documents').select('id', { count: 'exact', head: true }).eq('user_id', user.id);
    setDocCount(count ?? 0);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="pt-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center min-h-[60vh]"><Spinner size={48} className="text-ocean-600" /></div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="pt-20 pb-12 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in-fast">
        <GlassCard className="text-center py-16">
          <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="font-display font-bold text-2xl text-ocean-900 mb-2">No Application Found</h2>
          <p className="text-slate-500 mb-6">You haven&apos;t submitted an application yet. Start your cruise ship career today!</p>
          <button onClick={() => onNavigate('home')} className="btn-gold inline-flex items-center gap-2">
            Apply Now <ArrowRight className="w-4 h-4" />
          </button>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className="pt-20 pb-12 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in-fast">
      <div className="mb-6">
        <h1 className="font-display font-bold text-3xl text-ocean-900 mb-2">Application Tracking</h1>
        <p className="text-slate-600">Track the progress of your cruise ship job application in real time.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Summary card */}
        <GlassCard className="lg:col-span-1">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-ocean-600 to-ocean-800 flex items-center justify-center mx-auto mb-4">
              <Ship className="w-8 h-8 text-gold-400" />
            </div>
            <h3 className="font-display font-bold text-lg text-ocean-900">{app.position || 'Cruise Ship Staff'}</h3>
            <div className="mt-2 flex justify-center">
              <StatusBadge status={app.status as any} />
            </div>
          </div>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
              <span className="text-slate-500 flex items-center gap-2"><Calendar className="w-4 h-4" /> Submitted</span>
              <span className="font-medium text-ocean-700">{new Date(app.submitted_at).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
              <span className="text-slate-500">Current Step</span>
              <span className="font-medium text-ocean-700">{app.current_step} / 7</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
              <span className="text-slate-500">Applicant</span>
              <span className="font-medium text-ocean-700">{profile?.full_name || '—'}</span>
            </div>
          </div>
          <button onClick={() => onNavigate('documents')} className="btn-ocean w-full mt-5 text-sm">
            Upload Documents
          </button>
        </GlassCard>

        {/* Timeline */}
        <GlassCard className="lg:col-span-2">
          <h3 className="font-display font-bold text-lg text-ocean-900 mb-6">Application Pipeline</h3>
          <ApplicationTimeline currentStep={app.current_step} hasDocuments={docCount > 0} />
        </GlassCard>
      </div>
    </div>
  );
}
