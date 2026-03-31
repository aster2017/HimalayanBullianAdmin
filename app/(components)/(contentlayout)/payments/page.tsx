'use client';

import { Fragment, useEffect, useState } from 'react';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import apiClient from '@/shared/services/apiClient';

const PaymentsPage = () => {
  useProtectedRoute();

  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const pageSize = 20;

  useEffect(() => {
    const fetchPayments = async () => {
      setLoading(true);
      try {
        const res = await apiClient.get('/payments', { params: { page: currentPage, pageSize } });
        const data = res.data?.data || res.data;
        setPayments(data?.items || []);
        setTotalCount(data?.totalCount || 0);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load payments');
      } finally {
        setLoading(false);
      }
    };
    fetchPayments();
  }, [currentPage]);

  const totalPages = Math.ceil(totalCount / pageSize);

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

  const getMethodColor = (method: string) => {
    switch (method?.toLowerCase()) {
      case 'cash': return 'success';
      case 'banktransfer': case 'bank transfer': return 'info';
      case 'card': return 'primary';
      case 'connectips': return 'warning';
      default: return 'secondary';
    }
  };

  return (
    <Fragment>
      <Seo title="Payments" />

      <div className="md:flex block items-center justify-between my-[1.5rem] page-header-breadcrumb">
        <div>
          <p className="font-semibold text-[1.125rem] text-defaulttextcolor dark:text-defaulttextcolor/70 !mb-0">
            Payments
          </p>
          <p className="font-normal text-[#8c9097] dark:text-white/50 text-[0.813rem]">
            View all payment records
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
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary inline-block"></div>
            <p className="mt-4 text-[#8c9097]">Loading payments...</p>
          </div>
        ) : payments.length === 0 ? (
          <div className="box-body text-center py-12">
            <p className="text-[#8c9097]">No payments found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ti-custom-table ti-striped-table ti-custom-table-hover">
              <thead>
                <tr>
                  <th>Payment #</th>
                  <th>Invoice #</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment: any) => (
                  <tr key={payment.id}>
                    <td><span className="font-semibold">{payment.paymentNumber}</span></td>
                    <td className="text-[0.813rem]">{payment.invoiceNumber || '-'}</td>
                    <td>{new Date(payment.paymentDate).toLocaleDateString('en-GB')}</td>
                    <td><span className="font-semibold text-success">Rs. {payment.amount?.toLocaleString()}</span></td>
                    <td>
                      <span className={`badge bg-${getMethodColor(payment.paymentMethod)}/20 text-${getMethodColor(payment.paymentMethod)}`}>
                        {payment.paymentMethod}
                      </span>
                    </td>
                    <td>
                      <span className="badge bg-success/20 text-success">{payment.status}</span>
                    </td>
                    <td>
                      <Link href={`/payments/${payment.id}`}>
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
      {!loading && payments.length > 0 && totalPages > 1 && (
        <div className="flex items-center justify-between mt-4 px-4 pb-4">
          <p className="text-[0.813rem] text-[#8c9097]">
            Showing {(currentPage - 1) * pageSize + 1}-{Math.min(currentPage * pageSize, totalCount)} of {totalCount} payments
          </p>
          <nav>
            <ul className="flex gap-1">
              <li>
                <button onClick={() => setCurrentPage(Math.max(1, currentPage - 1))} disabled={currentPage === 1}
                  className="ti-btn ti-btn-sm ti-btn-light disabled:opacity-50">Previous</button>
              </li>
              {getPageNumbers().map((pg, idx) => (
                <li key={idx}>
                  {pg === '...' ? (
                    <span className="ti-btn ti-btn-sm ti-btn-light pointer-events-none">...</span>
                  ) : (
                    <button onClick={() => setCurrentPage(pg as number)}
                      className={`ti-btn ti-btn-sm ${currentPage === pg ? 'ti-btn-primary !text-white' : 'ti-btn-light'}`}>{pg}</button>
                  )}
                </li>
              ))}
              <li>
                <button onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))} disabled={currentPage === totalPages}
                  className="ti-btn ti-btn-sm ti-btn-light disabled:opacity-50">Next</button>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </Fragment>
  );
};

export default PaymentsPage;
