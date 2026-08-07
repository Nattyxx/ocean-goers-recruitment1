import { useEffect, useState, useCallback } from 'react';
import { Calendar, Clock, Video, MapPin, User, Download, Loader2, CalendarClock } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { supabase } from '../lib/supabase';
import { GlassCard } from '../components/ui/GlassCard';
import { Skeleton } from '../components/ui/Skeleton';

interface InterviewData {
  id: string;
  interview_date: string | null;
  interview_time: string | null;
  interview_type: string | null;
  meeting_link: string | null;
  office_address: string | null;
  interviewer_name: string | null;
  notes: string | null;
}

export function InterviewPage() {
  const { user } = useAuth();
  const [interview, setInterview] = useState<InterviewData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    const { data: appRes } = await supabase
      .from('applications')
      .select('id')
      .eq('user_id', user.id)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!appRes) { setLoading(false); return; }

    const { data } = await supabase
      .from('interviews')
      .select('*')
      .eq('application_id', (appRes as { id: string }).id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    setInterview(data as InterviewData | null);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const countdown = (() => {
    if (!interview?.interview_date || !interview?.interview_time) return null;
    const target = new Date(`${interview.interview_date}T${interview.interview_time}`);
    const diff = target.getTime() - Date.now();
    if (diff <= 0) return null;
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    return { days, hours, mins };
  })();

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  if (!interview) {
    return (
      <div>
        <h1 className="font-display font-bold text-2xl text-ocean-900 mb-6">Interview Center</h1>
        <GlassCard className="text-center py-16">
          <CalendarClock className="w-16 h-16 text-slate-300 mx-auto mb-4" />
          <h2 className="font-display font-bold text-xl text-ocean-900 mb-2">No Interview Scheduled</h2>
          <p className="text-slate-500">Once an administrator schedules your interview, the details will appear here.</p>
        </GlassCard>
      </div>
    );
  }

  const isOnline = interview.interview_type === 'online';
  const interviewDate = interview.interview_date ? new Date(interview.interview_date) : null;

  return (
    <div>
      <h1 className="font-display font-bold text-2xl text-ocean-900 mb-6">Interview Center</h1>

      {/* Countdown */}
      {countdown && (
        <div className="mb-6 p-6 rounded-2xl bg-gradient-to-br from-ocean-800 to-ocean-950 text-center">
          <p className="text-ocean-200 text-sm mb-2">Your interview starts in</p>
          <div className="flex items-center justify-center gap-4 sm:gap-8">
            {[
              { label: 'Days', value: countdown.days },
              { label: 'Hours', value: countdown.hours },
              { label: 'Minutes', value: countdown.mins },
            ].map((unit) => (
              <div key={unit.label} className="text-center">
                <p className="font-display font-bold text-3xl sm:text-4xl text-gold-400">{unit.value}</p>
                <p className="text-xs text-ocean-300 uppercase tracking-wide">{unit.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Interview Details */}
        <GlassCard>
          <h3 className="font-display font-semibold text-lg text-ocean-900 mb-4">Interview Details</h3>
          <div className="space-y-3">
            {interviewDate && (
              <InfoRow icon={Calendar} label="Date" value={interviewDate.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} />
            )}
            {interview.interview_time && <InfoRow icon={Clock} label="Time" value={interview.interview_time} />}
            {interview.interview_type && (
              <InfoRow icon={isOnline ? Video : MapPin} label="Type" value={isOnline ? 'Online (Video Call)' : 'In-Person'} />
            )}
            {interview.interviewer_name && <InfoRow icon={User} label="Interviewer" value={interview.interviewer_name} />}
          </div>
        </GlassCard>

        {/* Location / Link */}
        <GlassCard>
          <h3 className="font-display font-semibold text-lg text-ocean-900 mb-4">{isOnline ? 'Meeting Link' : 'Office Address'}</h3>
          {isOnline && interview.meeting_link ? (
            <div>
              <a
                href={interview.meeting_link}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-ocean-600 text-white font-medium text-sm hover:bg-ocean-700 transition-colors mb-3"
              >
                <Video className="w-4 h-4" /> Join Meeting
              </a>
              <p className="text-xs text-slate-500 break-all">{interview.meeting_link}</p>
            </div>
          ) : interview.office_address ? (
            <p className="text-sm text-slate-600 leading-relaxed">{interview.office_address}</p>
          ) : (
            <p className="text-sm text-slate-400">No location details provided.</p>
          )}
          {interview.notes && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Additional Notes</p>
              <p className="text-sm text-slate-600">{interview.notes}</p>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50">
      <span className="flex items-center gap-2 text-sm text-slate-500"><Icon className="w-4 h-4 text-slate-400" /> {label}</span>
      <span className="text-sm font-medium text-ocean-900 text-right">{value}</span>
    </div>
  );
}
