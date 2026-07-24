import { useState } from 'react';
import { Ship, Mail, Lock, User, Eye, EyeOff, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Spinner } from './ui/Spinner';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';
import { supabase } from '../lib/supabase';

type Mode = 'login' | 'signup' | 'reset';

export function AuthModal({
  open,
  onClose,
  initialMode = 'login',
}: {
  open: boolean;
  onClose: () => void;
  initialMode?: Mode;
}) {
  const { signIn, signUp } = useAuth();
  const { toast } = useToast();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === 'login') {
      const { error } = await signIn(email, password);
      if (error) {
        toast(error, 'error');
      } else {
        toast('Welcome back! Login successful.', 'success');
        onClose();
        reset();
      }
    } else if (mode === 'signup') {
      if (password.length < 8) {
        toast('Password is too weak. It must be at least 8 characters long.', 'error');
        setLoading(false);
        return;
      }
      const { error } = await signUp(email, password, fullName);
      if (error) {
        toast(error, 'error');
      } else {
        toast('Account created! You are now logged in.', 'success');
        onClose();
        reset();
      }
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) {
        toast(error.message, 'error');
      } else {
        toast('Password reset link sent to your email.', 'success');
        setMode('login');
      }
    }
    setLoading(false);
  };

  const reset = () => {
    setEmail('');
    setPassword('');
    setFullName('');
  };

  const switchMode = (m: Mode) => {
    setMode(m);
    setShowPw(false);
  };

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-md">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-ocean-600 to-ocean-800 shadow-lg mb-3">
          <Ship className="w-7 h-7 text-gold-400" />
        </div>
        <h2 className="font-display font-bold text-2xl text-ocean-900">
          {mode === 'login' ? 'Welcome Back' : mode === 'signup' ? 'Join Ocean Goers' : 'Reset Password'}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          {mode === 'login'
            ? 'Sign in to your recruitment portal'
            : mode === 'signup'
            ? 'Start your cruise ship career journey'
            : 'Enter your email to receive a reset link'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'signup' && (
          <div>
            <label className="block text-sm font-medium text-ocean-700 mb-1.5">Full Name</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                className="input-field pl-11"
              />
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-ocean-700 mb-1.5">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="input-field pl-11"
            />
          </div>
        </div>

        {mode !== 'reset' && (
          <div>
            <label className="block text-sm font-medium text-ocean-700 mb-1.5">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type={showPw ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field pl-11 pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPw((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {mode === 'signup' && password.length > 0 && (
              <div className="mt-2 flex items-center gap-1.5 text-sm">
                {password.length >= 8 ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <span className="text-emerald-600 font-medium">Strong password</span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span className="text-red-500">Password is too weak. It must be at least 8 characters long.</span>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        <button
          type="submit"
          disabled={loading || (mode === 'signup' && password.length < 8)}
          className="btn-gold w-full flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <Spinner size={20} className="text-ocean-900" />
          ) : (
            <>
              {mode === 'login' ? 'Sign In' : mode === 'signup' ? 'Create Account' : 'Send Reset Link'}
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="mt-5 text-center text-sm text-slate-500">
        {mode === 'login' && (
          <>
            <button onClick={() => switchMode('reset')} className="text-ocean-600 hover:text-ocean-700 font-medium">
              Forgot password?
            </button>
            <p className="mt-3">
              Don&apos;t have an account?{' '}
              <button onClick={() => switchMode('signup')} className="text-ocean-600 hover:text-ocean-700 font-semibold">
                Sign up
              </button>
            </p>
          </>
        )}
        {mode === 'signup' && (
          <p>
            Already have an account?{' '}
            <button onClick={() => switchMode('login')} className="text-ocean-600 hover:text-ocean-700 font-semibold">
              Sign in
            </button>
          </p>
        )}
        {mode === 'reset' && (
          <p>
            Remember your password?{' '}
            <button onClick={() => switchMode('login')} className="text-ocean-600 hover:text-ocean-700 font-semibold">
              Sign in
            </button>
          </p>
        )}
      </div>
    </Modal>
  );
}
