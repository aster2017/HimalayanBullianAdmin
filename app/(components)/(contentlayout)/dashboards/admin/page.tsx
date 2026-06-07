'use client'

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import apiClient from '@/shared/services/apiClient';

// ── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => n.toLocaleString('en-NP');
const isToday = (d: string) => new Date(d).toDateString() === new Date().toDateString();

const statusStyle = (s: string): { bg: string; text: string } => {
  switch (s?.toLowerCase()) {
    case 'confirmed': case 'paid':    return { bg: '#dcfce7', text: '#16a34a' };
    case 'partial':                   return { bg: '#fef9c3', text: '#ca8a04' };
    case 'cancelled':                 return { bg: '#fee2e2', text: '#dc2626' };
    case 'converted': case 'sent':   return { bg: '#dbeafe', text: '#2563eb' };
    default:                          return { bg: '#f1f5f9', text: '#64748b' };
  }
};

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold tracking-[0.15em] mb-3 mt-1" style={{ color: '#94a3b8', fontFamily: 'monospace' }}>
      {children}
    </p>
  );
}

/** Clickable stat card with hover ring and arrow */
function StatCard({ href, icon, iconBg, iconColor, label, value, suffix }: {
  href: string; icon: string; iconBg: string; iconColor: string;
  label: string; value: string | number; suffix?: string;
}) {
  return (
    <Link href={href}>
      <div className="box p-5 group hover:shadow-lg transition-all duration-200 cursor-pointer relative overflow-hidden"
           style={{ outline: '2px solid transparent', outlineOffset: '2px' }}
           onMouseEnter={e => (e.currentTarget.style.outline = '2px solid #C8A86B44')}
           onMouseLeave={e => (e.currentTarget.style.outline = '2px solid transparent')}>
        <div className="flex items-start justify-between mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
               style={{ background: iconBg }}>
            <i className={`${icon} text-lg`} style={{ color: iconColor }} />
          </div>
          <i className="ri-arrow-right-line text-[#cbd5e1] text-sm group-hover:text-[#C8A86B] transition-colors" />
        </div>
        <p className="text-[0.75rem] text-[#8c9097] mb-0.5">{label}</p>
        <div className="flex items-baseline gap-1">
          <span className="text-[1.6rem] font-bold text-defaulttextcolor leading-none">{value}</span>
          {suffix && <span className="text-xs text-[#8c9097]">{suffix}</span>}
        </div>
      </div>
    </Link>
  );
}

/** Non-clickable status card */
function StatusCard({ icon, iconBg, iconColor, label, children }: {
  icon: string; iconBg: string; iconColor: string; label: string; children: React.ReactNode;
}) {
  return (
    <div className="box p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
             style={{ background: iconBg }}>
          <i className={`${icon} text-lg`} style={{ color: iconColor }} />
        </div>
      </div>
      <p className="text-[0.75rem] text-[#8c9097] mb-1">{label}</p>
      {children}
    </div>
  );
}

/** KPI tile used inside the hero card */
function KpiTile({ icon, iconBg, iconColor, value, label, valueColor }: {
  icon: string; iconBg: string; iconColor: string; value: string | number; label: string; valueColor?: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.06)' }}>
      <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
           style={{ background: iconBg }}>
        <i className={`${icon} text-base`} style={{ color: iconColor }} />
      </div>
      <div>
        <p className="text-[1.1rem] font-bold leading-none" style={{ color: valueColor || '#1e293b' }}>{value}</p>
        <p className="text-[0.68rem] mt-0.5" style={{ color: '#64748b' }}>{label}</p>
      </div>
    </div>
  );
}

/** Progress bar with color coding */
function ProgressBar({ pct }: { pct: number }) {
  const color = pct >= 100 ? '#16a34a' : pct >= 75 ? '#d97706' : '#94a3b8';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full" style={{ background: '#e2e8f0', minWidth: 56 }}>
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
      </div>
      <span className="text-[11px] font-mono w-9 text-right flex-shrink-0" style={{ color }}>
        {pct.toFixed(0)}%
      </span>
    </div>
  );
}

/** Quick action card */
function QuickAction({ href, icon, iconBg, iconColor, label }: {
  href: string; icon: string; iconBg: string; iconColor: string; label: string;
}) {
  return (
    <Link href={href}>
      <div className="group flex flex-col items-center justify-center gap-2 p-4 rounded-xl border border-defaultborder
                      hover:border-[#C8A86B] hover:shadow-sm transition-all duration-150 cursor-pointer text-center">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform"
             style={{ background: iconBg }}>
          <i className={`${icon} text-lg`} style={{ color: iconColor }} />
        </div>
        <span className="text-[0.7rem] font-semibold text-defaulttextcolor leading-tight">{label}</span>
      </div>
    </Link>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <div className="my-[1.5rem] space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-gray-200 rounded" />
      <div className="h-32 bg-gray-200 rounded-xl" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-28 bg-gray-200 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 h-80 bg-gray-200 rounded-xl" />
        <div className="space-y-4">
          <div className="h-64 bg-gray-200 rounded-xl" />
          <div className="h-52 bg-gray-200 rounded-xl" />
        </div>
      </div>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  useProtectedRoute();

  const [counts, setCounts] = useState({ totalOrders: 0, totalCustomers: 0, totalInvoices: 0, totalItems: 0 });
  const [targetStats, setTargetStats] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [zohoStatus, setZohoStatus] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [ordersRes, invoicesRes, customersRes, itemsRes, statsRes] = await Promise.allSettled([
        apiClient.get('/orders', { params: { page: 1, pageSize: 10 } }),
        apiClient.get('/invoices', { params: { page: 1, pageSize: 5 } }),
        apiClient.get('/customers', { params: { page: 1, pageSize: 1 } }),
        apiClient.get('/items', { params: { page: 1, pageSize: 1 } }),
        apiClient.get('/targets/dashboard/stats'),
      ]);
      const orders   = ordersRes.status   === 'fulfilled' ? ordersRes.value.data?.data   : null;
      const invoices = invoicesRes.status === 'fulfilled' ? invoicesRes.value.data?.data : null;
      const customers= customersRes.status=== 'fulfilled' ? customersRes.value.data?.data: null;
      const items    = itemsRes.status    === 'fulfilled' ? itemsRes.value.data?.data    : null;
      const stats    = statsRes.status    === 'fulfilled' ? statsRes.value.data?.data    : null;

      setCounts({
        totalOrders:    orders?.totalCount    || 0,
        totalCustomers: customers?.totalCount || 0,
        totalInvoices:  invoices?.totalCount  || 0,
        totalItems:     items?.totalCount     || 0,
      });
      setTargetStats(stats);
      setRecentOrders((orders?.items || []).slice(0, 8).map((o: any) => ({
        id: o.id, orderNumber: o.orderNumber,
        customerName: o.customerName || 'Unknown',
        amount: o.totalAmount || 0, status: o.status || 'Draft',
        date: new Date(o.orderDate || o.createdAt).toLocaleDateString('en-NP'),
      })));
      setRecentInvoices((invoices?.items || []).slice(0, 5).map((inv: any) => ({
        id: inv.id, invoiceNumber: inv.invoiceNumber,
        amount: inv.totalAmount || 0, status: inv.status || 'Draft',
        date: new Date(inv.invoiceDate).toLocaleDateString('en-NP'),
      })));
      try {
        // Check if Zoho is reachable by hitting the sync logs endpoint
        const zohoRes = await apiClient.get('/sync/logs', { params: { page: 1, pageSize: 1 } });
        setZohoStatus(zohoRes.status === 200);
      } catch { setZohoStatus(false); }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load dashboard');
    } finally { setIsLoading(false); }
  };

  useEffect(() => { load(); }, []);

  if (isLoading) return <Skeleton />;

  const ts = targetStats;
  const todayCash          = ts?.totalCashPaidToday       ?? 0;
  const todayGrams         = ts?.totalGramsPurchasedToday ?? 0;
  const avgRate            = ts?.avgRateToday             ?? 0;
  const todayPayments      = ts?.todayPaymentsCount       ?? 0;
  const todayCustomers     = ts?.todayCustomersCount      ?? 0;
  const activeTargets      = ts?.activeTargetsCount       ?? 0;
  const completedPending   = ts?.completedUndeliveredCount?? 0;
  const todayBuybackGrams  = ts?.todayBuybackGrams        ?? 0;
  const todayBuybackPaidOut= ts?.todayBuybackPaidOut      ?? 0;
  const todayBuybackCount  = ts?.todayBuybackCount        ?? 0;
  const recentPayments: any[]= ts?.recentPayments         ?? [];
  const last30: any[]      = ts?.last30Days               ?? [];

  const max30Cash = Math.max(...last30.map((d: any) => Number(d.cashIn)), 1);

  return (
    <div className="my-[1.5rem] space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-[1.1rem] text-defaulttextcolor mb-0">Admin Dashboard</p>
          <p className="text-[0.78rem] text-[#8c9097] mt-0.5">HBC · Himalayan Bullion Company</p>
        </div>
        <button onClick={load}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-defaultborder text-sm font-medium
                     text-defaulttextcolor hover:border-[#C8A86B] hover:text-[#C8A86B] transition-colors">
          <i className="ri-refresh-line" /> Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl border-l-4 border-danger bg-danger/10 text-danger text-sm flex items-center justify-between">
          <span>{error}</span>
          <button onClick={load} className="text-xs font-semibold underline ml-4">Retry</button>
        </div>
      )}

      {/* ── Hero: Today's Silver Revenue ── */}
      <SectionLabel>TODAY'S ACTIVITY</SectionLabel>
      <div className="box p-6" style={{ borderLeft: '4px solid #16a34a' }}>
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          {/* Big number */}
          <div className="flex-shrink-0">
            <p className="text-[0.75rem] font-semibold text-[#64748b] mb-1 tracking-wide uppercase">Silver Revenue Today</p>
            <h2 className="text-[2.2rem] font-bold text-defaulttextcolor leading-none">
              Rs. {fmt(todayCash)}
            </h2>
            <p className="text-[0.78rem] text-[#8c9097] mt-2">
              {todayGrams.toFixed(3)}g collected
              {avgRate > 0 && <> &middot; avg rate NPR {fmt(Math.round(avgRate))}/g</>}
            </p>
          </div>

          {/* KPI tiles */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
            <KpiTile icon="ri-secure-payment-line" iconBg="#dbeafe" iconColor="#2563eb"
              value={todayPayments} label="payments today" />
            <KpiTile icon="ri-user-line" iconBg="#f3e8ff" iconColor="#9333ea"
              value={todayCustomers} label="customers active" />
            <KpiTile icon="ri-funds-line" iconBg="#dcfce7" iconColor="#16a34a"
              value={activeTargets} label="active targets" />
            <KpiTile icon="ri-box-3-line" iconBg="#fef9c3" iconColor="#d97706"
              value={completedPending} label="awaiting collection" valueColor={completedPending > 0 ? '#d97706' : undefined} />
          </div>
        </div>

        {/* Buyback row */}
        {todayBuybackCount > 0 && (
          <div className="mt-5 pt-4 border-t border-success/20 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
            <span className="flex items-center gap-1.5 text-[#64748b]">
              <i className="ri-arrow-go-back-line text-orange-500" />
              Today's Buybacks
            </span>
            <span className="font-semibold text-orange-600">{todayBuybackCount} transaction{todayBuybackCount !== 1 ? 's' : ''}</span>
            <span className="text-[#94a3b8]">·</span>
            <span className="font-semibold text-orange-600">{todayBuybackGrams.toFixed(3)}g returned</span>
            <span className="text-[#94a3b8]">·</span>
            <span className="font-semibold text-orange-600">NPR {fmt(todayBuybackPaidOut)} paid out</span>
          </div>
        )}
      </div>

      {/* ── Stat cards ── */}
      <SectionLabel>BUSINESS OVERVIEW</SectionLabel>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard href="/orders"    icon="ri-shopping-bag-3-line" iconBg="#dbeafe" iconColor="#2563eb"
          label="Total Orders"    value={fmt(counts.totalOrders)} />
        <StatCard href="/customers" icon="ri-group-line"           iconBg="#f3e8ff" iconColor="#9333ea"
          label="Total Customers" value={fmt(counts.totalCustomers)} />
        <StatCard href="/invoices"  icon="ri-file-list-3-line"     iconBg="#fef9c3" iconColor="#d97706"
          label="Total Invoices"  value={fmt(counts.totalInvoices)} />

        {/* Non-clickable Zoho status */}
        <StatusCard icon="ri-links-line" iconBg={zohoStatus ? '#dcfce7' : '#fee2e2'}
          iconColor={zohoStatus ? '#16a34a' : '#dc2626'} label="Zoho Connection">
          {zohoStatus === null ? (
            <p className="text-sm font-semibold text-[#64748b]">Checking…</p>
          ) : (
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                {zohoStatus && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75" />}
                <span className="relative inline-flex rounded-full h-2.5 w-2.5"
                      style={{ background: zohoStatus ? '#16a34a' : '#dc2626' }} />
              </span>
              <span className="font-semibold text-sm" style={{ color: zohoStatus ? '#16a34a' : '#dc2626' }}>
                {zohoStatus ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          )}
        </StatusCard>
      </div>

      {/* ── Main grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Target Payments — 2/3 */}
        <div className="lg:col-span-2">
          <div className="box">
            <div className="box-header flex items-center justify-between border-b border-defaultborder p-4">
              <div className="flex items-center gap-3">
                <h4 className="box-title mb-0 text-[0.9rem] font-semibold">Recent Target Payments</h4>
                {recentPayments.length > 0 && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                        style={{ background: '#f1f5f9', color: '#64748b' }}>
                    {recentPayments.length} records
                  </span>
                )}
              </div>
              <Link href="/targets"
                className="flex items-center gap-1 text-[0.78rem] font-semibold transition-colors"
                style={{ color: '#C8A86B' }}
                onMouseEnter={e => e.currentTarget.style.color = '#a8863d'}
                onMouseLeave={e => e.currentTarget.style.color = '#C8A86B'}>
                View all targets <i className="ri-arrow-right-line" />
              </Link>
            </div>

            {recentPayments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3"
                     style={{ background: '#f1f5f9' }}>
                  <i className="ri-secure-payment-line text-xl text-[#94a3b8]" />
                </div>
                <p className="text-sm font-medium text-defaulttextcolor">No payments yet</p>
                <p className="text-xs text-[#94a3b8] mt-1">Target payments will appear here</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="ti-custom-table ti-custom-table-hover text-sm w-full">
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left whitespace-nowrap">Time</th>
                      <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">Customer</th>
                      <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">Target</th>
                      <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">Item</th>
                      <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-right whitespace-nowrap">Grams</th>
                      <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-right whitespace-nowrap">Amount</th>
                      <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase" style={{ minWidth: 120 }}>Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentPayments.map((p: any) => {
                      const today = isToday(p.paymentDate);
                      const pct = Number(p.progressPercentAfter);
                      return (
                        <tr key={p.paymentNumber}
                            className="border-b border-defaultborder/50 hover:bg-[#f8fafc] transition-colors"
                            style={today ? { borderLeft: '3px solid #16a34a', background: '#f0fdf4' } : { borderLeft: '3px solid transparent' }}>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="flex flex-col">
                              <span className="text-[0.78rem] font-medium text-defaulttextcolor">
                                {today
                                  ? new Date(p.paymentDate).toLocaleTimeString('en-NP', { hour: '2-digit', minute: '2-digit' })
                                  : new Date(p.paymentDate).toLocaleDateString('en-NP', { month: 'short', day: 'numeric' })}
                              </span>
                              {today && (
                                <span className="text-[10px] font-bold tracking-wide mt-0.5" style={{ color: '#16a34a' }}>TODAY</span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-medium text-defaulttextcolor text-[0.82rem]">
                              {p.customerName?.trim() || '—'}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            <Link href={`/targets/${p.targetId}`}
                              className="inline-flex items-center gap-1 font-mono text-[11px] font-semibold px-2 py-1 rounded-md hover:opacity-80 transition-opacity"
                              style={{ background: '#dbeafe', color: '#1d4ed8' }}>
                              {p.targetNumber}
                            </Link>
                          </td>
                          <td className="py-3 px-4 text-[0.78rem]" style={{ color: '#64748b' }}>{p.itemName}</td>
                          <td className="py-3 px-4 text-right font-mono text-[0.78rem] text-defaulttextcolor">
                            {Number(p.gramsPurchased).toFixed(3)}g
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-[0.82rem] text-defaulttextcolor whitespace-nowrap">
                            Rs. {fmt(p.totalAmount)}
                          </td>
                          <td className="py-3 px-4">
                            <ProgressBar pct={pct} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar — 1/3 */}
        <div className="space-y-5">

          {/* Recent Invoices */}
          <div className="box">
            <div className="box-header flex items-center justify-between border-b border-defaultborder p-4">
              <div className="flex items-center gap-2">
                <h4 className="box-title mb-0 text-[0.9rem] font-semibold">Recent Invoices</h4>
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                      style={{ background: '#f1f5f9', color: '#64748b' }}>
                  {recentInvoices.length}
                </span>
              </div>
              <Link href="/invoices"
                className="flex items-center gap-1 text-[0.78rem] font-semibold"
                style={{ color: '#C8A86B' }}>
                View all <i className="ri-arrow-right-line" />
              </Link>
            </div>
            <div className="divide-y divide-defaultborder/50">
              {recentInvoices.length > 0 ? recentInvoices.map((inv) => {
                const s = statusStyle(inv.status);
                return (
                  <Link href={`/invoices/${inv.id}`} key={inv.id}
                    className="flex items-center justify-between px-4 py-3 hover:bg-[#f8fafc] transition-colors group">
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-[0.8rem] text-defaulttextcolor truncate">{inv.invoiceNumber}</p>
                      <p className="text-[0.7rem] mt-0.5" style={{ color: '#94a3b8' }}>{inv.date}</p>
                    </div>
                    <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="font-semibold text-[0.8rem] text-defaulttextcolor">Rs. {fmt(inv.amount)}</p>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
                              style={{ background: s.bg, color: s.text }}>
                          {inv.status}
                        </span>
                      </div>
                      <i className="ri-arrow-right-s-line text-[#cbd5e1] group-hover:text-[#C8A86B] transition-colors" />
                    </div>
                  </Link>
                );
              }) : (
                <div className="py-10 text-center text-sm text-[#94a3b8]">No invoices yet</div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="box">
            <div className="box-header border-b border-defaultborder p-4">
              <h4 className="box-title mb-0 text-[0.9rem] font-semibold">Quick Actions</h4>
            </div>
            <div className="p-4 grid grid-cols-2 gap-2">
              <QuickAction href="/orders/create"  icon="ri-add-circle-line"  iconBg="#dbeafe" iconColor="#2563eb" label="Create Order" />
              <QuickAction href="/targets"         icon="ri-funds-line"        iconBg="#dcfce7" iconColor="#16a34a" label="View Targets" />
              <QuickAction href="/customers"       icon="ri-user-add-line"     iconBg="#f3e8ff" iconColor="#9333ea" label="Customers" />
              <QuickAction href="/rates"           icon="ri-line-chart-line"   iconBg="#fef9c3" iconColor="#d97706" label="Silver Rate" />
              <QuickAction href="/customers/approvals" icon="ri-shield-check-line" iconBg="#fff7ed" iconColor="#ea580c" label="Approvals" />
              <QuickAction href="/sync"            icon="ri-refresh-line"      iconBg="#f0f9ff" iconColor="#0284c7" label="Sync Zoho" />
            </div>
          </div>
        </div>
      </div>

      {/* ── Recent Sales Orders ── */}
      <SectionLabel>RECENT SALES ORDERS</SectionLabel>
      <div className="box">
        <div className="box-header flex items-center justify-between border-b border-defaultborder p-4">
          <div className="flex items-center gap-3">
            <h4 className="box-title mb-0 text-[0.9rem] font-semibold">Sales Orders</h4>
            {recentOrders.length > 0 && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                    style={{ background: '#f1f5f9', color: '#64748b' }}>
                {recentOrders.length} records
              </span>
            )}
          </div>
          <Link href="/orders"
            className="flex items-center gap-1 text-[0.78rem] font-semibold"
            style={{ color: '#C8A86B' }}>
            View all <i className="ri-arrow-right-line" />
          </Link>
        </div>
        <div className="table-responsive">
          <table className="ti-custom-table ti-custom-table-hover text-sm w-full">
            <thead>
              <tr style={{ background: '#f8fafc' }}>
                {['Order', 'Customer', 'Amount', 'Status', 'Date'].map(h => (
                  <th key={h} className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">{h}</th>
                ))}
                <th className="py-3 px-4 w-8" />
              </tr>
            </thead>
            <tbody>
              {recentOrders.length > 0 ? recentOrders.map((o) => {
                const s = statusStyle(o.status);
                return (
                  <tr key={o.id} className="border-b border-defaultborder/50 hover:bg-[#f8fafc] transition-colors group">
                    <td className="py-3 px-4">
                      <Link href={`/orders/${o.id}`}
                        className="font-semibold text-[0.82rem] hover:underline"
                        style={{ color: '#2563eb' }}>
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-[0.82rem] text-defaulttextcolor">{o.customerName}</td>
                    <td className="py-3 px-4 font-semibold text-[0.82rem] text-defaulttextcolor whitespace-nowrap">
                      Rs. {fmt(o.amount)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[11px] font-semibold px-2 py-1 rounded-md"
                            style={{ background: s.bg, color: s.text }}>
                        {o.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[0.78rem]" style={{ color: '#94a3b8' }}>{o.date}</td>
                    <td className="py-3 px-4">
                      <i className="ri-arrow-right-s-line text-[#cbd5e1] group-hover:text-[#C8A86B] transition-colors" />
                    </td>
                  </tr>
                );
              }) : (
                <tr><td colSpan={6} className="text-center py-12 text-[#94a3b8] text-sm">No orders yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 30-Day Activity ── */}
      {last30.length > 0 && (
        <>
          <SectionLabel>30-DAY PAYMENT ACTIVITY</SectionLabel>
          <div className="box">
            <div className="box-header border-b border-defaultborder p-4 flex items-center justify-between">
              <h4 className="box-title mb-0 text-[0.9rem] font-semibold">Daily Breakdown</h4>
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                    style={{ background: '#f1f5f9', color: '#64748b' }}>
                Actual cash received per day
              </span>
            </div>
            <div className="table-responsive">
              <table className="ti-custom-table text-sm w-full">
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Date', 'Payments', 'Grams', 'Cash Collected', ''].map((h, i) => (
                      <th key={i} className={`py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase ${i >= 1 ? 'text-right' : 'text-left'}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...last30].reverse().map((d: any) => {
                    const today = new Date(d.date).toDateString() === new Date().toDateString();
                    const barPct = (Number(d.cashIn) / max30Cash) * 100;
                    return (
                      <tr key={d.date}
                          className="border-b border-defaultborder/50"
                          style={today ? { borderLeft: '3px solid #16a34a', background: '#f0fdf4', fontWeight: 600 } : { borderLeft: '3px solid transparent' }}>
                        <td className="py-2.5 px-4 whitespace-nowrap text-[0.8rem]">
                          <div className="flex items-center gap-2">
                            {new Date(d.date).toLocaleDateString('en-NP', { weekday: 'short', month: 'short', day: 'numeric' })}
                            {today && (
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                                    style={{ background: '#dcfce7', color: '#16a34a' }}>TODAY</span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-4 text-right text-[0.8rem]">{d.paymentsCount}</td>
                        <td className="py-2.5 px-4 text-right font-mono text-[0.78rem]">{Number(d.gramsSold).toFixed(3)}g</td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold text-[0.8rem] text-defaulttextcolor whitespace-nowrap">
                          Rs. {fmt(d.cashIn)}
                        </td>
                        <td className="py-2.5 px-4" style={{ minWidth: 100 }}>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#e2e8f0' }}>
                            <div className="h-1.5 rounded-full"
                                 style={{ width: `${barPct}%`, background: today ? '#16a34a' : '#C8A86B' }} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr style={{ background: '#f8fafc', borderTop: '2px solid #e2e8f0' }}>
                    <td className="py-3 px-4 font-bold text-[0.82rem] text-defaulttextcolor">30-day total</td>
                    <td className="py-3 px-4 text-right font-bold text-[0.82rem]">
                      {last30.reduce((s: number, d: any) => s + d.paymentsCount, 0)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-[0.82rem]">
                      {last30.reduce((s: number, d: any) => s + Number(d.gramsSold), 0).toFixed(3)}g
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-[0.82rem] text-defaulttextcolor whitespace-nowrap">
                      Rs. {fmt(last30.reduce((s: number, d: any) => s + Number(d.cashIn), 0))}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
