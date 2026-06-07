'use client';

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://hbc-api.semis.app/api';

type PaymentMethodConfig = {
  enabled: boolean;
  label: string;
};

type AppConfig = {
  contactPhone: string;
  contactEmail: string;
  contactAddress: string;
  supportHours: string;
  maintenanceActive: boolean;
  maintenanceMessage: string;
  minOrderAmount: number;
  maxOrderAmount: number;
  paymentMethods: {
    connectIps:  PaymentMethodConfig;
    payAtStore:  PaymentMethodConfig;
    creditsNchl: PaymentMethodConfig;
  };
};

const DEFAULT_CONFIG: AppConfig = {
  contactPhone: '',
  contactEmail: '',
  contactAddress: '',
  supportHours: 'Sun–Fri, 10:00–18:00 NPT',
  maintenanceActive: false,
  maintenanceMessage: '',
  minOrderAmount: 0,
  maxOrderAmount: 0,
  paymentMethods: {
    connectIps:  { enabled: true,  label: 'Pay via ConnectIPS' },
    payAtStore:  { enabled: false, label: 'Pay at Store' },
    creditsNchl: { enabled: true,  label: 'Credits + ConnectIPS' },
  },
};

export default function OperationsSettingsPage() {
  useProtectedRoute();
  const [creditsEnabled, setCreditsEnabled] = useState(true);
  const [cipsEnv, setCipsEnv] = useState<'UAT' | 'Production'>('UAT');
  const [appConfig, setAppConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [savingCredits, setSavingCredits] = useState(false);
  const [savingEnv, setSavingEnv] = useState(false);
  const [savingApp, setSavingApp] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [creditsR, envR, cfgR] = await Promise.all([
        fetch(`${API}/settings/credits-enabled`),
        fetch(`${API}/settings/connectips-env`),
        fetch(`${API}/settings/app-config`),
      ]);
      const credits = await creditsR.json();
      const env = await envR.json();
      const cfg = await cfgR.json();
      setCreditsEnabled(credits?.creditsEnabled !== false);
      setCipsEnv(env?.environment === 'Production' ? 'Production' : 'UAT');
      setAppConfig({ ...DEFAULT_CONFIG, ...cfg });
    } catch { toast.error('Failed to load operations settings'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const saveCredits = async (next: boolean) => {
    setSavingCredits(true);
    try {
      const r = await fetch(`${API}/settings/credits-enabled`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      });
      const d = await r.json();
      if (d?.success) { setCreditsEnabled(next); toast.success(d.message); }
      else toast.error(d?.message || 'Failed');
    } finally { setSavingCredits(false); }
  };

  const saveEnv = async (next: 'UAT' | 'Production') => {
    if (next === 'Production' && !confirm('Switch ConnectIPS to PRODUCTION? Real money will move. Confirm?')) return;
    setSavingEnv(true);
    try {
      const r = await fetch(`${API}/settings/connectips-env`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ environment: next }),
      });
      const d = await r.json();
      if (d?.success) { setCipsEnv(next); toast.success(`ConnectIPS → ${next}`); }
      else toast.error(d?.message || 'Failed');
    } finally { setSavingEnv(false); }
  };

  const saveAppConfig = async () => {
    setSavingApp(true);
    try {
      const r = await fetch(`${API}/settings/app-config`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(appConfig),
      });
      const d = await r.json();
      if (r.ok && d?.success !== false) toast.success('App config saved');
      else toast.error(d?.message || 'Failed');
    } finally { setSavingApp(false); }
  };

  return (
    <Fragment>
      <div className="md:flex items-center justify-between my-[1.5rem]">
        <div>
          <p className="font-semibold text-[1.125rem] !mb-0">Operations &amp; App Config</p>
          <p className="text-[0.813rem] text-[#8c9097]">
            Runtime toggles, payment env, contact info, and the customer-facing maintenance banner.
            <Link href="/settings" className="text-primary ms-2">← Back to settings</Link>
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary inline-block"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Credits toggle */}
          <div className="box">
            <div className="box-header"><h6 className="box-title mb-0">Credit payments</h6></div>
            <div className="box-body">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">App-wide toggle. When OFF customers cannot use credits to pay targets/orders.</p>
                  <p className="text-xs text-gray-500 mt-1">Current: <span className={`font-semibold ${creditsEnabled ? 'text-success' : 'text-danger'}`}>{creditsEnabled ? 'Enabled' : 'Disabled'}</span></p>
                </div>
                <button
                  onClick={() => saveCredits(!creditsEnabled)}
                  disabled={savingCredits}
                  className={`ti-btn ${creditsEnabled ? 'ti-btn-danger' : 'ti-btn-success'} !text-white !opacity-100 disabled:!opacity-50`}
                >
                  {savingCredits ? '…' : (creditsEnabled ? 'Disable' : 'Enable')}
                </button>
              </div>
            </div>
          </div>

          {/* ConnectIPS env */}
          <div className="box">
            <div className="box-header"><h6 className="box-title mb-0">ConnectIPS environment</h6></div>
            <div className="box-body">
              <p className="text-sm">Switch between UAT (sandbox) and Production. Public read — iOS shows env badge.</p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => saveEnv('UAT')}
                  disabled={savingEnv || cipsEnv === 'UAT'}
                  className={`flex-1 ti-btn ${cipsEnv === 'UAT' ? 'ti-btn-primary-full !text-white' : 'ti-btn-light'} !opacity-100 disabled:!opacity-100`}
                >
                  UAT (sandbox)
                </button>
                <button
                  onClick={() => saveEnv('Production')}
                  disabled={savingEnv || cipsEnv === 'Production'}
                  className={`flex-1 ti-btn ${cipsEnv === 'Production' ? 'ti-btn-danger !text-white' : 'ti-btn-light'} !opacity-100 disabled:!opacity-100`}
                >
                  Production (live)
                </button>
              </div>
              {cipsEnv === 'Production' && (
                <p className="text-xs text-danger mt-2"><i className="ri-alert-line me-1"></i>Live mode — real customer money will move.</p>
              )}
            </div>
          </div>

          {/* App config */}
          <div className="box lg:col-span-2">
            <div className="box-header flex items-center justify-between">
              <h6 className="box-title mb-0">Contact info &amp; order limits</h6>
              <button onClick={saveAppConfig} disabled={savingApp} className="ti-btn ti-btn-primary-full ti-btn-sm !text-white !opacity-100 disabled:!opacity-50">
                {savingApp ? <><i className="ri-loader-4-line animate-spin me-1"></i>Saving…</> : 'Save app config'}
              </button>
            </div>
            <div className="box-body space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Contact phone</label>
                  <input className="form-control" value={appConfig.contactPhone} onChange={e => setAppConfig({ ...appConfig, contactPhone: e.target.value })} placeholder="+977-01-XXXXXXX" />
                </div>
                <div>
                  <label className="form-label">Contact email</label>
                  <input type="email" className="form-control" value={appConfig.contactEmail} onChange={e => setAppConfig({ ...appConfig, contactEmail: e.target.value })} placeholder="support@himalayanbullion.com" />
                </div>
              </div>
              <div>
                <label className="form-label">Store address</label>
                <input className="form-control" value={appConfig.contactAddress} onChange={e => setAppConfig({ ...appConfig, contactAddress: e.target.value })} />
              </div>
              <div>
                <label className="form-label">Support hours note</label>
                <input className="form-control" value={appConfig.supportHours} onChange={e => setAppConfig({ ...appConfig, supportHours: e.target.value })} />
                <p className="text-xs text-gray-500 mt-1">Free-form text shown in the iOS Support screen.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Min order amount (NPR, 0 = none)</label>
                  <input type="number" min="0" className="form-control font-mono" value={appConfig.minOrderAmount} onChange={e => setAppConfig({ ...appConfig, minOrderAmount: Number(e.target.value) || 0 })} />
                </div>
                <div>
                  <label className="form-label">Max order amount (NPR, 0 = none)</label>
                  <input type="number" min="0" className="form-control font-mono" value={appConfig.maxOrderAmount} onChange={e => setAppConfig({ ...appConfig, maxOrderAmount: Number(e.target.value) || 0 })} />
                </div>
              </div>
            </div>
          </div>

          {/* Payment Methods */}
          <div className="box lg:col-span-2">
            <div className="box-header flex items-center justify-between">
              <div>
                <h6 className="box-title mb-0">Payment methods</h6>
                <p className="text-xs text-[#8c9097] mt-0.5">
                  Controls which payment buttons appear on the customer&apos;s payment screen. Saves with <strong>Save app config</strong>.
                </p>
              </div>
              {!appConfig.paymentMethods.connectIps.enabled && !appConfig.paymentMethods.payAtStore.enabled && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full bg-danger/10 text-danger">
                  <i className="bx bx-error-circle"></i>No methods enabled
                </span>
              )}
            </div>
            <div className="box-body space-y-5">
              {/* ConnectIPS row */}
              <div className="border border-[#e9edf4] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-500/10">
                      <i className="bx bx-credit-card text-xl text-blue-500"></i>
                    </div>
                    <div>
                      <p className="text-sm font-semibold">ConnectIPS</p>
                      <p className="text-xs text-[#8c9097]">Online bank transfer via NCHL gateway</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setAppConfig({
                      ...appConfig,
                      paymentMethods: {
                        ...appConfig.paymentMethods,
                        connectIps: { ...appConfig.paymentMethods.connectIps, enabled: !appConfig.paymentMethods.connectIps.enabled },
                      },
                    })}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                      appConfig.paymentMethods.connectIps.enabled ? 'bg-success' : 'bg-[#e9edf4]'
                    }`}
                    role="switch"
                    aria-checked={appConfig.paymentMethods.connectIps.enabled}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                      appConfig.paymentMethods.connectIps.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
                <div>
                  <label className="form-label text-xs">Button label shown to customer</label>
                  <input
                    type="text"
                    className="form-control text-sm"
                    value={appConfig.paymentMethods.connectIps.label}
                    onChange={e => setAppConfig({
                      ...appConfig,
                      paymentMethods: {
                        ...appConfig.paymentMethods,
                        connectIps: { ...appConfig.paymentMethods.connectIps, label: e.target.value },
                      },
                    })}
                    placeholder="Pay via ConnectIPS"
                  />
                  <p className="text-[11px] text-[#8c9097] mt-1">
                    The app prefixes the amount: e.g. <em>&quot;Pay NPR 5200 via ConnectIPS&quot;</em> — your label is used as the base when no amount is set.
                  </p>
                </div>
              </div>

              {/* Pay at Store row */}
              <div className="border border-[#e9edf4] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-amber-500/10">
                      <i className="bx bx-buildings text-xl text-amber-500"></i>
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Pay at Store</p>
                      <p className="text-xs text-[#8c9097]">Customer visits an HBC location to pay in person</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setAppConfig({
                      ...appConfig,
                      paymentMethods: {
                        ...appConfig.paymentMethods,
                        payAtStore: { ...appConfig.paymentMethods.payAtStore, enabled: !appConfig.paymentMethods.payAtStore.enabled },
                      },
                    })}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                      appConfig.paymentMethods.payAtStore.enabled ? 'bg-success' : 'bg-[#e9edf4]'
                    }`}
                    role="switch"
                    aria-checked={appConfig.paymentMethods.payAtStore.enabled}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                      appConfig.paymentMethods.payAtStore.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
                <div>
                  <label className="form-label text-xs">Button label shown to customer</label>
                  <input
                    type="text"
                    className="form-control text-sm"
                    value={appConfig.paymentMethods.payAtStore.label}
                    onChange={e => setAppConfig({
                      ...appConfig,
                      paymentMethods: {
                        ...appConfig.paymentMethods,
                        payAtStore: { ...appConfig.paymentMethods.payAtStore, label: e.target.value },
                      },
                    })}
                    placeholder="Pay at Store"
                  />
                  <p className="text-[11px] text-[#8c9097] mt-1">
                    The app prefixes the amount: e.g. <em>&quot;Pay NPR 5200 at Store&quot;</em> — your label is used as the base when no amount is set.
                  </p>
                </div>
              </div>

              {/* Credits + NCHL row */}
              <div className="border border-[#e9edf4] rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-purple-500/10">
                      <i className="bx bx-wallet text-xl text-purple-500"></i>
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Credits + ConnectIPS (NCHL)</p>
                      <p className="text-xs text-[#8c9097]">Shown only when customer has partial credits — pays remainder via NCHL</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setAppConfig({
                      ...appConfig,
                      paymentMethods: {
                        ...appConfig.paymentMethods,
                        creditsNchl: { ...appConfig.paymentMethods.creditsNchl, enabled: !appConfig.paymentMethods.creditsNchl.enabled },
                      },
                    })}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ${
                      appConfig.paymentMethods.creditsNchl.enabled ? 'bg-success' : 'bg-[#e9edf4]'
                    }`}
                    role="switch"
                    aria-checked={appConfig.paymentMethods.creditsNchl.enabled}
                  >
                    <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
                      appConfig.paymentMethods.creditsNchl.enabled ? 'translate-x-5' : 'translate-x-0'
                    }`} />
                  </button>
                </div>
                <div>
                  <label className="form-label text-xs">Button label shown to customer</label>
                  <input
                    type="text"
                    className="form-control text-sm"
                    value={appConfig.paymentMethods.creditsNchl.label}
                    onChange={e => setAppConfig({
                      ...appConfig,
                      paymentMethods: {
                        ...appConfig.paymentMethods,
                        creditsNchl: { ...appConfig.paymentMethods.creditsNchl, label: e.target.value },
                      },
                    })}
                    placeholder="Credits + ConnectIPS"
                  />
                  <p className="text-[11px] text-[#8c9097] mt-1">
                    The app appends the shortfall amount: e.g. <em>&quot;Credits + ConnectIPS (NPR 3200)&quot;</em>. Only shown when customer has credits but not enough to pay in full.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2 p-3 bg-[#f8fafc] border border-[#e9edf4] rounded-lg text-[11px] text-[#8c9097]">
                <i className="bx bx-info-circle mt-0.5 shrink-0"></i>
                <span>Changes take effect within 30 minutes as the app refreshes its config cache on every payment screen open. Click <strong>Save app config</strong> in the section above to persist.</span>
              </div>
            </div>
          </div>

          {/* Maintenance banner */}
          <div className="box lg:col-span-2">
            <div className="box-header"><h6 className="box-title mb-0">Maintenance banner</h6></div>
            <div className="box-body space-y-3">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={appConfig.maintenanceActive} onChange={e => setAppConfig({ ...appConfig, maintenanceActive: e.target.checked })} />
                <span className="font-semibold">Show maintenance banner in the mobile app</span>
              </label>
              <textarea
                rows={3}
                className="form-control"
                value={appConfig.maintenanceMessage}
                onChange={e => setAppConfig({ ...appConfig, maintenanceMessage: e.target.value })}
                placeholder="e.g. Scheduled maintenance Sun 23 May, 2 AM – 4 AM. Some features may be unavailable."
              />
              <p className="text-xs text-gray-500">Banner is hidden when toggle is off, even if message is non-empty.</p>
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-800">
                <i className="ri-alert-line me-1"></i>
                Toggle and message save together when you click <strong>Save app config</strong> above.
              </div>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
}
