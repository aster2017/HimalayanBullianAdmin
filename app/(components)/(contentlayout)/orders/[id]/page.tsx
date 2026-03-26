'use client';

import { Fragment, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/shared/redux/hooks';
import { fetchOrderById, deleteOrder } from '@/shared/redux/ordersSlice';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const OrderDetailPage = () => {
  useProtectedRoute();

  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { currentOrder, loading, error } = useAppSelector((state) => state.orders);

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
              <button className="ti-btn ti-btn-primary !text-white">Back to Orders</button>
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
          <Link href="/orders">
            <button className="ti-btn ti-btn-light">Back</button>
          </Link>
          <button
            onClick={handleDelete}
            className="ti-btn ti-btn-danger !text-white"
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
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <span className="text-[#8c9097] text-[0.875rem]">Order Date</span>
                  <p className="font-semibold">
                    {new Date(currentOrder.orderDate).toLocaleDateString('en-PK')}
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
              </div>

              <div className="border-t pt-6">
                <h5 className="font-semibold mb-4">Order Items</h5>
                {currentOrder.lineItems && currentOrder.lineItems.length > 0 ? (
                  <div className="space-y-4">
                    {currentOrder.lineItems.map((item, index) => (
                      <div key={index} className="flex justify-between items-center pb-4 border-b">
                        <div>
                          <p className="font-semibold">{item.productName}</p>
                          <p className="text-[#8c9097] text-[0.875rem]">
                            Qty: {item.quantity}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">
                            Rs. {(item.unitPrice * item.quantity).toLocaleString('en-PK')}
                          </p>
                          <p className="text-[#8c9097] text-[0.875rem]">
                            @ Rs. {item.unitPrice?.toLocaleString('en-PK')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[#8c9097]">No items in this order</p>
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
                  Rs. {(currentOrder.totalAmount - (currentOrder.taxAmount || 0)).toLocaleString('en-PK')}
                </span>
              </div>
              {currentOrder.taxAmount && (
                <div className="flex justify-between">
                  <span className="text-[#8c9097]">Tax</span>
                  <span className="font-semibold">
                    Rs. {currentOrder.taxAmount.toLocaleString('en-PK')}
                  </span>
                </div>
              )}
              {currentOrder.discountAmount && (
                <div className="flex justify-between text-success">
                  <span>Discount</span>
                  <span className="font-semibold">
                    -Rs. {currentOrder.discountAmount.toLocaleString('en-PK')}
                  </span>
                </div>
              )}
              <div className="border-t pt-4">
                <div className="flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="font-semibold text-primary text-[1.125rem]">
                    Rs. {currentOrder.totalAmount?.toLocaleString('en-PK')}
                  </span>
                </div>
              </div>

              {currentOrder.billingAddress && (
                <div className="border-t pt-4">
                  <h5 className="font-semibold mb-2">Billing Address</h5>
                  <p className="text-[0.875rem] text-[#8c9097]">
                    {currentOrder.billingAddress.street}
                    <br />
                    {currentOrder.billingAddress.city}, {currentOrder.billingAddress.state}
                    <br />
                    {currentOrder.billingAddress.zipCode}
                  </p>
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
