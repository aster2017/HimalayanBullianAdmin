'use client';

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { useDebouncedSearch } from '@/shared/hooks/useDebouncedSearch';
import { Pagination } from '@/shared/components/Pagination';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://hbc-api.semis.app/api';

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

export default function SecurityPage() {
  useProtectedRoute();
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
      if (ipFilter.trim()) params.set('ip', ipFilter.trim());
      const r = await fetch(`${API}/admin/security/login-attempts?${params}`, { headers: getAuthHeaders() });
      const d = await r.json();
      setAttempts(d?.data || []);
      setTotalCount(d?.totalCount || 0);
    } catch { toast.error('Failed to load login attempts'); }
    finally { setAttemptsLoading(false); }
  };

  useEffect(() => { loadLocked(); }, []);
  useEffect(() => { setPage(1); }, [onlyFailed, search.value, ipFilter, pageSize]);
  useEffect(() => { loadAttempts(); }, [page, pageSize, onlyFailed, search.value, ipFilter]);

  const unlock = async (userId: string, email: string) => {
    if (!window.confirm(`Unlock ${email}?`)) return;
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
    return m < 60 ? `${m}m left` : `${Math.floor(m / 60)}h ${m % 60}m left`;
  };

  return (
    <Fragment>
      <div className="my-[1.5rem]">
        <p className="font-semibold text-[1.125rem] !mb-0">Security &amp; Audit</p>
        <p className="text-[0.813rem] text-[#8c9097]">
          Locked-out accounts and login attempt history.
          <Link href="/access/users" className="text-primary ms-2">Staff users →</Link>
        </p>
      </div>

      {/* Locked accounts */}
      <div className="box mb-6">
        <div className="box-header">
          <h6 className="box-title mb-0">Locked accounts ({locked.length})</h6>
        </div>
        <div className="box-body">
          {lockedLoading ? (
            <div className="text-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary inline-block"></div>
            </div>
          ) : locked.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">
              <i className="ri-shield-check-line text-2xl text-success block mb-1"></i>
              No accounts currently locked out.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="table w-full">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase">
                    <th className="text-left p-2">Account</th>
                    <th className="text-right p-2">Failed</th>
                    <th className="text-left p-2 hidden md:table-cell">Lockout ends</th>
                    <th className="text-right p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {locked.map(u => (
                    <tr key={u.id} className="border-t">
                      <td className="p-2">
                        <Link href={`/customers/${u.id}`} className="text-primary text-sm font-semibold hover:underline">
                          {u.fullName.trim() || u.email}
                        </Link>
                        <div className="text-[0.7rem] text-gray-400">{u.email}</div>
                      </td>
                      <td className="p-2 text-right font-mono">{u.accessFailedCount}</td>
                      <td className="p-2 text-xs hidden md:table-cell">
                        {new Date(u.lockoutEnd).toLocaleString('en-NP')}
                        <div className="text-warning">{lockoutCountdown(u.lockoutEnd)}</div>
                      </td>
                      <td className="p-2 text-right">
                        <button
                          onClick={() => unlock(u.id, u.email)}
                          disabled={unlocking === u.id}
                          className="ti-btn ti-btn-warning ti-btn-sm !text-white !opacity-100 disabled:!opacity-50"
                        >
                          {unlocking === u.id ? '…' : <><i className="ri-lock-unlock-line me-1"></i>Unlock</>}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Login attempts */}
      <div className="box">
        <div className="box-header flex items-center justify-between gap-2 flex-wrap">
          <h6 className="box-title mb-0">Login attempts</h6>
          <div className="flex gap-2 flex-wrap">
            <input
              type="text"
              value={search.immediate}
              onChange={e => search.setValue(e.target.value)}
              placeholder="Email…"
              className="form-control form-control-sm w-44"
            />
            <input
              type="text"
              value={ipFilter}
              onChange={e => setIpFilter(e.target.value)}
              placeholder="IP…"
              className="form-control form-control-sm w-32 font-mono"
            />
            <label className="flex items-center gap-1 text-xs text-gray-600">
              <input type="checkbox" checked={onlyFailed} onChange={e => setOnlyFailed(e.target.checked)} />
              Only failures
            </label>
          </div>
        </div>
        <div className="box-body">
          {attemptsLoading ? (
            <div className="text-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary inline-block"></div>
            </div>
          ) : attempts.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-4">No login attempts match the filter.</p>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="table w-full min-w-[640px] sm:min-w-0">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase">
                    <th className="text-left p-2">When</th>
                    <th className="text-left p-2">Email</th>
                    <th className="text-left p-2 hidden md:table-cell">IP</th>
                    <th className="text-left p-2 hidden lg:table-cell">User-Agent</th>
                    <th className="text-center p-2">Result</th>
                  </tr>
                </thead>
                <tbody>
                  {attempts.map(a => (
                    <tr key={a.id} className="border-t">
                      <td className="p-2 text-[0.813rem] whitespace-nowrap">
                        {new Date(a.attemptedAt).toLocaleDateString('en-NP')}
                        <div className="text-[0.7rem] text-gray-400">
                          {new Date(a.attemptedAt).toLocaleTimeString('en-NP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                      </td>
                      <td className="p-2 text-sm font-mono">{a.email}</td>
                      <td className="p-2 text-[0.813rem] font-mono hidden md:table-cell">{a.ipAddress || '—'}</td>
                      <td className="p-2 text-[0.7rem] text-gray-500 hidden lg:table-cell truncate max-w-[300px]" title={a.userAgent || ''}>
                        {a.userAgent || '—'}
                      </td>
                      <td className="p-2 text-center">
                        {a.success
                          ? <span className="badge bg-success/20 text-success text-[10px] px-2 py-0.5 rounded">success</span>
                          : <span className="badge bg-danger/20 text-danger text-[10px] px-2 py-0.5 rounded" title={a.failureReason || ''}>{a.failureReason || 'failed'}</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {!attemptsLoading && totalCount > 0 && (
          <div className="px-4 pb-4">
            <Pagination
              page={page}
              pageSize={pageSize}
              totalCount={totalCount}
              onPageChange={setPage}
              pageSizeOptions={[25, 50, 100]}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </div>
    </Fragment>
  );
}
