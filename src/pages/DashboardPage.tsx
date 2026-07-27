import { useEffect, useState, useCallback } from 'react';
import {
  User, FileText, Upload, CreditCard, Bell, MessageSquare, LifeBuoy, Settings, LogOut,
  FileCheck, Clock, TrendingUp, CalendarClock, Camera, Mail, Phone, Briefcase, ArrowRight,
  CheckCircle2, AlertCircle, Wallet, BadgeCheck,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { supabase } from '../lib/supabase';
import { GlassCard } from '../components/ui/GlassCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Spinner } from '../components/ui/Spinner';
import { ApplicationTimeline, type PaymentStatus } from '../components/ApplicationTimeline';
import { Modal } from '../components/ui/Modal';
import { POSITIONS, REQUIRED_DOC_KEYS } from '../lib/constants';

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

interface PaymentRow {
  id: string;
  status: string;
  rejection_reason: string | null;
}

export function DashboardPage({ onNavigate }: Props) {
  const { user, profile, signOut, updateProfile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [application, setApplication] = useState<AppData | null>(null);
  const [docCount, setDocCount] = useState(0);
  const [uploadedDocTypes, setUploadedDocTypes] = useState<string[]>([]);
  const [payment, setPayment] = useState<PaymentRow | null>(null);
  const [notifCount, setNotifCount] = useState(0);
  const [editingProfile, setEditingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [phone, setPhone] = useState(profile?.phone ?? '');
  const [position, setPosition] = useState(profile?.position ?? '');

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const [appRes, docRes, notifRes] = await Promise.all([
      supabase.from('applications').select('*').eq('user_id', user.id).order('submitted_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('documents').select('doc_type').eq('user_id', user.id),
      supabase.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', user.id).eq('read', false),
    ]);

    setApplication(appRes.data as AppData | null);
    const docTypes = (docRes.data ?? []).map((d) => d.doc_type);
    setDocCount(docTypes.length);
    setUploadedDocTypes([...new Set(docTypes)]);
    setNotifCount(notifRes.count ?? 0);

    if (appRes.data) {
      const { data: payData } = await supabase
        .from('payments')
        .select('id, status, rejection_reason')
        .eq('application_id', (appRes.data as AppData).id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setPayment(payData as PaymentRow | null);
    } else {
      setPayment(null);
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    setFullName(profile?.full_name ?? '');
    setPhone(profile?.phone ?? '');
    setPosition(profile?.position ?? '');
  }, [profile]);

  const profileCompletion = (() => {
    if (!profile) return 0;
    let filled = 0;
    const fields = [profile.full_name, profile.phone, profile.avatar_url, profile.position, profile.notes];
    fields.forEach((f) => { if (f && f.trim()) filled++; });
    return Math.round((filled / fields.length) * 100);
  })();

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);

    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: upErr } = await supabase.storage.from('documents').upload(path, file, { upsert: true });
    if (upErr) {
      toast(upErr.message, 'error');
      setUploadingAvatar(false);
      return;
    }

    const { data: pub } = supabase.storage.from('documents').getPublicUrl(path);
    const { error } = await updateProfile({ avatar_url: pub.publicUrl });
    if (error) {
      toast(error, 'error');
    } else {
      toast('Profile picture updated!', 'success');
    }
    setUploadingAvatar(false);
  };

  const handleSaveProfile = async () => {
    const { error } = await updateProfile({ full_name: fullName, phone, position, profile_complete: profileCompletion >= 80 });
    if (error) {
      toast(error, 'error');
    } else {
      toast('Profile updated successfully!', 'success');
      setEditingProfile(false);
    }
  };

  const requiredDocsComplete = REQUIRED_DOC_KEYS.every((k) => uploadedDocTypes.includes(k));

  // Payment CTA visibility: show only if all required docs uploaded AND no verified payment yet
  const showPayFeeCta =
    !!application &&
    requiredDocsComplete &&
    payment?.status !== 'Verified';

  // "Upload Documents" button hidden once all required docs are uploaded
  const hideUploadDocsButton = requiredDocsComplete;

  const paymentTimelineStatus: PaymentStatus = !payment
    ? 'none'
    : payment.status === 'Verified'
      ? 'verified'
      : payment.status === 'Rejected'
        ? 'rejected'
        : 'pending';

  const handlePayFeeClick = () => {
    onNavigate('payment');
  };

  const dashboardCards = [
    { icon: User, label: 'My Profile', page: 'dashboard', color: 'from-ocean-500 to-ocean-700' },
    { icon: FileText, label: 'My Applications', page: 'tracking', color: 'from-violet-500 to-violet-700' },
    ...(hideUploadDocsButton
      ? []
      : [{ icon: Upload, label: 'Upload Documents', page: 'documents', color: 'from-emerald-500 to-emerald-700' }]),
    { icon: CreditCard, label: 'Payment Receipt', page: 'payment', color: 'from-amber-500 to-amber-700' },
    { icon: Bell, label: 'Notifications', page: 'notifications', color: 'from-rose-500 to-rose-700' },
    { icon: MessageSquare, label: 'Messages', page: 'messages', color: 'from-sky-500 to-sky-700' },
    { icon: LifeBuoy, label: 'Support', page: 'support', color: 'from-teal-500 to-teal-700' },
    { icon: Settings, label: 'Settings', page: 'settings', color: 'from-slate-500 to-slate-700' },
  ];

  if (loading) {
    return (
      <div className="pt-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Spinner size={48} className="text-ocean-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in-fast">
      {/* Welcome banner */}
      <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-ocean-800 via-ocean-700 to-ocean-600 p-6 sm:p-8 mb-6">
        <div className="absolute inset-0 hero-grid opacity-20" />
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-gold-400/15 rounded-full blur-3xl" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-gold-400" />
                )}
              </div>
              <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gold-400 text-ocean-900 flex items-center justify-center cursor-pointer shadow-md hover:scale-110 transition-transform">
                <Camera className="w-4 h-4" />
                <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploadingAvatar} />
              </label>
            </div>
            <div>
              <p className="text-ocean-200 text-sm">Welcome back,</p>
              <h1 className="font-display font-bold text-2xl sm:text-3xl text-white">{profile?.full_name || 'Applicant'}</h1>
              <p className="text-ocean-200 text-sm">{profile?.email || user?.email}</p>
            </div>
          </div>
          {application && (
            <div className="flex flex-col items-start sm:items-end gap-2">
              <StatusBadge status={application.status as any} />
              <p className="text-ocean-200 text-xs">Applied: {new Date(application.submitted_at).toLocaleDateString()}</p>
            </div>
          )}
        </div>
      </div>

      {/* Registration Fee CTA */}
      {showPayFeeCta && (
        <div className="mb-6 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-gold-50 to-amber-50 border-2 border-gold-200 animate-scale-in">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-gold-300 to-gold-500 flex items-center justify-center flex-shrink-0">
                <Wallet className="w-6 h-6 text-ocean-900" />
              </div>
              <div>
                <h3 className="font-display font-bold text-lg text-ocean-900">Registration Fee Required</h3>
                <p className="text-sm text-slate-600 mt-0.5">
                  All documents uploaded. Pay the <span className="font-semibold text-ocean-800">5,000 ETB</span> registration fee to proceed.
                </p>
                {payment?.status === 'Rejected' && (
                  <p className="text-sm text-rose-600 mt-1 font-medium">
                    Your previous receipt was rejected. Please upload a new payment receipt.
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={handlePayFeeClick}
              className="btn-gold whitespace-nowrap flex items-center gap-2 animate-pulse-gold"
            >
              <CreditCard className="w-5 h-5" />
              {payment?.status === 'Rejected' ? 'Upload New Receipt' : 'Pay Registration Fee'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Payment verified banner */}
      {payment?.status === 'Verified' && (
        <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 animate-scale-in">
          <BadgeCheck className="w-6 h-6 text-emerald-600 flex-shrink-0" />
          <div>
            <p className="font-semibold text-emerald-800">Payment Verified</p>
            <p className="text-sm text-emerald-600">Your registration fee has been confirmed. Your application is now under review.</p>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { icon: FileCheck, label: 'Applications Submitted', value: application ? '1' : '0', color: 'text-ocean-600', bg: 'bg-ocean-50' },
          { icon: Upload, label: 'Required Documents', value: `${REQUIRED_DOC_KEYS.filter((k) => uploadedDocTypes.includes(k)).length}/${REQUIRED_DOC_KEYS.length}`, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { icon: TrendingUp, label: 'Profile Completion', value: `${profileCompletion}%`, color: 'text-gold-600', bg: 'bg-gold-50' },
          { icon: CalendarClock, label: 'Last Login', value: profile?.last_login ? new Date(profile.last_login).toLocaleDateString() : 'Today', color: 'text-violet-600', bg: 'bg-violet-50' },
        ].map((s) => (
          <GlassCard key={s.label} className="animate-fade-in" >
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div className="min-w-0">
                <p className="font-display font-bold text-xl text-ocean-900 truncate">{s.value}</p>
                <p className="text-xs text-slate-500 truncate">{s.label}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: profile card + timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile card */}
          <GlassCard>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display font-bold text-lg text-ocean-900">Profile Overview</h3>
              <button onClick={() => setEditingProfile(true)} className="text-sm text-ocean-600 hover:text-ocean-700 font-medium flex items-center gap-1">
                <Settings className="w-4 h-4" /> Edit
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <Mail className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600">{user?.email}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600">{profile?.phone || 'Not set'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <Briefcase className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600">{profile?.position || 'Not set'}</span>
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-slate-600">Profile Completion</span>
                <span className="font-semibold text-ocean-700">{profileCompletion}%</span>
              </div>
              <ProgressBar value={profileCompletion} />
            </div>
            {profileCompletion < 80 && (
              <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>Complete your profile to improve your chances. Add a photo, phone, and position.</span>
                <button
                  onClick={() => setEditingProfile(true)}
                  className="ml-auto flex-shrink-0 px-3 py-1 rounded-lg bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 transition-colors"
                >
                  Add Info
                </button>
              </div>
            )}
          </GlassCard>

          {/* Application timeline */}
          <GlassCard>
            <h3 className="font-display font-bold text-lg text-ocean-900 mb-5">Application Progress</h3>
            {application ? (
              <ApplicationTimeline
                currentStep={application.current_step}
                hasDocuments={requiredDocsComplete}
                paymentStatus={paymentTimelineStatus}
              />
            ) : (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 mb-4">No application submitted yet.</p>
                <button onClick={() => onNavigate('home')} className="btn-gold text-sm inline-flex items-center gap-2">
                  Apply Now <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Right: quick actions */}
        <div className="space-y-6">
          <GlassCard>
            <h3 className="font-display font-bold text-lg text-ocean-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              {dashboardCards.map((c) => (
                <button
                  key={c.label}
                  onClick={() => onNavigate(c.page)}
                  className="group flex flex-col items-center gap-2 p-4 rounded-xl hover:bg-slate-50 transition-all duration-300 hover:-translate-y-0.5"
                >
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${c.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <c.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-medium text-ocean-700 text-center">{c.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={signOut}
              className="w-full mt-4 flex items-center justify-center gap-2 py-3 rounded-xl bg-rose-50 text-rose-600 font-medium text-sm hover:bg-rose-100 transition-colors"
            >
              <LogOut className="w-4 h-4" /> Logout
            </button>
          </GlassCard>

          {/* Notifications preview */}
          <GlassCard>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-bold text-lg text-ocean-900">Recent Updates</h3>
              {notifCount > 0 && <span className="text-xs font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full">{notifCount} new</span>}
            </div>
            {notifCount > 0 ? (
              <button onClick={() => onNavigate('notifications')} className="text-sm text-ocean-600 hover:text-ocean-700 font-medium">
                View all notifications →
              </button>
            ) : (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" /> All caught up!
              </div>
            )}
          </GlassCard>
        </div>
      </div>

      {/* Edit profile modal */}
      <Modal open={editingProfile} onClose={() => setEditingProfile(false)} title="Edit Profile" maxWidth="max-w-md">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ocean-700 mb-1.5">Full Name</label>
            <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-field" />
          </div>
          <div>
            <label className="block text-sm font-medium text-ocean-700 mb-1.5">Phone</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className="input-field" placeholder="+251 ..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-ocean-700 mb-1.5">Desired Position</label>
            <select value={position} onChange={(e) => setPosition(e.target.value)} className="input-field">
              <option value="">Select position</option>
              {POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <button onClick={handleSaveProfile} className="btn-gold w-full">Save Changes</button>
        </div>
      </Modal>
    </div>
  );
}
