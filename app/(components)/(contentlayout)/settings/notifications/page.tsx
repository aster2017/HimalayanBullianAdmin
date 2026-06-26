'use client';

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import Seo from '@/shared/layout-components/seo/seo';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { useAppSelector } from '@/shared/redux/hooks';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL;

// ── Types ─────────────────────────────────────────────────────────────────────

type OtpMode = 'email' | 'sms' | 'both';

interface NotificationEventsConfig {
  // Orders
  orderConfirmationEmail:  boolean;
  orderConfirmationPush:   boolean;
  orderStatusChangeEmail:  boolean;
  orderStatusChangePush:   boolean;
  // Payments & Wallet
  walletTopupEmail:        boolean;
  walletTopupSms:          boolean;
  walletTopupPush:         boolean;
  // Savings Targets
  targetPaymentReceiptEmail: boolean;
  targetPaymentReceiptPush:  boolean;
  targetCompletionEmail:     boolean;
  targetCompletionPush:      boolean;
  // Reminders
  overdueInvoiceEmail:       boolean;
  collectionReminderSms:     boolean;
  collectionReminderPush:    boolean;
  // Customer Lifecycle
  accountApprovedEmail:      boolean;
  accountApprovedSms:        boolean;
  accountRejectedEmail:      boolean;
  accountRejectedSms:        boolean;
  // Security
  passwordChangedEmail:      boolean;
  newDeviceLoginEmail:       boolean;
  // Admin Alerts
  adminLargeOrderEmail:      boolean;
  adminLargeOrderThreshold:  number;
  adminNewKycEmail:          boolean;
}

const DEFAULT_EVENTS: NotificationEventsConfig = {
  orderConfirmationEmail:    true,
  orderConfirmationPush:     true,
  orderStatusChangeEmail:    true,
  orderStatusChangePush:     true,
  walletTopupEmail:          true,
  walletTopupSms:            false,
  walletTopupPush:           true,
  targetPaymentReceiptEmail: true,
  targetPaymentReceiptPush:  true,
  targetCompletionEmail:     true,
  targetCompletionPush:      true,
  overdueInvoiceEmail:       true,
  collectionReminderSms:     true,
  collectionReminderPush:    true,
  accountApprovedEmail:      true,
  accountApprovedSms:        true,
  accountRejectedEmail:      true,
  accountRejectedSms:        true,
  passwordChangedEmail:      true,
  newDeviceLoginEmail:       false,
  adminLargeOrderEmail:      true,
  adminLargeOrderThreshold:  50000,
  adminNewKycEmail:          true,
};

const OTP_OPTIONS: { value: OtpMode; label: string; description: string; icon: string; color: string }[] = [
  { value: 'email', label: 'Email only',   description: "OTP codes are sent to the customer's email address only.", icon: 'bx-envelope', color: 'bg-primary/10 text-primary' },
  { value: 'sms',   label: 'SMS only',     description: "OTP codes are sent via SMS to the customer's phone number only.", icon: 'bx-mobile',   color: 'bg-success/10 text-success' },
  { value: 'both',  label: 'Email + SMS',  description: 'OTP codes are sent via both email and SMS simultaneously.', icon: 'bx-broadcast', color: 'bg-warning/10 text-warning' },
];

// ── Toggle row ────────────────────────────────────────────────────────────────

function ToggleRow({
  label, description, channels, value, onChange, disabled = false,
}: {
  label: string; description?: string;
  channels?: string[]; // e.g. ["Email", "Push"]
  value: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 py-3 border-b border-defaultborder/40 dark:border-defaultborder/10 last:border-0 ${disabled ? 'opacity-40 pointer-events-none' : ''}`}>
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[0.82rem] font-medium text-defaulttextcolor dark:text-defaulttextcolor/80">{label}</span>
          {channels?.map(ch => (
            <span key={ch} className="text-[0.62rem] font-semibold px-1.5 py-0.5 rounded bg-light dark:bg-black/20 text-[#8c9097]">{ch}</span>
          ))}
        </div>
        {description && <p className="text-[0.72rem] text-[#8c9097] mt-0.5">{description}</p>}
      </div>
      <button
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        className={`relative flex-shrink-0 w-10 h-5 rounded-full transition-colors ${value ? 'bg-primary' : 'bg-defaultborder dark:bg-white/20'}`}
      >
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${value ? 'translate-x-5' : 'translate-x-0'}`} />
      </button>
    </div>
  );
}

// ── Section card ──────────────────────────────────────────────────────────────

function Section({ icon, title, children }: { icon: string; title: string; children: React.ReactNode }) {
  return (
    <div className="box">
      <div className="box-header flex items-center gap-2">
        <i className={`${icon} text-primary text-lg`}></i>
        <h4 className="box-title">{title}</h4>
      </div>
      <div className="box-body !pt-1">{children}</div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function NotificationsSettingsPage() {
  useProtectedRoute();
  const user = useAppSelector((state) => state.auth.user);
  const isSuperAdmin = user?.roles?.includes('SuperAdmin') ?? false;

  // OTP mode state
  const [otpMode, setOtpMode]           = useState<OtpMode>('both');
  const [savedOtpMode, setSavedOtpMode] = useState<OtpMode>('both');
  const [otpLoading, setOtpLoading]     = useState(true);
  const [otpSaving, setOtpSaving]       = useState(false);

  // Events config state
  const [events, setEvents]             = useState<NotificationEventsConfig>(DEFAULT_EVENTS);
  const [savedEvents, setSavedEvents]   = useState<NotificationEventsConfig>(DEFAULT_EVENTS);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [eventsSaving, setEventsSaving]   = useState(false);
  const [thresholdInput, setThresholdInput] = useState('50000');

  useEffect(() => {
    if (!isSuperAdmin) return;

    Promise.all([
      fetch(`${API}/settings/otp-mode`, { headers: getAuthHeaders() })
        .then(r => r.json())
        .then(d => { if (d.otpDeliveryMode) { setOtpMode(d.otpDeliveryMode); setSavedOtpMode(d.otpDeliveryMode); } })
        .finally(() => setOtpLoading(false)),

      fetch(`${API}/settings/notification-events`, { headers: getAuthHeaders() })
        .then(r => r.json())
        .then(d => {
          if (d.config) {
            setEvents(d.config);
            setSavedEvents(d.config);
            setThresholdInput(String(d.config.adminLargeOrderThreshold ?? 50000));
          }
        })
        .finally(() => setEventsLoading(false)),
    ]).catch(() => toast.error('Failed to load settings'));
  }, [isSuperAdmin]);

  const setEvent = <K extends keyof NotificationEventsConfig>(key: K, value: NotificationEventsConfig[K]) => {
    setEvents(prev => ({ ...prev, [key]: value }));
  };

  const hasOtpChange     = otpMode !== savedOtpMode;
  const hasEventsChange  = JSON.stringify(events) !== JSON.stringify(savedEvents);

  const saveOtpMode = async () => {
    setOtpSaving(true);
    try {
      const res = await fetch(`${API}/settings/otp-mode`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ mode: otpMode }),
      });
      if (!res.ok) throw new Error(await res.text());
      setSavedOtpMode(otpMode);
      toast.success(`OTP delivery set to "${otpMode}"`);
    } catch { toast.error('Failed to save'); } finally { setOtpSaving(false); }
  };

  const saveEvents = async () => {
    const payload = { ...events, adminLargeOrderThreshold: Number(thresholdInput) || 50000 };
    setEventsSaving(true);
    try {
      const res = await fetch(`${API}/settings/notification-events`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      setSavedEvents(payload);
      setEvents(payload);
      toast.success('Notification events saved');
    } catch { toast.error('Failed to save'); } finally { setEventsSaving(false); }
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
            <li className="text-[0.813rem] text-defaulttextcolor font-medium">Notifications</li>
          </ol>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">

        {/* ── OTP Delivery Mode ── */}
        <div className="box">
          <div className="box-header flex items-center gap-2">
            <i className="bx bx-key text-primary text-lg"></i>
            <div>
              <h4 className="box-title">OTP Delivery Mode</h4>
              <p className="text-[0.75rem] text-[#8c9097] mt-0.5">
                Controls how one-time passwords are delivered during signup and login.
              </p>
            </div>
          </div>
          <div className="box-body">
            {otpLoading ? (
              <div className="flex items-center gap-2 text-[#8c9097] py-4">
                <i className="ri-loader-4-line animate-spin text-lg"></i>
                <span className="text-[0.813rem]">Loading…</span>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  {OTP_OPTIONS.map(opt => (
                    <button key={opt.value} onClick={() => setOtpMode(opt.value)}
                      className={`relative border-2 rounded-xl p-4 text-left transition-all ${otpMode === opt.value ? 'border-primary bg-primary/5 shadow-sm' : 'border-defaultborder dark:border-defaultborder/10 hover:border-primary/40'}`}>
                      {otpMode === opt.value && <i className="bx bx-check-circle text-primary text-xl absolute top-3 right-3"></i>}
                      {savedOtpMode === opt.value && otpMode !== opt.value && (
                        <span className="absolute top-3 right-3 text-[0.62rem] font-medium px-1.5 py-0.5 rounded bg-success/10 text-success">Active</span>
                      )}
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${opt.color}`}>
                        <i className={`bx ${opt.icon} text-xl`}></i>
                      </div>
                      <p className="font-semibold text-[0.82rem] text-defaulttextcolor dark:text-defaulttextcolor/70 mb-1">{opt.label}</p>
                      <p className="text-[0.72rem] text-[#8c9097] leading-relaxed">{opt.description}</p>
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={saveOtpMode} disabled={otpSaving || !hasOtpChange}
                    className="ti-btn ti-btn-primary-full !text-white disabled:opacity-50">
                    {otpSaving ? <><i className="ri-loader-4-line animate-spin me-1"></i>Saving…</> : 'Save OTP Setting'}
                  </button>
                  {hasOtpChange && <button onClick={() => setOtpMode(savedOtpMode)} className="ti-btn ti-btn-outline-secondary">Cancel</button>}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── Per-event toggles ── */}
        {eventsLoading ? (
          <div className="box"><div className="box-body flex items-center gap-2 text-[#8c9097] py-6">
            <i className="ri-loader-4-line animate-spin text-lg"></i>
            <span className="text-[0.813rem]">Loading notification events…</span>
          </div></div>
        ) : (
          <>
            <Section icon="ri-shopping-cart-line" title="Orders">
              <ToggleRow label="Order confirmation" channels={['Email']} description="Sent to customer when a new order is placed."
                value={events.orderConfirmationEmail} onChange={v => setEvent('orderConfirmationEmail', v)} />
              <ToggleRow label="Order confirmation" channels={['Push']}
                value={events.orderConfirmationPush} onChange={v => setEvent('orderConfirmationPush', v)} />
              <ToggleRow label="Order status change" channels={['Email']} description="Sent when order moves to Shipped, Delivered, Cancelled."
                value={events.orderStatusChangeEmail} onChange={v => setEvent('orderStatusChangeEmail', v)} />
              <ToggleRow label="Order status change" channels={['Push']}
                value={events.orderStatusChangePush} onChange={v => setEvent('orderStatusChangePush', v)} />
            </Section>

            <Section icon="ri-wallet-3-line" title="Payments & Wallet">
              <ToggleRow label="Wallet top-up confirmation" channels={['Email']} description="Sent to customer after ConnectIPS credit is verified."
                value={events.walletTopupEmail} onChange={v => setEvent('walletTopupEmail', v)} />
              <ToggleRow label="Wallet top-up confirmation" channels={['SMS']}
                value={events.walletTopupSms} onChange={v => setEvent('walletTopupSms', v)} />
              <ToggleRow label="Wallet top-up confirmation" channels={['Push']} description="Already active — toggle disables existing send."
                value={events.walletTopupPush} onChange={v => setEvent('walletTopupPush', v)} />
            </Section>

            <Section icon="ri-focus-3-line" title="Savings Targets">
              <ToggleRow label="Installment payment receipt" channels={['Email']} description="Email receipt for each target installment paid."
                value={events.targetPaymentReceiptEmail} onChange={v => setEvent('targetPaymentReceiptEmail', v)} />
              <ToggleRow label="Installment payment receipt" channels={['Push']} description="Already active."
                value={events.targetPaymentReceiptPush} onChange={v => setEvent('targetPaymentReceiptPush', v)} />
              <ToggleRow label="Target fully completed" channels={['Email']} description="Congratulations email when 100% is reached."
                value={events.targetCompletionEmail} onChange={v => setEvent('targetCompletionEmail', v)} />
              <ToggleRow label="Target fully completed" channels={['Push']} description="Already active."
                value={events.targetCompletionPush} onChange={v => setEvent('targetCompletionPush', v)} />
            </Section>

            <Section icon="ri-time-line" title="Reminders">
              <ToggleRow label="Overdue invoice reminder" channels={['Email']} description="Sent at day 1, 7, 14, and 30+ after due date (daily job). Already active."
                value={events.overdueInvoiceEmail} onChange={v => setEvent('overdueInvoiceEmail', v)} />
              <ToggleRow label="Collection reminder" channels={['SMS']} description="Sent the day before a scheduled collection. Already active."
                value={events.collectionReminderSms} onChange={v => setEvent('collectionReminderSms', v)} />
              <ToggleRow label="Collection reminder" channels={['Push']} description="Already active."
                value={events.collectionReminderPush} onChange={v => setEvent('collectionReminderPush', v)} />
            </Section>

            <Section icon="ri-user-follow-line" title="Customer Lifecycle">
              <ToggleRow label="Account approved" channels={['Email']} description="Sent when admin approves KYC. Already active."
                value={events.accountApprovedEmail} onChange={v => setEvent('accountApprovedEmail', v)} />
              <ToggleRow label="Account approved" channels={['SMS']} description="Already active."
                value={events.accountApprovedSms} onChange={v => setEvent('accountApprovedSms', v)} />
              <ToggleRow label="Account rejected" channels={['Email']} description="Sent when admin rejects KYC. Already active."
                value={events.accountRejectedEmail} onChange={v => setEvent('accountRejectedEmail', v)} />
              <ToggleRow label="Account rejected" channels={['SMS']} description="Already active."
                value={events.accountRejectedSms} onChange={v => setEvent('accountRejectedSms', v)} />
            </Section>

            <Section icon="ri-shield-check-line" title="Security">
              <ToggleRow label="Password changed" channels={['Email']} description="Security alert sent to customer when their password is changed."
                value={events.passwordChangedEmail} onChange={v => setEvent('passwordChangedEmail', v)} />
              <ToggleRow label="New device login" channels={['Email']} description="Alert sent when account is accessed from an unrecognised device."
                value={events.newDeviceLoginEmail} onChange={v => setEvent('newDeviceLoginEmail', v)} />
            </Section>

            <Section icon="ri-admin-line" title="Admin Alerts">
              <ToggleRow label="Large order alert" channels={['Email']} description="Email sent to admin when a customer places an order above the threshold."
                value={events.adminLargeOrderEmail} onChange={v => setEvent('adminLargeOrderEmail', v)} />
              {events.adminLargeOrderEmail && (
                <div className="flex items-center gap-3 pt-1 pb-2">
                  <span className="text-[0.78rem] text-[#8c9097]">Threshold (NPR)</span>
                  <input
                    type="number" min={0} step={1000}
                    value={thresholdInput}
                    onChange={e => setThresholdInput(e.target.value)}
                    className="form-control !w-36 !text-[0.82rem] !py-1"
                    placeholder="50000"
                  />
                </div>
              )}
              <ToggleRow label="New KYC submitted" channels={['Email']} description="Admin alert when a new customer registers and awaits approval. Already active."
                value={events.adminNewKycEmail} onChange={v => setEvent('adminNewKycEmail', v)} />
            </Section>

            {/* Save bar */}
            <div className={`sticky bottom-4 z-10 transition-all ${hasEventsChange ? 'opacity-100 translate-y-0' : 'opacity-0 pointer-events-none translate-y-2'}`}>
              <div className="bg-white dark:bg-bodybg border border-primary/30 rounded-xl shadow-lg px-5 py-3 flex items-center justify-between gap-4">
                <span className="text-[0.82rem] text-defaulttextcolor dark:text-defaulttextcolor/80">
                  <i className="ri-edit-line text-primary me-1"></i>You have unsaved changes
                </span>
                <div className="flex gap-2">
                  <button onClick={() => { setEvents(savedEvents); setThresholdInput(String(savedEvents.adminLargeOrderThreshold)); }}
                    className="ti-btn ti-btn-outline-secondary !py-1.5 !text-[0.78rem]">Discard</button>
                  <button onClick={saveEvents} disabled={eventsSaving}
                    className="ti-btn ti-btn-primary-full !text-white !py-1.5 !text-[0.78rem] disabled:opacity-50">
                    {eventsSaving ? <><i className="ri-loader-4-line animate-spin me-1"></i>Saving…</> : 'Save All Changes'}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </Fragment>
  );
}
