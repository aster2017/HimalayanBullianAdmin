'use client';

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL;

type Version = {
  id: string;
  version: string;
  text: string;
  createdAt: string;
  createdBy?: string;
  changeNote?: string | null;
};

export default function LegalContentPage() {
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
      const r = await fetch(`${API}/content/admin/terms/versions`, { headers: getAuthHeaders() });
      if (r.ok) {
        const d = await r.json();
        setItems(d?.data || []);
      }
    } catch {
      toast.error('Failed to load Terms & Conditions versions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const current = items[0];

  const publish = async () => {
    if (!newVersion.trim() || !newText.trim()) {
      toast.error('Version label and text are required');
      return;
    }
    setPublishing(true);
    try {
      const r = await fetch(`${API}/content/admin/terms/versions`, {
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
    } finally {
      setPublishing(false);
    }
  };

  const startNewFromCurrent = () => {
    if (!current) return;
    setNewVersion('');
    setNewText(current.text);
    setNewNote('');
    setComposeOpen(true);
  };

  return (
    <Fragment>
      {/* Header */}
      <div className="md:flex items-start justify-between my-[1.5rem] gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/settings" className="text-[#8c9097] hover:text-primary text-[0.813rem] transition-colors">
              Settings
            </Link>
            <i className="bx bx-chevron-right text-[#8c9097] text-sm"></i>
            <span className="text-[0.813rem] font-medium">Terms &amp; Conditions</span>
          </div>
          <p className="font-semibold text-[1.125rem] !mb-0">Terms &amp; Conditions</p>
          <p className="text-[0.813rem] text-[#8c9097]">
            Versioned legal text shown in the iOS and Android apps — previously hardcoded and only fixable with a store release.
          </p>
        </div>
        <button
          onClick={() => { setNewVersion(''); setNewText(''); setNewNote(''); setComposeOpen(true); }}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-[0.813rem] font-medium rounded-md text-white shrink-0 mt-2 md:mt-0"
          style={{ background: 'linear-gradient(135deg,#C8A86B 0%,#a8863d 100%)' }}
        >
          <i className="bx bx-plus text-sm"></i>New Version
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Current version preview */}
        <div className="lg:col-span-2 box">
          <div className="box-header flex items-center justify-between">
            <div>
              <h6 className="box-title mb-0">Current version</h6>
              {current && (
                <p className="text-xs text-[#8c9097] mt-1">
                  <span className="font-mono font-semibold" style={{ color: '#C8A86B' }}>{current.version}</span>
                  {' · '}published {new Date(current.createdAt).toLocaleString('en-NP')}
                </p>
              )}
            </div>
            {current && (
              <button
                onClick={startNewFromCurrent}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[0.813rem] font-medium rounded-md border border-[#e9edf4] text-defaulttextcolor hover:border-primary hover:text-primary transition-colors"
              >
                <i className="bx bx-edit text-sm"></i>Edit (creates new version)
              </button>
            )}
          </div>
          <div className="box-body">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary inline-block"></div>
              </div>
            ) : !current ? (
              <div className="text-center py-10">
                <i className="bx bx-file-blank text-5xl text-[#8c9097] mb-3 block"></i>
                <p className="text-sm text-[#8c9097]">No versions published yet.</p>
                <button
                  onClick={() => setComposeOpen(true)}
                  className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 text-[0.813rem] font-medium rounded-md text-white"
                  style={{ background: 'linear-gradient(135deg,#C8A86B 0%,#a8863d 100%)' }}
                >
                  <i className="bx bx-plus text-sm"></i>Publish first version
                </button>
              </div>
            ) : (
              <>
                <div
                  className="border border-[#e9edf4] rounded-lg p-4 text-sm whitespace-pre-wrap font-sans bg-[#f8fafc] dark:bg-black/20 leading-relaxed"
                  style={{ maxHeight: '520px', overflow: 'auto' }}
                >
                  {current.text}
                </div>
                {current.changeNote && (
                  <p className="text-xs text-[#8c9097] mt-3 flex items-center gap-1">
                    <i className="bx bx-note"></i>
                    <strong>Change note:</strong> {current.changeNote}
                  </p>
                )}
              </>
            )}
          </div>
        </div>

        {/* History sidebar */}
        <div className="box">
          <div className="box-header">
            <h6 className="box-title mb-0">Version history ({items.length})</h6>
          </div>
          <div className="box-body">
            {items.length === 0 ? (
              <p className="text-sm text-[#8c9097] text-center py-6">No history yet.</p>
            ) : (
              <div className="space-y-2">
                {items.map((v, i) => (
                  <button
                    key={v.id}
                    onClick={() => setViewing(v)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      i === 0
                        ? 'border-[#C8A86B]/40 bg-[#C8A86B]/5'
                        : 'border-[#e9edf4] hover:border-[#8c9097]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono font-semibold text-sm">{v.version}</span>
                      {i === 0 && (
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full text-white"
                          style={{ background: 'linear-gradient(135deg,#C8A86B 0%,#a8863d 100%)' }}
                        >
                          CURRENT
                        </span>
                      )}
                    </div>
                    <p className="text-[0.7rem] text-[#8c9097]">
                      {new Date(v.createdAt).toLocaleDateString('en-NP', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                    {v.changeNote && (
                      <p className="text-[0.7rem] text-defaulttextcolor mt-1 truncate" title={v.changeNote}>
                        {v.changeNote}
                      </p>
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="mt-4 p-3 rounded-lg bg-[#f8fafc] border border-[#e9edf4] text-[11px] text-[#8c9097] leading-relaxed">
              <i className="bx bx-info-circle mr-1"></i>
              Publishing a new version updates what both apps show immediately — no store release needed.
              Previous versions are retained for reference, never edited.
            </div>
          </div>
        </div>
      </div>

      {/* Compose modal */}
      {composeOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-bodybg rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col" style={{ maxHeight: '90vh' }}>
            <div className="p-5 border-b border-[#e9edf4] flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div
                    className="p-1.5 rounded-lg"
                    style={{ background: 'linear-gradient(135deg,#C8A86B 0%,#a8863d 100%)' }}
                  >
                    <i className="bx bx-file-blank text-white text-base"></i>
                  </div>
                  <h3 className="text-[1rem] font-bold">Publish new Terms version</h3>
                </div>
                <p className="text-[0.75rem] text-[#8c9097]">
                  Both apps fetch this live — no app-store release required.
                </p>
              </div>
              <button
                onClick={() => setComposeOpen(false)}
                className="text-[#8c9097] hover:text-defaulttextcolor p-1 rounded transition-colors shrink-0"
              >
                <i className="bx bx-x text-xl"></i>
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-auto">
              <div>
                <label className="form-label">Version label <span className="text-danger">*</span></label>
                <input
                  type="text"
                  value={newVersion}
                  onChange={e => setNewVersion(e.target.value)}
                  placeholder='e.g. "v2-2026-09"'
                  className="form-control font-mono"
                />
                <p className="text-[0.72rem] text-[#8c9097] mt-1">
                  Convention: <code className="font-mono">v{'{N}'}-{'{YYYY-MM}'}</code>. Must be unique.
                </p>
              </div>

              <div>
                <label className="form-label">Terms &amp; Conditions text <span className="text-danger">*</span></label>
                <textarea
                  rows={16}
                  value={newText}
                  onChange={e => setNewText(e.target.value)}
                  placeholder="Paste the full Terms & Conditions text…"
                  className="form-control font-mono text-xs"
                />
                <p className="text-[0.72rem] text-[#8c9097] mt-1">
                  Plain text — rendered with whitespace preserved. The contact section and cancellation-policy
                  callout are shown separately by the apps and don&apos;t need to be repeated here.
                </p>
              </div>

              <div>
                <label className="form-label">Change note <span className="text-[#8c9097] font-normal">(optional, internal only)</span></label>
                <input
                  type="text"
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  placeholder="e.g. Updated delivery timelines"
                  className="form-control"
                />
              </div>

              <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/30 rounded-lg text-[0.75rem] text-warning">
                <i className="bx bx-error-circle mt-0.5 shrink-0"></i>
                <span>Once published, this becomes the active version <strong>immediately</strong> for every customer.</span>
              </div>
            </div>

            <div className="p-5 border-t border-[#e9edf4] flex gap-3 justify-end">
              <button
                onClick={() => setComposeOpen(false)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-[0.813rem] font-medium rounded-md border border-[#e9edf4] text-defaulttextcolor hover:bg-light transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={publish}
                disabled={!newVersion.trim() || !newText.trim() || publishing}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-[0.813rem] font-medium rounded-md text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#C8A86B 0%,#a8863d 100%)' }}
              >
                {publishing
                  ? <><i className="bx bx-loader-alt bx-spin text-sm"></i>Publishing…</>
                  : <><i className="bx bx-upload text-sm"></i>Publish version</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* History viewer modal */}
      {viewing && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setViewing(null)}
        >
          <div
            className="bg-white dark:bg-bodybg rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col"
            style={{ maxHeight: '90vh' }}
            onClick={e => e.stopPropagation()}
          >
            <div className="p-5 border-b border-[#e9edf4] flex items-center justify-between">
              <div>
                <h3 className="text-[1rem] font-bold font-mono">{viewing.version}</h3>
                <p className="text-[0.72rem] text-[#8c9097]">
                  {new Date(viewing.createdAt).toLocaleString('en-NP')}
                </p>
              </div>
              <button
                onClick={() => setViewing(null)}
                className="text-[#8c9097] hover:text-defaulttextcolor p-1 rounded transition-colors"
              >
                <i className="bx bx-x text-xl"></i>
              </button>
            </div>
            <div className="p-5 overflow-auto">
              <div className="border border-[#e9edf4] rounded-lg p-4 text-sm whitespace-pre-wrap bg-[#f8fafc] leading-relaxed">
                {viewing.text}
              </div>
              {viewing.changeNote && (
                <p className="text-xs text-[#8c9097] mt-3 flex items-center gap-1">
                  <i className="bx bx-note"></i>
                  <strong>Change note:</strong> {viewing.changeNote}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
}
