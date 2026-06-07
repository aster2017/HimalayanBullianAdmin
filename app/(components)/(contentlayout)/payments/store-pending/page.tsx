'use client';
import { useEffect, useState } from 'react';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://hbcapi.semis.app/api';

type StorePending = {
  id: string;
  paymentNumber: string;
  targetId: string;
  targetNumber: string;
  itemName: string;
  customerName: string;
  customerEmail: string;
  gramsPurchased: number;
  totalAmount: number;
  silverRate: number;
  requestedAt: string;
  progressAfter: number;
};

export default function StorePendingPage() {
  useProtectedRoute();
  const [items, setItems] = useState<StorePending[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState<string | null>(null);
  const [noteTarget, setNoteTarget] = useState<StorePending | null>(null);
  const [note, setNote] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/targets/payments/store-pending?pageSize=100`, { headers: getAuthHeaders() });
      const d = await r.json();
      setItems(d.data || []);
    } catch { toast.error('Failed to load'); }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const confirmPaid = async (item: StorePending, notes?: string) => {
    setMarking(item.id);
    try {
      const r = await fetch(`${API}/targets/payments/${item.id}/mark-store-paid`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: notes || '' }),
      });
      const d = await r.json();
      if (r.ok && d.success) {
        toast.success(`✓ ${item.paymentNumber} confirmed — ${item.gramsPurchased.toFixed(3)}g credited`);
        setNoteTarget(null);
        await load();
      } else {
        toast.error(d.message || 'Failed to confirm payment');
      }
    } catch { toast.error('Network error'); }
    setMarking(null);
  };

  return (
    <div className="page-content">
      <div className="container-fluid">
        <div className="md:flex items-center justify-between my-[1.5rem]">
          <div>
            <p className="font-semibold text-[1.125rem] text-defaulttextcolor !mb-0">Store Payment Requests</p>
            <p className="text-[#8c9097] text-[0.813rem]">
              Customers who chose "Pay at Store" — confirm once they've paid in person.
            </p>
          </div>
          <button onClick={load} className="ti-btn ti-btn-light mt-2 md:mt-0">
            <i className="ri-refresh-line me-1"></i>Refresh
          </button>
        </div>

        {items.length > 0 && (
          <div className="alert flex items-center gap-3 mb-4 p-4 rounded-lg border border-warning/30 bg-warning/10">
            <i className="ri-store-line text-warning text-xl"></i>
            <span className="font-semibold text-warning">{items.length} payment{items.length !== 1 ? 's' : ''} awaiting in-store confirmation.</span>
            <span className="text-[#8c9097] text-sm ms-1">Customer must be physically present and pay before you confirm.</span>
          </div>
        )}

        <div className="box shadow-sm">
          <div className="table-responsive">
            <table className="ti-custom-table ti-striped-table">
              <thead>
                <tr className="bg-light">
                  <th>Customer</th>
                  <th>Target</th>
                  <th>Item</th>
                  <th className="text-right">Grams</th>
                  <th className="text-right">Amount (NPR)</th>
                  <th className="text-right">Rate/g</th>
                  <th>Progress After</th>
                  <th>Requested</th>
                  <th className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={9} className="text-center py-10 text-[#8c9097]">Loading…</td></tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="text-center py-12">
                      <div className="flex flex-col items-center gap-2 text-[#8c9097]">
                        <i className="ri-store-line text-4xl"></i>
                        <p className="font-medium">No pending store payments</p>
                        <p className="text-sm">Payments will appear here when customers choose "Pay at Store"</p>
                      </div>
                    </td>
                  </tr>
                ) : items.map(item => (
                  <tr key={item.id}>
                    <td>
                      <div className="font-medium text-sm">{item.customerName}</div>
                      <div className="text-xs text-[#8c9097]">{item.customerEmail}</div>
                    </td>
                    <td>
                      <span className="font-mono text-xs text-primary font-semibold">{item.targetNumber}</span>
                    </td>
                    <td className="text-sm">{item.itemName}</td>
                    <td className="text-right font-mono text-sm font-semibold">{item.gramsPurchased.toFixed(3)}g</td>
                    <td className="text-right font-mono text-sm font-semibold">
                      {item.totalAmount.toLocaleString('en-NP')}
                    </td>
                    <td className="text-right font-mono text-xs text-[#8c9097]">
                      {item.silverRate.toLocaleString('en-NP')}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                          <div className="bg-primary h-1.5 rounded-full" style={{ width: `${Math.min(item.progressAfter, 100)}%` }} />
                        </div>
                        <span className="text-xs font-mono w-10 text-right">{item.progressAfter.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="text-xs text-[#8c9097] whitespace-nowrap">
                      {new Date(item.requestedAt).toLocaleString('en-NP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="text-center">
                      <button
                        onClick={() => { setNoteTarget(item); setNote(''); }}
                        disabled={marking === item.id}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-success hover:bg-success/90 disabled:opacity-50 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        {marking === item.id
                          ? <><i className="ri-loader-4-line animate-spin"></i> Confirming…</>
                          : <><i className="ri-check-line"></i> Mark Paid</>}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Confirm modal */}
      {noteTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
             onClick={e => e.target === e.currentTarget && setNoteTarget(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-1">Confirm Store Payment</h3>
            <p className="text-sm text-[#8c9097] mb-4">
              Confirm that <strong>{noteTarget.customerName}</strong> has paid{' '}
              <strong>NPR {noteTarget.totalAmount.toLocaleString('en-NP')}</strong> in person.
            </p>
            <div className="bg-success/5 border border-success/20 rounded-lg p-3 mb-4 text-sm">
              <div className="flex justify-between"><span className="text-[#8c9097]">Payment</span><span className="font-mono font-semibold">{noteTarget.paymentNumber}</span></div>
              <div className="flex justify-between"><span className="text-[#8c9097]">Grams to credit</span><span className="font-mono font-semibold text-success">+{noteTarget.gramsPurchased.toFixed(3)}g</span></div>
              <div className="flex justify-between"><span className="text-[#8c9097]">Target</span><span className="font-mono">{noteTarget.targetNumber}</span></div>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-[#8c9097] uppercase tracking-wide mb-1.5">
                Notes (optional)
              </label>
              <input
                type="text"
                className="form-control"
                placeholder="e.g. Paid by cash, receipt #1234"
                value={note}
                onChange={e => setNote(e.target.value)}
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setNoteTarget(null)} className="ti-btn ti-btn-light">Cancel</button>
              <button
                onClick={() => confirmPaid(noteTarget, note)}
                disabled={marking === noteTarget.id}
                className="ti-btn ti-btn-success !text-white"
              >
                {marking === noteTarget.id ? 'Confirming…' : '✓ Confirm Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
