import { useState } from 'react';
import { Ship, ArrowRight, CheckCircle2 } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Spinner } from './ui/Spinner';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { supabase } from '../lib/supabase';
import { POSITIONS, CRUISE_LINES } from '../lib/constants';
import { sendNotificationEmail, documentsReminderBody } from '../lib/email';

export function ApplyModal({
  open,
  onClose,
  onNavigate,
}: {
  open: boolean;
  onClose: () => void;
  onNavigate: (page: string) => void;
}) {
  const { user, profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [position, setPosition] = useState('');
  const [preferredLine, setPreferredLine] = useState('');
  const [experience, setExperience] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast('Please sign in first to submit an application.', 'warning');
      return;
    }
    setLoading(true);

    const { data: existing } = await supabase
      .from('applications')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (existing) {
      toast('You already have an application. Track it from your dashboard.', 'info');
      setLoading(false);
      onClose();
      onNavigate('dashboard');
      return;
    }

    const { error } = await supabase.from('applications').insert({
      user_id: user.id,
      position,
      status: 'Pending',
      current_step: 3,
    });

    if (error) {
      toast(error.message, 'error');
      setLoading(false);
      return;
    }

    await supabase.from('notifications').insert({
      user_id: user.id,
      type: 'application',
      title: 'Application Submitted',
      message: `Your application for ${position} has been received. We'll review it shortly.`,
    });

    await sendNotificationEmail({
      userId: user.id,
      emailTo: email,
      recipientName: fullName,
      emailType: 'application_submitted',
      subject: 'Complete Your Ocean Goers Application – Upload Your Documents',
      bodyHtml: documentsReminderBody(fullName),
    }).catch(() => {});

    await supabase.from('profiles').upsert({
      id: user.id,
      phone,
      position,
      experience_years: experience ? Number(experience) : 0,
    });

    await refreshProfile();

    setDone(true);
    setLoading(false);
    toast('Application submitted successfully!', 'success');
  };

  const handleClose = () => {
    setDone(false);
    onClose();
    if (done) onNavigate('dashboard');
  };

  if (done) {
    return (
      <Modal open={open} onClose={handleClose} maxWidth="max-w-md">
        <div className="text-center py-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-100 mb-4 animate-scale-in">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h3 className="font-display font-bold text-2xl text-ocean-900 mb-2">Application Submitted!</h3>
          <p className="text-slate-600 mb-6">
            Your application for <span className="font-semibold text-ocean-700">{position}</span> has been received.
            Visit your dashboard to upload documents and track your progress.
          </p>
          <button onClick={handleClose} className="btn-gold w-full flex items-center justify-center gap-2">
            Go to Dashboard <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={handleClose} title="Apply for Cruise Ship Job" maxWidth="max-w-lg">
      {!user && (
        <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700">
          Please sign in or create an account to submit your application.
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-ocean-700 mb-1.5">Full Name</label>
            <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-field" placeholder="John Doe" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ocean-700 mb-1.5">Email</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" placeholder="you@example.com" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ocean-700 mb-1.5">Phone</label>
            <input type="tel" required value={phone} onChange={(e) => setPhone(e.target.value)} className="input-field" placeholder="+251 911 ..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-ocean-700 mb-1.5">Experience (years)</label>
            <input type="number" min="0" value={experience} onChange={(e) => setExperience(e.target.value)} className="input-field" placeholder="3" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ocean-700 mb-1.5">Desired Position</label>
            <select required value={position} onChange={(e) => setPosition(e.target.value)} className="input-field">
              <option value="">Select position</option>
              {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-ocean-700 mb-1.5">Preferred Cruise Line</label>
            <select value={preferredLine} onChange={(e) => setPreferredLine(e.target.value)} className="input-field">
              <option value="">Any</option>
              {CRUISE_LINES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="p-3 rounded-xl bg-ocean-50 border border-ocean-100 text-sm text-ocean-700 flex items-start gap-2">
          <Ship className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>After submitting, you&apos;ll be guided to upload required documents (passport, CV, medical certificate, etc.) to complete your application.</span>
        </div>

        <button type="submit" disabled={loading || !user} className="btn-gold w-full flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed">
          {loading ? <Spinner size={20} className="text-ocean-900" /> : <>Submit Application <ArrowRight className="w-4 h-4" /></>}
        </button>
      </form>
    </Modal>
  );
}
