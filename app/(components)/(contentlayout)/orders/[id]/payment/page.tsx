'use client';

import { Fragment, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import Seo from '@/shared/layout-components/seo/seo';
import apiClient from '@/shared/services/apiClient';
import toast from 'react-hot-toast';
import Link from 'next/link';

const API_HOST = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api').replace('/api', '');

export default function OrderPaymentPage() {
  useProtectedRoute();
  const params = useParams();
  const id = params.id as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [confirmAmount, setConfirmAmount] = useState('');
  const [confirmMethod, setConfirmMethod] = useState('cash');
  const [confirmRef, setConfirmRef] = useState('');
  const [processing, setProcessing] = useState(false);

  const fetchStatus = async () => {
    try {
      const res = await apiClient.get(`/orders/${id}/payment-status`);
      setData(res.data);
    } catch { }
    setLoading(false);
  };

  useEffect(() => { fetchStatus(); }, [id]);

  const handleConfirmPayment = async () => {
    if (!confirmAmount || parseFloat(confirmAmount) <= 0) {
      toast.error('Enter payment amount');
      return;
    }
    setProcessing(true);
    try {
      await apiClient.post(`/orders/${id}/confirm-payment`, {
        amount: parseFloat(confirmAmount),
        method: confirmMethod,
        referenceNumber: confirmRef,
      });
      toast.success('Payment confirmed!');
      setConfirmAmount('');
      setConfirmRef('');
      await fetchStatus();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to confirm payment');
    }
    setProcessing(false);
  };

  const handleVerifyReceipt = async (receiptId: string, approve: boolean) => {
    setProcessing(true);
    try {
      await apiClient.post(`/orders/${id}/confirm-payment`, { receiptId, approve, amount: 0 });
      toast.success(approve ? 'Receipt verified!' : 'Receipt rejected');
      await fetchStatus();
    } catch { toast.error('Failed to process receipt'); }
    setProcessing(false);
  };

  if (loading) return <div className="my-[1.5rem]"><div className="h-96 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg animate-pulse"></div></div>;
  if (!data) return <div className="my-[1.5rem]"><p className="text-danger">Order not found</p></div>;

  const d = data;
  const isPaid = d.paymentStatus === 'paid';

  return (
    <Fragment>
      <Seo title={`Payment - ${d.orderNumber}`} />

      <div className="md:flex block items-center justify-between my-[1.5rem]">
        <div>
          <p className="font-semibold text-[1.125rem] text-defaulttextcolor !mb-0">Payment: {d.orderNumber}</p>
          <p className="text-[#8c9097] text-[0.813rem]">{d.customerName}</p>
        </div>
        <div className="flex gap-2 mt-2 md:mt-0">
          <a href={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api'}/orders/${id}/invoice-pdf`} target="_blank" rel="noopener noreferrer">
            <button className="ti-btn ti-btn-success-full !text-white">Download Invoice</button>
          </a>
          <Link href={`/orders/${id}`}><button className="ti-btn ti-btn-light !opacity-100">Back to Order</button></Link>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Payment Summary */}
        <div className="col-span-12 xl:col-span-8">
          <div className="box">
            <div className="box-header"><h4 className="box-title">Payment Status</h4></div>
            <div className="box-body">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
                <div className="p-4 rounded-lg bg-info/5 border-l-4 border-info">
                  <p className="text-[#8c9097] text-[0.75rem]">Silver Quantity</p>
                  <p className="font-bold text-[1.25rem]">{d.quantityGrams || '—'}g</p>
                </div>
                <div className="p-4 rounded-lg bg-primary/5 border-l-4 border-primary">
                  <p className="text-[#8c9097] text-[0.75rem]">Total Amount</p>
                  <p className="font-bold text-[1.25rem]">Rs. {d.totalAmount?.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-lg bg-warning/5 border-l-4 border-warning">
                  <p className="text-[#8c9097] text-[0.75rem]">Booking Required</p>
                  <p className="font-bold text-[1.25rem]">Rs. {d.bookingAmount?.toLocaleString()}</p>
                </div>
                <div className="p-4 rounded-lg bg-success/5 border-l-4 border-success">
                  <p className="text-[#8c9097] text-[0.75rem]">Paid</p>
                  <p className="font-bold text-[1.25rem] text-success">Rs. {d.paidAmount?.toLocaleString()}</p>
                </div>
                <div className={`p-4 rounded-lg border-l-4 ${d.balanceDue > 0 ? 'bg-danger/5 border-danger' : 'bg-success/5 border-success'}`}>
                  <p className="text-[#8c9097] text-[0.75rem]">Balance Due</p>
                  <p className={`font-bold text-[1.25rem] ${d.balanceDue > 0 ? 'text-danger' : 'text-success'}`}>
                    Rs. {d.balanceDue?.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <span className={`badge ${isPaid ? 'bg-success/20 text-success' : d.paidAmount > 0 ? 'bg-warning/20 text-warning' : 'bg-danger/20 text-danger'} text-[0.875rem] px-3 py-1`}>
                  {isPaid ? 'Fully Paid' : d.paidAmount > 0 ? 'Partially Paid' : 'Unpaid'}
                </span>
                {d.pendingVerification > 0 && (
                  <span className="badge bg-info/20 text-info px-3 py-1">{d.receiptsPendingCount} receipt(s) pending verification</span>
                )}
              </div>
            </div>
          </div>

          {/* Receipts */}
          <div className="box mt-6">
            <div className="box-header"><h4 className="box-title">Payment Receipts ({d.receipts?.length || 0})</h4></div>
            <div className="box-body">
              {d.receipts && d.receipts.length > 0 ? (
                <div className="space-y-4">
                  {d.receipts.map((r: any) => (
                    <div key={r.id} className="flex items-start gap-4 p-4 border rounded-lg">
                      {r.receiptImageUrl && (
                        <a href={`${API_HOST}${r.receiptImageUrl}`} target="_blank" rel="noopener noreferrer">
                          <img src={`${API_HOST}${r.receiptImageUrl}`} alt="Receipt" className="w-20 h-20 object-cover rounded hover:opacity-80 cursor-pointer border" />
                        </a>
                      )}
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-semibold">Rs. {r.amount?.toLocaleString()}</span>
                          <span className="text-[0.75rem] text-[#8c9097]">via {r.method}</span>
                        </div>
                        {r.referenceNumber && <p className="text-[0.75rem] text-[#8c9097]">Ref: {r.referenceNumber}</p>}
                        <p className="text-[0.7rem] text-[#8c9097]">{new Date(r.createdAt).toLocaleString('en-NP')}</p>
                      </div>
                      <div>
                        {r.status === 'pending' ? (
                          <div className="flex gap-2">
                            <button onClick={() => handleVerifyReceipt(r.id, true)} disabled={processing}
                              className="px-3 py-1.5 text-[0.813rem] bg-success text-white rounded hover:bg-success/90 disabled:opacity-50">Verify</button>
                            <button onClick={() => handleVerifyReceipt(r.id, false)} disabled={processing}
                              className="px-3 py-1.5 text-[0.813rem] bg-danger text-white rounded hover:bg-danger/90 disabled:opacity-50">Reject</button>
                          </div>
                        ) : (
                          <span className={`badge ${r.status === 'verified' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}`}>
                            {r.status}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[#8c9097] text-center py-4">No receipts uploaded yet</p>
              )}
            </div>
          </div>
        </div>

        {/* Confirm Payment (Admin) */}
        <div className="col-span-12 xl:col-span-4">
          <div className="box">
            <div className="box-header"><h4 className="box-title">Record Payment</h4></div>
            <div className="box-body space-y-4">
              <div>
                <label className="form-label">Amount (Rs.)</label>
                <input type="number" value={confirmAmount} onChange={e => setConfirmAmount(e.target.value)}
                  className="form-control form-control-lg" placeholder="28125" />
              </div>
              <div>
                <label className="form-label">Method</label>
                <select value={confirmMethod} onChange={e => setConfirmMethod(e.target.value)} className="form-control">
                  <option value="cash">Cash</option>
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="esewa">eSewa</option>
                  <option value="khalti">Khalti</option>
                  <option value="fonepay">Fonepay</option>
                </select>
              </div>
              <div>
                <label className="form-label">Reference #</label>
                <input type="text" value={confirmRef} onChange={e => setConfirmRef(e.target.value)}
                  className="form-control" placeholder="Transaction reference" />
              </div>
              <button onClick={handleConfirmPayment} disabled={processing}
                className="ti-btn ti-btn-primary-full !text-white w-full disabled:opacity-50">
                {processing ? 'Processing...' : 'Confirm Payment'}
              </button>
            </div>
          </div>

          {/* Order Info */}
          <div className="box mt-4">
            <div className="box-body">
              <p className="text-[#8c9097] text-[0.75rem]">Order Date</p>
              <p className="font-semibold mb-2">{d.orderDate ? new Date(d.orderDate).toLocaleDateString('en-NP') : '-'}</p>
              <p className="text-[#8c9097] text-[0.75rem]">Status</p>
              <p className="font-semibold">{d.status}</p>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
}
