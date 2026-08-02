import { useEffect, useState, useCallback, useRef } from 'react';
import { CreditCard, Upload, CheckCircle2, FileText, Loader2, Receipt, Copy, Landmark, Smartphone, Globe, Building2, AlertTriangle, Info, XCircle, RefreshCw, Bitcoin, ShieldCheck, ArrowRight, AlertCircle } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { supabase } from '../lib/supabase';
import { GlassCard } from '../components/ui/GlassCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Spinner } from '../components/ui/Spinner';
import { PAYMENT_METHODS, PAYMENT_ACCOUNTS, REQUIRED_DOC_KEYS } from '../lib/constants';

interface CryptoPayment {
  id: string;
  order_id: string;
  nowpayments_id: string | null;
  amount: number;
  currency: string;
  pay_currency: string;
  status: string;
  payment_url: string | null;
  transaction_hash: string | null;
  payment_date: string | null;
  created_at: string;
}

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
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [cryptoPayments, setCryptoPayments] = useState<CryptoPayment[]>([]);
  const [application, setApplication] = useState<AppData | null>(null);
  const [docTypes, setDocTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [cryptoLoading, setCryptoLoading] = useState(false);
  const [cryptoSuccess, setCryptoSuccess] = useState(false);
  const [cryptoError, setCryptoError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const [payRes, appRes, docRes, cryptoRes] = await Promise.all([
      supabase.from('payments').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('applications').select('id, current_step, status').eq('user_id', user.id).order('submitted_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('documents').select('doc_type').eq('user_id', user.id),
      supabase.from('crypto_payments').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
    ]);
    setPayments((payRes.data as Payment[]) ?? []);
    setCryptoPayments((cryptoRes.data as CryptoPayment[]) ?? []);
    setApplication(appRes.data as AppData | null);
    setDocTypes([...new Set((docRes.data ?? []).map((d) => (d as { doc_type: string }).doc_type))]);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cryptoParam = params.get('crypto');
    if (cryptoParam === 'success') {
      setCryptoSuccess(true);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (cryptoParam === 'cancel') {
      setCryptoError('Payment was cancelled.');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, []);

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

  const handleCryptoPay = () =>
    handleCryptoPayImpl(user, profile, application, setCryptoLoading, setCryptoSuccess, setCryptoError, toast);

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
          <p className="text-sm font-medium text-ocean-700 mb-1">Registration Fee: <span className="font-bold text-ocean-900">5,000 ETB</span> (≈ $90 USD)</p>
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

      {/* USDT (TRC20) Crypto Payment Card */}
      <GlassCard className="mb-6 overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="flex items-center gap-4 w-full">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
              <Bitcoin className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-display font-bold text-lg text-ocean-900">Pay with USDT (TRC20)</h3>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-teal-50 border border-teal-200 text-xs font-semibold text-teal-700">
                  TRON Network
                </span>
              </div>
              <p className="text-sm text-slate-500 mt-1">Secure international cryptocurrency payment. Fast confirmation with low network fees.</p>
            </div>
          </div>
        </div>

        <div className="mt-5 pt-5 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-xs text-slate-400 uppercase tracking-wide">Amount</p>
            <p className="font-display font-bold text-lg text-ocean-900 mt-0.5">$90 USD</p>
            <p className="text-xs text-slate-500">Registration Fee</p>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
            <p className="text-xs text-slate-400 uppercase tracking-wide">Network</p>
            <p className="font-display font-bold text-lg text-ocean-900 mt-0.5">TRON (TRC20)</p>
            <p className="text-xs text-slate-500">USDT Tether</p>
          </div>
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-100">
            <p className="text-xs text-emerald-400 uppercase tracking-wide">Status</p>
            <p className="font-display font-bold text-lg text-emerald-700 mt-0.5 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> Secure Payment
            </p>
            <p className="text-xs text-emerald-600">Encrypted & Verified</p>
          </div>
        </div>

        {cryptoSuccess && (
          <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 animate-scale-in">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-800">Payment received successfully. Your registration has been confirmed.</p>
              <p className="text-sm text-emerald-600 mt-0.5">Your application is now under review.</p>
            </div>
          </div>
        )}

        {cryptoError && (
          <div className="mt-4 p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 animate-scale-in">
            <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-rose-800">Payment failed or expired.</p>
              <p className="text-sm text-rose-600 mt-0.5">{cryptoError}</p>
              <button
                onClick={() => { setCryptoError(null); }}
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-semibold hover:bg-rose-700 transition-colors"
              >
                <RefreshCw className="w-4 h-4" /> Try Again
              </button>
            </div>
          </div>
        )}

        {cryptoLoading ? (
          <div className="mt-5 flex flex-col items-center justify-center py-6">
            <Loader2 className="w-8 h-8 text-gold-500 animate-spin mb-3" />
            <p className="text-sm text-slate-500">Creating your USDT payment...</p>
          </div>
        ) : (
          !cryptoSuccess && (
            <button
              onClick={handleCryptoPay}
              disabled={!requiredDocsComplete || !application}
              className="mt-5 w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-gradient-to-r from-gold-400 to-gold-500 text-ocean-900 font-display font-bold text-base hover:from-gold-500 hover:to-gold-600 transition-all duration-300 hover:shadow-lg hover:shadow-gold-300/50 disabled:opacity-50 disabled:cursor-not-allowed group"
            >
              <Bitcoin className="w-5 h-5" />
              Pay $90 with USDT
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          )
        )}

        {!requiredDocsComplete && (
          <p className="mt-3 text-xs text-amber-600 flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" /> Upload all required documents first to enable crypto payment.
          </p>
        )}
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

      {/* Crypto payment history */}
      {cryptoPayments.length > 0 && (
        <>
          <h3 className="font-display font-semibold text-lg text-ocean-900 mb-4 mt-6">Crypto Payment History</h3>
          <div className="space-y-3 mb-6">
            {cryptoPayments.map((cp) => (
              <GlassCard key={cp.id} className="flex items-center gap-4 animate-fade-in">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                  <Bitcoin className="w-5 h-5 text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-ocean-900">${cp.amount} {cp.currency}</p>
                  <p className="text-xs text-slate-500">USDT (TRC20) · {new Date(cp.created_at).toLocaleDateString()}</p>
                  {cp.transaction_hash && (
                    <p className="text-xs text-slate-400 font-mono mt-0.5 truncate">TX: {cp.transaction_hash.slice(0, 20)}...</p>
                  )}
                </div>
                <CryptoStatusBadge status={cp.status} />
              </GlassCard>
            ))}
          </div>
        </>
      )}

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

function CryptoStatusBadge({ status }: { status: string }) {
  const s = status.toLowerCase();
  if (s === 'confirmed' || s === 'finished') {
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700"><CheckCircle2 className="w-3 h-3" /> Paid</span>;
  }
  if (s === 'failed' || s === 'expired' || s === 'refunded') {
    return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700"><XCircle className="w-3 h-3" /> Failed</span>;
  }
  return <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-xs font-semibold text-amber-700"><Loader2 className="w-3 h-3 animate-spin" /> Pending</span>;
}

async function handleCryptoPayImpl(
  user: { id: string } | null,
  profile: { full_name: string | null } | null,
  application: AppData | null,
  setCryptoLoading: (v: boolean) => void,
  setCryptoSuccess: (v: boolean) => void,
  setCryptoError: (v: string | null) => void,
  toast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void,
) {
  if (!user || !application) {
    toast('Application not found. Please submit an application first.', 'warning');
    return;
  }

  setCryptoLoading(true);
  setCryptoError(null);
  setCryptoSuccess(false);

  try {
    const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/nowpayments-create`;
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({
        userId: user.id,
        applicantName: profile?.full_name ?? 'Applicant',
        email: (user as { email?: string }).email ?? '',
        applicationId: application.id,
      }),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error ?? `Request failed (${res.status})`);
    }

    const data = await res.json();
    if (!data.success || !data.paymentUrl) {
      throw new Error(data.error ?? 'Failed to create payment');
    }

    toast('Redirecting to NOWPayments...', 'success');
    window.location.href = data.paymentUrl;
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Failed to create crypto payment';
    setCryptoError(msg);
    toast(msg, 'error');
  } finally {
    setCryptoLoading(false);
  }
}
