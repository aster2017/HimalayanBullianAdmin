'use client';

import { Fragment, useEffect, useState } from 'react';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://hbc-api.semis.app/api';

type AuditRow = {
  id: string;
  userId?: string | null;
  userName?: string | null;
  entityType: string;
  entityId: string;
  action: 'Create' | 'Update' | 'Delete' | 'View' | string;
  oldValues?: string | null;
  newValues?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: string;
};

const ACTION_STYLE: Record<string, { bg: string; text: string }> = {
  Create: { bg: '#dcfce7', text: '#15803d' },
  Update: { bg: '#dbeafe', text: '#1d4ed8' },
  Delete: { bg: '#fee2e2', text: '#dc2626' },
  View:   { bg: '#f1f5f9', text: '#475569' },
};

const ENTITY_COLORS = [
  { bg: '#ede9fe', text: '#6d28d9' },
  { bg: '#fef3c7', text: '#92400e' },
  { bg: '#e0f2fe', text: '#0369a1' },
  { bg: '#fce7f3', text: '#9d174d' },
  { bg: '#d1fae5', text: '#065f46' },
  { bg: '#fff7ed', text: '#c2410c' },
];

const AVATAR_COLORS = ['#C8A86B','#2563eb','#7c3aed','#059669','#dc2626','#d97706','#0891b2','#4f46e5'];

function strHash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) & 0xffff;
  return h;
}
function entityColor(type: string) { return ENTITY_COLORS[strHash(type) % ENTITY_COLORS.length]; }
function avatarBg(name: string) { return AVATAR_COLORS[strHash(name) % AVATAR_COLORS.length]; }
function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

const SKELETON = Array.from({ length: 8 });

export default function AuditLogPage() {
  useProtectedRoute();
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [entityType, setEntityType] = useState('');
  const [action, setAction] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const hasFilter = !!(entityType || action || from || to);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (entityType) params.set('entityType', entityType);
      if (action) params.set('action', action);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const r = await fetch(`${API}/admin/audit?${params}`, { headers: getAuthHeaders() });
      const d = await r.json();
      setRows(d?.data || []);
      setTotalCount(d?.totalCount || 0);
      if (d?.entityTypes) setEntityTypes(d.entityTypes);
    } catch { toast.error('Failed to load audit log'); }
    finally { setLoading(false); }
  };

  useEffect(() => { setPage(1); }, [entityType, action, from, to, pageSize]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [page, pageSize, entityType, action, from, to]);

  const prettyJson = (s?: string | null) => {
    if (!s) return null;
    try { return JSON.stringify(JSON.parse(s), null, 2); } catch { return s; }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const pageStart = totalCount === 0 ? 0 : Math.min((page - 1) * pageSize + 1, totalCount);
  const pageEnd = Math.min(page * pageSize, totalCount);

  // Page buttons: up to 5 centered around current page
  const pageBtns: number[] = [];
  if (totalPages <= 5) {
    for (let i = 1; i <= totalPages; i++) pageBtns.push(i);
  } else if (page <= 3) {
    pageBtns.push(1, 2, 3, 4, 5);
  } else if (page >= totalPages - 2) {
    for (let i = totalPages - 4; i <= totalPages; i++) pageBtns.push(i);
  } else {
    for (let i = page - 2; i <= page + 2; i++) pageBtns.push(i);
  }

  return (
    <Fragment>
      {/* Page header */}
      <div className="my-[1.5rem] flex items-center gap-3">
        <div
          className="flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#C8A86B 0%,#a8863d 100%)' }}
        >
          <i className="ri-shield-check-line text-white text-lg" />
        </div>
        <div>
          <p className="font-semibold text-[1.125rem] !mb-0">Audit Log</p>
          <p className="text-[0.813rem] text-[#8c9097]">
            {loading ? 'Loading…' : `${totalCount.toLocaleString()} audit entr${totalCount === 1 ? 'y' : 'ies'} tracked`}
          </p>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
        {([
          { label: 'Total Entries',  value: totalCount,          icon: 'ri-file-list-3-line', color: '#2563eb', bg: '#dbeafe' },
          { label: 'Entity Types',   value: entityTypes.length,  icon: 'ri-database-2-line',  color: '#7c3aed', bg: '#ede9fe' },
          { label: 'This Page',      value: loading ? '—' : String(rows.length), icon: 'ri-table-line', color: '#059669', bg: '#d1fae5' },
          { label: 'Page',           value: loading ? '—' : `${page} / ${totalPages}`, icon: 'ri-pages-line', color: '#C8A86B', bg: '#fdf8ee' },
        ] as const).map(t => (
          <div
            key={t.label}
            className="box p-4 flex items-center gap-3"
            style={{ borderLeft: `3px solid ${t.color}` }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: t.bg }}
            >
              <i className={`${t.icon} text-base`} style={{ color: t.color }} />
            </div>
            <div>
              <p className="text-[1.125rem] font-bold leading-tight">
                {typeof t.value === 'number' ? t.value.toLocaleString() : t.value}
              </p>
              <p className="text-[11px] text-[#8c9097]">{t.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="box mb-4">
        <div className="box-body flex flex-nowrap gap-2 overflow-x-auto items-center">
          <select
            className="form-select !w-auto flex-shrink-0"
            value={entityType}
            onChange={e => setEntityType(e.target.value)}
          >
            <option value="">All entity types</option>
            {entityTypes.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <select
            className="form-select !w-auto flex-shrink-0"
            value={action}
            onChange={e => setAction(e.target.value)}
          >
            <option value="">All actions</option>
            <option value="Create">Create</option>
            <option value="Update">Update</option>
            <option value="Delete">Delete</option>
            <option value="View">View</option>
          </select>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <i className="ri-calendar-line text-[#8c9097] text-sm" />
            <input
              type="date"
              className="form-control !w-[140px]"
              value={from}
              onChange={e => setFrom(e.target.value)}
              title="From date"
            />
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-[0.813rem] text-[#8c9097]">to</span>
            <input
              type="date"
              className="form-control !w-[140px]"
              value={to}
              onChange={e => setTo(e.target.value)}
              title="To date"
            />
          </div>

          {hasFilter && (
            <button
              onClick={() => { setEntityType(''); setAction(''); setFrom(''); setTo(''); }}
              className="px-3 py-1.5 text-[0.813rem] font-medium rounded-md flex-shrink-0 flex items-center gap-1"
              style={{ border: '1px solid #e2e8f0', color: '#64748b', background: '#f8fafc' }}
            >
              <i className="ri-close-line" />Clear
            </button>
          )}

          {!loading && totalCount > 0 && (
            <span className="ml-auto flex-shrink-0 text-[0.75rem] text-[#8c9097] whitespace-nowrap">
              {pageStart}–{pageEnd} of {totalCount.toLocaleString()}
            </span>
          )}
        </div>
      </div>

      {/* Main table card */}
      <div className="box">
        <div className="overflow-x-auto w-full">
          {loading ? (
            <table className="ti-custom-table ti-custom-table-hover w-full">
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['When','Action','Entity','User','IP',''].map((h, i) => (
                    <th
                      key={i}
                      className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-wide text-[#64748b]"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SKELETON.map((_, i) => (
                  <tr key={i} className="border-t border-[var(--defaultborder)]">
                    <td className="py-3 px-4">
                      <div className="h-3 w-24 rounded animate-pulse bg-[#f1f5f9]" />
                      <div className="h-2 w-14 rounded animate-pulse bg-[#f1f5f9] mt-1.5" />
                    </td>
                    <td className="py-3 px-4"><div className="h-5 w-16 rounded-full animate-pulse bg-[#f1f5f9]" /></td>
                    <td className="py-3 px-4">
                      <div className="h-4 w-20 rounded animate-pulse bg-[#f1f5f9]" />
                      <div className="h-2 w-28 rounded animate-pulse bg-[#f1f5f9] mt-1.5" />
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell"><div className="h-3 w-24 rounded animate-pulse bg-[#f1f5f9]" /></td>
                    <td className="py-3 px-4 hidden lg:table-cell"><div className="h-3 w-20 rounded animate-pulse bg-[#f1f5f9]" /></td>
                    <td className="py-3 px-4"><div className="h-3 w-4 rounded animate-pulse bg-[#f1f5f9]" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: '#f8fafc' }}>
                <i className="ri-shield-check-line text-3xl" style={{ color: '#C8A86B' }} />
              </div>
              <p className="font-semibold text-[#374151] mb-1">No audit entries found</p>
              <p className="text-[0.813rem] text-[#8c9097]">Try adjusting the filters above.</p>
            </div>
          ) : (
            <table className="ti-custom-table ti-custom-table-hover w-full">
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">When</th>
                  <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">Action</th>
                  <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">Entity</th>
                  <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-wide text-[#64748b] hidden md:table-cell">User</th>
                  <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-wide text-[#64748b] hidden lg:table-cell">IP</th>
                  <th className="py-3 px-4 w-8" />
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const open = expanded === r.id;
                  const ac = ACTION_STYLE[r.action] ?? ACTION_STYLE.View;
                  const ec = entityColor(r.entityType);
                  const shortId = r.entityId?.length > 8 ? r.entityId.slice(0, 8) + '…' : r.entityId;
                  const displayName = r.userName || (r.userId ? r.userId.slice(0, 8) : null);
                  const before = prettyJson(r.oldValues);
                  const after  = prettyJson(r.newValues);
                  return (
                    <Fragment key={r.id}>
                      <tr
                        className="border-t border-[var(--defaultborder)] cursor-pointer"
                        style={open ? { background: '#fdf8ee' } : undefined}
                        onClick={() => setExpanded(open ? null : r.id)}
                      >
                        {/* When */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <p className="text-[0.813rem] font-medium leading-tight">
                            {new Date(r.createdAt).toLocaleDateString('en-NP')}
                          </p>
                          <p className="text-[0.7rem] text-[#8c9097]">
                            {new Date(r.createdAt).toLocaleTimeString('en-NP', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </td>

                        {/* Action pill */}
                        <td className="py-3 px-4">
                          <span
                            className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                            style={{ background: ac.bg, color: ac.text }}
                          >
                            {r.action}
                          </span>
                        </td>

                        {/* Entity type chip + short ID */}
                        <td className="py-3 px-4">
                          <span
                            className="text-[11px] font-semibold px-2 py-0.5 rounded-md mr-1.5"
                            style={{ background: ec.bg, color: ec.text }}
                          >
                            {r.entityType}
                          </span>
                          <span
                            className="text-[0.7rem] font-mono"
                            style={{ color: '#C8A86B' }}
                            title={r.entityId}
                          >
                            {shortId}
                          </span>
                        </td>

                        {/* User avatar */}
                        <td className="py-3 px-4 hidden md:table-cell">
                          {displayName ? (
                            <div className="flex items-center gap-2">
                              <div
                                className="w-6 h-6 rounded-full flex items-center justify-center text-white flex-shrink-0"
                                style={{ background: avatarBg(displayName), fontSize: '10px', fontWeight: 700 }}
                              >
                                {initials(displayName)}
                              </div>
                              <span className="text-[0.813rem]">
                                {r.userName ?? <span className="font-mono text-[0.7rem]">{displayName}</span>}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[#8c9097]">—</span>
                          )}
                        </td>

                        {/* IP */}
                        <td className="py-3 px-4 hidden lg:table-cell">
                          {r.ipAddress ? (
                            <span className="font-mono text-[0.75rem] text-[#475569] flex items-center gap-1">
                              <i className="ri-global-line text-[#8c9097] text-sm" />
                              {r.ipAddress}
                            </span>
                          ) : (
                            <span className="text-[#8c9097]">—</span>
                          )}
                        </td>

                        {/* Expand chevron */}
                        <td className="py-3 px-4 text-[#8c9097] text-center">
                          <i className={`ri-arrow-${open ? 'up' : 'down'}-s-line text-sm`} />
                        </td>
                      </tr>

                      {/* Expanded diff row */}
                      {open && (
                        <tr>
                          <td colSpan={6} className="p-0">
                            <div
                              className="px-5 py-4"
                              style={{ background: '#fdf8ee', borderLeft: '3px solid #C8A86B' }}
                            >
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8c9097] mb-2 flex items-center gap-1">
                                    <i className="ri-history-line" />Before
                                  </p>
                                  {before ? (
                                    <pre className="bg-white border border-[#fca5a5] rounded-xl px-3 py-2.5 text-[11px] font-mono whitespace-pre-wrap break-all max-h-48 overflow-auto leading-relaxed">
                                      {before}
                                    </pre>
                                  ) : (
                                    <div className="bg-white border rounded-xl px-3 py-4 text-center text-[0.75rem] text-[#8c9097]">
                                      No previous state
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8c9097] mb-2 flex items-center gap-1">
                                    <i className="ri-check-line" />After
                                  </p>
                                  {after ? (
                                    <pre className="bg-white border border-[#86efac] rounded-xl px-3 py-2.5 text-[11px] font-mono whitespace-pre-wrap break-all max-h-48 overflow-auto leading-relaxed">
                                      {after}
                                    </pre>
                                  ) : (
                                    <div className="bg-white border rounded-xl px-3 py-4 text-center text-[0.75rem] text-[#8c9097]">
                                      No new state
                                    </div>
                                  )}
                                </div>
                                {r.userAgent && (
                                  <div className="md:col-span-2">
                                    <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8c9097] mb-1 flex items-center gap-1">
                                      <i className="ri-computer-line" />User-Agent
                                    </p>
                                    <p className="text-[11px] text-[#64748b] bg-white border rounded-xl px-3 py-2 break-all">
                                      {r.userAgent}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Inline pagination */}
        {!loading && totalCount > 0 && (
          <div
            className="flex items-center justify-between px-4 py-3 flex-wrap gap-2"
            style={{ borderTop: '1px solid var(--defaultborder)' }}
          >
            <div className="flex items-center gap-2">
              <span className="text-[0.75rem] text-[#8c9097]">Rows per page:</span>
              <select
                className="form-select !w-auto text-[0.813rem] py-1"
                value={pageSize}
                onChange={e => setPageSize(Number(e.target.value))}
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-[0.75rem] text-[#8c9097]">
                {pageStart}–{pageEnd} of {totalCount.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-2 py-1.5 text-[0.813rem] rounded-md disabled:opacity-40"
                style={{ border: '1px solid #e2e8f0', color: '#64748b', background: '#f8fafc' }}
              >
                <i className="ri-arrow-left-double-line" />
              </button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-2 py-1.5 text-[0.813rem] rounded-md disabled:opacity-40"
                style={{ border: '1px solid #e2e8f0', color: '#64748b', background: '#f8fafc' }}
              >
                <i className="ri-arrow-left-s-line" />
              </button>
              {pageBtns.map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className="min-w-[32px] px-2 py-1.5 text-[0.813rem] font-medium rounded-md"
                  style={page === p
                    ? { background: 'linear-gradient(135deg,#C8A86B 0%,#a8863d 100%)', color: '#fff', border: '1px solid #C8A86B' }
                    : { border: '1px solid #e2e8f0', color: '#64748b', background: '#f8fafc' }}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-2 py-1.5 text-[0.813rem] rounded-md disabled:opacity-40"
                style={{ border: '1px solid #e2e8f0', color: '#64748b', background: '#f8fafc' }}
              >
                <i className="ri-arrow-right-s-line" />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="px-2 py-1.5 text-[0.813rem] rounded-md disabled:opacity-40"
                style={{ border: '1px solid #e2e8f0', color: '#64748b', background: '#f8fafc' }}
              >
                <i className="ri-arrow-right-double-line" />
              </button>
            </div>
          </div>
        )}
      </div>
    </Fragment>
  );
}
