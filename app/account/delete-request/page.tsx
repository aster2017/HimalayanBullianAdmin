'use client';

import Link from 'next/link';
import { useState } from 'react';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL;

const REASONS = [
  'I no longer need this account',
  'Privacy concerns',
  'Switching to another service',
  'Too many notifications',
  'Other',
];

// ── Shared UI primitives (match forgot-password page style) ──────────────────

function StepBar({ current }: { current: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {([1, 2, 3] as const).map((n) => {
        const done   = n < current;
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
            {n < 3 && (
              <div className="h-0.5 w-10 rounded" style={{ background: done ? '#C8A86B' : '#e2e8f0' }} />
            )}
          </div>
        );
      })}
      <span className="ml-2 text-xs text-[#8c9097]">Step {current} of 3</span>
    </div>
  );
}

function RedButton({ children, disabled }: { children: React.ReactNode; disabled?: boolean }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="w-full py-3 px-6 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      style={{ background: disabled ? '#d1d5db' : 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)' }}
    >
      {children}
    </button>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4 inline-block" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    </svg>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function DeleteRequestPage() {
  const [step, setStep]     = useState<1 | 2 | 3>(1);
  const [email, setEmail]   = useState('');
  const [code, setCode]     = useState('');
  const [reason, setReason] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy]     = useState(false);
  const [outcome, setOutcome] = useState<'deleted' | 'queued' | null>(null);

  // Step 1 — send OTP
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await fetch(`${API}/auth/deletion-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      // Always advance — never reveal if email exists
      toast.success('If this email is registered, a verification code has been sent.');
      setStep(2);
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  // Step 2 — verify OTP, go to confirm
  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      toast.error('Enter the 6-digit code.');
      return;
    }
    setStep(3);
  };

  // Step 3 — confirm deletion
  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreed) {
      toast.error('Please tick the confirmation checkbox.');
      return;
    }
    setBusy(true);
    try {
      const res = await fetch(`${API}/auth/deletion-request/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code, reason }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.message || 'Invalid or expired code. Please start again.');
        setStep(1);
        setCode('');
        return;
      }
      setOutcome(data.data?.status ?? 'deleted');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  // ── Success screen ─────────────────────────────────────────────────────────
  if (outcome) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa] dark:bg-[#0e0e12] px-4">
        <div className="bg-white dark:bg-[#1a1a24] rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-5"
            style={{ background: outcome === 'deleted' ? '#fef2f2' : '#fefce8' }}
          >
            {outcome === 'deleted'
              ? <span className="text-3xl">🗑️</span>
              : <span className="text-3xl">⏳</span>}
          </div>

          <h1 className="text-xl font-bold text-defaulttextcolor dark:text-white mb-3">
            {outcome === 'deleted' ? 'Account Deleted' : 'Request Received'}
          </h1>

          {outcome === 'deleted' ? (
            <p className="text-sm text-[#8c9097] leading-relaxed">
              Your HBC Silver account and personal data have been permanently deleted.
              A confirmation has been sent to your email.
            </p>
          ) : (
            <p className="text-sm text-[#8c9097] leading-relaxed">
              Your deletion request has been received. Because you have active orders,
              your account will be deleted within <strong>7 business days</strong> once
              your orders are resolved. A confirmation email is on its way.
            </p>
          )}

          <p className="text-xs text-[#8c9097] mt-6">
            Questions?{' '}
            <a href="mailto:support@himalayanbc.com" className="underline" style={{ color: '#C8A86B' }}>
              support@himalayanbc.com
            </a>
          </p>
        </div>
      </div>
    );
  }

  // ── Main card ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa] dark:bg-[#0e0e12] px-4 py-10">
      <div className="bg-white dark:bg-[#1a1a24] rounded-2xl shadow-xl p-8 max-w-md w-full">

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: '#fef2f2' }}>
            <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6M9 7V4a1 1 0 011-1h4a1 1 0 011 1v3M4 7h16" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg font-bold text-defaulttextcolor dark:text-white leading-tight">
              Delete Account
            </h1>
            <p className="text-xs text-[#8c9097]">HBC Silver</p>
          </div>
        </div>

        <p className="text-sm text-[#8c9097] mb-6 leading-relaxed">
          This will permanently delete your HBC Silver account and all associated data.
          This action cannot be undone.
        </p>

        <StepBar current={step} />

        {/* ── Step 1: Email ─────────────────────────────────────────────── */}
        {step === 1 && (
          <form onSubmit={handleEmailSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">
                Registered Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="form-control form-control-lg !rounded-xl"
                placeholder="you@example.com"
              />
              <p className="text-xs text-[#8c9097] mt-1.5">
                We'll send a verification code to your registered phone number or email.
              </p>
            </div>

            <RedButton disabled={busy || !email}>
              {busy ? <><Spinner /> &nbsp;Sending…</> : 'Send Verification Code'}
            </RedButton>
          </form>
        )}

        {/* ── Step 2: OTP ───────────────────────────────────────────────── */}
        {step === 2 && (
          <form onSubmit={handleOtpSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">
                Verification Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                required
                autoFocus
                className="form-control form-control-lg !rounded-xl tracking-[0.5em] text-center font-bold text-lg"
                placeholder="000000"
              />
              <p className="text-xs text-[#8c9097] mt-1.5">
                Enter the 6-digit code sent to your registered contact. Valid for 10 minutes.
              </p>
            </div>

            <RedButton disabled={code.length !== 6}>
              Continue
            </RedButton>

            <button
              type="button"
              onClick={() => { setStep(1); setCode(''); }}
              className="w-full text-sm text-center text-[#8c9097] hover:underline"
            >
              ← Use a different email
            </button>
          </form>
        )}

        {/* ── Step 3: Confirm ───────────────────────────────────────────── */}
        {step === 3 && (
          <form onSubmit={handleConfirm} className="space-y-5">
            {/* Warning box */}
            <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800 p-4">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">
                What will be deleted
              </p>
              <ul className="text-xs text-red-600 dark:text-red-300 space-y-0.5 list-disc list-inside">
                <li>Your account and login access</li>
                <li>Personal information and KYC data</li>
                <li>Order and payment history records</li>
                <li>Portfolio and transaction data</li>
              </ul>
            </div>

            {/* Reason */}
            <div>
              <label className="block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">
                Reason <span className="text-[#8c9097] font-normal">(optional)</span>
              </label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="form-control form-control-lg !rounded-xl"
              >
                <option value="">Select a reason…</option>
                {REASONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>

            {/* Consent checkbox */}
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="mt-0.5 w-4 h-4 rounded accent-red-500 flex-shrink-0"
              />
              <span className="text-sm text-[#6b7280] dark:text-[#8c9097] leading-relaxed">
                I understand that deleting my account is permanent and cannot be undone.
                All my data will be removed from HBC Silver.
              </span>
            </label>

            <RedButton disabled={busy || !agreed}>
              {busy
                ? <><Spinner /> &nbsp;Deleting…</>
                : 'Permanently Delete My Account'}
            </RedButton>

            <button
              type="button"
              onClick={() => { setStep(2); }}
              className="w-full text-sm text-center text-[#8c9097] hover:underline"
            >
              ← Back
            </button>
          </form>
        )}

        <p className="text-center text-xs text-[#8c9097] mt-8">
          Changed your mind?{' '}
          <Link href="/" className="font-semibold hover:underline" style={{ color: '#C8A86B' }}>
            Return to Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
