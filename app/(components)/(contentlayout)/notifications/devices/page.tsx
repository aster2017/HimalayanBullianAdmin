'use client';

import { Fragment, useEffect, useState } from 'react';
import Link from 'next/link';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { useDebouncedSearch } from '@/shared/hooks/useDebouncedSearch';
import { Pagination } from '@/shared/components/Pagination';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';
import { useDialog } from '@/shared/context/DialogContext';

const API = process.env.NEXT_PUBLIC_API_URL;

type Device = {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  tokenPreview: string;
  platform: string;
  appVersion?: string | null;
  isActive: boolean;
  createdAt: string;
  lastUsedAt?: string | null;
};

export default function DevicesPage() {
  useProtectedRoute();
  const { confirm } = useDialog();
  const [rows, setRows] = useState<Device[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [onlyActive, setOnlyActive] = useState(true);
  const search = useDebouncedSearch('', 300);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (onlyActive) params.set('onlyActive', 'true');
      if (search.value.trim()) params.set('search', search.value.trim());
      const r = await fetch(`${API}/push/admin/devices?${params}`, { headers: getAuthHeaders() });
      const d = await r.json();
      setRows(d?.data || []);
      setTotalCount(d?.totalCount || 0);
    } catch { toast.error('Failed to load devices'); }
    finally { setLoading(false); }
  };

  useEffect(() => { setPage(1); }, [onlyActive, search.value, pageSize]);
  useEffect(() => { load(); }, [page, pageSize, onlyActive, search.value]);

  const revoke = async (id: string, label: string) => {
    if (!await confirm(`The user will need to re-open the app to re-register their device.`, { title: `Revoke device for ${label}?`, variant: 'warning', confirmLabel: 'Revoke' })) return;
    setRevoking(id);
    try {
      const r = await fetch(`${API}/push/admin/devices/${id}`, { method: 'DELETE', headers: getAuthHeaders() });
      const d = await r.json();
      if (d?.success) { toast.success('Device revoked'); load(); }
      else toast.error(d?.message || 'Revoke failed');
    } finally { setRevoking(null); }
  };

  const fmtTime = (iso?: string | null) => {
    if (!iso) return '—';
    const d = new Date(iso);
    const ms = Date.now() - d.getTime();
    const m = Math.floor(ms / 60000);
    const h = Math.floor(m / 60);
    const days = Math.floor(h / 24);
    if (days > 1) return `${days}d ago`;
    if (h > 1) return `${h}h ago`;
    if (m > 1) return `${m}m ago`;
    return 'just now';
  };

  return (
    <Fragment>
      <div className="md:flex items-center justify-between my-[1.5rem] gap-3">
        <div>
          <p className="font-semibold text-[1.125rem] !mb-0">Push Devices</p>
          <p className="text-[0.813rem] text-[#8c9097]">
            Registered iOS devices that can receive push notifications.
            <Link href="/notifications" className="text-primary ms-2">← Composer</Link>
          </p>
        </div>
      </div>

      <div className="box mb-4">
        <div className="box-body grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
          <input
            type="text"
            value={search.immediate}
            onChange={e => search.setValue(e.target.value)}
            placeholder="Customer name or email…"
            className="form-control md:col-span-2"
          />
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={onlyActive} onChange={e => setOnlyActive(e.target.checked)} />
            Only active devices
          </label>
        </div>
      </div>

      <div className="box">
        <div className="box-body">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary inline-block"></div>
            </div>
          ) : rows.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-6">No devices match the filter.</p>
          ) : (
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <table className="ti-custom-table ti-striped-table ti-custom-table-hover min-w-[640px] sm:min-w-0">
                <thead>
                  <tr className="text-xs text-gray-500 uppercase">
                    <th className="text-left p-2">Customer</th>
                    <th className="text-left p-2 hidden md:table-cell">Platform / version</th>
                    <th className="text-left p-2 hidden lg:table-cell">Token (preview)</th>
                    <th className="text-left p-2 hidden md:table-cell">Last used</th>
                    <th className="text-center p-2">Status</th>
                    <th className="text-right p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(d => (
                    <tr key={d.id} className="border-t">
                      <td className="p-2">
                        <Link href={`/customers/${d.customerId}`} className="text-primary text-sm font-semibold hover:underline">
                          {d.customerName.trim() || d.customerEmail}
                        </Link>
                        <div className="text-[0.7rem] text-gray-400">{d.customerEmail}</div>
                        <div className="md:hidden text-[0.7rem] text-gray-500 mt-1">
                          {d.platform}{d.appVersion ? ` · v${d.appVersion}` : ''} · last {fmtTime(d.lastUsedAt)}
                        </div>
                      </td>
                      <td className="p-2 text-sm hidden md:table-cell">
                        {d.platform}
                        {d.appVersion && <div className="text-[0.7rem] text-gray-400 font-mono">v{d.appVersion}</div>}
                      </td>
                      <td className="p-2 text-[0.7rem] font-mono text-gray-500 hidden lg:table-cell">{d.tokenPreview}</td>
                      <td className="p-2 text-[0.813rem] hidden md:table-cell">
                        {d.lastUsedAt
                          ? <>
                              {fmtTime(d.lastUsedAt)}
                              <div className="text-[0.7rem] text-gray-400">{new Date(d.lastUsedAt).toLocaleDateString('en-NP')}</div>
                            </>
                          : <span className="text-gray-400">never</span>}
                      </td>
                      <td className="p-2 text-center">
                        <span className={`badge ${d.isActive ? 'bg-success/20 text-success' : 'bg-gray-400/20 text-gray-500'} text-[10px] px-2 py-0.5 rounded`}>
                          {d.isActive ? 'Active' : 'Revoked'}
                        </span>
                      </td>
                      <td className="p-2 text-right">
                        {d.isActive ? (
                          <button
                            onClick={() => revoke(d.id, d.customerName || d.customerEmail)}
                            disabled={revoking === d.id}
                            className="ti-btn ti-btn-danger-light ti-btn-sm !opacity-100 disabled:!opacity-50"
                            title="Force-deactivate this device — they'll need to re-open the app"
                          >
                            {revoking === d.id ? '…' : <><i className="ri-logout-circle-line"></i></>}
                          </button>
                        ) : <span className="text-gray-400 text-xs">—</span>}
                      </td>
                    </tr>
                  ))}
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
