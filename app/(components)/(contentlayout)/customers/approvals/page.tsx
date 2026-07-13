'use client'
import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL;
const PAGE_SIZE = 20;

// ── helpers ───────────────────────────────────────────────────────────────────
function avatarColor(name: string) {
  const colors = ['#C8A86B', '#7c3aed', '#0891b2', '#16a34a', '#dc2626', '#d97706', '#db2777', '#2563eb'];
  let h = 0; for (let i = 0; i < (name || '').length; i++) h = (name || '').charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}
function avatarInitials(name: string) {
  const parts = (name || '').trim().split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return (name || '??').slice(0, 2).toUpperCase();
}
function relativeTime(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30)  return `${days}d ago`;
  const mo = Math.floor(days / 30);
  if (mo < 12)   return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

type TabKey = 'pending' | 'unverified';

function pageNums(page: number, totalPages: number): (number | '...')[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  if (page <= 4)              return [1, 2, 3, 4, 5, '...', totalPages];
  if (page >= totalPages - 3) return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  return [1, '...', page - 1, page, page + 1, '...', totalPages];
}

// ── page ──────────────────────────────────────────────────────────────────────
export default function ApprovalsPage() {
  useProtectedRoute();

  const [tab, setTab] = useState<TabKey>('pending');

  // ── pending (full list, client-side filter + paginate) ────────────────────
  const [pendingAll, setPendingAll]         = useState<any[]>([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [pendingPage, setPendingPage]       = useState(1);
  const [pendingInput, setPendingInput]     = useState('');
  const [pendingSearch, setPendingSearch]   = useState('');
  const pendingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── unverified (server-side paginated) ───────────────────────────────────
  const [unverifiedItems, setUnverifiedItems]   = useState<any[]>([]);
  const [unverifiedTotal, setUnverifiedTotal]   = useState(0);
  const [unverifiedLoading, setUnverifiedLoading] = useState(false);
  const [unverifiedPage, setUnverifiedPage]     = useState(1);
  const [unverifiedInput, setUnverifiedInput]   = useState('');
  const [unverifiedSearch, setUnverifiedSearch] = useState('');
  const unverifiedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── actions ───────────────────────────────────────────────────────────────
  const [acting, setActing]             = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submittingReject, setSubmittingReject] = useState(false);

  // ── debounce search inputs ────────────────────────────────────────────────
  useEffect(() => {
    if (pendingTimer.current) clearTimeout(pendingTimer.current);
    pendingTimer.current = setTimeout(() => { setPendingSearch(pendingInput); setPendingPage(1); }, 300);
    return () => { if (pendingTimer.current) clearTimeout(pendingTimer.current); };
  }, [pendingInput]);

  useEffect(() => {
    if (unverifiedTimer.current) clearTimeout(unverifiedTimer.current);
    unverifiedTimer.current = setTimeout(() => { setUnverifiedSearch(unverifiedInput); setUnverifiedPage(1); }, 350);
    return () => { if (unverifiedTimer.current) clearTimeout(unverifiedTimer.current); };
  }, [unverifiedInput]);

  // ── data loaders ─────────────────────────────────────────────────────────
  const loadPending = useCallback(async () => {
    setPendingLoading(true);
    try {
      const r = await fetch(`${API}/customers/pending-approval`, { headers: getAuthHeaders() });
      const d = await r.json();
      setPendingAll(d.pending || []);
    } catch { toast.error('Failed to load pending approvals'); }
    finally { setPendingLoading(false); }
  }, []);

  const loadUnverified = useCallback(async (p: number, search: string) => {
    setUnverifiedLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), pageSize: String(PAGE_SIZE), status: 'unverified' });
      if (search.trim()) params.set('search', search.trim());
      const r = await fetch(`${API}/customers?${params}`, { headers: getAuthHeaders() });
      const d = await r.json();
      setUnverifiedItems(d.data?.items || []);
      setUnverifiedTotal(d.data?.totalCount || 0);
    } catch { toast.error('Failed to load unverified customers'); }
    finally { setUnverifiedLoading(false); }
  }, []);

  const fetchUnverifiedCount = useCallback(async () => {
    try {
      const r = await fetch(`${API}/customers?page=1&pageSize=1&status=unverified`, { headers: getAuthHeaders() });
      const d = await r.json();
      setUnverifiedTotal(d.data?.totalCount || 0);
    } catch {/* swallow */}
  }, []);

  useEffect(() => { loadPending(); fetchUnverifiedCount(); }, []);
  useEffect(() => {
    if (tab === 'unverified') loadUnverified(unverifiedPage, unverifiedSearch);
  }, [tab, unverifiedPage, unverifiedSearch]);

  // ── client-side pending filter ────────────────────────────────────────────
  const filteredPending = pendingSearch
    ? pendingAll.filter(c =>
        c.fullName?.toLowerCase().includes(pendingSearch.toLowerCase()) ||
        c.email?.toLowerCase().includes(pendingSearch.toLowerCase()) ||
        c.phoneNumber?.includes(pendingSearch)
      )
    : pendingAll;
  const pendingTotalPages = Math.ceil(filteredPending.length / PAGE_SIZE);
  const pendingPageItems  = filteredPending.slice((pendingPage - 1) * PAGE_SIZE, pendingPage * PAGE_SIZE);

  const unverifiedTotalPages = Math.ceil(unverifiedTotal / PAGE_SIZE);

  // ── approve / reject ──────────────────────────────────────────────────────
  const approve = async (id: string) => {
    setActing(id);
    try {
      const r = await fetch(`${API}/customers/${id}/approve`, { method: 'POST', headers: getAuthHeaders() });
      const d = await r.json();
      if (d.success) { toast.success(d.message || 'Approved!'); loadPending(); }
      else toast.error(d.message || 'Failed');
    } finally { setActing(null); }
  };

  const confirmReject = async () => {
    if (!rejectTarget) return;
    setSubmittingReject(true);
    try {
      const r = await fetch(`${API}/customers/${rejectTarget.id}/reject`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      });
      const d = await r.json();
      if (d.success) { toast.success(d.message || 'Rejected'); loadPending(); setRejectTarget(null); setRejectReason(''); }
      else toast.error(d.message || 'Failed');
    } finally { setSubmittingReject(false); setActing(null); }
  };

  // ── gold pagination renderer ──────────────────────────────────────────────
  const PaginationBar = ({ page, totalPages, total, label, onPage }: {
    page: number; totalPages: number; total: number; label: string; onPage: (p: number) => void;
  }) => (
    <div className="box mt-3">
      <div className="box-body flex items-center justify-between flex-wrap gap-4">
        <p className="text-[0.78rem] text-[#8c9097] mb-0">
          Showing{' '}
          <span className="font-semibold text-defaulttextcolor">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)}
          </span>{' '}
          of <span className="font-semibold text-defaulttextcolor">{total.toLocaleString()}</span> {label}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <button onClick={() => onPage(1)} disabled={page === 1}
              className="px-2.5 py-1.5 text-[0.78rem] border border-defaultborder rounded-lg text-defaulttextcolor hover:border-[#C8A86B] hover:text-[#C8A86B] disabled:opacity-40 disabled:pointer-events-none transition-colors">«</button>
            <button onClick={() => onPage(page - 1)} disabled={page === 1}
              className="px-3 py-1.5 text-[0.78rem] border border-defaultborder rounded-lg text-defaulttextcolor hover:border-[#C8A86B] hover:text-[#C8A86B] disabled:opacity-40 disabled:pointer-events-none transition-colors">‹ Prev</button>
            {pageNums(page, totalPages).map((pg, idx) =>
              pg === '...'
                ? <span key={idx} className="px-3 py-1.5 text-[0.78rem] text-[#94a3b8]">…</span>
                : (
                  <button key={idx} onClick={() => onPage(pg as number)}
                    className={`px-3 py-1.5 text-[0.78rem] border rounded-lg transition-colors font-medium ${
                      page === pg ? 'text-white border-[#C8A86B]' : 'border-defaultborder text-defaulttextcolor hover:border-[#C8A86B] hover:text-[#C8A86B]'
                    }`}
                    style={page === pg ? { background: 'linear-gradient(135deg, #C8A86B 0%, #a8863d 100%)' } : {}}>
                    {pg}
                  </button>
                )
            )}
            <button onClick={() => onPage(page + 1)} disabled={page === totalPages}
              className="px-3 py-1.5 text-[0.78rem] border border-defaultborder rounded-lg text-defaulttextcolor hover:border-[#C8A86B] hover:text-[#C8A86B] disabled:opacity-40 disabled:pointer-events-none transition-colors">Next ›</button>
            <button onClick={() => onPage(totalPages)} disabled={page === totalPages}
              className="px-2.5 py-1.5 text-[0.78rem] border border-defaultborder rounded-lg text-defaulttextcolor hover:border-[#C8A86B] hover:text-[#C8A86B] disabled:opacity-40 disabled:pointer-events-none transition-colors">»</button>
          </div>
        )}
      </div>
    </div>
  );

  const TABS = [
    { key: 'pending' as TabKey,    label: 'Pending Approval', color: '#2563eb', count: pendingAll.length },
    { key: 'unverified' as TabKey, label: 'Unverified Email',  color: '#d97706', count: unverifiedTotal },
  ];

  return (
    <div className="page-content">
      <div className="container-fluid">

        {/* ── Zone 1: Header ── */}
        <div className="flex items-center justify-between my-[1.5rem]">
          <div>
            <p className="font-bold text-[1.1rem] text-defaulttextcolor mb-0">Customer Approvals</p>
            <p className="text-[0.78rem] text-[#8c9097] mt-0.5">Review and approve new customer accounts</p>
          </div>
          <button
            onClick={() => { loadPending(); fetchUnverifiedCount(); if (tab === 'unverified') loadUnverified(unverifiedPage, unverifiedSearch); }}
            className="w-9 h-9 rounded-lg border border-defaultborder flex items-center justify-center text-[#64748b] hover:border-[#C8A86B] hover:text-[#C8A86B] transition-colors">
            <i className="ri-refresh-line text-sm"/>
          </button>
        </div>

        {/* ── Zone 2: Stat cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          {/* Pending Approval */}
          <div className="box p-4 flex items-center gap-4" style={{ borderLeft: '3px solid #2563eb' }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: '#dbeafe' }}>
              <i className="ri-user-follow-line text-xl" style={{ color: '#2563eb' }}/>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-0.5">Pending Approval</p>
              <p className="text-[1.4rem] font-bold text-defaulttextcolor mb-0">{pendingAll.length}</p>
              <p className="text-[10px] text-[#94a3b8] mb-0">Email verified, awaiting admin</p>
            </div>
          </div>

          {/* Unverified Email */}
          <div className="box p-4 flex items-center gap-4" style={{ borderLeft: '3px solid #d97706' }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: '#fef3c7' }}>
              <i className="ri-mail-line text-xl" style={{ color: '#d97706' }}/>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-0.5">Unverified Email</p>
              <p className="text-[1.4rem] font-bold text-defaulttextcolor mb-0">{unverifiedTotal.toLocaleString()}</p>
              <p className="text-[10px] text-[#94a3b8] mb-0">Awaiting OTP verification</p>
            </div>
          </div>

          {/* Action Required */}
          <div className="box p-4 flex items-center gap-4" style={{ borderLeft: '3px solid #dc2626' }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: '#fee2e2' }}>
              <i className="ri-alarm-warning-line text-xl" style={{ color: '#dc2626' }}/>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-0.5">Action Required</p>
              <p className="text-[1.4rem] font-bold text-defaulttextcolor mb-0">{pendingAll.length}</p>
              <p className="text-[10px] text-[#94a3b8] mb-0">Approve or reject below</p>
            </div>
          </div>
        </div>

        {/* ── Zone 3: Tab bar ── */}
        <div className="flex items-center gap-1 border-b border-defaultborder mb-5 pb-0">
          {TABS.map(t => {
            const isActive = tab === t.key;
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-[0.8rem] font-medium transition-colors rounded-t-lg border-b-2 -mb-px ${
                  isActive ? '' : 'border-transparent text-[#94a3b8] hover:text-defaulttextcolor'
                }`}
                style={isActive ? { borderBottomColor: t.color, color: t.color } : {}}>
                {t.label}
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                  style={isActive
                    ? { background: t.color + '20', color: t.color }
                    : { background: '#f1f5f9', color: '#64748b' }}>
                  {t.count > 999 ? '999+' : t.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ══════════════════════════════════════════════════ */}
        {/* ── Tab: Pending Approval ── */}
        {/* ══════════════════════════════════════════════════ */}
        {tab === 'pending' && (
          <>
            {/* Filter bar */}
            <div className="box p-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] text-sm pointer-events-none"/>
                  <input type="text" value={pendingInput}
                    onChange={e => setPendingInput(e.target.value)}
                    placeholder="Search name, email, phone…"
                    className="form-control form-control-sm !pl-9 !pr-8 w-full !rounded-lg"/>
                  {pendingInput && (
                    <button onClick={() => setPendingInput('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-defaulttextcolor">
                      <i className="ri-close-line text-sm"/>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Table */}
            <div className="box">
              <div className="overflow-x-auto">
                <table className="ti-custom-table ti-custom-table-hover text-sm w-full">
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">Customer</th>
                      <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">Type / KYC</th>
                      <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">Phone</th>
                      <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">City</th>
                      <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">Source</th>
                      <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">Signed Up</th>
                      <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingLoading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <tr key={i}>
                          {[200, 120, 110, 80, 70, 90, 90].map((w, j) => (
                            <td key={j} className="py-3 px-4">
                              <div className="h-4 rounded animate-pulse bg-[#f1f5f9]" style={{ width: w }}/>
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : pendingPageItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                              style={{ background: '#dcfce7' }}>
                              <i className="ri-checkbox-circle-line text-2xl" style={{ color: '#16a34a' }}/>
                            </div>
                            <div>
                              <p className="font-semibold text-defaulttextcolor mb-0.5">All caught up</p>
                              <p className="text-[0.78rem] text-[#94a3b8] mb-0">
                                {pendingSearch ? 'No pending approvals match the search.' : 'No pending approvals right now.'}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : pendingPageItems.map((c: any) => {
                      const ac = avatarColor(c.fullName || '');
                      const ai = avatarInitials(c.fullName || '');
                      const isActing = acting === c.id;
                      const isBusiness = c.clientType === 'Business';

                      return (
                        <tr key={c.id} style={{ borderLeft: '3px solid #2563eb' }} className="group">
                          {/* Customer */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                                style={{ background: ac }}>
                                {ai}
                              </div>
                              <div>
                                <Link href={`/customers/${c.id}`}
                                  className="font-semibold text-[0.85rem] text-defaulttextcolor hover:text-[#C8A86B] transition-colors">
                                  {c.fullName}
                                </Link>
                                <p className="text-[0.72rem] text-[#94a3b8] mb-0">{c.email}</p>
                              </div>
                            </div>
                          </td>

                          {/* Type / KYC */}
                          <td className="py-3 px-4">
                            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                              style={isBusiness
                                ? { background: '#ede9fe', color: '#7c3aed' }
                                : { background: '#dbeafe', color: '#2563eb' }}>
                              {c.clientType || 'Individual'}
                              {isBusiness && c.businessName ? ` · ${c.businessName}` : ''}
                            </span>
                            <div className="flex items-center gap-3 mt-1.5">
                              <span title="PAN card photo"
                                className="text-[10px] font-semibold flex items-center gap-0.5"
                                style={{ color: c.hasPanCardImage ? '#16a34a' : '#dc2626' }}>
                                <i className={c.hasPanCardImage ? 'ri-checkbox-circle-line' : 'ri-close-circle-line'}/>
                                PAN
                              </span>
                              <span title="UBO declaration"
                                className="text-[10px] font-semibold flex items-center gap-0.5"
                                style={{ color: c.uboConfirmed ? '#16a34a' : '#d97706' }}>
                                <i className={c.uboConfirmed ? 'ri-checkbox-circle-line' : 'ri-alert-line'}/>
                                UBO
                              </span>
                            </div>
                          </td>

                          {/* Phone */}
                          <td className="py-3 px-4">
                            <span className="text-[0.8rem] text-defaulttextcolor">
                              {c.phoneNumber || <span className="text-[#cbd5e1]">—</span>}
                            </span>
                          </td>

                          {/* City */}
                          <td className="py-3 px-4">
                            <span className="text-[0.8rem] text-defaulttextcolor">
                              {c.city || <span className="text-[#cbd5e1]">—</span>}
                            </span>
                          </td>

                          {/* Source */}
                          <td className="py-3 px-4">
                            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                              style={{ background: '#dbeafe', color: '#2563eb' }}>
                              {c.signupSource || 'App'}
                            </span>
                          </td>

                          {/* Signed Up */}
                          <td className="py-3 px-4">
                            <p className="text-[0.8rem] font-medium text-defaulttextcolor mb-0">
                              {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                            <p className="text-[0.72rem] text-[#94a3b8] mb-0">{relativeTime(c.createdAt)}</p>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-1.5">
                              <Link href={`/customers/${c.id}`}>
                                <button title="View"
                                  className="w-8 h-8 rounded-lg flex items-center justify-center border border-defaultborder text-[#64748b] hover:border-[#C8A86B] hover:text-[#C8A86B] transition-colors">
                                  <i className="ri-eye-line text-sm"/>
                                </button>
                              </Link>
                              <button title="Approve" disabled={isActing}
                                onClick={() => approve(c.id)}
                                className="w-8 h-8 rounded-lg flex items-center justify-center border transition-colors disabled:opacity-50"
                                style={{ background: '#dcfce7', borderColor: '#bbf7d0', color: '#16a34a' }}>
                                <i className={`${isActing ? 'ri-loader-4-line animate-spin' : 'ri-check-line'} text-sm`}/>
                              </button>
                              <button title="Reject" disabled={isActing}
                                onClick={() => setRejectTarget({ id: c.id, name: c.fullName })}
                                className="w-8 h-8 rounded-lg flex items-center justify-center border transition-colors disabled:opacity-50"
                                style={{ background: '#fee2e2', borderColor: '#fecaca', color: '#dc2626' }}>
                                <i className="ri-close-line text-sm"/>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {!pendingLoading && filteredPending.length > 0 && (
              <PaginationBar
                page={pendingPage} totalPages={pendingTotalPages}
                total={filteredPending.length} label="pending approvals"
                onPage={setPendingPage}
              />
            )}
          </>
        )}

        {/* ══════════════════════════════════════════════════ */}
        {/* ── Tab: Unverified Email ── */}
        {/* ══════════════════════════════════════════════════ */}
        {tab === 'unverified' && (
          <>
            {/* Filter bar */}
            <div className="box p-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] text-sm pointer-events-none"/>
                  <input type="text" value={unverifiedInput}
                    onChange={e => setUnverifiedInput(e.target.value)}
                    placeholder="Search name, email, phone…"
                    className="form-control form-control-sm !pl-9 !pr-8 w-full !rounded-lg"/>
                  {unverifiedInput && (
                    <button onClick={() => setUnverifiedInput('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-defaulttextcolor">
                      <i className="ri-close-line text-sm"/>
                    </button>
                  )}
                </div>
                <p className="text-[0.75rem] text-[#94a3b8] mb-0 flex-shrink-0 whitespace-nowrap">
                  Static OTP: <span className="font-mono font-semibold text-defaulttextcolor">123456</span>
                </p>
              </div>
            </div>

            {/* Table */}
            <div className="box">
              <div className="overflow-x-auto">
                <table className="ti-custom-table ti-custom-table-hover text-sm w-full">
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">Customer</th>
                      <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">Email</th>
                      <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">Phone</th>
                      <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">Signed Up</th>
                      <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unverifiedLoading ? (
                      Array.from({ length: 8 }).map((_, i) => (
                        <tr key={i}>
                          {[180, 220, 110, 100, 50].map((w, j) => (
                            <td key={j} className="py-3 px-4">
                              <div className="h-4 rounded animate-pulse bg-[#f1f5f9]" style={{ width: w }}/>
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : unverifiedItems.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-16 text-center">
                          <div className="flex flex-col items-center gap-3">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                              style={{ background: '#fef3c7' }}>
                              <i className="ri-mail-check-line text-2xl" style={{ color: '#d97706' }}/>
                            </div>
                            <div>
                              <p className="font-semibold text-defaulttextcolor mb-0.5">No unverified customers</p>
                              <p className="text-[0.78rem] text-[#94a3b8] mb-0">
                                {unverifiedSearch ? 'No results match the search.' : 'All customers have verified their email.'}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : unverifiedItems.map((c: any) => {
                      const ac = avatarColor(c.fullName || '');
                      const ai = avatarInitials(c.fullName || '');

                      return (
                        <tr key={c.id} style={{ borderLeft: '3px solid #d97706' }} className="group">
                          {/* Customer */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                                style={{ background: ac }}>
                                {ai}
                              </div>
                              <span className="font-semibold text-[0.85rem] text-defaulttextcolor">{c.fullName}</span>
                            </div>
                          </td>

                          {/* Email */}
                          <td className="py-3 px-4">
                            <span className="text-[0.78rem] text-[#64748b] font-mono">{c.email}</span>
                          </td>

                          {/* Phone */}
                          <td className="py-3 px-4">
                            <span className="text-[0.8rem] text-defaulttextcolor">
                              {c.phoneNumber || <span className="text-[#cbd5e1]">—</span>}
                            </span>
                          </td>

                          {/* Signed Up */}
                          <td className="py-3 px-4">
                            <p className="text-[0.8rem] font-medium text-defaulttextcolor mb-0">
                              {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                            <p className="text-[0.72rem] text-[#94a3b8] mb-0">{relativeTime(c.createdAt)}</p>
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center">
                              <Link href={`/customers/${c.id}`}>
                                <button title="View customer"
                                  className="w-8 h-8 rounded-lg flex items-center justify-center border border-defaultborder text-[#64748b] hover:border-[#C8A86B] hover:text-[#C8A86B] transition-colors">
                                  <i className="ri-eye-line text-sm"/>
                                </button>
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {!unverifiedLoading && unverifiedTotal > 0 && (
              <PaginationBar
                page={unverifiedPage} totalPages={unverifiedTotalPages}
                total={unverifiedTotal} label="unverified customers"
                onPage={setUnverifiedPage}
              />
            )}
          </>
        )}
      </div>

      {/* ── Reject Modal ── */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-bodybg rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#fee2e2' }}>
                <i className="ri-user-unfollow-line text-lg" style={{ color: '#dc2626' }}/>
              </div>
              <div>
                <h3 className="text-[1rem] font-bold text-defaulttextcolor mb-0">Reject Account</h3>
                <p className="text-[0.75rem] text-[#94a3b8]">Customer will be notified by email</p>
              </div>
            </div>
            <div className="rounded-xl p-3 mb-4" style={{ background: '#fff5f5' }}>
              <p className="font-semibold text-[0.85rem] text-[#dc2626] mb-0">{rejectTarget.name}</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-defaulttextcolor mb-1.5">
                Reason <span className="text-[#94a3b8] font-normal">(optional — included in email)</span>
              </label>
              <textarea className="form-control !rounded-xl" rows={3}
                placeholder="e.g. Incomplete KYC documents, please resubmit"
                value={rejectReason} onChange={e => setRejectReason(e.target.value)}/>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setRejectTarget(null); setRejectReason(''); }}
                disabled={submittingReject}
                className="ti-btn ti-btn-light !rounded-xl">
                Cancel
              </button>
              <button onClick={confirmReject} disabled={submittingReject}
                className="ti-btn !rounded-xl !text-white font-semibold"
                style={{ background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)' }}>
                {submittingReject
                  ? <><i className="ri-loader-4-line animate-spin mr-1"/>Rejecting…</>
                  : <><i className="ri-close-circle-line mr-1"/>Confirm Reject</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
