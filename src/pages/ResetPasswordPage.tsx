import { useState, useEffect, useRef } from 'react';
import { Ship, Lock, Eye, EyeOff, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useToast } from '../lib/toast';
import { Spinner } from '../components/ui/Spinner';

interface Props {
  onComplete: () => void;
}

type Phase = 'detecting' | 'ready' | 'submitting' | 'success' | 'error';

export function ResetPasswordPage({ onComplete }: Props) {
  const { toast } = useToast();
  const [phase, setPhase] = useState<Phase>('detecting');
  const [errorMsg, setErrorMsg] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const detectedRef = useRef(false);

  useEffect(() => {
    if (detectedRef.current) return;
    detectedRef.current = true;

    let cancelled = false;

    (async () => {
      const hash = window.location.hash.slice(1);
      const params = new URLSearchParams(hash);
      const type = params.get('type');
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');

      if (type !== 'recovery' || !accessToken || !refreshToken) {
        if (!cancelled) {
          setErrorMsg('This password reset link is invalid or has expired. Please request a new reset link.');
          setPhase('error');
        }
        return;
      }

      const { error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });

      if (cancelled) return;

      if (error) {
        setErrorMsg(error.message);
        setPhase('error');
      } else {
        window.history.replaceState({}, '', window.location.pathname);
        setPhase('ready');
      }
    })();

    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 8) {
      toast('Password must be at least 8 characters long.', 'error');
      return;
    }
    if (password !== confirmPassword) {
      toast('Passwords do not match. Please try again.', 'error');
      return;
    }

    setPhase('submitting');
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setErrorMsg(error.message);
      setPhase('error');
      toast(error.message, 'error');
      return;
    }

    // Clear the recovery session so the user logs in fresh.
    await supabase.auth.signOut();
    setPhase('success');
    toast('Password updated successfully!', 'success');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-ocean-50 via-slate-50 to-gold-50 px-4 py-12">
      <div className="absolute inset-0 hero-grid opacity-30" />
      <div className="relative w-full max-w-md">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-ocean-600 to-ocean-800 shadow-lg mb-3">
            <Ship className="w-7 h-7 text-gold-400" />
          </div>
          <h1 className="font-display font-bold text-2xl text-ocean-900">
            {phase === 'success' ? 'Password Updated' : phase === 'error' ? 'Link Expired' : 'Set New Password'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {phase === 'success'
              ? 'You can now log in with your new password'
              : phase === 'error'
                ? 'The reset link is no longer valid'
                : 'Enter a new password for your account'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-8">
          {phase === 'detecting' && (
            <div className="flex flex-col items-center justify-center py-8">
              <Spinner size={40} className="text-ocean-600" />
              <p className="text-sm text-slate-500 mt-3">Verifying reset link...</p>
            </div>
          )}

          {phase === 'ready' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-ocean-700 mb-1.5">New Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showPw ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-field pl-11 pr-11"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {password.length > 0 && (
                  <div className="mt-2 flex items-center gap-1.5 text-sm">
                    {password.length >= 8 ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span className="text-emerald-600 font-medium">Strong password</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <span className="text-red-500">Must be at least 8 characters</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-ocean-700 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type={showConfirmPw ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="input-field pl-11 pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPw((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && (
                  <div className="mt-2 flex items-center gap-1.5 text-sm">
                    {password === confirmPassword ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                        <span className="text-emerald-600 font-medium">Passwords match</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                        <span className="text-red-500">Passwords do not match</span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={phase === 'submitting' || password.length < 8 || password !== confirmPassword}
                className="btn-gold w-full flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {phase === 'submitting' ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Updating...</>
                ) : (
              <>Update Password <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>
          )}

          {phase === 'success' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-emerald-700">
                  Your password has been updated successfully. You can now log in with your new password.
                </p>
              </div>
              <button onClick={onComplete} className="btn-gold w-full flex items-center justify-center gap-2">
                Go to Login <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {phase === 'error' && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-50 border border-rose-200">
                <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-rose-700">{errorMsg}</p>
              </div>
              <button onClick={onComplete} className="btn-gold w-full flex items-center justify-center gap-2">
                Back to Login <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
