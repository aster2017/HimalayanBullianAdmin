'use client';

import { useEffect, useState } from 'react';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import {
  PaymentTogglesService, PROVIDERS, PURPOSES,
  providerKey, contextKey, PaymentProvider, PaymentPurpose,
} from '@/shared/services/paymentTogglesService';
import toast from 'react-hot-toast';

export default function PaymentMethodsPage() {
  useProtectedRoute();

  const [matrix, setMatrix] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setMatrix(await PaymentTogglesService.getMatrix());
      } catch (e: any) {
        setError(e?.response?.status === 403
          ? 'You do not have permission to manage payment methods.'
          : (e?.message || 'Failed to load payment toggles'));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleProvider = async (p: PaymentProvider, enabled: boolean) => {
    const key = providerKey(p);
    setSaving(key);
    setMatrix((m) => ({ ...m, [key]: enabled }));   // optimistic
    try {
      await PaymentTogglesService.setProvider(p, enabled);
      toast.success(`${p} ${enabled ? 'enabled' : 'disabled'}`);
    } catch (e: any) {
      setMatrix((m) => ({ ...m, [key]: !enabled }));  // rollback
      toast.error(e?.message || 'Update failed');
    } finally {
      setSaving(null);
    }
  };

  const toggleContext = async (p: PaymentProvider, c: PaymentPurpose, enabled: boolean) => {
    const key = contextKey(p, c);
    setSaving(key);
    setMatrix((m) => ({ ...m, [key]: enabled }));
    try {
      await PaymentTogglesService.setContext(p, c, enabled);
      toast.success(`${p} · ${c} ${enabled ? 'enabled' : 'disabled'}`);
    } catch (e: any) {
      setMatrix((m) => ({ ...m, [key]: !enabled }));
      toast.error(e?.message || 'Update failed');
    } finally {
      setSaving(null);
    }
  };

  const Switch = ({ on, disabled, busy, onChange }: { on: boolean; disabled?: boolean; busy?: boolean; onChange: (v: boolean) => void }) => (
    <button
      type="button"
      disabled={disabled || busy}
      onClick={() => onChange(!on)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${on ? 'bg-success' : 'bg-gray-300 dark:bg-bgdark'} ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
      aria-pressed={on}
    >
      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${on ? 'translate-x-6' : 'translate-x-1'}`} />
    </button>
  );

  return (
    <div className="main-content">
      <div className="block sm:flex items-center justify-between my-[1.5rem]">
        <div>
          <h1 className="text-[1.125rem] font-semibold">Payment Methods</h1>
          <p className="text-[0.75rem] text-textmuted dark:text-textmuted/50">
            Enable or disable each gateway, and turn individual contexts on/off without a redeploy.
          </p>
        </div>
      </div>

      {loading && <div className="box"><div className="box-body">Loading…</div></div>}
      {error && <div className="box"><div className="box-body text-danger">{error}</div></div>}

      {!loading && !error && (
        <div className="grid grid-cols-12 gap-x-6">
          {PROVIDERS.map((prov) => {
            const masterKey = providerKey(prov.key);
            const masterOn = !!matrix[masterKey];
            return (
              <div key={prov.key} className="xl:col-span-6 col-span-12">
                <div className="box">
                  <div className="box-header flex items-center justify-between">
                    <div className="box-title">{prov.label}</div>
                    <div className="flex items-center gap-2">
                      <span className={`badge ${masterOn ? 'bg-success/10 text-success' : 'bg-gray-200 text-gray-500'}`}>
                        {masterOn ? 'Enabled' : 'Disabled'}
                      </span>
                      <Switch on={masterOn} busy={saving === masterKey} onChange={(v) => toggleProvider(prov.key, v)} />
                    </div>
                  </div>
                  <div className="box-body">
                    <p className="text-[0.75rem] text-textmuted dark:text-textmuted/50 mb-3">
                      Per-context switches (only effective while the provider above is enabled):
                    </p>
                    <ul className="divide-y divide-defaultborder dark:divide-defaultborder/10">
                      {PURPOSES.map((purpose) => {
                        const ck = contextKey(prov.key, purpose.key);
                        const ctxOn = !!matrix[ck];
                        return (
                          <li key={purpose.key} className="flex items-center justify-between py-3">
                            <span className={`text-[0.85rem] ${!masterOn ? 'opacity-50' : ''}`}>{purpose.label}</span>
                            <Switch on={ctxOn} disabled={!masterOn} busy={saving === ck} onChange={(v) => toggleContext(prov.key, purpose.key, v)} />
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
