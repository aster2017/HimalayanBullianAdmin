'use client'
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import apiClient from '@/shared/services/apiClient';
import toast from 'react-hot-toast';

export default function CustomerDetailPage() {
  useProtectedRoute();
  const { id } = useParams();
  const router = useRouter();
  const [customer, setCustomer] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [targets, setTargets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({ firstName: '', lastName: '', phoneNumber: '' });
  const [rejectModal, setRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const loadAll = async () => {
    if (!id) return;
    setLoading(true);
    const [cr, or, ir, tr] = await Promise.allSettled([
      apiClient.get(`/customers/${id}`),
      apiClient.get(`/customers/${id}/orders`, { params: { page: 1, pageSize: 10 } }),
      apiClient.get(`/customers/${id}/invoices`, { params: { page: 1, pageSize: 10 } }),
      apiClient.get(`/targets/customer/${id}`),
    ]);
    if (cr.status === 'fulfilled') {
      const c = cr.value.data?.data;
      setCustomer(c);
      setEditData({ firstName: c?.firstName || '', lastName: c?.lastName || '', phoneNumber: c?.phoneNumber || '' });
    }
    if (or.status === 'fulfilled') setOrders(or.value.data?.data?.items || or.value.data?.data || []);
    if (ir.status === 'fulfilled') setInvoices(ir.value.data?.data?.items || ir.value.data?.data || []);
    if (tr.status === 'fulfilled') setTargets(tr.value.data?.data || []);
    setLoading(false);
  };

  useEffect(() => { loadAll(); }, [id]);

  const act = async (endpoint: string, body?: any) => {
    setActing(endpoint);
    try {
      const r = await apiClient.post(`/customers/${id}/${endpoint}`, body || {});
      if (r.data?.success !== false) { toast.success(r.data?.message || 'Done'); loadAll(); }
      else toast.error(r.data?.message || 'Failed');
    } catch { toast.error('Action failed'); }
    setActing(null);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActing('edit');
    try {
      await apiClient.put(`/customers/${id}`, editData);
      toast.success('Customer updated');
      setEditMode(false);
      loadAll();
    } catch { toast.error('Update failed'); }
    setActing(null);
  };

  if (loading) return <div className="page-content"><div className="container-fluid pt-10 text-center"><i className="bx bx-loader-alt animate-spin text-3xl text-primary"></i></div></div>;
  if (!customer) return <div className="page-content"><div className="container-fluid pt-10 text-center"><p>Customer not found</p><Link href="/customers" className="text-primary">← Back</Link></div></div>;

  const statusBadge = () => {
    if (!customer.isActive) return <span className="badge bg-danger/10 text-danger px-3 py-1 rounded-full text-sm">Suspended</span>;
    if (!customer.isEmailVerified) return <span className="badge bg-secondary/10 text-secondary px-3 py-1 rounded-full text-sm">Unverified</span>;
    if (!customer.isApproved) return <span className="badge bg-warning/10 text-warning px-3 py-1 rounded-full text-sm">Pending Approval</span>;
    return <span className="badge bg-success/10 text-success px-3 py-1 rounded-full text-sm">Active & Approved</span>;
  };

  return (
    <div className="page-content">
      <div className="container-fluid">
        {/* Header */}
        <div className="md:flex items-start justify-between my-[1.5rem] gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-primary text-sm"><i className="bx bx-arrow-back"></i></button>
            <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center text-lg font-bold">
              {customer.firstName?.charAt(0)}{customer.lastName?.charAt(0)}
            </div>
            <div>
              <h2 className="font-semibold text-[1.25rem] text-defaulttextcolor !mb-0">{customer.fullName}</h2>
              <div className="mt-1">{statusBadge()}</div>
            </div>
          </div>
          <div className="flex gap-2 mt-3 md:mt-0 flex-wrap">
            <button onClick={() => setEditMode(true)} className="ti-btn ti-btn-light"><i className="bx bx-edit me-1"></i>Edit</button>
            {!customer.isApproved && customer.isEmailVerified && customer.isActive && (<>
              <button disabled={!!acting} onClick={() => act('approve')} className="ti-btn ti-btn-success !text-white !bg-success !opacity-100">
                {acting === 'approve' ? '...' : <><i className="bx bx-check me-1"></i>Approve</>}
              </button>
              <button disabled={!!acting} onClick={() => setRejectModal(true)} className="ti-btn ti-btn-danger !text-white !bg-danger !opacity-100">
                <i className="bx bx-x me-1"></i>Reject
              </button>
            </>)}
            {customer.isActive && customer.isApproved && (
              <button disabled={!!acting} onClick={() => act('suspend')} className="ti-btn ti-btn-warning !text-white">
                {acting === 'suspend' ? '...' : <><i className="bx bx-block me-1"></i>Suspend</>}
              </button>
            )}
            {!customer.isActive && (
              <button disabled={!!acting} onClick={() => act('activate')} className="ti-btn ti-btn-success !text-white !bg-success !opacity-100">
                {acting === 'activate' ? '...' : <><i className="bx bx-revision me-1"></i>Activate</>}
              </button>
            )}
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Email', value: customer.email },
            { label: 'Phone', value: customer.phoneNumber || '-' },
            { label: 'Customer #', value: customer.customerNumber || 'Not assigned', mono: true },
            { label: 'Zoho', value: customer.isZohoLinked ? '✓ Linked' : '⚠ Not synced', color: customer.isZohoLinked ? 'text-success' : 'text-warning' },
            { label: 'Joined', value: new Date(customer.createdAt).toLocaleDateString() },
            { label: 'Total Orders', value: customer.totalOrders, large: true },
            { label: 'Lifetime Value', value: `Rs. ${(customer.lifetimeValue || 0).toLocaleString()}` },
            { label: 'Active Targets', value: targets.filter((t: any) => t.status === 'Active').length, large: true },
          ].map((card: any, i) => (
            <div key={i} className="box p-4 rounded-lg shadow-sm">
              <p className="text-xs text-[#8c9097] mb-1">{card.label}</p>
              <p className={`${card.large ? 'text-2xl font-bold text-primary' : 'text-sm font-semibold'} ${card.color || ''} ${card.mono ? 'font-mono' : ''} truncate`}>{card.value}</p>
            </div>
          ))}
        </div>

        {/* Targets */}
        {targets.length > 0 && (
          <div className="box shadow-sm mb-6">
            <div className="box-header border-b p-4 flex justify-between items-center">
              <h5 className="box-title mb-0">Targets ({targets.length})</h5>
              <Link href="/targets" className="text-primary text-sm hover:underline">View All</Link>
            </div>
            <div className="table-responsive">
              <table className="ti-custom-table ti-striped-table">
                <thead><tr><th>Target #</th><th>Item</th><th>Progress</th><th>Status</th><th>Collection</th><th></th></tr></thead>
                <tbody>
                  {targets.map((t: any) => {
                    const pct = t.totalGrams > 0 ? Math.round((t.gramsPaid / t.totalGrams) * 100) : 0;
                    return (
                      <tr key={t.id}>
                        <td className="font-mono text-sm">{t.targetNumber}</td>
                        <td className="text-sm">{t.itemName}</td>
                        <td className="min-w-[120px]">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 bg-gray-200 rounded-full h-2"><div className="bg-primary h-2 rounded-full" style={{ width: `${pct}%` }}></div></div>
                            <span className="text-xs font-bold">{pct}%</span>
                          </div>
                        </td>
                        <td><span className={`badge px-2 py-1 rounded text-xs ${t.status === 'Active' ? 'bg-primary/10 text-primary' : t.status === 'Delivered' ? 'bg-secondary/10 text-secondary' : 'bg-success/10 text-success'}`}>{t.status}</span></td>
                        <td className="text-sm">{t.collectionDate ? new Date(t.collectionDate).toLocaleDateString() : <span className="text-[#8c9097]">-</span>}</td>
                        <td><Link href={`/targets/${t.id}`} className="text-primary text-xs hover:underline">View</Link></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Orders */}
        <div className="box shadow-sm mb-6">
          <div className="box-header border-b p-4"><h5 className="box-title mb-0">Recent Orders ({orders.length})</h5></div>
          <div className="table-responsive">
            <table className="ti-custom-table ti-striped-table">
              <thead><tr><th>Order #</th><th>Date</th><th>Status</th><th>Total</th><th></th></tr></thead>
              <tbody>
                {orders.length === 0
                  ? <tr><td colSpan={5} className="text-center py-6 text-[#8c9097]">No orders</td></tr>
                  : orders.map((o: any) => (
                    <tr key={o.id}>
                      <td className="font-semibold text-sm">{o.orderNumber}</td>
                      <td className="text-sm text-[#8c9097]">{new Date(o.orderDate || o.createdAt).toLocaleDateString()}</td>
                      <td><span className="badge bg-primary/10 text-primary px-2 py-1 rounded text-xs">{o.status}</span></td>
                      <td className="text-sm font-semibold">Rs. {(o.totalAmount || 0).toLocaleString()}</td>
                      <td><Link href={`/orders/${o.id}`} className="text-primary text-xs hover:underline">View</Link></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Invoices */}
        <div className="box shadow-sm">
          <div className="box-header border-b p-4"><h5 className="box-title mb-0">Invoices ({invoices.length})</h5></div>
          <div className="table-responsive">
            <table className="ti-custom-table ti-striped-table">
              <thead><tr><th>Invoice #</th><th>Date</th><th>Status</th><th>Total</th><th>Balance</th><th></th></tr></thead>
              <tbody>
                {invoices.length === 0
                  ? <tr><td colSpan={6} className="text-center py-6 text-[#8c9097]">No invoices</td></tr>
                  : invoices.map((inv: any) => (
                    <tr key={inv.id}>
                      <td className="font-semibold text-sm">{inv.invoiceNumber}</td>
                      <td className="text-sm text-[#8c9097]">{new Date(inv.invoiceDate).toLocaleDateString()}</td>
                      <td><span className={`badge px-2 py-1 rounded text-xs ${inv.status === 'Paid' ? 'bg-success/10 text-success' : inv.status === 'Overdue' ? 'bg-danger/10 text-danger' : 'bg-warning/10 text-warning'}`}>{inv.status}</span></td>
                      <td className="text-sm font-semibold">Rs. {(inv.totalAmount || 0).toLocaleString()}</td>
                      <td className="text-sm">Rs. {(inv.balanceAmount || 0).toLocaleString()}</td>
                      <td><Link href={`/invoices/${inv.id}`} className="text-primary text-xs hover:underline">View</Link></td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editMode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Edit Customer</h3>
            <form onSubmit={saveEdit} className="space-y-4">
              <div><label className="ti-form-label">First Name</label><input className="form-control" value={editData.firstName} onChange={e => setEditData({ ...editData, firstName: e.target.value })} /></div>
              <div><label className="ti-form-label">Last Name</label><input className="form-control" value={editData.lastName} onChange={e => setEditData({ ...editData, lastName: e.target.value })} /></div>
              <div><label className="ti-form-label">Phone</label><input className="form-control" value={editData.phoneNumber} onChange={e => setEditData({ ...editData, phoneNumber: e.target.value })} /></div>
              <div className="flex gap-3 justify-end pt-2">
                <button type="button" onClick={() => setEditMode(false)} className="ti-btn ti-btn-light">Cancel</button>
                <button type="submit" disabled={acting === 'edit'} className="ti-btn ti-btn-primary-full !text-white">{acting === 'edit' ? 'Saving…' : 'Save'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Reject Account</h3>
            <p className="text-[#8c9097] text-sm mb-4">Customer will be notified by email.</p>
            <textarea className="form-control mb-4" rows={3} placeholder="Reason (optional)" value={rejectReason} onChange={e => setRejectReason(e.target.value)} />
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setRejectModal(false); setRejectReason(''); }} className="ti-btn ti-btn-light">Cancel</button>
              <button onClick={() => { act('reject', { reason: rejectReason }); setRejectModal(false); setRejectReason(''); }} className="ti-btn ti-btn-danger !text-white !bg-danger !opacity-100">Confirm Reject</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
