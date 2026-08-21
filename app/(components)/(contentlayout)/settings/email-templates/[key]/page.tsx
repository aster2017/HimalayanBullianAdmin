'use client';

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Seo from '@/shared/layout-components/seo/seo';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { useAppSelector } from '@/shared/redux/hooks';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL;

type Placeholder = { token: string; description: string };

type TemplateDetail = {
  templateKey: string;
  displayName: string;
  description: string;
  placeholders: Placeholder[];
  current: {
    subject: string;
    headline: string | null;
    bodyText: string;
    buttonText: string | null;
    buttonUrl: string | null;
  } | null;
};

type VersionRow = {
  id: string;
  subject: string;
  createdAt: string;
  changeNote: string | null;
};

type FormState = {
  subject: string;
  headline: string;
  bodyText: string;
  buttonText: string;
  buttonUrl: string;
  changeNote: string;
};

const EMPTY_FORM: FormState = { subject: '', headline: '', bodyText: '', buttonText: '', buttonUrl: '', changeNote: '' };

export default function EmailTemplateEditPage() {
  useProtectedRoute();
  const user = useAppSelector((state) => state.auth.user);
  const isSuperAdmin = user?.roles?.includes('SuperAdmin') ?? false;
  const params = useParams();
  const key = params.key as string;

  const [detail, setDetail] = useState<TemplateDetail | null>(null);
  const [versions, setVersions] = useState<VersionRow[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<{ subject: string; html: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [detailRes, historyRes] = await Promise.all([
        fetch(`${API}/settings/email-templates/${key}`, { headers: getAuthHeaders() }),
        fetch(`${API}/settings/email-templates/${key}/history`, { headers: getAuthHeaders() }),
      ]);
      const detailData = await detailRes.json();
      const historyData = await historyRes.json();
      if (detailData.success) {
        setDetail(detailData.data);
        const c = detailData.data.current;
        setForm(c ? {
          subject: c.subject, headline: c.headline ?? '', bodyText: c.bodyText,
          buttonText: c.buttonText ?? '', buttonUrl: c.buttonUrl ?? '', changeNote: '',
        } : EMPTY_FORM);
      } else {
        toast.error(detailData.message || 'Failed to load template');
      }
      if (historyData.success) setVersions(historyData.data);
    } catch {
      toast.error('Failed to load template');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isSuperAdmin || !key) return;
    load();
  }, [isSuperAdmin, key]);

  const runPreview = async () => {
    setPreviewing(true);
    try {
      const r = await fetch(`${API}/settings/email-templates/${key}/preview`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: form.subject, headline: form.headline || null, bodyText: form.bodyText,
          buttonText: form.buttonText || null, buttonUrl: form.buttonUrl || null,
        }),
      });
      const d = await r.json();
      if (d.success) setPreview({ subject: d.subject, html: d.html });
      else toast.error(d.message || 'Preview failed');
    } catch {
      toast.error('Preview failed');
    } finally {
      setPreviewing(false);
    }
  };

  useEffect(() => {
    if (!loading) runPreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const save = async () => {
    if (!form.subject.trim() || !form.bodyText.trim()) {
      toast.error('Subject and body are required');
      return;
    }
    setSaving(true);
    try {
      const r = await fetch(`${API}/settings/email-templates/${key}/versions`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: form.subject, headline: form.headline || null, bodyText: form.bodyText,
          buttonText: form.buttonText || null, buttonUrl: form.buttonUrl || null,
          changeNote: form.changeNote || null,
        }),
      });
      const d = await r.json();
      if (d.success) {
        toast.success('New version saved');
        await load();
      } else {
        toast.error(d.message || 'Save failed');
      }
    } catch {
      toast.error('Save failed');
    } finally {
      setSaving(false);
    }
  };

  const sendTest = async () => {
    setTesting(true);
    try {
      const r = await fetch(`${API}/settings/email-templates/${key}/test-send`, {
        method: 'POST', headers: getAuthHeaders(),
      });
      const d = await r.json();
      if (d.success) toast.success(d.message);
      else toast.error(d.message || 'Test send failed');
    } catch {
      toast.error('Test send failed');
    } finally {
      setTesting(false);
    }
  };

  const restore = async (versionId: string) => {
    if (!confirm('Restore this version? This creates a new current version copying its content.')) return;
    try {
      const r = await fetch(`${API}/settings/email-templates/${key}/versions/${versionId}/restore`, {
        method: 'POST', headers: getAuthHeaders(),
      });
      const d = await r.json();
      if (d.success) {
        toast.success('Version restored');
        await load();
      } else {
        toast.error(d.message || 'Restore failed');
      }
    } catch {
      toast.error('Restore failed');
    }
  };

  if (!isSuperAdmin) {
    return (
      <Fragment>
        <Seo title="Edit Email Template — Settings" />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <i className="bx bx-lock text-5xl text-[#8c9097] mb-3"></i>
            <p className="font-semibold text-defaulttextcolor">SuperAdmin access required</p>
            <Link href="/settings/email-templates" className="ti-btn ti-btn-primary-full !text-white mt-4 inline-block">
              Back to Email Templates
            </Link>
          </div>
        </div>
      </Fragment>
    );
  }

  return (
    <Fragment>
      <Seo title={detail ? `${detail.displayName} — Email Templates` : 'Email Templates'} />

      <div className="md:flex block items-center justify-between my-[1.5rem] page-header-breadcrumb">
        <div>
          <p className="font-semibold text-[1.125rem] text-defaulttextcolor dark:text-defaulttextcolor/70 !mb-0">
            {detail?.displayName ?? key}
          </p>
          <ol className="flex items-center whitespace-nowrap min-w-0 mt-1">
            <li className="text-[0.813rem]"><Link href="/settings" className="text-[#8c9097] hover:text-primary">Settings</Link></li>
            <li className="text-[0.813rem] text-[#8c9097] mx-1">/</li>
            <li className="text-[0.813rem]"><Link href="/settings/email-templates" className="text-[#8c9097] hover:text-primary">Email Templates</Link></li>
            <li className="text-[0.813rem] text-[#8c9097] mx-1">/</li>
            <li className="text-[0.813rem] text-defaulttextcolor font-medium">{detail?.displayName ?? key}</li>
          </ol>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary inline-block"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="box">
            <div className="box-header"><h6 className="box-title mb-0">Content</h6></div>
            <div className="box-body space-y-4">
              <div>
                <label className="form-label">Subject</label>
                <input className="form-control" value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })} />
              </div>
              <div>
                <label className="form-label">Headline (optional)</label>
                <input className="form-control" value={form.headline} onChange={e => setForm({ ...form, headline: e.target.value })} />
              </div>
              <div>
                <label className="form-label">Body</label>
                <textarea className="form-control" rows={8} value={form.bodyText} onChange={e => setForm({ ...form, bodyText: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Button text (optional)</label>
                  <input className="form-control" value={form.buttonText} onChange={e => setForm({ ...form, buttonText: e.target.value })} />
                </div>
                <div>
                  <label className="form-label">Button URL (optional)</label>
                  <input className="form-control" value={form.buttonUrl} onChange={e => setForm({ ...form, buttonUrl: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="form-label">Change note</label>
                <input className="form-control" placeholder="Why are you changing this?" value={form.changeNote} onChange={e => setForm({ ...form, changeNote: e.target.value })} />
              </div>

              <div className="flex items-center gap-2 pt-2 border-t">
                <button onClick={save} disabled={saving} className="ti-btn ti-btn-primary-full !text-white disabled:opacity-50">
                  {saving ? <><i className="ri-loader-4-line animate-spin me-1"></i>Saving…</> : 'Save New Version'}
                </button>
                <button onClick={runPreview} disabled={previewing} className="ti-btn ti-btn-outline-secondary disabled:opacity-50">
                  {previewing ? <><i className="ri-loader-4-line animate-spin me-1"></i>Refreshing…</> : 'Refresh Preview'}
                </button>
                <button onClick={sendTest} disabled={testing} className="ti-btn ti-btn-outline-secondary disabled:opacity-50">
                  {testing ? <><i className="ri-loader-4-line animate-spin me-1"></i>Sending…</> : 'Send Test to Myself'}
                </button>
              </div>

              {detail && detail.placeholders.length > 0 && (
                <div className="pt-3 border-t">
                  <p className="text-[0.75rem] font-medium text-[#8c9097] mb-2">Available placeholders</p>
                  <div className="flex flex-wrap gap-1.5">
                    {detail.placeholders.map(p => (
                      <span key={p.token} title={p.description} className="text-[0.7rem] font-mono px-1.5 py-0.5 rounded border border-defaultborder dark:border-defaultborder/10 text-[#8c9097]">
                        {`{{${p.token}}}`}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="box">
              <div className="box-header"><h6 className="box-title mb-0">Live Preview</h6></div>
              <div className="box-body">
                {preview ? (
                  <>
                    <p className="text-[0.82rem] font-medium mb-3">Subject: {preview.subject}</p>
                    <iframe srcDoc={preview.html} className="w-full border rounded" style={{ minHeight: 420 }} />
                  </>
                ) : (
                  <p className="text-[0.813rem] text-[#8c9097]">No preview yet.</p>
                )}
              </div>
            </div>

            <div className="box">
              <div className="box-header"><h6 className="box-title mb-0">Version History</h6></div>
              <div className="box-body !p-0">
                <div className="table-responsive">
                  <table className="table whitespace-nowrap min-w-full">
                    <thead>
                      <tr>
                        <th className="!ps-4">Saved</th>
                        <th>Subject</th>
                        <th>Change Note</th>
                        <th className="!pe-4"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {versions.map((v, i) => (
                        <tr key={v.id}>
                          <td className="!ps-4 text-[0.78rem]">
                            {new Date(v.createdAt).toLocaleString()}
                            {i === 0 && <span className="ms-1.5 text-[0.65rem] font-medium px-1.5 py-0.5 rounded bg-success/10 text-success">Current</span>}
                          </td>
                          <td className="text-[0.78rem]">{v.subject}</td>
                          <td className="text-[0.78rem] text-[#8c9097]">{v.changeNote ?? '—'}</td>
                          <td className="!pe-4">
                            {i !== 0 && (
                              <button onClick={() => restore(v.id)} className="ti-btn ti-btn-outline-secondary !py-1 !text-[0.78rem]">
                                Restore
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
}
