'use client';

import { Fragment, useEffect, useRef, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/shared/redux/hooks';
import { fetchInvoices } from '@/shared/redux/invoicesSlice';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';
import apiClient from '@/shared/services/apiClient';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_TABS = [
  { label: 'All',     value: '',        color: '#64748b' },
  { label: 'Draft',   value: 'Draft',   color: '#94a3b8' },
  { label: 'Sent',    value: 'Sent',    color: '#2563eb' },
  { label: 'Partial', value: 'Partial', color: '#d97706' },
  { label: 'Paid',    value: 'Paid',    color: '#16a34a' },
  { label: 'Overdue', value: 'Overdue', color: '#dc2626' },
  { label: 'Void',    value: 'Void',    color: '#64748b' },
] as const;

const DATE_PRESETS = [
  { label: 'Today',        value: 'today' },
  { label: 'Yesterday',    value: 'yesterday' },
  { label: 'This week',    value: 'week' },
  { label: 'This month',   value: 'month' },
  { label: 'Last month',   value: 'last_month' },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString('en-NP');

function toISODate(d: Date) {
  return d.toISOString().split('T')[0];
}

function presetToDates(preset: string): { dateFrom: string; dateTo: string } | null {
  const now = new Date();
  if (preset === 'today') { const s = toISODate(now); return { dateFrom: s, dateTo: s }; }
  if (preset === 'yesterday') { const y = new Date(now); y.setDate(y.getDate() - 1); const s = toISODate(y); return { dateFrom: s, dateTo: s }; }
  if (preset === 'week') { const start = new Date(now); start.setDate(now.getDate() - now.getDay()); return { dateFrom: toISODate(start), dateTo: toISODate(now) }; }
  if (preset === 'month') { const start = new Date(now.getFullYear(), now.getMonth(), 1); return { dateFrom: toISODate(start), dateTo: toISODate(now) }; }
  if (preset === 'last_month') { const start = new Date(now.getFullYear(), now.getMonth() - 1, 1); const end = new Date(now.getFullYear(), now.getMonth(), 0); return { dateFrom: toISODate(start), dateTo: toISODate(end) }; }
  return null;
}

function statusStyle(s: string): { bg: string; text: string } {
  switch (s?.toLowerCase()) {
    case 'paid':    return { bg: '#dcfce7', text: '#16a34a' };
    case 'sent':    return { bg: '#dbeafe', text: '#2563eb' };
    case 'partial': return { bg: '#fef9c3', text: '#d97706' };
    case 'overdue': return { bg: '#fee2e2', text: '#dc2626' };
    case 'void':    return { bg: '#f1f5f9', text: '#475569' };
    case 'draft':   return { bg: '#f1f5f9', text: '#64748b' };
    default:        return { bg: '#f1f5f9', text: '#64748b' };
  }
}

function rowAccent(status: string, isToday: boolean): React.CSSProperties {
  if (status?.toLowerCase() === 'overdue') return { borderLeft: '3px solid #dc2626', background: '#fff5f5' };
  if (isToday)                             return { borderLeft: '3px solid #16a34a' };
  if (status?.toLowerCase() === 'partial') return { borderLeft: '3px solid #d97706' };
  return { borderLeft: '3px solid transparent' };
}

function avatarColor(name: string): string {
  const colors = ['#2563eb','#7c3aed','#db2777','#ea580c','#16a34a','#0891b2','#d97706','#dc2626'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function isInvoiceToday(d: string | Date): boolean {
  return new Date(d).toDateString() === new Date().toDateString();
}

function dueDateLabel(dueDateStr: string | null | undefined, status: string): { text: string; color: string } | null {
  if (!dueDateStr) return null;
  if (status?.toLowerCase() === 'paid' || status?.toLowerCase() === 'void') return null;
  const due = new Date(dueDateStr);
  const now = new Date();
  const diffMs = due.getTime() - now.setHours(0,0,0,0);
  const diffDays = Math.ceil(diffMs / 86400000);
  if (diffDays < 0)  return { text: `Overdue ${Math.abs(diffDays)}d`, color: '#dc2626' };
  if (diffDays === 0) return { text: 'Due today', color: '#d97706' };
  if (diffDays <= 3)  return { text: `Due in ${diffDays}d`, color: '#d97706' };
  return { text: `Due in ${diffDays}d`, color: '#94a3b8' };
}

function invoiceType(num: string): string {
  if (!num) return '';
  if (num.startsWith('INV-TGT')) return 'Target';
  if (num.startsWith('INV-')) return 'Invoice';
  return 'Order';
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-defaultborder/50 animate-pulse">
      <td className="py-3 px-4"><div className="h-4 w-32 bg-gray-200 rounded mb-1" /><div className="h-3 w-14 bg-gray-100 rounded" /></td>
      <td className="py-3 px-4"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" /><div className="h-4 w-28 bg-gray-200 rounded" /></div></td>
      <td className="py-3 px-4"><div className="h-5 w-20 bg-gray-200 rounded-md" /></td>
      <td className="py-3 px-4"><div className="h-4 w-20 bg-gray-200 rounded" /><div className="h-3 w-16 bg-gray-100 rounded mt-1" /></td>
      <td className="py-3 px-4"><div className="h-4 w-20 bg-gray-200 rounded ml-auto" /></td>
      <td className="py-3 px-4"><div className="h-4 w-24 bg-gray-200 rounded" /></td>
      <td className="py-3 px-4"><div className="h-5 w-16 bg-gray-200 rounded-full" /></td>
      <td className="py-3 px-4"><div className="h-7 w-14 bg-gray-200 rounded-lg" /></td>
    </tr>
  );
}

function PaymentProgress({ paid, total }: { paid: number; total: number }) {
  const pct = total > 0 ? Math.min((paid / total) * 100, 100) : 0;
  const color = pct >= 100 ? '#16a34a' : pct > 0 ? '#d97706' : '#e2e8f0';
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-medium" style={{ color: pct >= 100 ? '#16a34a' : pct > 0 ? '#d97706' : '#94a3b8' }}>
          Rs. {fmt(paid)}
        </span>
        <span className="text-[10px]" style={{ color: '#94a3b8' }}>{pct.toFixed(0)}%</span>
      </div>
      <div className="h-1 rounded-full" style={{ background: '#e2e8f0', minWidth: 80 }}>
        <div className="h-1 rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

const InvoicesPage = () => {
  useProtectedRoute();

  const dispatch = useAppDispatch();
  const { items, loading, error, pagination } = useAppSelector((state) => state.invoices);

  const [currentPage, setCurrentPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [activeStatus, setActiveStatus] = useState('');
  const [datePreset, setDatePreset] = useState('');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [showDateMenu, setShowDateMenu] = useState(false);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});

  const pageSize = 20;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dateMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dateMenuRef.current && !dateMenuRef.current.contains(e.target as Node)) setShowDateMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const activeDates = (): { dateFrom?: string; dateTo?: string } => {
    if (datePreset === 'custom') return { dateFrom: customFrom || undefined, dateTo: customTo || undefined };
    if (datePreset) { const d = presetToDates(datePreset); return d ? { dateFrom: d.dateFrom, dateTo: d.dateTo } : {}; }
    return {};
  };

  const doFetch = (page: number, search: string, status: string, preset: string, from: string, to: string) => {
    let dateFrom: string | undefined;
    let dateTo: string | undefined;
    if (preset === 'custom') { dateFrom = from || undefined; dateTo = to || undefined; }
    else if (preset) { const d = presetToDates(preset); if (d) { dateFrom = d.dateFrom; dateTo = d.dateTo; } }
    dispatch(fetchInvoices({ page, pageSize, search: search.trim() || undefined, status: status || undefined, dateFrom, dateTo }));
  };

  useEffect(() => {
    doFetch(currentPage, searchInput, activeStatus, datePreset, customFrom, customTo);
  }, [currentPage, activeStatus, datePreset, customFrom, customTo]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setCurrentPage(1);
      doFetch(1, searchInput, activeStatus, datePreset, customFrom, customTo);
    }, 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput]);

  useEffect(() => {
    const fetchCounts = async () => {
      const statuses = STATUS_TABS.slice(1).map(t => t.value);
      const results = await Promise.allSettled(
        statuses.map(s =>
          apiClient.get('/invoices', { params: { page: 1, pageSize: 1, status: s } })
            .then(r => ({ status: s, count: r.data?.data?.totalCount ?? 0 }))
        )
      );
      const counts: Record<string, number> = {};
      results.forEach(r => { if (r.status === 'fulfilled') counts[r.value.status] = r.value.count; });
      setStatusCounts(counts);
    };
    fetchCounts();
  }, []);

  const handleStatusTab = (val: string) => { setActiveStatus(val); setCurrentPage(1); };
  const clearAllFilters = () => { setSearchInput(''); setActiveStatus(''); setDatePreset(''); setCustomFrom(''); setCustomTo(''); setCurrentPage(1); };
  const hasActiveFilters = searchInput.trim() || activeStatus || datePreset;

  const totalPages = Math.ceil((pagination?.totalCount || 0) / pageSize);
  const getPageNumbers = (): (number | '...')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | '...')[] = [1];
    if (currentPage > 3) pages.push('...');
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
    return pages;
  };

  const activeDateLabel = (): string => {
    if (!datePreset) return 'All dates';
    if (datePreset === 'custom' && (customFrom || customTo)) return [customFrom, customTo].filter(Boolean).join(' → ');
    return DATE_PRESETS.find(p => p.value === datePreset)?.label || 'All dates';
  };

  // Summary bar — computed from current page
  const pageTotal     = items.reduce((s, inv: any) => s + (inv.totalAmount || 0), 0);
  const pagePaid      = items.reduce((s, inv: any) => s + (inv.paidAmount  || 0), 0);
  const pageBalance   = items.reduce((s, inv: any) => s + (inv.balanceAmount || 0), 0);
  const overdueCount  = items.filter((inv: any) => inv.status?.toLowerCase() === 'overdue').length;

  return (
    <Fragment>
      <Seo title="Invoices" />

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 my-[1.5rem]">
        <div>
          <p className="font-bold text-[1.1rem] text-defaulttextcolor mb-0">Invoices</p>
          <p className="text-[0.78rem] text-[#8c9097] mt-0.5">
            {pagination.totalCount > 0
              ? `${pagination.totalCount.toLocaleString()} total invoices`
              : 'View and manage all invoices'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] text-sm pointer-events-none" />
            <input
              type="text" value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search invoices, customers…"
              className="form-control form-control-sm !pl-9 !pr-8 w-[220px] !rounded-lg"
            />
            {searchInput && (
              <button onClick={() => setSearchInput('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-defaulttextcolor">
                <i className="ri-close-line text-sm" />
              </button>
            )}
          </div>

          {/* Date filter */}
          <div className="relative" ref={dateMenuRef}>
            <button onClick={() => setShowDateMenu(v => !v)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                datePreset ? 'border-[#C8A86B] text-[#C8A86B] bg-[#C8A86B]/5' : 'border-defaultborder text-defaulttextcolor hover:border-[#C8A86B]'
              }`}>
              <i className="ri-calendar-line text-sm" />
              {activeDateLabel()}
              <i className={`ri-arrow-down-s-line text-sm transition-transform ${showDateMenu ? 'rotate-180' : ''}`} />
            </button>
            {showDateMenu && (
              <div className="absolute right-0 top-full mt-1 w-64 bg-white dark:bg-bodybg border border-defaultborder rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="p-1">
                  <button onClick={() => { setDatePreset(''); setCustomFrom(''); setCustomTo(''); setShowDateMenu(false); setCurrentPage(1); }}
                    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${!datePreset ? 'bg-[#C8A86B]/10 font-semibold text-[#C8A86B]' : 'hover:bg-[#f8fafc] text-defaulttextcolor'}`}>
                    All dates
                  </button>
                  {DATE_PRESETS.map(p => (
                    <button key={p.value} onClick={() => { setDatePreset(p.value); setCurrentPage(1); setShowDateMenu(false); }}
                      className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                        datePreset === p.value ? 'bg-[#C8A86B]/10 font-semibold text-[#C8A86B]' : 'hover:bg-[#f8fafc] text-defaulttextcolor'
                      }`}>
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="border-t border-defaultborder p-3">
                  <p className="text-[11px] font-semibold text-[#94a3b8] mb-2 tracking-wide uppercase">Custom range</p>
                  <div className="flex gap-2">
                    <input type="date" value={customFrom} onChange={e => { setCustomFrom(e.target.value); setDatePreset('custom'); setCurrentPage(1); }}
                      className="form-control form-control-sm !rounded-lg flex-1 text-xs" />
                    <input type="date" value={customTo} onChange={e => { setCustomTo(e.target.value); setDatePreset('custom'); setCurrentPage(1); }}
                      className="form-control form-control-sm !rounded-lg flex-1 text-xs" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Clear */}
          {hasActiveFilters && (
            <button onClick={clearAllFilters}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-danger/40 text-danger hover:bg-danger/5 transition-colors">
              <i className="ri-filter-off-line text-sm" /> Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Status tab bar ── */}
      <div className="flex items-center gap-1 flex-wrap mb-5 border-b border-defaultborder pb-0">
        {STATUS_TABS.map(tab => {
          const isActive = activeStatus === tab.value;
          const count = tab.value ? statusCounts[tab.value] : pagination.totalCount;
          return (
            <button key={tab.value} onClick={() => handleStatusTab(tab.value)}
              className={`relative flex items-center gap-1.5 px-4 py-2.5 text-[0.8rem] font-medium transition-colors rounded-t-lg border-b-2 -mb-px ${
                isActive ? '' : 'border-transparent text-[#94a3b8] hover:text-defaulttextcolor'
              }`}
              style={isActive ? { borderBottomColor: tab.value ? tab.color : '#C8A86B', color: tab.value ? tab.color : '#C8A86B' } : {}}>
              {tab.label === 'Overdue' && statusCounts['Overdue'] > 0 && (
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-danger opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-danger" />
                </span>
              )}
              {tab.label}
              {count !== undefined && count > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                  style={isActive
                    ? { background: (tab.value ? tab.color : '#C8A86B') + '20', color: tab.value ? tab.color : '#C8A86B' }
                    : { background: '#f1f5f9', color: '#64748b' }}>
                  {count > 999 ? '999+' : count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="p-4 mb-4 rounded-xl border-l-4 border-danger bg-danger/10 text-danger text-sm">{error}</div>
      )}

      {/* ── Summary bar ── */}
      {!loading && items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Page total',   value: `Rs. ${fmt(pageTotal)}`,   color: '#1e293b', icon: 'ri-file-list-3-line',   bg: '#f1f5f9' },
            { label: 'Collected',    value: `Rs. ${fmt(pagePaid)}`,     color: '#16a34a', icon: 'ri-check-double-line',  bg: '#dcfce7' },
            { label: 'Outstanding',  value: `Rs. ${fmt(pageBalance)}`,  color: pageBalance > 0 ? '#dc2626' : '#16a34a', icon: 'ri-time-line', bg: pageBalance > 0 ? '#fee2e2' : '#dcfce7' },
            { label: 'Overdue',      value: `${overdueCount} invoice${overdueCount !== 1 ? 's' : ''}`, color: overdueCount > 0 ? '#dc2626' : '#94a3b8', icon: 'ri-alarm-warning-line', bg: overdueCount > 0 ? '#fee2e2' : '#f1f5f9' },
          ].map(({ label, value, color, icon, bg }) => (
            <div key={label} className="box p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: bg }}>
                <i className={`${icon} text-base`} style={{ color }} />
              </div>
              <div>
                <p className="text-[0.72rem] text-[#94a3b8] mb-0">{label}</p>
                <p className="font-bold text-[0.9rem] leading-tight mt-0.5" style={{ color }}>{value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Table ── */}
      <div className="box">
        {!loading && items.length > 0 && (
          <div className="px-4 py-3 border-b border-defaultborder flex items-center justify-between">
            <p className="text-[0.78rem] text-[#8c9097] mb-0">
              Showing <span className="font-semibold text-defaulttextcolor">
                {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, pagination.totalCount)}
              </span> of <span className="font-semibold text-defaulttextcolor">{pagination.totalCount.toLocaleString()}</span> invoices
              {activeStatus && <> · filtered by <span className="font-semibold" style={{ color: STATUS_TABS.find(t => t.value === activeStatus)?.color }}>{activeStatus}</span></>}
            </p>
            {hasActiveFilters && (
              <button onClick={clearAllFilters} className="text-[0.75rem] text-[#C8A86B] hover:underline font-medium">Clear filters</button>
            )}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="ti-custom-table ti-custom-table-hover text-sm w-full">
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left whitespace-nowrap">Invoice #</th>
                <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">Customer</th>
                <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left whitespace-nowrap">Order #</th>
                <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left whitespace-nowrap">Date / Due</th>
                <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-right whitespace-nowrap">Amount</th>
                <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left" style={{ minWidth: 120 }}>Collected</th>
                <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">Status</th>
                <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: '#f1f5f9' }}>
                        <i className="ri-file-list-3-line text-xl text-[#94a3b8]" />
                      </div>
                      <div>
                        <p className="font-semibold text-defaulttextcolor text-sm">
                          {hasActiveFilters ? 'No invoices match your filters' : 'No invoices yet'}
                        </p>
                        <p className="text-xs text-[#94a3b8] mt-1">
                          {hasActiveFilters
                            ? <button onClick={clearAllFilters} className="text-[#C8A86B] hover:underline">Clear filters</button>
                            : 'Invoices appear when orders are converted'}
                        </p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                items.map((invoice: any) => {
                  const s = statusStyle(invoice.status);
                  const customerName = invoice.customerName?.trim() || 'Unknown';
                  const today = isInvoiceToday(invoice.invoiceDate);
                  const bg = avatarColor(customerName);
                  const dueLabel = dueDateLabel(invoice.dueDate, invoice.status);
                  const type = invoiceType(invoice.invoiceNumber || '');
                  const balance = invoice.balanceAmount || 0;

                  return (
                    <tr key={invoice.id}
                        className="border-b border-defaultborder/50 hover:bg-[#f8fafc] transition-colors group"
                        style={rowAccent(invoice.status, today)}>

                      {/* Invoice # */}
                      <td className="py-3 px-4">
                        <Link href={`/invoices/${invoice.id}`}
                          className="font-mono text-[0.78rem] font-semibold hover:underline block"
                          style={{ color: '#2563eb' }}>
                          {invoice.invoiceNumber}
                        </Link>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {type && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded"
                              style={{ background: '#f1f5f9', color: '#64748b' }}>{type}</span>
                          )}
                          {today && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                              style={{ background: '#dcfce7', color: '#16a34a' }}>TODAY</span>
                          )}
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                            style={{ background: bg }}>
                            {initials(customerName)}
                          </div>
                          <span className="font-medium text-defaulttextcolor text-[0.82rem]">{customerName}</span>
                        </div>
                      </td>

                      {/* Order # */}
                      <td className="py-3 px-4">
                        {invoice.orderNumber ? (
                          <span className="inline-flex items-center font-mono text-[11px] font-semibold px-2 py-1 rounded-md"
                            style={{ background: '#dbeafe', color: '#1d4ed8' }}>
                            {invoice.orderNumber}
                          </span>
                        ) : (
                          <span className="text-[#94a3b8] text-sm">—</span>
                        )}
                      </td>

                      {/* Date / Due */}
                      <td className="py-3 px-4">
                        <p className="text-[0.8rem] text-defaulttextcolor whitespace-nowrap">
                          {new Date(invoice.invoiceDate).toLocaleDateString('en-NP', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                        {dueLabel && (
                          <p className="text-[11px] font-semibold mt-0.5 whitespace-nowrap" style={{ color: dueLabel.color }}>
                            {dueLabel.text}
                          </p>
                        )}
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right font-semibold text-[0.85rem] text-defaulttextcolor whitespace-nowrap">
                        Rs. {fmt(invoice.totalAmount || 0)}
                      </td>

                      {/* Collected progress */}
                      <td className="py-3 px-4">
                        <PaymentProgress paid={invoice.paidAmount || 0} total={invoice.totalAmount || 0} />
                        {balance > 0 && (
                          <p className="text-[10px] mt-1 font-semibold" style={{ color: '#dc2626' }}>
                            Rs. {fmt(balance)} due
                          </p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                          style={{ background: s.bg, color: s.text }}>
                          {invoice.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-center">
                        <Link href={`/invoices/${invoice.id}`}>
                          <button className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[0.75rem] font-semibold rounded-lg border
                                            border-defaultborder text-defaulttextcolor group-hover:border-[#C8A86B] group-hover:text-[#C8A86B]
                                            transition-colors whitespace-nowrap">
                            <i className="ri-eye-line" /> View
                          </button>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagination ── */}
      {!loading && pagination.totalCount > pageSize && (
        <div className="box mt-4">
          <div className="box-body flex items-center justify-between flex-wrap gap-4">
            <p className="text-[0.78rem] text-[#8c9097] mb-0">
              Page {currentPage} of {totalPages} · {pagination.totalCount.toLocaleString()} invoices
            </p>
            <div className="flex items-center gap-1">
              <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}
                className="px-2.5 py-1.5 text-[0.78rem] border border-defaultborder rounded-lg text-defaulttextcolor hover:border-[#C8A86B] hover:text-[#C8A86B] disabled:opacity-40 disabled:pointer-events-none transition-colors">«</button>
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="px-3 py-1.5 text-[0.78rem] border border-defaultborder rounded-lg text-defaulttextcolor hover:border-[#C8A86B] hover:text-[#C8A86B] disabled:opacity-40 disabled:pointer-events-none transition-colors">‹ Prev</button>
              {getPageNumbers().map((pg, idx) =>
                pg === '...' ? (
                  <span key={idx} className="px-3 py-1.5 text-[0.78rem] text-[#94a3b8]">…</span>
                ) : (
                  <button key={idx} onClick={() => setCurrentPage(pg as number)}
                    className={`px-3 py-1.5 text-[0.78rem] border rounded-lg transition-colors font-medium ${
                      currentPage === pg ? 'text-black border-[#C8A86B]' : 'border-defaultborder text-defaulttextcolor hover:border-[#C8A86B] hover:text-[#C8A86B]'
                    }`}
                    style={currentPage === pg ? { background: 'linear-gradient(135deg, #C8A86B 0%, #a8863d 100%)' } : {}}>
                    {pg}
                  </button>
                )
              )}
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-[0.78rem] border border-defaultborder rounded-lg text-defaulttextcolor hover:border-[#C8A86B] hover:text-[#C8A86B] disabled:opacity-40 disabled:pointer-events-none transition-colors">Next ›</button>
              <button onClick={() => setCurrentPage(totalPages)} disabled={currentPage === totalPages}
                className="px-2.5 py-1.5 text-[0.78rem] border border-defaultborder rounded-lg text-defaulttextcolor hover:border-[#C8A86B] hover:text-[#C8A86B] disabled:opacity-40 disabled:pointer-events-none transition-colors">»</button>
            </div>
          </div>
        </div>
      )}
    </Fragment>
  );
};

export default InvoicesPage;
