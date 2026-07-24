import { useEffect, useState, useCallback, useRef } from 'react';
import { CreditCard, Upload, CheckCircle2, FileText, Loader2, Receipt, Copy, Landmark, Smartphone, Globe, Building2 } from 'lucide-react';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { supabase } from '../lib/supabase';
import { GlassCard } from '../components/ui/GlassCard';
import { StatusBadge } from '../components/ui/StatusBadge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Spinner } from '../components/ui/Spinner';
import { PAYMENT_METHODS, PAYMENT_ACCOUNTS } from '../lib/constants';

const accountIcons: Record<string, typeof Landmark> = { Landmark, Smartphone, Globe };

interface Payment {
  id: string;
  amount: number;
  currency: string;
  method: string;
  receipt_url: string | null;
  status: string;
  created_at: string;
}

export function PaymentPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [method, setMethod] = useState('');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from('payments').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
    setPayments((data as Payment[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleUpload = async (file: File) => {
    if (!user || !method) {
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
    const path = `${user.id}/receipt.${ext}`;
    const { error: upErr } = await supabase.storage.from('documents').upload(path, file, { upsert: true });
    if (upErr) { clearInterval(interval); toast(upErr.message, 'error'); setUploading(false); return; }

    const { data: pub } = supabase.storage.from('documents').getPublicUrl(path);

    const { error } = await supabase.from('payments').insert({
      user_id: user.id,
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
      toast('Payment receipt uploaded successfully!', 'success');
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
      </GlassCard>

      {/* Upload receipt */}
      <GlassCard className="mb-6">
        <h3 className="font-display font-semibold text-lg text-ocean-900 mb-2">Upload Payment Receipt</h3>
        <p className="text-sm text-slate-500 mb-4">After transferring 5,000 ETB to one of the accounts above, upload your receipt here for verification.</p>
        <div className="mb-4">
          <label className="block text-sm font-medium text-ocean-700 mb-1.5">Select Payment Method</label>
          <select value={method} onChange={(e) => setMethod(e.target.value)} className="input-field">
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
        ) : (
          <div
            onClick={() => fileRef.current?.click()}
            className="flex flex-col items-center justify-center py-10 rounded-xl border-2 border-dashed border-slate-200 hover:border-ocean-300 hover:bg-slate-50 cursor-pointer transition-all"
          >
            <Upload className="w-10 h-10 text-slate-400 mb-2" />
            <p className="text-sm font-medium text-slate-600">Click to upload payment receipt</p>
            <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG · max 10MB</p>
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
          {payments.map((p, i) => (
            <GlassCard key={p.id} className="flex items-center gap-4 animate-fade-in" >
              <div className="w-10 h-10 rounded-xl bg-ocean-50 flex items-center justify-center flex-shrink-0">
                <FileText className="w-5 h-5 text-ocean-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-ocean-900">{p.amount.toLocaleString()} {p.currency}</p>
                <p className="text-xs text-slate-500">{p.method} · {new Date(p.created_at).toLocaleDateString()}</p>
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
