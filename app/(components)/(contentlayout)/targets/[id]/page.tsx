'use client'
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import apiClient from '@/shared/services/apiClient';
import toast from 'react-hot-toast';

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-primary/10 text-primary', Completed: 'bg-success/10 text-success',
  Delivered: 'bg-secondary/10 text-secondary', Cancelled: 'bg-danger/10 text-danger',
};

export default function TargetDetailPage() {
  useProtectedRoute();
  const { id } = useParams();
  const router = useRouter();
  const [target, setTarget] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [notes, setNotes] = useState('');
  const [acting, setActing] = useState(false);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      apiClient.get(`/targets/${id}`),
      apiClient.get(`/targets/${id}/payments`),
    ]).then(([t, p]) => {
      setTarget(t.data?.data || t.data);
      setPayments(p.data?.data || p.data || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const confirmDelivery = async () => {
    setActing(true);
    try {
      const r = await apiClient.post(`/targets/${id}/confirm-delivery`, { notes });
      if (r.data?.success !== false) { toast.success('Delivery confirmed!'); setConfirming(false); setNotes(''); const t = await apiClient.get(`/targets/${id}`); setTarget(t.data?.data || t.data); }
      else toast.error(r.data?.message || 'Failed');
    } catch { toast.error('Failed to confirm delivery'); }
    setActing(false);
  };

  if (loading) return <div className="page-content"><div className="container-fluid pt-10 text-center"><i className="bx bx-loader-alt animate-spin text-3xl text-primary"></i></div></div>;
  if (!target) return <div className="page-content"><div className="container-fluid pt-10 text-center text-[#8c9097]">Target not found</div></div>;

  const pct = target.totalGrams > 0 ? Math.round((target.gramsPaid / target.totalGrams) * 100) : 0;

  return (
    <div className="page-content">
      <div className="container-fluid">
        <div className="md:flex items-center justify-between my-[1.5rem] gap-4">
          <div>
            <button onClick={() => router.back()} className="text-primary text-sm flex items-center gap-1 mb-1"><i className="bx bx-arrow-back"></i> Back</button>
            <p className="font-semibold text-[1.125rem] font-mono !mb-0">{target.targetNumber}</p>
            <p className="text-[#8c9097] text-[0.813rem]">{target.itemName} · {target.customerName}</p>
          </div>
          <div className="flex gap-2 mt-2 md:mt-0">
            <span className={`badge px-3 py-1 rounded text-sm font-semibold ${STATUS_COLORS[target.status] || ''}`}>{target.status}</span>
            {target.status !== 'Delivered' && target.status !== 'Cancelled' && (
              <button onClick={() => setConfirming(true)} className="ti-btn ti-btn-success !text-white !bg-success !opacity-100">
                <i className="bx bx-check me-1"></i>Confirm Delivery
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Summary */}
          <div className="lg:col-span-1">
            <div className="box p-5 shadow-sm">
              <h6 className="font-semibold mb-4">Summary</h6>
              <div className="space-y-3">
                {[
                  { label: 'Item', value: target.itemName },
                  { label: 'Total Grams', value: `${target.totalGrams}g` },
                  { label: 'Grams Paid', value: `${target.gramsPaid}g` },
                  { label: 'Making Charge', value: `${target.makingChargePercent}%` },
                  { label: 'Collection Date', value: target.collectionDate ? new Date(target.collectionDate).toLocaleDateString() : 'Not scheduled' },
                  { label: 'Zoho SO', value: target.zohoOrderNumber || 'Pending sync', mono: true, color: target.zohoOrderNumber ? 'text-success' : 'text-[#8c9097]' },
                  { label: 'Created', value: new Date(target.lockedAt || target.createdAt).toLocaleDateString() },
                  ...(target.deliveredAt ? [{ label: 'Delivered', value: new Date(target.deliveredAt).toLocaleDateString(), color: 'text-secondary font-semibold' }] : []),
                ].map((row: any, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <span className="text-[#8c9097] text-sm">{row.label}</span>
                    <span className={`text-sm ${row.mono ? 'font-mono' : 'font-semibold'} ${row.color || ''}`}>{row.value}</span>
                  </div>
                ))}
                <div>
                  <div className="flex justify-between mb-1"><span className="text-[#8c9097] text-sm">Progress</span><span className="text-sm font-bold">{pct}%</span></div>
                  <div className="bg-gray-200 rounded-full h-3"><div className="bg-primary h-3 rounded-full" style={{ width: `${pct}%` }}></div></div>
                </div>
              </div>
            </div>
          </div>

          {/* Payments */}
          <div className="lg:col-span-2">
            <div className="box shadow-sm">
              <div className="box-header border-b p-4">
                <h6 className="box-title mb-0">Payment History <span className="badge bg-primary/10 text-primary ms-2">{payments.length}</span></h6>
              </div>
              <div className="table-responsive">
                <table className="ti-custom-table ti-striped-table">
                  <thead><tr><th>#</th><th>Date</th><th>Grams</th><th>Amount</th><th>Method</th><th>Status</th></tr></thead>
                  <tbody>
                    {payments.length === 0
                      ? <tr><td colSpan={6} className="text-center py-8 text-[#8c9097]">No payments yet</td></tr>
                      : payments.map((p: any, i) => (
                        <tr key={p.id}>
                          <td className="text-sm text-[#8c9097]">{i + 1}</td>
                          <td className="text-sm">{new Date(p.paidAt || p.createdAt).toLocaleDateString()}</td>
                          <td className="text-sm font-semibold">{p.gramsAdded || p.grams || '-'}g</td>
                          <td className="text-sm font-semibold">Rs. {(p.amountNpr || p.amount || 0).toLocaleString()}</td>
                          <td><span className="badge bg-primary/10 text-primary px-2 py-1 rounded text-xs">{p.paymentMethod || p.method || 'ConnectIPS'}</span></td>
                          <td><span className={`badge px-2 py-1 rounded text-xs ${(p.status || '').toLowerCase() === 'completed' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>{p.status || 'Completed'}</span></td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      {confirming && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Confirm Delivery</h3>
            <p className="text-[#8c9097] text-sm mb-4">Mark silver as physically handed to customer. This is irreversible.</p>
            <textarea className="form-control mb-4" rows={3} placeholder="Delivery notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirming(false)} className="ti-btn ti-btn-light">Cancel</button>
              <button onClick={confirmDelivery} disabled={acting} className="ti-btn ti-btn-success !text-white !bg-success !opacity-100">{acting ? '...' : 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
