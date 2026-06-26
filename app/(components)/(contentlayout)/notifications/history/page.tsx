'use client';

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { useDebouncedSearch } from '@/shared/hooks/useDebouncedSearch';
import { Pagination } from '@/shared/components/Pagination';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL;

type Row = {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  category?: string | null;
  title: string;
  body: string;
  status: string;
  deviceCount: number;
  successCount: number;
  failureReason?: string | null;
  createdAt: string;
};

const STATUS_COLOR: Record<string, string> = {
  Sent: 'success',
  PartialFailure: 'warning',
  Failed: 'danger',
  NoDevices: 'gray-400',
  FilteredByPrefs: 'info',
  ApnsNotConfigured: 'gray-400',
};

const CATEGORY_OPTIONS = [
  '', 'target_completed', 'payment_success', 'collection_reminder',
  'kyc_approved', 'promotional', 'admin_manual', 'admin_broadcast', 'buyback',
];

export default function NotificationHistoryPage() {
  useProtectedRoute();
  const [rows, setRows] = useState<Row[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const search = useDebouncedSearch('', 300);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (category) params.set('category', category);
      if (status) params.set('status', status);
      if (search.value.trim()) params.set('search', search.value.trim());
      const r = await fetch(`${API}/push/admin/history?${params}`, { headers: getAuthHeaders() });
      const d = await r.json();
      setRows(d?.data || []);
      setTotalCount(d?.totalCount || 0);
    } catch { toast.error('Failed to load notification history'); }
    finally { setLoading(false); }
  };

  useEffect(() => { setPage(1); }, [category, status, search.value, pageSize]);
  useEffect(() => { load(); }, [page, pageSize, category, status, search.value]);

  return (
    <Fragment>
      <div className="md:flex items-center justify-between my-[1.5rem] gap-3">
        <div>
          <p className="font-semibold text-[1.125rem] !mb-0">Notification History</p>
          <p className="text-[0.813rem] text-[#8c9097]">
            Every push we tried to send, with delivery status.
            <Link href="/notifications" className="text-primary ms-2">← Composer</Link>
          </p>
        </div>
      </div>

      <div className="box mb-4">
        <div className="box-body grid grid-cols-1 md:grid-cols-4 gap-3">
          <input
            type="text"
            value={search.immediate}
            onChange={e => search.setValue(e.target.value)}
            placeholder="Search title / body…"
            className="form-control md:col-span-2"
          />
          <select className="form-select" value={category} onChange={e => setCategory(e.target.value)}>
            {CATEGORY_OPTIONS.map(c => (
              <option key={c} value={c}>{c === '' ? 'All categories' : c}</option>
            ))}
          </select>
          <select className="form-select" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="Sent">Sent</option>
            <option value="PartialFailure">Partial failure</option>
            <option value="Failed">Failed</option>
            <option value="NoDevices">No devices</option>
            <option value="FilteredByPrefs">Filtered by prefs</option>
            <option value="ApnsNotConfigured">APNs not configured</option>
          </select>
        </div>
      </div>

      <div className="box">
        <div className="box-body">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary inline-block"></div>
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">
              {category || status || search.value ? 'No notifications match your filters.' : 'No notifications recorded yet — send your first one from /notifications.'}
            </p>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="ti-custom-table ti-striped-table ti-custom-table-hover min-w-[640px] sm:min-w-0">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase">
                    <th className="text-left p-2">Sent</th>
                    <th className="text-left p-2 hidden md:table-cell">Recipient</th>
                    <th className="text-left p-2">Title</th>
                    <th className="text-left p-2 hidden lg:table-cell">Category</th>
                    <th className="text-center p-2">Delivery</th>
                    <th className="text-center p-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(r => {
                    const isOpen = expanded === r.id;
                    const color = STATUS_COLOR[r.status] || 'secondary';
                    return (
                      <Fragment key={r.id}>
                        <tr
                          className="border-t hover:bg-gray-50 cursor-pointer"
                          onClick={() => setExpanded(isOpen ? null : r.id)}
                        >
                          <td className="p-2 text-[0.813rem] whitespace-nowrap">
                            {new Date(r.createdAt).toLocaleDateString('en-NP')}
                            <div className="text-[0.7rem] text-gray-400">
                              {new Date(r.createdAt).toLocaleTimeString('en-NP', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </td>
                          <td className="p-2 hidden md:table-cell">
                            <Link href={`/customers/${r.customerId}`} className="text-primary text-sm hover:underline">
                              {r.customerName || r.customerEmail}
                            </Link>
                            <div className="text-[0.7rem] text-gray-400">{r.customerEmail}</div>
                          </td>
                          <td className="p-2">
                            <div className="font-semibold text-sm truncate max-w-[260px]" title={r.title}>{r.title}</div>
                            <div className="text-[0.7rem] text-gray-500 truncate max-w-[260px]" title={r.body}>{r.body}</div>
                            <div className="md:hidden text-[0.7rem] text-primary mt-1 truncate max-w-[200px]">
                              {r.customerName || r.customerEmail}
                            </div>
                          </td>
                          <td className="p-2 hidden lg:table-cell">
                            {r.category
                              ? <span className="badge bg-primary/10 text-primary text-[10px] px-2 py-0.5 rounded">{r.category}</span>
                              : <span className="text-[0.7rem] text-gray-400">—</span>}
                          </td>
                          <td className="p-2 text-center font-mono text-xs">
                            {r.successCount}/{r.deviceCount}
                          </td>
                          <td className="p-2 text-center">
                            <span className={`badge bg-${color}/20 text-${color} text-[10px] px-2 py-0.5 rounded`}>
                              {r.status}
                            </span>
                          </td>
                        </tr>
                        {isOpen && (
                          <tr className="bg-gray-50">
                            <td colSpan={6} className="p-4 text-xs">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                  <p className="text-gray-500 mb-1 uppercase tracking-wide">Title</p>
                                  <p className="font-semibold">{r.title}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 mb-1 uppercase tracking-wide">Body</p>
                                  <p className="whitespace-pre-wrap">{r.body}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 mb-1 uppercase tracking-wide">Recipient</p>
                                  <Link href={`/customers/${r.customerId}`} className="text-primary hover:underline font-semibold">
                                    {r.customerName || r.customerEmail}
                                  </Link>
                                  <p className="text-gray-400 mt-0.5">{r.customerEmail}</p>
                                </div>
                                <div>
                                  <p className="text-gray-500 mb-1 uppercase tracking-wide">Delivery</p>
                                  <p>
                                    <span className="font-mono">{r.successCount}</span> of <span className="font-mono">{r.deviceCount}</span> devices ·
                                    <span className={`badge bg-${color}/20 text-${color} text-[10px] px-2 py-0.5 rounded ms-1`}>{r.status}</span>
                                  </p>
                                </div>
                                {r.failureReason && (
                                  <div className="md:col-span-2">
                                    <p className="text-gray-500 mb-1 uppercase tracking-wide">Failure reason</p>
                                    <pre className="bg-white border rounded p-2 text-xs whitespace-pre-wrap break-all">{r.failureReason}</pre>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        {!loading && totalCount > 0 && (
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
