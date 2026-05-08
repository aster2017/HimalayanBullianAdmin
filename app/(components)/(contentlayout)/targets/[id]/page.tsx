'use client'
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://hbc-api.semis.app/api';
const STATUS_COLORS: Record<string,string> = {
  Active:'bg-blue-500/10 text-blue-700', Completed:'bg-green-500/10 text-green-700',
  Delivered:'bg-purple-500/10 text-purple-700', Cancelled:'bg-red-500/10 text-red-700',
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

  useEffect(() => {
    if (!id) return;
    Promise.all([
      fetch(`${API}/targets/${id}`, { headers: getAuthHeaders() }).then(r => r.json()),
      fetch(`${API}/targets/${id}/payments`, { headers: getAuthHeaders() }).then(r => r.json()),
    ]).then(([t, p]) => {
      setTarget(t.data || t);
      const pd = p.data || p;
      setPayments(Array.isArray(pd) ? pd : pd?.items || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const confirmDelivery = async () => {
    const r = await fetch(`${API}/targets/${id}/confirm-delivery`, {
      method: 'POST',
      headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes })
    });
    const d = await r.json();
    if (d.success) { toast.success('Delivery confirmed!'); setConfirming(false); setNotes(''); router.refresh(); }
    else toast.error(d.message || 'Failed');
  };

  if (loading) return <div className="page-content"><div className="container-fluid pt-10 text-center"><div className="animate-spin ri-loader-4-line text-4xl inline-block"></div></div></div>;
  if (!target) return <div className="page-content"><div className="container-fluid pt-10 text-center text-gray-500">Target not found</div></div>;

  const pct = target.totalGrams > 0 ? Math.round((target.gramsPaid / target.totalGrams) * 100) : 0;

  return (
    <div className="page-content">
      <div className="container-fluid">
        <div className="md:flex items-center justify-between my-[1.5rem]">
          <div>
            <button onClick={() => router.back()} className="text-primary text-sm mb-1 flex items-center gap-1"><i className="ri-arrow-left-s-line"></i> Back</button>
            <p className="font-semibold text-[1.125rem] text-defaulttextcolor !mb-0 font-mono">{target.targetNumber}</p>
            <p className="font-normal text-[#8c9097] text-[0.813rem]">{target.itemName} · {target.customerName}</p>
          </div>
          <div className="flex gap-2 mt-2 md:mt-0">
            {target.status !== 'Delivered' && target.status !== 'Cancelled' && (
              <button onClick={() => setConfirming(true)} className="ti-btn ti-btn-success !text-white !bg-success !opacity-100">
                <i className="ri-check-line me-1"></i>Confirm Delivery
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Summary */}
          <div className="lg:col-span-1 space-y-4">
            <div className="box p-5 shadow-sm">
              <h6 className="font-semibold mb-3">Target Summary</h6>
              <div className="space-y-3">
                <div className="flex justify-between"><span className="text-gray-500 text-sm">Status</span>
                  <span className={`badge px-2 py-1 rounded text-xs font-semibold ${STATUS_COLORS[target.status] || ''}`}>{target.status}</span></div>
                <div className="flex justify-between"><span className="text-gray-500 text-sm">Item</span><span className="text-sm font-semibold">{target.itemName}</span></div>
                <div className="flex justify-between"><span className="text-gray-500 text-sm">Total Grams</span><span className="text-sm font-semibold">{target.totalGrams}g</span></div>
                <div className="flex justify-between"><span className="text-gray-500 text-sm">Grams Paid</span><span className="text-sm font-semibold">{target.gramsPaid}g</span></div>
                <div>
                  <div className="flex justify-between mb-1"><span className="text-gray-500 text-sm">Progress</span><span className="text-sm font-bold">{pct}%</span></div>
                  <div className="bg-gray-200 rounded-full h-3"><div className="bg-primary h-3 rounded-full transition-all" style={{width:`${pct}%`}}></div></div>
                </div>
                <div className="flex justify-between"><span className="text-gray-500 text-sm">Making Charge</span><span className="text-sm">{target.makingChargePercent}%</span></div>
                {target.collectionDate && <div className="flex justify-between"><span className="text-gray-500 text-sm">Collection Date</span><span className="text-sm font-semibold">{new Date(target.collectionDate).toLocaleDateString()}</span></div>}
                {target.zohoOrderNumber && <div className="flex justify-between"><span className="text-gray-500 text-sm">Zoho SO</span><span className="text-sm font-mono text-green-600">{target.zohoOrderNumber}</span></div>}
                <div className="flex justify-between"><span className="text-gray-500 text-sm">Created</span><span className="text-sm">{new Date(target.lockedAt || target.createdAt).toLocaleDateString()}</span></div>
                {target.deliveredAt && <div className="flex justify-between"><span className="text-gray-500 text-sm">Delivered</span><span className="text-sm text-purple-600 font-semibold">{new Date(target.deliveredAt).toLocaleDateString()}</span></div>}
              </div>
            </div>
          </div>

          {/* Right: Payments */}
          <div className="lg:col-span-2">
            <div className="box shadow-sm">
              <div className="box-header border-b p-4"><h6 className="box-title mb-0">Payment History <span className="badge bg-primary/10 text-primary ms-2">{payments.length}</span></h6></div>
              <div className="table-responsive">
                <table className="ti-custom-table ti-striped-table">
                  <thead><tr><th>#</th><th>Date</th><th>Grams</th><th>Amount</th><th>Method</th><th>Status</th></tr></thead>
                  <tbody>
                    {payments.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-8 text-gray-500">No payments yet</td></tr>
                    ) : payments.map((p: any, i: number) => (
                      <tr key={p.id}>
                        <td className="text-sm text-gray-500">{i+1}</td>
                        <td className="text-sm">{new Date(p.paymentDate || p.paidAt || p.createdAt).toLocaleDateString()}</td>
                        <td className="text-sm font-semibold">{p.gramsPurchased ?? p.gramsAdded ?? p.grams ?? '-'}g</td>
                        <td className="text-sm font-semibold">Rs. {(p.totalAmount ?? p.amountNpr ?? p.amount ?? 0).toLocaleString()}</td>
                        <td className="text-sm"><span className="badge bg-blue-500/10 text-blue-700 px-2 py-1 rounded">{p.paymentMethod || p.method || 'Cash'}</span></td>
                        <td className="text-sm"><span className={`badge px-2 py-1 rounded ${p.status === 'Completed' || p.status === 'Verified' ? 'bg-green-500/10 text-green-700' : 'bg-yellow-500/10 text-yellow-700'}`}>{p.status || 'Completed'}</span></td>
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
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-lg w-full">
            <h3 className="text-lg font-semibold mb-2">Confirm Delivery</h3>
            <p className="text-gray-600 text-sm mb-4">Mark silver as physically handed to customer. This is irreversible.</p>
            <textarea className="form-control mb-4" rows={3} placeholder="Delivery notes (optional)" value={notes} onChange={e => setNotes(e.target.value)} />
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirming(false)} className="btn btn-outline-secondary">Cancel</button>
              <button onClick={confirmDelivery} className="btn btn-success !text-white !bg-success !opacity-100">Confirm Delivery</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
