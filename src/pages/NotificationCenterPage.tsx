import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, Send, Mail, Clock, CheckCircle2, XCircle, FileText, Users,
  TrendingUp, Bell, ChevronRight, Loader2, ArrowLeft, Eye, Trash2,
  Save, Paperclip, X, Calendar, Phone, Mail as MailIcon, Briefcase,
  FileCheck, CreditCard, StickyNote, History, Send as SendIcon,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { supabase } from '../lib/supabase';
import { GlassCard } from '../components/ui/GlassCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Modal } from '../components/ui/Modal';
import { Skeleton } from '../components/ui/Skeleton';
import {
  NOTIFICATION_TEMPLATES, fetchDrafts, saveDraft, deleteDraft,
  fetchAdminNotes, addAdminNote, updateAdminNote, deleteAdminNote,
  uploadAttachment, sendManualNotification, sendBulkNotification,
  type EmailDraft, type AdminNote, type AttachmentInfo, type NotificationTemplate,
} from '../lib/notifications';
import { fetchEmailLogsForUser, EMAIL_LABELS, type EmailLogRow } from '../lib/email';
import { STATUSES, DOC_TYPES } from '../lib/constants';
import { EmailComposer } from '../components/EmailComposer';

interface Props {
  onNavigate: (page: string) => void;
}

interface ApplicantRow {
  id: string;
  user_id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  nationality: string | null;
  position: string | null;
  status: string;
  current_step: number;
  submitted_at: string | null;
  created_at: string;
  doc_count: number;
}

export function NotificationCenterPage({ onNavigate }: Props) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [applicants, setApplicants] = useState<ApplicantRow[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedApplicant, setSelectedApplicant] = useState<ApplicantRow | null>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerRecipient, setComposerRecipient] = useState<ApplicantRow | null>(null);
  const [drafts, setDrafts] = useState<EmailDraft[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [emailLogStats, setEmailLogStats] = useState({ total: 0, today: 0, failed: 0, scheduled: 0 });

  const loadApplicants = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('applications')
      .select('id, user_id, position, status, current_step, submitted_at, updated_at')
      .order('submitted_at', { ascending: false });

    if (error || !data) { setApplicants([]); setLoading(false); return; }

    const userIds = [...new Set(data.map((a: any) => a.user_id))];
    const [profileRes, docRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, phone, email, position, experience_years').in('id', userIds),
      supabase.from('documents').select('id, user_id').in('user_id', userIds),
    ]);

    type P = { id: string; full_name: string | null; phone: string | null; email: string | null; position: string | null };
    const profileMap = new Map((profileRes.data ?? []).map((p: P) => [p.id, p]));
    const docCountMap = new Map<string, number>();
    (docRes.data ?? []).forEach((d: any) => {
      docCountMap.set(d.user_id, (docCountMap.get(d.user_id) ?? 0) + 1);
    });

    const rows: ApplicantRow[] = (data as any[]).map((a) => {
      const p = profileMap.get(a.user_id);
      return {
        id: a.id,
        user_id: a.user_id,
        full_name: p?.full_name ?? 'Unknown',
        email: p?.email ?? '',
        phone: p?.phone ?? null,
        nationality: null,
        position: a.position ?? p?.position ?? null,
        status: a.status,
        current_step: a.current_step,
        submitted_at: a.submitted_at,
        created_at: a.updated_at,
        doc_count: docCountMap.get(a.user_id) ?? 0,
      };
    });

    setApplicants(rows);
    setLoading(false);
  }, []);

  const loadDrafts = useCallback(async () => {
    if (!profile?.id) return;
    const d = await fetchDrafts(profile.id);
    setDrafts(d);
  }, [profile?.id]);

  const loadStats = useCallback(async () => {
    const { count: total } = await supabase.from('email_log').select('*', { count: 'exact', head: true });
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const { count: todayCount } = await supabase.from('email_log').select('*', { count: 'exact', head: true }).gte('sent_at', today.toISOString());
    const { count: failedCount } = await supabase.from('email_log').select('*', { count: 'exact', head: true }).eq('status', 'failed');
    const { count: scheduledCount } = await supabase.from('email_log').select('*', { count: 'exact', head: true }).not('scheduled_at', 'is', null);
    setEmailLogStats({ total: total ?? 0, today: todayCount ?? 0, failed: failedCount ?? 0, scheduled: scheduledCount ?? 0 });
  }, []);

  useEffect(() => {
    if (profile?.is_admin) {
      loadApplicants();
      loadDrafts();
      loadStats();
    } else {
      setLoading(false);
    }
  }, [profile, loadApplicants, loadDrafts, loadStats]);

  const filtered = useMemo(() => {
    return applicants.filter((a) => {
      if (statusFilter !== 'All' && a.status !== statusFilter) return false;
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        (a.full_name?.toLowerCase().includes(q) ?? false) ||
        (a.email?.toLowerCase().includes(q) ?? false) ||
        a.status.toLowerCase().includes(q)
      );
    });
  }, [applicants, search, statusFilter]);

  const draftCount = drafts.filter((d) => d.status === 'draft').length;

  const handleOpenComposer = (applicant: ApplicantRow) => {
    setComposerRecipient(applicant);
    setComposerOpen(true);
  };

  const handleSent = () => {
    setComposerOpen(false);
    setComposerRecipient(null);
    loadStats();
    if (selectedApplicant) {
      // Refresh will happen via the profile component's own reload
    }
  };

  if (!profile?.is_admin) {
    return (
      <div className="pt-20 pb-12 max-w-4xl mx-auto px-4 text-center">
        <h1 className="font-display font-bold text-2xl text-ocean-900 mb-3">Access Denied</h1>
        <p className="text-slate-600">You do not have permission to access the Notification Center.</p>
      </div>
    );
  }

  // ===== Applicant Profile View =====
  if (selectedApplicant) {
    return (
      <ApplicantProfile
        applicant={selectedApplicant}
        onBack={() => setSelectedApplicant(null)}
        onSendNotification={() => handleOpenComposer(selectedApplicant)}
        adminId={profile.id}
        adminName={profile.full_name}
      />
    );
  }

  return (
    <div className="pt-20 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in-fast">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-bold text-3xl text-ocean-900 flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-ocean-600 to-ocean-800 flex items-center justify-center">
              <Bell className="w-6 h-6 text-gold-400" />
            </div>
            Notification Center
          </h1>
          <p className="text-slate-600 text-sm mt-1.5">Manage all applicant communications from one place.</p>
        </div>
        <button onClick={() => setBulkOpen(true)} className="btn-gold flex items-center gap-2 text-sm">
          <Users className="w-4 h-4" /> Bulk Message
        </button>
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total Sent', value: emailLogStats.total, icon: Send, color: 'from-ocean-500 to-ocean-700' },
          { label: 'Sent Today', value: emailLogStats.today, icon: Mail, color: 'from-emerald-500 to-emerald-700' },
          { label: 'Drafts', value: draftCount, icon: FileText, color: 'from-slate-500 to-slate-700' },
          { label: 'Failed', value: emailLogStats.failed, icon: XCircle, color: 'from-rose-500 to-rose-700' },
          { label: 'Scheduled', value: emailLogStats.scheduled, icon: Calendar, color: 'from-gold-400 to-gold-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-slate-100 p-4 shadow-sm">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center mb-2`}>
              <s.icon className="w-5 h-5 text-white" />
            </div>
            <p className="font-display font-bold text-2xl text-ocean-900">{s.value.toLocaleString()}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, or status..."
            className="input-field pl-10 text-sm"
            aria-label="Search applicants"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field text-sm sm:w-48"
          aria-label="Filter by status"
        >
          <option value="All">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Applicant List */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-2xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No applicants found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-semibold">Name</th>
                  <th className="px-4 py-3 font-semibold hidden md:table-cell">Email</th>
                  <th className="px-4 py-3 font-semibold hidden lg:table-cell">Phone</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold hidden sm:table-cell">Registration Date</th>
                  <th className="px-4 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => (
                  <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => setSelectedApplicant(a)}>
                    <td className="px-4 py-3">
                      <div className="font-medium text-ocean-900">{a.full_name}</div>
                      <div className="text-xs text-slate-400">{a.position ?? 'No position'}</div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-slate-600">{a.email}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-slate-600">{a.phone ?? '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                    <td className="px-4 py-3 hidden sm:table-cell text-slate-500 text-xs">
                      {a.submitted_at ? new Date(a.submitted_at).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => setSelectedApplicant(a)} className="p-2 rounded-lg text-ocean-600 hover:bg-ocean-50 transition-colors" title="View Profile">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleOpenComposer(a)} className="p-2 rounded-lg text-gold-600 hover:bg-gold-50 transition-colors" title="Send Notification">
                          <SendIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Drafts Section */}
      {drafts.length > 0 && (
        <div className="mt-8">
          <h2 className="font-display font-bold text-lg text-ocean-900 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-500" /> Draft Emails ({drafts.length})
          </h2>
          <div className="space-y-2">
            {drafts.map((d) => (
              <div key={d.id} className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-100 shadow-sm">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-ocean-900 truncate">{d.subject || '(No subject)'}</p>
                  <p className="text-xs text-slate-400">To: {d.recipient_name ?? d.recipient_email ?? 'Bulk'} — {d.status === 'scheduled' ? `Scheduled: ${d.scheduled_at ? new Date(d.scheduled_at).toLocaleString() : ''}` : 'Draft'}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => {
                    setComposerRecipient(d.recipient_user_id ? applicants.find((a) => a.user_id === d.recipient_user_id) ?? null : null);
                    setComposerOpen(true);
                  }} className="p-2 rounded-lg text-sky-600 hover:bg-sky-50 transition-colors" title="Edit Draft">
                    <FileText className="w-4 h-4" />
                  </button>
                  <button onClick={async () => { await deleteDraft(d.id); loadDrafts(); toast('Draft deleted.', 'success'); }} className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors" title="Delete Draft">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Email Composer */}
      {composerOpen && (
        <EmailComposer
          recipient={composerRecipient}
          adminId={profile.id}
          adminName={profile.full_name}
          onClose={() => { setComposerOpen(false); setComposerRecipient(null); }}
          onSent={handleSent}
          onDraftSaved={() => loadDrafts()}
        />
      )}

      {/* Bulk Messaging Modal */}
      {bulkOpen && (
        <BulkMessageModal
          applicants={applicants}
          adminId={profile.id}
          adminName={profile.full_name}
          onClose={() => setBulkOpen(false)}
          onSent={() => { setBulkOpen(false); loadStats(); }}
        />
      )}
    </div>
  );
}

// ===== Applicant Profile Component =====
function ApplicantProfile({ applicant, onBack, onSendNotification, adminId, adminName }: {
  applicant: ApplicantRow;
  onBack: () => void;
  onSendNotification: () => void;
  adminId: string;
  adminName: string | null;
}) {
  const { toast } = useToast();
  const [docs, setDocs] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [emailHistory, setEmailHistory] = useState<EmailLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [newNote, setNewNote] = useState('');
  const [noteLoading, setNoteLoading] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editNoteText, setEditNoteText] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [docRes, payRes, noteRes, emailRes] = await Promise.all([
        supabase.from('documents').select('id, doc_type, file_name, file_url, file_size, mime_type, status, uploaded_at').eq('user_id', applicant.user_id).order('uploaded_at', { ascending: false }),
        supabase.from('payments').select('id, amount, currency, method, receipt_url, status, created_at').eq('application_id', applicant.id).order('created_at', { ascending: false }),
        fetchAdminNotes(applicant.user_id),
        fetchEmailLogsForUser(applicant.user_id),
      ]);
      setDocs(docRes.data ?? []);
      setPayments(payRes.data ?? []);
      setNotes(noteRes);
      setEmailHistory(emailRes);
      setLoading(false);
    })();
  }, [applicant.id, applicant.user_id]);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setNoteLoading(true);
    const res = await addAdminNote(adminId, applicant.user_id, newNote.trim());
    if (res.success) {
      toast('Note added.', 'success');
      setNewNote('');
      setNotes(await fetchAdminNotes(applicant.user_id));
    } else {
      toast(res.error ?? 'Failed to add note.', 'error');
    }
    setNoteLoading(false);
  };

  const handleUpdateNote = async (id: string) => {
    if (!editNoteText.trim()) return;
    const ok = await updateAdminNote(id, editNoteText.trim());
    if (ok) {
      toast('Note updated.', 'success');
      setEditingNoteId(null);
      setNotes(await fetchAdminNotes(applicant.user_id));
    }
  };

  const handleDeleteNote = async (id: string) => {
    const ok = await deleteAdminNote(id);
    if (ok) {
      toast('Note deleted.', 'success');
      setNotes(await fetchAdminNotes(applicant.user_id));
    }
  };

  if (loading) {
    return (
      <div className="pt-20 pb-12 max-w-5xl mx-auto px-4">
        <div className="space-y-3">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-32 w-full rounded-2xl" />
          <Skeleton className="h-48 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="pt-20 pb-12 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in-fast">
      {/* Back button */}
      <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-ocean-600 transition-colors mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Applicant List
      </button>

      {/* Profile Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-ocean-600 to-ocean-800 flex items-center justify-center text-white font-display font-bold text-2xl flex-shrink-0">
            {applicant.full_name?.charAt(0).toUpperCase() ?? '?'}
          </div>
          <div>
            <h1 className="font-display font-bold text-2xl text-ocean-900">{applicant.full_name}</h1>
            <p className="text-sm text-slate-500">{applicant.email}</p>
          </div>
        </div>
        <button onClick={onSendNotification} className="btn-gold flex items-center gap-2 text-sm">
          <Send className="w-4 h-4" /> Send Notification
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information */}
        <GlassCard>
          <h3 className="font-display font-semibold text-ocean-900 mb-3 flex items-center gap-2">
            <Users className="w-5 h-5 text-ocean-600" /> Personal Information
          </h3>
          <div className="space-y-2 text-sm">
            <InfoRow icon={Users} label="Full Name" value={applicant.full_name} />
            <InfoRow icon={MailIcon} label="Email" value={applicant.email} />
            <InfoRow icon={Phone} label="Phone" value={applicant.phone ?? '—'} />
            <InfoRow icon={Briefcase} label="Position" value={applicant.position ?? '—'} />
            <InfoRow icon={Calendar} label="Registered" value={applicant.submitted_at ? new Date(applicant.submitted_at).toLocaleDateString() : '—'} />
          </div>
        </GlassCard>

        {/* Application Information */}
        <GlassCard>
          <h3 className="font-display font-semibold text-ocean-900 mb-3 flex items-center gap-2">
            <FileText className="w-5 h-5 text-ocean-600" /> Application Information
          </h3>
          <div className="space-y-2 text-sm">
            <InfoRow icon={FileText} label="Application ID" value={applicant.id.slice(0, 8).toUpperCase()} />
            <InfoRow icon={CheckCircle2} label="Status" value={<StatusBadge status={applicant.status} />} />
            <InfoRow icon={Briefcase} label="Current Step" value={`Step ${applicant.current_step} of 10`} />
            <InfoRow icon={FileCheck} label="Documents" value={`${applicant.doc_count} uploaded`} />
          </div>
        </GlassCard>

        {/* Uploaded Documents */}
        <GlassCard>
          <h3 className="font-display font-semibold text-ocean-900 mb-3 flex items-center gap-2">
            <FileCheck className="w-5 h-5 text-ocean-600" /> Uploaded Documents
          </h3>
          {docs.length === 0 ? (
            <p className="text-sm text-slate-400">No documents uploaded.</p>
          ) : (
            <div className="space-y-2">
              {docs.map((d) => (
                <div key={d.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ocean-900 truncate">{d.file_name}</p>
                    <p className="text-xs text-slate-400">{DOC_TYPES.find((t) => t.key === d.doc_type)?.label ?? d.doc_type}</p>
                  </div>
                  <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg text-ocean-600 hover:bg-ocean-50 transition-colors flex-shrink-0" title="View Document">
                    <Eye className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Payment Status */}
        <GlassCard>
          <h3 className="font-display font-semibold text-ocean-900 mb-3 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-ocean-600" /> Payment Status
          </h3>
          {payments.length === 0 ? (
            <p className="text-sm text-slate-400">No payments recorded.</p>
          ) : (
            <div className="space-y-2">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div>
                    <p className="text-sm font-medium text-ocean-900">{p.amount.toLocaleString()} {p.currency}</p>
                    <p className="text-xs text-slate-400">{p.method ?? '—'} - {new Date(p.created_at).toLocaleDateString()}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${p.status === 'Verified' ? 'bg-emerald-100 text-emerald-700' : p.status === 'Rejected' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}>
                    {p.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Admin Notes */}
        <GlassCard>
          <h3 className="font-display font-semibold text-ocean-900 mb-3 flex items-center gap-2">
            <StickyNote className="w-5 h-5 text-gold-500" /> Admin Notes
            <span className="text-xs text-slate-400 font-normal">(Private — not visible to applicant)</span>
          </h3>
          <div className="space-y-2 mb-3">
            {notes.length === 0 && !editingNoteId && (
              <p className="text-sm text-slate-400">No notes yet.</p>
            )}
            {notes.map((n) => (
              <div key={n.id} className="p-3 rounded-lg bg-gold-50 border border-gold-100">
                {editingNoteId === n.id ? (
                  <div className="space-y-2">
                    <textarea value={editNoteText} onChange={(e) => setEditNoteText(e.target.value)} className="input-field text-sm resize-none" rows={2} />
                    <div className="flex gap-2">
                      <button onClick={() => handleUpdateNote(n.id)} className="px-3 py-1.5 rounded-lg bg-ocean-600 text-white text-xs font-medium hover:bg-ocean-700 transition-colors">Save</button>
                      <button onClick={() => setEditingNoteId(null)} className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 text-xs font-medium hover:bg-slate-50 transition-colors">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-ocean-800">{n.note}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-xs text-slate-400">{new Date(n.created_at).toLocaleDateString()}</p>
                      <div className="flex gap-1">
                        <button onClick={() => { setEditingNoteId(n.id); setEditNoteText(n.note); }} className="text-xs text-ocean-600 hover:underline">Edit</button>
                        <button onClick={() => handleDeleteNote(n.id)} className="text-xs text-rose-600 hover:underline">Delete</button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="text" value={newNote} onChange={(e) => setNewNote(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAddNote()} placeholder="Add a private note..." className="input-field text-sm flex-1" />
            <button onClick={handleAddNote} disabled={noteLoading || !newNote.trim()} className="btn-ocean text-sm px-4 disabled:opacity-50">
              {noteLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add'}
            </button>
          </div>
        </GlassCard>

        {/* Notification History */}
        <GlassCard className="lg:col-span-2">
          <h3 className="font-display font-semibold text-ocean-900 mb-3 flex items-center gap-2">
            <History className="w-5 h-5 text-ocean-600" /> Notification History
          </h3>
          {emailHistory.length === 0 ? (
            <p className="text-sm text-slate-400">No notifications sent to this applicant.</p>
          ) : (
            <div className="space-y-2">
              {emailHistory.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ocean-900 truncate">{log.subject}</p>
                    <p className="text-xs text-slate-400">
                      {EMAIL_LABELS[log.email_type] ?? log.email_type} - {new Date(log.sent_at).toLocaleString()}
                    </p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full flex-shrink-0 ${log.status === 'sent' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {log.status === 'sent' ? 'Sent' : 'Failed'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}

// ===== Helper Components =====
function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="flex items-center gap-2 text-slate-500"><Icon className="w-4 h-4 text-slate-400" /> {label}</span>
      <span className="font-medium text-ocean-900 text-right">{value}</span>
    </div>
  );
}

// ===== Bulk Message Modal =====
function BulkMessageModal({ applicants, adminId, adminName, onClose, onSent }: {
  applicants: ApplicantRow[];
  adminId: string;
  adminName: string | null;
  onClose: () => void;
  onSent: () => void;
}) {
  const { toast } = useToast();
  const [group, setGroup] = useState('all');
  const [template, setTemplate] = useState<NotificationTemplate>(NOTIFICATION_TEMPLATES[0]);
  const [subject, setSubject] = useState('');
  const [bodyHtml, setBodyHtml] = useState('');
  const [sending, setSending] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const groupOptions = [
    { key: 'all', label: 'All Applicants', filter: () => true },
    { key: 'approved', label: 'Approved Applicants', filter: (a: ApplicantRow) => a.status === 'Approved' },
    { key: 'review', label: 'Under Review Applicants', filter: (a: ApplicantRow) => a.status === 'Under Review' },
    { key: 'visa', label: 'Visa Processing Applicants', filter: (a: ApplicantRow) => a.status === 'Visa Processing' },
    { key: 'selected', label: 'Selected Applicants (Interview+)', filter: (a: ApplicantRow) => a.current_step >= 7 },
  ];

  const selectedGroup = groupOptions.find((g) => g.key === group)!;
  const recipients = applicants.filter(selectedGroup.filter).filter((a) => a.email);

  useEffect(() => {
    setSubject(template.subject);
    setBodyHtml(template.bodyFn('Applicant'));
  }, [template]);

  const handleSend = async () => {
    if (recipients.length === 0) { toast('No recipients in this group.', 'error'); return; }
    if (!subject.trim()) { toast('Subject is required.', 'error'); return; }

    setSending(true);
    const result = await sendBulkNotification({
      recipients: recipients.map((r) => ({ userId: r.user_id, email: r.email, fullName: r.full_name ?? 'Applicant' })),
      emailType: template.emailType,
      subject,
      bodyHtml,
      sentBy: adminId,
      adminName,
    });
    setSending(false);

    if (result.failed === 0) {
      toast(`Email sent to ${result.sent} applicants.`, 'success');
    } else {
      toast(`Sent to ${result.sent}, failed for ${result.failed}.`, 'warning');
    }
    onSent();
  };

  return (
    <Modal open={true} onClose={onClose} title="Bulk Message" maxWidth="max-w-2xl">
      <div className="space-y-4">
        {/* Recipient Group */}
        <div>
          <label className="block text-sm font-medium text-ocean-700 mb-1.5">Recipient Group</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {groupOptions.map((g) => (
              <button
                key={g.key}
                onClick={() => setGroup(g.key)}
                className={`px-3 py-2.5 rounded-xl text-sm font-medium transition-all border text-left ${
                  group === g.key ? 'bg-ocean-600 text-white border-ocean-600' : 'bg-white text-ocean-700 border-slate-200 hover:border-ocean-300'
                }`}
              >
                {g.label}
                <span className="block text-xs opacity-70 mt-0.5">{applicants.filter(g.filter).filter((a) => a.email).length} recipients</span>
              </button>
            ))}
          </div>
        </div>

        {/* Template */}
        <div>
          <label className="block text-sm font-medium text-ocean-700 mb-1.5">Template</label>
          <select value={template.key} onChange={(e) => setTemplate(NOTIFICATION_TEMPLATES.find((t) => t.key === e.target.value)!)} className="input-field text-sm">
            {NOTIFICATION_TEMPLATES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </div>

        {/* Subject */}
        <div>
          <label className="block text-sm font-medium text-ocean-700 mb-1.5">Subject</label>
          <input type="text" value={subject} onChange={(e) => setSubject(e.target.value)} className="input-field text-sm" />
        </div>

        {/* Message */}
        <div>
          <label className="block text-sm font-medium text-ocean-700 mb-1.5">Message</label>
          <textarea value={bodyHtml.replace(/<[^>]+>/g, '')} onChange={(e) => setBodyHtml(e.target.value)} rows={5} className="input-field text-sm resize-none" placeholder="Write your message..." />
        </div>

        {/* Preview */}
        {showPreview && (
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 max-h-48 overflow-y-auto">
            <div dangerouslySetInnerHTML={{ __html: bodyHtml }} />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={() => setShowPreview(!showPreview)} className="btn-ghost text-ocean-700 border-slate-200 text-sm">
            {showPreview ? 'Hide' : 'Preview'}
          </button>
          <button onClick={handleSend} disabled={sending || recipients.length === 0} className="flex-1 btn-gold text-sm flex items-center justify-center gap-2 disabled:opacity-50">
            {sending ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending to {recipients.length}...</> : <><Send className="w-4 h-4" /> Send to {recipients.length} Applicants</>}
          </button>
        </div>
      </div>
    </Modal>
  );
}
