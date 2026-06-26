'use client';

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';
import { useDialog } from '@/shared/context/DialogContext';

const API = process.env.NEXT_PUBLIC_API_URL;

type BankAccount = {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  branch: string;
  isActive: boolean;
  isPrimary: boolean;
};

type Wallet = {
  name: string;
  id: string;
  isActive: boolean;
};

type Config = {
  accounts: BankAccount[];
  wallets: Wallet[];
  instructions: string;
};

const emptyAccount = (): BankAccount => ({
  id: crypto.randomUUID(),
  bankName: '',
  accountNumber: '',
  accountName: 'Himalayan Bullion Company Ltd',
  branch: '',
  isActive: true,
  isPrimary: false,
});

const emptyWallet = (): Wallet => ({ name: '', id: '', isActive: true });

export default function BankDetailsPage() {
  useProtectedRoute();
  const { confirm } = useDialog();
  const [config, setConfig] = useState<Config>({ accounts: [], wallets: [], instructions: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/settings/bank-details`);
      const d = await r.json();
      setConfig({
        accounts: Array.isArray(d?.accounts) ? d.accounts : [],
        wallets: Array.isArray(d?.wallets) ? d.wallets : [],
        instructions: d?.instructions || '',
      });
    } catch { toast.error('Failed to load bank details'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    // Enforce a single primary account
    const primaryCount = config.accounts.filter(a => a.isPrimary).length;
    if (config.accounts.length > 0 && primaryCount !== 1) {
      toast.error('Exactly one account must be marked Primary');
      return;
    }
    setSaving(true);
    try {
      const r = await fetch(`${API}/settings/bank-details`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      const d = await r.json();
      if (!r.ok || d?.success === false) toast.error(d?.message || 'Failed to save');
      else toast.success('Bank details saved');
    } finally { setSaving(false); }
  };

  const updateAccount = (idx: number, patch: Partial<BankAccount>) => {
    const accounts = [...config.accounts];
    accounts[idx] = { ...accounts[idx], ...patch };
    // If marking primary, unmark others
    if (patch.isPrimary) {
      accounts.forEach((a, i) => { if (i !== idx) a.isPrimary = false; });
    }
    setConfig({ ...config, accounts });
  };

  const removeAccount = async (idx: number) => {
    if (!await confirm('This bank account will be removed from the payment options.', { title: 'Remove Bank Account', variant: 'danger', confirmLabel: 'Remove' })) return;
    setConfig({ ...config, accounts: config.accounts.filter((_, i) => i !== idx) });
  };

  const updateWallet = (idx: number, patch: Partial<Wallet>) => {
    const wallets = [...config.wallets];
    wallets[idx] = { ...wallets[idx], ...patch };
    setConfig({ ...config, wallets });
  };

  const removeWallet = (idx: number) => {
    setConfig({ ...config, wallets: config.wallets.filter((_, i) => i !== idx) });
  };

  return (
    <Fragment>
      <div className="md:flex items-center justify-between my-[1.5rem]">
        <div>
          <p className="font-semibold text-[1.125rem] !mb-0">Bank Details</p>
          <p className="text-[0.813rem] text-[#8c9097]">
            Accounts and digital wallets shown to customers for offline transfer.
            <Link href="/settings" className="text-primary ms-2">← Back to settings</Link>
          </p>
        </div>
        <button
          onClick={save}
          disabled={saving || loading}
          className="ti-btn ti-btn-primary-full !text-white !opacity-100 mt-2 md:mt-0 disabled:!opacity-50"
        >
          {saving ? <><i className="ri-loader-4-line animate-spin me-1"></i>Saving…</> : 'Save changes'}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary inline-block"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {/* Bank accounts */}
          <div className="box">
            <div className="box-header flex items-center justify-between">
              <h6 className="box-title mb-0">Bank accounts ({config.accounts.length})</h6>
              <button
                onClick={() => setConfig({ ...config, accounts: [...config.accounts, emptyAccount()] })}
                className="ti-btn ti-btn-light ti-btn-sm !opacity-100"
              >
                <i className="ri-add-line me-1"></i>Add account
              </button>
            </div>
            <div className="box-body space-y-4">
              {config.accounts.length === 0 && <p className="text-sm text-gray-500 text-center py-6">No accounts. Add one above.</p>}
              {config.accounts.map((a, idx) => (
                <div key={a.id} className={`border rounded-lg p-4 ${a.isPrimary ? 'border-primary bg-primary/5' : 'border-gray-200'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      {a.isPrimary && <span className="badge bg-primary text-white text-[10px] px-2 py-0.5 rounded">PRIMARY</span>}
                      {!a.isActive && <span className="badge bg-gray-400 text-white text-[10px] px-2 py-0.5 rounded">INACTIVE</span>}
                    </div>
                    <button onClick={() => removeAccount(idx)} className="text-danger text-sm hover:underline">
                      <i className="ri-delete-bin-line me-1"></i>Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="form-label">Bank name</label>
                      <input className="form-control" value={a.bankName} onChange={e => updateAccount(idx, { bankName: e.target.value })} />
                    </div>
                    <div>
                      <label className="form-label">Account number</label>
                      <input className="form-control font-mono" value={a.accountNumber} onChange={e => updateAccount(idx, { accountNumber: e.target.value })} />
                    </div>
                    <div>
                      <label className="form-label">Account holder name</label>
                      <input className="form-control" value={a.accountName} onChange={e => updateAccount(idx, { accountName: e.target.value })} />
                    </div>
                    <div>
                      <label className="form-label">Branch</label>
                      <input className="form-control" value={a.branch} onChange={e => updateAccount(idx, { branch: e.target.value })} />
                    </div>
                  </div>
                  <div className="flex gap-4 mt-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={a.isPrimary} onChange={e => updateAccount(idx, { isPrimary: e.target.checked })} />
                      Primary account
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="checkbox" checked={a.isActive} onChange={e => updateAccount(idx, { isActive: e.target.checked })} />
                      Active
                    </label>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Wallets */}
          <div className="box">
            <div className="box-header flex items-center justify-between">
              <h6 className="box-title mb-0">Digital wallets ({config.wallets.length})</h6>
              <button
                onClick={() => setConfig({ ...config, wallets: [...config.wallets, emptyWallet()] })}
                className="ti-btn ti-btn-light ti-btn-sm !opacity-100"
              >
                <i className="ri-add-line me-1"></i>Add wallet
              </button>
            </div>
            <div className="box-body space-y-3">
              {config.wallets.length === 0 && <p className="text-sm text-gray-500 text-center py-4">No wallets configured.</p>}
              {config.wallets.map((w, idx) => (
                <div key={idx} className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto_auto] gap-2 items-end">
                  <div>
                    <label className="form-label text-xs">Wallet name</label>
                    <input className="form-control" placeholder="eSewa / Khalti / Fonepay" value={w.name} onChange={e => updateWallet(idx, { name: e.target.value })} />
                  </div>
                  <div>
                    <label className="form-label text-xs">Wallet ID / number</label>
                    <input className="form-control font-mono" value={w.id} onChange={e => updateWallet(idx, { id: e.target.value })} />
                  </div>
                  <label className="flex items-center gap-2 text-sm pb-2">
                    <input type="checkbox" checked={w.isActive} onChange={e => updateWallet(idx, { isActive: e.target.checked })} />
                    Active
                  </label>
                  <button onClick={() => removeWallet(idx)} className="text-danger pb-2 hover:underline">
                    <i className="ri-delete-bin-line"></i>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div className="box">
            <div className="box-header"><h6 className="box-title mb-0">Customer instructions</h6></div>
            <div className="box-body">
              <textarea
                rows={3}
                className="form-control"
                value={config.instructions}
                onChange={e => setConfig({ ...config, instructions: e.target.value })}
                placeholder="e.g. Please include your order number as payment reference"
              />
              <p className="text-xs text-gray-500 mt-2">Shown to customers under the bank list on the payment screen.</p>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
}
