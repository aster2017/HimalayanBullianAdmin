'use client';

import { Fragment, useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/shared/redux/hooks';
import { fetchInvoices } from '@/shared/redux/invoicesSlice';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';

const InvoicesPage = () => {
  useProtectedRoute();

  const dispatch = useAppDispatch();
  const { items, loading, error, pagination } = useAppSelector((state) => state.invoices);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    dispatch(
      fetchInvoices({
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
      case 'draft':
        return 'secondary';
      case 'sent':
        return 'info';
      case 'paid':
        return 'success';
      case 'overdue':
        return 'danger';
      case 'cancelled':
        return 'danger';
      default:
        return 'secondary';
    }
  };

  return (
    <Fragment>
      <Seo title="Invoices" />

      <div className="md:flex block items-center justify-between my-[1.5rem] page-header-breadcrumb">
        <div>
          <p className="font-semibold text-[1.125rem] text-defaulttextcolor dark:text-defaulttextcolor/70 !mb-0">
            Invoices
          </p>
          <p className="font-normal text-[#8c9097] dark:text-white/50 text-[0.813rem]">
            View and manage all your invoices
          </p>
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
              <p className="mt-4 text-[#8c9097]">Loading invoices...</p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="box-body text-center py-12">
            <p className="text-[#8c9097]">No invoices found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ti-custom-table ti-striped-table ti-custom-table-hover">
              <thead>
                <tr>
                  <th>Invoice Number</th>
                  <th>Invoice Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Due Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <span className="font-semibold">{invoice.invoiceNumber}</span>
                    </td>
                    <td>{new Date(invoice.invoiceDate).toLocaleDateString('en-PK')}</td>
                    <td>
                      <span className="font-semibold">
                        Rs. {invoice.totalAmount?.toLocaleString('en-PK')}
                      </span>
                    </td>
                    <td>
                      <span className={`badge bg-${getStatusColor(invoice.status)}/20 text-${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td>{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-PK') : '-'}</td>
                    <td>
                      <div className="flex gap-2">
                        <Link href={`/invoices/${invoice.id}`}>
                          <button className="ti-btn ti-btn-sm ti-btn-light">View</button>
                        </Link>
                        {invoice.status !== 'draft' && (
                          <button className="ti-btn ti-btn-sm ti-btn-primary !text-white">
                            <i className="ri-download-line inline-block"></i>Download
                          </button>
                        )}
                      </div>
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

export default InvoicesPage;
