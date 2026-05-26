'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://hbc-api.semis.app/api';

/**
 * Two-step in-page flow:
 *   1) "request"  — enter email → POST /auth/forgot-password (backend emails a 6-digit code)
 *   2) "reset"    — enter code + new password → POST /auth/reset-password
 * After step 2 succeeds we redirect to the login page.
 */
export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      // Backend deliberately returns success even for unknown emails
      // (anti-enumeration), so we always advance to step 2.
      toast.success(d?.message || 'If that email exists, we sent a reset code.');
      setStep('reset');
    } catch {
      toast.error('Network error — please try again.');
    } finally { setBusy(false); }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) { toast.error('Enter the 6-digit code from the email'); return; }
    if (newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (newPassword !== confirmPassword) { toast.error('Passwords do not match'); return; }
    setBusy(true);
    try {
      const r = await fetch(`${API}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          code: code.trim(),
          newPassword,
          confirmPassword,
        }),
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
    <div className="container">
      <div className="flex justify-center authentication authentication-basic items-center min-h-screen text-defaultsize text-defaulttextcolor">
        <div className="grid grid-cols-12 w-full">
          <div className="xxl:col-span-4 xl:col-span-4 lg:col-span-4 md:col-span-3 sm:col-span-2"></div>
          <div className="xxl:col-span-4 xl:col-span-4 lg:col-span-4 md:col-span-6 sm:col-span-8 col-span-12 px-4">
            <div className="box shadow-sm p-6 my-8">
              <p className="text-2xl font-semibold mb-2">Forgot password?</p>
              <p className="text-[#8c9097] mb-6 text-sm">
                {step === 'request'
                  ? 'Enter your account email — we\'ll send a 6-digit code.'
                  : `We sent a code to ${email}. Enter it below with your new password.`}
              </p>

              {step === 'request' && (
                <form onSubmit={requestCode} className="space-y-4">
                  <div>
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      autoComplete="email"
                      className="form-control form-control-lg"
                      placeholder="you@example.com"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={busy || !email.trim()}
                    className="ti-btn ti-btn-primary-full !text-white w-full !opacity-100 disabled:!opacity-60"
                  >
                    {busy ? 'Sending…' : 'Send reset code'}
                  </button>
                </form>
              )}

              {step === 'reset' && (
                <form onSubmit={resetPassword} className="space-y-4">
                  <div>
                    <label className="form-label">6-digit code</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="\d{6}"
                      maxLength={6}
                      value={code}
                      onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                      className="form-control form-control-lg font-mono tracking-widest text-center"
                      placeholder="······"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">New password</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                      autoComplete="new-password"
                      minLength={6}
                      className="form-control form-control-lg"
                      placeholder="At least 6 characters"
                      required
                    />
                  </div>
                  <div>
                    <label className="form-label">Confirm new password</label>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      autoComplete="new-password"
                      minLength={6}
                      className="form-control form-control-lg"
                      required
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-[#8c9097]">
                    <input
                      type="checkbox"
                      checked={showPassword}
                      onChange={e => setShowPassword(e.target.checked)}
                    />
                    Show passwords
                  </label>
                  <button
                    type="submit"
                    disabled={busy}
                    className="ti-btn ti-btn-primary-full !text-white w-full !opacity-100 disabled:!opacity-60"
                  >
                    {busy ? 'Resetting…' : 'Reset password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStep('request'); setCode(''); }}
                    className="text-sm text-primary hover:underline w-full text-center"
                  >
                    ← Use a different email
                  </button>
                </form>
              )}

              <div className="mt-6 pt-4 border-t border-defaultborder text-center text-sm">
                Remembered it? <Link href="/" className="text-primary font-semibold">Sign in</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
