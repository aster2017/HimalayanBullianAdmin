'use client';

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL;

// Business terminology labels (spec 0005) — admin-editable strings shown verbatim in the
// iOS/Android apps (e.g. the word for "Making Charge"). Seeded server-side only; this page
// is list + edit-value, no create/delete UI.
type LabelEntry = {
  id: string;
  key: string;
  value: string;
  updatedAt: string;
  updatedBy?: string | null;
};

export default function LabelsPage() {
  useProtectedRoute();

  const [items, setItems] = useState<LabelEntry[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/content/admin/labels`, { headers: getAuthHeaders() });
      if (r.ok) {
        const d = await r.json();
        const data: LabelEntry[] = d?.data || [];
        setItems(data);
        setDrafts(Object.fromEntries(data.map(l => [l.key, l.value])));
      } else {
        toast.error('Failed to load labels');
      }
    } catch {
      toast.error('Failed to load labels');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const save = async (label: LabelEntry) => {
    const value = (drafts[label.key] ?? '').trim();
    if (!value) {
      toast.error('Value is required');
      return;
    }
    if (value.length > 500) {
      toast.error('Value must be 500 characters or fewer');
      return;
    }
    setSavingKey(label.key);
    try {
      const r = await fetch(`${API}/content/admin/labels/${encodeURIComponent(label.key)}`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ value }),
      });
      const d = await r.json().catch(() => null);
      if (!r.ok || d?.success === false) {
        toast.error(d?.message || 'Failed to save');
      } else {
        toast.success('Saved');
        const updated: LabelEntry | undefined = d?.data;
        setItems(items.map(l => l.key === label.key ? { ...l, value, updatedAt: updated?.updatedAt ?? new Date().toISOString(), updatedBy: updated?.updatedBy ?? l.updatedBy } : l));
      }
    } catch {
      toast.error('Failed to save');
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <Fragment>
      <div className="md:flex items-start justify-between my-[1.5rem] gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/settings" className="text-[#8c9097] hover:text-primary text-[0.813rem] transition-colors">
              Settings
            </Link>
            <i className="bx bx-chevron-right text-[#8c9097] text-sm"></i>
            <span className="text-[0.813rem] font-medium">Business Labels</span>
          </div>
          <p className="font-semibold text-[1.125rem] !mb-0">Business Labels</p>
          <p className="text-[0.813rem] text-[#8c9097]">
            Wording shown verbatim in the iOS &amp; Android apps (e.g. what to call the &quot;Making Charge&quot; line item) — edits go live immediately, no store release.
          </p>
        </div>
      </div>

      <div className="box">
        <div className="box-body">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary inline-block"></div>
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-[#8c9097] text-center py-10">No labels defined yet.</p>
          ) : (
            <div className="space-y-3">
              {items.map(l => {
                const dirty = (drafts[l.key] ?? '') !== l.value;
                return (
                  <div key={l.id} className="border border-[#e9edf4] rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <code className="text-[0.75rem] font-mono px-2 py-0.5 rounded bg-[#f8fafc] border border-[#e9edf4] text-[#8c9097]">{l.key}</code>
                          <span className="text-[0.7rem] text-[#8c9097]">
                            Updated {new Date(l.updatedAt).toLocaleString('en-NP')}
                            {l.updatedBy ? ` by ${l.updatedBy}` : ''}
                          </span>
                        </div>
                        <input
                          type="text"
                          value={drafts[l.key] ?? ''}
                          onChange={e => setDrafts({ ...drafts, [l.key]: e.target.value })}
                          className="form-control font-medium"
                          placeholder="Value"
                          maxLength={500}
                        />
                      </div>
                      <div className="shrink-0 pt-1">
                        <button
                          onClick={() => save(l)}
                          disabled={savingKey === l.key || !dirty}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-[0.75rem] font-medium rounded-md text-white disabled:opacity-50"
                          style={{ background: 'linear-gradient(135deg,#C8A86B 0%,#a8863d 100%)' }}
                        >
                          {savingKey === l.key ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Fragment>
  );
}
