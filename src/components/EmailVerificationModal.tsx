import { useState, useEffect, useRef, useCallback } from 'react';
import { Ship, Mail, RefreshCw, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Modal } from './ui/Modal';
import { Spinner } from './ui/Spinner';
import { useAuth } from '../lib/auth';
import { useToast } from '../lib/toast';

const VERIFY_URL = `${import.meta.env.VITE_SUPABASE_URL as string}/functions/v1/verify-email`;
const RESEND_COOLDOWN = 60;

interface Props {
  open: boolean;
  email: string;
  onSuccess: () => void;
  onClose: () => void;
}

export function EmailVerificationModal({ open, email, onSuccess, onClose }: Props) {
  const { signIn } = useAuth();
  const { toast } = useToast();

  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Start cooldown timer when modal opens
  useEffect(() => {
    if (!open) return;
    setDigits(['', '', '', '', '', '']);
    setError(null);
    setCooldown(RESEND_COOLDOWN);
  }, [open]);

  useEffect(() => {
    if (!open || cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [open, cooldown]);

  const code = digits.join('');

  const handleDigitChange = (idx: number, value: string) => {
    const v = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[idx] = v;
    setDigits(next);
    setError(null);
    if (v && idx < 5) inputRefs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setDigits(pasted.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = useCallback(async () => {
    if (code.length !== 6) return;
    setVerifying(true);
    setError(null);
    try {
      const res = await fetch(VERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ action: 'verify', email, code }),
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        if (data.error === 'expired') {
          setError('Your verification code has expired. Please request a new one.');
        } else if (data.error === 'incorrect_code') {
          setError('Incorrect code. Please check your email and try again.');
          setDigits(['', '', '', '', '', '']);
          inputRefs.current[0]?.focus();
        } else {
          setError(data.error ?? 'Verification failed. Please try again.');
        }
        return;
      }

      // Account created — now sign them in
      // We need the password; it was passed in via parent (stored in closure via prop)
      // Actually we don't have the password here — the parent will handle sign-in
      toast('Email verified! Signing you in...', 'success');
      onSuccess();
    } finally {
      setVerifying(false);
    }
  }, [code, email, onSuccess, toast]);

  // Auto-submit when all 6 digits are filled
  useEffect(() => {
    if (code.length === 6 && !verifying) {
      handleVerify();
    }
  }, [code, handleVerify, verifying]);

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError(null);
    try {
      const res = await fetch(VERIFY_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ action: 'resend', email }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setError(data.error ?? 'Failed to resend. Please try again.');
        return;
      }
      setDigits(['', '', '', '', '', '']);
      setCooldown(RESEND_COOLDOWN);
      inputRefs.current[0]?.focus();
      toast('A new code has been sent to your email.', 'success');
    } finally {
      setResending(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} maxWidth="max-w-md">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-ocean-600 to-ocean-800 shadow-lg mb-3">
          <Ship className="w-7 h-7 text-gold-400" />
        </div>
        <h2 className="font-display font-bold text-2xl text-ocean-900">Verify Your Email</h2>
        <p className="text-sm text-slate-500 mt-1">
          We sent a 6-digit code to
        </p>
        <p className="text-sm font-semibold text-ocean-700 mt-0.5 flex items-center justify-center gap-1.5">
          <Mail className="w-4 h-4" /> {email}
        </p>
      </div>

      {/* Code inputs */}
      <div className="flex gap-2.5 justify-center mb-5" onPaste={handlePaste}>
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => { inputRefs.current[i] = el; }}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={d}
            onChange={(e) => handleDigitChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            disabled={verifying}
            className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all duration-200
              ${d ? 'border-ocean-500 bg-ocean-50 text-ocean-900' : 'border-slate-200 bg-white text-slate-900'}
              ${error ? 'border-red-400 bg-red-50' : ''}
              focus:border-ocean-500 focus:ring-2 focus:ring-ocean-200 disabled:opacity-60`}
          />
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 mb-4">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Verify button */}
      <button
        type="button"
        onClick={handleVerify}
        disabled={code.length !== 6 || verifying}
        className="btn-gold w-full flex items-center justify-center gap-2 mb-4 disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {verifying ? (
          <Spinner size={20} className="text-ocean-900" />
        ) : (
          <>Verify & Create Account <ArrowRight className="w-4 h-4" /></>
        )}
      </button>

      {/* Resend */}
      <div className="text-center">
        <p className="text-sm text-slate-500 mb-1">Didn&apos;t receive the code?</p>
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0 || resending}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-ocean-600 hover:text-ocean-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {resending ? (
            <Spinner size={14} className="text-ocean-600" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          {cooldown > 0 ? `Resend Code (${cooldown}s)` : 'Resend Code'}
        </button>
      </div>

      <p className="text-center text-xs text-slate-400 mt-4">
        Code expires in 10 minutes. Check your spam folder if you don&apos;t see it.
      </p>
    </Modal>
  );
}
