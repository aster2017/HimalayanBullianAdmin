'use client';

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { useDebouncedSearch } from '@/shared/hooks/useDebouncedSearch';
import { Pagination } from '@/shared/components/Pagination';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://hbc-api.semis.app/api';
const IMAGE_BASE = API.replace(/\/api\/?$/, '');

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

export default function PendingDepositsPage() {
  useProtectedRoute();
  const [items, setItems] = useState<PendingDeposit[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [rejectTarget, setRejectTarget] = useState<PendingDeposit | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const search = useDebouncedSearch('', 300);

  const absoluteUrl = (u?: string) =>
    !u ? null : u.startsWith('http') ? u : `${IMAGE_BASE}${u.startsWith('/') ? u : '/' + u}`;

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (search.value.trim()) params.set('search', search.value.trim());
      const r = await fetch(`${API}/credits/deposits/pending?${params}`, { headers: getAuthHeaders() });
      const d = await r.json();
      setItems(d?.data || []);
      setTotalCount(d?.totalCount || 0);
    } catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { setPage(1); }, [search.value, pageSize]);
  useEffect(() => { load(); }, [page, pageSize, search.value]);

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

  const totalPending = items.reduce((acc, i) => acc + (i.amount || 0), 0);

  return (
    <Fragment>
      <div className="md:flex items-center justify-between my-[1.5rem] gap-4">
        <div>
          <p className="font-semibold text-[1.125rem] !mb-0">Pending Deposits</p>
          <p className="text-[0.813rem] text-[#8c9097]">Bank-transfer receipts waiting on admin verification</p>
        </div>
        <div className="flex gap-2 items-center mt-2 md:mt-0">
          <input
            type="text"
            value={search.immediate}
            onChange={e => search.setValue(e.target.value)}
            placeholder="Search customer / reference…"
            className="form-control w-full md:w-56"
          />
          <Link href="/credits">
            <button className="ti-btn ti-btn-light whitespace-nowrap">← Ledger</button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-5">
        <div className="box p-4">
          <p className="text-xs text-gray-500 uppercase">Pending count{search.value ? ' (filtered)' : ''}</p>
          <p className="text-xl font-bold text-warning">{totalCount}</p>
        </div>
        <div className="box p-4">
          <p className="text-xs text-gray-500 uppercase">Total amount</p>
          <p className="text-xl font-bold">Rs. {totalPending.toLocaleString()}</p>
        </div>
        <div className="box p-4">
          <p className="text-xs text-gray-500 uppercase">Oldest</p>
          <p className="text-sm font-bold">
            {items.length === 0 ? '—' : new Date(items[0].createdAt).toLocaleDateString('en-NP')}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="box"><div className="box-body text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary inline-block"></div>
          <p className="mt-4 text-[#8c9097]">Loading pending deposits…</p>
        </div></div>
      ) : items.length === 0 ? (
        <div className="box"><div className="box-body text-center py-12">
          <i className="ri-checkbox-circle-line text-5xl text-green-500 block mb-2 opacity-60"></i>
          <p className="text-[#8c9097]">All caught up — no pending deposits</p>
        </div></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {items.map(d => {
            const imgUrl = absoluteUrl(d.receiptImageUrl);
            return (
              <div key={d.id} className="box overflow-hidden">
                <div className="box-body p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-semibold">{d.customerName}</p>
                      <p className="text-xs text-gray-500">{d.customerEmail}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-success">Rs. {d.amount?.toLocaleString()}</p>
                      <p className="text-xs text-gray-400">{new Date(d.createdAt).toLocaleString('en-NP', { dateStyle: 'short', timeStyle: 'short' })}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                    <div>
                      <span className="text-gray-500">Method:</span>
                      <span className="ms-1 font-semibold">{d.paymentMethod || '—'}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Reference:</span>
                      <span className="ms-1 font-mono">{d.referenceNumber || '—'}</span>
                    </div>
                  </div>

                  {imgUrl ? (
                    <button
                      onClick={() => setLightboxUrl(imgUrl)}
                      className="block w-full border rounded overflow-hidden hover:border-primary transition-colors"
                      title="Click to enlarge"
                    >
                      <img src={imgUrl} alt="Receipt" className="w-full h-40 object-cover bg-gray-50" />
                    </button>
                  ) : (
                    <div className="text-center py-6 bg-gray-50 rounded text-xs text-gray-400">
                      <i className="ri-image-off-line text-2xl block mb-1"></i>
                      No receipt image uploaded
                    </div>
                  )}

                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => verify(d.id)}
                      disabled={acting === d.id}
                      className="flex-1 ti-btn ti-btn-success !text-white !bg-success !opacity-100"
                    >
                      {acting === d.id ? '...' : '✓ Verify & Credit Wallet'}
                    </button>
                    <button
                      onClick={() => setRejectTarget(d)}
                      disabled={acting === d.id}
                      className="ti-btn ti-btn-danger !text-white !bg-danger !opacity-100"
                    >
                      ✗ Reject
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && totalCount > 0 && (
        <div className="box mt-4">
          <div className="box-body">
            <Pagination
              page={page}
              pageSize={pageSize}
              totalCount={totalCount}
              onPageChange={setPage}
              pageSizeOptions={[25, 50, 100]}
              onPageSizeChange={setPageSize}
            />
          </div>
        </div>
      )}

      {/* Image lightbox */}
      {lightboxUrl && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setLightboxUrl(null)}>
          <div className="relative max-w-4xl max-h-full">
            <button onClick={() => setLightboxUrl(null)} className="absolute -top-10 right-0 text-white text-2xl hover:text-gray-300">
              <i className="ri-close-line"></i>
            </button>
            <img src={lightboxUrl} alt="Receipt" className="max-w-full max-h-[85vh] object-contain rounded shadow-2xl" onClick={e => e.stopPropagation()} />
          </div>
        </div>
      )}

      {/* Reject modal */}
      {rejectTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full shadow-lg">
            <h3 className="text-lg font-semibold mb-2">Reject Deposit</h3>
            <p className="text-gray-600 text-sm mb-4">
              Reject the Rs. {rejectTarget.amount?.toLocaleString()} deposit from <strong>{rejectTarget.customerName}</strong>?
              The customer will be notified.
            </p>
            <textarea
              rows={3}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (optional — shown to customer)"
              className="form-control mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setRejectTarget(null); setRejectReason(''); }} className="btn btn-outline-secondary">Cancel</button>
              <button onClick={reject} className="btn btn-danger !text-white !bg-danger !opacity-100">Confirm Reject</button>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
}
