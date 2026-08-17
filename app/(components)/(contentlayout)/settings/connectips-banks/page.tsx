'use client';

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';
import { useDialog } from '@/shared/context/DialogContext';

const API = process.env.NEXT_PUBLIC_API_URL;

type Bank = {
  id: string;
  name: string;
  logoUrl: string;
};

const emptyBank = (): Bank => ({ id: '', name: '', logoUrl: '' });

export default function ConnectIpsBanksPage() {
  useProtectedRoute();
  const { confirm } = useDialog();
  const [banks, setBanks] = useState<Bank[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/settings/connectips/banks`);
      const d = await r.json();
      setBanks(Array.isArray(d) ? d.map((b: Partial<Bank>) => ({ id: b.id || '', name: b.name || '', logoUrl: b.logoUrl || '' })) : []);
    } catch {
      toast.error('Failed to load bank list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (banks.some(b => !b.id.trim() || !b.name.trim())) {
      toast.error('Every bank needs an ID and a name');
      return;
    }
    const ids = banks.map(b => b.id.trim());
    if (new Set(ids).size !== ids.length) {
      toast.error('Bank IDs must be unique');
      return;
    }
    setSaving(true);
    try {
      const r = await fetch(`${API}/settings/connectips/banks`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(banks.map(b => ({ id: b.id.trim(), name: b.name.trim(), logoUrl: b.logoUrl.trim() || null }))),
      });
      if (!r.ok) toast.error('Failed to save');
      else toast.success('Bank list saved');
    } finally {
      setSaving(false);
    }
  };

  const updateBank = (idx: number, patch: Partial<Bank>) => {
    const next = [...banks];
    next[idx] = { ...next[idx], ...patch };
    setBanks(next);
  };

  const removeBank = async (idx: number) => {
    if (!await confirm('This bank will disappear from the ConnectIPS picker in the app.', { title: 'Remove Bank', variant: 'danger', confirmLabel: 'Remove' })) return;
    setBanks(banks.filter((_, i) => i !== idx));
  };

  return (
    <Fragment>
      <div className="md:flex items-center justify-between my-[1.5rem]">
        <div>
          <p className="font-semibold text-[1.125rem] !mb-0">ConnectIPS Bank List</p>
          <p className="text-[0.813rem] text-[#8c9097]">
            Banks shown in the mobile ConnectIPS bank picker.
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
        <div className="box">
          <div className="box-header flex items-center justify-between">
            <h6 className="box-title mb-0">Banks ({banks.length})</h6>
            <button
              onClick={() => setBanks([...banks, emptyBank()])}
              className="ti-btn ti-btn-light ti-btn-sm !opacity-100"
            >
              <i className="ri-add-line me-1"></i>Add bank
            </button>
          </div>
          <div className="box-body space-y-4">
            {banks.length === 0 && <p className="text-sm text-gray-500 text-center py-6">No banks configured — the app&apos;s picker will show empty until at least one is added.</p>}
            {banks.map((b, idx) => (
              <div key={idx} className="border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="form-label">Bank ID</label>
                    <input
                      className="form-control font-mono"
                      placeholder="e.g. NMB"
                      value={b.id}
                      onChange={e => updateBank(idx, { id: e.target.value })}
                    />
                    <p className="text-[0.7rem] text-gray-500 mt-1">Sent to NCHL as the bank code — must match their list exactly.</p>
                  </div>
                  <div>
                    <label className="form-label">Display name</label>
                    <input
                      className="form-control"
                      placeholder="e.g. NMB Bank"
                      value={b.name}
                      onChange={e => updateBank(idx, { name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label">Logo URL <span className="text-gray-400 font-normal">(optional)</span></label>
                    <input
                      className="form-control"
                      placeholder="https://…"
                      value={b.logoUrl}
                      onChange={e => updateBank(idx, { logoUrl: e.target.value })}
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-3">
                  <button onClick={() => removeBank(idx)} className="text-danger text-sm hover:underline">
                    <i className="ri-delete-bin-line me-1"></i>Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </Fragment>
  );
}
