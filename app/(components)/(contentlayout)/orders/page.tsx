'use client';

import { Fragment, useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/shared/redux/hooks';
import { fetchOrders } from '@/shared/redux/ordersSlice';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';

const OrdersPage = () => {
  useProtectedRoute();

  const dispatch = useAppDispatch();
  const { items, loading, error, pagination } = useAppSelector((state) => state.orders);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    dispatch(
      fetchOrders({
        page: currentPage,
        pageSize,
      })
    );
  }, [dispatch, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

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
      <Seo title="Orders" />

      <div className="md:flex block items-center justify-between my-[1.5rem] page-header-breadcrumb">
        <div>
          <p className="font-semibold text-[1.125rem] text-defaulttextcolor dark:text-defaulttextcolor/70 !mb-0">
            Orders
          </p>
          <p className="font-normal text-[#8c9097] dark:text-white/50 text-[0.813rem]">
            Manage and track all orders
          </p>
        </div>
        <Link href="/orders/create">
          <button className="ti-btn ti-btn-primary !text-white mt-2 md:mt-0">
            <i className="ri-add-line inline-block me-2"></i>Create Order
          </button>
        </Link>
      </div>

      {error && (
        <div className="p-4 mb-4 bg-danger/40 text-sm border-t-4 border-danger text-danger/60 rounded-lg">
          {error}
        </div>
      )}

      <div className="box">
        {loading ? (
          <div className="box-body text-center py-12">
            <div className="inline-block">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="mt-4 text-[#8c9097]">Loading orders...</p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="box-body text-center py-12">
            <p className="text-[#8c9097]">No orders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ti-custom-table ti-striped-table ti-custom-table-hover">
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Order Date</th>
                  <th>Total Amount</th>
                  <th>Status</th>
                  <th>Items</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <span className="font-semibold">{order.orderNumber}</span>
                    </td>
                    <td>{new Date(order.orderDate).toLocaleDateString('en-PK')}</td>
                    <td>
                      <span className="font-semibold">
                        Rs. {order.totalAmount?.toLocaleString('en-PK')}
                      </span>
                    </td>
                    <td>
                      <span className={`badge bg-${getStatusColor(order.status)}/20 text-${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>{order.lineItems?.length || 0}</td>
                    <td>
                      <Link href={`/orders/${order.id}`}>
                        <button className="ti-btn ti-btn-sm ti-btn-light">View</button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && items.length > 0 && pagination.totalCount > 0 && (
        <div className="flex justify-center mt-8">
          <nav aria-label="Page navigation">
            <ul className="flex gap-2">
              <li>
                <button
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="ti-btn ti-btn-light disabled:opacity-50"
                >
                  Previous
                </button>
              </li>
              {Array.from({
                length: Math.ceil(pagination.totalCount / pageSize),
              }).map((_, index) => (
                <li key={index + 1}>
                  <button
                    onClick={() => handlePageChange(index + 1)}
                    className={`ti-btn ${
                      currentPage === index + 1
                        ? 'ti-btn-primary !text-white'
                        : 'ti-btn-light'
                    }`}
                  >
                    {index + 1}
                  </button>
                </li>
              ))}
              <li>
                <button
                  onClick={() =>
                    handlePageChange(
                      Math.min(
                        Math.ceil(pagination.totalCount / pageSize),
                        currentPage + 1
                      )
                    )
                  }
                  disabled={currentPage === Math.ceil(pagination.totalCount / pageSize)}
                  className="ti-btn ti-btn-light disabled:opacity-50"
                >
                  Next
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </Fragment>
  );
};

export default OrdersPage;
