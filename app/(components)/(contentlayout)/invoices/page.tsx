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
  const [searchTerm, setSearchTerm] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const pageSize = 20;

  useEffect(() => {
    dispatch(fetchInvoices({ page: currentPage, pageSize, search: searchTerm || undefined } as any));
  }, [dispatch, currentPage, searchTerm]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchTerm(searchInput);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => setCurrentPage(page);

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

  const totalPages = Math.ceil((pagination?.totalCount || 0) / pageSize);

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
    <Fragment>
      <Seo title="Invoices" />

      <div className="md:flex block items-center justify-between my-[1.5rem] page-header-breadcrumb">
        <div>
          <p className="font-semibold text-[1.125rem] text-defaulttextcolor dark:text-defaulttextcolor/70 !mb-0">
            Invoices
          </p>
          <p className="font-normal text-[#8c9097] dark:text-white/50 text-[0.813rem]">
            View and manage all invoices
          </p>
        </div>
        <form onSubmit={handleSearch} className="flex gap-2 mt-2 md:mt-0">
          <input type="text" value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search invoices..." className="form-control form-control-sm w-[250px]" />
          <button type="submit" className="ti-btn ti-btn-sm ti-btn-light !opacity-100"><i className="ri-search-line"></i></button>
          {searchTerm && (
            <button type="button" onClick={() => { setSearchTerm(''); setSearchInput(''); setCurrentPage(1); }}
              className="ti-btn ti-btn-sm ti-btn-danger-full !text-white"><i className="ri-close-line"></i></button>
          )}
        </form>
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
                  <th>Invoice #</th>
                  <th>Customer</th>
                  <th>Order #</th>
                  <th>Date</th>
                  <th>Due Date</th>
                  <th>Amount</th>
                  <th>Paid</th>
                  <th>Balance</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((invoice: any) => (
                  <tr key={invoice.id}>
                    <td><span className="font-semibold">{invoice.invoiceNumber}</span></td>
                    <td className="text-[0.813rem]">{invoice.customerName || '-'}</td>
                    <td className="text-[0.75rem] text-[#8c9097]">{invoice.orderNumber || '-'}</td>
                    <td>{new Date(invoice.invoiceDate).toLocaleDateString('en-GB')}</td>
                    <td>{invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-GB') : '-'}</td>
                    <td><span className="font-semibold">Rs. {invoice.totalAmount?.toLocaleString()}</span></td>
                    <td className="text-success">Rs. {(invoice.paidAmount || 0).toLocaleString()}</td>
                    <td className={invoice.balanceAmount > 0 ? 'text-danger' : ''}>
                      Rs. {(invoice.balanceAmount || 0).toLocaleString()}
                    </td>
                    <td>
                      <span className={`badge bg-${getStatusColor(invoice.status)}/20 text-${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </td>
                    <td>
                      <Link href={`/invoices/${invoice.id}`}>
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
      {!loading && items.length > 0 && totalPages > 1 && (
        <div className="box mt-4">
          <div className="box-body flex items-center justify-between">
            <p className="text-[0.813rem] text-[#8c9097] mb-0">
              Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, pagination.totalCount)} of {pagination.totalCount.toLocaleString()} invoices
            </p>
            <nav>
              <ul className="ti-pagination mb-0">
                <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => handlePageChange(Math.max(1, currentPage - 1))} disabled={currentPage === 1}>Previous</button>
                </li>
                {getPageNumbers().map((pg, idx) => (
                  <li key={idx} className={`page-item ${pg === currentPage ? 'active' : ''} ${pg === '...' ? 'disabled' : ''}`}>
                    {pg === '...' ? (
                      <span className="page-link">...</span>
                    ) : (
                      <button className="page-link" onClick={() => handlePageChange(pg as number)}>{pg}</button>
                    )}
                  </li>
                ))}
                <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                  <button className="page-link" onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}>Next</button>
                </li>
              </ul>
            </nav>
          </div>
        </div>
      )}
    </Fragment>
  );
};

export default InvoicesPage;
