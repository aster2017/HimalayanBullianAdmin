'use client'
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL;
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

  // Staff adjustments
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [adjustType, setAdjustType] = useState<'AddGrams' | 'RemoveGrams' | 'OverrideMakingCharge' | 'WaiveCustodianFee' | 'CancelTarget'>('AddGrams');
  const [adjustValue, setAdjustValue] = useState('');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjustSubmitting, setAdjustSubmitting] = useState(false);

  // Pay at Store — mark paid
  const [markingPaid, setMarkingPaid] = useState<string | null>(null);
  const [storeNoteTarget, setStoreNoteTarget] = useState<any | null>(null);
  const [storeNote, setStoreNote] = useState('');

  const markStorePaid = async (payment: any, note?: string) => {
    setMarkingPaid(payment.id);
    try {
      const r = await fetch(`${API}/targets/payments/${payment.id}/mark-store-paid`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: note || '' }),
      });
      const d = await r.json();
      if (r.ok && d.success) {
        toast.success(`✓ ${payment.paymentNumber || 'Payment'} confirmed — ${payment.gramsPurchased}g credited`);
        setStoreNoteTarget(null);
        // Refresh
        const [td, pd] = await Promise.all([
          fetch(`${API}/targets/${id}`, { headers: getAuthHeaders() }).then(r => r.json()),
          fetch(`${API}/targets/${id}/payments`, { headers: getAuthHeaders() }).then(r => r.json()),
        ]);
        setTarget(td.data || td);
        const pList = pd.data || pd;
        setPayments(Array.isArray(pList) ? pList : pList?.items || []);
      } else {
        toast.error(d.message || 'Failed to confirm payment');
      }
    } catch { toast.error('Network error'); }
    setMarkingPaid(null);
  };

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

  const ADJUST_TYPES = [
    { value: 'AddGrams',             label: '+ Add Grams',             valueLabel: 'Grams to add',           unit: 'g',  desc: 'Increase the customer\'s paid grams without a payment record (e.g. promotional credit).' },
    { value: 'RemoveGrams',          label: '− Remove Grams',          valueLabel: 'Grams to remove',        unit: 'g',  desc: 'Decrease paid grams (e.g. correction of an over-credit).' },
    { value: 'OverrideMakingCharge', label: '% Override Making Charge', valueLabel: 'New making charge %',    unit: '%',  desc: 'Set a custom making charge percentage for this target. Future payments use this percentage.' },
    { value: 'WaiveCustodianFee',    label: '✗ Waive Custodian Fee',    valueLabel: '',                       unit: '',   desc: 'Waive all outstanding custodian charges accrued on this target.' },
    { value: 'CancelTarget',         label: '⊘ Cancel Target',         valueLabel: '',                       unit: '',   desc: 'Cancel this target. Refunds via the standard flow are handled separately.' },
  ] as const;

  const adjustChoice = ADJUST_TYPES.find(a => a.value === adjustType)!;
  const needsValue = adjustChoice.unit !== '';
  const adjustValid = adjustReason.trim().length > 0
    && (!needsValue || (parseFloat(adjustValue) > 0));

  const submitAdjustment = async () => {
    if (!adjustValid) { toast.error('Reason is required for audit trail'); return; }
    setAdjustSubmitting(true);
    try {
      let url = '';
      let body: any = {};
      if (adjustType === 'OverrideMakingCharge') {
        url = `${API}/targets/${id}/override-making-charge`;
        body = { newPercent: parseFloat(adjustValue), reason: adjustReason };
      } else if (adjustType === 'WaiveCustodianFee') {
        url = `${API}/targets/${id}/waive-custodian-fee`;
        body = { reason: adjustReason };
      } else {
        // AddGrams / RemoveGrams / CancelTarget go through the generic /adjust endpoint
        url = `${API}/targets/${id}/adjust`;
        body = {
          adjustmentType: adjustType,
          value: needsValue ? parseFloat(adjustValue) : 0,
          reason: adjustReason,
        };
      }
      const r = await fetch(url, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok || d?.success === false) {
        toast.error(d?.message || 'Adjustment failed');
      } else {
        toast.success(`${adjustChoice.label.replace(/^[+\-%×✗⊘\s]+/, '')} applied`);
        setAdjustOpen(false);
        setAdjustValue('');
        setAdjustReason('');
        // Reload target
        const t = await fetch(`${API}/targets/${id}`, { headers: getAuthHeaders() }).then(r => r.json());
        setTarget(t.data || t);
      }
    } catch {
      toast.error('Adjustment failed');
    } finally { setAdjustSubmitting(false); }
  };

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
            {target.status !== 'Cancelled' && (
              <button onClick={() => setAdjustOpen(true)} className="ti-btn ti-btn-warning !text-white !opacity-100">
                <i className="ri-tools-line me-1"></i>Admin Adjustments
              </button>
            )}
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
                  <thead><tr><th>#</th><th>Date</th><th>Grams</th><th>Amount</th><th>Method</th><th>Status</th><th></th></tr></thead>
                  <tbody>
                    {payments.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-8 text-gray-500">No payments yet</td></tr>
                    ) : payments.map((p: any, i: number) => {
                      const isPayAtStore = (p.paymentMethod || '').toLowerCase().includes('store') || p.paymentMethod === 'PayAtStore';
                      const isPending = p.status === 'Pending';
                      return (
                      <tr key={p.id}>
                        <td className="text-sm text-gray-500">{i+1}</td>
                        <td className="text-sm">{new Date(p.paymentDate || p.paidAt || p.createdAt).toLocaleDateString()}</td>
                        <td className="text-sm font-semibold">{p.gramsPurchased ?? p.gramsAdded ?? p.grams ?? '-'}g</td>
                        <td className="text-sm font-semibold">Rs. {(p.totalAmount ?? p.amountNpr ?? p.amount ?? 0).toLocaleString()}</td>
                        <td className="text-sm">
                          <span className={`badge px-2 py-1 rounded text-xs font-semibold ${isPayAtStore ? 'bg-orange-100 text-orange-700' : 'bg-blue-500/10 text-blue-700'}`}>
                            {p.paymentMethod || p.method || 'Cash'}
                          </span>
                        </td>
                        <td className="text-sm">
                          <span className={`badge px-2 py-1 rounded ${p.status === 'Completed' || p.status === 'Verified' ? 'bg-green-500/10 text-green-700' : p.status === 'Failed' ? 'bg-red-500/10 text-red-700' : 'bg-yellow-500/10 text-yellow-700'}`}>
                            {p.status || 'Completed'}
                          </span>
                        </td>
                        <td>
                          {isPayAtStore && isPending && (
                            <button
                              onClick={() => { setStoreNoteTarget(p); setStoreNote(''); }}
                              disabled={markingPaid === p.id}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-success hover:bg-success/90 disabled:opacity-50 px-2.5 py-1 rounded-lg whitespace-nowrap"
                            >
                              {markingPaid === p.id ? '…' : '✓ Mark Paid'}
                            </button>
                          )}
                        </td>
                      </tr>
                      );
                    })}
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

      {/* Admin Adjustments modal */}
      {adjustOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col" style={{ maxHeight: '90vh' }}>
            <div className="p-5 border-b flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Admin Adjustment</h3>
                <p className="text-xs text-gray-500">Target {target.targetNumber} · audited</p>
              </div>
              <button onClick={() => setAdjustOpen(false)} className="text-gray-400 hover:text-gray-700">
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-auto">
              <div>
                <label className="form-label">Adjustment type</label>
                <select
                  value={adjustType}
                  onChange={e => { setAdjustType(e.target.value as any); setAdjustValue(''); }}
                  className="form-select"
                >
                  {ADJUST_TYPES.map(a => <option key={a.value} value={a.value}>{a.label}</option>)}
                </select>
                <p className="text-xs text-gray-500 mt-1">{adjustChoice.desc}</p>
              </div>

              {needsValue && (
                <div>
                  <label className="form-label">{adjustChoice.valueLabel} *</label>
                  <div className="relative">
                    <input
                      type="number"
                      step={adjustChoice.unit === '%' ? '0.01' : '0.001'}
                      min="0"
                      value={adjustValue}
                      onChange={e => setAdjustValue(e.target.value)}
                      className="form-control pr-10"
                      placeholder={adjustChoice.unit === '%' ? 'e.g. 4.0' : 'e.g. 5.250'}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-mono">
                      {adjustChoice.unit}
                    </span>
                  </div>
                </div>
              )}

              <div>
                <label className="form-label">Reason * <span className="text-xs text-gray-400">(audit trail — required)</span></label>
                <textarea
                  rows={3}
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  className="form-control"
                  placeholder="e.g. Promotional credit — campaign #2026-Q2"
                />
              </div>

              <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded text-xs text-yellow-800">
                <i className="ri-alert-line me-1"></i>
                Every adjustment is recorded against your admin ID and cannot be deleted.
                The customer's transaction history will show this entry.
              </div>
            </div>

            <div className="p-5 border-t flex gap-3 justify-end">
              <button onClick={() => setAdjustOpen(false)} className="btn btn-outline-secondary">Cancel</button>
              <button
                onClick={submitAdjustment}
                disabled={!adjustValid || adjustSubmitting}
                className="ti-btn ti-btn-warning !text-white !opacity-100 disabled:!opacity-50"
              >
                {adjustSubmitting ? <><i className="ri-loader-4-line animate-spin me-1"></i>Applying…</> : 'Apply Adjustment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pay at Store — Mark Paid modal */}
      {storeNoteTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
             onClick={e => e.target === e.currentTarget && setStoreNoteTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-1">Confirm Store Payment</h3>
            <p className="text-sm text-[#8c9097] mb-4">
              Confirm that the customer has paid{' '}
              <strong>Rs. {(storeNoteTarget.totalAmount ?? 0).toLocaleString()}</strong> in person at an HBC location.
            </p>
            <div className="bg-success/5 border border-success/20 rounded-lg p-3 mb-4 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-[#8c9097]">Payment</span><span className="font-mono font-semibold">{storeNoteTarget.paymentNumber}</span></div>
              <div className="flex justify-between"><span className="text-[#8c9097]">Grams to credit</span><span className="font-mono font-semibold text-success">+{storeNoteTarget.gramsPurchased}g</span></div>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-[#8c9097] uppercase tracking-wide mb-1.5">Notes (optional)</label>
              <input type="text" className="form-control" placeholder="e.g. Cash received, receipt #1234"
                value={storeNote} onChange={e => setStoreNote(e.target.value)} />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setStoreNoteTarget(null)} className="ti-btn ti-btn-light">Cancel</button>
              <button onClick={() => markStorePaid(storeNoteTarget, storeNote)}
                disabled={markingPaid === storeNoteTarget.id}
                className="ti-btn ti-btn-success !text-white">
                {markingPaid === storeNoteTarget.id ? 'Confirming…' : '✓ Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
