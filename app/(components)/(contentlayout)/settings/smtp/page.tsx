'use client';

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL;

type SmtpConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
  fromAddress: string;
  fromName: string;
  enableSsl: boolean;
};

const DEFAULT_CONFIG: SmtpConfig = {
  host: '',
  port: 587,
  username: '',
  password: '',
  fromAddress: '',
  fromName: 'Himalayan Bullion',
  enableSsl: true,
};

export default function SmtpSettingsPage() {
  useProtectedRoute();
  const [config, setConfig] = useState<SmtpConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testAddress, setTestAddress] = useState('');
  const [testing, setTesting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/settings/smtp`, { headers: getAuthHeaders() });
      const d = await r.json();
      setConfig({ ...DEFAULT_CONFIG, ...d });
    } catch { toast.error('Failed to load SMTP config'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      const r = await fetch(`${API}/settings/smtp`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const d = await r.json();
      if (!r.ok || d?.success === false) toast.error(d?.message || 'Failed to save');
      else toast.success('SMTP settings saved');
    } finally { setSaving(false); }
  };

  const sendTest = async () => {
    if (!testAddress.trim()) { toast.error('Enter a recipient address'); return; }
    setTesting(true);
    try {
      const r = await fetch(`${API}/settings/smtp/test`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: testAddress.trim() }),
      });
      const d = await r.json();
      if (d?.success) toast.success(d.message || 'Test email sent');
      else toast.error(d?.message || 'Test failed');
    } finally { setTesting(false); }
  };

  return (
    <Fragment>
      <div className="md:flex items-center justify-between my-[1.5rem]">
        <div>
          <p className="font-semibold text-[1.125rem] !mb-0">SMTP / Email Settings</p>
          <p className="text-[0.813rem] text-[#8c9097]">
            Outgoing mail used for OTP, password reset, order confirmations.
            <Link href="/settings" className="text-primary ms-2">← Back to settings</Link>
          </p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary inline-block"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 box">
            <div className="box-header"><h6 className="box-title mb-0">SMTP server</h6></div>
            <div className="box-body space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-3">
                <div>
                  <label className="form-label">Host</label>
                  <input className="form-control font-mono" value={config.host} onChange={e => setConfig({ ...config, host: e.target.value })} placeholder="smtp.gmail.com" />
                </div>
                <div>
                  <label className="form-label">Port</label>
                  <input type="number" className="form-control font-mono" value={config.port} onChange={e => setConfig({ ...config, port: Number(e.target.value) || 0 })} />
                </div>
              </div>
              <div>
                <label className="form-label">Username</label>
                <input className="form-control font-mono" value={config.username} onChange={e => setConfig({ ...config, username: e.target.value })} placeholder="noreply@himalayanbullion.com" />
              </div>
              <div>
                <label className="form-label">Password / App Password</label>
                <div className="flex gap-2">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="form-control font-mono"
                    value={config.password}
                    onChange={e => setConfig({ ...config, password: e.target.value })}
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowPassword(s => !s)} className="ti-btn ti-btn-light !opacity-100" title={showPassword ? 'Hide' : 'Show'}>
                    <i className={`ri-${showPassword ? 'eye-off' : 'eye'}-line`}></i>
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">Gmail requires an App Password (not your account password). Stored in DB.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="form-label">From address</label>
                  <input type="email" className="form-control" value={config.fromAddress} onChange={e => setConfig({ ...config, fromAddress: e.target.value })} placeholder="noreply@himalayanbullion.com" />
                </div>
                <div>
                  <label className="form-label">From display name</label>
                  <input className="form-control" value={config.fromName} onChange={e => setConfig({ ...config, fromName: e.target.value })} />
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={config.enableSsl} onChange={e => setConfig({ ...config, enableSsl: e.target.checked })} />
                Use SSL / TLS (recommended)
              </label>

              <div className="pt-2 border-t flex justify-end">
                <button onClick={save} disabled={saving} className="ti-btn ti-btn-primary-full !text-white !opacity-100 disabled:!opacity-50">
                  {saving ? <><i className="ri-loader-4-line animate-spin me-1"></i>Saving…</> : 'Save SMTP settings'}
                </button>
              </div>
            </div>
          </div>

          {/* Test panel */}
          <div className="box">
            <div className="box-header"><h6 className="box-title mb-0">Send test email</h6></div>
            <div className="box-body space-y-3">
              <p className="text-xs text-gray-500">Uses the currently-saved settings — save first if you've changed anything.</p>
              <div>
                <label className="form-label">Recipient</label>
                <input type="email" className="form-control" value={testAddress} onChange={e => setTestAddress(e.target.value)} placeholder="you@example.com" />
              </div>
              <button
                onClick={sendTest}
                disabled={testing || !testAddress.trim()}
                className="ti-btn ti-btn-light !opacity-100 disabled:!opacity-50 w-full"
              >
                {testing ? <><i className="ri-loader-4-line animate-spin me-1"></i>Sending…</> : <><i className="ri-mail-send-line me-1"></i>Send test</>}
              </button>
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-800">
                <i className="ri-information-line me-1"></i>
                A failed send returns the SMTP error verbatim — handy for diagnosing auth / port / TLS issues.
              </div>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
}
