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

const OrderDetailPage = () => {
  useProtectedRoute();

  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { currentOrder, loading, error } = useAppSelector((state) => state.orders);
  const [fetchingDetails, setFetchingDetails] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    if (id) {
      dispatch(fetchOrderById(id));
    }
  }, [dispatch, id]);

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this order?')) {
      dispatch(deleteOrder(id)).then(() => {
        router.push('/orders');
      });
    }
  };

  /** Generic action runner — posts to an endpoint, shows toast, refetches. */
  const runAction = async (
    label: string,
    endpoint: string,
    successMsg: string,
    confirm?: string
  ) => {
    if (confirm && !window.confirm(confirm)) return;
    setActionBusy(label);
    try {
      const r = await apiClient.post(endpoint);
      if (r.data?.success === false) {
        toast.error(r.data?.message || `${label} failed`);
      } else {
        toast.success(successMsg);
        dispatch(fetchOrderById(id));
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || `${label} failed`);
    } finally {
      setActionBusy(null);
    }
  };

  const cancelOrder = async () => {
    if (!cancelReason.trim()) {
      toast.error('Cancellation reason is required');
      return;
    }
    setActionBusy('cancel');
    try {
      const r = await apiClient.delete(`/orders/${id}`, { data: { reason: cancelReason } });
      if (r.data?.success !== false) {
        toast.success('Order cancelled');
        setCancelOpen(false);
        setCancelReason('');
        dispatch(fetchOrderById(id));
      } else {
        toast.error(r.data?.message || 'Cancel failed');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Cancel failed');
    } finally {
      setActionBusy(null);
    }
  };

  /** Buttons the admin should see based on current order status. */
  const availableActions = (): { label: string; run: () => void; tone: 'primary' | 'warning' | 'danger' | 'info' }[] => {
    if (!currentOrder) return [];
    const s = String(currentOrder.status || '').toLowerCase();
    const isCollected = !!(currentOrder as any).collectedAt;
    const isCancelled = s === 'cancelled';
    if (isCancelled) return [];

    const actions: any[] = [];

    // Step 1: collect (parsed silver weight at collection time)
    if (!isCollected && (s === 'confirmed' || s === 'draft')) {
      actions.push({
        label: 'Mark Collected',
        tone: 'primary',
        run: () => runAction('Mark Collected', `/orders/${id}/mark-collected`, 'Order marked as collected'),
      });
    }

    // Step 2: generate invoice (admin-only path; sets status=Invoiced)
    if (s === 'confirmed' || s === 'draft') {
      actions.push({
        label: 'Generate Invoice',
        tone: 'info',
        run: () => runAction('Generate Invoice', `/orders/${id}/generate-invoice`, 'Invoice generated'),
      });
    }

    // Step 3+: ship + deliver
    if (s !== 'shipped' && s !== 'delivered') {
      actions.push({
        label: 'Mark Shipped',
        tone: 'primary',
        run: () => runAction('Mark Shipped', `/orders/${id}/mark-shipped`, 'Order marked as shipped'),
      });
    }
    if (s !== 'delivered') {
      actions.push({
        label: 'Mark Delivered',
        tone: 'primary',
        run: () => runAction('Mark Delivered', `/orders/${id}/mark-delivered`, 'Order marked as delivered'),
      });
    }

    // Cancel — always available unless terminal
    if (s !== 'delivered') {
      actions.push({
        label: 'Cancel Order',
        tone: 'danger',
        run: () => setCancelOpen(true),
      });
    }

    return actions;
  };

  if (loading) {
    return (
      <Fragment>
        <Seo title="Order" />
        <div className="flex justify-center items-center h-96">
          <div className="text-center">
            <div className="inline-block">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="mt-4 text-[#8c9097]">Loading order...</p>
            </div>
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
            <Link href="/orders">
              <button className="ti-btn ti-btn-primary-full !text-white">Back to Orders</button>
            </Link>
          </div>
        </div>
      </Fragment>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'warning';
      case 'confirmed':
        return 'success';
      case 'shipped':
        return 'info';
      case 'delivered':
        return 'success';
      case 'cancelled':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  return (
    <Fragment>
      <Seo title={`Order ${currentOrder.orderNumber}`} />

      <div className="md:flex block items-center justify-between my-[1.5rem] page-header-breadcrumb">
        <div>
          <p className="font-semibold text-[1.125rem] text-defaulttextcolor dark:text-defaulttextcolor/70 !mb-0">
            Order {currentOrder.orderNumber}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 mt-2 md:mt-0">
          <Link href="/orders">
            <button className="ti-btn ti-btn-light !opacity-100">Back</button>
          </Link>
          {availableActions().map(a => {
            const cls = a.tone === 'danger' ? 'ti-btn-danger-full' :
                        a.tone === 'warning' ? 'ti-btn-warning-full' :
                        a.tone === 'info' ? 'ti-btn-info-full' : 'ti-btn-primary-full';
            return (
              <button
                key={a.label}
                onClick={a.run}
                disabled={!!actionBusy}
                className={`ti-btn ${cls} !text-white !opacity-100 disabled:!opacity-50`}
              >
                {actionBusy === a.label
                  ? <><i className="ri-loader-4-line animate-spin me-1"></i>{a.label}…</>
                  : a.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Cancel order modal */}
      {cancelOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold">Cancel order</h3>
              <button onClick={() => setCancelOpen(false)} className="text-gray-400 hover:text-gray-700">
                <i className="ri-close-line text-xl"></i>
              </button>
            </div>
            <div className="p-5 space-y-3">
              <p className="text-sm">
                This will cancel order <span className="font-mono font-semibold">{currentOrder.orderNumber}</span>.
                {currentOrder.status?.toLowerCase() === 'invoiced' && (
                  <span className="block text-warning text-xs mt-2">
                    <i className="ri-alert-line me-1"></i>
                    The associated invoice will need to be voided separately.
                  </span>
                )}
              </p>
              <div>
                <label className="form-label">Reason *</label>
                <textarea
                  className="form-control"
                  rows={3}
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  placeholder="e.g. Customer requested cancellation / out of stock / duplicate"
                  required
                />
              </div>
            </div>
            <div className="p-5 border-t flex justify-end gap-2">
              <button onClick={() => setCancelOpen(false)} className="btn btn-outline-secondary">Keep order</button>
              <button
                onClick={cancelOrder}
                disabled={!cancelReason.trim() || actionBusy === 'cancel'}
                className="ti-btn ti-btn-danger-full !text-white !opacity-100 disabled:!opacity-50"
              >
                {actionBusy === 'cancel' ? 'Cancelling…' : 'Cancel order'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* Order Summary */}
        <div className="xl:col-span-8 col-span-12">
          <div className="box">
            <div className="box-header">
              <h4 className="box-title">Order Details</h4>
            </div>
            <div className="box-body">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <span className="text-[#8c9097] text-[0.875rem]">Customer</span>
                  <p className="font-semibold">{currentOrder.customerName || '-'}</p>
                </div>
                <div>
                  <span className="text-[#8c9097] text-[0.875rem]">Order Date</span>
                  <p className="font-semibold">
                    {new Date(currentOrder.orderDate).toLocaleDateString('en-NP')}
                  </p>
                </div>
                <div>
                  <span className="text-[#8c9097] text-[0.875rem]">Status</span>
                  <p>
                    <span className={`badge bg-${getStatusColor(currentOrder.status)}/20 text-${getStatusColor(currentOrder.status)}`}>
                      {currentOrder.status}
                    </span>
                  </p>
                </div>
                <div>
                  <span className="text-[#8c9097] text-[0.875rem]">Zoho ID</span>
                  <p className="text-[0.75rem] font-mono text-[#8c9097]">{currentOrder.zohoSalesOrderId || '-'}</p>
                </div>
              </div>

              <div className="border-t pt-6">
                <h5 className="font-semibold mb-4">Order Items</h5>
                {currentOrder.lineItems && currentOrder.lineItems.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="ti-custom-table ti-striped-table ti-custom-table-hover">
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
                        {currentOrder.lineItems.map((item: any, index: number) => (
                          <tr key={index}>
                            <td className="font-semibold">{item.itemName || item.productName || '-'}</td>
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
                  <div className="text-center py-6">
                    {currentOrder.zohoSalesOrderId ? (
                      <>
                        <p className="text-[#8c9097] mb-3">Line items not synced yet.</p>
                        <button
                          onClick={async () => {
                            setFetchingDetails(true);
                            try {
                              await apiClient.post(`/zoho/orders/${id}/fetch-details`);
                              toast.success('Line items fetched from Zoho!');
                              dispatch(fetchOrderById(id));
                            } catch (err: any) {
                              toast.error(err?.response?.data?.error || 'Failed to fetch details');
                            } finally {
                              setFetchingDetails(false);
                            }
                          }}
                          disabled={fetchingDetails}
                          className="px-4 py-2 text-[0.813rem] rounded-sm bg-primary text-white hover:bg-primary/90 transition-colors inline-flex items-center"
                        >
                          {fetchingDetails ? (
                            <><i className="ri-loader-4-line animate-spin me-2"></i>Fetching...</>
                          ) : (
                            <><i className="ri-download-line me-2"></i>Fetch Items from Zoho</>
                          )}
                        </button>
                      </>
                    ) : (
                      <div className="text-[#8c9097]">
                        <i className="ri-information-line text-[1.5rem] mb-2 block"></i>
                        <p className="text-[0.813rem]">This is an auto-generated order from invoice sync.</p>
                        <p className="text-[0.75rem]">Line items are available in the linked invoice.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Order Summary Sidebar */}
        <div className="xl:col-span-4 col-span-12">
          <div className="box">
            <div className="box-header">
              <h4 className="box-title">Order Summary</h4>
            </div>
            <div className="box-body space-y-4">
              <div className="flex justify-between">
                <span className="text-[#8c9097]">Subtotal</span>
                <span className="font-semibold">
                  Rs. {(currentOrder.subTotal || currentOrder.totalAmount || 0).toLocaleString()}
                </span>
              </div>
              {(currentOrder.taxAmount || 0) > 0 && (
                <div className="flex justify-between">
                  <span className="text-[#8c9097]">Tax</span>
                  <span className="font-semibold">
                    Rs. {currentOrder.taxAmount.toLocaleString()}
                  </span>
                </div>
              )}
              {(currentOrder.discountAmount || 0) > 0 && (
                <div className="flex justify-between text-success">
                  <span>Discount</span>
                  <span className="font-semibold">
                    -Rs. {currentOrder.discountAmount.toLocaleString()}
                  </span>
                </div>
              )}
              <div className="border-t pt-4">
                <div className="flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="font-semibold text-primary text-[1.125rem]">
                    Rs. {currentOrder.totalAmount?.toLocaleString()}
                  </span>
                </div>
              </div>

              {currentOrder.customerNotes && (
                <div className="border-t pt-4">
                  <h5 className="font-semibold mb-2">Customer Notes</h5>
                  <p className="text-[0.875rem] text-[#8c9097]">{currentOrder.customerNotes}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default OrderDetailPage;
