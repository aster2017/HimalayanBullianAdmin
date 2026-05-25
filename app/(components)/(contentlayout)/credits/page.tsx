'use client';

import { Fragment, useEffect, useState } from 'react';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import apiClient from '@/shared/services/apiClient';

type LedgerItem = {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  type: 'Deposit' | 'Deduction' | 'Refund';
  amount: number;
  balanceAfter: number;
  description?: string;
  referenceNumber?: string;
  connectIpsTransactionId?: string;
  paymentMethod?: string;
  status: 'Pending' | 'Verified' | 'Rejected';
  orderId?: string;
  createdAt: string;
  verifiedAt?: string;
};

type Summary = { deposited: number; deducted: number; refunded: number; netInflow: number };

const CreditsPage = () => {
  useProtectedRoute();

  const [items, setItems] = useState<LedgerItem[]>([]);
  const [summary, setSummary] = useState<Summary>({ deposited: 0, deducted: 0, refunded: 0, netInflow: 0 });
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  // Filters
  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [method, setMethod] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const fetchLedger = async () => {
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, any> = { page, pageSize };
        if (type) params.type = type;
        if (status) params.status = status;
        if (method) params.method = method;
        if (debouncedSearch) params.search = debouncedSearch;
        const res = await apiClient.get('/credits/admin/ledger', { params });
        const data = res.data?.data || res.data;
        setItems(data?.items || []);
        setTotalCount(data?.totalCount || 0);
        setSummary(data?.summary || { deposited: 0, deducted: 0, refunded: 0, netInflow: 0 });
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load credit ledger');
      } finally {
        setLoading(false);
      }
    };
    fetchLedger();
  }, [page, type, status, method, debouncedSearch]);

  const totalPages = Math.ceil(totalCount / pageSize);

  const typeColor = (t: string) =>
    t === 'Deposit' ? 'success' : t === 'Refund' ? 'info' : 'warning';

  const statusColor = (s: string) =>
    s === 'Verified' ? 'success' : s === 'Rejected' ? 'danger' : 'warning';

  const methodColor = (m?: string) => {
    switch (m?.toLowerCase()) {
      case 'connectips': return 'warning';
      case 'banktransfer': case 'bank transfer': return 'info';
      case 'cash': return 'success';
      case 'directadd': return 'secondary';
      default: return 'secondary';
    }
  };

  const resetFilters = () => {
    setType(''); setStatus(''); setMethod(''); setSearch(''); setPage(1);
  };

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push('...');
      const start = Math.max(2, page - 1);
      const end = Math.min(totalPages - 1, page + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (page < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <Fragment>
      <Seo title="Credit Ledger" />

      <div className="md:flex block items-center justify-between my-[1.5rem] page-header-breadcrumb">
        <div>
          <p className="font-semibold text-[1.125rem] text-defaulttextcolor dark:text-defaulttextcolor/70 !mb-0">
            Credit Ledger
          </p>
          <p className="font-normal text-[#8c9097] dark:text-white/50 text-[0.813rem]">
            All wallet top-ups, deductions and refunds across customers
          </p>
        </div>
        <Link href="/credits/pending">
          <button className="ti-btn ti-btn-warning !text-white mt-2 md:mt-0">
            <i className="ri-time-line me-1"></i>Pending Deposits
          </button>
        </Link>
      </div>

      {/* Summary tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        <div className="box p-4">
          <p className="text-xs text-gray-500 mb-1">Deposited</p>
          <p className="text-xl font-bold text-success">Rs. {summary.deposited.toLocaleString()}</p>
        </div>
        <div className="box p-4">
          <p className="text-xs text-gray-500 mb-1">Deducted</p>
          <p className="text-xl font-bold text-warning">Rs. {summary.deducted.toLocaleString()}</p>
        </div>
        <div className="box p-4">
          <p className="text-xs text-gray-500 mb-1">Refunded</p>
          <p className="text-xl font-bold text-info">Rs. {summary.refunded.toLocaleString()}</p>
        </div>
        <div className="box p-4">
          <p className="text-xs text-gray-500 mb-1">Net Inflow</p>
          <p className="text-xl font-bold text-primary">Rs. {summary.netInflow.toLocaleString()}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="box mb-4">
        <div className="box-body grid grid-cols-1 md:grid-cols-5 gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search name / email / ref"
            className="form-control"
          />
          <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} className="form-select">
            <option value="">All types</option>
            <option value="Deposit">Deposit</option>
            <option value="Deduction">Deduction</option>
            <option value="Refund">Refund</option>
          </select>
          <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="form-select">
            <option value="">All statuses</option>
            <option value="Verified">Verified</option>
            <option value="Pending">Pending</option>
            <option value="Rejected">Rejected</option>
          </select>
          <select value={method} onChange={(e) => { setMethod(e.target.value); setPage(1); }} className="form-select">
            <option value="">All methods</option>
            <option value="ConnectIPS">ConnectIPS</option>
            <option value="BankTransfer">Bank Transfer</option>
            <option value="Cash">Cash</option>
            <option value="DirectAdd">Direct (admin)</option>
          </select>
          <button onClick={resetFilters} className="ti-btn ti-btn-light">Reset filters</button>
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
            <p className="mt-4 text-[#8c9097]">Loading credit transactions...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="box-body text-center py-12">
            <p className="text-[#8c9097]">No credit transactions found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="ti-custom-table ti-striped-table ti-custom-table-hover">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {items.map((t) => (
                  <tr key={t.id}>
                    <td className="text-[0.813rem] whitespace-nowrap">
                      {new Date(t.createdAt).toLocaleDateString('en-NP')}
                      <div className="text-[0.7rem] text-gray-400">
                        {new Date(t.createdAt).toLocaleTimeString('en-NP', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td>
                      <Link href={`/customers/${t.customerId}`} className="text-primary text-sm hover:underline">
                        {t.customerName.trim() || t.customerEmail}
                      </Link>
                      <div className="text-[0.7rem] text-gray-400">{t.customerEmail}</div>
                    </td>
                    <td>
                      <span className={`badge bg-${typeColor(t.type)}/20 text-${typeColor(t.type)}`}>
                        {t.type === 'Deduction' ? '−' : '+'} {t.type}
                      </span>
                    </td>
                    <td>
                      <span className={`font-semibold ${t.type === 'Deduction' ? 'text-warning' : 'text-success'}`}>
                        Rs. {t.amount.toLocaleString()}
                      </span>
                      {t.balanceAfter !== undefined && t.balanceAfter !== null && (
                        <div className="text-[0.7rem] text-gray-400">bal Rs. {t.balanceAfter.toLocaleString()}</div>
                      )}
                    </td>
                    <td>
                      <span className={`badge bg-${methodColor(t.paymentMethod)}/20 text-${methodColor(t.paymentMethod)}`}>
                        {t.paymentMethod || '—'}
                      </span>
                    </td>
                    <td className="font-mono text-[0.7rem]">
                      {t.connectIpsTransactionId
                        ? <span title={t.connectIpsTransactionId}>{t.connectIpsTransactionId}</span>
                        : t.referenceNumber || <span className="text-gray-400">—</span>}
                    </td>
                    <td>
                      <span className={`badge bg-${statusColor(t.status)}/20 text-${statusColor(t.status)}`}>
                        {t.status}
                      </span>
                    </td>
                    <td>
                      <Link href={`/credits/${t.id}`}>
                        <button className="ti-btn ti-btn-sm ti-btn-light !opacity-100" title="Open transaction detail">
                          <i className="ri-eye-line"></i>
                        </button>
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
          <div className="box-body flex items-center justify-between flex-wrap gap-4">
            <p className="text-[0.813rem] text-[#8c9097] mb-0">
              Showing {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, totalCount)} of {totalCount} transactions
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1}
                className="px-3 py-1.5 text-[0.813rem] border border-defaultborder rounded-sm text-defaulttextcolor hover:bg-primary hover:text-white hover:border-primary disabled:opacity-50 disabled:pointer-events-none transition-colors">
                &laquo; Previous
              </button>
              {getPageNumbers().map((pg, idx) => (
                pg === '...' ? (
                  <span key={idx} className="px-3 py-1.5 text-[0.813rem] text-[#8c9097]">...</span>
                ) : (
                  <button key={idx} onClick={() => setPage(pg as number)}
                    className={`px-3 py-1.5 text-[0.813rem] border rounded-sm transition-colors ${
                      page === pg ? 'bg-primary text-white border-primary' : 'border-defaultborder text-defaulttextcolor hover:bg-primary hover:text-white hover:border-primary'
                    }`}>{pg}</button>
                )
              ))}
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages}
                className="px-3 py-1.5 text-[0.813rem] border border-defaultborder rounded-sm text-defaulttextcolor hover:bg-primary hover:text-white hover:border-primary disabled:opacity-50 disabled:pointer-events-none transition-colors">
                Next &raquo;
              </button>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
};

export default CreditsPage;
