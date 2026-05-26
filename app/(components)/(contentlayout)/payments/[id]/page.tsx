'use client';

import { Fragment, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import apiClient from '@/shared/services/apiClient';
import toast from 'react-hot-toast';

const PaymentDetailPage = () => {
  useProtectedRoute();

  const params = useParams();
  const id = params.id as string;
  const [payment, setPayment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [voidOpen, setVoidOpen] = useState(false);
  const [voidReason, setVoidReason] = useState('');
  const [refundOpen, setRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const fetchPayment = async () => {
    try {
      const res = await apiClient.get(`/payments/${id}`);
      setPayment(res.data?.data || res.data);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Payment not found');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (id) fetchPayment(); }, [id]);

  const voidPayment = async () => {
    if (!voidReason.trim()) { toast.error('Reason is required'); return; }
    setBusy('void');
    try {
      const r = await apiClient.post(`/payments/${id}/void`, { reason: voidReason });
      if (r.data?.success) {
        toast.success(r.data.message || 'Payment voided');
        setVoidOpen(false); setVoidReason('');
        fetchPayment();
      } else {
        toast.error(r.data?.message || 'Void failed');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Void failed');
    } finally { setBusy(null); }
  };

  const refundPayment = async () => {
    const amount = Number(refundAmount);
    if (!amount || amount <= 0) { toast.error('Enter a positive amount'); return; }
    if (!refundReason.trim()) { toast.error('Reason is required'); return; }
    setBusy('refund');
    try {
      const r = await apiClient.post(`/payments/${id}/refund`, { amount, reason: refundReason });
      if (r.data?.success) {
        toast.success(r.data.message || `Refund of NPR ${amount} created`);
        setRefundOpen(false); setRefundAmount(''); setRefundReason('');
        fetchPayment();
      } else {
        toast.error(r.data?.message || 'Refund failed');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Refund failed');
    } finally { setBusy(null); }
  };

  if (loading) {
    return (
      <Fragment>
        <Seo title="Payment" />
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Fragment>
    );
  }

  if (error || !payment) {
    return (
      <Fragment>
        <Seo title="Payment" />
        <div className="flex justify-center items-center h-96">
          <div className="text-center">
            <p className="text-danger mb-4">{error || 'Payment not found'}</p>
            <Link href="/payments"><button className="ti-btn ti-btn-primary-full !text-white">Back to Payments</button></Link>
          </div>
        </div>
      </Fragment>
    );
  }

  return (
    <Fragment>
      <Seo title={`Payment ${payment.paymentNumber}`} />

      <div className="md:flex block items-center justify-between my-[1.5rem] page-header-breadcrumb gap-2">
        <div>
          <p className="font-semibold text-[1.125rem] text-defaulttextcolor dark:text-defaulttextcolor/70 !mb-0">
            Payment #{payment.paymentNumber}
          </p>
          <p className="text-[0.813rem] text-[#8c9097]">
            Status: <strong>{payment.status}</strong> · Amount: <strong>Rs. {Number(payment.amount).toLocaleString()}</strong>
          </p>
        </div>
        <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
          <Link href="/payments"><button className="ti-btn ti-btn-light">Back</button></Link>
          {String(payment.status).toLowerCase() !== 'cancelled' && String(payment.status).toLowerCase() !== 'refunded' && payment.amount > 0 && (
            <>
              <button
                onClick={() => { setRefundAmount(String(payment.amount)); setRefundOpen(true); }}
                disabled={!!busy}
                className="ti-btn ti-btn-warning-full !text-white !opacity-100 disabled:!opacity-50"
                title="Issue a partial or full refund — creates a reversing payment"
              >
                <i className="ri-arrow-go-back-line me-1"></i>Refund
              </button>
              <button
                onClick={() => setVoidOpen(true)}
                disabled={!!busy}
                className="ti-btn ti-btn-danger-full !text-white !opacity-100 disabled:!opacity-50"
                title="Void this payment — corrects mistaken entries (restores invoice balance)"
              >
                <i className="ri-close-circle-line me-1"></i>Void
              </button>
            </>
          )}
        </div>
      </div>

      {/* Void modal */}
      {voidOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold">Void payment</h3>
              <button onClick={() => setVoidOpen(false)} className="text-gray-400 hover:text-gray-700"><i className="ri-close-line text-xl"></i></button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm">
                Voiding <span className="font-mono font-semibold">{payment.paymentNumber}</span> will mark it
                Cancelled and add NPR {Number(payment.amount).toLocaleString()} back to the invoice balance.
                Use this when a payment was recorded by mistake.
              </p>
              <div>
                <label className="form-label">Reason *</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={voidReason}
                  onChange={e => setVoidReason(e.target.value)}
                  placeholder="e.g. Duplicate entry / wrong invoice / customer dispute"
                  required
                />
              </div>
            </div>
            <div className="p-5 border-t flex justify-end gap-2">
              <button onClick={() => setVoidOpen(false)} className="btn btn-outline-secondary">Cancel</button>
              <button
                onClick={voidPayment}
                disabled={!voidReason.trim() || busy === 'void'}
                className="ti-btn ti-btn-danger-full !text-white !opacity-100 disabled:!opacity-50"
              >
                {busy === 'void' ? 'Voiding…' : 'Void payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refund modal */}
      {refundOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold">Refund payment</h3>
              <button onClick={() => setRefundOpen(false)} className="text-gray-400 hover:text-gray-700"><i className="ri-close-line text-xl"></i></button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm">
                Original: <span className="font-mono">{payment.paymentNumber}</span> — Rs. {Number(payment.amount).toLocaleString()}
              </p>
              <div>
                <label className="form-label">Refund amount (NPR) *</label>
                <input
                  type="number"
                  min="0.01"
                  max={payment.amount}
                  step="0.01"
                  value={refundAmount}
                  onChange={e => setRefundAmount(e.target.value)}
                  className="form-control font-mono"
                  required
                />
                {Number(refundAmount) > Number(payment.amount) && (
                  <p className="text-xs text-danger mt-1">Cannot exceed original payment amount</p>
                )}
                <p className="text-xs text-gray-500 mt-1">
                  Full refund marks the original as Refunded. Partial refund leaves it Completed and adds a reversing row.
                </p>
              </div>
              <div>
                <label className="form-label">Reason *</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={refundReason}
                  onChange={e => setRefundReason(e.target.value)}
                  placeholder="e.g. Customer return / overpayment / service issue"
                  required
                />
              </div>
            </div>
            <div className="p-5 border-t flex justify-end gap-2">
              <button onClick={() => setRefundOpen(false)} className="btn btn-outline-secondary">Cancel</button>
              <button
                onClick={refundPayment}
                disabled={!Number(refundAmount) || Number(refundAmount) <= 0 || Number(refundAmount) > Number(payment.amount) || !refundReason.trim() || busy === 'refund'}
                className="ti-btn ti-btn-warning-full !text-white !opacity-100 disabled:!opacity-50"
              >
                {busy === 'refund' ? 'Refunding…' : 'Process refund'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        <div className="xl:col-span-8 col-span-12">
          <div className="box">
            <div className="box-header">
              <h4 className="box-title">Payment Details</h4>
            </div>
            <div className="box-body">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                <div>
                  <span className="text-[#8c9097] text-[0.813rem]">Payment Number</span>
                  <p className="font-semibold text-[1rem]">{payment.paymentNumber}</p>
                </div>
                <div>
                  <span className="text-[#8c9097] text-[0.813rem]">Payment Date</span>
                  <p className="font-semibold">{new Date(payment.paymentDate).toLocaleDateString('en-NP')}</p>
                </div>
                <div>
                  <span className="text-[#8c9097] text-[0.813rem]">Status</span>
                  <p><span className="badge bg-success/20 text-success">{payment.status}</span></p>
                </div>
                <div>
                  <span className="text-[#8c9097] text-[0.813rem]">Invoice</span>
                  <p className="font-semibold">{payment.invoiceNumber || '-'}</p>
                </div>
                <div>
                  <span className="text-[#8c9097] text-[0.813rem]">Payment Method</span>
                  <p className="font-semibold">{payment.paymentMethod || '-'}</p>
                </div>
                <div>
                  <span className="text-[#8c9097] text-[0.813rem]">Transaction ID</span>
                  <p className="font-mono text-[0.813rem]">{payment.transactionId || '-'}</p>
                </div>
              </div>

              {payment.notes && (
                <div className="mt-6 pt-4 border-t">
                  <span className="text-[#8c9097] text-[0.813rem]">Notes</span>
                  <p>{payment.notes}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="xl:col-span-4 col-span-12">
          <div className="box bg-success/5 border-l-4 border-success">
            <div className="box-body text-center py-8">
              <p className="text-[#8c9097] text-[0.875rem] mb-2">Amount Paid</p>
              <p className="font-bold text-success text-[2rem]">Rs. {payment.amount?.toLocaleString()}</p>
            </div>
          </div>

          {payment.syncStatus && (
            <div className="box mt-4">
              <div className="box-body">
                <span className="text-[#8c9097] text-[0.75rem]">Sync Status</span>
                <p className="font-semibold text-[0.875rem]">{payment.syncStatus}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </Fragment>
  );
};

export default PaymentDetailPage;
