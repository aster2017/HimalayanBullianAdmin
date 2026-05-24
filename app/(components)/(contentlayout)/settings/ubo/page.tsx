'use client';

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://hbc-api.semis.app/api';

type Version = {
  id: string;
  version: string;
  text: string;
  createdAt: string;
  createdBy?: string;
  changeNote?: string | null;
};

export default function UboDeclarationPage() {
  useProtectedRoute();
  const [items, setItems] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [composeOpen, setComposeOpen] = useState(false);
  const [viewing, setViewing] = useState<Version | null>(null);

  // Composer state
  const [newVersion, setNewVersion] = useState('');
  const [newText, setNewText] = useState('');
  const [newNote, setNewNote] = useState('');
  const [publishing, setPublishing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/auth/admin/ubo-declarations`, { headers: getAuthHeaders() });
      const d = await r.json();
      setItems(d?.data || []);
    } catch { toast.error('Failed to load UBO versions'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const current = items[0]; // newest by CreatedAt — server-sorted

  const publish = async () => {
    if (!newVersion.trim() || !newText.trim()) {
      toast.error('Version label and text are required');
      return;
    }
    setPublishing(true);
    try {
      const r = await fetch(`${API}/auth/admin/ubo-declarations`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          version: newVersion.trim(),
          text: newText,
          changeNote: newNote.trim() || null,
        }),
      });
      const d = await r.json();
      if (!r.ok || d?.success === false) {
        toast.error(d?.message || 'Failed to publish');
      } else {
        toast.success(`Published version ${newVersion.trim()}`);
        setComposeOpen(false);
        setNewVersion(''); setNewText(''); setNewNote('');
        load();
      }
    } finally { setPublishing(false); }
  };

  const startNewFromCurrent = () => {
    if (!current) return;
    setNewVersion('');
    setNewText(current.text); // copy as draft starting point
    setNewNote('');
    setComposeOpen(true);
  };

  return (
    <Fragment>
      <div className="md:flex items-center justify-between my-[1.5rem]">
        <div>
          <p className="font-semibold text-[1.125rem] !mb-0">UBO Declaration</p>
          <p className="text-[0.813rem] text-[#8c9097]">
            Versioned legal text the customer accepts at signup.
            <Link href="/settings" className="text-primary ms-2">← Back to settings</Link>
          </p>
        </div>
        <button
          onClick={() => { setNewVersion(''); setNewText(''); setNewNote(''); setComposeOpen(true); }}
          className="ti-btn ti-btn-primary-full !text-white !opacity-100 mt-2 md:mt-0"
        >
          <i className="ri-add-line me-1"></i>New Version
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current version preview */}
        <div className="lg:col-span-2 box">
          <div className="box-header flex items-center justify-between">
            <div>
              <h6 className="box-title mb-0">Current version</h6>
              {current && (
                <p className="text-xs text-gray-500 mt-1">
                  <span className="font-mono font-semibold">{current.version}</span>
                  {' · '}published {new Date(current.createdAt).toLocaleString('en-NP')}
                </p>
              )}
            </div>
            {current && (
              <button onClick={startNewFromCurrent} className="ti-btn ti-btn-light !opacity-100">
                <i className="ri-edit-line me-1"></i>Edit (creates new version)
              </button>
            )}
          </div>
          <div className="box-body">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary inline-block"></div>
              </div>
            ) : !current ? (
              <p className="text-sm text-gray-500 text-center py-6">No versions published yet.</p>
            ) : (
              <>
                <div className="bg-gray-50 border rounded p-4 text-sm whitespace-pre-wrap font-sans" style={{ maxHeight: '480px', overflow: 'auto' }}>
                  {current.text}
                </div>
                {current.changeNote && (
                  <p className="text-xs text-gray-500 mt-2">
                    <i className="ri-pencil-line me-1"></i>
                    <strong>Change note:</strong> {current.changeNote}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* History */}
        <div className="box">
          <div className="box-header"><h6 className="box-title mb-0">History ({items.length})</h6></div>
          <div className="box-body">
            {items.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-6">No history yet.</p>
            ) : (
              <div className="space-y-2">
                {items.map((v, i) => (
                  <button
                    key={v.id}
                    onClick={() => setViewing(v)}
                    className={`w-full text-left p-3 rounded border transition-colors ${
                      i === 0 ? 'border-primary bg-primary/5' : 'border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-semibold text-sm">{v.version}</span>
                      {i === 0 && <span className="badge bg-primary text-white text-[10px] px-2 py-0.5 rounded">CURRENT</span>}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{new Date(v.createdAt).toLocaleString('en-NP')}</p>
                    {v.changeNote && <p className="text-xs text-gray-600 mt-1 truncate" title={v.changeNote}>{v.changeNote}</p>}
                  </button>
                ))}
              </div>
            )}
            <p className="text-[11px] text-gray-400 mt-4">
              <i className="ri-information-line me-1"></i>
              Customers who accepted an older version see an &ldquo;Action needed&rdquo; pill on their Profile → KYC Documents screen until they re-confirm.
            </p>
          </div>
        </div>
      </div>

      {/* Compose modal */}
      {composeOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '90vh' }}>
            <div className="p-5 border-b flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Publish new UBO version</h3>
                <p className="text-xs text-gray-500">All previous customer acceptances are retained — customers will be prompted to re-confirm.</p>
              </div>
              <button onClick={() => setComposeOpen(false)} className="text-gray-400 hover:text-gray-700">
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-auto">
              <div>
                <label className="form-label">Version label *</label>
                <input
                  type="text"
                  value={newVersion}
                  onChange={e => setNewVersion(e.target.value)}
                  placeholder='e.g. "v2-2026-08"'
                  className="form-control font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">Suggested convention: <code>v{'{N}'}-{'{YYYY-MM}'}</code>. Must be unique.</p>
              </div>

              <div>
                <label className="form-label">Declaration text *</label>
                <textarea
                  rows={14}
                  value={newText}
                  onChange={e => setNewText(e.target.value)}
                  placeholder="Paste the full UBO declaration text…"
                  className="form-control font-mono text-xs"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Plain text — rendered with bullets/whitespace preserved (whitespace-pre-wrap).
                  Customers see this verbatim in signup + Profile → KYC Documents.
                </p>
              </div>

              <div>
                <label className="form-label">Change note (optional)</label>
                <input
                  type="text"
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="e.g. Updated to align with NRB directive 2026/Q3"
                  className="form-control"
                />
                <p className="text-xs text-gray-500 mt-1">Internal note — not shown to customers.</p>
              </div>

              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-800">
                <i className="ri-alert-line me-1"></i>
                Once published, this becomes the current version immediately. The mobile app and signup form will start showing this text on next request.
                Every customer who accepted a previous version is flagged as "needs re-confirm" on their profile until they tick the new one.
              </div>
            </div>

            <div className="p-5 border-t flex gap-3 justify-end">
              <button onClick={() => setComposeOpen(false)} className="btn btn-outline-secondary">Cancel</button>
              <button
                onClick={publish}
                disabled={!newVersion.trim() || !newText.trim() || publishing}
                className="ti-btn ti-btn-primary-full !text-white !opacity-100 disabled:!opacity-50"
              >
                {publishing ? <><i className="ri-loader-4-line animate-spin me-1"></i>Publishing…</> : 'Publish version'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History viewer modal */}
      {viewing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setViewing(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold font-mono">{viewing.version}</h3>
                <p className="text-xs text-gray-500">{new Date(viewing.createdAt).toLocaleString('en-NP')}</p>
              </div>
              <button onClick={() => setViewing(null)} className="text-gray-400 hover:text-gray-700">
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            <div className="p-5 overflow-auto">
              <div className="bg-gray-50 border rounded p-4 text-sm whitespace-pre-wrap">{viewing.text}</div>
              {viewing.changeNote && (
                <p className="text-xs text-gray-500 mt-3"><strong>Change note:</strong> {viewing.changeNote}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
}
