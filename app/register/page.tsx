'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { useAppDispatch, useAppSelector } from '@/shared/redux/hooks';
import { verifyEmail, clearError, clearRequiredAction } from '@/shared/redux/authSlice';
import { AuthService } from '@/shared/services/authService';
import apiClient from '@/shared/services/apiClient';

const UBO_TEXT = `I confirm that I am the Ultimate Beneficial Owner (UBO) of all silver, bullion, and related items purchased through Himalayan Bullion. I declare that:

• I am acting on my own behalf and not as a nominee, agent, or trustee for any undisclosed third party.

• The funds used for these purchases come from legitimate sources and are my own (or — if registering as a business — funds of the legal entity for which I am authorised to act).

• I will notify Himalayan Bullion within 30 days of any change to this status.

• I understand that providing false UBO information may constitute a violation of Nepal's Asset (Money) Laundering Prevention Act, 2008 (as amended) and applicable Nepal Rastra Bank directives.`;

// ── Step indicator ───────────────────────────────────────────────────────────
function StepBar({ current, total }: { current: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <div key={n} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                done ? 'text-white' : active ? 'text-black' : 'text-[#8c9097] bg-light dark:bg-white/10'
              }`}
              style={
                done
                  ? { background: '#C8A86B' }
                  : active
                  ? { background: 'linear-gradient(135deg, #C8A86B 0%, #a8863d 100%)' }
                  : undefined
              }
            >
              {done ? '✓' : n}
            </div>
            {n < total && (
              <div
                className="h-0.5 w-10 rounded transition-all"
                style={{ background: done ? '#C8A86B' : '#e2e8f0' }}
              />
            )}
          </div>
        );
      })}
      <span className="ml-2 text-xs text-[#8c9097]">Step {current} of {total}</span>
    </div>
  );
}

// ── Shared card shell ────────────────────────────────────────────────────────
function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-bodybg p-6">
      <div className="w-full max-w-[480px]">
        <div className="flex flex-col items-center mb-8">
          <img src="/assets/images/brand-logos/desktop-logo.png" alt="HBC" style={{ height: 48 }} className="dark:hidden" />
          <img src="/assets/images/brand-logos/desktop-dark.png" alt="HBC" style={{ height: 48 }} className="hidden dark:block" />
          <p className="mt-2 text-[10px] font-bold tracking-[0.2em]" style={{ color: '#C8A86B', fontFamily: 'monospace' }}>
            HIMALAYAN BULLION COMPANY
          </p>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Gold primary button ──────────────────────────────────────────────────────
function GoldButton({ children, disabled, type = 'submit', onClick }: {
  children: React.ReactNode; disabled?: boolean; type?: 'submit' | 'button'; onClick?: () => void;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="w-full py-3 px-6 rounded-xl text-sm font-semibold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
      style={{ background: 'linear-gradient(135deg, #C8A86B 0%, #a8863d 100%)' }}
    >
      {children}
    </button>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { isLoading, error, requiredAction, pendingEmail } = useAppSelector((state) => state.auth);

  // ── Multi-step state ─────────────────────────────────────────────────────
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');

  // Step 1 — account details
  const [step1, setStep1] = useState({
    firstName: '', lastName: '', email: '', phone: '',
    password: '', confirmPassword: '',
  });
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirmPwd, setShowConfirmPwd] = useState(false);
  const [step1Error, setStep1Error] = useState('');

  // Step 2 — KYC
  const [panNumber, setPanNumber] = useState('');
  const [panFile, setPanFile] = useState<File | null>(null);
  const [panPreview, setPanPreview] = useState<string | null>(null);
  const [clientType, setClientType] = useState<'Individual' | 'Business'>('Individual');
  // Address / KYC contact (backend requires these on /auth/register)
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [addrState, setAddrState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [uboAccepted, setUboAccepted] = useState(false);
  const [showUbo, setShowUbo] = useState(false);
  const [step2Error, setStep2Error] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Step 3 — OTP
  const [otpCode, setOtpCode] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendMsg, setResendMsg] = useState('');
  const [step3Error, setStep3Error] = useState('');
  const cooldownRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => () => { if (cooldownRef.current) clearInterval(cooldownRef.current); }, []);

  // After successful register → backend sends OTP → we go to step 3
  useEffect(() => {
    if (requiredAction === 'VerifyEmail' && step !== 3) {
      setStep(3);
      startCooldown();
    }
  }, [requiredAction]);

  const startCooldown = () => {
    setResendCooldown(60);
    cooldownRef.current = setInterval(() => {
      setResendCooldown((v) => { if (v <= 1) { clearInterval(cooldownRef.current!); return 0; } return v - 1; });
    }, 1000);
  };

  // ── Step 1 validation ────────────────────────────────────────────────────
  const handleStep1Next = () => {
    setStep1Error('');
    if (!step1.firstName.trim()) return setStep1Error('First name is required');
    if (!step1.lastName.trim()) return setStep1Error('Last name is required');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(step1.email)) return setStep1Error('Valid email is required');
    if (!/^9[78]\d{8}$/.test(step1.phone.replace(/\s/g, '')))
      return setStep1Error('A valid Nepal mobile number is required (98/97 + 8 digits)');
    if (step1.password.length < 8) return setStep1Error('Password must be at least 8 characters');
    if (step1.password !== step1.confirmPassword) return setStep1Error('Passwords do not match');
    setStep(2);
  };

  // ── PAN card file handler ────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5_000_000) { setStep2Error('File must be 5 MB or smaller'); return; }
    if (!file.type.startsWith('image/')) { setStep2Error('Please upload an image file (JPG, PNG)'); return; }
    setPanFile(file);
    setPanPreview(URL.createObjectURL(file));
    setStep2Error('');
  };

  // ── Step 2 submit — multipart to /auth/register ──────────────────────────
  const handleStep2Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep2Error('');
    if (!/^\d{9}$/.test(panNumber)) return setStep2Error('PAN number must be exactly 9 digits');
    if (!panFile) return setStep2Error('PAN card photo is required');
    if (!address.trim()) return setStep2Error('Address is required');
    if (!city.trim()) return setStep2Error('City is required');
    if (!addrState.trim()) return setStep2Error('State / Province is required');
    if (!postalCode.trim()) return setStep2Error('Postal code is required');
    if (!uboAccepted) return setStep2Error('You must accept the UBO declaration to continue');

    setSubmitLoading(true);
    try {
      const fd = new FormData();
      fd.append('firstName', step1.firstName.trim());
      fd.append('lastName', step1.lastName.trim());
      fd.append('email', step1.email.trim());
      fd.append('phoneNumber', step1.phone.replace(/\s/g, ''));
      fd.append('password', step1.password);
      fd.append('confirmPassword', step1.confirmPassword);
      fd.append('panNumber', panNumber);
      fd.append('address', address.trim());
      fd.append('city', city.trim());
      fd.append('state', addrState.trim());
      fd.append('postalCode', postalCode.trim());
      fd.append('clientType', clientType);
      fd.append('uboConfirmed', 'true');
      fd.append('panCardImage', panFile);

      const res = await apiClient.post('/auth/register', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const data = res.data as any;
      if (!data?.success) throw new Error(data?.message || 'Registration failed');

      // OTP sent — move to step 3. Store pendingEmail via redux workaround:
      // The verifyEmail thunk needs pendingEmail; we seed it by dispatching with the known email.
      // Backend responds with RequiredAction=VerifyEmail → our useEffect catches it.
      // Since we bypass redux for submit, manually trigger OTP step:
      setStep(3);
      startCooldown();
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Registration failed';
      setStep2Error(msg);
    } finally {
      setSubmitLoading(false);
    }
  };

  // ── Step 3 OTP verify ────────────────────────────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep3Error('');
    if (otpCode.length !== 6) return setStep3Error('Enter the 6-digit code');
    try {
      await apiClient.post('/auth/verify-email', { email: step1.email.trim(), code: otpCode });
      // Trigger AwaitingApproval state locally
      setStep(3); // stay at 3, show awaiting screen
      dispatch({ type: 'auth/verifyEmail/fulfilled', payload: { requiredAction: 'AwaitingApproval' } });
    } catch (err: any) {
      setStep3Error(err.response?.data?.message || 'Invalid or expired code');
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    try {
      await AuthService.resendOtp(step1.email.trim());
      startCooldown();
      setResendMsg('A new code has been sent.');
    } catch {
      setResendMsg('Could not resend. Please try again.');
    }
  };

  // ── AwaitingApproval screen ──────────────────────────────────────────────
  if (requiredAction === 'AwaitingApproval') {
    return (
      <AuthCard>
        <div className="text-center">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl"
               style={{ background: 'linear-gradient(135deg, #C8A86B22, #C8A86B44)' }}>
            ⏳
          </div>
          <h2 className="text-xl font-bold text-defaulttextcolor dark:text-white mb-2">Account Under Review</h2>
          <p className="text-sm text-[#8c9097] mb-6">
            Your email is verified! Our team is reviewing your KYC documents.
            You will receive an email at <strong>{step1.email}</strong> once approved.
          </p>
          <div className="text-left mb-6 space-y-3 rounded-xl p-4" style={{ background: '#f8fafc' }}>
            {[
              { done: true, label: 'Account created' },
              { done: true, label: 'Email verified' },
              { done: true, label: 'KYC submitted' },
              { done: false, label: 'Admin approval (pending)' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-3 text-sm">
                <span className={item.done ? 'text-success' : 'text-[#8c9097]'}>
                  {item.done ? '✓' : '⏳'}
                </span>
                <span className={item.done ? 'text-success font-medium' : 'text-[#8c9097]'}>{item.label}</span>
              </div>
            ))}
          </div>
          <GoldButton type="button" onClick={() => { dispatch(clearRequiredAction()); router.push('/'); }}>
            Back to Sign In
          </GoldButton>
        </div>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <StepBar current={step} total={3} />

      {/* ── Step 1: Account details ─────────────────────────────────────── */}
      {step === 1 && (
        <>
          <h2 className="text-xl font-bold text-defaulttextcolor dark:text-white mb-1">Create your account</h2>
          <p className="text-sm text-[#8c9097] mb-6">Enter your personal details to get started</p>

          {step1Error && (
            <div className="p-3 mb-5 rounded-xl border-l-4 border-danger bg-danger/10 text-sm text-danger">{step1Error}</div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">First Name</label>
                <input type="text" className="form-control form-control-lg w-full !rounded-xl"
                  placeholder="Jiwan" value={step1.firstName}
                  onChange={(e) => setStep1((p) => ({ ...p, firstName: e.target.value }))} />
              </div>
              <div>
                <label className="block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">Last Name</label>
                <input type="text" className="form-control form-control-lg w-full !rounded-xl"
                  placeholder="Katuwal" value={step1.lastName}
                  onChange={(e) => setStep1((p) => ({ ...p, lastName: e.target.value }))} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">Email address</label>
              <input type="email" className="form-control form-control-lg w-full !rounded-xl"
                placeholder="you@example.com" value={step1.email}
                onChange={(e) => setStep1((p) => ({ ...p, email: e.target.value }))} />
            </div>

            <div>
              <label className="block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">
                Phone <span className="text-[#8c9097] font-normal">(optional)</span>
              </label>
              <input type="tel" className="form-control form-control-lg w-full !rounded-xl"
                placeholder="98XXXXXXXX" value={step1.phone}
                onChange={(e) => setStep1((p) => ({ ...p, phone: e.target.value }))} />
            </div>

            <div>
              <label className="block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">Password</label>
              <div className="input-group">
                <input type={showPwd ? 'text' : 'password'}
                  className="form-control form-control-lg !rounded-s-xl !border-e-0"
                  placeholder="Min. 8 characters" value={step1.password}
                  onChange={(e) => setStep1((p) => ({ ...p, password: e.target.value }))} />
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="ti-btn ti-btn-light !rounded-e-xl !mb-0 border border-s-0 border-inputborder">
                  <i className={`${showPwd ? 'ri-eye-line' : 'ri-eye-off-line'} align-middle`} />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">Confirm Password</label>
              <div className="input-group">
                <input type={showConfirmPwd ? 'text' : 'password'}
                  className="form-control form-control-lg !rounded-s-xl !border-e-0"
                  placeholder="Re-enter password" value={step1.confirmPassword}
                  onChange={(e) => setStep1((p) => ({ ...p, confirmPassword: e.target.value }))} />
                <button type="button" onClick={() => setShowConfirmPwd(!showConfirmPwd)}
                  className="ti-btn ti-btn-light !rounded-e-xl !mb-0 border border-s-0 border-inputborder">
                  <i className={`${showConfirmPwd ? 'ri-eye-line' : 'ri-eye-off-line'} align-middle`} />
                </button>
              </div>
            </div>

            <GoldButton type="button" onClick={handleStep1Next}>
              Continue →
            </GoldButton>
          </div>
        </>
      )}

      {/* ── Step 2: KYC Documents ───────────────────────────────────────── */}
      {step === 2 && (
        <>
          <h2 className="text-xl font-bold text-defaulttextcolor dark:text-white mb-1">KYC Verification</h2>
          <p className="text-sm text-[#8c9097] mb-6">
            Required by Nepal's AML regulations. Your documents are stored securely.
          </p>

          {step2Error && (
            <div className="p-3 mb-5 rounded-xl border-l-4 border-danger bg-danger/10 text-sm text-danger">{step2Error}</div>
          )}

          <form onSubmit={handleStep2Submit} className="space-y-5">
            {/* PAN Number */}
            <div>
              <label className="block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">
                PAN Number <span className="text-[#8c9097] font-normal">(9 digits)</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={9}
                className="form-control form-control-lg w-full !rounded-xl tracking-widest"
                placeholder="000000000"
                value={panNumber}
                onChange={(e) => setPanNumber(e.target.value.replace(/\D/g, ''))}
              />
              {panNumber.length > 0 && panNumber.length !== 9 && (
                <p className="text-xs text-[#8c9097] mt-1">{panNumber.length}/9 digits</p>
              )}
            </div>

            {/* PAN Card Photo */}
            <div>
              <label className="block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">
                PAN Card Photo
              </label>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

              {panPreview ? (
                <div className="relative rounded-xl overflow-hidden border border-inputborder" style={{ height: 160 }}>
                  <img src={panPreview} alt="PAN preview" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => { setPanFile(null); setPanPreview(null); if (fileInputRef.current) fileInputRef.current.value = ''; }}
                    className="absolute top-2 right-2 w-7 h-7 rounded-full bg-danger text-white flex items-center justify-center text-xs font-bold"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-inputborder rounded-xl p-8 flex flex-col items-center gap-2 hover:border-[#C8A86B] transition-colors group"
                >
                  <div className="w-12 h-12 rounded-full flex items-center justify-center text-2xl"
                       style={{ background: '#C8A86B22' }}>
                    📷
                  </div>
                  <p className="text-sm font-medium text-defaulttextcolor dark:text-white group-hover:text-[#C8A86B]">
                    Upload PAN card photo
                  </p>
                  <p className="text-xs text-[#8c9097]">JPG or PNG · Max 5 MB</p>
                </button>
              )}
            </div>

            {/* Address (required by AML/KYC) */}
            <div>
              <label className="block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">Address</label>
              <input
                type="text"
                className="form-control form-control-lg w-full !rounded-xl"
                placeholder="Street / Tole / House no."
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">City</label>
                <input
                  type="text"
                  className="form-control form-control-lg w-full !rounded-xl"
                  placeholder="Kathmandu"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">State / Province</label>
                <input
                  type="text"
                  className="form-control form-control-lg w-full !rounded-xl"
                  placeholder="Bagmati"
                  value={addrState}
                  onChange={(e) => setAddrState(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5">Postal Code</label>
              <input
                type="text"
                inputMode="numeric"
                className="form-control form-control-lg w-full !rounded-xl"
                placeholder="44600"
                value={postalCode}
                onChange={(e) => setPostalCode(e.target.value)}
              />
            </div>

            {/* Client Type */}
            <div>
              <label className="block text-sm font-medium text-defaulttextcolor dark:text-white mb-2">
                Account Type
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(['Individual', 'Business'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setClientType(type)}
                    className="py-3 px-4 rounded-xl border text-sm font-medium transition-all"
                    style={{
                      borderColor: clientType === type ? '#C8A86B' : undefined,
                      background: clientType === type ? '#C8A86B18' : undefined,
                      color: clientType === type ? '#C8A86B' : undefined,
                    }}
                  >
                    {type === 'Individual' ? '👤 Individual' : '🏢 Business'}
                  </button>
                ))}
              </div>
            </div>

            {/* UBO Declaration */}
            <div className="rounded-xl border border-inputborder overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center justify-between p-4 text-sm font-medium text-defaulttextcolor dark:text-white"
                onClick={() => setShowUbo(!showUbo)}
              >
                <span>UBO Declaration</span>
                <i className={`ri-arrow-${showUbo ? 'up' : 'down'}-s-line text-lg`} />
              </button>
              {showUbo && (
                <div className="px-4 pb-4">
                  <pre className="text-xs text-[#8c9097] whitespace-pre-wrap leading-relaxed font-sans">{UBO_TEXT}</pre>
                </div>
              )}
              <div className="px-4 pb-4">
                <label className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={uboAccepted}
                    onChange={(e) => setUboAccepted(e.target.checked)}
                    className="mt-0.5 rounded"
                  />
                  <span className="text-sm text-[#8c9097]">
                    I have read and accept the UBO declaration above
                  </span>
                </label>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 py-3 px-6 rounded-xl border border-inputborder text-sm font-medium text-defaulttextcolor dark:text-white hover:bg-light transition-colors"
              >
                ← Back
              </button>
              <div className="flex-1">
                <GoldButton disabled={submitLoading}>
                  {submitLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Submitting…
                    </span>
                  ) : 'Submit →'}
                </GoldButton>
              </div>
            </div>
          </form>
        </>
      )}

      {/* ── Step 3: OTP Verification ────────────────────────────────────── */}
      {step === 3 && requiredAction !== 'AwaitingApproval' && (
        <>
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl"
                 style={{ background: '#C8A86B22' }}>
              📧
            </div>
            <h2 className="text-xl font-bold text-defaulttextcolor dark:text-white mb-1">Check your email</h2>
            <p className="text-sm text-[#8c9097]">
              We sent a 6-digit code to <strong>{step1.email}</strong>
            </p>
          </div>

          {(step3Error || error) && (
            <div className="p-3 mb-5 rounded-xl border-l-4 border-danger bg-danger/10 text-sm text-danger">
              {step3Error || error}
            </div>
          )}
          {resendMsg && (
            <div className="p-3 mb-5 rounded-xl bg-success/10 text-sm text-success">{resendMsg}</div>
          )}

          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-defaulttextcolor dark:text-white mb-1.5 text-center">
                Verification Code
              </label>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={otpCode}
                onChange={(e) => { setOtpCode(e.target.value.replace(/\D/g, '')); setStep3Error(''); }}
                className="form-control form-control-lg w-full !rounded-xl text-center tracking-[0.6em] text-2xl font-mono"
                placeholder="000000"
                autoFocus
              />
            </div>
            <GoldButton disabled={isLoading || otpCode.length !== 6}>
              {isLoading ? 'Verifying…' : 'Verify Email'}
            </GoldButton>
          </form>

          <p className="text-center text-sm text-[#8c9097] mt-5">
            {"Didn't receive it? "}
            {resendCooldown > 0 ? (
              <span>Resend in {resendCooldown}s</span>
            ) : (
              <button onClick={handleResend} className="font-semibold hover:underline" style={{ color: '#C8A86B' }}>
                Resend
              </button>
            )}
          </p>
        </>
      )}

      <p className="text-center text-xs text-[#8c9097] mt-8">
        Already have an account?{' '}
        <Link href="/" className="font-semibold hover:underline" style={{ color: '#C8A86B' }}>
          Sign In
        </Link>
      </p>
    </AuthCard>
  );
}
