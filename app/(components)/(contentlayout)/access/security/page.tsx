'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { useDebouncedSearch } from '@/shared/hooks/useDebouncedSearch';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';
import { useDialog } from '@/shared/context/DialogContext';

const API = process.env.NEXT_PUBLIC_API_URL;

type LockedAccount = {
  id: string;
  email: string;
  fullName: string;
  lockoutEnd: string;
  accessFailedCount: number;
};

type Attempt = {
  id: string;
  email: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  success: boolean;
  failureReason?: string | null;
  attemptedAt: string;
};

const AVATAR_COLORS = ['#C8A86B','#2563eb','#7c3aed','#059669','#dc2626','#d97706','#0891b2','#4f46e5'];
function avatarBg(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function initials(name: string) {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2 ? (parts[0][0] + parts[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

const SKELETON_ROWS = Array.from({ length: 8 });

export default function SecurityPage() {
  useProtectedRoute();
  const { confirm } = useDialog();
  const [locked, setLocked] = useState<LockedAccount[]>([]);
  const [lockedLoading, setLockedLoading] = useState(true);
  const [unlocking, setUnlocking] = useState<string | null>(null);

  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [attemptsLoading, setAttemptsLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [onlyFailed, setOnlyFailed] = useState(true);
  const search = useDebouncedSearch('', 300);
  const [ipFilter, setIpFilter] = useState('');
  const [ipDebounced, setIpDebounced] = useState('');
  const ipTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(ipTimerRef.current);
    ipTimerRef.current = setTimeout(() => setIpDebounced(ipFilter), 350);
    return () => clearTimeout(ipTimerRef.current);
  }, [ipFilter]);

  const hasTextFilter = !!(search.immediate || ipFilter);

  const loadLocked = async () => {
    setLockedLoading(true);
    try {
      const r = await fetch(`${API}/admin/security/locked-accounts`, { headers: getAuthHeaders() });
      const d = await r.json();
      setLocked(d?.data || []);
    } catch { toast.error('Failed to load locked accounts'); }
    finally { setLockedLoading(false); }
  };

  const loadAttempts = async () => {
    setAttemptsLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (onlyFailed) params.set('onlyFailed', 'true');
      if (search.value.trim()) params.set('email', search.value.trim());
      if (ipDebounced.trim()) params.set('ip', ipDebounced.trim());
      const r = await fetch(`${API}/admin/security/login-attempts?${params}`, { headers: getAuthHeaders() });
      const d = await r.json();
      setAttempts(d?.data || []);
      setTotalCount(d?.totalCount || 0);
    } catch { toast.error('Failed to load login attempts'); }
    finally { setAttemptsLoading(false); }
  };

  useEffect(() => { loadLocked(); }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setPage(1); }, [onlyFailed, search.value, ipDebounced, pageSize]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadAttempts(); }, [page, pageSize, onlyFailed, search.value, ipDebounced]);

  const unlock = async (userId: string, email: string) => {
    if (!await confirm('The account lockout will be lifted immediately.', { title: `Unlock ${email}?`, variant: 'warning', confirmLabel: 'Unlock' })) return;
    setUnlocking(userId);
    try {
      const r = await fetch(`${API}/admin/security/unlock/${userId}`, { method: 'POST', headers: getAuthHeaders() });
      const d = await r.json();
      if (d?.success) { toast.success(d.message || 'Unlocked'); loadLocked(); }
      else toast.error(d?.message || 'Failed');
    } finally { setUnlocking(null); }
  };

  const lockoutCountdown = (iso: string) => {
    const ms = new Date(iso).getTime() - Date.now();
    if (ms <= 0) return 'expired';
    const m = Math.floor(ms / 60000);
    return m < 60 ? `${m}m remaining` : `${Math.floor(m / 60)}h ${m % 60}m remaining`;
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const pageStart = totalCount === 0 ? 0 : Math.min((page - 1) * pageSize + 1, totalCount);
  const pageEnd = Math.min(page * pageSize, totalCount);

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
          <i className="ri-shield-keyhole-line text-white text-lg" />
        </div>
        <div>
          <p className="font-semibold text-[1.125rem] !mb-0">Security &amp; Audit</p>
          <p className="text-[0.813rem] text-[#8c9097]">
            Locked-out accounts and login attempt history.{' '}
            <Link href="/access/users" className="text-primary">Staff users →</Link>
          </p>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
        {/* Locked accounts — color-coded by state */}
        <div
          className="box p-4 flex items-center gap-3"
          style={{ borderLeft: `3px solid ${!lockedLoading && locked.length > 0 ? '#dc2626' : '#15803d'}` }}
        >
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: !lockedLoading && locked.length > 0 ? '#fee2e2' : '#dcfce7' }}
          >
            <i
              className={`${!lockedLoading && locked.length > 0 ? 'ri-lock-line' : 'ri-shield-check-line'} text-base`}
              style={{ color: !lockedLoading && locked.length > 0 ? '#dc2626' : '#15803d' }}
            />
          </div>
          <div>
            <p className="text-[1.125rem] font-bold leading-tight">
              {lockedLoading ? '—' : locked.length}
            </p>
            <p className="text-[11px] text-[#8c9097]">Locked Accounts</p>
          </div>
        </div>

        {/* Total attempts */}
        <div className="box p-4 flex items-center gap-3" style={{ borderLeft: '3px solid #2563eb' }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#dbeafe' }}>
            <i className="ri-login-box-line text-base" style={{ color: '#2563eb' }} />
          </div>
          <div>
            <p className="text-[1.125rem] font-bold leading-tight">
              {attemptsLoading ? '—' : totalCount.toLocaleString()}
            </p>
            <p className="text-[11px] text-[#8c9097]">Login Attempts</p>
          </div>
        </div>

        {/* Page indicator */}
        <div className="box p-4 flex items-center gap-3 col-span-2 sm:col-span-1" style={{ borderLeft: '3px solid #C8A86B' }}>
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: '#fdf8ee' }}>
            <i className="ri-pages-line text-base" style={{ color: '#C8A86B' }} />
          </div>
          <div>
            <p className="text-[1.125rem] font-bold leading-tight">
              {attemptsLoading ? '—' : `${page} / ${totalPages}`}
            </p>
            <p className="text-[11px] text-[#8c9097]">{onlyFailed ? 'Failures only' : 'All attempts'}</p>
          </div>
        </div>
      </div>

      {/* ── Locked Accounts Box ── */}
      <div className="box mb-4">
        <div className="box-body">
          {/* Section label */}
          <div className="flex items-center gap-2 mb-4">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: !lockedLoading && locked.length > 0 ? '#fee2e2' : '#dcfce7' }}
            >
              <i
                className={`${!lockedLoading && locked.length > 0 ? 'ri-lock-line' : 'ri-shield-check-line'} text-sm`}
                style={{ color: !lockedLoading && locked.length > 0 ? '#dc2626' : '#15803d' }}
              />
            </div>
            <span className="font-semibold text-[0.875rem]">Locked Accounts</span>
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
              style={!lockedLoading && locked.length > 0
                ? { background: '#fee2e2', color: '#dc2626' }
                : { background: '#dcfce7', color: '#15803d' }}
            >
              {lockedLoading ? '…' : locked.length}
            </span>
          </div>

          {lockedLoading ? (
            <div className="flex items-center gap-3 px-1">
              <div className="w-8 h-8 rounded-full animate-pulse bg-[#f1f5f9] flex-shrink-0" />
              <div className="h-3 w-48 rounded animate-pulse bg-[#f1f5f9]" />
            </div>
          ) : locked.length === 0 ? (
            <div
              className="flex items-center gap-3 px-4 py-3 rounded-xl"
              style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }}
            >
              <i className="ri-shield-check-line text-xl flex-shrink-0" style={{ color: '#15803d' }} />
              <p className="text-[0.813rem] font-medium" style={{ color: '#166534' }}>
                All clear — no accounts currently locked out.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="ti-custom-table ti-custom-table-hover w-full">
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th className="py-2.5 px-4 text-left text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">Account</th>
                    <th className="py-2.5 px-4 text-left text-[11px] font-semibold uppercase tracking-wide text-[#64748b] hidden sm:table-cell">Failed Attempts</th>
                    <th className="py-2.5 px-4 text-left text-[11px] font-semibold uppercase tracking-wide text-[#64748b] hidden md:table-cell">Lockout Ends</th>
                    <th className="py-2.5 px-4 text-right text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {locked.map(u => {
                    const displayName = u.fullName.trim() || u.email;
                    const bg = avatarBg(displayName);
                    return (
                      <tr key={u.id} className="border-t border-[var(--defaultborder)]">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0 font-bold"
                              style={{ background: bg, fontSize: '11px' }}
                            >
                              {initials(displayName)}
                            </div>
                            <div>
                              <Link
                                href={`/customers/${u.id}`}
                                className="text-[0.813rem] font-semibold hover:underline"
                                style={{ color: '#C8A86B' }}
                              >
                                {displayName}
                              </Link>
                              <p className="text-[0.7rem] text-[#8c9097]">{u.email}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 hidden sm:table-cell">
                          <span
                            className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                            style={{ background: '#fee2e2', color: '#dc2626' }}
                          >
                            {u.accessFailedCount} failures
                          </span>
                        </td>
                        <td className="py-3 px-4 hidden md:table-cell">
                          <p className="text-[0.813rem]">{new Date(u.lockoutEnd).toLocaleString('en-NP')}</p>
                          <p className="text-[0.75rem]" style={{ color: '#d97706' }}>
                            {lockoutCountdown(u.lockoutEnd)}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => unlock(u.id, u.email)}
                            disabled={unlocking === u.id}
                            className="px-3 py-1.5 text-[0.813rem] font-medium rounded-md text-white inline-flex items-center gap-1.5 disabled:opacity-50"
                            style={{ background: 'linear-gradient(135deg,#f59e0b 0%,#d97706 100%)' }}
                          >
                            {unlocking === u.id
                              ? <><i className="ri-loader-4-line animate-spin" />Unlocking…</>
                              : <><i className="ri-lock-unlock-line" />Unlock</>}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Login Attempts Box ── */}
      <div className="box">
        {/* Filter bar — one row */}
        <div
          className="box-body flex flex-nowrap gap-2 overflow-x-auto items-center"
          style={{ borderBottom: '1px solid var(--defaultborder)' }}
        >
          {/* Section label */}
          <div className="flex items-center gap-2 flex-shrink-0 pr-1">
            <i className="ri-login-box-line text-[#C8A86B]" />
            <span className="font-semibold text-[0.875rem] whitespace-nowrap">Login Attempts</span>
          </div>

          {/* Email search */}
          <div className="relative flex-1 min-w-[140px]">
            <i className="ri-mail-line absolute left-3 top-1/2 -translate-y-1/2 text-[#8c9097] text-sm pointer-events-none" />
            <input
              type="text"
              value={search.immediate}
              onChange={e => search.setValue(e.target.value)}
              placeholder="Search email…"
              className="form-control pl-8 text-[0.813rem]"
            />
          </div>

          {/* IP filter */}
          <div className="relative flex-shrink-0 w-[134px]">
            <i className="ri-global-line absolute left-3 top-1/2 -translate-y-1/2 text-[#8c9097] text-sm pointer-events-none" />
            <input
              type="text"
              value={ipFilter}
              onChange={e => setIpFilter(e.target.value)}
              placeholder="IP address…"
              className="form-control pl-8 font-mono text-[0.813rem]"
            />
          </div>

          {/* Failures toggle button */}
          <button
            onClick={() => setOnlyFailed(!onlyFailed)}
            className="px-3 py-1.5 text-[0.813rem] font-medium rounded-md flex items-center gap-1.5 flex-shrink-0 whitespace-nowrap"
            style={onlyFailed
              ? { background: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5' }
              : { background: '#f8fafc', color: '#64748b', border: '1px solid #e2e8f0' }}
          >
            <i className={`ri-${onlyFailed ? 'close-circle-fill' : 'filter-3-line'}`} />
            {onlyFailed ? 'Failures only' : 'All attempts'}
          </button>

          {/* Clear text filters */}
          {hasTextFilter && (
            <button
              onClick={() => { search.setValue(''); setIpFilter(''); }}
              className="px-3 py-1.5 text-[0.813rem] font-medium rounded-md flex-shrink-0 flex items-center gap-1"
              style={{ border: '1px solid #e2e8f0', color: '#64748b', background: '#f8fafc' }}
            >
              <i className="ri-close-line" />Clear
            </button>
          )}

          {/* Count */}
          {!attemptsLoading && totalCount > 0 && (
            <span className="ml-auto flex-shrink-0 text-[0.75rem] text-[#8c9097] whitespace-nowrap">
              {pageStart}–{pageEnd} of {totalCount.toLocaleString()}
            </span>
          )}
        </div>

        {/* Table */}
        <div className="overflow-x-auto w-full">
          {attemptsLoading ? (
            <table className="ti-custom-table ti-custom-table-hover w-full">
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  {['When','Email','IP Address','User-Agent','Result'].map((h, i) => (
                    <th key={i} className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {SKELETON_ROWS.map((_, i) => (
                  <tr key={i} className="border-t border-[var(--defaultborder)]">
                    <td className="py-3 px-4">
                      <div className="h-3 w-20 rounded animate-pulse bg-[#f1f5f9]" />
                      <div className="h-2 w-14 rounded animate-pulse bg-[#f1f5f9] mt-1.5" />
                    </td>
                    <td className="py-3 px-4"><div className="h-3 w-40 rounded animate-pulse bg-[#f1f5f9]" /></td>
                    <td className="py-3 px-4 hidden md:table-cell"><div className="h-3 w-24 rounded animate-pulse bg-[#f1f5f9]" /></td>
                    <td className="py-3 px-4 hidden lg:table-cell"><div className="h-3 w-52 rounded animate-pulse bg-[#f1f5f9]" /></td>
                    <td className="py-3 px-4"><div className="h-5 w-24 rounded-full animate-pulse bg-[#f1f5f9]" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : attempts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: '#f8fafc' }}>
                <i className="ri-login-box-line text-3xl" style={{ color: '#C8A86B' }} />
              </div>
              <p className="font-semibold text-[#374151] mb-1">No login attempts found</p>
              <p className="text-[0.813rem] text-[#8c9097]">Try adjusting the filters above.</p>
            </div>
          ) : (
            <table className="ti-custom-table ti-custom-table-hover w-full">
              <thead>
                <tr style={{ background: '#f8fafc' }}>
                  <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">When</th>
                  <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">Email</th>
                  <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-wide text-[#64748b] hidden md:table-cell">IP Address</th>
                  <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-wide text-[#64748b] hidden lg:table-cell">User-Agent</th>
                  <th className="py-3 px-4 text-left text-[11px] font-semibold uppercase tracking-wide text-[#64748b]">Result</th>
                </tr>
              </thead>
              <tbody>
                {attempts.map(a => (
                  <tr key={a.id} className="border-t border-[var(--defaultborder)]">
                    {/* When */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <p className="text-[0.813rem] font-medium leading-tight">
                        {new Date(a.attemptedAt).toLocaleDateString('en-NP')}
                      </p>
                      <p className="text-[0.7rem] text-[#8c9097]">
                        {new Date(a.attemptedAt).toLocaleTimeString('en-NP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </p>
                    </td>

                    {/* Email */}
                    <td className="py-3 px-4">
                      <span className="text-[0.813rem] font-mono text-[#374151]">{a.email}</span>
                    </td>

                    {/* IP */}
                    <td className="py-3 px-4 hidden md:table-cell">
                      {a.ipAddress ? (
                        <span className="font-mono text-[0.75rem] text-[#475569] flex items-center gap-1">
                          <i className="ri-global-line text-[#8c9097] text-sm" />
                          {a.ipAddress}
                        </span>
                      ) : (
                        <span className="text-[#8c9097]">—</span>
                      )}
                    </td>

                    {/* User-Agent */}
                    <td className="py-3 px-4 hidden lg:table-cell" style={{ maxWidth: '260px' }} title={a.userAgent || ''}>
                      <span className="text-[0.75rem] text-[#64748b] line-clamp-1 block">
                        {a.userAgent || <span className="text-[#8c9097]">—</span>}
                      </span>
                    </td>

                    {/* Result pill */}
                    <td className="py-3 px-4">
                      <span
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                        title={(!a.success && a.failureReason) ? a.failureReason : undefined}
                        style={a.success
                          ? { background: '#dcfce7', color: '#15803d' }
                          : { background: '#fee2e2', color: '#dc2626' }}
                      >
                        {a.success ? 'Success' : (a.failureReason || 'Failed')}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Inline pagination */}
        {!attemptsLoading && totalCount > 0 && (
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
