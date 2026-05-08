'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/shared/redux/hooks';
import { registerUser, verifyEmail, clearError, clearRequiredAction } from '@/shared/redux/authSlice';
import { AuthService } from '@/shared/services/authService';

export default function RegisterPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isLoading, error, requiredAction, pendingEmail } = useAppSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    firstName: '', lastName: '', email: '', password: '', confirmPassword: '',
  });
  const [validationError, setValidationError] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMsg, setResendMsg] = useState('');
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => () => { if (cooldownRef.current) clearInterval(cooldownRef.current); }, []);

  const startCooldown = () => {
    setResendCooldown(60);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((v) => { if (v <= 1) { clearInterval(cooldownRef.current!); return 0; } return v - 1; });
    }, 1000);
  };

  useEffect(() => { if (requiredAction === 'VerifyEmail') startCooldown(); }, [requiredAction]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setValidationError('');
    if (error) dispatch(clearError());
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.firstName.trim()) return setValidationError('First name is required');
    if (!formData.lastName.trim()) return setValidationError('Last name is required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) return setValidationError('Valid email required');
    if (formData.password.length < 8) return setValidationError('Password must be at least 8 characters');
    if (formData.password !== formData.confirmPassword) return setValidationError('Passwords do not match');
    dispatch(registerUser({ ...formData }));
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) return setValidationError('Enter the 6-digit code');
    dispatch(verifyEmail({ email: pendingEmail!, code: otpCode }));
  };

  const handleResend = async () => {
    if (resendCooldown > 0 || !pendingEmail) return;
    try {
      await AuthService.resendOtp(pendingEmail);
      startCooldown();
      setResendMsg('A new code has been sent.');
    } catch {
      setResendMsg('Could not resend. Please try again.');
    }
  };

  // ── Awaiting approval ───────────────────────────────────────────────────────
  if (requiredAction === 'AwaitingApproval') {
    return (
      <div className="container">
        <div className="flex justify-center authentication authentication-basic items-center min-h-screen">
          <div className="grid grid-cols-12">
            <div className="xxl:col-span-4 xl:col-span-4 lg:col-span-4 md:col-span-3 sm:col-span-2" />
            <div className="xxl:col-span-4 xl:col-span-4 lg:col-span-4 md:col-span-6 sm:col-span-8 col-span-12">
              <div className="box !p-[3rem] text-center">
                <div className="flex justify-center mb-4 text-5xl">⏳</div>
                <h5 className="font-semibold mb-2">Account Under Review</h5>
                <p className="text-[#8c9097] mb-4 text-sm">
                  Your email is verified! Our team is reviewing your account.
                  You will receive an email once approved.
                </p>
                <div className="text-start mb-6 space-y-2 bg-light rounded-lg p-4">
                  <div className="flex items-center gap-2 text-sm text-success font-medium">✓ Account created</div>
                  <div className="flex items-center gap-2 text-sm text-success font-medium">✓ Email verified</div>
                  <div className="flex items-center gap-2 text-sm text-[#8c9097]">⏳ Admin approval (pending)</div>
                </div>
                <button
                  onClick={() => { dispatch(clearRequiredAction()); router.push('/'); }}
                  className="ti-btn ti-btn-primary w-full"
                >
                  Back to Sign In
                </button>
              </div>
            </div>
            <div className="xxl:col-span-4 xl:col-span-4 lg:col-span-4 md:col-span-3 sm:col-span-2" />
          </div>
        </div>
      </div>
    );
  }

  // ── OTP verification ────────────────────────────────────────────────────────
  if (requiredAction === 'VerifyEmail') {
    return (
      <div className="container">
        <div className="flex justify-center authentication authentication-basic items-center min-h-screen">
          <div className="grid grid-cols-12">
            <div className="xxl:col-span-4 xl:col-span-4 lg:col-span-4 md:col-span-3 sm:col-span-2" />
            <div className="xxl:col-span-4 xl:col-span-4 lg:col-span-4 md:col-span-6 sm:col-span-8 col-span-12">
              <div className="box !p-[3rem]">
                <div className="flex justify-center mb-4 text-5xl">📧</div>
                <h5 className="font-semibold mb-2 text-center">Verify Your Email</h5>
                <p className="text-[#8c9097] text-center mb-4 text-sm">
                  We sent a 6-digit code to <strong>{pendingEmail}</strong>
                </p>

                {(error || validationError) && (
                  <div className="p-3 mb-4 text-sm rounded-lg bg-danger/20 text-danger">
                    {error || validationError}
                  </div>
                )}
                {resendMsg && !error && (
                  <div className="p-3 mb-4 text-sm rounded-lg bg-success/20 text-success">{resendMsg}</div>
                )}

                <form onSubmit={handleVerifyOtp} className="space-y-4">
                  <div>
                    <label className="form-label text-default">Verification Code</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => { setOtpCode(e.target.value.replace(/\D/g, '')); setValidationError(''); }}
                      className="form-control form-control-lg w-full !rounded-md text-center tracking-[0.5em] text-xl"
                      placeholder="000000"
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading || otpCode.length !== 6}
                    className="ti-btn ti-btn-primary w-full disabled:opacity-50"
                  >
                    {isLoading ? 'Verifying…' : 'Verify Email'}
                  </button>
                </form>

                <p className="text-center text-sm text-[#8c9097] mt-4">
                  {"Didn't receive it? "}
                  {resendCooldown > 0
                    ? <span>Resend in {resendCooldown}s</span>
                    : <button onClick={handleResend} className="text-primary font-semibold">Resend</button>
                  }
                </p>
              </div>
            </div>
            <div className="xxl:col-span-4 xl:col-span-4 lg:col-span-4 md:col-span-3 sm:col-span-2" />
          </div>
        </div>
      </div>
    );
  }

  // ── Registration form ───────────────────────────────────────────────────────
  return (
    <div className="container">
      <div className="flex justify-center authentication authentication-basic items-center min-h-screen text-defaultsize text-defaulttextcolor">
        <div className="grid grid-cols-12">
          <div className="xxl:col-span-4 xl:col-span-4 lg:col-span-4 md:col-span-3 sm:col-span-2" />
          <div className="xxl:col-span-4 xl:col-span-4 lg:col-span-4 md:col-span-6 sm:col-span-8 col-span-12">
            <div className="box !p-[3rem]">
              <p className="h5 font-semibold mb-2 text-center">Create Account</p>
              <p className="mb-4 text-[#8c9097] opacity-70 font-normal text-center">Join HBC Silver today</p>

              {(error || validationError) && (
                <div className="p-4 mb-4 bg-danger/20 text-sm text-danger rounded-lg">{error || validationError}</div>
              )}

              <form onSubmit={handleSubmit} className="grid grid-cols-12 gap-y-4">
                <div className="xl:col-span-6 col-span-12">
                  <label className="form-label text-default">First Name</label>
                  <input type="text" name="firstName" className="form-control form-control-lg w-full !rounded-md"
                    placeholder="First name" value={formData.firstName} onChange={handleChange} required />
                </div>
                <div className="xl:col-span-6 col-span-12">
                  <label className="form-label text-default">Last Name</label>
                  <input type="text" name="lastName" className="form-control form-control-lg w-full !rounded-md"
                    placeholder="Last name" value={formData.lastName} onChange={handleChange} required />
                </div>
                <div className="xl:col-span-12 col-span-12">
                  <label className="form-label text-default">Email</label>
                  <input type="email" name="email" className="form-control form-control-lg w-full !rounded-md"
                    placeholder="Enter your email" value={formData.email} onChange={handleChange} required />
                </div>
                <div className="xl:col-span-12 col-span-12">
                  <label className="form-label text-default">Password</label>
                  <input type="password" name="password" className="form-control form-control-lg w-full !rounded-md"
                    placeholder="Min. 8 characters" value={formData.password} onChange={handleChange} required />
                </div>
                <div className="xl:col-span-12 col-span-12">
                  <label className="form-label text-default">Confirm Password</label>
                  <input type="password" name="confirmPassword" className="form-control form-control-lg w-full !rounded-md"
                    placeholder="Confirm password" value={formData.confirmPassword} onChange={handleChange} required />
                </div>
                <div className="xl:col-span-12 col-span-12">
                  <button type="submit" disabled={isLoading}
                    className="ti-btn ti-btn-primary !bg-primary !text-white !font-medium w-full disabled:opacity-50">
                    {isLoading ? 'Creating Account…' : 'Create Account'}
                  </button>
                </div>
              </form>

              <div className="text-center mt-4">
                <p className="text-[0.75rem] text-[#8c9097]">
                  Already have an account?{' '}
                  <Link href="/" className="text-primary font-semibold">Sign In</Link>
                </p>
              </div>
            </div>
          </div>
          <div className="xxl:col-span-4 xl:col-span-4 lg:col-span-4 md:col-span-3 sm:col-span-2" />
        </div>
      </div>
    </div>
  );
}
