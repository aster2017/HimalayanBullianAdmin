'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';
import { useDialog } from '@/shared/context/DialogContext';

const API = process.env.NEXT_PUBLIC_API_URL;

type Row = {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  daysOverdue: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
};

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

function severityStyle(days: number): { bg: string; text: string } {
  if (days > 90) return { bg: '#fee2e2', text: '#dc2626' };
  if (days > 60) return { bg: '#ffedd5', text: '#c2410c' };
  if (days > 30) return { bg: '#fef3c7', text: '#b45309' };
  return { bg: '#dbeafe', text: '#1d4ed8' };
}

const RANGE_OPTIONS = [
  { label: 'All overdue', value: '' },
  { label: '1–30 days',   value: '1-30' },
  { label: '31–60 days',  value: '31-60' },
  { label: '61–90 days',  value: '61-90' },
  { label: 'Over 90 days', value: '90+' },
];

function matchesRange(days: number, range: string): boolean {
  if (!range) return true;
  if (range === '1-30')  return days >= 1  && days <= 30;
  if (range === '31-60') return days >= 31 && days <= 60;
  if (range === '61-90') return days >= 61 && days <= 90;
  if (range === '90+')   return days > 90;
  return true;
}

const PAGE_SIZE = 25;

export default function InvoiceOverduePage() {
  useProtectedRoute();
  const { confirm } = useDialog();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [emailing, setEmailing] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [range, setRange] = useState('');
  const [page, setPage] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(debounceRef.current);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch, range]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/admin/reports/invoice-overdue`, { headers: getAuthHeaders() });
      const d = await r.json();
      setRows(d?.data || []);
    } catch { toast.error('Failed to load overdue invoices'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const sendReminder = async (invoiceId: string, customerEmail: string) => {
    if (!await confirm(`Send a payment reminder to ${customerEmail}?`, { title: 'Send Reminder', confirmLabel: 'Send' })) return;
    setEmailing(invoiceId);
    try {
      const r = await fetch(`${API}/invoices/${invoiceId}/send-email`, { method: 'POST', headers: getAuthHeaders() });
      const d = await r.json();
      if (d?.success) toast.success(d.message || 'Reminder sent');
      else toast.error(d?.message || 'Send failed');
    } finally { setEmailing(null); }
  };

  const filteredRows = useMemo(() => {
    const q = debouncedSearch.toLowerCase();
    return rows.filter(r =>
      matchesRange(r.daysOverdue, range) &&
      (!q || r.invoiceNumber.toLowerCase().includes(q) || (r.customerName || '').toLowerCase().includes(q))
    );
  }, [rows, debouncedSearch, range]);

  const totalPages = Math.ceil(filteredRows.length / PAGE_SIZE);
  const pagedRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const totals = useMemo(() => ({
    count: rows.length,
    balance: rows.reduce((a, r) => a + r.balanceAmount, 0),
    maxDays: rows.length > 0 ? Math.max(...rows.map(r => r.daysOverdue)) : 0,
  }), [rows]);

  const hasFilters = !!(search || range);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
    else {
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
    { label: 'Total Overdue',      value: `${totals.count} invoices`,              icon: 'ri-file-warning-line',        iconBg: '#fee2e2', iconColor: '#dc2626', accent: '#dc2626' },
    { label: 'Outstanding Balance', value: `Rs. ${totals.balance.toLocaleString()}`, icon: 'ri-money-dollar-circle-line', iconBg: '#fef3c7', iconColor: '#b45309', accent: '#f59e0b' },
    { label: 'Most Overdue',        value: `${totals.maxDays} days`,                 icon: 'ri-alarm-warning-line',       iconBg: '#ffedd5', iconColor: '#c2410c', accent: '#f97316' },
  ];

  return (
    <Fragment>
      {/* Page header */}
      <div className="md:flex block items-center justify-between my-[1.5rem] page-header-breadcrumb">
        <div>
          <p className="font-semibold text-[1.125rem] text-defaulttextcolor dark:text-defaulttextcolor/70 !mb-0 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0" style={{ background: '#fee2e2' }}>
              <i className="ri-file-warning-line text-base" style={{ color: '#dc2626' }}></i>
            </span>
            Overdue Invoices
          </p>
          <p className="font-normal text-[#8c9097] dark:text-white/50 text-[0.813rem] mt-1">
            Invoices past their due date with outstanding balances
          </p>
        </div>
        <Link href="/reports/payment-aging">
          <button
            className="px-3 py-1.5 text-[0.813rem] font-medium rounded-md flex items-center gap-1.5 mt-2 md:mt-0 whitespace-nowrap"
            style={{ border: '1px solid #C8A86B', color: '#C8A86B', background: 'transparent' }}
          >
            <i className="ri-hourglass-line"></i>Aging buckets →
          </button>
        </Link>
      </div>

      {/* Stat tiles */}
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          {STAT_TILES.map(tile => (
            <div key={tile.label} className="box p-4 flex items-center gap-3" style={{ borderLeft: `3px solid ${tile.accent}` }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: tile.iconBg }}>
                <i className={`${tile.icon} text-lg`} style={{ color: tile.iconColor }}></i>
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-[#64748b] font-medium uppercase tracking-wide mb-0.5 truncate">{tile.label}</p>
                <p className="text-[1.125rem] font-bold text-defaulttextcolor mb-0 truncate">{tile.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="box p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl animate-pulse bg-[#f1f5f9] flex-shrink-0"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-3 rounded animate-pulse bg-[#f1f5f9] w-24"></div>
                  <div className="h-6 rounded animate-pulse bg-[#f1f5f9] w-32"></div>
                </div>
              </div>
            ))}
          </div>
          <div className="box">
            <div className="overflow-x-auto w-full">
              <table className="ti-custom-table w-full">
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    {['Invoice', 'Customer', 'Due', 'Days Overdue', 'Balance', 'Action', ''].map((h, i) => (
                      <th key={i} className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      <td className="py-3 px-4"><div className="h-5 rounded animate-pulse bg-[#f1f5f9] w-24"></div></td>
                      <td className="py-3 px-4 hidden md:table-cell"><div className="h-4 rounded animate-pulse bg-[#f1f5f9] w-32"></div></td>
                      <td className="py-3 px-4 hidden lg:table-cell"><div className="h-4 rounded animate-pulse bg-[#f1f5f9] w-24"></div></td>
                      <td className="py-3 px-4"><div className="h-5 rounded-full animate-pulse bg-[#f1f5f9] w-16"></div></td>
                      <td className="py-3 px-4"><div className="h-4 rounded animate-pulse bg-[#f1f5f9] w-24"></div></td>
                      <td className="py-3 px-4"><div className="h-7 rounded animate-pulse bg-[#f1f5f9] w-20"></div></td>
                      <td className="py-3 px-4"><div className="h-7 w-7 rounded animate-pulse bg-[#f1f5f9]"></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : rows.length === 0 ? (
        <div className="box">
          <div className="box-body text-center py-16">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: '#dcfce7' }}>
              <i className="ri-checkbox-circle-line text-3xl" style={{ color: '#16a34a' }}></i>
            </div>
            <p className="text-[#64748b] font-medium mb-1">All clear!</p>
            <p className="text-[#8c9097] text-sm">No overdue invoices — nothing to chase.</p>
          </div>
        </div>
      ) : (
        <div className="box">
          {/* Filter bar */}
          <div
            className="p-4 flex items-center gap-2 flex-nowrap overflow-x-auto"
            style={{ borderBottom: '1px solid var(--defaultborder)' }}
          >
            <div className="relative flex-1 min-w-0">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-[#8c9097] text-sm pointer-events-none"></i>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search invoice # or customer…"
                className="form-control !w-full"
                style={{ paddingLeft: '2.25rem' }}
              />
            </div>
            <select
              value={range}
              onChange={e => setRange(e.target.value)}
              className="form-select !w-auto flex-shrink-0"
            >
              {RANGE_OPTIONS.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {hasFilters && (
              <button
                onClick={() => { setSearch(''); setRange(''); }}
                className="px-3 py-1.5 text-[0.813rem] font-medium rounded-md flex-shrink-0 whitespace-nowrap"
                style={{ border: '1px solid #C8A86B', color: '#C8A86B', background: 'transparent' }}
              >
                <i className="ri-close-line me-1"></i>Clear
              </button>
            )}
            <p className="text-[0.813rem] text-[#8c9097] mb-0 flex-shrink-0 whitespace-nowrap ms-auto">
              {filteredRows.length} of {rows.length} invoices
            </p>
          </div>

          {filteredRows.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: '#fdf8ee' }}>
                <i className="ri-file-search-line text-2xl" style={{ color: '#C8A86B' }}></i>
              </div>
              <p className="text-[#64748b] font-medium mb-1">No invoices match your filters</p>
              <button
                onClick={() => { setSearch(''); setRange(''); }}
                className="mt-2 px-3 py-1.5 text-[0.813rem] font-medium rounded-md"
                style={{ border: '1px solid #e2e8f0', color: '#64748b', background: '#f8fafc' }}
              >
                Clear filters
              </button>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto w-full">
                <table className="ti-custom-table ti-custom-table-hover w-full">
                  <thead style={{ background: '#f8fafc' }}>
                    <tr>
                      <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">Invoice</th>
                      <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left hidden md:table-cell">Customer</th>
                      <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left hidden lg:table-cell">Due Date</th>
                      <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">Days Overdue</th>
                      <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-right">Balance</th>
                      <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left hidden sm:table-cell">Action</th>
                      <th className="py-3 px-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedRows.map(r => {
                      const sev = severityStyle(r.daysOverdue);
                      const label = r.customerName?.trim() || '—';
                      const displayEmail = r.customerEmail?.includes('@hbc.local') ? '' : r.customerEmail;
                      return (
                        <tr key={r.id}>
                          <td className="py-3 px-4">
                            <Link href={`/invoices/${r.id}`}>
                              <span
                                className="font-mono text-[0.75rem] font-semibold px-2 py-0.5 rounded"
                                style={{ background: '#fdf8ee', color: '#C8A86B' }}
                              >
                                {r.invoiceNumber}
                              </span>
                            </Link>
                            <p className="md:hidden text-[0.7rem] text-[#8c9097] mt-1 mb-0 truncate max-w-[130px]">{label}</p>
                          </td>
                          <td className="py-3 px-4 hidden md:table-cell">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                                style={{ background: avatarColor(label), fontSize: 10 }}
                              >
                                {avatarInitials(label)}
                              </div>
                              <div>
                                <Link href={`/customers/${r.customerId}`} className="text-[0.813rem] font-medium hover:underline" style={{ color: '#C8A86B' }}>
                                  {label}
                                </Link>
                                {displayEmail && (
                                  <p className="text-[0.7rem] text-[#8c9097] mb-0">{displayEmail}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4 hidden lg:table-cell">
                            <span className="text-[0.813rem] text-defaulttextcolor">{fmtDate(r.dueDate)}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                              style={{ background: sev.bg, color: sev.text }}
                            >
                              {r.daysOverdue} {r.daysOverdue === 1 ? 'day' : 'days'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="font-mono font-semibold text-[0.813rem]" style={{ color: '#C8A86B' }}>
                              Rs. {r.balanceAmount.toLocaleString()}
                            </span>
                          </td>
                          <td className="py-3 px-4 hidden sm:table-cell">
                            {r.customerEmail ? (
                              <button
                                onClick={() => sendReminder(r.id, r.customerEmail)}
                                disabled={emailing === r.id}
                                className="px-2.5 py-1.5 text-[0.75rem] font-medium rounded-md text-white flex items-center gap-1 disabled:opacity-50"
                                style={{ background: 'linear-gradient(135deg,#f59e0b 0%,#d97706 100%)' }}
                                title={`Email invoice to ${r.customerEmail}`}
                              >
                                {emailing === r.id
                                  ? <><i className="ri-loader-4-line animate-spin"></i>Sending…</>
                                  : <><i className="ri-mail-send-line"></i>Remind</>}
                              </button>
                            ) : (
                              <span className="text-[#8c9097] text-xs">No email</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <Link href={`/invoices/${r.id}`}>
                              <button
                                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#64748b] hover:text-[#C8A86B] transition-colors"
                                style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                                title="View invoice"
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

              {/* Pagination inside box */}
              {totalPages > 1 && (
                <div
                  className="flex items-center justify-between flex-wrap gap-4 px-4 py-3"
                  style={{ borderTop: '1px solid var(--defaultborder)' }}
                >
                  <p className="text-[0.813rem] text-[#8c9097] mb-0">
                    Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredRows.length)} of {filteredRows.length} invoices
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setPage(p => Math.max(1, p - 1))}
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
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                      className="px-3 py-1.5 text-[0.813rem] border border-defaultborder rounded-sm text-defaulttextcolor hover:border-[#C8A86B] hover:text-[#C8A86B] disabled:opacity-40 disabled:pointer-events-none transition-colors"
                    >
                      Next &raquo;
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </Fragment>
  );
}
