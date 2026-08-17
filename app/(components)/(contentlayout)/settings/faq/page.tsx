'use client';

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL;

type FaqEntry = {
  id: string;
  question: string;
  answer: string;
  sortOrder: number;
  isActive: boolean;
};

export default function FaqPage() {
  useProtectedRoute();

  const [items, setItems] = useState<FaqEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newQ, setNewQ] = useState('');
  const [newA, setNewA] = useState('');
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/content/admin/faq`, { headers: getAuthHeaders() });
      if (r.ok) {
        const d = await r.json();
        setItems((d?.data || []).sort((a: FaqEntry, b: FaqEntry) => a.sortOrder - b.sortOrder));
      }
    } catch {
      toast.error('Failed to load FAQ entries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const update = (id: string, patch: Partial<FaqEntry>) => {
    setItems(items.map(f => f.id === id ? { ...f, ...patch } : f));
  };

  const save = async (entry: FaqEntry) => {
    setSavingId(entry.id);
    try {
      const r = await fetch(`${API}/content/admin/faq/${entry.id}`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: entry.question, answer: entry.answer, isActive: entry.isActive }),
      });
      if (!r.ok) {
        toast.error('Failed to save');
      } else {
        toast.success('Saved');
      }
    } finally {
      setSavingId(null);
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this FAQ entry? This cannot be undone.')) return;
    const r = await fetch(`${API}/content/admin/faq/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
    if (r.ok) {
      setItems(items.filter(f => f.id !== id));
      toast.success('Deleted');
    } else {
      toast.error('Failed to delete');
    }
  };

  const move = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const reordered = [...items];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setItems(reordered);

    const r = await fetch(`${API}/content/admin/faq/reorder`, {
      method: 'PUT',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderedIds: reordered.map(f => f.id) }),
    });
    if (!r.ok) {
      toast.error('Failed to reorder');
      load();
    }
  };

  const addEntry = async () => {
    if (!newQ.trim() || !newA.trim()) {
      toast.error('Question and answer are required');
      return;
    }
    setAdding(true);
    try {
      const r = await fetch(`${API}/content/admin/faq`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: newQ.trim(), answer: newA.trim() }),
      });
      if (!r.ok) {
        toast.error('Failed to add');
      } else {
        toast.success('Added');
        setAddOpen(false);
        setNewQ(''); setNewA('');
        load();
      }
    } finally {
      setAdding(false);
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
            <span className="text-[0.813rem] font-medium">FAQ</span>
          </div>
          <p className="font-semibold text-[1.125rem] !mb-0">Frequently Asked Questions</p>
          <p className="text-[0.813rem] text-[#8c9097]">
            Shown in the Help &amp; Support screen on both apps — edits go live immediately, no store release.
          </p>
        </div>
        <button
          onClick={() => { setNewQ(''); setNewA(''); setAddOpen(true); }}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-[0.813rem] font-medium rounded-md text-white shrink-0 mt-2 md:mt-0"
          style={{ background: 'linear-gradient(135deg,#C8A86B 0%,#a8863d 100%)' }}
        >
          <i className="bx bx-plus text-sm"></i>Add Question
        </button>
      </div>

      <div className="box">
        <div className="box-body">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary inline-block"></div>
            </div>
          ) : items.length === 0 ? (
            <p className="text-sm text-[#8c9097] text-center py-10">No FAQ entries yet.</p>
          ) : (
            <div className="space-y-3">
              {items.map((f, i) => (
                <div key={f.id} className="border border-[#e9edf4] rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex flex-col gap-1 shrink-0 pt-1">
                      <button
                        onClick={() => move(i, -1)}
                        disabled={i === 0}
                        className="text-[#8c9097] hover:text-primary disabled:opacity-30 disabled:hover:text-[#8c9097]"
                        title="Move up"
                      >
                        <i className="bx bx-chevron-up"></i>
                      </button>
                      <button
                        onClick={() => move(i, 1)}
                        disabled={i === items.length - 1}
                        className="text-[#8c9097] hover:text-primary disabled:opacity-30 disabled:hover:text-[#8c9097]"
                        title="Move down"
                      >
                        <i className="bx bx-chevron-down"></i>
                      </button>
                    </div>
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        value={f.question}
                        onChange={e => update(f.id, { question: e.target.value })}
                        className="form-control font-medium"
                        placeholder="Question"
                      />
                      <textarea
                        rows={2}
                        value={f.answer}
                        onChange={e => update(f.id, { answer: e.target.value })}
                        className="form-control text-sm"
                        placeholder="Answer"
                      />
                      <label className="flex items-center gap-2 text-[0.75rem] text-[#8c9097]">
                        <input
                          type="checkbox"
                          checked={f.isActive}
                          onChange={e => update(f.id, { isActive: e.target.checked })}
                        />
                        Visible in app
                      </label>
                    </div>
                    <div className="flex flex-col gap-2 shrink-0">
                      <button
                        onClick={() => save(f)}
                        disabled={savingId === f.id}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-[0.75rem] font-medium rounded-md text-white disabled:opacity-50"
                        style={{ background: 'linear-gradient(135deg,#C8A86B 0%,#a8863d 100%)' }}
                      >
                        {savingId === f.id ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        onClick={() => remove(f.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-[0.75rem] font-medium rounded-md border border-danger/30 text-danger hover:bg-danger/10 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {addOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-bodybg rounded-2xl shadow-2xl w-full max-w-lg flex flex-col">
            <div className="p-5 border-b border-[#e9edf4] flex items-center justify-between">
              <h3 className="text-[1rem] font-bold">Add FAQ entry</h3>
              <button onClick={() => setAddOpen(false)} className="text-[#8c9097] hover:text-defaulttextcolor p-1 rounded transition-colors">
                <i className="bx bx-x text-xl"></i>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="form-label">Question <span className="text-danger">*</span></label>
                <input type="text" value={newQ} onChange={e => setNewQ(e.target.value)} className="form-control" />
              </div>
              <div>
                <label className="form-label">Answer <span className="text-danger">*</span></label>
                <textarea rows={4} value={newA} onChange={e => setNewA(e.target.value)} className="form-control" />
              </div>
            </div>
            <div className="p-5 border-t border-[#e9edf4] flex gap-3 justify-end">
              <button
                onClick={() => setAddOpen(false)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-[0.813rem] font-medium rounded-md border border-[#e9edf4] text-defaulttextcolor hover:bg-light transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={addEntry}
                disabled={adding}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-[0.813rem] font-medium rounded-md text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#C8A86B 0%,#a8863d 100%)' }}
              >
                {adding ? 'Adding…' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
}
