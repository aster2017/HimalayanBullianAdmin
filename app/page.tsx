'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/shared/redux/hooks';
import { loginUser, clearError } from '@/shared/redux/authSlice';
import { getStoredToken } from '@/shared/utils/tokenStorage';

export default function LoginPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const authState = useAppSelector((state) => state.auth);
  const { isLoading = false, error = null, isAuthenticated = false, requiredAction = null } = authState || {};

  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '' });

  useEffect(() => {
    if (isAuthenticated && getStoredToken()) router.push('/dashboards/admin');
  }, [isAuthenticated, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (error) dispatch(clearError());
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    dispatch(loginUser(formData));
  };

  return (
    <div className="min-h-screen flex">
      {/* ── Left brand panel ── */}
      <div
        className="hidden lg:flex lg:w-[42%] flex-col justify-between p-12"
        style={{ background: 'linear-gradient(160deg, #0d1117 0%, #1a2332 100%)' }}
      >
        {/* Logo + company */}
        <div>
          <img
            src="/assets/images/brand-logos/desktop-dark.png"
            alt="HBC Logo"
            style={{ height: 56, width: 'auto' }}
          />
          <div className="mt-6">
            <p
              className="text-xs font-bold tracking-[0.2em] mb-1"
              style={{ color: '#C8A86B', fontFamily: 'monospace' }}
            >
              HIMALAYAN BULLION COMPANY
            </p>
            <h1 className="text-3xl font-bold text-white leading-tight">
              Nepal's trusted<br />silver investment<br />platform
            </h1>
          </div>
        </div>

        {/* Feature highlights */}
        <div className="space-y-5">
          {[
            { icon: '⚖️', text: 'Regulated & compliant with Nepal Rastra Bank directives' },
            { icon: '🔒', text: 'Secure vault storage with full custody tracking' },
            { icon: '📱', text: 'Mobile app for customers — admin portal for your team' },
          ].map((item) => (
            <div key={item.text} className="flex items-start gap-3">
              <span className="text-xl leading-none mt-0.5">{item.icon}</span>
              <p className="text-sm leading-relaxed" style={{ color: '#94a3b8' }}>
                {item.text}
              </p>
            </div>
          ))}
        </div>

        {/* Website link */}
        <div>
          <a
            href="https://www.himalayanbullion.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-80"
            style={{ color: '#C8A86B' }}
          >
            www.himalayanbullion.com
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          <p className="text-xs mt-2" style={{ color: '#475569' }}>
            © 2026 Himalayan Bullion Company Pvt. Ltd.
          </p>
        </div>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center p-6 bg-white dark:bg-bodybg">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="flex flex-col items-center mb-8 lg:hidden">
            <img
              src="/assets/images/brand-logos/desktop-logo.png"
              alt="HBC Logo"
              style={{ height: 48, width: 'auto' }}
              className="dark:hidden"
            />
            <img
              src="/assets/images/brand-logos/desktop-dark.png"
              alt="HBC Logo"
              style={{ height: 48, width: 'auto' }}
              className="hidden dark:block"
            />
            <p className="mt-3 text-xs font-bold tracking-widest text-center"
               style={{ color: '#C8A86B', fontFamily: 'monospace' }}>
              HIMALAYAN BULLION COMPANY
            </p>
          </div>

          <h2 className="text-2xl font-bold text-defaulttextcolor dark:text-white mb-1">
            Welcome back
          </h2>
          <p className="text-sm text-[#8c9097] dark:text-white/50 mb-8">
            Sign in to the HBC admin portal
          </p>

          {/* Alerts */}
          {requiredAction === 'AwaitingApproval' && (
            <div className="p-4 mb-6 rounded-xl border-l-4 border-warning bg-warning/10 text-sm">
              <p className="font-semibold text-warning">Account Under Review</p>
              <p className="mt-1 text-[#8c9097]">
                Your email is verified. Our team is reviewing your account — you'll receive an email once approved.
              </p>
            </div>
          )}
          {requiredAction === 'VerifyEmail' && (
            <div className="p-4 mb-6 rounded-xl border-l-4 border-info bg-info/10 text-sm">
              <p className="font-semibold text-info">Email Verification Required</p>
              <p className="mt-1 text-[#8c9097]">
                Please check your inbox for a verification code and complete sign-up.
              </p>
            </div>
          )}
          {!requiredAction && error && (
            <div className="p-4 mb-6 rounded-xl border-l-4 border-danger bg-danger/10 text-sm text-danger">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">
                Email address
              </label>
              <input
                type="email"
                name="email"
                id="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
                className="form-control form-control-lg w-full !rounded-xl"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="password" className="block text-sm font-medium text-defaulttextcolor dark:text-white">
                  Password
                </label>
                <Link href="/forgot-password" className="text-xs font-medium hover:underline" style={{ color: '#C8A86B' }}>
                  Forgot password?
                </Link>
              </div>
              <div className="input-group">
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  required
                  className="form-control form-control-lg !rounded-s-xl !border-e-0"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="ti-btn ti-btn-light !rounded-e-xl !mb-0 border border-s-0 border-inputborder"
                  aria-label="toggle password visibility"
                >
                  <i className={`${showPassword ? 'ri-eye-line' : 'ri-eye-off-line'} align-middle text-base`} />
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-6 rounded-xl text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #C8A86B 0%, #a8863d 100%)' }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  Signing in…
                </span>
              ) : 'Sign In'}
            </button>
          </form>

          {/* Self-registration is admin-only — link hidden intentionally */}
        </div>
      </div>
    </div>
  );
}
