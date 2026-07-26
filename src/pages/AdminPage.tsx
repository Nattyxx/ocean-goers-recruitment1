import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Search, Filter, CheckCircle2, XCircle, Eye, Phone, Mail, Briefcase, Clock,
  FileText, Calendar, Users, TrendingUp, AlertCircle, ChevronDown, X,
  Download, ExternalLink, Loader2, ArrowRightCircle,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { supabase } from '../lib/supabase';
import { GlassCard } from '../components/ui/GlassCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { Spinner } from '../components/ui/Spinner';
import { Modal } from '../components/ui/Modal';
import { STATUSES, DOC_TYPES, APPLICATION_STEPS } from '../lib/constants';

type Status = typeof STATUSES[number] | 'Verified' | 'Medical' | 'Visa Processing' | 'Deployment';

interface AdminDoc {
  id: string;
  doc_type: string;
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string | null;
  status: string;
  uploaded_at: string;
}

interface AdminApp {
  id: string;
  user_id: string;
  position: string | null;
  status: string;
  current_step: number;
  submitted_at: string;
  updated_at: string;
  profile: {
    full_name: string | null;
    phone: string | null;
    email: string;
    position: string | null;
    experience_years: number;
  } | null;
  doc_count: number;
  documents: AdminDoc[];
  payment_status: string | null;
}

const STATUS_FILTERS = ['All', ...STATUSES] as const;

export function AdminPage({ onNavigate }: { onNavigate: (page: string) => void }) {
  const { profile } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [apps, setApps] = useState<AdminApp[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selected, setSelected] = useState<AdminApp | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const loadApps = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('applications')
      .select(`
        id, user_id, position, status, current_step, submitted_at, updated_at
      `)
      .order('submitted_at', { ascending: false });

    if (error) {
      toast(error.message, 'error');
      setLoading(false);
      return;
    }

    if (!data || data.length === 0) {
      setApps([]);
      setLoading(false);
      return;
    }

    const userIds = [...new Set(data.map((a) => a.user_id))];
    const appIds = data.map((a) => a.id);

    const [profileRes, docRes, payRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, phone, email, position, experience_years').in('id', userIds),
      supabase.from('documents').select('id, user_id, doc_type, file_name, file_url, file_size, mime_type, status, uploaded_at').in('user_id', userIds).order('uploaded_at', { ascending: false }),
      supabase.from('payments').select('application_id, status').in('application_id', appIds),
    ]);

    type ProfileRow = { id: string; full_name: string | null; phone: string | null; email: string | null; position: string | null; experience_years: number };
    type PayRow = { application_id: string; status: string };
    type AppRow = { id: string; user_id: string; position: string | null; status: string; current_step: number; submitted_at: string; updated_at: string };

    const profileMap = new Map((profileRes.data ?? []).map((p: ProfileRow) => [p.id, p]));
    const docsByUser = new Map<string, AdminDoc[]>();
    (docRes.data ?? []).forEach((d: AdminDoc) => {
      const list = docsByUser.get(d.user_id) ?? [];
      list.push(d);
      docsByUser.set(d.user_id, list);
    });
    const payMap = new Map((payRes.data ?? []).map((p: PayRow) => [p.application_id, p.status]));

    const enriched: AdminApp[] = (data as AppRow[]).map((a) => {
      const docs = docsByUser.get(a.user_id) ?? [];
      return {
        ...a,
        profile: profileMap.get(a.user_id) ?? null,
        doc_count: docs.length,
        documents: docs,
        payment_status: payMap.get(a.id) ?? null,
      };
    });

    setApps(enriched);
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    if (profile?.is_admin) {
      loadApps();
    } else {
      setLoading(false);
    }
  }, [profile, loadApps]);

  const filtered = useMemo(() => {
    return apps.filter((a) => {
      const matchesStatus = statusFilter === 'All' || a.status === statusFilter;
      const q = search.trim().toLowerCase();
      const matchesSearch =
        !q ||
        (a.profile?.full_name?.toLowerCase().includes(q) ?? false) ||
        (a.profile?.phone?.toLowerCase().includes(q) ?? false) ||
        (a.profile?.email?.toLowerCase().includes(q) ?? false) ||
        (a.position?.toLowerCase().includes(q) ?? false);
      return matchesStatus && matchesSearch;
    });
  }, [apps, statusFilter, search]);

  const stats = useMemo(() => {
    return {
      total: apps.length,
      pending: apps.filter((a) => a.status === 'Pending').length,
      approved: apps.filter((a) => a.status === 'Approved').length,
      rejected: apps.filter((a) => a.status === 'Rejected').length,
    };
  }, [apps]);

  const updateStatus = async (id: string, status: string, step: number) => {
    setActionLoading(true);
    const { error } = await supabase
      .from('applications')
      .update({ status, current_step: step, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      toast(error.message, 'error');
    } else {
      toast(`Application ${status.toLowerCase()}.`, 'success');
      setApps((prev) => prev.map((a) => (a.id === id ? { ...a, status, current_step: step } : a)));
      if (selected?.id === id) {
        setSelected((prev) => (prev ? { ...prev, status, current_step: step } : prev));
      }
    }
    setActionLoading(false);
  };

  const advanceStage = async (id: string, currentStep: number) => {
    if (currentStep >= 7) return;
    const nextStep = currentStep + 1;
    const nextStatus = APPLICATION_STEPS[nextStep - 1].label;
    await updateStatus(id, nextStatus, nextStep);
  };

  if (!profile?.is_admin) {
    return (
      <div className="pt-20 pb-12 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <AlertCircle className="w-16 h-16 text-rose-400 mb-4" />
          <h1 className="font-display font-bold text-2xl text-ocean-900 mb-2">Access Denied</h1>
          <p className="text-slate-500 mb-6">You don't have permission to view this page.</p>
          <button onClick={() => onNavigate('home')} className="btn-gold">Back to Home</button>
        </div>
      </div>
    );
  }

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
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-bold text-2xl sm:text-3xl text-ocean-900">Admin Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Review and manage all applicant submissions</p>
        </div>
        <button onClick={loadApps} className="btn-ghost text-sm self-start">Refresh</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { icon: Users, label: 'Total Applications', value: stats.total, color: 'text-ocean-600', bg: 'bg-ocean-50' },
          { icon: Clock, label: 'Pending', value: stats.pending, color: 'text-amber-600', bg: 'bg-amber-50' },
          { icon: CheckCircle2, label: 'Approved', value: stats.approved, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { icon: XCircle, label: 'Rejected', value: stats.rejected, color: 'text-rose-600', bg: 'bg-rose-50' },
        ].map((s) => (
          <GlassCard key={s.label}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center flex-shrink-0`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <div className="min-w-0">
                <p className="font-display font-bold text-xl text-ocean-900">{s.value}</p>
                <p className="text-xs text-slate-500 truncate">{s.label}</p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Search + Filter */}
      <GlassCard className="mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, email, or position..."
              className="input-field pl-11"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="input-field pl-11 pr-8 appearance-none cursor-pointer"
            >
              {STATUS_FILTERS.map((s) => (
                <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </GlassCard>

      {/* Table */}
      <GlassCard>
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500">No applications found.</p>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="px-3 py-3 font-semibold">Applicant</th>
                  <th className="px-3 py-3 font-semibold hidden md:table-cell">Position</th>
                  <th className="px-3 py-3 font-semibold hidden lg:table-cell">Phone</th>
                  <th className="px-3 py-3 font-semibold">Status</th>
                  <th className="px-3 py-3 font-semibold hidden sm:table-cell">Docs</th>
                  <th className="px-3 py-3 font-semibold hidden md:table-cell">Applied</th>
                  <th className="px-3 py-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-3 py-3">
                      <div className="font-medium text-ocean-900">{a.profile?.full_name ?? 'Unknown'}</div>
                      <div className="text-xs text-slate-400">{a.profile?.email ?? ''}</div>
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell text-slate-600">
                      {a.position ?? a.profile?.position ?? '—'}
                    </td>
                    <td className="px-3 py-3 hidden lg:table-cell text-slate-600">
                      {a.profile?.phone ?? '—'}
                    </td>
                    <td className="px-3 py-3">
                      <StatusBadge status={a.status as Status} size="sm" />
                    </td>
                    <td className="px-3 py-3 hidden sm:table-cell text-slate-600">
                      {a.doc_count}
                    </td>
                    <td className="px-3 py-3 hidden md:table-cell text-slate-500 text-xs">
                      {new Date(a.submitted_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelected(a)}
                          className="p-2 rounded-lg text-ocean-600 hover:bg-ocean-50 transition-colors"
                          title="View details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => advanceStage(a.id, a.current_step)}
                          disabled={actionLoading || a.current_step >= 7}
                          className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Next Stage"
                        >
                          <ArrowRightCircle className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => updateStatus(a.id, 'Rejected', 1)}
                          disabled={actionLoading || a.status === 'Rejected'}
                          className="p-2 rounded-lg text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-40"
                          title="Reject"
                        >
                          <XCircle className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* Detail Modal */}
      <Modal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Application Details"
        maxWidth="max-w-lg"
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-display font-bold text-lg text-ocean-900">
                {selected.profile?.full_name ?? 'Unknown Applicant'}
              </h4>
              <StatusBadge status={selected.status as Status} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <InfoRow icon={Mail} label="Email" value={selected.profile?.email ?? '—'} />
              <InfoRow icon={Phone} label="Phone" value={selected.profile?.phone ?? '—'} />
              <InfoRow icon={Briefcase} label="Position" value={selected.position ?? selected.profile?.position ?? '—'} />
              <InfoRow icon={TrendingUp} label="Experience" value={`${selected.profile?.experience_years ?? 0} years`} />
              <InfoRow icon={FileText} label="Documents" value={`${selected.doc_count} uploaded`} />
              <InfoRow icon={Calendar} label="Applied" value={new Date(selected.submitted_at).toLocaleDateString()} />
            </div>

            {selected.payment_status && (
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="text-sm text-slate-600">Payment Status</span>
                <StatusBadge status={selected.payment_status as Status} size="sm" />
              </div>
            )}

            <DocumentsSection docs={selected.documents} />

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => advanceStage(selected.id, selected.current_step)}
                disabled={actionLoading || selected.current_step >= 7}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowRightCircle className="w-4 h-4" /> Next Stage
              </button>
              <button
                onClick={() => updateStatus(selected.id, 'Rejected', 1)}
                disabled={actionLoading || selected.status === 'Rejected'}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-rose-600 text-white font-medium text-sm hover:bg-rose-700 transition-colors disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" /> Reject
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50">
      <Icon className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-xs text-slate-400">{label}</p>
        <p className="text-sm text-ocean-900 font-medium break-words">{value}</p>
      </div>
    </div>
  );
}

function DocumentsSection({ docs }: { docs: AdminDoc[] }) {
  const [signedUrls, setSignedUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (docs.length === 0) {
        setLoading(false);
        return;
      }
      setLoading(true);
      const entries = await Promise.all(
        docs.map(async (d) => {
          const path = extractStoragePath(d.file_url);
          if (!path) return [d.id, d.file_url] as const;
          const { data, error } = await supabase.storage.from('documents').createSignedUrl(path, 3600);
          if (error || !data?.signedUrl) return [d.id, d.file_url] as const;
          return [d.id, data.signedUrl] as const;
        }),
      );
      if (!cancelled) {
        setSignedUrls(Object.fromEntries(entries));
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [docs]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="w-5 h-5 text-ocean-500 animate-spin" />
      </div>
    );
  }

  if (docs.length === 0) {
    return (
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
        <FileText className="w-6 h-6 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-400">No documents uploaded</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Uploaded Documents ({docs.length})</p>
      {docs.map((d) => {
        const url = signedUrls[d.id] ?? d.file_url;
        return (
          <div key={d.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <FileText className="w-4 h-4 text-ocean-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-ocean-900 font-medium truncate">{d.file_name}</p>
              <p className="text-xs text-slate-400">
                {DOC_TYPES.find((t) => t.key === d.doc_type)?.label ?? d.doc_type} · {(d.file_size / 1024).toFixed(0)}KB
              </p>
            </div>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-ocean-50 text-ocean-700 text-xs font-medium hover:bg-ocean-100 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              View
            </a>
            <a
              href={url}
              download={d.file_name}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-medium hover:bg-emerald-100 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Download
            </a>
          </div>
        );
      })}
    </div>
  );
}

function extractStoragePath(fileUrl: string): string | null {
  try {
    const url = new URL(fileUrl);
    const idx = url.pathname.indexOf('/documents/');
    if (idx === -1) return null;
    return decodeURIComponent(url.pathname.slice(idx + '/documents/'.length));
  } catch {
    return null;
  }
}
