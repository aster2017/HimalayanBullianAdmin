'use client';

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import Seo from '@/shared/layout-components/seo/seo';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { useAppSelector } from '@/shared/redux/hooks';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://hbc-api.semis.app/api';

type OtpMode = 'email' | 'sms' | 'both';

const MODE_OPTIONS: { value: OtpMode; label: string; description: string; icon: string; color: string }[] = [
  {
    value: 'email',
    label: 'Email only',
    description: 'OTP codes are sent to the customer\'s email address only.',
    icon: 'bx-envelope',
    color: 'bg-primary/10 text-primary',
  },
  {
    value: 'sms',
    label: 'SMS only',
    description: 'OTP codes are sent via SMS to the customer\'s phone number only.',
    icon: 'bx-mobile',
    color: 'bg-success/10 text-success',
  },
  {
    value: 'both',
    label: 'Email + SMS',
    description: 'OTP codes are sent via both email and SMS simultaneously.',
    icon: 'bx-broadcast',
    color: 'bg-warning/10 text-warning',
  },
];

export default function NotificationsSettingsPage() {
  useProtectedRoute();

  const user = useAppSelector((state) => state.auth.user);
  const isSuperAdmin = user?.roles?.includes('SuperAdmin') ?? false;

  const [currentMode, setCurrentMode] = useState<OtpMode>('both');
  const [selectedMode, setSelectedMode] = useState<OtpMode>('both');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isSuperAdmin) return;
    fetch(`${API}/settings/otp-mode`, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(d => {
        if (d.otpDeliveryMode) {
          setCurrentMode(d.otpDeliveryMode);
          setSelectedMode(d.otpDeliveryMode);
        }
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false));
  }, [isSuperAdmin]);

  const handleSave = async () => {
    if (selectedMode === currentMode) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/settings/otp-mode`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ mode: selectedMode }),
      });
      if (!res.ok) throw new Error(await res.text());
      setCurrentMode(selectedMode);
      toast.success(`OTP delivery set to "${selectedMode}"`);
    } catch {
      toast.error('Failed to save setting');
    } finally {
      setSaving(false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <Fragment>
        <Seo title="Notifications — Settings" />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <i className="bx bx-lock text-5xl text-[#8c9097] mb-3"></i>
            <p className="font-semibold text-defaulttextcolor">SuperAdmin access required</p>
            <p className="text-[0.813rem] text-[#8c9097] mt-1">Only SuperAdmin can manage notification settings.</p>
            <Link href="/settings" className="ti-btn ti-btn-primary-full !text-white mt-4 inline-block">
              Back to Settings
            </Link>
          </div>
        </div>
      </Fragment>
    );
  }

  return (
    <Fragment>
      <Seo title="Notifications — Settings" />

      <div className="md:flex block items-center justify-between my-[1.5rem] page-header-breadcrumb">
        <div>
          <p className="font-semibold text-[1.125rem] text-defaulttextcolor dark:text-defaulttextcolor/70 !mb-0">
            Notification Settings
          </p>
          <ol className="flex items-center whitespace-nowrap min-w-0 mt-1">
            <li className="text-[0.813rem]">
              <Link href="/settings" className="text-[#8c9097] hover:text-primary">Settings</Link>
            </li>
            <li className="text-[0.813rem] text-[#8c9097] mx-1">/</li>
            <li className="text-[0.813rem] text-defaulttextcolor font-medium truncate">Notifications</li>
          </ol>
        </div>
      </div>

      {/* OTP Delivery Mode */}
      <div className="box">
        <div className="box-header">
          <h4 className="box-title">OTP Delivery Mode</h4>
          <p className="text-[0.813rem] text-[#8c9097] mt-1">
            Controls how one-time passwords are delivered to customers during signup and login verification.
            This applies app-wide to all users.
          </p>
        </div>
        <div className="box-body">
          {loading ? (
            <div className="flex items-center gap-2 text-[#8c9097] py-4">
              <i className="ri-loader-4-line animate-spin text-lg"></i>
              <span className="text-[0.813rem]">Loading current setting…</span>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                {MODE_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedMode(opt.value)}
                    className={`
                      relative border-2 rounded-xl p-4 text-left transition-all
                      ${selectedMode === opt.value
                        ? 'border-primary bg-primary/5 shadow-sm'
                        : 'border-defaultborder dark:border-defaultborder/10 hover:border-primary/40'}
                    `}
                  >
                    {selectedMode === opt.value && (
                      <span className="absolute top-3 right-3">
                        <i className="bx bx-check-circle text-primary text-xl"></i>
                      </span>
                    )}
                    {currentMode === opt.value && selectedMode !== opt.value && (
                      <span className="absolute top-3 right-3 text-[0.65rem] font-medium px-1.5 py-0.5 rounded bg-success/10 text-success">
                        Active
                      </span>
                    )}
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${opt.color}`}>
                      <i className={`bx ${opt.icon} text-xl`}></i>
                    </div>
                    <p className="font-semibold text-defaulttextcolor dark:text-defaulttextcolor/70 mb-1">
                      {opt.label}
                    </p>
                    <p className="text-[0.75rem] text-[#8c9097] leading-relaxed">{opt.description}</p>
                  </button>
                ))}
              </div>

              {/* Current active indicator */}
              <div className="flex items-center gap-2 mb-5 p-3 rounded-lg bg-light dark:bg-black/20">
                <i className="bx bx-info-circle text-primary text-lg"></i>
                <span className="text-[0.813rem] text-[#8c9097]">
                  Currently active:&nbsp;
                  <span className="font-semibold text-defaulttextcolor dark:text-defaulttextcolor/70">
                    {MODE_OPTIONS.find(o => o.value === currentMode)?.label}
                  </span>
                </span>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleSave}
                  disabled={saving || selectedMode === currentMode}
                  className="ti-btn ti-btn-primary-full !text-white disabled:opacity-50"
                >
                  {saving
                    ? <><i className="ri-loader-4-line animate-spin me-1"></i>Saving…</>
                    : 'Save Changes'}
                </button>
                {selectedMode !== currentMode && (
                  <button
                    onClick={() => setSelectedMode(currentMode)}
                    className="ti-btn ti-btn-outline-secondary"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Info box */}
      <div className="box mt-4">
        <div className="box-header"><h4 className="box-title">How it works</h4></div>
        <div className="box-body">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex gap-3">
              <div className="p-2 rounded bg-primary/10 text-primary h-fit">
                <i className="bx bx-log-in text-xl"></i>
              </div>
              <div>
                <p className="font-semibold text-[0.875rem] mb-1">Signup OTP</p>
                <p className="text-[0.75rem] text-[#8c9097]">
                  Sent when a new customer registers. Verifies email/phone before the account goes live.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="p-2 rounded bg-warning/10 text-warning h-fit">
                <i className="bx bx-refresh text-xl"></i>
              </div>
              <div>
                <p className="font-semibold text-[0.875rem] mb-1">Resend OTP</p>
                <p className="text-[0.75rem] text-[#8c9097]">
                  When a customer requests a new code, it respects this setting automatically.
                </p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="p-2 rounded bg-success/10 text-success h-fit">
                <i className="bx bx-mobile text-xl"></i>
              </div>
              <div>
                <p className="font-semibold text-[0.875rem] mb-1">Phone Verification</p>
                <p className="text-[0.75rem] text-[#8c9097]">
                  Profile phone verification (separate flow) always uses SMS regardless of this setting.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
}
