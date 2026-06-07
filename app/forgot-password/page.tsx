'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://hbc-api.semis.app/api';

function StepBar({ current }: { current: 1 | 2 }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {([1, 2] as const).map((n) => {
        const done = n < current;
        const active = n === current;
        return (
          <div key={n} className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all"
              style={
                done
                  ? { background: '#C8A86B', color: '#fff' }
                  : active
                  ? { background: 'linear-gradient(135deg, #C8A86B 0%, #a8863d 100%)', color: '#000' }
                  : { background: '#f1f5f9', color: '#94a3b8' }
              }
            >
              {done ? '✓' : n}
            </div>
            {n < 2 && (
              <div className="h-0.5 w-10 rounded" style={{ background: done ? '#C8A86B' : '#e2e8f0' }} />
            )}
          </div>
        );
      })}
      <span className="ml-2 text-xs text-[#8c9097]">Step {current} of 2</span>
    </div>
  );
}

function GoldButton({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="w-full py-3 px-6 rounded-xl text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
      style={{ background: 'linear-gradient(135deg, #C8A86B 0%, #a8863d 100%)' }}
    >
      {children}
    </button>
  );
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);

  const requestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { toast.error('Email is required'); return; }
    setBusy(true);
    try {
      const r = await fetch(`${API}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const d = await r.json();
      toast.success(d?.message || 'If that email exists, we sent a reset code.');
      setStep(2);
    } catch {
      toast.error('Network error — please try again.');
    } finally { setBusy(false); }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) { toast.error('Enter the 6-digit code'); return; }
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setBusy(true);
    try {
      const r = await fetch(`${API}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: code.trim(), newPassword, confirmPassword }),
      });
      const d = await r.json();
      if (!r.ok || d?.success === false) {
        toast.error(d?.message || 'Reset failed — code may be invalid or expired.');
        return;
      }
      toast.success('Password reset! Please sign in with your new password.');
      router.push('/');
    } catch {
      toast.error('Network error — please try again.');
    } finally { setBusy(false); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-bodybg p-6">
      <div className="w-full max-w-[420px]">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <img src="/assets/images/brand-logos/desktop-logo.png" alt="HBC" style={{ height: 48 }} className="dark:hidden" />
          <img src="/assets/images/brand-logos/desktop-dark.png" alt="HBC" style={{ height: 48 }} className="hidden dark:block" />
          <p className="mt-2 text-[10px] font-bold tracking-[0.2em]" style={{ color: '#C8A86B', fontFamily: 'monospace' }}>
            HIMALAYAN BULLION COMPANY
          </p>
        </div>

        <StepBar current={step} />

        {/* ── Step 1: Request reset code ── */}
        {step === 1 && (
          <>
            <h2 className="text-xl font-bold text-defaulttextcolor dark:text-white mb-1">Forgot your password?</h2>
            <p className="text-sm text-[#8c9097] mb-6">
              Enter your account email and we'll send you a 6-digit reset code.
            </p>
            <form onSubmit={requestCode} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="form-control form-control-lg w-full !rounded-xl"
                  placeholder="you@example.com"
                  required
                />
              </div>
              <GoldButton disabled={busy || !email.trim()}>
                {busy ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Sending…
                  </span>
                ) : 'Send reset code'}
              </GoldButton>
            </form>
          </>
        )}

        {/* ── Step 2: Enter code + new password ── */}
        {step === 2 && (
          <>
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl mb-3"
                   style={{ background: '#C8A86B22' }}>
                📧
              </div>
              <h2 className="text-xl font-bold text-defaulttextcolor dark:text-white mb-1">Check your email</h2>
              <p className="text-sm text-[#8c9097]">
                We sent a 6-digit code to <strong>{email}</strong>
              </p>
            </div>

            <form onSubmit={resetPassword} className="space-y-5">
              {/* Code input */}
              <div>
                <label className="block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5 text-center">
                  Reset Code
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                  className="form-control form-control-lg w-full !rounded-xl text-center tracking-[0.6em] text-2xl font-mono"
                  placeholder="000000"
                  autoFocus
                />
              </div>

              {/* New password */}
              <div>
                <label className="block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">
                  New Password
                </label>
                <div className="input-group">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoComplete="new-password"
                    className="form-control form-control-lg !rounded-s-xl !border-e-0"
                    placeholder="Min. 6 characters"
                    required
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="ti-btn ti-btn-light !rounded-e-xl !mb-0 border border-s-0 border-inputborder">
                    <i className={`${showPassword ? 'ri-eye-line' : 'ri-eye-off-line'} align-middle`} />
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">
                  Confirm New Password
                </label>
                <div className="input-group">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    autoComplete="new-password"
                    className="form-control form-control-lg !rounded-s-xl !border-e-0"
                    placeholder="Re-enter new password"
                    required
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    className="ti-btn ti-btn-light !rounded-e-xl !mb-0 border border-s-0 border-inputborder">
                    <i className={`${showConfirm ? 'ri-eye-line' : 'ri-eye-off-line'} align-middle`} />
                  </button>
                </div>
              </div>

              <GoldButton disabled={busy || code.length !== 6}>
                {busy ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Resetting…
                  </span>
                ) : 'Reset password'}
              </GoldButton>

              <button
                type="button"
                onClick={() => { setStep(1); setCode(''); }}
                className="w-full text-sm text-center text-[#8c9097] hover:underline"
              >
                ← Use a different email
              </button>
            </form>
          </>
        )}

        <p className="text-center text-xs text-[#8c9097] mt-8">
          Remembered it?{' '}
          <Link href="/" className="font-semibold hover:underline" style={{ color: '#C8A86B' }}>
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
