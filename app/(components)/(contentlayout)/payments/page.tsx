'use client';

import { Fragment, useEffect, useState } from 'react';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { useDebouncedSearch } from '@/shared/hooks/useDebouncedSearch';
import { Pagination } from '@/shared/components/Pagination';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import apiClient from '@/shared/services/apiClient';

const PaymentsPage = () => {
  useProtectedRoute();

  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const search = useDebouncedSearch('', 300);

  useEffect(() => { setCurrentPage(1); }, [search.value, pageSize]);

  useEffect(() => {
    const fetchPayments = async () => {
      setLoading(true);
      try {
        const params: any = { page: currentPage, pageSize };
        if (search.value.trim()) params.search = search.value.trim();
        const res = await apiClient.get('/payments', { params });
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
  }, [currentPage, pageSize, search.value]);

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

      <div className="md:flex block items-center justify-between my-[1.5rem] page-header-breadcrumb gap-4">
        <div>
          <p className="font-semibold text-[1.125rem] text-defaulttextcolor dark:text-defaulttextcolor/70 !mb-0">
            Payments
          </p>
          <p className="font-normal text-[#8c9097] dark:text-white/50 text-[0.813rem]">
            {totalCount} payments total
          </p>
        </div>
        <div className="mt-2 md:mt-0">
          <input
            type="text"
            value={search.immediate}
            onChange={e => search.setValue(e.target.value)}
            placeholder="Search reference / customer…"
            className="form-control w-full md:w-64"
          />
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
                    <td>{new Date(payment.paymentDate).toLocaleDateString('en-NP')}</td>
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
      {!loading && totalCount > 0 && (
        <div className="box mt-4">
          <div className="box-body">
            <Pagination
              page={currentPage}
              pageSize={pageSize}
              totalCount={totalCount}
              onPageChange={setCurrentPage}
              pageSizeOptions={[25, 50, 100]}
              onPageSizeChange={setPageSize}
            />
          </div>
        </div>
      )}
    </Fragment>
  );
};

export default PaymentsPage;
