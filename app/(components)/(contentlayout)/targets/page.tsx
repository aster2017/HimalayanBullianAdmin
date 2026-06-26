'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL;

// ── Constants ─────────────────────────────────────────────────────────────────

const TABS = [
  { label: 'All',       value: '',          color: '#64748b' },
  { label: 'Active',    value: 'Active',    color: '#2563eb' },
  { label: 'Completed', value: 'Completed', color: '#16a34a' },
  { label: 'Vault',     value: 'Delivered', color: '#7c3aed' },
  { label: 'Cancelled', value: 'Cancelled', color: '#dc2626' },
] as const;

const DATE_PRESETS = [
  { label: 'Today',      value: 'today' },
  { label: 'Yesterday',  value: 'yesterday' },
  { label: 'This week',  value: 'week' },
  { label: 'This month', value: 'month' },
  { label: 'Last month', value: 'last_month' },
] as const;

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString('en-NP');

function toISODate(d: Date) { return d.toISOString().split('T')[0]; }

function presetToDates(p: string): { dateFrom: string; dateTo: string } | null {
  const now = new Date();
  if (p === 'today')     { const s = toISODate(now); return { dateFrom: s, dateTo: s }; }
  if (p === 'yesterday') { const y = new Date(now); y.setDate(y.getDate()-1); const s = toISODate(y); return { dateFrom: s, dateTo: s }; }
  if (p === 'week')      { const s = new Date(now); s.setDate(now.getDate()-now.getDay()); return { dateFrom: toISODate(s), dateTo: toISODate(now) }; }
  if (p === 'month')     { return { dateFrom: toISODate(new Date(now.getFullYear(), now.getMonth(), 1)), dateTo: toISODate(now) }; }
  if (p === 'last_month'){ const s=new Date(now.getFullYear(),now.getMonth()-1,1); const e=new Date(now.getFullYear(),now.getMonth(),0); return { dateFrom: toISODate(s), dateTo: toISODate(e) }; }
  return null;
}

function progressColor(status: string, pct: number): string {
  if (status === 'Cancelled')  return '#94a3b8';
  if (status === 'Delivered')  return '#7c3aed';
  if (pct >= 100)              return '#16a34a';
  if (pct >= 75)               return '#d97706';
  return '#2563eb';
}

function statusStyle(s: string): { bg: string; text: string } {
  switch (s) {
    case 'Active':    return { bg: '#dbeafe', text: '#2563eb' };
    case 'Completed': return { bg: '#dcfce7', text: '#16a34a' };
    case 'Delivered': return { bg: '#ede9fe', text: '#7c3aed' };
    case 'Cancelled': return { bg: '#fee2e2', text: '#dc2626' };
    default:          return { bg: '#f1f5f9', text: '#64748b' };
  }
}

function rowAccent(t: any): React.CSSProperties {
  if (t.status === 'Cancelled') return { borderLeft: '3px solid #94a3b8', opacity: 0.75 };
  if (t.status === 'Delivered') return { borderLeft: '3px solid #7c3aed' };
  if (t.status === 'Completed') return { borderLeft: '3px solid #C8A86B' };
  // Active: flag near-completion
  const pct = t.totalGrams > 0 ? (t.gramsPaid / t.totalGrams) * 100 : 0;
  if (pct >= 75) return { borderLeft: '3px solid #d97706' };
  return { borderLeft: '3px solid transparent' };
}

function avatarColor(name: string): string {
  const colors = ['#2563eb','#7c3aed','#db2777','#ea580c','#16a34a','#0891b2','#d97706','#dc2626'];
  let h = 0; for (let i=0; i<name.length; i++) h = name.charCodeAt(i)+((h<<5)-h);
  return colors[Math.abs(h) % colors.length];
}
function initials(name: string): string {
  const p = name.trim().split(/\s+/);
  return p.length >= 2 ? (p[0][0]+p[p.length-1][0]).toUpperCase() : name.slice(0,2).toUpperCase();
}

function collectionLabel(t: any): { text: string; color: string } | null {
  if (t.status === 'Delivered' && t.deliveredAt) {
    return { text: new Date(t.deliveredAt).toLocaleDateString('en-NP', { day:'numeric', month:'short', year:'numeric' }), color: '#7c3aed' };
  }
  if (!t.collectionDate) return null;
  const due = new Date(t.collectionDate);
  const now = new Date(); now.setHours(0,0,0,0);
  const diff = Math.ceil((due.getTime() - now.getTime()) / 86400000);
  if (diff < 0)  return { text: `Overdue ${Math.abs(diff)}d`, color: '#dc2626' };
  if (diff === 0) return { text: 'Due today', color: '#d97706' };
  return { text: due.toLocaleDateString('en-NP', { day:'numeric', month:'short' }), color: '#64748b' };
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <tr className="border-b border-defaultborder/50 animate-pulse">
      <td className="py-3 px-4"><div className="h-4 w-28 bg-gray-200 rounded mb-1"/><div className="h-3 w-16 bg-gray-100 rounded"/></td>
      <td className="py-3 px-4"><div className="flex items-center gap-2"><div className="w-8 h-8 rounded-full bg-gray-200"/><div className="h-4 w-28 bg-gray-200 rounded"/></div></td>
      <td className="py-3 px-4"><div className="h-4 w-24 bg-gray-200 rounded"/></td>
      <td className="py-3 px-4"><div className="h-2 w-full bg-gray-200 rounded-full mb-1.5"/><div className="h-3 w-20 bg-gray-100 rounded"/></td>
      <td className="py-3 px-4"><div className="h-5 w-20 bg-gray-200 rounded-full"/></td>
      <td className="py-3 px-4"><div className="h-4 w-20 bg-gray-200 rounded"/></td>
      <td className="py-3 px-4"><div className="flex gap-1"><div className="h-7 w-7 bg-gray-200 rounded-lg"/><div className="h-7 w-7 bg-gray-200 rounded-lg"/></div></td>
    </tr>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function TargetsPage() {
  useProtectedRoute();

  const [activeTab, setActiveTab] = useState('');
  const [targets, setTargets]     = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage]           = useState(1);
  const [total, setTotal]         = useState(0);
  const [tabCounts, setTabCounts] = useState<Record<string,number>>({});

  // Item filter
  const [items, setItems]         = useState<any[]>([]);
  const [selectedItem, setSelectedItem] = useState('');

  // Date filter
  const [datePreset, setDatePreset] = useState('');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo]     = useState('');
  const [showDateMenu, setShowDateMenu] = useState(false);
  const [showItemMenu, setShowItemMenu] = useState(false);
  const dateMenuRef = useRef<HTMLDivElement>(null);
  const itemMenuRef = useRef<HTMLDivElement>(null);

  // Deliver modal
  const [delivering, setDelivering]   = useState<any|null>(null);
  const [deliverNotes, setDeliverNotes] = useState('');
  const [deliverSaving, setDeliverSaving] = useState(false);

  // Buyback modal
  const [buybackTarget, setBuybackTarget] = useState<any|null>(null);
  const [bbGrams, setBbGrams]   = useState('');
  const [bbRate, setBbRate]     = useState('');
  const [bbMethod, setBbMethod] = useState('Cash');
  const [bbNotes, setBbNotes]   = useState('');
  const [bbSaving, setBbSaving] = useState(false);
  const [currentRate, setCurrentRate] = useState(0);

  const pageSize = 20;
  const debounceRef = useRef<ReturnType<typeof setTimeout>|null>(null);

  // ── Outside click for dropdowns ──────────────────────────────────────────
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dateMenuRef.current && !dateMenuRef.current.contains(e.target as Node)) setShowDateMenu(false);
      if (itemMenuRef.current && !itemMenuRef.current.contains(e.target as Node)) setShowItemMenu(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // ── Resolve date range ────────────────────────────────────────────────────
  const activeDates = (preset: string, from: string, to: string) => {
    if (preset === 'custom') return { dateFrom: from||undefined, dateTo: to||undefined };
    if (preset) { const d = presetToDates(preset); return d ? { dateFrom: d.dateFrom, dateTo: d.dateTo } : {}; }
    return {};
  };

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const load = async (p=1, tab=activeTab, search=searchInput, itemVal=selectedItem, preset=datePreset, from=customFrom, to=customTo) => {
    setLoading(true);
    const q = new URLSearchParams({ pageNumber: String(p), pageSize: String(pageSize) });
    if (search.trim()) q.set('search', search.trim());
    if (tab) q.set('status', tab);
    if (itemVal) q.set('itemId', itemVal);
    const { dateFrom, dateTo } = activeDates(preset, from, to);
    if (dateFrom) q.set('dateFrom', dateFrom);
    if (dateTo) q.set('dateTo', dateTo);
    try {
      const r = await fetch(`${API}/targets?${q}`, { headers: getAuthHeaders() });
      const d = await r.json();
      setTargets(d.data?.items || []);
      setTotal(d.data?.totalCount || 0);
    } catch { toast.error('Failed to load targets'); }
    setPage(p);
    setLoading(false);
  };

  // ── Initial load ──────────────────────────────────────────────────────────
  useEffect(() => {
    load();
    // Fetch silver rate for buyback modal
    fetch(`${API}/rates/silver`).then(r=>r.json()).then(d=>setCurrentRate(d.buybackRatePerGram||0)).catch(()=>{});
    // Fetch items for dropdown
    fetch(`${API}/targets/products`, { headers: getAuthHeaders() }).then(r=>r.json()).then(d=>setItems(d.data||[])).catch(()=>{});
    // Fetch per-status counts
    const statuses = TABS.slice(1).map(t => t.value);
    Promise.allSettled(statuses.map(s =>
      fetch(`${API}/targets?pageNumber=1&pageSize=1&status=${s}`, { headers: getAuthHeaders() })
        .then(r=>r.json()).then(d=>({ s, count: d.data?.totalCount||0 }))
    )).then(results => {
      const counts: Record<string,number> = {};
      results.forEach(r => { if (r.status==='fulfilled') counts[r.value.s] = r.value.count; });
      setTabCounts(counts);
    });
  }, []);

  // ── Debounced search ──────────────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => load(1, activeTab, searchInput, selectedItem, datePreset, customFrom, customTo), 350);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchInput]);

  const switchTab = (val: string) => { setActiveTab(val); load(1, val, searchInput, selectedItem, datePreset, customFrom, customTo); };
  const applyItem = (val: string) => { setSelectedItem(val); load(1, activeTab, searchInput, val, datePreset, customFrom, customTo); };
  const applyPreset = (val: string) => { setDatePreset(val); setShowDateMenu(false); load(1, activeTab, searchInput, selectedItem, val, customFrom, customTo); };
  const applyCustomDate = (from: string, to: string) => { setCustomFrom(from); setCustomTo(to); load(1, activeTab, searchInput, selectedItem, 'custom', from, to); };
  const clearFilters = () => { setSearchInput(''); setSelectedItem(''); setDatePreset(''); setCustomFrom(''); setCustomTo(''); load(1, activeTab, '', '', '', '', ''); };

  const hasFilters = searchInput.trim() || selectedItem || datePreset;
  const totalPages = Math.ceil(total / pageSize);

  const activeDateLabel = () => {
    if (!datePreset) return 'All dates';
    if (datePreset==='custom' && (customFrom||customTo)) return [customFrom,customTo].filter(Boolean).join(' → ');
    return DATE_PRESETS.find(p=>p.value===datePreset)?.label||'All dates';
  };

  const activeItemLabel = () => {
    if (!selectedItem) return 'All items';
    return items.find((it:any) => it.id === selectedItem)?.name || 'All items';
  };

  // ── Deliver ───────────────────────────────────────────────────────────────
  const confirmDeliver = async () => {
    if (!delivering) return;
    setDeliverSaving(true);
    try {
      const r = await fetch(`${API}/targets/${delivering.id}/confirm-delivery`, {
        method: 'POST', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId: delivering.id, notes: deliverNotes }),
      });
      const d = await r.json();
      if (r.ok && d.success) {
        toast.success(`${delivering.targetNumber} marked as Delivered → moved to Vault`);
        setDelivering(null);
        load(page);
      } else { toast.error(d.message || 'Failed to confirm delivery'); }
    } catch { toast.error('Failed to confirm delivery'); }
    setDeliverSaving(false);
  };

  // ── Buyback ───────────────────────────────────────────────────────────────
  const bbEligible = (t: any) => Math.max(0, (t?.gramsPaid||0) - (t?.gramsReturnedTotal||0));
  const bbPayout = () => ((parseFloat(bbGrams)||0) * (parseFloat(bbRate)||0)).toFixed(2);

  const submitBuyback = async () => {
    if (!buybackTarget) return;
    if (!bbGrams || parseFloat(bbGrams)<=0) { toast.error('Enter grams returned'); return; }
    if (!bbRate || parseFloat(bbRate)<=0) { toast.error('Enter buyback rate'); return; }
    const eligible = bbEligible(buybackTarget);
    if (parseFloat(bbGrams) > eligible) { toast.error(`Cannot exceed ${eligible.toFixed(3)}g eligible`); return; }
    setBbSaving(true);
    try {
      const r = await fetch(`${API}/targets/buybacks`, {
        method: 'POST', headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: buybackTarget.customerId, targetId: buybackTarget.id,
          gramsReturned: parseFloat(bbGrams), buybackRatePerGram: parseFloat(bbRate),
          paymentMethod: bbMethod, notes: bbNotes }),
      });
      const d = await r.json();
      if (r.ok && d.success) {
        const rem = d.data?.gramsEligibleRemaining ?? 0;
        toast.success(`Buyback logged — NPR ${parseFloat(bbPayout()).toLocaleString()} payout · ${rem.toFixed(3)}g remaining`);
        setTargets(prev => prev.map(t => t.id===buybackTarget.id
          ? { ...t, gramsReturnedTotal: (t.gramsReturnedTotal||0)+parseFloat(bbGrams) } : t));
        setBuybackTarget(null);
      } else { toast.error(d.message || 'Failed to log buyback'); }
    } catch { toast.error('Failed to log buyback'); }
    setBbSaving(false);
  };

  // ── Pagination numbers ────────────────────────────────────────────────────
  const pageNums = (): (number|'...')[] => {
    if (totalPages<=7) return Array.from({length:totalPages},(_,i)=>i+1);
    const nums: (number|'...')[] = [1];
    if (page>3) nums.push('...');
    for (let i=Math.max(2,page-1); i<=Math.min(totalPages-1,page+1); i++) nums.push(i);
    if (page<totalPages-2) nums.push('...');
    nums.push(totalPages);
    return nums;
  };

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="my-[1.5rem] space-y-5">

      {/* ── Zone 1: Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-[1.1rem] text-defaulttextcolor mb-0">Targets</p>
          <p className="text-[0.78rem] text-[#8c9097] mt-0.5">
            {total > 0 ? `${total.toLocaleString()} layaway plans` : 'Manage customer silver saving plans'}
          </p>
        </div>
        <Link href="/targets/collections">
          <button className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg border border-[#d97706] text-[#d97706] hover:bg-[#d97706]/5 transition-colors">
            <i className="ri-calendar-check-line"/> Collections Due
          </button>
        </Link>
      </div>

      {/* ── Zone 2: Filter bar ── */}
      <div className="box p-3">
        <div className="flex items-center gap-2 flex-nowrap">

          {/* Search — grows to fill available space */}
          <div className="relative flex-1 min-w-0">
            <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] text-sm pointer-events-none"/>
            <input
              type="text" value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              placeholder="Search target #, customer, item…"
              className="form-control form-control-sm !pl-9 !pr-8 w-full !rounded-lg"
            />
            {searchInput && (
              <button onClick={() => setSearchInput('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-defaulttextcolor">
                <i className="ri-close-line text-sm"/>
              </button>
            )}
          </div>

          {/* Item filter — button dropdown, same style as date */}
          <div className="relative flex-shrink-0" ref={itemMenuRef}>
            <button
              onClick={() => { setShowItemMenu(v => !v); setShowDateMenu(false); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors whitespace-nowrap ${
                selectedItem
                  ? 'border-[#C8A86B] text-[#C8A86B] bg-[#C8A86B]/5'
                  : 'border-defaultborder text-defaulttextcolor hover:border-[#C8A86B]'
              }`}>
              <i className="ri-scales-3-line text-sm"/>
              {activeItemLabel()}
              <i className={`ri-arrow-down-s-line text-sm transition-transform ${showItemMenu ? 'rotate-180' : ''}`}/>
            </button>
            {showItemMenu && (
              <div className="absolute left-0 top-full mt-1 w-56 bg-white dark:bg-bodybg border border-defaultborder rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="p-1">
                  <button
                    onClick={() => { applyItem(''); setShowItemMenu(false); }}
                    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                      !selectedItem ? 'bg-[#C8A86B]/10 font-semibold text-[#C8A86B]' : 'hover:bg-[#f8fafc] text-defaulttextcolor'
                    }`}>
                    All items
                  </button>
                  {items.map((it: any) => (
                    <button key={it.id}
                      onClick={() => { applyItem(it.id); setShowItemMenu(false); }}
                      className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${
                        selectedItem === it.id ? 'bg-[#C8A86B]/10 font-semibold text-[#C8A86B]' : 'hover:bg-[#f8fafc] text-defaulttextcolor'
                      }`}>
                      {it.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Date filter */}
          <div className="relative flex-shrink-0" ref={dateMenuRef}>
            <button
              onClick={() => { setShowDateMenu(v => !v); setShowItemMenu(false); }}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors whitespace-nowrap ${
                datePreset
                  ? 'border-[#C8A86B] text-[#C8A86B] bg-[#C8A86B]/5'
                  : 'border-defaultborder text-defaulttextcolor hover:border-[#C8A86B]'
              }`}>
              <i className="ri-calendar-line text-sm"/>
              {activeDateLabel()}
              <i className={`ri-arrow-down-s-line text-sm transition-transform ${showDateMenu ? 'rotate-180' : ''}`}/>
            </button>
            {showDateMenu && (
              <div className="absolute right-0 top-full mt-1 w-60 bg-white dark:bg-bodybg border border-defaultborder rounded-xl shadow-xl z-50 overflow-hidden">
                <div className="p-1">
                  <button
                    onClick={() => { setDatePreset(''); setCustomFrom(''); setCustomTo(''); setShowDateMenu(false); load(1, activeTab, searchInput, selectedItem, '', '', ''); }}
                    className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors ${!datePreset ? 'bg-[#C8A86B]/10 font-semibold text-[#C8A86B]' : 'hover:bg-[#f8fafc] text-defaulttextcolor'}`}>
                    All dates
                  </button>
                  {DATE_PRESETS.map(p => (
                    <button key={p.value} onClick={() => applyPreset(p.value)}
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
                    <input type="date" value={customFrom}
                      onChange={e => { setCustomFrom(e.target.value); applyCustomDate(e.target.value, customTo); }}
                      className="form-control form-control-sm !rounded-lg flex-1 text-xs"/>
                    <input type="date" value={customTo}
                      onChange={e => { setCustomTo(e.target.value); applyCustomDate(customFrom, e.target.value); }}
                      className="form-control form-control-sm !rounded-lg flex-1 text-xs"/>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Clear — only when a filter is active */}
          {hasFilters && (
            <button onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-1.5 text-sm rounded-lg border border-danger/40 text-danger hover:bg-danger/5 transition-colors flex-shrink-0 whitespace-nowrap">
              <i className="ri-filter-off-line text-sm"/> Clear
            </button>
          )}
        </div>
      </div>

      {/* ── Zone 3: Tab bar ── */}
      <div className="flex items-center gap-1 flex-wrap border-b border-defaultborder pb-0 -mt-2">
        {TABS.map(tab => {
          const isActive = activeTab === tab.value;
          const count = tab.value ? tabCounts[tab.value] : total;
          return (
            <button key={tab.value} onClick={() => switchTab(tab.value)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-[0.8rem] font-medium transition-colors rounded-t-lg border-b-2 -mb-px ${
                isActive ? '' : 'border-transparent text-[#94a3b8] hover:text-defaulttextcolor'
              }`}
              style={isActive ? { borderBottomColor: tab.value ? tab.color : '#C8A86B', color: tab.value ? tab.color : '#C8A86B' } : {}}>
              {tab.value === 'Delivered' && <i className="ri-safe-line text-sm"/>}
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

      {/* ── Table ── */}
      <div className="box">

        <div className="overflow-x-auto">
          <table className="ti-custom-table ti-custom-table-hover text-sm w-full">
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left whitespace-nowrap">Target #</th>
                <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">Customer</th>
                <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">Item</th>
                <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left" style={{minWidth:160}}>Progress</th>
                <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">Status</th>
                <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left whitespace-nowrap">
                  {activeTab==='Delivered' ? 'Delivered On' : 'Collection'}
                </th>
                <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({length:8}).map((_,i)=><SkeletonRow key={i}/>)
              ) : targets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{background:'#f1f5f9'}}>
                        <i className="ri-funds-line text-xl text-[#94a3b8]"/>
                      </div>
                      <div>
                        <p className="font-semibold text-defaulttextcolor text-sm">
                          {hasFilters ? 'No targets match your filters' : activeTab==='Delivered' ? 'No delivered targets yet' : 'No targets found'}
                        </p>
                        {hasFilters && (
                          <button onClick={clearFilters} className="text-xs text-[#C8A86B] hover:underline mt-1">Clear filters</button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : targets.map((t:any) => {
                const pct = t.totalGrams > 0 ? Math.round((t.gramsPaid/t.totalGrams)*100) : 0;
                const barColor = progressColor(t.status, pct);
                const accentStyle = rowAccent(t);
                const custName = t.customerName?.trim() || '—';
                const bg = avatarColor(custName);
                const colLabel = collectionLabel(t);
                const eligible = bbEligible(t);

                return (
                  <tr key={t.id}
                      className="border-b border-defaultborder/50 hover:bg-[#f8fafc] transition-colors group"
                      style={accentStyle}>

                    {/* Target # + Zoho badge */}
                    <td className="py-3 px-4">
                      <Link href={`/targets/${t.id}`}
                        className="font-mono text-[0.8rem] font-semibold hover:underline block"
                        style={{color:'#2563eb'}}>
                        {t.targetNumber}
                      </Link>
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        {t.zohoOrderNumber ? (
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded font-mono"
                            style={{background:'#dcfce7', color:'#16a34a'}}>
                            {t.zohoOrderNumber}
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded"
                            style={{background:'#f1f5f9', color:'#94a3b8'}}>
                            Zoho pending
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                          style={{background: custName==='—' ? '#94a3b8' : bg}}>
                          {custName==='—' ? '?' : initials(custName)}
                        </div>
                        <span className="font-medium text-defaulttextcolor text-[0.82rem]">{custName}</span>
                      </div>
                    </td>

                    {/* Item */}
                    <td className="py-3 px-4 text-[0.82rem] text-defaulttextcolor">
                      {t.itemName}
                      {t.quantity > 1 && (
                        <span className="ml-1 text-[11px] text-[#94a3b8]">×{t.quantity}</span>
                      )}
                    </td>

                    {/* Progress */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="flex-1 h-1.5 rounded-full" style={{background:'#e2e8f0'}}>
                          <div className="h-1.5 rounded-full transition-all"
                            style={{width:`${Math.min(pct,100)}%`, background: barColor}}/>
                        </div>
                        <span className="text-[11px] font-bold font-mono w-9 text-right flex-shrink-0" style={{color: barColor}}>
                          {pct}%
                        </span>
                      </div>
                      <p className="text-[10px] font-mono" style={{color:'#94a3b8'}}>
                        {Number(t.gramsPaid).toFixed(3)}g / {Number(t.totalGrams).toFixed(3)}g
                      </p>
                    </td>

                    {/* Status */}
                    <td className="py-3 px-4">
                      {(() => { const s = statusStyle(t.status); return (
                        <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap"
                          style={{background:s.bg, color:s.text}}>
                          {t.status}
                        </span>
                      ); })()}
                    </td>

                    {/* Collection / Delivered */}
                    <td className="py-3 px-4">
                      {colLabel ? (
                        <span className="text-[0.8rem] font-medium" style={{color:colLabel.color}}>{colLabel.text}</span>
                      ) : (
                        <span className="text-[#cbd5e1] text-sm">—</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        <Link href={`/targets/${t.id}`}>
                          <button title="View" className="w-8 h-8 rounded-lg flex items-center justify-center border border-defaultborder
                                        text-[#64748b] group-hover:border-[#C8A86B] group-hover:text-[#C8A86B] transition-colors">
                            <i className="ri-eye-line text-sm"/>
                          </button>
                        </Link>
                        {t.status === 'Completed' && (
                          <button onClick={()=>{setDelivering(t);setDeliverNotes('');}}
                            title="Mark Delivered"
                            className="w-8 h-8 rounded-lg flex items-center justify-center border transition-colors"
                            style={{background:'#ede9fe', borderColor:'#c4b5fd', color:'#7c3aed'}}>
                            <i className="ri-checkbox-circle-line text-sm"/>
                          </button>
                        )}
                        {t.status === 'Delivered' && eligible > 0 && (
                          <button onClick={()=>{setBuybackTarget(t);setBbGrams('');setBbRate(String(currentRate));setBbMethod('Cash');setBbNotes('');}}
                            title="Log Buyback"
                            className="w-8 h-8 rounded-lg flex items-center justify-center border transition-colors"
                            style={{background:'#fff7ed', borderColor:'#fed7aa', color:'#ea580c'}}>
                            <i className="ri-arrow-go-back-line text-sm"/>
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
        <div className="box">
          <div className="box-body flex items-center justify-between flex-wrap gap-4">
            <p className="text-[0.78rem] text-[#8c9097] mb-0">
              Showing{' '}
              <span className="font-semibold text-defaulttextcolor">
                {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)}
              </span>{' '}
              of <span className="font-semibold text-defaulttextcolor">{total.toLocaleString()}</span> targets
              {activeTab && (
                <> · <span className="font-semibold" style={{ color: TABS.find(t => t.value === activeTab)?.color }}>{activeTab}</span></>
              )}
            </p>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <button onClick={() => load(1)} disabled={page === 1}
                  className="px-2.5 py-1.5 text-[0.78rem] border border-defaultborder rounded-lg text-defaulttextcolor hover:border-[#C8A86B] hover:text-[#C8A86B] disabled:opacity-40 disabled:pointer-events-none transition-colors">«</button>
                <button onClick={() => load(page - 1)} disabled={page === 1}
                  className="px-3 py-1.5 text-[0.78rem] border border-defaultborder rounded-lg text-defaulttextcolor hover:border-[#C8A86B] hover:text-[#C8A86B] disabled:opacity-40 disabled:pointer-events-none transition-colors">‹ Prev</button>
                {pageNums().map((pg, idx) =>
                  pg === '...' ? <span key={idx} className="px-3 py-1.5 text-[0.78rem] text-[#94a3b8]">…</span> : (
                    <button key={idx} onClick={() => load(pg as number)}
                      className={`px-3 py-1.5 text-[0.78rem] border rounded-lg transition-colors font-medium ${
                        page === pg ? 'text-black border-[#C8A86B]' : 'border-defaultborder text-defaulttextcolor hover:border-[#C8A86B] hover:text-[#C8A86B]'
                      }`}
                      style={page === pg ? { background: 'linear-gradient(135deg, #C8A86B 0%, #a8863d 100%)' } : {}}>
                      {pg}
                    </button>
                  )
                )}
                <button onClick={() => load(page + 1)} disabled={page === totalPages}
                  className="px-3 py-1.5 text-[0.78rem] border border-defaultborder rounded-lg text-defaulttextcolor hover:border-[#C8A86B] hover:text-[#C8A86B] disabled:opacity-40 disabled:pointer-events-none transition-colors">Next ›</button>
                <button onClick={() => load(totalPages)} disabled={page === totalPages}
                  className="px-2.5 py-1.5 text-[0.78rem] border border-defaultborder rounded-lg text-defaulttextcolor hover:border-[#C8A86B] hover:text-[#C8A86B] disabled:opacity-40 disabled:pointer-events-none transition-colors">»</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Mark Delivered Modal ── */}
      {delivering && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-bodybg rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:'#ede9fe'}}>
                <i className="ri-safe-line text-lg" style={{color:'#7c3aed'}}/>
              </div>
              <div>
                <h3 className="text-[1rem] font-bold text-defaulttextcolor mb-0">Confirm Delivery</h3>
                <p className="text-[0.75rem] text-[#94a3b8]">Moves to customer's Vault</p>
              </div>
            </div>
            <div className="rounded-xl p-3 mb-4" style={{background:'#ede9fe'}}>
              <p className="font-semibold text-[0.85rem] mb-0.5" style={{color:'#7c3aed'}}>{delivering.targetNumber} · {delivering.itemName}</p>
              <p className="text-[0.78rem]" style={{color:'#6d28d9'}}>{delivering.customerName} · {delivering.gramsPaid}g · NPR {(delivering.totalPaid||0).toLocaleString()}</p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-defaulttextcolor mb-1.5">Notes (optional)</label>
              <textarea className="form-control !rounded-xl" rows={2}
                placeholder="e.g. Customer collected in person, ID verified"
                value={deliverNotes} onChange={e=>setDeliverNotes(e.target.value)}/>
            </div>
            <div className="flex gap-3 justify-end">
              <button onClick={()=>setDelivering(null)} className="ti-btn ti-btn-light !rounded-xl">Cancel</button>
              <button onClick={confirmDeliver} disabled={deliverSaving}
                className="ti-btn !rounded-xl !text-white disabled:opacity-50" style={{background:'#7c3aed'}}>
                {deliverSaving ? <><i className="ri-loader-4-line animate-spin me-1"/>Saving…</> : <><i className="ri-checkbox-circle-line me-1"/>Confirm Delivery</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Log Buyback Modal ── */}
      {buybackTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-bodybg rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:'#fff7ed'}}>
                <i className="ri-arrow-go-back-line text-lg" style={{color:'#ea580c'}}/>
              </div>
              <div>
                <h3 className="text-[1rem] font-bold text-defaulttextcolor mb-0">Log Silver Buyback</h3>
                <p className="text-[0.75rem] text-[#94a3b8]">{buybackTarget.customerName} · {buybackTarget.targetNumber}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <span className="text-[11px] font-semibold px-2 py-1 rounded-md" style={{background:'#ede9fe',color:'#7c3aed'}}>{buybackTarget.gramsPaid}g purchased</span>
              {(buybackTarget.gramsReturnedTotal||0)>0 && (
                <span className="text-[11px] font-semibold px-2 py-1 rounded-md" style={{background:'#fff7ed',color:'#ea580c'}}>{(buybackTarget.gramsReturnedTotal||0).toFixed(3)}g returned</span>
              )}
              <span className="text-[11px] font-semibold px-2 py-1 rounded-md" style={{background:'#dcfce7',color:'#16a34a'}}>{bbEligible(buybackTarget).toFixed(3)}g eligible</span>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-defaulttextcolor mb-1.5">Grams Returned *</label>
                  <input type="number" step="0.001" min="0.001" max={bbEligible(buybackTarget)}
                    className="form-control !rounded-xl" placeholder={`Max: ${bbEligible(buybackTarget).toFixed(3)}g`}
                    value={bbGrams} onChange={e=>setBbGrams(e.target.value)}/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-defaulttextcolor mb-1.5">Rate (NPR/g) *</label>
                  <input type="number" step="0.01" min="1" className="form-control !rounded-xl"
                    value={bbRate} onChange={e=>setBbRate(e.target.value)}/>
                  <p className="text-[11px] text-[#94a3b8] mt-1">Current: NPR {currentRate}/g</p>
                </div>
              </div>
              {bbGrams && bbRate && parseFloat(bbGrams)>0 && parseFloat(bbRate)>0 && (
                <div className="rounded-xl p-3 text-center" style={{background:'#fff7ed', border:'1px solid #fed7aa'}}>
                  <p className="text-[11px] mb-1" style={{color:'#ea580c'}}>Total Payout to Customer</p>
                  <p className="text-2xl font-bold" style={{color:'#ea580c'}}>NPR {parseFloat(bbPayout()).toLocaleString()}</p>
                  <p className="text-[11px] mt-0.5" style={{color:'#d97706'}}>{bbGrams}g × NPR {bbRate}/g</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-defaulttextcolor mb-1.5">Payment Method</label>
                <select className="form-control !rounded-xl" value={bbMethod} onChange={e=>setBbMethod(e.target.value)}>
                  <option value="Cash">Cash</option>
                  <option value="BankTransfer">Bank Transfer</option>
                  <option value="Credit">Store Credit</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-defaulttextcolor mb-1.5">Notes (optional)</label>
                <textarea className="form-control !rounded-xl" rows={2}
                  placeholder="e.g. Customer returned 10g coin, ID verified"
                  value={bbNotes} onChange={e=>setBbNotes(e.target.value)}/>
              </div>
            </div>
            <div className="flex gap-3 justify-end mt-5">
              <button onClick={()=>setBuybackTarget(null)} className="ti-btn ti-btn-light !rounded-xl">Cancel</button>
              <button onClick={submitBuyback} disabled={bbSaving}
                className="ti-btn !rounded-xl !text-white disabled:opacity-50" style={{background:'#ea580c'}}>
                {bbSaving ? <><i className="ri-loader-4-line animate-spin me-1"/>Saving…</> : <><i className="ri-arrow-go-back-line me-1"/>Log Buyback</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
