'use client';

import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://hbc-api.semis.app/api';

type Item = {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string | null;
  totalAmount: number;
  balanceAmount: number;
  status: string;
  customerId: string;
  customerName: string;
};

type Bucket = {
  bucket: string;
  count: number;
  total: number;
  items: Item[];
};

const BUCKET_CONFIG: Record<string, { accent: string; iconBg: string; iconColor: string; pillBg: string; pillText: string; icon: string }> = {
  'Current':      { accent: '#22c55e', iconBg: '#dcfce7', iconColor: '#16a34a', pillBg: '#dcfce7', pillText: '#15803d', icon: 'ri-checkbox-circle-line' },
  '1-30 days':    { accent: '#3b82f6', iconBg: '#dbeafe', iconColor: '#1d4ed8', pillBg: '#dbeafe', pillText: '#1d4ed8', icon: 'ri-time-line' },
  '31-60 days':   { accent: '#f59e0b', iconBg: '#fef3c7', iconColor: '#b45309', pillBg: '#fef3c7', pillText: '#b45309', icon: 'ri-error-warning-line' },
  '61-90 days':   { accent: '#f97316', iconBg: '#ffedd5', iconColor: '#c2410c', pillBg: '#ffedd5', pillText: '#c2410c', icon: 'ri-alert-line' },
  'Over 90 days': { accent: '#dc2626', iconBg: '#fee2e2', iconColor: '#dc2626', pillBg: '#fee2e2', pillText: '#dc2626', icon: 'ri-alarm-warning-line' },
};

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  overdue:   { bg: '#fee2e2', text: '#dc2626' },
  paid:      { bg: '#dcfce7', text: '#15803d' },
  partial:   { bg: '#fef3c7', text: '#b45309' },
  draft:     { bg: '#f1f5f9', text: '#475569' },
  sent:      { bg: '#dbeafe', text: '#1d4ed8' },
};
function statusStyle(s: string) {
  return STATUS_STYLES[s?.toLowerCase()] || { bg: '#f1f5f9', text: '#475569' };
}

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

const PAGE_SIZE = 25;

export default function PaymentAgingPage() {
  useProtectedRoute();
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [totals, setTotals] = useState<{ grandTotal: number; invoiceCount: number; customerCount: number }>({
    grandTotal: 0, invoiceCount: 0, customerCount: 0,
  });
  const [asOf, setAsOf] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [expandedBucket, setExpandedBucket] = useState<string | null>('Over 90 days');
  const [bucketPage, setBucketPage] = useState(1);
  const [bucketSearch, setBucketSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(bucketSearch), 300);
    return () => clearTimeout(debounceRef.current);
  }, [bucketSearch]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/admin/reports/payment-aging`, { headers: getAuthHeaders() });
      const d = await r.json();
      const data = d?.data || {};
      setBuckets(data.buckets || []);
      setTotals(data.totals || { grandTotal: 0, invoiceCount: 0, customerCount: 0 });
      setAsOf(data.asOf || '');
    } catch { toast.error('Failed to load report'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleBucketClick = (bucket: string) => {
    setExpandedBucket(prev => prev === bucket ? null : bucket);
    setBucketPage(1);
    setBucketSearch('');
    setDebouncedSearch('');
  };

  const activeBucket = useMemo(() => buckets.find(x => x.bucket === expandedBucket), [buckets, expandedBucket]);

  const filteredItems = useMemo(() => {
    if (!activeBucket) return [];
    const q = debouncedSearch.toLowerCase();
    if (!q) return activeBucket.items;
    return activeBucket.items.filter(i =>
      i.invoiceNumber.toLowerCase().includes(q) ||
      (i.customerName || '').toLowerCase().includes(q)
    );
  }, [activeBucket, debouncedSearch]);

  const totalPages = Math.ceil(filteredItems.length / PAGE_SIZE);
  const pagedItems = filteredItems.slice((bucketPage - 1) * PAGE_SIZE, bucketPage * PAGE_SIZE);

  useEffect(() => { setBucketPage(1); }, [debouncedSearch, expandedBucket]);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    if (totalPages <= 7) { for (let i = 1; i <= totalPages; i++) pages.push(i); }
    else {
      pages.push(1);
      if (bucketPage > 3) pages.push('...');
      const start = Math.max(2, bucketPage - 1);
      const end = Math.min(totalPages - 1, bucketPage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (bucketPage < totalPages - 2) pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const STAT_TILES = [
    { label: 'Outstanding Total', value: `Rs. ${totals.grandTotal.toLocaleString()}`, icon: 'ri-money-dollar-circle-line', iconBg: '#fef3c7', iconColor: '#b45309', accent: '#f59e0b' },
    { label: 'Open Invoices',     value: totals.invoiceCount.toLocaleString(),          icon: 'ri-file-list-3-line',         iconBg: '#ede9fe', iconColor: '#6d28d9', accent: '#6366f1' },
    { label: 'Affected Customers', value: totals.customerCount.toLocaleString(),        icon: 'ri-user-3-line',              iconBg: '#dbeafe', iconColor: '#1d4ed8', accent: '#0891b2' },
  ];

  if (loading) {
    return (
      <Fragment>
        <div className="md:flex block items-center justify-between my-[1.5rem] page-header-breadcrumb">
          <div>
            <p className="font-semibold text-[1.125rem] text-defaulttextcolor !mb-0 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg" style={{ background: '#fdf8ee' }}>
                <i className="ri-hourglass-line text-[#C8A86B] text-base"></i>
              </span>
              Payment Aging
            </p>
          </div>
        </div>
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
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="box p-4 space-y-2">
              <div className="h-3 rounded animate-pulse bg-[#f1f5f9] w-20"></div>
              <div className="h-6 rounded animate-pulse bg-[#f1f5f9] w-12"></div>
              <div className="h-3 rounded animate-pulse bg-[#f1f5f9] w-28"></div>
            </div>
          ))}
        </div>
        <div className="box p-5"><div className="h-64 rounded-xl animate-pulse bg-[#f1f5f9]"></div></div>
      </Fragment>
    );
  }

  return (
    <Fragment>
      {/* Page header */}
      <div className="md:flex block items-center justify-between my-[1.5rem] page-header-breadcrumb">
        <div>
          <p className="font-semibold text-[1.125rem] text-defaulttextcolor dark:text-defaulttextcolor/70 !mb-0 flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0" style={{ background: '#fdf8ee' }}>
              <i className="ri-hourglass-line text-[#C8A86B] text-base"></i>
            </span>
            Payment Aging
          </p>
          <p className="font-normal text-[#8c9097] dark:text-white/50 text-[0.813rem] mt-1">
            Outstanding invoice balances bucketed by days overdue.
            {asOf && <> · As of {fmtDate(asOf)}</>}
          </p>
        </div>
        <Link href="/reports/invoice-overdue">
          <button
            className="px-3 py-1.5 text-[0.813rem] font-medium rounded-md flex items-center gap-1.5 mt-2 md:mt-0 whitespace-nowrap"
            style={{ border: '1px solid #C8A86B', color: '#C8A86B', background: 'transparent' }}
          >
            <i className="ri-file-warning-line"></i>Overdue list →
          </button>
        </Link>
      </div>

      {/* Summary tiles */}
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

      {/* Bucket cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {buckets.map(b => {
          const cfg = BUCKET_CONFIG[b.bucket] || { accent: '#94a3b8', iconBg: '#f1f5f9', iconColor: '#475569', pillBg: '#f1f5f9', pillText: '#475569', icon: 'ri-time-line' };
          const isActive = expandedBucket === b.bucket;
          return (
            <button
              key={b.bucket}
              onClick={() => handleBucketClick(b.bucket)}
              className="box p-4 text-left transition-all hover:shadow-md"
              style={{
                borderLeft: `3px solid ${cfg.accent}`,
                boxShadow: isActive ? `0 0 0 2px ${cfg.accent}30, 0 4px 12px ${cfg.accent}20` : undefined,
                outline: isActive ? `2px solid ${cfg.accent}` : '2px solid transparent',
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: cfg.iconBg }}>
                  <i className={`${cfg.icon} text-sm`} style={{ color: cfg.iconColor }}></i>
                </div>
                <i
                  className={`ri-chevron-${isActive ? 'up' : 'down'}-line text-sm transition-transform`}
                  style={{ color: '#94a3b8' }}
                ></i>
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: cfg.iconColor }}>{b.bucket}</p>
              <p className="text-[1.25rem] font-bold text-defaulttextcolor mb-0">{b.count}</p>
              <p className="text-[11px] font-mono mt-0.5" style={{ color: '#64748b' }}>Rs. {b.total.toLocaleString()}</p>
            </button>
          );
        })}
      </div>

      {/* Drill-in table */}
      {expandedBucket && activeBucket && (
        <div className="box">
          {/* Section header inside box */}
          <div className="p-5 flex items-center justify-between gap-4 flex-wrap" style={{ borderBottom: '1px solid var(--defaultborder)' }}>
            <div className="flex items-center gap-3">
              {(() => {
                const cfg = BUCKET_CONFIG[expandedBucket] || { iconBg: '#f1f5f9', iconColor: '#475569', icon: 'ri-time-line' };
                return (
                  <>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: cfg.iconBg }}>
                      <i className={`${cfg.icon} text-base`} style={{ color: cfg.iconColor }}></i>
                    </div>
                    <div>
                      <p className="font-semibold text-[0.938rem] text-defaulttextcolor mb-0">{expandedBucket}</p>
                      <p className="text-[0.75rem] text-[#8c9097] mb-0">
                        {activeBucket.count} invoices · Rs. {activeBucket.total.toLocaleString()}
                        {debouncedSearch && filteredItems.length !== activeBucket.items.length && (
                          <span className="ms-2">({filteredItems.length} matching)</span>
                        )}
                      </p>
                    </div>
                  </>
                );
              })()}
            </div>
            {/* Search within bucket */}
            <div className="relative">
              <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-[#8c9097] text-sm pointer-events-none"></i>
              <input
                type="text"
                value={bucketSearch}
                onChange={e => setBucketSearch(e.target.value)}
                placeholder="Filter by invoice / customer…"
                className="form-control !w-64"
                style={{ paddingLeft: '2.25rem' }}
              />
            </div>
          </div>

          {filteredItems.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: '#fdf8ee' }}>
                <i className="ri-file-search-line text-2xl" style={{ color: '#C8A86B' }}></i>
              </div>
              <p className="text-[#64748b] font-medium mb-0">
                {debouncedSearch ? 'No invoices match your search.' : `No invoices in ${expandedBucket}.`}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto w-full">
                <table className="ti-custom-table ti-custom-table-hover w-full">
                  <thead style={{ background: '#f8fafc' }}>
                    <tr>
                      <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">Invoice</th>
                      <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left hidden md:table-cell">Customer</th>
                      <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">Issued</th>
                      <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left hidden lg:table-cell">Due</th>
                      <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-right">Balance</th>
                      <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">Status</th>
                      <th className="py-3 px-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedItems.map(item => {
                      const ss = statusStyle(item.status);
                      const label = item.customerName?.trim() || '—';
                      return (
                        <tr key={item.id}>
                          <td className="py-3 px-4">
                            <Link href={`/invoices/${item.id}`}>
                              <span
                                className="font-mono text-[0.75rem] font-semibold px-2 py-0.5 rounded"
                                style={{ background: '#fdf8ee', color: '#C8A86B' }}
                              >
                                {item.invoiceNumber}
                              </span>
                            </Link>
                            <p className="md:hidden text-[0.7rem] text-[#8c9097] mt-1 mb-0 truncate max-w-[130px]">{label}</p>
                          </td>
                          <td className="py-3 px-4 hidden md:table-cell">
                            {item.customerId ? (
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                                  style={{ background: avatarColor(label), fontSize: 10 }}
                                >
                                  {avatarInitials(label)}
                                </div>
                                <Link href={`/customers/${item.customerId}`} className="text-[0.813rem] font-medium hover:underline" style={{ color: '#C8A86B' }}>
                                  {label}
                                </Link>
                              </div>
                            ) : (
                              <span className="text-[#8c9097] text-sm">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-[0.813rem] text-defaulttextcolor">{fmtDate(item.invoiceDate)}</span>
                          </td>
                          <td className="py-3 px-4 hidden lg:table-cell">
                            {item.dueDate
                              ? <span className="text-[0.813rem] text-defaulttextcolor">{fmtDate(item.dueDate)}</span>
                              : <span className="text-[#8c9097]">—</span>}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="font-mono font-semibold text-[0.813rem]" style={{ color: '#C8A86B' }}>
                              Rs. {item.balanceAmount.toLocaleString()}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                              style={{ background: ss.bg, color: ss.text }}
                            >
                              {item.status}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <Link href={`/invoices/${item.id}`}>
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
                    Showing {(bucketPage - 1) * PAGE_SIZE + 1}–{Math.min(bucketPage * PAGE_SIZE, filteredItems.length)} of {filteredItems.length} invoices
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setBucketPage(p => Math.max(1, p - 1))}
                      disabled={bucketPage === 1}
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
                          onClick={() => setBucketPage(pg as number)}
                          className="px-3 py-1.5 text-[0.813rem] border rounded-sm transition-all"
                          style={
                            bucketPage === pg
                              ? { background: 'linear-gradient(135deg,#C8A86B 0%,#a8863d 100%)', color: '#fff', border: '1px solid #C8A86B' }
                              : { border: '1px solid var(--defaultborder)', color: 'var(--defaulttextcolor)' }
                          }
                        >
                          {pg}
                        </button>
                      )
                    )}
                    <button
                      onClick={() => setBucketPage(p => Math.min(totalPages, p + 1))}
                      disabled={bucketPage === totalPages}
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

      {expandedBucket && !activeBucket && (
        <div className="box">
          <div className="text-center py-12">
            <p className="text-[#8c9097]">No data for this bucket.</p>
          </div>
        </div>
      )}
    </Fragment>
  );
}
