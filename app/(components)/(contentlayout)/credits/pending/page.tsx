'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL;
const IMAGE_BASE = (API ?? '').replace(/\/api\/?$/, '');

type PendingDeposit = {
  id: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  paymentMethod?: string;
  referenceNumber?: string;
  receiptImageUrl?: string;
  createdAt: string;
};

function fmtDateTime(s: string) {
  return new Date(s).toLocaleString('en-NP', { dateStyle: 'short', timeStyle: 'short' });
}

function relativeTime(s: string) {
  const diff = Date.now() - new Date(s).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const AVATAR_COLORS = ['#C8A86B','#6366f1','#0891b2','#16a34a','#dc2626','#9333ea','#ea580c','#0284c7'];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xfffffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function avatarInitials(name: string) {
  const p = name.trim().split(/\s+/);
  return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

export default function PendingDepositsPage() {
  useProtectedRoute();
  const [items, setItems] = useState<PendingDeposit[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PendingDeposit | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  const absoluteUrl = (u?: string) =>
    !u ? null : u.startsWith('http') ? u : `${IMAGE_BASE}${u.startsWith('/') ? u : '/' + u}`;

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
      const r = await fetch(`${API}/credits/deposits/pending?${params}`, { headers: getAuthHeaders() });
      const d = await r.json();
      setItems(d?.data || []);
      setTotalCount(d?.totalCount || 0);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { setPage(1); }, [debouncedSearch]);
  useEffect(() => { load(); }, [page, debouncedSearch]);

  const verify = async (id: string) => {
    setActing(id);
    try {
      const r = await fetch(`${API}/credits/deposits/${id}/verify`, {
        method: 'PUT', headers: getAuthHeaders(),
      });
      const d = await r.json();
      if (!r.ok || d?.success === false) toast.error(d?.message || 'Verify failed');
      else { toast.success('Deposit verified — wallet credited'); load(); }
    } finally { setActing(null); }
  };

  const reject = async () => {
    if (!rejectTarget) return;
    setActing(rejectTarget.id);
    try {
      const r = await fetch(`${API}/credits/deposits/${rejectTarget.id}/reject`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason || null }),
      });
      const d = await r.json();
      if (!r.ok || d?.success === false) toast.error(d?.message || 'Reject failed');
      else { toast.success('Deposit rejected'); load(); }
    } finally {
      setActing(null);
      setRejectTarget(null);
      setRejectReason('');
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize);
  const totalPending = items.reduce((acc, i) => acc + (i.amount || 0), 0);
  const oldest = items.length > 0 ? items[items.length - 1].createdAt : null;

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
    else {
      pages.push(1);
      if (page > 3) pages.push('...');
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <Fragment>
      {/* Page header */}
      <div className="md:flex items-center justify-between my-[1.5rem] gap-4">
        <div>
          <p className="font-semibold text-[1.125rem] text-defaulttextcolor !mb-0 flex items-center gap-2">
            <span
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
              style={{ background: '#fef3c7' }}
            >
              <i className="ri-time-line text-[#b45309] text-base"></i>
            </span>
            Pending Deposits
          </p>
          <p className="text-[0.813rem] text-[#8c9097] mt-1 mb-0">Bank-transfer receipts waiting on admin verification</p>
        </div>
        <div className="flex gap-2 items-center mt-2 md:mt-0">
          <div className="relative">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-[#8c9097] text-sm pointer-events-none"></i>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search customer / reference…"
              className="form-control !w-56"
              style={{ paddingLeft: '2.25rem' }}
            />
          </div>
          <Link href="/credits">
            <button
              className="px-3 py-2 text-[0.813rem] font-medium rounded-md whitespace-nowrap flex items-center gap-1.5"
              style={{ border: '1px solid #e2e8f0', color: '#64748b', background: '#f8fafc' }}
            >
              <i className="ri-arrow-left-line"></i>Ledger
            </button>
          </Link>
        </div>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        <div className="box p-4 flex items-center gap-3" style={{ borderLeft: '3px solid #f59e0b' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#fef3c7' }}>
            <i className="ri-time-line text-lg" style={{ color: '#b45309' }}></i>
          </div>
          <div>
            <p className="text-[11px] text-[#64748b] font-medium uppercase tracking-wide mb-0.5">
              Pending{debouncedSearch ? ' (filtered)' : ''}
            </p>
            <p className="text-[1rem] font-bold text-defaulttextcolor mb-0">{totalCount}</p>
          </div>
        </div>
        <div className="box p-4 flex items-center gap-3" style={{ borderLeft: '3px solid #22c55e' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#dcfce7' }}>
            <i className="ri-money-dollar-circle-line text-lg" style={{ color: '#16a34a' }}></i>
          </div>
          <div>
            <p className="text-[11px] text-[#64748b] font-medium uppercase tracking-wide mb-0.5">Total Amount</p>
            <p className="text-[1rem] font-bold text-defaulttextcolor mb-0">Rs. {totalPending.toLocaleString()}</p>
          </div>
        </div>
        <div className="box p-4 flex items-center gap-3" style={{ borderLeft: '3px solid #6366f1' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: '#ede9fe' }}>
            <i className="ri-calendar-line text-lg" style={{ color: '#6d28d9' }}></i>
          </div>
          <div>
            <p className="text-[11px] text-[#64748b] font-medium uppercase tracking-wide mb-0.5">Oldest Pending</p>
            <p className="text-[0.875rem] font-bold text-defaulttextcolor mb-0">
              {oldest ? new Date(oldest).toLocaleDateString('en-NP') : '—'}
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="box p-4">
              <div className="flex items-start justify-between mb-3">
                <div className="space-y-2">
                  <div className="h-4 rounded animate-pulse bg-[#f1f5f9] w-32"></div>
                  <div className="h-3 rounded animate-pulse bg-[#f1f5f9] w-44"></div>
                </div>
                <div className="space-y-2 text-right">
                  <div className="h-5 rounded animate-pulse bg-[#f1f5f9] w-24"></div>
                  <div className="h-3 rounded animate-pulse bg-[#f1f5f9] w-20"></div>
                </div>
              </div>
              <div className="h-40 rounded-xl animate-pulse bg-[#f1f5f9] w-full mb-3"></div>
              <div className="flex gap-2">
                <div className="flex-1 h-9 rounded animate-pulse bg-[#f1f5f9]"></div>
                <div className="w-24 h-9 rounded animate-pulse bg-[#f1f5f9]"></div>
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="box">
          <div className="box-body text-center py-16">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#dcfce7' }}>
              <i className="ri-checkbox-circle-line text-3xl" style={{ color: '#16a34a' }}></i>
            </div>
            <p className="text-[#64748b] font-medium mb-1">All caught up!</p>
            <p className="text-[#8c9097] text-sm">
              {debouncedSearch ? 'No pending deposits match your search.' : 'No pending deposits awaiting review.'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {items.map(d => {
            const imgUrl = absoluteUrl(d.receiptImageUrl);
            const label = d.customerName?.trim() || d.customerEmail;
            return (
              <div
                key={d.id}
                className="box overflow-hidden"
                style={{ borderLeft: '3px solid #f59e0b' }}
              >
                <div className="p-4">
                  {/* Card header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                        style={{ background: avatarColor(label), fontSize: 12 }}
                      >
                        {avatarInitials(label)}
                      </div>
                      <div>
                        <p className="font-semibold text-[0.875rem] text-defaulttextcolor mb-0">{label}</p>
                        <p className="text-xs text-[#8c9097] mb-0">{d.customerEmail}</p>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ms-2">
                      <p className="text-lg font-bold mb-0" style={{ color: '#15803d' }}>Rs. {d.amount?.toLocaleString()}</p>
                      <p className="text-xs text-[#8c9097] mb-0">{relativeTime(d.createdAt)}</p>
                    </div>
                  </div>

                  {/* Meta row */}
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="p-2.5 rounded-lg" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <p className="text-[10px] text-[#64748b] font-medium uppercase tracking-wide mb-0.5">Method</p>
                      <p className="text-[0.75rem] font-semibold text-defaulttextcolor mb-0">{d.paymentMethod || '—'}</p>
                    </div>
                    <div className="p-2.5 rounded-lg" style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                      <p className="text-[10px] text-[#64748b] font-medium uppercase tracking-wide mb-0.5">Reference</p>
                      <p className="text-[0.75rem] font-semibold font-mono text-defaulttextcolor mb-0 truncate">{d.referenceNumber || '—'}</p>
                    </div>
                  </div>

                  {/* Receipt image */}
                  {imgUrl ? (
                    <button
                      onClick={() => setLightboxUrl(imgUrl)}
                      className="block w-full overflow-hidden rounded-xl hover:opacity-90 transition-opacity mb-4 relative group"
                      style={{ border: '1px solid #e2e8f0' }}
                      title="Click to enlarge"
                    >
                      <img src={imgUrl} alt="Receipt" className="w-full h-40 object-cover bg-gray-50" />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl" style={{ background: 'rgba(0,0,0,0.3)' }}>
                        <span className="text-white text-sm font-medium flex items-center gap-1">
                          <i className="ri-zoom-in-line"></i> Enlarge
                        </span>
                      </div>
                    </button>
                  ) : (
                    <div className="text-center py-8 rounded-xl mb-4" style={{ background: '#f8fafc', border: '1px dashed #e2e8f0' }}>
                      <i className="ri-image-off-line text-2xl block mb-1 text-[#8c9097]"></i>
                      <p className="text-xs text-[#8c9097] mb-0">No receipt uploaded</p>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => verify(d.id)}
                      disabled={acting === d.id}
                      className="flex-1 px-3 py-2 text-[0.813rem] font-medium rounded-md text-white flex items-center justify-center gap-1.5 disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg,#22c55e 0%,#16a34a 100%)' }}
                    >
                      {acting === d.id
                        ? <><i className="ri-loader-4-line animate-spin"></i>Verifying…</>
                        : <><i className="ri-check-line"></i>Verify & Credit</>}
                    </button>
                    <button
                      onClick={() => setRejectTarget(d)}
                      disabled={acting === d.id}
                      className="px-3 py-2 text-[0.813rem] font-medium rounded-md text-white flex items-center gap-1.5 disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg,#ef4444 0%,#dc2626 100%)' }}
                    >
                      <i className="ri-close-line"></i>Reject
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalCount > pageSize && (
        <div className="box mt-4">
          <div className="box-body flex items-center justify-between flex-wrap gap-4">
            <p className="text-[0.813rem] text-[#8c9097] mb-0">
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount} deposits
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-[0.813rem] border border-defaultborder rounded-sm text-defaulttextcolor hover:border-[#C8A86B] hover:text-[#C8A86B] disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                &laquo; Prev
              </button>
              {getPageNumbers().map((pg, idx) =>
                pg === '...' ? (
                  <span key={idx} className="px-3 py-1.5 text-[0.813rem] text-[#8c9097]">…</span>
                ) : (
                  <button
                    key={idx}
                    onClick={() => setPage(pg as number)}
                    className="px-3 py-1.5 text-[0.813rem] border rounded-sm transition-all"
                    style={
                      page === pg
                        ? { background: 'linear-gradient(135deg,#C8A86B 0%,#a8863d 100%)', color: '#fff', border: '1px solid #C8A86B' }
                        : { border: '1px solid var(--defaultborder)', color: 'var(--defaulttextcolor)' }
                    }
                  >
                    {pg}
                  </button>
                )
              )}
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-[0.813rem] border border-defaultborder rounded-sm text-defaulttextcolor hover:border-[#C8A86B] hover:text-[#C8A86B] disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                Next &raquo;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Receipt lightbox */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0,0,0,0.85)' }}
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-w-4xl max-h-full" onClick={e => e.stopPropagation()}>
            <button onClick={() => setLightboxUrl(null)} className="absolute -top-10 right-0 text-white text-2xl hover:text-gray-300">
              <i className="ri-close-line"></i>
            </button>
            <img
              src={lightboxUrl}
              alt="Receipt"
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            />
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <div
          className="fixed inset-0 flex items-center justify-center z-50 p-4"
          style={{ background: 'rgba(0,0,0,0.5)' }}
        >
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden">
            {/* Modal icon header */}
            <div className="p-5 text-center" style={{ background: '#fff5f5' }}>
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                style={{ background: '#fee2e2' }}
              >
                <i className="ri-close-circle-line text-2xl" style={{ color: '#dc2626' }}></i>
              </div>
              <p className="font-semibold text-[1rem] text-defaulttextcolor mb-0">Reject Deposit</p>
              <p className="text-[0.75rem] text-[#8c9097] mb-0">This action will notify the customer</p>
            </div>

            <div className="p-5">
              {/* Preview box */}
              <div className="p-3 rounded-xl mb-4" style={{ background: '#fff5f5', border: '1px solid #fca5a5' }}>
                <p className="text-[0.813rem] font-semibold text-defaulttextcolor mb-0">{rejectTarget.customerName}</p>
                <p className="text-[0.75rem] text-[#8c9097] mb-0">{rejectTarget.customerEmail}</p>
                <p className="text-base font-bold mt-1 mb-0" style={{ color: '#dc2626' }}>
                  Rs. {rejectTarget.amount?.toLocaleString()}
                </p>
              </div>

              <textarea
                rows={3}
                value={rejectReason}
                onChange={e => setRejectReason(e.target.value)}
                placeholder="Reason for rejection (optional — shown to customer)"
                className="form-control mb-4"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => { setRejectTarget(null); setRejectReason(''); }}
                  className="flex-1 px-3 py-2 text-[0.813rem] font-medium rounded-md"
                  style={{ border: '1px solid #e2e8f0', color: '#64748b', background: '#f8fafc' }}
                >
                  Cancel
                </button>
                <button
                  onClick={reject}
                  className="flex-1 px-3 py-2 text-[0.813rem] font-medium rounded-md text-white"
                  style={{ background: 'linear-gradient(135deg,#ef4444 0%,#dc2626 100%)' }}
                >
                  Confirm Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
}
