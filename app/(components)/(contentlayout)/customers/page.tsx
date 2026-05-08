'use client'
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import apiClient from '@/shared/services/apiClient';
import toast from 'react-hot-toast';

export default function CustomersPage() {
  useProtectedRoute();
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [acting, setActing] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, newThisMonth: 0, avgLifetimeValue: 0 });
  const pageSize = 20;

  const load = async (p = 1, q = search) => {
    setLoading(true);
    try {
      const params: any = { page: p, pageSize };
      if (q) params.search = q;
      const r = await apiClient.get('/customers', { params });
      setCustomers(r.data?.data?.items || []);
      setTotal(r.data?.data?.totalCount || 0);
      setPage(p);
    } catch { toast.error('Failed to load customers'); }
    setLoading(false);
  };

  useEffect(() => {
    load();
    apiClient.get('/customers/stats/overview').then(r => setStats(r.data?.data || {})).catch(() => {});
  }, []);

  const act = async (id: string, endpoint: string, msg: string) => {
    setActing(id + endpoint);
    try {
      const r = await apiClient.post(`/customers/${id}/${endpoint}`);
      if (r.data?.success !== false) { toast.success(r.data?.message || msg); load(page); }
      else toast.error(r.data?.message || 'Failed');
    } catch { toast.error('Action failed'); }
    setActing(null);
  };

  const totalPages = Math.ceil(total / pageSize);

  const statusBadge = (c: any) => {
    if (!c.isActive) return <span className="badge bg-danger/10 text-danger px-2 py-1 rounded text-xs font-semibold">Suspended</span>;
    if (!c.isEmailVerified) return <span className="badge bg-secondary/10 text-secondary px-2 py-1 rounded text-xs font-semibold">Unverified</span>;
    if (!c.isApproved) return <span className="badge bg-warning/10 text-warning px-2 py-1 rounded text-xs font-semibold">Pending</span>;
    return <span className="badge bg-success/10 text-success px-2 py-1 rounded text-xs font-semibold">Active</span>;
  };

  return (
    <div className="page-content">
      <div className="container-fluid">
        <div className="md:flex items-center justify-between my-[1.5rem]">
          <div>
            <p className="font-semibold text-[1.125rem] text-defaulttextcolor !mb-0">Customers</p>
            <p className="font-normal text-[#8c9097] text-[0.813rem]">Manage all customers and their accounts.</p>
          </div>
          <Link href="/customers/approvals">
            <button className="ti-btn ti-btn-warning !text-white mt-2 md:mt-0">
              <i className="bx bx-shield-check me-2"></i>Pending Approvals
            </button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="box bg-primary/10 border-l-4 border-primary p-5 rounded-lg">
            <p className="text-[#8c9097] text-sm">Total Customers</p>
            <h3 className="text-2xl font-bold mt-1">{stats.total || total}</h3>
          </div>
          <div className="box bg-success/10 border-l-4 border-success p-5 rounded-lg">
            <p className="text-[#8c9097] text-sm">New This Month</p>
            <h3 className="text-2xl font-bold mt-1">{stats.newThisMonth || 0}</h3>
          </div>
          <div className="box bg-warning/10 border-l-4 border-warning p-5 rounded-lg">
            <p className="text-[#8c9097] text-sm">Avg Lifetime Value</p>
            <h3 className="text-2xl font-bold mt-1">Rs. {Math.round(stats.avgLifetimeValue || 0).toLocaleString()}</h3>
          </div>
        </div>

        <div className="box shadow-sm mb-4 p-4 flex gap-3">
          <input className="form-control flex-1" placeholder="Search by name or email..."
            value={search} onChange={e => setSearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && load(1, search)} />
          <button className="ti-btn ti-btn-primary-full !text-white" onClick={() => load(1, search)}>Search</button>
          <button className="ti-btn ti-btn-light" onClick={() => { setSearch(''); load(1, ''); }}>Clear</button>
        </div>

        <div className="box shadow-sm">
          <div className="table-responsive">
            <table className="ti-custom-table ti-striped-table">
              <thead>
                <tr>
                  <th>Customer</th><th>Phone</th><th>Customer #</th>
                  <th>Status</th><th>Zoho</th><th>Orders</th><th>Value</th><th>Joined</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="text-center py-10"><i className="bx bx-loader-alt animate-spin text-2xl"></i></td></tr>
                ) : customers.length === 0 ? (
                  <tr><td colSpan={9} className="text-center py-10 text-[#8c9097]">No customers found</td></tr>
                ) : customers.map((c: any) => (
                  <tr key={c.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-sm font-bold shrink-0">
                          {c.firstName?.charAt(0)}{c.lastName?.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{c.fullName}</p>
                          <p className="text-xs text-[#8c9097]">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="text-sm">{c.phoneNumber || '-'}</td>
                    <td className="text-sm font-mono">{c.customerNumber || <span className="text-[#8c9097]">-</span>}</td>
                    <td>{statusBadge(c)}</td>
                    <td>
                      {c.isZohoLinked
                        ? <span className="badge bg-success/10 text-success px-2 py-1 rounded text-xs">Linked</span>
                        : <span className="badge bg-secondary/10 text-secondary px-2 py-1 rounded text-xs">Not linked</span>}
                    </td>
                    <td className="text-sm">{c.totalOrders}</td>
                    <td className="text-sm font-semibold">Rs. {(c.lifetimeValue || 0).toLocaleString()}</td>
                    <td className="text-sm text-[#8c9097]">{new Date(c.createdAt).toLocaleDateString()}</td>
                    <td>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link href={`/customers/${c.id}`} className="text-primary hover:underline text-xs font-semibold">View</Link>
                        {!c.isApproved && c.isEmailVerified && c.isActive && (
                          <button disabled={acting === c.id + 'approve'} onClick={() => act(c.id, 'approve', 'Approved!')}
                            className="text-success hover:underline text-xs font-semibold disabled:opacity-50">Approve</button>
                        )}
                        {c.isActive ? (
                          <button disabled={acting === c.id + 'suspend'} onClick={() => act(c.id, 'suspend', 'Suspended')}
                            className="text-danger hover:underline text-xs font-semibold disabled:opacity-50">Suspend</button>
                        ) : (
                          <button disabled={acting === c.id + 'activate'} onClick={() => act(c.id, 'activate', 'Activated!')}
                            className="text-warning hover:underline text-xs font-semibold disabled:opacity-50">Activate</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="box-footer p-4 flex items-center justify-between">
              <span className="text-sm text-[#8c9097]">Page {page} of {totalPages} ({total} total)</span>
              <div className="flex gap-2">
                <button disabled={page === 1} onClick={() => load(page - 1)} className="ti-btn ti-btn-sm ti-btn-light disabled:opacity-50">← Prev</button>
                <button disabled={page === totalPages} onClick={() => load(page + 1)} className="ti-btn ti-btn-sm ti-btn-light disabled:opacity-50">Next →</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
