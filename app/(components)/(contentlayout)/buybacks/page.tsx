'use client';

import { Fragment, useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL;

// ── types ─────────────────────────────────────────────────────────────────────
type Buyback = {
  id: string;
  buybackNumber: string;
  customerId: string;
  customerName: string;
  targetId?: string;
  targetNumber?: string;
  itemName?: string;
  gramsReturned: number;
  buybackRatePerGram: number;
  totalPaidOut: number;
  paymentMethod: string;
  notes?: string;
  recordedAt: string;
  gramsEligibleRemaining: number;
};
type Customer = { id: string; fullName: string; email?: string; phoneNumber?: string };
type Target   = { id: string; targetNumber: string; itemName: string; gramsEligibleForBuyback: number; totalGrams: number };

// ── helpers ───────────────────────────────────────────────────────────────────
function avatarColor(name: string) {
  const colors = ['#C8A86B', '#7c3aed', '#0891b2', '#16a34a', '#dc2626', '#d97706', '#db2777', '#2563eb'];
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}
function avatarInitials(name: string) {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

const METHOD_STYLES: Record<string, { bg: string; text: string }> = {
  'Cash':          { bg: '#dcfce7', text: '#16a34a' },
  'Bank Transfer': { bg: '#dbeafe', text: '#1d4ed8' },
  'Card':          { bg: '#ede9fe', text: '#7c3aed' },
  'Credits':       { bg: '#fef3c7', text: '#d97706' },
  'Cheque':        { bg: '#f1f5f9', text: '#475569' },
  'Other':         { bg: '#f1f5f9', text: '#64748b' },
};
const METHOD_FALLBACK = { bg: '#f1f5f9', text: '#64748b' };

const PAYMENT_METHODS = ['Cash', 'Bank Transfer', 'Card', 'Credits', 'Cheque', 'Other'];

// ── page ──────────────────────────────────────────────────────────────────────
export default function BuybacksPage() {
  useProtectedRoute();

  const [items, setItems]         = useState<Buyback[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage]           = useState(1);
  const pageSize                  = 25;
  const [loading, setLoading]     = useState(true);
  const [showLogModal, setShowLogModal] = useState(false);
  const [currentRate, setCurrentRate]   = useState(0);

  // ── filters ───────────────────────────────────────────────────────────────
  const [searchInput, setSearchInput]     = useState('');
  const [searchTerm, setSearchTerm]       = useState('');
  const [date, setDate]                   = useState('');
  const [showDateMenu, setShowDateMenu]   = useState(false);
  const [selectedMethod, setSelectedMethod]   = useState('');
  const [showMethodMenu, setShowMethodMenu]   = useState(false);
  const dateMenuRef   = useRef<HTMLDivElement>(null);
  const methodMenuRef = useRef<HTMLDivElement>(null);
  const searchTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // debounce search → trigger API call
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setSearchTerm(searchInput); setPage(1); }, 350);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchInput]);

  // close dropdowns on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dateMenuRef.current   && !dateMenuRef.current.contains(e.target as Node))   setShowDateMenu(false);
      if (methodMenuRef.current && !methodMenuRef.current.contains(e.target as Node)) setShowMethodMenu(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // ── data ──────────────────────────────────────────────────────────────────
  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (date) params.set('date', date);
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      const r = await fetch(`${API}/targets/buybacks?${params}`, { headers: getAuthHeaders() });
      const d = await r.json();
      const data = d?.data || {};
      setItems(data.items || []);
      setTotalCount(data.totalCount || 0);
    } catch { toast.error('Failed to load buybacks'); }
    finally   { setLoading(false); }
  };

  const loadRate = async () => {
    try {
      const r = await fetch(`${API}/rates/silver`, { headers: getAuthHeaders() });
      const d = await r.json();
      setCurrentRate(d?.data?.buybackRatePerGram || d?.buybackRatePerGram || 0);
    } catch {/* swallow */}
  };

  useEffect(() => { setPage(1); }, [date, pageSize]);
  useEffect(() => { load(); }, [page, pageSize, searchTerm, date]);
  useEffect(() => { loadRate(); }, []);

  // ── client-side method filter ─────────────────────────────────────────────
  const filteredItems = selectedMethod
    ? items.filter(b => b.paymentMethod === selectedMethod)
    : items;

  // aggregate over current page (note partial when totalPages > 1)
  const totals = filteredItems.reduce(
    (acc, b) => ({ grams: acc.grams + (b.gramsReturned || 0), payout: acc.payout + (b.totalPaidOut || 0) }),
    { grams: 0, payout: 0 }
  );

  const totalPages = Math.ceil(totalCount / pageSize);
  const hasFilters = !!searchInput || !!date || !!selectedMethod;

  const clearFilters = () => {
    setSearchInput(''); setSearchTerm(''); setDate(''); setSelectedMethod(''); setPage(1);
  };

  // ── date helpers ──────────────────────────────────────────────────────────
  const todayStr = new Date().toISOString().split('T')[0];
  const yesterdayStr = (() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().split('T')[0]; })();
  const activeDateLabel = () => {
    if (!date) return 'All dates';
    if (date === todayStr) return 'Today';
    if (date === yesterdayStr) return 'Yesterday';
    return new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const fmtDateTime = (iso: string) => {
    const d = new Date(iso);
    return {
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
    };
  };
  const isToday = (iso: string) => new Date(iso).toISOString().split('T')[0] === todayStr;

  // ── pagination helpers ────────────────────────────────────────────────────
  const pageNums = (): (number | '...')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 4)              return [1, 2, 3, 4, 5, '...', totalPages];
    if (page >= totalPages - 3) return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '...', page - 1, page, page + 1, '...', totalPages];
  };

  return (
    <Fragment>
      {/* ── Zone 1: Header ── */}
      <div className="flex items-center justify-between my-[1.5rem]">
        <div>
          <p className="font-bold text-[1.1rem] text-defaulttextcolor mb-0">Buyback Ledger</p>
          <p className="text-[0.78rem] text-[#8c9097] mt-0.5">All silver buybacks recorded by staff</p>
        </div>
        <button
          onClick={() => setShowLogModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg text-black"
          style={{ background: 'linear-gradient(135deg, #C8A86B 0%, #a8863d 100%)', color: '#fff' }}>
          <i className="ri-add-line"/> Log Buyback
        </button>
      </div>

      {/* ── Zone 2: Stat cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
        {/* Buybacks count */}
        <div className="box p-4 flex items-center gap-4" style={{ borderLeft: '3px solid #d97706' }}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#fef3c7' }}>
            <i className="ri-arrow-go-back-line text-xl" style={{ color: '#d97706' }}/>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-0.5">
              Buybacks{hasFilters ? ' (filtered)' : ''}
            </p>
            <p className="text-[1.4rem] font-bold text-defaulttextcolor mb-0">{totalCount.toLocaleString()}</p>
          </div>
        </div>

        {/* Grams returned */}
        <div className="box p-4 flex items-center gap-4" style={{ borderLeft: '3px solid #0891b2' }}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#e0f2fe' }}>
            <i className="ri-scales-3-line text-xl" style={{ color: '#0891b2' }}/>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-0.5">
              Grams Returned{totalPages > 1 ? ' (this page)' : ''}
            </p>
            <p className="text-[1.4rem] font-bold font-mono text-defaulttextcolor mb-0">{totals.grams.toFixed(3)}g</p>
          </div>
        </div>

        {/* Total paid out */}
        <div className="box p-4 flex items-center gap-4" style={{ borderLeft: '3px solid #C8A86B' }}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#fdf8ee' }}>
            <i className="ri-money-rupee-circle-line text-xl" style={{ color: '#C8A86B' }}/>
          </div>
          <div>
            <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-0.5">
              Paid Out{totalPages > 1 ? ' (this page)' : ''}
            </p>
            <p className="text-[1.4rem] font-bold mb-0" style={{ color: '#C8A86B' }}>
              Rs. {totals.payout.toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* ── Zone 3: Filter bar ── */}
      <div className="box p-3 mb-4">
        <div className="flex items-center gap-2 flex-nowrap">

          {/* Search */}
          <div className="relative flex-1 min-w-0">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] text-sm pointer-events-none"/>
            <input
              type="text" value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search buyback #, customer…"
              className="form-control form-control-sm !pl-9 !pr-8 w-full !rounded-lg"
            />
            {searchInput && (
              <button onClick={() => setSearchInput('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-defaulttextcolor">
                <i className="ri-close-line text-sm"/>
              </button>
            )}
          </div>

          {/* Date filter */}
          <div className="relative flex-shrink-0" ref={dateMenuRef}>
            <button
              onClick={() => { setShowDateMenu(v => !v); setShowMethodMenu(false); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors whitespace-nowrap ${
                date
                  ? 'border-[#C8A86B] text-[#C8A86B] bg-[#C8A86B]/5'
                  : 'border-defaultborder text-defaulttextcolor hover:border-[#C8A86B]'
              }`}>
              <i className="ri-calendar-line text-sm"/>
              {activeDateLabel()}
              <i className={`ri-arrow-down-s-line text-sm transition-transform ${showDateMenu ? 'rotate-180' : ''}`}/>
            </button>
            {showDateMenu && (
              <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-bodybg border border-defaultborder rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="p-1">
                  {[{ label: 'All dates', value: '' }, { label: 'Today', value: todayStr }, { label: 'Yesterday', value: yesterdayStr }].map(p => (
                    <button key={p.label} onClick={() => { setDate(p.value); setShowDateMenu(false); setPage(1); }}
                      className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                        date === p.value ? 'bg-[#C8A86B]/10 font-semibold text-[#C8A86B]' : 'hover:bg-[#f8fafc] text-defaulttextcolor'
                      }`}>
                      {p.label}
                    </button>
                  ))}
                </div>
                <div className="border-t border-defaultborder p-3">
                  <p className="text-[11px] font-semibold text-[#94a3b8] mb-2 tracking-wide uppercase">Custom date</p>
                  <input type="date" value={date}
                    onChange={e => { setDate(e.target.value); setShowDateMenu(false); setPage(1); }}
                    className="form-control form-control-sm !rounded-lg w-full text-xs"/>
                </div>
              </div>
            )}
          </div>

          {/* Method filter */}
          <div className="relative flex-shrink-0" ref={methodMenuRef}>
            <button
              onClick={() => { setShowMethodMenu(v => !v); setShowDateMenu(false); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors whitespace-nowrap ${
                selectedMethod
                  ? 'border-[#C8A86B] text-[#C8A86B] bg-[#C8A86B]/5'
                  : 'border-defaultborder text-defaulttextcolor hover:border-[#C8A86B]'
              }`}>
              <i className="ri-bank-card-line text-sm"/>
              {selectedMethod || 'All methods'}
              <i className={`ri-arrow-down-s-line text-sm transition-transform ${showMethodMenu ? 'rotate-180' : ''}`}/>
            </button>
            {showMethodMenu && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-bodybg border border-defaultborder rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="p-1">
                  <button onClick={() => { setSelectedMethod(''); setShowMethodMenu(false); }}
                    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                      !selectedMethod ? 'bg-[#C8A86B]/10 font-semibold text-[#C8A86B]' : 'hover:bg-[#f8fafc] text-defaulttextcolor'
                    }`}>
                    All methods
                  </button>
                  {PAYMENT_METHODS.map(m => {
                    const s = METHOD_STYLES[m] || METHOD_FALLBACK;
                    return (
                      <button key={m} onClick={() => { setSelectedMethod(m); setShowMethodMenu(false); }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${
                          selectedMethod === m ? 'bg-[#C8A86B]/10' : 'hover:bg-[#f8fafc]'
                        }`}>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: s.bg, color: s.text }}>{m}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Clear */}
          {hasFilters && (
            <button onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-danger/40 text-danger hover:bg-danger/5 transition-colors flex-shrink-0 whitespace-nowrap">
              <i className="ri-filter-off-line text-sm"/> Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Table ── */}
      <div className="box">
        <div className="overflow-x-auto">
          <table className="ti-custom-table ti-custom-table-hover text-sm w-full">
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left whitespace-nowrap">Buyback #</th>
                <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">Customer</th>
                <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">Target / Item</th>
                <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-right">Grams</th>
                <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-right">Rate</th>
                <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-right">Paid Out</th>
                <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">Method</th>
                <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">Recorded</th>
                <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {[120, 150, 140, 65, 80, 90, 80, 110, 50].map((w, j) => (
                      <td key={j} className="py-3 px-4">
                        <div className="h-4 rounded animate-pulse bg-[#f1f5f9]" style={{ width: w }}/>
                      </td>
                    ))}
                  </tr>
                ))
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                        style={{ background: '#fef3c7' }}>
                        <i className="ri-arrow-go-back-line text-2xl" style={{ color: '#d97706' }}/>
                      </div>
                      <div>
                        <p className="font-semibold text-defaulttextcolor mb-0.5">
                          {hasFilters ? 'No buybacks match the filter' : 'No buybacks recorded yet'}
                        </p>
                        <p className="text-[0.78rem] text-[#94a3b8] mb-2">
                          {hasFilters ? 'Try adjusting your filters.' : 'Log the first silver buyback to get started.'}
                        </p>
                        {!hasFilters && (
                          <button onClick={() => setShowLogModal(true)}
                            className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg text-white mx-auto"
                            style={{ background: 'linear-gradient(135deg, #C8A86B 0%, #a8863d 100%)' }}>
                            <i className="ri-add-line"/> Log Buyback
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : filteredItems.map(b => {
                const ac = avatarColor(b.customerName || '');
                const ai = avatarInitials(b.customerName || 'UK');
                const ms = METHOD_STYLES[b.paymentMethod] || METHOD_FALLBACK;
                const dt = fmtDateTime(b.recordedAt);
                const today = isToday(b.recordedAt);

                return (
                  <tr key={b.id} className="group">
                    {/* Buyback # */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[0.8rem] font-semibold text-defaulttextcolor whitespace-nowrap">
                          {b.buybackNumber}
                        </span>
                        {today && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0"
                            style={{ background: '#dcfce7', color: '#16a34a' }}>TODAY</span>
                        )}
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                          style={{ background: ac }}>
                          {ai}
                        </div>
                        <Link href={`/customers/${b.customerId}`}
                          className="text-[0.8rem] font-medium text-defaulttextcolor hover:text-[#C8A86B] transition-colors whitespace-nowrap">
                          {b.customerName}
                        </Link>
                      </div>
                    </td>

                    {/* Target / Item */}
                    <td className="py-3 px-4">
                      {b.targetNumber ? (
                        <div>
                          <span className="font-mono text-[0.78rem] text-defaulttextcolor">{b.targetNumber}</span>
                          {b.itemName && (
                            <p className="text-[0.72rem] text-[#94a3b8] mb-0 mt-0.5">{b.itemName}</p>
                          )}
                        </div>
                      ) : <span className="text-[#cbd5e1]">—</span>}
                    </td>

                    {/* Grams */}
                    <td className="py-3 px-4 text-right">
                      <span className="font-mono text-[0.85rem] font-bold" style={{ color: '#0891b2' }}>
                        {b.gramsReturned?.toFixed(3)}g
                      </span>
                    </td>

                    {/* Rate */}
                    <td className="py-3 px-4 text-right">
                      <span className="text-[0.8rem] text-[#64748b] whitespace-nowrap">
                        Rs. {b.buybackRatePerGram?.toFixed(2)}/g
                      </span>
                    </td>

                    {/* Paid Out */}
                    <td className="py-3 px-4 text-right">
                      <span className="text-[0.85rem] font-bold whitespace-nowrap" style={{ color: '#C8A86B' }}>
                        Rs. {b.totalPaidOut?.toLocaleString()}
                      </span>
                    </td>

                    {/* Method */}
                    <td className="py-3 px-4">
                      <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                        style={{ background: ms.bg, color: ms.text }}>
                        {b.paymentMethod}
                      </span>
                    </td>

                    {/* Recorded */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <p className="text-[0.8rem] font-medium text-defaulttextcolor mb-0">{dt.date}</p>
                      <p className="text-[0.72rem] text-[#94a3b8] mb-0">{dt.time}</p>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center">
                        {b.targetId ? (
                          <Link href={`/targets/${b.targetId}`}>
                            <button title="View target"
                              className="w-8 h-8 rounded-lg flex items-center justify-center border border-defaultborder text-[#64748b] hover:border-[#C8A86B] hover:text-[#C8A86B] transition-colors">
                              <i className="ri-eye-line text-sm"/>
                            </button>
                          </Link>
                        ) : (
                          <span className="text-[#cbd5e1] text-sm">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Pagination ── */}
      {!loading && totalCount > 0 && (
        <div className="box mt-3">
          <div className="box-body flex items-center justify-between flex-wrap gap-4">
            <p className="text-[0.78rem] text-[#8c9097] mb-0">
              Showing{' '}
              <span className="font-semibold text-defaulttextcolor">
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, totalCount)}
              </span>{' '}
              of <span className="font-semibold text-defaulttextcolor">{totalCount.toLocaleString()}</span> buybacks
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(1)} disabled={page === 1}
                  className="px-2.5 py-1.5 text-[0.78rem] border border-defaultborder rounded-lg text-defaulttextcolor hover:border-[#C8A86B] hover:text-[#C8A86B] disabled:opacity-40 disabled:pointer-events-none transition-colors">«</button>
                <button onClick={() => setPage(p => p - 1)} disabled={page === 1}
                  className="px-3 py-1.5 text-[0.78rem] border border-defaultborder rounded-lg text-defaulttextcolor hover:border-[#C8A86B] hover:text-[#C8A86B] disabled:opacity-40 disabled:pointer-events-none transition-colors">‹ Prev</button>
                {pageNums().map((pg, idx) =>
                  pg === '...'
                    ? <span key={idx} className="px-3 py-1.5 text-[0.78rem] text-[#94a3b8]">…</span>
                    : (
                      <button key={idx} onClick={() => setPage(pg as number)}
                        className={`px-3 py-1.5 text-[0.78rem] border rounded-lg transition-colors font-medium ${
                          page === pg
                            ? 'text-white border-[#C8A86B]'
                            : 'border-defaultborder text-defaulttextcolor hover:border-[#C8A86B] hover:text-[#C8A86B]'
                        }`}
                        style={page === pg ? { background: 'linear-gradient(135deg, #C8A86B 0%, #a8863d 100%)' } : {}}>
                        {pg}
                      </button>
                    )
                )}
                <button onClick={() => setPage(p => p + 1)} disabled={page === totalPages}
                  className="px-3 py-1.5 text-[0.78rem] border border-defaultborder rounded-lg text-defaulttextcolor hover:border-[#C8A86B] hover:text-[#C8A86B] disabled:opacity-40 disabled:pointer-events-none transition-colors">Next ›</button>
                <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                  className="px-2.5 py-1.5 text-[0.78rem] border border-defaultborder rounded-lg text-defaulttextcolor hover:border-[#C8A86B] hover:text-[#C8A86B] disabled:opacity-40 disabled:pointer-events-none transition-colors">»</button>
              </div>
            )}
          </div>
        </div>
      )}

      {showLogModal && (
        <LogBuybackModal
          currentRate={currentRate}
          onClose={() => setShowLogModal(false)}
          onSuccess={() => { setShowLogModal(false); load(); }}
        />
      )}
    </Fragment>
  );
}

// ── Log Buyback Modal ─────────────────────────────────────────────────────────
function LogBuybackModal({
  currentRate, onClose, onSuccess,
}: {
  currentRate: number;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [customerSearch, setCustomerSearch]   = useState('');
  const [customerMatches, setCustomerMatches] = useState<Customer[]>([]);
  const [searchOpen, setSearchOpen]           = useState(false);
  const [selected, setSelected]               = useState<Customer | null>(null);
  const [targets, setTargets]                 = useState<Target[]>([]);
  const [targetsLoading, setTargetsLoading]   = useState(false);

  const [targetId, setTargetId]           = useState('');
  const [grams, setGrams]                 = useState('');
  const [rate, setRate]                   = useState(currentRate.toString());
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [notes, setNotes]                 = useState('');
  const [submitting, setSubmitting]       = useState(false);

  const searchTimer = useRef<any>(null);

  // debounced customer search
  useEffect(() => {
    if (selected || customerSearch.length < 2) { setCustomerMatches([]); return; }
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(async () => {
      try {
        const r = await fetch(`${API}/customers?search=${encodeURIComponent(customerSearch)}&pageSize=10`, { headers: getAuthHeaders() });
        const d = await r.json();
        const list = d?.data?.items || d?.items || [];
        setCustomerMatches(list.map((c: any) => ({
          id: c.id,
          fullName: c.fullName || `${c.firstName || ''} ${c.lastName || ''}`.trim(),
          email: c.email,
          phoneNumber: c.phoneNumber,
        })));
        setSearchOpen(true);
      } catch {/* swallow */}
    }, 250);
  }, [customerSearch, selected]);

  // load delivered targets when customer selected
  useEffect(() => {
    if (!selected) { setTargets([]); return; }
    setTargetsLoading(true);
    fetch(`${API}/targets/customer/${selected.id}`, { headers: getAuthHeaders() })
      .then(r => r.json())
      .then(d => {
        const all: any[] = d?.data || d || [];
        setTargets(all.filter(t =>
          (t.status === 'Delivered' || t.status === 'Completed') &&
          (t.gramsEligibleForBuyback ?? 0) > 0
        ));
      })
      .catch(() => setTargets([]))
      .finally(() => setTargetsLoading(false));
  }, [selected]);

  const pickedTarget = targets.find(t => t.id === targetId);
  const maxGrams    = pickedTarget?.gramsEligibleForBuyback;
  const gramsNum    = parseFloat(grams) || 0;
  const rateNum     = parseFloat(rate) || 0;
  const totalPayout = gramsNum * rateNum;
  const gramsValid  = gramsNum > 0 && (!maxGrams || gramsNum <= maxGrams);
  const canSubmit   = !!selected && gramsValid && rateNum > 0 && !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const r = await fetch(`${API}/targets/buybacks`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selected!.id,
          targetId: targetId || null,
          gramsReturned: gramsNum,
          buybackRatePerGram: rateNum,
          paymentMethod,
          notes: notes || null,
        }),
      });
      const d = await r.json();
      if (!r.ok || d?.success === false) {
        toast.error(d?.message || 'Failed to log buyback');
      } else {
        toast.success(`Buyback ${d?.data?.buybackNumber || ''} logged — Rs. ${totalPayout.toLocaleString()}`);
        onSuccess();
      }
    } catch {
      toast.error('Failed to log buyback');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-bodybg rounded-2xl shadow-2xl w-full max-w-lg flex flex-col" style={{ maxHeight: '90vh' }}>

        {/* Modal header */}
        <div className="p-5 border-b border-defaultborder flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: '#fef3c7' }}>
              <i className="ri-arrow-go-back-line" style={{ color: '#d97706' }}/>
            </div>
            <div>
              <h3 className="text-[1rem] font-bold text-defaulttextcolor mb-0">Log Silver Buyback</h3>
              <p className="text-[0.72rem] text-[#94a3b8]">Record a customer silver return</p>
            </div>
          </div>
          <button onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center border border-defaultborder text-[#64748b] hover:border-danger hover:text-danger transition-colors">
            <i className="ri-close-line text-sm"/>
          </button>
        </div>

        {/* Modal body */}
        <div className="p-5 space-y-4 overflow-auto">

          {/* Customer search */}
          <div className="relative">
            <label className="block text-sm font-medium text-defaulttextcolor mb-1.5">Customer <span className="text-danger">*</span></label>
            {selected ? (
              <div className="flex items-center justify-between p-3 border border-defaultborder rounded-xl"
                style={{ background: '#C8A86B10' }}>
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                    style={{ background: avatarColor(selected.fullName) }}>
                    {avatarInitials(selected.fullName)}
                  </div>
                  <div>
                    <p className="font-semibold text-sm text-defaulttextcolor mb-0">{selected.fullName}</p>
                    <p className="text-[0.72rem] text-[#94a3b8] mb-0">{selected.email || selected.phoneNumber || ''}</p>
                  </div>
                </div>
                <button onClick={() => { setSelected(null); setCustomerSearch(''); setTargetId(''); }}
                  className="text-xs text-[#C8A86B] hover:underline font-medium">Change</button>
              </div>
            ) : (
              <>
                <div className="relative">
                  <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] text-sm pointer-events-none"/>
                  <input
                    type="text" value={customerSearch}
                    onChange={e => setCustomerSearch(e.target.value)}
                    onFocus={() => setSearchOpen(true)}
                    placeholder="Type name, email or phone…"
                    className="form-control !pl-9 !rounded-xl"
                    autoFocus
                  />
                </div>
                {searchOpen && customerMatches.length > 0 && (
                  <div className="absolute z-10 mt-1 left-0 right-0 bg-white dark:bg-bodybg border border-defaultborder rounded-xl shadow-xl overflow-hidden">
                    {customerMatches.map(c => (
                      <button key={c.id} type="button"
                        onClick={() => { setSelected(c); setSearchOpen(false); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-[#f8fafc] border-b border-defaultborder last:border-b-0 flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                          style={{ background: avatarColor(c.fullName) }}>
                          {avatarInitials(c.fullName)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-defaulttextcolor mb-0">{c.fullName || '(no name)'}</p>
                          <p className="text-[0.72rem] text-[#94a3b8] mb-0">{c.email || c.phoneNumber || ''}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {searchOpen && customerSearch.length >= 2 && customerMatches.length === 0 && (
                  <div className="absolute z-10 mt-1 left-0 right-0 bg-white border border-defaultborder rounded-xl shadow-xl p-4 text-sm text-[#94a3b8] text-center">
                    No matches — try a different name or phone.
                  </div>
                )}
              </>
            )}
          </div>

          {/* Target picker */}
          {selected && (
            <div>
              <label className="block text-sm font-medium text-defaulttextcolor mb-1.5">
                Target <span className="text-[0.72rem] text-[#94a3b8] font-normal">(optional but recommended)</span>
              </label>
              {targetsLoading ? (
                <p className="text-xs text-[#94a3b8]">Loading customer's targets…</p>
              ) : targets.length === 0 ? (
                <p className="text-xs text-[#94a3b8]">No delivered targets with eligible grams. You can log a freeform buyback below.</p>
              ) : (
                <select value={targetId} onChange={e => setTargetId(e.target.value)}
                  className="form-select !rounded-xl">
                  <option value="">— No specific target —</option>
                  {targets.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.targetNumber} · {t.itemName} · eligible: {t.gramsEligibleForBuyback?.toFixed(3)}g
                    </option>
                  ))}
                </select>
              )}
              {pickedTarget && (
                <p className="text-xs text-[#94a3b8] mt-1">
                  Max eligible: <span className="font-mono font-semibold text-defaulttextcolor">{maxGrams?.toFixed(3)}g</span>
                </p>
              )}
            </div>
          )}

          {/* Grams */}
          <div>
            <label className="block text-sm font-medium text-defaulttextcolor mb-1.5">
              Grams Returned <span className="text-danger">*</span>
            </label>
            <input type="number" step="0.001" min="0" max={maxGrams}
              value={grams} onChange={e => setGrams(e.target.value)}
              placeholder="e.g. 5.250"
              className={`form-control !rounded-xl ${!gramsValid && grams ? '!border-danger' : ''}`}
            />
            {!gramsValid && grams && (
              <p className="text-xs text-danger mt-1">
                {gramsNum <= 0 ? 'Must be greater than 0' : `Cannot exceed eligible ${maxGrams?.toFixed(3)}g`}
              </p>
            )}
          </div>

          {/* Rate */}
          <div>
            <label className="block text-sm font-medium text-defaulttextcolor mb-1.5">
              Buyback Rate (NPR/g) <span className="text-danger">*</span>
            </label>
            <input type="number" step="0.01" min="0"
              value={rate} onChange={e => setRate(e.target.value)}
              className="form-control !rounded-xl"
            />
            <p className="text-xs text-[#94a3b8] mt-1">
              System rate: <span className="font-mono text-defaulttextcolor">Rs. {currentRate.toFixed(2)}/g</span>
              {rateNum !== currentRate && rateNum > 0 && (
                <span className="ms-2 font-semibold" style={{ color: '#d97706' }}>(manual override)</span>
              )}
            </p>
          </div>

          {/* Payment method */}
          <div>
            <label className="block text-sm font-medium text-defaulttextcolor mb-1.5">
              Payment Method <span className="text-danger">*</span>
            </label>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
              className="form-select !rounded-xl">
              {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-defaulttextcolor mb-1.5">Notes (optional)</label>
            <textarea rows={2} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Bank transfer ref ABC-123"
              className="form-control !rounded-xl"/>
          </div>

          {/* Payout preview */}
          {gramsValid && rateNum > 0 && (
            <div className="rounded-xl p-4 text-center" style={{ background: '#fdf8ee', border: '1px solid #C8A86B40' }}>
              <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-1">Total Payout</p>
              <p className="text-[1.6rem] font-bold mb-1" style={{ color: '#C8A86B' }}>
                Rs. {totalPayout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
              <p className="text-[0.75rem] text-[#94a3b8] mb-0">
                {gramsNum.toFixed(3)}g × Rs. {rateNum.toFixed(2)}/g
              </p>
            </div>
          )}
        </div>

        {/* Modal footer */}
        <div className="p-5 border-t border-defaultborder flex gap-3 justify-end">
          <button onClick={onClose} disabled={submitting}
            className="ti-btn ti-btn-light !rounded-xl">
            Cancel
          </button>
          <button onClick={submit} disabled={!canSubmit}
            className="ti-btn !rounded-xl font-semibold disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #C8A86B 0%, #a8863d 100%)', color: '#fff' }}>
            {submitting
              ? <><i className="ri-loader-4-line animate-spin mr-1"/>Logging…</>
              : <><i className="ri-arrow-go-back-line mr-1"/>Log Buyback</>}
          </button>
        </div>
      </div>
    </div>
  );
}
