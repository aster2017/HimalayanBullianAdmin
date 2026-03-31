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
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const pageSize = 20;

  useEffect(() => {
    dispatch(
      fetchOrders({
        page: currentPage,
        pageSize,
        search: searchTerm || undefined,
      } as any)
    );
  }, [dispatch, currentPage, searchTerm]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(searchInput);
    setCurrentPage(1);
  };

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
        <div className="flex gap-2 mt-2 md:mt-0">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search orders, customers..."
              className="form-control form-control-sm w-[250px]"
            />
            <button type="submit" className="ti-btn ti-btn-sm ti-btn-light !opacity-100">
              <i className="ri-search-line"></i>
            </button>
            {searchTerm && (
              <button type="button" onClick={() => { setSearchTerm(''); setSearchInput(''); setCurrentPage(1); }} className="ti-btn ti-btn-sm ti-btn-danger-full !text-white">
                <i className="ri-close-line"></i>
              </button>
            )}
          </form>
          <Link href="/orders/create">
            <button className="ti-btn ti-btn-primary-full !text-white">
              <i className="ri-add-line inline-block me-2"></i>Create Order
            </button>
          </Link>
        </div>
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
                  <th>Customer</th>
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
                    <td className="text-[0.813rem]">{order.customerName || '-'}</td>
                    <td>{new Date(order.orderDate).toLocaleDateString('en-GB')}</td>
                    <td>
                      <span className="font-semibold">
                        Rs. {order.totalAmount?.toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <span className={`badge bg-${getStatusColor(order.status)}/20 text-${getStatusColor(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>{order.lineItems?.length || '-'}</td>
                    <td>
                      <Link href={`/orders/${order.id}`}>
                        <button className="ti-btn ti-btn-sm ti-btn-light !opacity-100">View</button>
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
      {!loading && items.length > 0 && pagination.totalCount > 0 && (() => {
        const totalPages = Math.ceil(pagination.totalCount / pageSize);
        if (totalPages <= 1) return null;

        // Build page numbers with ellipsis
        const getPageNumbers = () => {
          const pages: (number | string)[] = [];
          if (totalPages <= 7) {
            for (let i = 1; i <= totalPages; i++) pages.push(i);
          } else {
            pages.push(1);
            if (currentPage > 3) pages.push('...');
            const start = Math.max(2, currentPage - 1);
            const end = Math.min(totalPages - 1, currentPage + 1);
            for (let i = start; i <= end; i++) pages.push(i);
            if (currentPage < totalPages - 2) pages.push('...');
            pages.push(totalPages);
          }
          return pages;
        };

        return (
          <div className="flex items-center justify-between mt-4 px-4 pb-4">
            <p className="text-[0.813rem] text-[#8c9097]">
              Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, pagination.totalCount)} of {pagination.totalCount} orders
            </p>
            <nav>
              <ul className="flex gap-1">
                <li>
                  <button
                    onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="ti-btn ti-btn-sm ti-btn-light disabled:opacity-50"
                  >
                    Previous
                  </button>
                </li>
                {getPageNumbers().map((pg, idx) => (
                  <li key={idx}>
                    {pg === '...' ? (
                      <span className="ti-btn ti-btn-sm ti-btn-light pointer-events-none">...</span>
                    ) : (
                      <button
                        onClick={() => handlePageChange(pg as number)}
                        className={`ti-btn ti-btn-sm ${currentPage === pg ? 'ti-btn-primary !text-white' : 'ti-btn-light'}`}
                      >
                        {pg}
                      </button>
                    )}
                  </li>
                ))}
                <li>
                  <button
                    onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="ti-btn ti-btn-sm ti-btn-light disabled:opacity-50"
                  >
                    Next
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        );
      })()}
    </Fragment>
  );
};

export default OrdersPage;
