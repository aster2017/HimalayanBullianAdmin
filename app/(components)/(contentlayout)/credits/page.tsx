'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
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

const AVATAR_COLORS = ['#C8A86B','#6366f1','#0891b2','#16a34a','#dc2626','#9333ea','#ea580c','#0284c7'];
function avatarColor(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) & 0xfffffff;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}
function avatarInitials(name: string) {
  const p = name.trim().split(/\s+/);
  return p.length >= 2 ? (p[0][0] + p[p.length - 1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}
function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-NP', { year: 'numeric', month: 'short', day: 'numeric' });
}
function fmtTime(s: string) {
  return new Date(s).toLocaleTimeString('en-NP', { hour: '2-digit', minute: '2-digit' });
}

const TYPE_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  Deposit:   { bg: '#dcfce7', text: '#15803d', label: '+ Deposit' },
  Deduction: { bg: '#fef3c7', text: '#b45309', label: '− Deduction' },
  Refund:    { bg: '#dbeafe', text: '#1d4ed8', label: '↩ Refund' },
};

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  Verified: { bg: '#dcfce7', text: '#15803d' },
  Pending:  { bg: '#fef3c7', text: '#b45309' },
  Rejected: { bg: '#fee2e2', text: '#dc2626' },
};

const METHOD_STYLES: Record<string, { bg: string; text: string }> = {
  connectips:   { bg: '#ede9fe', text: '#6d28d9' },
  banktransfer: { bg: '#dbeafe', text: '#1d4ed8' },
  cash:         { bg: '#dcfce7', text: '#15803d' },
  directadd:    { bg: '#f1f5f9', text: '#475569' },
};
function methodStyle(m?: string) {
  return METHOD_STYLES[(m || '').toLowerCase().replace(/\s/g, '')] || { bg: '#f1f5f9', text: '#475569' };
}
function methodLabel(m?: string) {
  const map: Record<string, string> = {
    connectips: 'ConnectIPS', banktransfer: 'Bank Transfer', cash: 'Cash', directadd: 'Direct (Admin)',
  };
  return map[(m || '').toLowerCase().replace(/\s/g, '')] || m || '—';
}

const CreditsPage = () => {
  useProtectedRoute();

  const [items, setItems] = useState<LedgerItem[]>([]);
  const [summary, setSummary] = useState<Summary>({ deposited: 0, deducted: 0, refunded: 0, netInflow: 0 });
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [pendingCount, setPendingCount] = useState(0);

  const [type, setType] = useState('');
  const [status, setStatus] = useState('');
  const [method, setMethod] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  useEffect(() => {
    apiClient.get('/credits/deposits/pending?pageSize=1')
      .then(r => setPendingCount(r.data?.totalCount || r.data?.data?.length || 0))
      .catch(() => {});
  }, []);

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
  const hasFilters = !!(type || status || method || search);

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

  const STAT_TILES = [
    { label: 'Total Deposited', value: `Rs. ${summary.deposited.toLocaleString()}`, icon: 'ri-arrow-down-circle-line', iconBg: '#dcfce7', iconColor: '#16a34a', accent: '#22c55e' },
    { label: 'Total Deducted',  value: `Rs. ${summary.deducted.toLocaleString()}`,  icon: 'ri-arrow-up-circle-line',   iconBg: '#fef3c7', iconColor: '#b45309', accent: '#f59e0b' },
    { label: 'Total Refunded',  value: `Rs. ${summary.refunded.toLocaleString()}`,  icon: 'ri-refresh-line',           iconBg: '#dbeafe', iconColor: '#1d4ed8', accent: '#3b82f6' },
    { label: 'Net Inflow',      value: `Rs. ${summary.netInflow.toLocaleString()}`, icon: 'ri-trending-up-line',       iconBg: '#ccfbf1', iconColor: '#0f766e', accent: '#14b8a6' },
  ];

  return (
    <Fragment>
      <Seo title="Credit Ledger" />

      {/* Page header */}
      <div className="md:flex block items-center justify-between my-[1.5rem] page-header-breadcrumb">
        <div>
          <p className="font-semibold text-[1.125rem] text-defaulttextcolor dark:text-defaulttextcolor/70 !mb-0 flex items-center gap-2">
            <span
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
              style={{ background: '#fdf8ee' }}
            >
              <i className="ri-wallet-3-line text-[#C8A86B] text-base"></i>
            </span>
            Credit Ledger
          </p>
          <p className="font-normal text-[#8c9097] dark:text-white/50 text-[0.813rem] mt-1">
            All wallet top-ups, deductions and refunds across customers
          </p>
        </div>
        <Link href="/credits/pending">
          <button
            className="px-3 py-2 text-[0.813rem] font-medium rounded-md text-white mt-2 md:mt-0 flex items-center gap-2 whitespace-nowrap"
            style={{ background: 'linear-gradient(135deg,#f59e0b 0%,#d97706 100%)' }}
          >
            <i className="ri-time-line"></i>
            Pending Deposits
            {pendingCount > 0 && (
              <span
                className="inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white rounded-full"
                style={{ background: '#dc2626' }}
              >
                {pendingCount > 99 ? '99+' : pendingCount}
              </span>
            )}
          </button>
        </Link>
      </div>

      {/* Pending banner */}
      {pendingCount > 0 && (
        <div
          className="flex items-center gap-3 mb-5 p-4 rounded-xl"
          style={{ background: '#fef3c7', border: '1px solid #fde68a' }}
        >
          <i className="ri-error-warning-line text-xl flex-shrink-0" style={{ color: '#b45309' }}></i>
          <div className="flex-1">
            <span className="font-semibold" style={{ color: '#b45309' }}>
              {pendingCount} cash deposit{pendingCount !== 1 ? 's' : ''} awaiting verification.
            </span>
            <span className="text-[#8c9097] ms-2 text-sm">Customers cannot use these funds until approved.</span>
          </div>
          <Link href="/credits/pending">
            <button
              className="px-3 py-1.5 text-sm font-medium rounded-md text-white flex-shrink-0 whitespace-nowrap"
              style={{ background: 'linear-gradient(135deg,#f59e0b 0%,#d97706 100%)' }}
            >
              Review Now →
            </button>
          </Link>
        </div>
      )}

      {/* Stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
        {STAT_TILES.map(tile => (
          <div
            key={tile.label}
            className="box p-4 flex items-center gap-3"
            style={{ borderLeft: `3px solid ${tile.accent}` }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: tile.iconBg }}
            >
              <i className={`${tile.icon} text-lg`} style={{ color: tile.iconColor }}></i>
            </div>
            <div className="min-w-0">
              <p className="text-[11px] text-[#64748b] font-medium uppercase tracking-wide mb-0.5 truncate">{tile.label}</p>
              <p className="text-[1rem] font-bold text-defaulttextcolor mb-0 truncate">{tile.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="box mb-4 p-3">
        <div className="flex items-center gap-2 flex-nowrap overflow-x-auto">
          <div className="relative flex-1 min-w-0">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-[#8c9097] text-sm pointer-events-none"></i>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search name / email / ref…"
              className="form-control !w-full"
              style={{ paddingLeft: '2.25rem' }}
            />
          </div>
          <select
            value={type}
            onChange={(e) => { setType(e.target.value); setPage(1); }}
            className="form-select !w-auto flex-shrink-0"
          >
            <option value="">All types</option>
            <option value="Deposit">Deposit</option>
            <option value="Deduction">Deduction</option>
            <option value="Refund">Refund</option>
          </select>
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            className="form-select !w-auto flex-shrink-0"
          >
            <option value="">All statuses</option>
            <option value="Verified">Verified</option>
            <option value="Pending">Pending</option>
            <option value="Rejected">Rejected</option>
          </select>
          <select
            value={method}
            onChange={(e) => { setMethod(e.target.value); setPage(1); }}
            className="form-select !w-auto flex-shrink-0"
          >
            <option value="">All methods</option>
            <option value="ConnectIPS">ConnectIPS</option>
            <option value="BankTransfer">Bank Transfer</option>
            <option value="Cash">Cash</option>
            <option value="DirectAdd">Direct (Admin)</option>
          </select>
          {hasFilters && (
            <button
              onClick={resetFilters}
              className="px-3 py-1.5 text-[0.813rem] font-medium rounded-md flex-shrink-0 whitespace-nowrap"
              style={{ border: '1px solid #C8A86B', color: '#C8A86B', background: 'transparent' }}
            >
              <i className="ri-close-line me-1"></i>Clear
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 mb-4 rounded-xl text-sm" style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#dc2626' }}>
          <i className="ri-error-warning-line me-2"></i>{error}
        </div>
      )}

      {/* Table */}
      <div className="box">
        {loading ? (
          <div className="overflow-x-auto">
            <table className="ti-custom-table ti-custom-table-hover min-w-[640px] sm:min-w-0">
              <thead style={{ background: '#f8fafc' }}>
                <tr>
                  {['Date', 'Customer', 'Type', 'Amount', 'Method', 'Reference', 'Status', ''].map((h, i) => (
                    <th key={i} className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i}>
                    <td className="py-3 px-4"><div className="h-4 rounded animate-pulse bg-[#f1f5f9] w-20"></div></td>
                    <td className="py-3 px-4 hidden md:table-cell"><div className="h-4 rounded animate-pulse bg-[#f1f5f9] w-32"></div></td>
                    <td className="py-3 px-4 hidden sm:table-cell"><div className="h-5 rounded-full animate-pulse bg-[#f1f5f9] w-20"></div></td>
                    <td className="py-3 px-4"><div className="h-4 rounded animate-pulse bg-[#f1f5f9] w-24"></div></td>
                    <td className="py-3 px-4 hidden md:table-cell"><div className="h-5 rounded-full animate-pulse bg-[#f1f5f9] w-20"></div></td>
                    <td className="py-3 px-4 hidden lg:table-cell"><div className="h-4 rounded animate-pulse bg-[#f1f5f9] w-28"></div></td>
                    <td className="py-3 px-4"><div className="h-5 rounded-full animate-pulse bg-[#f1f5f9] w-16"></div></td>
                    <td className="py-3 px-4"><div className="h-7 w-7 rounded animate-pulse bg-[#f1f5f9]"></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-16">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: '#fdf8ee' }}
            >
              <i className="ri-wallet-3-line text-3xl" style={{ color: '#C8A86B' }}></i>
            </div>
            <p className="text-[#64748b] font-medium mb-1">No credit transactions found</p>
            <p className="text-[#8c9097] text-sm">
              {hasFilters ? 'Try adjusting your filters.' : 'Transactions will appear here once customers top up their wallets.'}
            </p>
            {hasFilters && (
              <button onClick={resetFilters} className="mt-3 px-3 py-1.5 text-[0.813rem] font-medium rounded-md" style={{ border: '1px solid #e2e8f0', color: '#64748b', background: '#f8fafc' }}>
                Clear filters
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="ti-custom-table ti-custom-table-hover w-full">
              <thead style={{ background: '#f8fafc' }}>
                <tr>
                  <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">Date</th>
                  <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left hidden md:table-cell">Customer</th>
                  <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left hidden sm:table-cell">Type</th>
                  <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">Amount</th>
                  <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left hidden md:table-cell">Method</th>
                  <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left hidden lg:table-cell">Reference</th>
                  <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">Status</th>
                  <th className="py-3 px-4"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((t) => {
                  const label = t.customerName?.trim() || t.customerEmail;
                  const typeStyle = TYPE_STYLES[t.type] || { bg: '#f1f5f9', text: '#475569', label: t.type };
                  const statusStyle = STATUS_STYLES[t.status] || { bg: '#f1f5f9', text: '#475569' };
                  const mStyle = methodStyle(t.paymentMethod);
                  return (
                    <tr key={t.id}>
                      <td className="py-3 px-4">
                        <p className="text-[0.813rem] font-medium text-defaulttextcolor mb-0 whitespace-nowrap">{fmtDate(t.createdAt)}</p>
                        <p className="text-[0.7rem] text-[#8c9097] mb-0">{fmtTime(t.createdAt)}</p>
                        <p className="md:hidden text-[0.7rem] mt-0.5 mb-0 font-medium truncate max-w-[120px]" style={{ color: '#C8A86B' }}>
                          {label}
                        </p>
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-white font-bold"
                            style={{ background: avatarColor(label), fontSize: 10 }}
                          >
                            {avatarInitials(label)}
                          </div>
                          <div>
                            <Link href={`/customers/${t.customerId}`} className="text-[0.813rem] font-medium hover:underline" style={{ color: '#C8A86B' }}>
                              {label}
                            </Link>
                            <p className="text-[0.7rem] text-[#8c9097] mb-0">{t.customerEmail}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 hidden sm:table-cell">
                        <span
                          className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                          style={{ background: typeStyle.bg, color: typeStyle.text }}
                        >
                          {typeStyle.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <p
                          className="text-[0.813rem] font-semibold mb-0"
                          style={{ color: t.type === 'Deduction' ? '#b45309' : t.type === 'Deposit' ? '#15803d' : '#1d4ed8' }}
                        >
                          {t.type === 'Deduction' ? '−' : '+'} Rs. {t.amount.toLocaleString()}
                        </p>
                        {t.balanceAfter !== undefined && t.balanceAfter !== null && (
                          <p className="text-[0.7rem] text-[#8c9097] mb-0">bal Rs. {t.balanceAfter.toLocaleString()}</p>
                        )}
                      </td>
                      <td className="py-3 px-4 hidden md:table-cell">
                        {t.paymentMethod ? (
                          <span
                            className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                            style={{ background: mStyle.bg, color: mStyle.text }}
                          >
                            {methodLabel(t.paymentMethod)}
                          </span>
                        ) : (
                          <span className="text-[#8c9097]">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 hidden lg:table-cell">
                        <span className="font-mono text-[0.7rem] text-[#64748b]">
                          {t.connectIpsTransactionId || t.referenceNumber || <span className="text-[#8c9097]">—</span>}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                          style={{ background: statusStyle.bg, color: statusStyle.text }}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Link href={`/credits/${t.id}`}>
                          <button
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#64748b] hover:text-[#C8A86B] transition-colors"
                            style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                            title="View detail"
                          >
                            <i className="ri-eye-line text-sm"></i>
                          </button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination inside the table box */}
        {!loading && items.length > 0 && totalPages > 1 && (
          <div
            className="flex items-center justify-between flex-wrap gap-4 px-4 py-3"
            style={{ borderTop: '1px solid var(--defaultborder)' }}
          >
            <p className="text-[0.813rem] text-[#8c9097] mb-0">
              Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)} of {totalCount} transactions
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-[0.813rem] border border-defaultborder rounded-sm text-defaulttextcolor hover:border-[#C8A86B] hover:text-[#C8A86B] disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                &laquo; Prev
              </button>
              {getPageNumbers().map((pg, idx) =>
                pg === '...' ? (
                  <span key={idx} className="px-3 py-1.5 text-[0.813rem] text-[#8c9097]">…</span>
                ) : (
                  <button
                    key={idx}
                    onClick={() => setPage(pg as number)}
                    className="px-3 py-1.5 text-[0.813rem] border rounded-sm transition-all"
                    style={
                      page === pg
                        ? { background: 'linear-gradient(135deg,#C8A86B 0%,#a8863d 100%)', color: '#fff', border: '1px solid #C8A86B' }
                        : { border: '1px solid var(--defaultborder)', color: 'var(--defaulttextcolor)' }
                    }
                  >
                    {pg}
                  </button>
                )
              )}
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-[0.813rem] border border-defaultborder rounded-sm text-defaulttextcolor hover:border-[#C8A86B] hover:text-[#C8A86B] disabled:opacity-40 disabled:pointer-events-none transition-colors"
              >
                Next &raquo;
              </button>
            </div>
          </div>
        )}
      </div>
    </Fragment>
  );
};

export default CreditsPage;
