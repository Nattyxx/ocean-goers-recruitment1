import { useEffect, useState, useCallback, useRef } from 'react';
import { CreditCard, Upload, CheckCircle2, FileText, Loader2, Receipt, Copy, Landmark, Smartphone, Globe, Building2, AlertTriangle, Info, XCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { supabase } from '../lib/supabase';
import { GlassCard } from '../components/ui/GlassCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Spinner } from '../components/ui/Spinner';
import { PAYMENT_METHODS, PAYMENT_ACCOUNTS, REQUIRED_DOC_KEYS } from '../lib/constants';

const accountIcons: Record<string, typeof Landmark> = { Landmark, Smartphone, Globe };

interface Payment {
  id: string;
  amount: number;
  currency: string;
  method: string;
  receipt_url: string | null;
  status: string;
  rejection_reason: string | null;
  created_at: string;
}

interface AppData {
  id: string;
  current_step: number;
  status: string;
}

export function PaymentPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [application, setApplication] = useState<AppData | null>(null);
  const [docTypes, setDocTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const [payRes, appRes, docRes] = await Promise.all([
      supabase.from('payments').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('applications').select('id, current_step, status').eq('user_id', user.id).order('submitted_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('documents').select('doc_type').eq('user_id', user.id),
    ]);
    setPayments((payRes.data as Payment[]) ?? []);
    setApplication(appRes.data as AppData | null);
    setDocTypes([...new Set((docRes.data ?? []).map((d) => (d as { doc_type: string }).doc_type))]);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const requiredDocsComplete = REQUIRED_DOC_KEYS.every((k) => docTypes.includes(k));
  const latestPayment = payments[0] ?? null;
  const canUploadReceipt = requiredDocsComplete && latestPayment?.status !== 'Pending' && latestPayment?.status !== 'Verified';

  const handleUpload = async (file: File) => {
    if (!user || !application) {
      toast('Application not found. Please submit an application first.', 'warning');
      return;
    }
    if (!method) {
      toast('Please select a payment method first.', 'warning');
      return;
    }
    if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
      toast('Only PDF, JPG, and PNG files are supported.', 'error');
      return;
    }

    setUploading(true);
    setProgress(0);
    const interval = setInterval(() => setProgress((p) => Math.min(90, p + 10)), 200);

    const ext = file.name.split('.').pop();
    const path = `${user.id}/receipt-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from('documents').upload(path, file, { upsert: true });
    if (upErr) { clearInterval(interval); toast(upErr.message, 'error'); setUploading(false); return; }

    const { data: pub } = supabase.storage.from('documents').getPublicUrl(path);

    const { error } = await supabase.from('payments').insert({
      user_id: user.id,
      application_id: application.id,
      amount: 5000,
      currency: 'ETB',
      method,
      receipt_url: pub.publicUrl,
      status: 'Pending',
    });

    clearInterval(interval);
    setProgress(100);

    if (error) {
      toast(error.message, 'error');
    } else {
      // Move application to "Pending Verification" (step 5)
      await supabase.from('applications').update({
        current_step: 5,
        status: 'Pending Verification',
        updated_at: new Date().toISOString(),
      }).eq('id', application.id);

      toast('Payment receipt uploaded! Status: Pending Verification.', 'success');
      await load();
      setMethod('');
    }
    setTimeout(() => { setUploading(false); setProgress(0); }, 600);
  };

  if (loading) {
    return (
      <div className="pt-20 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center min-h-[60vh]"><Spinner size={48} className="text-ocean-600" /></div>
      </div>
    );
  }

  return (
    <div className="pt-20 pb-12 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 animate-fade-in-fast">
      <div className="mb-6">
        <h1 className="font-display font-bold text-3xl text-ocean-900 mb-2">Payment & Receipts</h1>
        <p className="text-slate-600">Submit your registration fee payment receipt for verification.</p>
      </div>

      {/* Documents incomplete warning */}
      {!requiredDocsComplete && (
        <div className="mb-6 p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800">Upload all required documents first</p>
            <p className="text-sm text-amber-600 mt-0.5">You must upload your Passport and CV/Resume before paying the registration fee.</p>
          </div>
        </div>
      )}

      {/* Payment info card */}
      <GlassCard className="mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-gold-300 to-gold-500 flex items-center justify-center">
              <Receipt className="w-7 h-7 text-ocean-900" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-ocean-900">Registration Fee</h3>
              <p className="text-sm text-slate-500">One-time processing fee</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-display font-extrabold text-3xl text-gradient-ocean">5,000 ETB</p>
            <p className="text-xs text-slate-400">≈ $90 USD</p>
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-slate-100">
          <p className="text-sm font-medium text-ocean-700 mb-1">Registration Fee: <span className="font-bold text-ocean-900">5,000 ETB</span> (≈ $100 USD)</p>
          <p className="text-sm text-slate-500 mb-4">Transfer to any of the accounts below, then upload your receipt for verification.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {PAYMENT_ACCOUNTS.map((acc) => {
              const Icon = accountIcons[acc.icon] ?? Building2;
              return (
                <div key={acc.method} className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${acc.color} flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <p className="font-display font-semibold text-sm text-ocean-900">{acc.method}</p>
                      <p className="text-xs text-slate-500">{acc.label}</p>
                    </div>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Account Name</span>
                      <span className="font-medium text-ocean-800 text-right">{acc.accountName}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Account Number</span>
                      <button
                        onClick={() => { navigator.clipboard.writeText(acc.accountNumber); toast(`${acc.method} account number copied!`, 'success'); }}
                        className="font-semibold text-ocean-700 hover:text-ocean-900 flex items-center gap-1 transition-colors"
                      >
                        {acc.accountNumber}
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                    {acc.swiftCode && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Swift Code</span>
                        <button
                          onClick={() => { navigator.clipboard.writeText(acc.swiftCode); toast('Swift code copied!', 'success'); }}
                          className="font-medium text-ocean-800 flex items-center gap-1 transition-colors hover:text-ocean-900"
                        >
                          {acc.swiftCode}
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Branch</span>
                      <span className="text-slate-600 text-right">{acc.branch}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Reference instruction */}
        <div className="mt-5 p-4 rounded-xl bg-ocean-50 border border-ocean-100 flex items-start gap-3">
          <Info className="w-5 h-5 text-ocean-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-ocean-800">
            <p className="font-semibold mb-1">Payment Reference</p>
            <p>Use your <span className="font-bold">Application ID</span> as the payment reference when transferring.</p>
            {application && (
              <p className="mt-1.5 font-mono text-xs bg-white px-2 py-1 rounded-md inline-block border border-ocean-100">
                {application.id.slice(0, 8).toUpperCase()}
              </p>
            )}
          </div>
        </div>

        {/* Warning */}
        <div className="mt-3 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-rose-700">
            <span className="font-semibold">Important:</span> Your application will not proceed to the next stage until your payment is verified by our admin team.
          </p>
        </div>
      </GlassCard>

      {/* Upload receipt */}
      <GlassCard className="mb-6">
        <h3 className="font-display font-semibold text-lg text-ocean-900 mb-2">Upload Payment Receipt</h3>
        <p className="text-sm text-slate-500 mb-4">After transferring 5,000 ETB to one of the accounts above, upload your receipt here for verification.</p>

        {latestPayment?.status === 'Pending' && (
          <div className="mb-4 p-3 rounded-xl bg-amber-50 border border-amber-200 text-sm text-amber-700 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Your receipt is pending verification. You cannot upload a new one until it&apos;s reviewed.
          </div>
        )}
        {latestPayment?.status === 'Verified' && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-sm text-emerald-700 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Your payment has been verified. No further action needed.
          </div>
        )}
        {latestPayment?.status === 'Rejected' && (
          <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-sm text-rose-700 flex items-start gap-2">
            <XCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Your receipt was rejected.</p>
              {latestPayment.rejection_reason && <p className="mt-0.5">Reason: {latestPayment.rejection_reason}</p>}
              <p className="mt-0.5">Please upload a new payment receipt below.</p>
            </div>
          </div>
        )}

        <div className="mb-4">
          <label className="block text-sm font-medium text-ocean-700 mb-1.5">Select Payment Method</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)} className="input-field" disabled={!canUploadReceipt}>
            <option value="">Choose method</option>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        {uploading ? (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="w-10 h-10 text-ocean-500 animate-spin mb-3" />
            <ProgressBar value={progress} className="mb-2 max-w-xs" />
            <p className="text-sm text-slate-500">Uploading receipt... {progress}%</p>
          </div>
        ) : canUploadReceipt ? (
          <div
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center py-10 rounded-xl border-2 border-dashed border-slate-200 hover:border-ocean-300 hover:bg-slate-50 cursor-pointer transition-all"
          >
            <Upload className="w-10 h-10 text-slate-400 mb-2" />
            <p className="text-sm font-medium text-slate-600">
              {latestPayment?.status === 'Rejected' ? 'Upload new payment receipt' : 'Click to upload payment receipt'}
            </p>
            <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG · max 10MB</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-10 rounded-xl bg-slate-50 border border-slate-100">
            <RefreshCw className="w-8 h-8 text-slate-300 mb-2" />
            <p className="text-sm text-slate-400">
              {!requiredDocsComplete ? 'Upload all required documents first' : 'Receipt pending or verified'}
            </p>
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); e.target.value = ''; }}
        />
      </GlassCard>

      {/* Payment history */}
      <h3 className="font-display font-semibold text-lg text-ocean-900 mb-4">Payment History</h3>
      {payments.length === 0 ? (
        <GlassCard className="text-center py-10">
          <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500">No payments submitted yet.</p>
        </GlassCard>
      ) : (
        <div className="space-y-3">
          {payments.map((p) => (
            <GlassCard key={p.id} className="flex items-center gap-4 animate-fade-in">
              <div className="w-10 h-10 rounded-xl bg-ocean-50 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-ocean-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ocean-900">{p.amount.toLocaleString()} {p.currency}</p>
                <p className="text-xs text-slate-500">{p.method} · {new Date(p.created_at).toLocaleDateString()}</p>
                {p.status === 'Rejected' && p.rejection_reason && (
                  <p className="text-xs text-rose-500 mt-0.5">Reason: {p.rejection_reason}</p>
                )}
              </div>
              {p.receipt_url && (
                <a href={p.receipt_url} target="_blank" rel="noopener noreferrer" className="text-sm text-ocean-600 hover:text-ocean-700 font-medium">View</a>
              )}
              <StatusBadge status={p.status as any} size="sm" />
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
