'use client';

import { Fragment, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/shared/redux/hooks';
import { fetchInvoiceById } from '@/shared/redux/invoicesSlice';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import apiClient from '@/shared/services/apiClient';
import toast from 'react-hot-toast';

const InvoiceDetailPage = () => {
  useProtectedRoute();

  const params = useParams();
  const id = params.id as string;
  const dispatch = useAppDispatch();
  const { currentInvoice, loading, error } = useAppSelector((state) => state.invoices);

  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState('BankTransfer');
  const [payTransactionId, setPayTransactionId] = useState('');

  useEffect(() => {
    if (id) {
      dispatch(fetchInvoiceById(id));
    }
  }, [dispatch, id]);

  const sendEmail = async () => {
    setActionBusy('send');
    try {
      const r = await apiClient.post(`/invoices/${id}/send-email`);
      if (r.data?.success === false) toast.error(r.data?.message || 'Send failed');
      else toast.success(r.data?.message || 'Invoice emailed');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Send failed');
    } finally { setActionBusy(null); }
  };

  const downloadPdf = async () => {
    setActionBusy('download');
    try {
      const r = await apiClient.get(`/invoices/${id}/download`, { responseType: 'blob' });
      const blob = new Blob([r.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(currentInvoice as any)?.invoiceNumber || 'invoice'}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error('Could not download PDF');
    } finally { setActionBusy(null); }
  };

  const recordPayment = async () => {
    const amount = Number(payAmount);
    if (!amount || amount <= 0) { toast.error('Enter a positive amount'); return; }
    setActionBusy('record');
    try {
      const r = await apiClient.post('/payments', {
        invoiceId: id,
        amount,
        paymentMethod: payMethod,
        transactionId: payTransactionId.trim() || null,
      });
      if (r.data?.success === false) {
        toast.error(r.data?.message || 'Record failed');
      } else {
        toast.success(`Payment of NPR ${amount.toLocaleString()} recorded`);
        setPaymentOpen(false);
        setPayAmount(''); setPayTransactionId('');
        dispatch(fetchInvoiceById(id));
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Record failed');
    } finally { setActionBusy(null); }
  };

  if (loading) {
    return (
      <Fragment>
        <Seo title="Invoice" />
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Fragment>
    );
  }

  if (error || !currentInvoice) {
    return (
      <Fragment>
        <Seo title="Invoice" />
        <div className="flex justify-center items-center h-96">
          <div className="text-center">
            <p className="text-danger mb-4">{error || 'Invoice not found'}</p>
            <Link href="/invoices">
              <button className="ti-btn ti-btn-primary-full !text-white">Back to Invoices</button>
            </Link>
          </div>
        </div>
      </Fragment>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'draft': return 'secondary';
      case 'sent': return 'info';
      case 'paid': return 'success';
      case 'partial': case 'partially_paid': return 'warning';
      case 'overdue': return 'danger';
      case 'void': case 'cancelled': return 'danger';
      default: return 'secondary';
    }
  };

  const inv = currentInvoice as any;

  return (
    <Fragment>
      <Seo title={`Invoice ${inv.invoiceNumber}`} />

      <div className="md:flex block items-center justify-between my-[1.5rem] page-header-breadcrumb">
        <div>
          <p className="font-semibold text-[1.125rem] text-defaulttextcolor dark:text-defaulttextcolor/70 !mb-0">
            Invoice {inv.invoiceNumber}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
          <Link href="/invoices">
            <button className="ti-btn ti-btn-light !opacity-100">Back</button>
          </Link>
          <button
            onClick={downloadPdf}
            disabled={!!actionBusy}
            className="ti-btn ti-btn-light !opacity-100 disabled:!opacity-50"
            title="Download invoice PDF"
          >
            {actionBusy === 'download'
              ? <><i className="ri-loader-4-line animate-spin me-1"></i>Downloading…</>
              : <><i className="ri-download-line me-1"></i>Download PDF</>}
          </button>
          {!!inv.customerEmail && (
            <button
              onClick={sendEmail}
              disabled={!!actionBusy}
              className="ti-btn ti-btn-info-full !text-white !opacity-100 disabled:!opacity-50"
              title={`Email this invoice to ${inv.customerEmail}`}
            >
              {actionBusy === 'send'
                ? <><i className="ri-loader-4-line animate-spin me-1"></i>Sending…</>
                : <><i className="ri-mail-send-line me-1"></i>Send email</>}
            </button>
          )}
          {inv.balanceAmount > 0 && (
            <button
              onClick={() => { setPayAmount(String(inv.balanceAmount)); setPaymentOpen(true); }}
              className="ti-btn ti-btn-primary-full !text-white !opacity-100"
            >
              <i className="ri-money-rupee-circle-line me-1"></i>Record payment
            </button>
          )}
        </div>
      </div>

      {/* Record payment modal */}
      {paymentOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold">Record payment</h3>
                <p className="text-xs text-gray-500">Invoice {inv.invoiceNumber} · balance NPR {Number(inv.balanceAmount).toLocaleString()}</p>
              </div>
              <button onClick={() => setPaymentOpen(false)} className="text-gray-400 hover:text-gray-700">
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="form-label">Amount (NPR) *</label>
                <input
                  type="number"
                  min="0.01"
                  max={inv.balanceAmount}
                  step="0.01"
                  value={payAmount}
                  onChange={e => setPayAmount(e.target.value)}
                  className="form-control font-mono"
                  required
                />
                {Number(payAmount) > Number(inv.balanceAmount) && (
                  <p className="text-xs text-danger mt-1">Amount exceeds outstanding balance</p>
                )}
              </div>
              <div>
                <label className="form-label">Method *</label>
                <select
                  value={payMethod}
                  onChange={e => setPayMethod(e.target.value)}
                  className="form-select"
                >
                  <option value="Cash">Cash</option>
                  <option value="BankTransfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Card">Card</option>
                  <option value="ConnectIPS">ConnectIPS</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="form-label">Transaction / reference (optional)</label>
                <input
                  type="text"
                  value={payTransactionId}
                  onChange={e => setPayTransactionId(e.target.value)}
                  placeholder="Bank ref, cheque #, etc."
                  className="form-control font-mono"
                />
              </div>
              <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded text-xs text-blue-800">
                <i className="ri-information-line me-1"></i>
                Creates a verified Payment record + decrements the invoice balance. If balance reaches 0, the invoice is marked Paid.
              </div>
            </div>
            <div className="p-5 border-t flex justify-end gap-2">
              <button onClick={() => setPaymentOpen(false)} className="btn btn-outline-secondary">Cancel</button>
              <button
                onClick={recordPayment}
                disabled={!Number(payAmount) || Number(payAmount) <= 0 || Number(payAmount) > Number(inv.balanceAmount) || actionBusy === 'record'}
                className="ti-btn ti-btn-primary-full !text-white !opacity-100 disabled:!opacity-50"
              >
                {actionBusy === 'record' ? 'Recording…' : 'Record payment'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* Invoice Details */}
        <div className="xl:col-span-8 col-span-12">
          <div className="box">
            <div className="box-header">
              <h4 className="box-title">Invoice Details</h4>
            </div>
            <div className="box-body">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 pb-6 border-b">
                <div>
                  <span className="text-[#8c9097] text-[0.813rem]">Invoice Date</span>
                  <p className="font-semibold">{new Date(inv.invoiceDate).toLocaleDateString('en-NP')}</p>
                </div>
                <div>
                  <span className="text-[#8c9097] text-[0.813rem]">Due Date</span>
                  <p className="font-semibold">{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-NP') : '-'}</p>
                </div>
                <div>
                  <span className="text-[#8c9097] text-[0.813rem]">Status</span>
                  <p>
                    <span className={`badge bg-${getStatusColor(inv.status)}/20 text-${getStatusColor(inv.status)}`}>
                      {inv.status}
                    </span>
                  </p>
                </div>
                <div>
                  <span className="text-[#8c9097] text-[0.813rem]">Order #</span>
                  <p className="font-semibold">{inv.orderNumber || '-'}</p>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <h5 className="font-semibold mb-4">Invoice Items</h5>
                {inv.lineItems && inv.lineItems.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="ti-custom-table ti-striped-table">
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>SKU</th>
                          <th className="text-right">Rate</th>
                          <th className="text-right">Qty</th>
                          <th className="text-right">Tax</th>
                          <th className="text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inv.lineItems.map((item: any, index: number) => (
                          <tr key={index}>
                            <td className="font-semibold">{item.itemName || item.description || '-'}</td>
                            <td className="text-[0.75rem] text-[#8c9097]">{item.sku || item.SKU || '-'}</td>
                            <td className="text-right">Rs. {(item.rate || item.unitPrice || 0).toLocaleString()}</td>
                            <td className="text-right">{item.quantity}</td>
                            <td className="text-right">Rs. {(item.taxAmount || 0).toLocaleString()}</td>
                            <td className="text-right font-semibold">Rs. {(item.lineTotal || (item.rate || item.unitPrice || 0) * item.quantity).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-[#8c9097] text-center py-4">Line items not available from list sync.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Summary Sidebar */}
        <div className="xl:col-span-4 col-span-12">
          <div className="box">
            <div className="box-header">
              <h4 className="box-title">Invoice Summary</h4>
            </div>
            <div className="box-body space-y-4">
              <div className="flex justify-between">
                <span className="text-[#8c9097]">Subtotal</span>
                <span className="font-semibold">Rs. {(inv.subTotal || inv.subtotalAmount || inv.totalAmount || 0).toLocaleString()}</span>
              </div>

              {(inv.taxAmount || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#8c9097]">Tax</span>
                  <span className="font-semibold">Rs. {inv.taxAmount.toLocaleString()}</span>
                </div>
              )}

              {(inv.discountAmount || 0) > 0 && (
                <div className="flex justify-between text-success">
                  <span>Discount</span>
                  <span className="font-semibold">-Rs. {inv.discountAmount.toLocaleString()}</span>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="flex justify-between">
                  <span className="font-semibold text-[1rem]">Total</span>
                  <span className="font-semibold text-primary text-[1.125rem]">
                    Rs. {(inv.totalAmount || 0).toLocaleString()}
                  </span>
                </div>
              </div>

              {(inv.paidAmount || 0) > 0 && (
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-success">
                    <span>Paid</span>
                    <span className="font-semibold">Rs. {inv.paidAmount.toLocaleString()}</span>
                  </div>
                  {(inv.balanceAmount || (inv.totalAmount - inv.paidAmount)) > 0 && (
                    <div className="flex justify-between text-danger">
                      <span>Balance Due</span>
                      <span className="font-semibold">
                        Rs. {(inv.balanceAmount || (inv.totalAmount - inv.paidAmount)).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {inv.customerNotes && (
                <div className="border-t pt-4">
                  <span className="text-[#8c9097] text-[0.813rem]">Notes</span>
                  <p className="text-[0.875rem]">{inv.customerNotes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Zoho Info */}
          {inv.zohoInvoiceId && (
            <div className="box mt-4">
              <div className="box-body">
                <span className="text-[#8c9097] text-[0.75rem]">Zoho Invoice ID</span>
                <p className="font-mono text-[0.75rem] text-[#8c9097]">{inv.zohoInvoiceId}</p>
                {inv.lastSyncedAt && (
                  <>
                    <span className="text-[#8c9097] text-[0.75rem] mt-2 block">Last Synced</span>
                    <p className="text-[0.75rem]">{new Date(inv.lastSyncedAt).toLocaleString()}</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Fragment>
  );
};

export default InvoiceDetailPage;
