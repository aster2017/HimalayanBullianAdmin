'use client'
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { getAuthHeaders } from '@/shared/services/apiConfig';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://hbc-api.semis.app/api';
const STATUS_COLORS: Record<string,string> = {
  Active:'bg-blue-500/10 text-blue-700', Completed:'bg-green-500/10 text-green-700',
  Delivered:'bg-purple-500/10 text-purple-700', Cancelled:'bg-red-500/10 text-red-700',
};

export default function TargetsPage() {
  useProtectedRoute();
  const [targets, setTargets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 20;

  const load = async (p = 1) => {
    setLoading(true);
    const q = new URLSearchParams({ pageNumber: String(p), pageSize: String(pageSize) });
    if (search) q.set('search', search);
    if (status) q.set('status', status);
    const r = await fetch(`${API}/targets?${q}`, { headers: getAuthHeaders() });
    const d = await r.json();
    setTargets(d.data?.items || d.data || []);
    setTotal(d.data?.totalCount || 0);
    setPage(p);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="page-content">
      <div className="container-fluid">
        <div className="md:flex items-center justify-between my-[1.5rem]">
          <div>
            <p className="font-semibold text-[1.125rem] text-defaulttextcolor !mb-0">Targets (Layaway Plans)</p>
            <p className="font-normal text-[#8c9097] text-[0.813rem]">Manage all customer silver saving plans.</p>
          </div>
          <Link href="/targets/collections">
            <button className="ti-btn ti-btn-warning !text-white mt-2 md:mt-0">
              <i className="ri-calendar-check-line me-2"></i>Collections Due
            </button>
          </Link>
        </div>

        {/* Filters */}
        <div className="box shadow-sm mb-6 p-4 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <input className="form-control" placeholder="Search by name or target #..."
              value={search} onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && load(1)} />
          </div>
          <select className="form-control w-40" value={status} onChange={e => { setStatus(e.target.value); }}>
            <option value="">All Status</option>
            <option value="Active">Active</option>
            <option value="Completed">Completed</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          <button className="ti-btn ti-btn-primary-full !text-white" onClick={() => load(1)}>Search</button>
        </div>

        <div className="box shadow-sm">
          <div className="table-responsive">
            <table className="ti-custom-table ti-striped-table">
              <thead>
                <tr>
                  <th>Target #</th><th>Customer</th><th>Item</th>
                  <th>Progress</th><th>Status</th><th>Collection Date</th><th>Zoho</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={8} className="text-center py-10"><div className="animate-spin ri-loader-4-line text-2xl inline-block"></div></td></tr>
                ) : targets.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-10 text-gray-500">No targets found</td></tr>
                ) : targets.map((t: any) => {
                  const pct = t.totalGrams > 0 ? Math.round((t.gramsPaid / t.totalGrams) * 100) : 0;
                  return (
                    <tr key={t.id}>
                      <td className="font-mono text-sm font-semibold">{t.targetNumber}</td>
                      <td className="text-sm">{t.customerName || '-'}</td>
                      <td className="text-sm">{t.itemName}</td>
                      <td className="min-w-[140px]">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div className="bg-primary h-2 rounded-full" style={{ width: `${pct}%` }}></div>
                          </div>
                          <span className="text-xs font-semibold">{pct}%</span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{t.gramsPaid}g / {t.totalGrams}g</p>
                      </td>
                      <td><span className={`badge px-2 py-1 rounded text-xs font-semibold ${STATUS_COLORS[t.status] || 'bg-gray-100 text-gray-600'}`}>{t.status}</span></td>
                      <td className="text-sm">{t.collectionDate ? new Date(t.collectionDate).toLocaleDateString() : <span className="text-gray-400">Not scheduled</span>}</td>
                      <td className="text-sm">{t.zohoOrderNumber ? <span className="text-green-600 font-mono text-xs">{t.zohoOrderNumber}</span> : <span className="text-gray-400 text-xs">Pending</span>}</td>
                      <td>
                        <Link href={`/targets/${t.id}`} className="text-primary hover:underline text-sm font-semibold">View</Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="box-footer p-4 flex items-center justify-between">
              <span className="text-sm text-gray-600">Page {page} of {totalPages} ({total} total)</span>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => load(page-1)} className="btn btn-sm btn-outline-primary disabled:opacity-50">← Prev</button>
                <button disabled={page === totalPages} onClick={() => load(page+1)} className="btn btn-sm btn-outline-primary disabled:opacity-50">Next →</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
