'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL;

const STATUS_COLOUR: Record<string, string> = {
  Requested: 'bg-yellow-500/10 text-yellow-700 border-yellow-500',
  Approved:  'bg-blue-500/10 text-blue-700 border-blue-500',
  Preparing: 'bg-purple-500/10 text-purple-700 border-purple-500',
  Shipped:   'bg-indigo-500/10 text-indigo-700 border-indigo-500',
  Delivered: 'bg-green-500/10 text-green-700 border-green-500',
  Cancelled: 'bg-red-500/10 text-red-700 border-red-500',
};

const LIFECYCLE = ['Requested', 'Approved', 'Preparing', 'Shipped', 'Delivered'];

export default function DeliveryDetailPage() {
  useProtectedRoute();
  const { id } = useParams();
  const router = useRouter();

  const [d, setD] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  // Modal state
  const [shipModal, setShipModal] = useState(false);
  const [trackingInput, setTrackingInput] = useState('');
  const [cancelModal, setCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const load = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const r = await fetch(`${API}/delivery/admin/requests/${id}`, { headers: getAuthHeaders() });
      const j = await r.json();
      if (!r.ok || j?.success === false) {
        toast.error(j?.message || 'Failed to load');
        return;
      }
      setD(j?.data || j);
    } catch {
      toast.error('Failed to load');
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const transition = async (action: string, body?: any) => {
    setActing(action);
    try {
      const r = await fetch(`${API}/delivery/requests/${id}/${action}`, {
        method: 'PUT',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined,
      });
      const j = await r.json();
      if (!r.ok || j?.success === false) {
        toast.error(j?.message || `${action} failed`);
      } else {
        toast.success(`${action.charAt(0).toUpperCase() + action.slice(1)}d successfully`);
        load();
      }
    } finally {
      setActing(null);
      setShipModal(false); setCancelModal(false);
      setTrackingInput(''); setCancelReason('');
    }
  };

  if (loading) return (
    <div className="page-content"><div className="container-fluid pt-10 text-center">
      <div className="animate-spin ri-loader-4-line text-3xl inline-block text-primary"></div>
    </div></div>
  );

  if (!d) return (
    <div className="page-content"><div className="container-fluid pt-10 text-center">
      <p>Delivery request not found</p>
      <Link href="/delivery" className="text-primary">← Back to deliveries</Link>
    </div></div>
  );

  const statusClass = STATUS_COLOUR[d.status] || 'bg-gray-500/10 text-gray-700 border-gray-500';

  // Which action buttons should be visible at this status?
  const canApprove = d.status === 'Requested';
  const canPrepare = d.status === 'Approved';
  const canShip    = d.status === 'Preparing';
  const canDeliver = d.status === 'Shipped';
  const canCancel  = ['Requested', 'Approved', 'Preparing'].includes(d.status);

  return (
    <div className="page-content">
      <div className="container-fluid">
        {/* Header */}
        <div className="md:flex items-start justify-between my-[1.5rem] gap-4">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-primary text-sm">
              <i className="ri-arrow-left-s-line text-2xl"></i>
            </button>
            <div>
              <p className="font-mono font-bold text-lg">{d.collectionNumber || '—'}</p>
              <p className="text-xs text-gray-500">Created {new Date(d.createdAt).toLocaleString('en-NP')}</p>
            </div>
          </div>
          <span className={`badge border px-3 py-1.5 rounded-full text-sm font-semibold ${statusClass}`}>
            {d.status}
          </span>
        </div>

        {/* Top stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="box p-4">
            <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Method</p>
            <p className="text-sm font-bold">{d.deliveryMethod === 'HomeDelivery' ? 'Home Delivery' : 'Store Pickup'}</p>
          </div>
          <div className="box p-4">
            <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Quantity</p>
            <p className="text-sm font-bold font-mono">{d.quantityGrams?.toFixed(3)}g</p>
          </div>
          <div className="box p-4">
            <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Total Charge</p>
            <p className="text-sm font-bold">Rs. {(d.totalCharge || 0).toLocaleString()}</p>
            {d.makingChargeAmount > 0 && (
              <p className="text-[0.7rem] text-warning">+ making Rs. {d.makingChargeAmount.toLocaleString()}</p>
            )}
          </div>
          <div className="box p-4">
            <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Payment</p>
            <p className="text-sm font-bold">{d.paymentStatus}</p>
          </div>
        </div>

        {/* Customer */}
        <div className="box mb-6">
          <div className="box-header"><h5 className="box-title mb-0">Customer</h5></div>
          <div className="box-body grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Name</p>
              <Link href={`/customers/${d.customer?.customerId}`} className="text-primary font-semibold hover:underline">
                {d.customer?.name?.trim() || '—'}
              </Link>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Email</p>
              <p className="text-sm">{d.customer?.email || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Phone</p>
              <p className="text-sm font-mono">{d.customer?.phone || '—'}</p>
            </div>
          </div>
        </div>

        {/* Address (only for HomeDelivery) */}
        {d.address && (
          <div className="box mb-6">
            <div className="box-header"><h5 className="box-title mb-0">Delivery Address</h5></div>
            <div className="box-body">
              <p className="text-sm">
                {[d.address.street, d.address.city, d.address.state, d.address.zipCode].filter(Boolean).join(', ')}
              </p>
            </div>
          </div>
        )}

        {/* Source orders */}
        <div className="box mb-6">
          <div className="box-header">
            <h5 className="box-title mb-0">Source Orders ({d.items?.length || 0})</h5>
          </div>
          <div className="table-responsive">
            <table className="ti-custom-table ti-striped-table">
              <thead>
                <tr><th>Order #</th><th>Grams</th><th>Rate</th><th>0% lot</th><th>10% lot</th><th>Making charge</th></tr>
              </thead>
              <tbody>
                {(d.items || []).map((it: any) => (
                  <tr key={it.salesOrderId}>
                    <td className="font-mono text-sm">{it.orderNumber || it.salesOrderId.slice(0, 8)}</td>
                    <td className="font-mono text-sm">{it.gramsFromOrder?.toFixed(3)}g</td>
                    <td className="text-sm">Rs. {it.ratePerGram?.toFixed(2)}</td>
                    <td className="font-mono text-xs text-success">{it.gramsAt0Percent?.toFixed(2)}g</td>
                    <td className="font-mono text-xs text-warning">{it.gramsAt10Percent?.toFixed(2)}g</td>
                    <td className="text-sm font-semibold">Rs. {it.makingChargeAmount?.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Timeline */}
        <div className="box mb-6">
          <div className="box-header"><h5 className="box-title mb-0">Lifecycle</h5></div>
          <div className="box-body">
            <div className="flex flex-wrap gap-2">
              {LIFECYCLE.map((s, idx) => {
                const ts = ({
                  Requested: d.createdAt,
                  Approved:  d.approvedAt,
                  Preparing: d.preparedAt,
                  Shipped:   d.shippedAt,
                  Delivered: d.deliveredAt,
                } as any)[s];
                const reached = !!ts;
                const isCurrent = d.status === s;
                return (
                  <div key={s} className={`px-3 py-2 rounded-lg border-2 text-xs ${
                    reached
                      ? (isCurrent ? 'bg-primary/10 border-primary text-primary font-semibold' : 'bg-green-500/10 border-green-500 text-green-700')
                      : 'bg-gray-50 border-gray-200 text-gray-400'
                  }`}>
                    <div className="font-semibold">{idx + 1}. {s}</div>
                    {reached && <div className="text-[10px] opacity-80 mt-1">{new Date(ts).toLocaleString('en-NP', { dateStyle: 'short', timeStyle: 'short' })}</div>}
                  </div>
                );
              })}
              {d.status === 'Cancelled' && (
                <div className="px-3 py-2 rounded-lg border-2 bg-red-500/10 border-red-500 text-red-700 text-xs font-semibold">
                  ✗ Cancelled
                  {d.cancelledAt && <div className="text-[10px] opacity-80 mt-1">{new Date(d.cancelledAt).toLocaleString('en-NP', { dateStyle: 'short', timeStyle: 'short' })}</div>}
                  {d.cancelReason && <div className="text-[10px] opacity-80 mt-1">"{d.cancelReason}"</div>}
                </div>
              )}
            </div>
            {d.trackingNumber && (
              <p className="text-sm mt-4">
                <span className="text-gray-500">Tracking:</span> <span className="font-mono font-bold">{d.trackingNumber}</span>
              </p>
            )}
            {d.notes && (
              <p className="text-sm mt-2"><span className="text-gray-500">Notes:</span> {d.notes}</p>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="box">
          <div className="box-header"><h5 className="box-title mb-0">Actions</h5></div>
          <div className="box-body flex flex-wrap gap-2">
            {canApprove && (
              <button disabled={!!acting} onClick={() => transition('approve')}
                className="ti-btn ti-btn-primary-full !text-white !opacity-100">
                {acting === 'approve' ? '...' : '✓ Approve'}
              </button>
            )}
            {canPrepare && (
              <button disabled={!!acting} onClick={() => transition('prepare')}
                className="ti-btn ti-btn-info-full !text-white !opacity-100">
                {acting === 'prepare' ? '...' : '📦 Mark Preparing'}
              </button>
            )}
            {canShip && (
              <button disabled={!!acting} onClick={() => setShipModal(true)}
                className="ti-btn ti-btn-info-full !text-white !opacity-100">
                🚚 Mark Shipped
              </button>
            )}
            {canDeliver && (
              <button disabled={!!acting} onClick={() => transition('deliver')}
                className="ti-btn ti-btn-success !text-white !bg-success !opacity-100">
                {acting === 'deliver' ? '...' : '✓ Mark Delivered'}
              </button>
            )}
            {canCancel && (
              <button disabled={!!acting} onClick={() => setCancelModal(true)}
                className="ti-btn ti-btn-danger !text-white !bg-danger !opacity-100">
                ✗ Cancel
              </button>
            )}
            {!canApprove && !canPrepare && !canShip && !canDeliver && !canCancel && (
              <p className="text-sm text-gray-500">No further actions available in {d.status} state.</p>
            )}
          </div>
        </div>
      </div>

      {/* Ship modal — tracking number input */}
      {shipModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-lg">
            <h3 className="text-lg font-semibold mb-2">Mark as Shipped</h3>
            <p className="text-gray-600 text-sm mb-4">Enter the carrier tracking number (optional).</p>
            <input
              type="text"
              value={trackingInput}
              onChange={e => setTrackingInput(e.target.value)}
              placeholder="e.g. NP12345678"
              className="form-control mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setShipModal(false); setTrackingInput(''); }} className="btn btn-outline-secondary">Cancel</button>
              <button onClick={() => transition('ship', { trackingNumber: trackingInput || null })}
                className="btn btn-primary !text-white !bg-primary !opacity-100">
                Confirm Shipped
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel modal — reason */}
      {cancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4 shadow-lg">
            <h3 className="text-lg font-semibold mb-2">Cancel Delivery</h3>
            <p className="text-gray-600 text-sm mb-4">The customer will be notified. Cannot cancel once shipped.</p>
            <textarea
              rows={3}
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              placeholder="Reason for cancellation (optional)"
              className="form-control mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button onClick={() => { setCancelModal(false); setCancelReason(''); }} className="btn btn-outline-secondary">Back</button>
              <button onClick={() => transition('cancel', { reason: cancelReason || null })}
                className="btn btn-danger !text-white !bg-danger !opacity-100">
                Confirm Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
