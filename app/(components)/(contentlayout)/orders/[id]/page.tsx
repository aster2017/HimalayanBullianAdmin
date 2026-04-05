'use client';

import { Fragment, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/shared/redux/hooks';
import { fetchOrderById, deleteOrder } from '@/shared/redux/ordersSlice';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import apiClient from '@/shared/services/apiClient';
import toast from 'react-hot-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5002/api';

const OrderDetailPage = () => {
  useProtectedRoute();

  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { currentOrder, loading, error } = useAppSelector((state) => state.orders);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (id) dispatch(fetchOrderById(id));
  }, [dispatch, id]);

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this order?')) {
      dispatch(deleteOrder(id)).then(() => router.push('/orders'));
    }
  };

  const handleStatusAction = async (action: string, label: string) => {
    if (!window.confirm(`${label}?`)) return;
    setProcessing(true);
    try {
      await apiClient.post(`/orders/${id}/${action}`);
      toast.success(`${label} — done!`);
      dispatch(fetchOrderById(id));
    } catch (err: any) {
      toast.error(err?.response?.data?.message || `Failed to ${label.toLowerCase()}`);
    }
    setProcessing(false);
  };

  if (loading) {
    return (
      <Fragment>
        <Seo title="Order" />
        <div className="flex justify-center items-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            <p className="mt-4 text-[#8c9097]">Loading order...</p>
          </div>
        </div>
      </Fragment>
    );
  }

  if (error || !currentOrder) {
    return (
      <Fragment>
        <Seo title="Order" />
        <div className="flex justify-center items-center h-96">
          <div className="text-center">
            <p className="text-danger mb-4">{error || 'Order not found'}</p>
            <Link href="/orders"><button className="ti-btn ti-btn-primary-full !text-white">Back to Orders</button></Link>
          </div>
        </div>
      </Fragment>
    );
  }

  const status = currentOrder.status?.toLowerCase();
  const getStatusColor = (s: string) => {
    switch (s?.toLowerCase()) {
      case 'draft': return 'secondary';
      case 'confirmed': return 'warning';
      case 'converted': case 'invoiced': return 'info';
      case 'shipped': return 'primary';
      case 'delivered': return 'success';
      case 'cancelled': return 'danger';
      default: return 'secondary';
    }
  };

  // Determine which action buttons to show based on current status
  const showGenerateInvoice = ['confirmed', 'converted'].includes(status);
  const showMarkShipped = ['invoiced'].includes(status);
  const showMarkDelivered = ['shipped'].includes(status);

  return (
    <Fragment>
      <Seo title={`Order ${currentOrder.orderNumber}`} />

      <div className="md:flex block items-center justify-between my-[1.5rem] page-header-breadcrumb">
        <div>
          <p className="font-semibold text-[1.125rem] text-defaulttextcolor dark:text-defaulttextcolor/70 !mb-0">
            Order {currentOrder.orderNumber}
          </p>
          <p className="text-[#8c9097] text-[0.813rem]">
            {(currentOrder as any).customerName} · {new Date(currentOrder.orderDate).toLocaleDateString('en-NP')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
          <Link href={`/orders/${id}/payment`}>
            <button className="ti-btn ti-btn-primary-full !text-white">Manage Payment</button>
          </Link>
          <a href={`${API_URL}/orders/${id}/invoice-pdf`} target="_blank" rel="noopener noreferrer">
            <button className="ti-btn ti-btn-success-full !text-white"><i className="ri-file-download-line me-1"></i>Invoice PDF</button>
          </a>
          <Link href="/orders"><button className="ti-btn ti-btn-light !opacity-100">Back</button></Link>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Order Details + Status Actions */}
        <div className="xl:col-span-8 col-span-12">
          {/* Status Timeline */}
          <div className="box">
            <div className="box-header"><h4 className="box-title">Order Progress</h4></div>
            <div className="box-body">
              <div className="flex items-center justify-between flex-wrap gap-4">
                {[
                  { key: 'created', label: 'Order Created', done: true, date: currentOrder.createdAt },
                  { key: 'invoiced', label: 'Invoice Generated', done: ['invoiced','shipped','delivered','converted'].includes(status), date: (currentOrder as any).convertedToInvoiceAt },
                  { key: 'shipped', label: 'Shipped', done: ['shipped','delivered'].includes(status), date: (currentOrder as any).shippedAt },
                  { key: 'delivered', label: 'Delivered', done: ['delivered'].includes(status), date: (currentOrder as any).deliveredAt },
                ].map((step, i, arr) => (
                  <Fragment key={step.key}>
                    <div className="flex flex-col items-center text-center min-w-[80px]">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white text-[0.875rem] font-bold ${
                        step.done ? 'bg-success' : 'bg-gray-300 dark:bg-gray-600'
                      }`}>
                        {step.done ? <i className="ri-check-line text-[1.1rem]"></i> : i + 1}
                      </div>
                      <p className={`text-[0.75rem] mt-1 font-medium ${step.done ? 'text-success' : 'text-[#8c9097]'}`}>{step.label}</p>
                      {step.date && <p className="text-[0.65rem] text-[#8c9097]">{new Date(step.date).toLocaleDateString('en-NP')}</p>}
                    </div>
                    {i < arr.length - 1 && (
                      <div className={`flex-1 h-0.5 ${step.done ? 'bg-success' : 'bg-gray-200 dark:bg-gray-600'}`}></div>
                    )}
                  </Fragment>
                ))}
              </div>

              {/* Action buttons based on status */}
              <div className="flex gap-3 mt-6 pt-4 border-t">
                {showGenerateInvoice && (
                  <button onClick={() => handleStatusAction('generate-invoice', 'Generate Invoice')} disabled={processing}
                    className="ti-btn ti-btn-info-full !text-white disabled:opacity-50">
                    <i className="ri-file-text-line me-1"></i>{processing ? 'Processing...' : 'Generate Invoice'}
                  </button>
                )}
                {showMarkShipped && (
                  <button onClick={() => handleStatusAction('mark-shipped', 'Mark as Shipped')} disabled={processing}
                    className="ti-btn ti-btn-primary-full !text-white disabled:opacity-50">
                    <i className="ri-truck-line me-1"></i>{processing ? 'Processing...' : 'Mark Shipped'}
                  </button>
                )}
                {showMarkDelivered && (
                  <button onClick={() => handleStatusAction('mark-delivered', 'Mark as Delivered')} disabled={processing}
                    className="ti-btn ti-btn-success-full !text-white disabled:opacity-50">
                    <i className="ri-checkbox-circle-line me-1"></i>{processing ? 'Processing...' : 'Mark Delivered'}
                  </button>
                )}
                {status === 'delivered' && (
                  <span className="badge bg-success/20 text-success text-[0.875rem] px-4 py-2">Order Complete</span>
                )}
                {status === 'cancelled' && (
                  <span className="badge bg-danger/20 text-danger text-[0.875rem] px-4 py-2">Order Cancelled</span>
                )}
                {!showGenerateInvoice && !showMarkShipped && !showMarkDelivered && status !== 'delivered' && status !== 'cancelled' && (
                  <p className="text-[#8c9097] text-[0.813rem]">
                    {status === 'confirmed' ? 'Verify payment receipts first, then generate invoice.' : `Current status: ${currentOrder.status}`}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Order Items */}
          <div className="box">
            <div className="box-header"><h4 className="box-title">Order Details</h4></div>
            <div className="box-body">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <span className="text-[#8c9097] text-[0.875rem]">Status</span>
                  <p><span className={`badge bg-${getStatusColor(currentOrder.status)}/20 text-${getStatusColor(currentOrder.status)}`}>{currentOrder.status}</span></p>
                </div>
                <div>
                  <span className="text-[#8c9097] text-[0.875rem]">Silver</span>
                  <p className="font-semibold">{(currentOrder as any).quantityGrams ? `${(currentOrder as any).quantityGrams}g` : '—'}</p>
                </div>
                <div>
                  <span className="text-[#8c9097] text-[0.875rem]">Rate</span>
                  <p className="font-semibold">{(currentOrder as any).ratePerGram ? `NPR ${(currentOrder as any).ratePerGram}/g` : '—'}</p>
                </div>
                <div>
                  <span className="text-[#8c9097] text-[0.875rem]">Zoho ID</span>
                  <p className="text-[0.75rem] font-mono text-[#8c9097]">{currentOrder.zohoSalesOrderId || '—'}</p>
                </div>
              </div>

              {currentOrder.lineItems && currentOrder.lineItems.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="ti-custom-table ti-striped-table ti-custom-table-hover">
                    <thead>
                      <tr>
                        <th>Item</th><th>SKU</th><th className="text-right">Rate</th>
                        <th className="text-right">Qty</th><th className="text-right">Tax</th><th className="text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentOrder.lineItems.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="font-semibold">{item.itemName || '-'}</td>
                          <td className="text-[0.75rem] text-[#8c9097]">{item.sku || '-'}</td>
                          <td className="text-right">Rs. {(item.rate || 0).toLocaleString()}</td>
                          <td className="text-right">{item.quantity}</td>
                          <td className="text-right">Rs. {(item.taxAmount || 0).toLocaleString()}</td>
                          <td className="text-right font-semibold">Rs. {(item.lineTotal || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-4 text-[#8c9097]">
                  <p className="text-[0.813rem]">Silver order placed via mobile app — no line items.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Order Summary Sidebar */}
        <div className="xl:col-span-4 col-span-12">
          <div className="box">
            <div className="box-header"><h4 className="box-title">Order Summary</h4></div>
            <div className="box-body space-y-3">
              <div className="flex justify-between">
                <span className="text-[#8c9097]">Subtotal</span>
                <span className="font-semibold">Rs. {(currentOrder.subTotal || currentOrder.totalAmount || 0).toLocaleString()}</span>
              </div>
              {(currentOrder.taxAmount || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#8c9097]">Making Charge</span>
                  <span className="font-semibold">Rs. {currentOrder.taxAmount.toLocaleString()}</span>
                </div>
              )}
              <div className="border-t pt-3">
                <div className="flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="font-semibold text-primary text-[1.125rem]">Rs. {currentOrder.totalAmount?.toLocaleString()}</span>
                </div>
              </div>
              {(currentOrder as any).paidAmount > 0 && (
                <div className="flex justify-between text-success">
                  <span>Paid</span>
                  <span className="font-semibold">Rs. {(currentOrder as any).paidAmount?.toLocaleString()}</span>
                </div>
              )}
              {(currentOrder as any).balanceDue > 0 && (
                <div className="flex justify-between text-danger">
                  <span>Balance Due</span>
                  <span className="font-semibold">Rs. {(currentOrder as any).balanceDue?.toLocaleString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="box mt-4">
            <div className="box-header"><h4 className="box-title">Actions</h4></div>
            <div className="box-body space-y-2">
              <Link href={`/orders/${id}/payment`} className="ti-btn ti-btn-light !opacity-100 w-full justify-start">
                <i className="ri-money-dollar-circle-line me-2"></i>Manage Payment
              </Link>
              <a href={`${API_URL}/orders/${id}/invoice-pdf`} target="_blank" rel="noopener noreferrer"
                className="ti-btn ti-btn-light !opacity-100 w-full justify-start">
                <i className="ri-file-download-line me-2"></i>Download Invoice PDF
              </a>
              <button onClick={handleDelete} className="ti-btn ti-btn-danger-full !text-white w-full justify-start">
                <i className="ri-delete-bin-line me-2"></i>Delete Order
              </button>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default OrderDetailPage;
