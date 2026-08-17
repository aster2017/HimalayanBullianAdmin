'use client';

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import Seo from '@/shared/layout-components/seo/seo';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { useAppSelector } from '@/shared/redux/hooks';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL;

type TemplateListRow = {
  templateKey: string;
  displayName: string;
  description: string;
  isConfigured: boolean;
  lastEditedAt: string | null;
};

export default function EmailTemplatesListPage() {
  useProtectedRoute();
  const user = useAppSelector((state) => state.auth.user);
  const isSuperAdmin = user?.roles?.includes('SuperAdmin') ?? false;

  const [templates, setTemplates] = useState<TemplateListRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSuperAdmin) return;
    fetch(`${API}/settings/email-templates`, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(d => { if (d.success) setTemplates(d.data); else toast.error(d.message || 'Failed to load templates'); })
      .catch(() => toast.error('Failed to load templates'))
      .finally(() => setLoading(false));
  }, [isSuperAdmin]);

  if (!isSuperAdmin) {
    return (
      <Fragment>
        <Seo title="Email Templates — Settings" />
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <i className="bx bx-lock text-5xl text-[#8c9097] mb-3"></i>
            <p className="font-semibold text-defaulttextcolor">SuperAdmin access required</p>
            <p className="text-[0.813rem] text-[#8c9097] mt-1">Only SuperAdmin can manage email templates.</p>
            <Link href="/settings" className="ti-btn ti-btn-primary-full !text-white mt-4 inline-block">
              Back to Settings
            </Link>
          </div>
        </div>
      </Fragment>
    );
  }

  return (
    <Fragment>
      <Seo title="Email Templates — Settings" />

      <div className="md:flex block items-center justify-between my-[1.5rem] page-header-breadcrumb">
        <div>
          <p className="font-semibold text-[1.125rem] text-defaulttextcolor dark:text-defaulttextcolor/70 !mb-0">
            Email Templates
          </p>
          <ol className="flex items-center whitespace-nowrap min-w-0 mt-1">
            <li className="text-[0.813rem]">
              <Link href="/settings" className="text-[#8c9097] hover:text-primary">Settings</Link>
            </li>
            <li className="text-[0.813rem] text-[#8c9097] mx-1">/</li>
            <li className="text-[0.813rem] text-defaulttextcolor font-medium">Email Templates</li>
          </ol>
        </div>
      </div>

      <div className="box">
        <div className="box-header flex items-center justify-between">
          <h6 className="box-title mb-0">Transactional email wording</h6>
          {!loading && (
            <span className="text-[0.813rem] text-[#8c9097]">
              {templates.filter(t => t.isConfigured).length} of {templates.length} customized
            </span>
          )}
        </div>
        <div className="box-body !p-0">
          {loading ? (
            <div className="flex items-center gap-2 text-[#8c9097] py-8 justify-center">
              <i className="ri-loader-4-line animate-spin text-lg"></i>
              <span className="text-[0.813rem]">Loading…</span>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table whitespace-nowrap min-w-full">
                <thead>
                  <tr>
                    <th className="!ps-4">Name</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Last Edited</th>
                    <th className="!pe-4"></th>
                  </tr>
                </thead>
                <tbody>
                  {templates.map(t => (
                    <tr key={t.templateKey}>
                      <td className="!ps-4">
                        <span className="font-medium text-[0.82rem]">{t.displayName}</span>
                        <span className="block text-[0.7rem] text-[#8c9097] font-mono">{t.templateKey}</span>
                      </td>
                      <td className="text-[0.78rem] text-[#8c9097] max-w-md">{t.description}</td>
                      <td>
                        {t.isConfigured
                          ? <span className="text-[0.7rem] font-medium px-1.5 py-0.5 rounded bg-success/10 text-success">Customized</span>
                          : <span className="text-[0.7rem] font-medium px-1.5 py-0.5 rounded bg-light dark:bg-white/10 text-[#8c9097]">Using default</span>}
                      </td>
                      <td className="text-[0.78rem] text-[#8c9097]">
                        {t.lastEditedAt ? new Date(t.lastEditedAt).toLocaleString() : '—'}
                      </td>
                      <td className="!pe-4">
                        <Link href={`/settings/email-templates/${t.templateKey}`} className="ti-btn ti-btn-outline-primary !py-1 !text-[0.78rem]">
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Fragment>
  );
}
