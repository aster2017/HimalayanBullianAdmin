'use client'
import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://hbc-api.semis.app/api';

// ── helpers ───────────────────────────────────────────────────────────────────
function avatarColor(name: string) {
  const colors = ['#C8A86B', '#7c3aed', '#0891b2', '#16a34a', '#dc2626', '#d97706', '#db2777', '#2563eb'];
  let h = 0; for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return colors[Math.abs(h) % colors.length];
}
function avatarInitials(first: string, last: string) {
  return ((first?.[0] || '') + (last?.[0] || '')).toUpperCase() || '??';
}
function relativeTime(iso: string) {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 30)  return `${days}d ago`;
  const mo = Math.floor(days / 30);
  if (mo < 12)   return `${mo}mo ago`;
  return `${Math.floor(mo / 12)}y ago`;
}

type StatusKey = 'active' | 'suspended' | 'unverified' | 'pending' | '';
type ZohoKey   = 'linked' | 'notlinked' | '';

const STATUS_CONFIG: Record<string, { label: string; bg: string; text: string }> = {
  active:     { label: 'Active',      bg: '#dcfce7', text: '#16a34a' },
  suspended:  { label: 'Suspended',   bg: '#fee2e2', text: '#dc2626' },
  unverified: { label: 'Unverified',  bg: '#fef3c7', text: '#d97706' },
  pending:    { label: 'Pending',     bg: '#dbeafe', text: '#2563eb' },
};

const STATUS_FILTERS = [
  { value: '' as StatusKey,        label: 'All statuses' },
  { value: 'active' as StatusKey,  label: 'Active' },
  { value: 'suspended' as StatusKey, label: 'Suspended' },
  { value: 'unverified' as StatusKey, label: 'Unverified' },
  { value: 'pending' as StatusKey, label: 'Pending' },
];

function customerStatus(c: any): string {
  if (!c.isActive)         return 'suspended';
  if (!c.isEmailVerified)  return 'unverified';
  if (!c.isApproved)       return 'pending';
  return 'active';
}

export default function CustomersPage() {
  useProtectedRoute();

  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [page, setPage]           = useState(1);
  const [total, setTotal]         = useState(0);
  const [acting, setActing]       = useState<string | null>(null);
  const [stats, setStats]         = useState({ total: 0, newThisMonth: 0, avgLifetimeValue: 0 });
  const [pendingCount, setPendingCount] = useState(0);
  const pageSize = 20;

  // ── filters ───────────────────────────────────────────────────────────────
  const [searchInput, setSearchInput]       = useState('');
  const [searchTerm, setSearchTerm]         = useState('');
  const [statusFilter, setStatusFilter]     = useState<StatusKey>('');
  const [zohoFilter, setZohoFilter]         = useState<ZohoKey>('');
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showZohoMenu, setShowZohoMenu]     = useState(false);
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const zohoMenuRef   = useRef<HTMLDivElement>(null);
  const searchTimer   = useRef<ReturnType<typeof setTimeout> | null>(null);

  // debounce search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => { setSearchTerm(searchInput); setPage(1); }, 350);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [searchInput]);

  // outside-click to close dropdowns
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target as Node)) setShowStatusMenu(false);
      if (zohoMenuRef.current   && !zohoMenuRef.current.contains(e.target as Node))   setShowZohoMenu(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // ── data ──────────────────────────────────────────────────────────────────
  const load = async (p = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(p), pageSize: String(pageSize) });
      if (searchTerm)   params.set('search', searchTerm);
      if (statusFilter) params.set('status', statusFilter);
      if (zohoFilter)   params.set('zoho', zohoFilter);
      const r = await fetch(`${API}/customers?${params}`, { headers: getAuthHeaders() });
      const d = await r.json();
      setCustomers(d.data?.items || []);
      setTotal(d.data?.totalCount || 0);
    } catch { toast.error('Failed to load customers'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(1); setPage(1); }, [searchTerm, statusFilter, zohoFilter]);
  useEffect(() => { load(page); }, [page]);

  useEffect(() => {
    // stats
    fetch(`${API}/customers/stats/overview`, { headers: getAuthHeaders() })
      .then(r => r.json()).then(d => setStats(d.data || {})).catch(() => {});
    // pending count for badge
    fetch(`${API}/customers?page=1&pageSize=1&status=pending`, { headers: getAuthHeaders() })
      .then(r => r.json()).then(d => setPendingCount(d.data?.totalCount || 0)).catch(() => {});
  }, []);

  // ── actions ───────────────────────────────────────────────────────────────
  const act = async (id: string, endpoint: string, msg: string) => {
    setActing(id);
    try {
      const r = await fetch(`${API}/customers/${id}/${endpoint}`, { method: 'POST', headers: getAuthHeaders() });
      const d = await r.json();
      if (d.success) { toast.success(d.message || msg); load(page); }
      else toast.error(d.message || 'Failed');
    } catch { toast.error('Action failed'); }
    setActing(null);
  };

  // ── pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.ceil(total / pageSize);
  const pageNums = (): (number | '...')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 4)              return [1, 2, 3, 4, 5, '...', totalPages];
    if (page >= totalPages - 3) return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '...', page - 1, page, page + 1, '...', totalPages];
  };

  const hasFilters = !!searchInput || !!statusFilter || !!zohoFilter;
  const clearFilters = () => { setSearchInput(''); setSearchTerm(''); setStatusFilter(''); setZohoFilter(''); };

  const activeStatusCfg = statusFilter ? STATUS_CONFIG[statusFilter] : null;

  return (
    <div className="page-content">
      <div className="container-fluid">

        {/* ── Zone 1: Header ── */}
        <div className="flex items-center justify-between my-[1.5rem]">
          <div>
            <p className="font-bold text-[1.1rem] text-defaulttextcolor mb-0">Customers</p>
            <p className="text-[0.78rem] text-[#8c9097] mt-0.5">
              {total > 0 ? `${total.toLocaleString()} customers` : 'Manage all customers and their accounts'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/customers/approvals">
              <button className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg border border-[#d97706] text-[#d97706] hover:bg-[#d97706]/5 transition-colors">
                <i className="ri-shield-check-line"/>
                Pending Approvals
                {pendingCount > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center text-white"
                    style={{ background: '#d97706' }}>
                    {pendingCount > 99 ? '99+' : pendingCount}
                  </span>
                )}
              </button>
            </Link>
            <Link href="/customers/create">
              <button className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg text-white"
                style={{ background: 'linear-gradient(135deg, #C8A86B 0%, #a8863d 100%)' }}>
                <i className="ri-user-add-line"/> New Customer
              </button>
            </Link>
          </div>
        </div>

        {/* ── Zone 2: Stat cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
          <div className="box p-4 flex items-center gap-4" style={{ borderLeft: '3px solid #0891b2' }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: '#e0f2fe' }}>
              <i className="ri-team-line text-xl" style={{ color: '#0891b2' }}/>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-0.5">Total Customers</p>
              <p className="text-[1.4rem] font-bold text-defaulttextcolor mb-0">
                {(stats.total || total).toLocaleString()}
              </p>
            </div>
          </div>

          <div className="box p-4 flex items-center gap-4" style={{ borderLeft: '3px solid #16a34a' }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: '#dcfce7' }}>
              <i className="ri-user-add-line text-xl" style={{ color: '#16a34a' }}/>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-0.5">New This Month</p>
              <p className="text-[1.4rem] font-bold text-defaulttextcolor mb-0">{stats.newThisMonth || 0}</p>
            </div>
          </div>

          <div className="box p-4 flex items-center gap-4" style={{ borderLeft: '3px solid #C8A86B' }}>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: '#fdf8ee' }}>
              <i className="ri-money-rupee-circle-line text-xl" style={{ color: '#C8A86B' }}/>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#94a3b8] uppercase tracking-wide mb-0.5">Avg Lifetime Value</p>
              <p className="text-[1.4rem] font-bold mb-0" style={{ color: '#C8A86B' }}>
                Rs. {Math.round(stats.avgLifetimeValue || 0).toLocaleString()}
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
                placeholder="Search name, email, phone…"
                className="form-control form-control-sm !pl-9 !pr-8 w-full !rounded-lg"
              />
              {searchInput && (
                <button onClick={() => setSearchInput('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-defaulttextcolor">
                  <i className="ri-close-line text-sm"/>
                </button>
              )}
            </div>

            {/* Status filter */}
            <div className="relative flex-shrink-0" ref={statusMenuRef}>
              <button
                onClick={() => { setShowStatusMenu(v => !v); setShowZohoMenu(false); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors whitespace-nowrap ${
                  statusFilter
                    ? 'border-[#C8A86B] bg-[#C8A86B]/5'
                    : 'border-defaultborder text-defaulttextcolor hover:border-[#C8A86B]'
                }`}
                style={statusFilter && activeStatusCfg ? { color: activeStatusCfg.text } : {}}>
                <i className="ri-user-line text-sm"/>
                {activeStatusCfg ? activeStatusCfg.label : 'All statuses'}
                <i className={`ri-arrow-down-s-line text-sm transition-transform ${showStatusMenu ? 'rotate-180' : ''}`}/>
              </button>
              {showStatusMenu && (
                <div className="absolute left-0 top-full mt-1 w-48 bg-white dark:bg-bodybg border border-defaultborder rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="p-1">
                    {STATUS_FILTERS.map(s => (
                      <button key={s.value}
                        onClick={() => { setStatusFilter(s.value); setShowStatusMenu(false); }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors flex items-center gap-2 ${
                          statusFilter === s.value ? 'bg-[#C8A86B]/10 font-semibold text-[#C8A86B]' : 'hover:bg-[#f8fafc] text-defaulttextcolor'
                        }`}>
                        {s.value && STATUS_CONFIG[s.value] && (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                            style={{ background: STATUS_CONFIG[s.value].bg, color: STATUS_CONFIG[s.value].text }}>
                            {STATUS_CONFIG[s.value].label}
                          </span>
                        )}
                        {!s.value && s.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Zoho filter */}
            <div className="relative flex-shrink-0" ref={zohoMenuRef}>
              <button
                onClick={() => { setShowZohoMenu(v => !v); setShowStatusMenu(false); }}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors whitespace-nowrap ${
                  zohoFilter
                    ? 'border-[#C8A86B] text-[#C8A86B] bg-[#C8A86B]/5'
                    : 'border-defaultborder text-defaulttextcolor hover:border-[#C8A86B]'
                }`}>
                <i className="ri-links-line text-sm"/>
                {zohoFilter === 'linked' ? 'Zoho Linked' : zohoFilter === 'notlinked' ? 'Not Linked' : 'All Zoho'}
                <i className={`ri-arrow-down-s-line text-sm transition-transform ${showZohoMenu ? 'rotate-180' : ''}`}/>
              </button>
              {showZohoMenu && (
                <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-bodybg border border-defaultborder rounded-xl shadow-xl z-50 overflow-hidden">
                  <div className="p-1">
                    {([
                      { value: '' as ZohoKey,          label: 'All Zoho' },
                      { value: 'linked' as ZohoKey,    label: 'Linked' },
                      { value: 'notlinked' as ZohoKey, label: 'Not Linked' },
                    ]).map(z => (
                      <button key={z.value}
                        onClick={() => { setZohoFilter(z.value); setShowZohoMenu(false); }}
                        className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                          zohoFilter === z.value ? 'bg-[#C8A86B]/10 font-semibold text-[#C8A86B]' : 'hover:bg-[#f8fafc] text-defaulttextcolor'
                        }`}>
                        {z.label}
                      </button>
                    ))}
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
                  <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">Customer</th>
                  <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">Phone</th>
                  <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">Status</th>
                  <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-right">Orders</th>
                  <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-right">Value</th>
                  <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">Joined</th>
                  <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={i}>
                      {[200, 110, 90, 60, 90, 100, 80].map((w, j) => (
                        <td key={j} className="py-3 px-4">
                          <div className="h-4 rounded animate-pulse bg-[#f1f5f9]" style={{ width: w }}/>
                        </td>
                      ))}
                    </tr>
                  ))
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                          style={{ background: '#e0f2fe' }}>
                          <i className="ri-team-line text-2xl" style={{ color: '#0891b2' }}/>
                        </div>
                        <div>
                          <p className="font-semibold text-defaulttextcolor mb-0.5">No customers found</p>
                          <p className="text-[0.78rem] text-[#94a3b8] mb-0">
                            {hasFilters ? 'Try adjusting your filters.' : 'No customers yet.'}
                          </p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : customers.map((c: any) => {
                  const status = customerStatus(c);
                  const scfg   = STATUS_CONFIG[status];
                  const ac     = avatarColor(c.fullName || c.email || '');
                  const ai     = avatarInitials(c.firstName, c.lastName);
                  const isActing = acting === c.id;

                  return (
                    <tr key={c.id} className="group">
                      {/* Customer */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                            style={{ background: ac }}>
                            {ai}
                          </div>
                          <div>
                            <p className="font-semibold text-[0.85rem] text-defaulttextcolor mb-0 leading-tight">{c.fullName}</p>
                            <p className="text-[0.72rem] text-[#94a3b8] mb-0">{c.email}</p>
                            {c.isZohoLinked && (
                              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full mt-0.5 inline-block"
                                style={{ background: '#dcfce7', color: '#16a34a' }}>
                                Zoho Linked
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-3 px-4">
                        <span className="text-[0.8rem] text-defaulttextcolor">
                          {c.phoneNumber || <span className="text-[#cbd5e1]">—</span>}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4">
                        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                          style={{ background: scfg.bg, color: scfg.text }}>
                          {scfg.label}
                        </span>
                      </td>

                      {/* Orders */}
                      <td className="py-3 px-4 text-right">
                        <span className={`text-[0.85rem] font-semibold ${c.totalOrders > 0 ? '' : 'text-[#94a3b8]'}`}
                          style={c.totalOrders > 0 ? { color: '#C8A86B' } : {}}>
                          {c.totalOrders}
                        </span>
                      </td>

                      {/* Value */}
                      <td className="py-3 px-4 text-right">
                        <span className="text-[0.85rem] font-bold whitespace-nowrap"
                          style={{ color: (c.lifetimeValue || 0) > 0 ? '#C8A86B' : '#cbd5e1' }}>
                          Rs. {(c.lifetimeValue || 0).toLocaleString()}
                        </span>
                      </td>

                      {/* Joined */}
                      <td className="py-3 px-4">
                        <p className="text-[0.8rem] font-medium text-defaulttextcolor mb-0">
                          {new Date(c.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        <p className="text-[0.72rem] text-[#94a3b8] mb-0">{relativeTime(c.createdAt)}</p>
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          {/* View */}
                          <Link href={`/customers/${c.id}`}>
                            <button title="View customer"
                              className="w-8 h-8 rounded-lg flex items-center justify-center border border-defaultborder text-[#64748b] hover:border-[#C8A86B] hover:text-[#C8A86B] transition-colors">
                              <i className="ri-eye-line text-sm"/>
                            </button>
                          </Link>

                          {/* Approve */}
                          {!c.isApproved && c.isEmailVerified && c.isActive && (
                            <button title="Approve" disabled={isActing}
                              onClick={() => act(c.id, 'approve', 'Approved!')}
                              className="w-8 h-8 rounded-lg flex items-center justify-center border transition-colors disabled:opacity-50"
                              style={{ background: '#dcfce7', borderColor: '#bbf7d0', color: '#16a34a' }}>
                              <i className="ri-check-line text-sm"/>
                            </button>
                          )}

                          {/* Suspend / Activate */}
                          {c.isActive ? (
                            <button title="Suspend" disabled={isActing}
                              onClick={() => act(c.id, 'suspend', 'Customer suspended')}
                              className="w-8 h-8 rounded-lg flex items-center justify-center border transition-colors disabled:opacity-50"
                              style={{ background: '#fee2e2', borderColor: '#fecaca', color: '#dc2626' }}>
                              <i className={`${isActing ? 'ri-loader-4-line animate-spin' : 'ri-pause-circle-line'} text-sm`}/>
                            </button>
                          ) : (
                            <button title="Activate" disabled={isActing}
                              onClick={() => act(c.id, 'activate', 'Customer activated!')}
                              className="w-8 h-8 rounded-lg flex items-center justify-center border transition-colors disabled:opacity-50"
                              style={{ background: '#dcfce7', borderColor: '#bbf7d0', color: '#16a34a' }}>
                              <i className={`${isActing ? 'ri-loader-4-line animate-spin' : 'ri-play-circle-line'} text-sm`}/>
                            </button>
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
        {!loading && total > 0 && (
          <div className="box mt-3">
            <div className="box-body flex items-center justify-between flex-wrap gap-4">
              <p className="text-[0.78rem] text-[#8c9097] mb-0">
                Showing{' '}
                <span className="font-semibold text-defaulttextcolor">
                  {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}
                </span>{' '}
                of <span className="font-semibold text-defaulttextcolor">{total.toLocaleString()}</span> customers
                {statusFilter && activeStatusCfg && (
                  <> · <span className="font-semibold" style={{ color: activeStatusCfg.text }}>{activeStatusCfg.label}</span></>
                )}
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
      </div>
    </div>
  );
}
