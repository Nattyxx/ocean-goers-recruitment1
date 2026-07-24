import { useState } from 'react';
import { Search, ArrowRight } from 'lucide-react';
import { Modal } from './ui/Modal';
import { StatusBadge } from './ui/StatusBadge';
import { Spinner } from './ui/Spinner';
import { supabase } from '../lib/supabase';
import { useToast } from '../lib/toast';
import { APPLICATION_STEPS } from '../lib/constants';

export function StatusCheckModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ position: string; status: string; current_step: number } | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const { data: prof } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email.trim())
      .maybeSingle();

    if (!prof) {
      toast('No application found for this email.', 'error');
      setLoading(false);
      return;
    }

    const { data } = await supabase
      .from('applications')
      .select('position, status, current_step')
      .eq('user_id', prof.id)
      .order('submitted_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setResult(data);
    } else {
      toast('No application found for this email.', 'error');
    }
    setLoading(false);
  };

  return (
    <Modal open={open} onClose={onClose} title="Check Application Status" maxWidth="max-w-lg">
      <form onSubmit={handleSearch} className="space-y-4">
        <p className="text-sm text-slate-600">
          Enter the email address you used to apply. We&apos;ll look up your current application status.
        </p>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="input-field pl-11"
          />
        </div>
        <button type="submit" disabled={loading} className="btn-ocean w-full flex items-center justify-center gap-2 disabled:opacity-60">
          {loading ? <Spinner size={20} className="text-white" /> : <>Check Status <ArrowRight className="w-4 h-4" /></>}
        </button>
      </form>

      {result && (
        <div className="mt-6 p-5 rounded-xl bg-ocean-50 border border-ocean-100 animate-scale-in">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wide">Position Applied</p>
              <p className="font-display font-semibold text-ocean-900">{result.position || 'Cruise Ship Staff'}</p>
            </div>
            <StatusBadge status={result.status as any} />
          </div>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-2">Progress</p>
          <div className="flex items-center gap-1.5">
            {APPLICATION_STEPS.map((step, i) => (
              <div key={step.key} className="flex items-center flex-1 last:flex-none">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  i < result.current_step ? 'bg-emerald-500 text-white' : i === result.current_step - 1 ? 'bg-gold-400 text-ocean-900' : 'bg-slate-200 text-slate-400'
                }`}>
                  {i < result.current_step ? '✓' : i + 1}
                </div>
                {i < APPLICATION_STEPS.length - 1 && (
                  <div className={`flex-1 h-1 mx-1 rounded-full ${i < result.current_step - 1 ? 'bg-emerald-400' : 'bg-slate-200'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
