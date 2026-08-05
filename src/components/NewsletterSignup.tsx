import { useState } from 'react';
import { Mail, Loader2, CheckCircle2 } from 'lucide-react';
import { subscribeToNewsletter } from '../lib/blog';
import { useToast } from '../lib/toast';

export function NewsletterSignup({ variant = 'card' }: { variant?: 'card' | 'banner' }) {
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    const res = await subscribeToNewsletter(name, email);
    setLoading(false);
    if (res.success) {
      setDone(true);
      toast('Subscribed! Check your inbox for career resources.', 'success');
      setName('');
      setEmail('');
      setTimeout(() => setDone(false), 3000);
    } else {
      toast(res.error ?? 'Failed to subscribe.', 'error');
    }
  };

  if (variant === 'banner') {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-ocean-800 to-ocean-950 p-8 md:p-12">
        <div className="absolute inset-0 hero-grid opacity-20" />
        <div className="relative max-w-2xl mx-auto text-center">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gold-400 mb-4">
            <Mail className="w-7 h-7 text-ocean-900" />
          </div>
          <h3 className="font-display font-bold text-2xl md:text-3xl text-white mb-2">
            Get Cruise Career Tips in Your Inbox
          </h3>
          <p className="text-ocean-200 mb-6">
            Join thousands of applicants receiving exclusive job tips, interview guides, and career resources.
          </p>
          {done ? (
            <div className="flex items-center justify-center gap-2 text-gold-300">
              <CheckCircle2 className="w-6 h-6" />
              <span className="font-semibold">You&apos;re subscribed! Welcome aboard.</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-lg mx-auto">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-ocean-300 focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20"
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                className="flex-1 px-4 py-3 rounded-xl bg-white/10 border border-white/20 text-white placeholder-ocean-300 focus:outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20"
              />
              <button
                type="submit"
                disabled={loading}
                className="btn-gold flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Subscribe'}
              </button>
            </form>
          )}
          <p className="text-xs text-ocean-400 mt-3">No spam. Unsubscribe anytime.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-ocean-600 to-ocean-800 flex items-center justify-center">
          <Mail className="w-5 h-5 text-gold-400" />
        </div>
        <div>
          <h3 className="font-display font-semibold text-ocean-900">Newsletter</h3>
          <p className="text-xs text-slate-500">Get career tips in your inbox</p>
        </div>
      </div>
      {done ? (
        <div className="flex items-center gap-2 text-emerald-600 py-3">
          <CheckCircle2 className="w-5 h-5" />
          <span className="text-sm font-medium">Subscribed!</span>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (optional)"
            className="input-field text-sm"
          />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email address"
            className="input-field text-sm"
          />
          <button type="submit" disabled={loading} className="btn-ocean w-full text-sm flex items-center justify-center gap-2 disabled:opacity-60">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Subscribe'}
          </button>
        </form>
      )}
    </div>
  );
}
