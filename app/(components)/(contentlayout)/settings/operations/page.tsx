'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';
import { useDialog } from '@/shared/context/DialogContext';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://hbc-api.semis.app/api';

type PaymentMethodConfig = {
  enabled: boolean;
  label: string;
  iconUrl?: string;
  useCustomIcon: boolean;
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
  contactPhone: '9820999999',
  contactEmail: 'info@himalayanbullion.com',
  contactAddress: 'Gyaneshwor, Kathmandu, Nepal',
  supportHours: 'Sun–Fri, 10:00–18:00 NPT',
  maintenanceActive: false,
  maintenanceMessage: '',
  minOrderAmount: 0,
  maxOrderAmount: 0,
  paymentMethods: {
    connectIps:  { enabled: true,  label: 'Pay via ConnectIPS', useCustomIcon: false },
    payAtStore:  { enabled: false, label: 'Pay at Store',       useCustomIcon: false },
    creditsNchl: { enabled: true,  label: 'Credits + ConnectIPS', useCustomIcon: false },
  },
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://hbcapi.semis.app';

export default function OperationsSettingsPage() {
  useProtectedRoute();
  const { confirm } = useDialog();
  const [creditsEnabled, setCreditsEnabled] = useState(true);
  const [cipsEnv, setCipsEnv] = useState<'UAT' | 'Production'>('UAT');
  const [appConfig, setAppConfig] = useState<AppConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [savingCredits, setSavingCredits] = useState(false);
  const [savingEnv, setSavingEnv] = useState(false);
  const [savingApp, setSavingApp] = useState(false);
  const [savingMethod, setSavingMethod] = useState<string | null>(null);
  const [uploadingMethod, setUploadingMethod] = useState<string | null>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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
      setAppConfig({
        ...DEFAULT_CONFIG,
        ...cfg,
        paymentMethods: {
          ...DEFAULT_CONFIG.paymentMethods,
          ...(cfg.paymentMethods || {}),
          connectIps:  { ...DEFAULT_CONFIG.paymentMethods.connectIps,  ...(cfg.paymentMethods?.connectIps  || {}) },
          payAtStore:  { ...DEFAULT_CONFIG.paymentMethods.payAtStore,  ...(cfg.paymentMethods?.payAtStore  || {}) },
          creditsNchl: { ...DEFAULT_CONFIG.paymentMethods.creditsNchl, ...(cfg.paymentMethods?.creditsNchl || {}) },
        },
      });
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
    if (next === 'Production' && !await confirm('Real money will move. This switches ConnectIPS to live mode and cannot be undone without support.', { title: 'Switch to Production?', variant: 'danger', confirmLabel: 'Switch to Production' })) return;
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

  const saveAppConfig = async (cfg: AppConfig = appConfig) => {
    setSavingApp(true);
    try {
      const r = await fetch(`${API}/settings/app-config`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(cfg),
      });
      const d = await r.json();
      if (r.ok && d?.success !== false) toast.success('App config saved');
      else toast.error(d?.message || 'Failed to save');
    } catch { toast.error('Failed to save'); }
    finally { setSavingApp(false); }
  };

  const togglePaymentMethod = async (key: keyof AppConfig['paymentMethods'], enabled: boolean) => {
    const labels: Record<string, string> = { connectIps: 'ConnectIPS', payAtStore: 'Pay at Store', creditsNchl: 'Credits + NCHL' };
    const newConfig: AppConfig = {
      ...appConfig,
      paymentMethods: {
        ...appConfig.paymentMethods,
        [key]: { ...appConfig.paymentMethods[key], enabled },
      },
    };
    setAppConfig(newConfig);
    setSavingMethod(key);
    try {
      const r = await fetch(`${API}/settings/app-config`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
      const d = await r.json();
      if (r.ok && d?.success !== false) toast.success(`${labels[key]} ${enabled ? 'enabled' : 'disabled'}`);
      else { toast.error(d?.message || 'Failed to save'); setAppConfig(appConfig); }
    } catch { toast.error('Failed to save'); setAppConfig(appConfig); }
    finally { setSavingMethod(null); }
  };

  const uploadPaymentMethodIcon = async (key: keyof AppConfig['paymentMethods'], file: File) => {
    setUploadingMethod(key);
    try {
      const form = new FormData();
      form.append('methodKey', key);
      form.append('image', file);
      const r = await fetch(`${API}/settings/payment-method-icon`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: form,
      });
      const d = await r.json();
      if (r.ok && d?.success) {
        const newConfig: AppConfig = {
          ...appConfig,
          paymentMethods: {
            ...appConfig.paymentMethods,
            [key]: { ...appConfig.paymentMethods[key], iconUrl: d.iconUrl, useCustomIcon: true },
          },
        };
        setAppConfig(newConfig);
        await saveAppConfig(newConfig);
        toast.success('Icon uploaded');
      } else {
        toast.error(d?.message || 'Upload failed');
      }
    } catch { toast.error('Upload failed'); }
    finally { setUploadingMethod(null); }
  };

  const toggleCustomIcon = async (key: keyof AppConfig['paymentMethods'], useCustom: boolean) => {
    const newConfig: AppConfig = {
      ...appConfig,
      paymentMethods: {
        ...appConfig.paymentMethods,
        [key]: { ...appConfig.paymentMethods[key], useCustomIcon: useCustom },
      },
    };
    setAppConfig(newConfig);
    await saveAppConfig(newConfig);
    toast.success(useCustom ? 'Using custom icon' : 'Using default icon');
  };

  const removePaymentMethodIcon = async (key: keyof AppConfig['paymentMethods']) => {
    setUploadingMethod(key);
    try {
      await fetch(`${API}/settings/payment-method-icon/${key}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });
      const newConfig: AppConfig = {
        ...appConfig,
        paymentMethods: {
          ...appConfig.paymentMethods,
          [key]: { ...appConfig.paymentMethods[key], iconUrl: undefined, useCustomIcon: false },
        },
      };
      setAppConfig(newConfig);
      await saveAppConfig(newConfig);
      toast.success('Icon removed');
    } catch { toast.error('Failed to remove icon'); }
    finally { setUploadingMethod(null); }
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
                  className={`shrink-0 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-colors disabled:opacity-50 ${
                    creditsEnabled ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'
                  }`}
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
            <div className="box-header">
              <h6 className="box-title mb-0">Contact info &amp; order limits</h6>
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
              <div className="pt-2 flex justify-end">
                <button onClick={() => saveAppConfig()} disabled={savingApp} className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {savingApp ? <><i className="ri-loader-4-line animate-spin me-1"></i>Saving…</> : 'Save app config'}
                </button>
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
              <PaymentMethodRow
                methodKey="connectIps"
                title="ConnectIPS"
                subtitle="Online bank transfer via NCHL gateway"
                defaultIcon={<i className="bx bx-credit-card text-xl text-blue-500" />}
                defaultIconBg="bg-blue-500/10"
                config={appConfig.paymentMethods.connectIps}
                saving={savingMethod === 'connectIps'}
                uploading={uploadingMethod === 'connectIps'}
                fileInputRef={el => { fileInputRefs.current['connectIps'] = el; }}
                apiBase={API_BASE}
                onToggleEnabled={() => togglePaymentMethod('connectIps', !appConfig.paymentMethods.connectIps.enabled)}
                onLabelChange={label => setAppConfig({ ...appConfig, paymentMethods: { ...appConfig.paymentMethods, connectIps: { ...appConfig.paymentMethods.connectIps, label } } })}
                onUpload={file => uploadPaymentMethodIcon('connectIps', file)}
                onToggleCustomIcon={v => toggleCustomIcon('connectIps', v)}
                onRemoveIcon={() => removePaymentMethodIcon('connectIps')}
                labelHint={<>The app prefixes the amount: e.g. <em>&quot;Pay NPR 5200 via ConnectIPS&quot;</em></>}
              />

              {/* Pay at Store row */}
              <PaymentMethodRow
                methodKey="payAtStore"
                title="Pay at Store"
                subtitle="Customer visits an HBC location to pay in person"
                defaultIcon={<i className="bx bx-buildings text-xl text-amber-500" />}
                defaultIconBg="bg-amber-500/10"
                config={appConfig.paymentMethods.payAtStore}
                saving={savingMethod === 'payAtStore'}
                uploading={uploadingMethod === 'payAtStore'}
                fileInputRef={el => { fileInputRefs.current['payAtStore'] = el; }}
                apiBase={API_BASE}
                onToggleEnabled={() => togglePaymentMethod('payAtStore', !appConfig.paymentMethods.payAtStore.enabled)}
                onLabelChange={label => setAppConfig({ ...appConfig, paymentMethods: { ...appConfig.paymentMethods, payAtStore: { ...appConfig.paymentMethods.payAtStore, label } } })}
                onUpload={file => uploadPaymentMethodIcon('payAtStore', file)}
                onToggleCustomIcon={v => toggleCustomIcon('payAtStore', v)}
                onRemoveIcon={() => removePaymentMethodIcon('payAtStore')}
                labelHint={<>The app prefixes the amount: e.g. <em>&quot;Pay NPR 5200 at Store&quot;</em></>}
              />

              {/* Credits + NCHL row */}
              <PaymentMethodRow
                methodKey="creditsNchl"
                title="Credits + ConnectIPS (NCHL)"
                subtitle="Shown only when customer has partial credits — pays remainder via NCHL"
                defaultIcon={<i className="bx bx-wallet text-xl text-purple-500" />}
                defaultIconBg="bg-purple-500/10"
                config={appConfig.paymentMethods.creditsNchl}
                saving={savingMethod === 'creditsNchl'}
                uploading={uploadingMethod === 'creditsNchl'}
                fileInputRef={el => { fileInputRefs.current['creditsNchl'] = el; }}
                apiBase={API_BASE}
                onToggleEnabled={() => togglePaymentMethod('creditsNchl', !appConfig.paymentMethods.creditsNchl.enabled)}
                onLabelChange={label => setAppConfig({ ...appConfig, paymentMethods: { ...appConfig.paymentMethods, creditsNchl: { ...appConfig.paymentMethods.creditsNchl, label } } })}
                onUpload={file => uploadPaymentMethodIcon('creditsNchl', file)}
                onToggleCustomIcon={v => toggleCustomIcon('creditsNchl', v)}
                onRemoveIcon={() => removePaymentMethodIcon('creditsNchl')}
                labelHint={<>The app appends the shortfall: e.g. <em>&quot;Credits + ConnectIPS (NPR 3200)&quot;</em>. Only shown when customer has partial credits.</>}
              />

              <div className="flex items-start gap-2 p-3 bg-[#f8fafc] border border-[#e9edf4] rounded-lg text-[11px] text-[#8c9097]">
                <i className="bx bx-info-circle mt-0.5 shrink-0"></i>
                <span>Toggle changes are saved instantly. Label changes require clicking <strong>Save app config</strong> in the Contact info section above. App cache refreshes within 30 minutes.</span>
              </div>
            </div>
          </div>

          {/* Maintenance banner */}
          <div className="box lg:col-span-2">
            <div className="box-header"><h6 className="box-title mb-0">Maintenance banner</h6></div>
            <div className="box-body space-y-3">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
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
              <div className="flex justify-end pt-1">
                <button onClick={() => saveAppConfig()} disabled={savingApp} className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 transition-colors">
                  {savingApp ? <><i className="ri-loader-4-line animate-spin me-1"></i>Saving…</> : 'Save app config'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
}

// ── PaymentMethodRow ──────────────────────────────────────────────────────────

type PaymentMethodRowProps = {
  methodKey: string;
  title: string;
  subtitle: string;
  defaultIcon: React.ReactNode;
  defaultIconBg: string;
  config: PaymentMethodConfig;
  saving: boolean;
  uploading: boolean;
  fileInputRef: (el: HTMLInputElement | null) => void;
  apiBase: string;
  onToggleEnabled: () => void;
  onLabelChange: (label: string) => void;
  onUpload: (file: File) => void;
  onToggleCustomIcon: (useCustom: boolean) => void;
  onRemoveIcon: () => void;
  labelHint: React.ReactNode;
};

function PaymentMethodRow({
  title, subtitle, defaultIcon, defaultIconBg,
  config, saving, uploading, fileInputRef, apiBase,
  onToggleEnabled, onLabelChange, onUpload, onToggleCustomIcon, onRemoveIcon, labelHint,
}: PaymentMethodRowProps) {
  const hasIcon = !!config.iconUrl;
  const previewUrl = hasIcon ? `${apiBase}${config.iconUrl}` : null;
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="border border-[#e9edf4] rounded-xl p-4 space-y-4">
      {/* Header row */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${defaultIconBg} shrink-0`}>
            {config.useCustomIcon && previewUrl
              ? <img src={previewUrl} alt={title} className="w-6 h-6 object-contain rounded" />
              : defaultIcon}
          </div>
          <div>
            <p className="text-sm font-semibold">{title}</p>
            <p className="text-xs text-[#8c9097]">{subtitle}</p>
          </div>
        </div>
        <button
          onClick={onToggleEnabled}
          disabled={saving}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 disabled:opacity-60 ${
            config.enabled ? 'bg-success' : 'bg-[#e9edf4]'
          }`}
          role="switch" aria-checked={config.enabled}
        >
          <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ${
            config.enabled ? 'translate-x-5' : 'translate-x-0'
          }`} />
        </button>
      </div>

      {/* Label */}
      <div>
        <label className="form-label text-xs">Button label shown to customer</label>
        <input type="text" className="form-control text-sm" value={config.label} onChange={e => onLabelChange(e.target.value)} />
        <p className="text-[11px] text-[#8c9097] mt-1">{labelHint}</p>
      </div>

      {/* Icon section */}
      <div className="border-t border-[#e9edf4] pt-3 space-y-3">
        <p className="text-xs font-semibold text-[#555]">Button icon</p>
        <div className="flex items-start gap-4">
          {/* Preview box */}
          <div className="shrink-0 text-center">
            <p className="text-[10px] text-[#8c9097] mb-1">Preview</p>
            <div className={`w-14 h-14 rounded-xl flex items-center justify-center border border-[#e9edf4] ${defaultIconBg}`}>
              {config.useCustomIcon && previewUrl
                ? <img src={previewUrl} alt="icon" className="w-10 h-10 object-contain rounded" />
                : <span className="opacity-60">{defaultIcon}</span>}
            </div>
            <p className={`text-[10px] mt-1 ${config.useCustomIcon ? 'text-success' : 'text-[#8c9097]'}`}>
              {config.useCustomIcon ? 'Custom' : 'Default'}
            </p>
          </div>

          {/* Controls */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.svg"
                className="hidden"
                ref={el => { inputRef.current = el; if (fileInputRef) fileInputRef(el); }}
                onChange={e => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ''; }}
              />
              <button
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-[#e9edf4] bg-white hover:bg-[#f8fafc] disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                {uploading
                  ? <><i className="ri-loader-4-line animate-spin" /> Uploading…</>
                  : <><i className="bx bx-upload" /> {hasIcon ? 'Replace icon' : 'Upload icon'}</>}
              </button>
              {hasIcon && (
                <button
                  onClick={onRemoveIcon}
                  disabled={uploading}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-red-200 text-red-500 bg-white hover:bg-red-50 disabled:opacity-50 transition-colors flex items-center gap-1"
                >
                  <i className="bx bx-trash" /> Remove
                </button>
              )}
            </div>
            <p className="text-[11px] text-[#8c9097]">PNG, JPG, WebP or SVG · max 512 KB · 64×64 px recommended</p>

            {/* Custom / Default switcher — only shown once an icon is uploaded */}
            {hasIcon && (
              <div className="flex items-center gap-3 pt-1">
                <p className="text-xs text-[#555] shrink-0">Show in app:</p>
                <div className="flex rounded-lg border border-[#e9edf4] overflow-hidden text-xs font-medium">
                  <button
                    onClick={() => onToggleCustomIcon(true)}
                    disabled={uploading}
                    className={`px-3 py-1.5 transition-colors ${config.useCustomIcon ? 'bg-primary text-white' : 'bg-white text-[#555] hover:bg-[#f8fafc]'}`}
                  >
                    Custom icon
                  </button>
                  <button
                    onClick={() => onToggleCustomIcon(false)}
                    disabled={uploading}
                    className={`px-3 py-1.5 transition-colors border-l border-[#e9edf4] ${!config.useCustomIcon ? 'bg-primary text-white' : 'bg-white text-[#555] hover:bg-[#f8fafc]'}`}
                  >
                    Default icon
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
