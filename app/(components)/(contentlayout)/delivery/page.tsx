'use client';

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://hbc-api.semis.app/api';

type Request = {
  id: string;
  collectionNumber: string;
  quantityGrams: number;
  deliveryMethod: string;
  status: string;
  paymentStatus: string;
  totalCharge: number;
  makingChargeAmount: number;
  trackingNumber?: string;
  preferredDate?: string;
  createdAt: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  itemCount: number;
};

type StatusCount = { status: string; count: number };

const STATUS_ORDER = ['Requested', 'Approved', 'Preparing', 'Shipped', 'Delivered', 'Cancelled'];

const STATUS_COLOUR: Record<string, string> = {
  Requested: 'bg-yellow-500/10 text-yellow-700',
  Approved:  'bg-blue-500/10 text-blue-700',
  Preparing: 'bg-purple-500/10 text-purple-700',
  Shipped:   'bg-indigo-500/10 text-indigo-700',
  Delivered: 'bg-green-500/10 text-green-700',
  Cancelled: 'bg-red-500/10 text-red-700',
};

export default function DeliveryListPage() {
  useProtectedRoute();

  const [items, setItems] = useState<Request[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [statusCounts, setStatusCounts] = useState<StatusCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [deliveryMethod, setDeliveryMethod] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const pageSize = 25;

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true); setError(null);
      try {
        const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
        if (status) params.set('status', status);
        if (deliveryMethod) params.set('deliveryMethod', deliveryMethod);
        if (debouncedSearch) params.set('search', debouncedSearch);
        const r = await fetch(`${API}/delivery/admin/requests?${params}`, { headers: getAuthHeaders() });
        if (cancelled) return;
        const d = await r.json();
        const data = d?.data || d;
        setItems(data?.items || []);
        setTotalCount(data?.totalCount || 0);
        setStatusCounts(data?.statusCounts || []);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [page, status, deliveryMethod, debouncedSearch]);

  const totalPages = Math.ceil(totalCount / pageSize);
  const countFor = (s: string) => statusCounts.find(c => c.status === s)?.count ?? 0;

  return (
    <Fragment>
      <div className="md:flex block items-center justify-between my-[1.5rem] page-header-breadcrumb">
        <div>
          <p className="font-semibold text-[1.125rem] text-defaulttextcolor dark:text-defaulttextcolor/70 !mb-0">
            Delivery Requests
          </p>
          <p className="font-normal text-[#8c9097] dark:text-white/50 text-[0.813rem]">
            Customer collection / shipping requests across all customers
          </p>
        </div>
      </div>

      {/* Status filter chips with counts */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => { setStatus(''); setPage(1); }}
          className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
            status === '' ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        {STATUS_ORDER.map(s => (
          <button
            key={s}
            onClick={() => { setStatus(s); setPage(1); }}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full transition-colors ${
              status === s ? 'bg-primary text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {s} <span className={`ml-1 text-[10px] ${status === s ? 'opacity-80' : 'opacity-60'}`}>({countFor(s)})</span>
          </button>
        ))}
      </div>

      {/* Method + search */}
      <div className="box mb-4">
        <div className="box-body grid grid-cols-1 md:grid-cols-3 gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search customer name / email / collection #"
            className="form-control"
          />
          <select
            value={deliveryMethod}
            onChange={(e) => { setDeliveryMethod(e.target.value); setPage(1); }}
            className="form-select"
          >
            <option value="">All delivery methods</option>
            <option value="Pickup">Pickup (store)</option>
            <option value="HomeDelivery">Home Delivery</option>
          </select>
          <button
            onClick={() => { setStatus(''); setDeliveryMethod(''); setSearch(''); setPage(1); }}
            className="ti-btn ti-btn-light"
          >
            Reset filters
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 mb-4 bg-danger/40 text-sm border-t-4 border-danger text-danger/60 rounded-lg">
          {error}
        </div>
      )}

      <div className="box">
        {loading ? (
          <div className="box-body text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary inline-block"></div>
            <p className="mt-4 text-[#8c9097]">Loading delivery requests...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="box-body text-center py-12">
            <i className="ri-truck-line text-5xl text-gray-400 block mb-2"></i>
            <p className="text-[#8c9097]">No delivery requests {status ? `in ${status} state` : 'found'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ti-custom-table ti-striped-table ti-custom-table-hover">
              <thead>
                <tr>
                  <th>Collection #</th>
                  <th>Customer</th>
                  <th>Method</th>
                  <th>Grams</th>
                  <th>Charge</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map(r => (
                  <tr key={r.id}>
                    <td>
                      <span className="font-mono font-semibold text-sm">{r.collectionNumber || '—'}</span>
                      {r.itemCount > 0 && <div className="text-[0.7rem] text-gray-400">{r.itemCount} item{r.itemCount === 1 ? '' : 's'}</div>}
                    </td>
                    <td>
                      <Link href={`/customers/${r.customerId}`} className="text-primary text-sm hover:underline">
                        {r.customerName.trim() || r.customerEmail}
                      </Link>
                      <div className="text-[0.7rem] text-gray-400">{r.customerPhone || r.customerEmail}</div>
                    </td>
                    <td>
                      <span className={`badge px-2 py-1 rounded text-xs ${r.deliveryMethod === 'HomeDelivery' ? 'bg-blue-500/10 text-blue-700' : 'bg-gray-500/10 text-gray-700'}`}>
                        {r.deliveryMethod === 'HomeDelivery' ? 'Home' : 'Pickup'}
                      </span>
                    </td>
                    <td><span className="font-mono text-sm font-semibold">{r.quantityGrams?.toFixed(2)}g</span></td>
                    <td>
                      <span className="font-semibold text-sm">Rs. {(r.totalCharge || 0).toLocaleString()}</span>
                      {r.makingChargeAmount > 0 && (
                        <div className="text-[0.7rem] text-warning">+making Rs. {r.makingChargeAmount.toLocaleString()}</div>
                      )}
                    </td>
                    <td>
                      <span className={`badge px-2 py-1 rounded text-xs ${STATUS_COLOUR[r.status] || 'bg-gray-500/10 text-gray-700'}`}>
                        {r.status}
                      </span>
                      {r.trackingNumber && <div className="text-[0.7rem] text-gray-400 font-mono mt-1">trk: {r.trackingNumber}</div>}
                    </td>
                    <td className="text-[0.813rem] whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleDateString('en-NP')}
                      <div className="text-[0.7rem] text-gray-400">
                        {new Date(r.createdAt).toLocaleTimeString('en-NP', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td>
                      <Link href={`/delivery/${r.id}`}>
                        <button className="ti-btn ti-btn-sm ti-btn-light !opacity-100">View</button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {!loading && totalPages > 1 && (
        <div className="box mt-4">
          <div className="box-body flex items-center justify-between flex-wrap gap-4">
            <p className="text-[0.813rem] text-[#8c9097] mb-0">
              Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalCount)} of {totalCount}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-[0.813rem] border border-defaultborder rounded-sm hover:bg-primary hover:text-white disabled:opacity-50 disabled:pointer-events-none transition-colors">
                &laquo; Prev
              </button>
              <span className="px-3 py-1.5 text-[0.813rem]">Page {page} of {totalPages}</span>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
                className="px-3 py-1.5 text-[0.813rem] border border-defaultborder rounded-sm hover:bg-primary hover:text-white disabled:opacity-50 disabled:pointer-events-none transition-colors">
                Next &raquo;
              </button>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
}
