'use client'
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { getAuthHeaders } from '@/shared/services/apiConfig';
import toast from 'react-hot-toast';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://hbc-api.semis.app/api';

// ── helpers ──────────────────────────────────────────────────────────────────
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

type TabKey = 'today' | 'overdue' | 'scheduled' | 'unscheduled';

const TABS: { key: TabKey; label: string; color: string; emptyIcon: string; emptyMsg: string; emptySubMsg: string; pulse?: boolean }[] = [
  { key: 'today',       label: 'Due Today',   color: '#16a34a', emptyIcon: 'ri-checkbox-circle-line',  emptyMsg: 'No collections due today',       emptySubMsg: 'Check back tomorrow or view scheduled collections.' },
  { key: 'overdue',     label: 'Overdue',      color: '#dc2626', emptyIcon: 'ri-shield-check-line',      emptyMsg: 'No overdue collections',          emptySubMsg: 'Great — all collections are on schedule.', pulse: true },
  { key: 'scheduled',   label: 'Scheduled',    color: '#7c3aed', emptyIcon: 'ri-calendar-check-line',   emptyMsg: 'No upcoming collections',         emptySubMsg: 'No completed targets have a collection date set.' },
  { key: 'unscheduled', label: 'No Date Set',  color: '#d97706', emptyIcon: 'ri-calendar-line',         emptyMsg: 'All targets are scheduled',       emptySubMsg: 'Every completed target has a collection date set.' },
];

function filterItems(raw: any[], tabKey: TabKey, todayStr: string): any[] {
  if (tabKey === 'today')
    return raw.filter((t: any) => t.collectionDate?.startsWith(todayStr));
  if (tabKey === 'overdue')
    return raw.filter((t: any) =>
      t.collectionDate &&
      !t.collectionDate.startsWith(todayStr) &&
      new Date(t.collectionDate) < new Date() &&
      t.status !== 'Delivered'
    );
  if (tabKey === 'scheduled')
    return raw.filter((t: any) => t.collectionDate && t.status === 'Completed');
  // unscheduled
  return raw.filter((t: any) => !t.collectionDate && (t.status === 'Completed' || t.status === 'Active'));
}

const PAGE_SIZE = 20;

export default function CollectionsPage() {
  useProtectedRoute();

  const [tab, setTab]           = useState<TabKey>('today');
  const [allItems, setAllItems] = useState<any[]>([]);
  const [page, setPage]         = useState(1);
  const [loading, setLoading]   = useState(true);
  const [tabCounts, setTabCounts] = useState<Partial<Record<TabKey, number>>>({});
  const [confirming, setConfirming]     = useState<any>(null);
  const [deliverNotes, setDeliverNotes] = useState('');
  const [submitting, setSubmitting]     = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  // ── data loading ──────────────────────────────────────────────────────────
  const buildQuery = (tabKey: TabKey, ps = '500') => {
    const q = new URLSearchParams({ pageNumber: '1', pageSize: ps });
    if (tabKey === 'today')       q.set('collectionDate', todayStr);
    else if (tabKey === 'overdue')   q.set('overdueOnly', 'true');
    else if (tabKey === 'scheduled') q.set('status', 'Completed');
    else                             q.set('noDate', 'true');
    return q;
  };

  const loadTab = async (activeTab: TabKey) => {
    setLoading(true);
    try {
      const r = await fetch(`${API}/targets?${buildQuery(activeTab)}`, { headers: getAuthHeaders() });
      const d = await r.json();
      const raw = d.data?.items || d.data || [];
      setAllItems(filterItems(raw, activeTab, todayStr));
    } finally {
      setLoading(false);
    }
  };

  const fetchCounts = async () => {
    const entries = await Promise.all(
      TABS.map(async (t) => {
        try {
          const r = await fetch(`${API}/targets?${buildQuery(t.key)}`, { headers: getAuthHeaders() });
          const d = await r.json();
          const raw = d.data?.items || d.data || [];
          return [t.key, filterItems(raw, t.key, todayStr).length] as [TabKey, number];
        } catch { return [t.key, 0] as [TabKey, number]; }
      })
    );
    setTabCounts(Object.fromEntries(entries));
  };

  useEffect(() => { setPage(1); loadTab(tab); }, [tab]);
  useEffect(() => { fetchCounts(); }, []);

  // ── client-side pagination ────────────────────────────────────────────────
  const totalPages = Math.ceil(allItems.length / PAGE_SIZE);
  const pageItems  = allItems.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const pageNums = (): (number | '...')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (page <= 4)             return [1, 2, 3, 4, 5, '...', totalPages];
    if (page >= totalPages - 3) return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '...', page - 1, page, page + 1, '...', totalPages];
  };

  // ── confirm delivery ──────────────────────────────────────────────────────
  const submitDelivery = async () => {
    if (!confirming) return;
    setSubmitting(true);
    try {
      const r = await fetch(`${API}/targets/${confirming.id}/confirm-delivery`, {
        method: 'POST',
        headers: { ...getAuthHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: deliverNotes }),
      });
      const d = await r.json();
      if (d.success) {
        toast.success('Delivery confirmed!');
        setConfirming(null);
        setDeliverNotes('');
        loadTab(tab);
        fetchCounts();
      } else toast.error(d.message || 'Failed');
    } catch { toast.error('Failed to confirm delivery'); }
    finally   { setSubmitting(false); }
  };

  // ── date label helpers ────────────────────────────────────────────────────
  const daysOverdue = (dateStr: string) =>
    Math.floor((Date.now() - new Date(dateStr).getTime()) / 86_400_000);

  const daysUntil = (dateStr: string) =>
    Math.ceil((new Date(dateStr).getTime() - Date.now()) / 86_400_000);

  const fmtDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  // ── row accent ────────────────────────────────────────────────────────────
  const rowStyle = (): React.CSSProperties => {
    const borders: Record<TabKey, string> = {
      today: '#16a34a', overdue: '#dc2626', scheduled: '#7c3aed', unscheduled: '#d97706',
    };
    const style: React.CSSProperties = { borderLeft: `3px solid ${borders[tab]}` };
    if (tab === 'overdue') style.background = '#fff5f5';
    return style;
  };

  const activeTab = TABS.find(t => t.key === tab)!;

  return (
    <div className="page-content">
      <div className="container-fluid">

        {/* ── Zone 1: Header ── */}
        <div className="flex items-center justify-between my-[1.5rem]">
          <div>
            <p className="font-bold text-[1.1rem] text-defaulttextcolor mb-0">Collections</p>
            <p className="text-[0.78rem] text-[#8c9097] mt-0.5">
              {!loading && allItems.length > 0
                ? `${allItems.length} target${allItems.length !== 1 ? 's' : ''} · ${activeTab.label.toLowerCase()}`
                : 'Manage silver collection and delivery scheduling'}
            </p>
          </div>
          <button
            onClick={() => { loadTab(tab); fetchCounts(); }}
            className="w-9 h-9 rounded-lg border border-defaultborder flex items-center justify-center text-[#64748b] hover:border-[#C8A86B] hover:text-[#C8A86B] transition-colors">
            <i className="ri-refresh-line text-sm"/>
          </button>
        </div>

        {/* ── Zone 2: Tab bar ── */}
        <div className="flex items-center gap-1 flex-wrap border-b border-defaultborder mb-5 pb-0">
          {TABS.map(t => {
            const isActive = tab === t.key;
            const count = tabCounts[t.key];
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-[0.8rem] font-medium transition-colors rounded-t-lg border-b-2 -mb-px ${
                  isActive ? '' : 'border-transparent text-[#94a3b8] hover:text-defaulttextcolor'
                }`}
                style={isActive ? { borderBottomColor: t.color, color: t.color } : {}}>

                {/* Pulse dot for Overdue */}
                {t.pulse && (
                  <span className="relative flex h-2 w-2 flex-shrink-0">
                    {(count ?? 0) > 0 && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                        style={{ background: t.color }}/>
                    )}
                    <span className="relative inline-flex rounded-full h-2 w-2" style={{ background: t.color }}/>
                  </span>
                )}

                {t.label}

                {count !== undefined && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                    style={isActive
                      ? { background: t.color + '20', color: t.color }
                      : { background: '#f1f5f9', color: '#64748b' }}>
                    {count > 99 ? '99+' : count}
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
                  <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">Target</th>
                  <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left" style={{ minWidth: 180 }}>Progress</th>
                  <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">Collection Date</th>
                  <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {[200, 180, 130, 80].map((w, j) => (
                        <td key={j} className="py-3 px-4">
                          <div className="h-4 rounded animate-pulse bg-[#f1f5f9]" style={{ width: w }}/>
                        </td>
                      ))}
                    </tr>
                  ))
                ) : pageItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-16 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                          style={{ background: activeTab.color + '15' }}>
                          <i className={`${activeTab.emptyIcon} text-2xl`} style={{ color: activeTab.color }}/>
                        </div>
                        <div>
                          <p className="font-semibold text-defaulttextcolor mb-0.5">{activeTab.emptyMsg}</p>
                          <p className="text-[0.78rem] text-[#94a3b8] mb-0">{activeTab.emptySubMsg}</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : pageItems.map((t: any) => {
                  const pct  = t.totalGrams > 0 ? Math.round((t.gramsPaid / t.totalGrams) * 100) : 0;
                  const name = t.customerName || 'Unknown';
                  const ac   = avatarColor(name);
                  const ai   = avatarInitials(name);

                  return (
                    <tr key={t.id} style={rowStyle()} className="group">

                      {/* Target + Customer (merged) */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0"
                            style={{ background: ac }}>
                            {ai}
                          </div>
                          <div>
                            <p className="font-mono text-[0.8rem] font-semibold text-defaulttextcolor mb-0">{t.targetNumber}</p>
                            <p className="text-[0.75rem] text-[#64748b] mb-0">{name} · {t.itemName}</p>
                          </div>
                        </div>
                      </td>

                      {/* Grams progress */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="flex-1 h-1.5 rounded-full" style={{ background: '#e2e8f0' }}>
                            <div className="h-1.5 rounded-full transition-all"
                              style={{ width: `${Math.min(pct, 100)}%`, background: activeTab.color }}/>
                          </div>
                          <span className="text-[11px] font-bold font-mono w-9 text-right flex-shrink-0"
                            style={{ color: activeTab.color }}>
                            {pct}%
                          </span>
                        </div>
                        <p className="text-[10px] font-mono text-[#94a3b8] mb-0">
                          {Number(t.gramsPaid).toFixed(3)}g / {Number(t.totalGrams).toFixed(3)}g
                        </p>
                      </td>

                      {/* Collection date — smart label per tab */}
                      <td className="py-3 px-4">
                        {tab === 'today' && (
                          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                            style={{ background: '#dcfce7', color: '#16a34a' }}>
                            Due Today
                          </span>
                        )}
                        {tab === 'overdue' && t.collectionDate && (
                          <div>
                            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                              style={{ background: '#fee2e2', color: '#dc2626' }}>
                              Overdue {daysOverdue(t.collectionDate)}d
                            </span>
                            <p className="text-[10px] text-[#94a3b8] mt-1 mb-0">{fmtDate(t.collectionDate)}</p>
                          </div>
                        )}
                        {tab === 'scheduled' && t.collectionDate && (() => {
                          const n = daysUntil(t.collectionDate);
                          return (
                            <div>
                              <p className="text-[0.8rem] font-semibold text-defaulttextcolor mb-0">{fmtDate(t.collectionDate)}</p>
                              <p className="text-[11px] mb-0" style={{ color: '#7c3aed' }}>
                                {n <= 0 ? 'Today' : `In ${n} day${n !== 1 ? 's' : ''}`}
                              </p>
                            </div>
                          );
                        })()}
                        {tab === 'unscheduled' && (
                          <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                            style={{ background: '#fef3c7', color: '#d97706' }}>
                            Not scheduled
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          <Link href={`/targets/${t.id}`}>
                            <button title="View target"
                              className="w-8 h-8 rounded-lg flex items-center justify-center border border-defaultborder text-[#64748b] hover:border-[#C8A86B] hover:text-[#C8A86B] transition-colors">
                              <i className="ri-eye-line text-sm"/>
                            </button>
                          </Link>
                          {t.status !== 'Delivered' && tab !== 'unscheduled' && (
                            <button title="Confirm delivery"
                              onClick={() => { setConfirming(t); setDeliverNotes(''); }}
                              className="w-8 h-8 rounded-lg flex items-center justify-center border transition-colors"
                              style={{
                                background: activeTab.color + '15',
                                borderColor: activeTab.color + '50',
                                color: activeTab.color,
                              }}>
                              <i className="ri-checkbox-circle-line text-sm"/>
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
        {!loading && allItems.length > 0 && (
          <div className="box mt-3">
            <div className="box-body flex items-center justify-between flex-wrap gap-4">
              <p className="text-[0.78rem] text-[#8c9097] mb-0">
                Showing{' '}
                <span className="font-semibold text-defaulttextcolor">
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, allItems.length)}
                </span>{' '}
                of <span className="font-semibold text-defaulttextcolor">{allItems.length}</span> targets
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
                              ? 'text-black border-[#C8A86B]'
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

      {/* ── Confirm Delivery Modal ── */}
      {confirming && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-bodybg rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: '#dcfce7' }}>
                <i className="ri-checkbox-circle-line text-lg" style={{ color: '#16a34a' }}/>
              </div>
              <div>
                <h3 className="text-[1rem] font-bold text-defaulttextcolor mb-0">Confirm Delivery</h3>
                <p className="text-[0.75rem] text-[#94a3b8]">Moves to customer's physical vault</p>
              </div>
            </div>
            <div className="rounded-xl p-3 mb-4" style={{ background: '#f0fdf4' }}>
              <p className="font-semibold text-[0.85rem] mb-0.5 text-[#15803d]">
                {confirming.targetNumber} · {confirming.itemName}
              </p>
              <p className="text-[0.78rem] text-[#166534] mb-0">
                {confirming.customerName} · {confirming.gramsPaid}g · NPR {(confirming.totalPaid || 0).toLocaleString()}
              </p>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-defaulttextcolor mb-1.5">Notes (optional)</label>
              <textarea className="form-control !rounded-xl" rows={2}
                placeholder="e.g. Customer collected in person, ID verified"
                value={deliverNotes} onChange={e => setDeliverNotes(e.target.value)}/>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => { setConfirming(null); setDeliverNotes(''); }}
                disabled={submitting}
                className="ti-btn ti-btn-light !rounded-xl">
                Cancel
              </button>
              <button onClick={submitDelivery} disabled={submitting}
                className="ti-btn !rounded-xl !text-white font-semibold"
                style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)' }}>
                {submitting
                  ? <><i className="ri-loader-4-line animate-spin mr-1"/>Confirming…</>
                  : <><i className="ri-checkbox-circle-line mr-1"/>Confirm Delivery</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
