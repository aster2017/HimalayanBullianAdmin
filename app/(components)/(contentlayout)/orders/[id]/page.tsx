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
        <div className="flex gap-2 mt-2 md:mt-0">
          <Link href={`/orders/${id}/payment`}>
            <button className="ti-btn ti-btn-primary-full !text-white">Manage Payment</button>
          </Link>
          <Link href="/orders">
            <button className="ti-btn ti-btn-light !opacity-100">Back</button>
          </Link>
          <button
            onClick={handleDelete}
            className="ti-btn ti-btn-danger-full !text-white"
          >
            Delete
          </button>
        </div>
      </div>

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
