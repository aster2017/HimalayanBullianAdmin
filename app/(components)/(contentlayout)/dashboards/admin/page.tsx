'use client'

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import apiClient from '@/shared/services/apiClient';

export default function AdminDashboard() {
  useProtectedRoute();

  const [counts, setCounts] = useState({
    totalOrders: 0, totalCustomers: 0, totalInvoices: 0, totalItems: 0,
  });
  const [targetStats, setTargetStats] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [zohoStatus, setZohoStatus] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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

        const orders = ordersRes.status === 'fulfilled' ? ordersRes.value.data?.data : null;
        const invoices = invoicesRes.status === 'fulfilled' ? invoicesRes.value.data?.data : null;
        const customers = customersRes.status === 'fulfilled' ? customersRes.value.data?.data : null;
        const items = itemsRes.status === 'fulfilled' ? itemsRes.value.data?.data : null;
        const stats = statsRes.status === 'fulfilled' ? statsRes.value.data?.data : null;

        setCounts({
          totalOrders: orders?.totalCount || 0,
          totalCustomers: customers?.totalCount || 0,
          totalInvoices: invoices?.totalCount || 0,
          totalItems: items?.totalCount || 0,
        });
        setTargetStats(stats);

        setRecentOrders((orders?.items || []).slice(0, 8).map((o: any) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          customerName: o.customerName || 'Unknown',
          amount: o.totalAmount || 0,
          status: o.status || 'Draft',
          date: new Date(o.orderDate || o.createdAt).toLocaleDateString('en-NP'),
        })));

        setRecentInvoices((invoices?.items || []).slice(0, 5).map((inv: any) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          amount: inv.totalAmount || 0,
          status: inv.status || 'Draft',
          date: new Date(inv.invoiceDate).toLocaleDateString('en-NP'),
        })));

        try {
          const zohoRes = await apiClient.get('/sync/zoho');
          setZohoStatus(zohoRes.data?.zoho ?? false);
        } catch { setZohoStatus(false); }

      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load dashboard');
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const fmt = (n: number) => n.toLocaleString('en-NP');
  const isToday = (dateStr: string) => new Date(dateStr).toDateString() === new Date().toDateString();

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed': return 'bg-success/20 text-success';
      case 'draft': return 'bg-secondary/20 text-secondary';
      case 'converted': return 'bg-info/20 text-info';
      case 'cancelled': return 'bg-danger/20 text-danger';
      case 'paid': return 'bg-success/20 text-success';
      case 'partial': return 'bg-warning/20 text-warning';
      default: return 'bg-secondary/20 text-secondary';
    }
  };

  if (isLoading) {
    return (
      <div className="my-[1.5rem] space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-gray-200 rounded-lg animate-pulse" />)}
        </div>
        <div className="h-64 bg-gray-200 rounded-lg animate-pulse" />
        <div className="h-96 bg-gray-200 rounded-lg animate-pulse" />
      </div>
    );
  }

  const ts = targetStats;
  const todayCash = ts?.totalCashPaidToday ?? 0;
  const todayGrams = ts?.totalGramsPurchasedToday ?? 0;
  const avgRate = ts?.avgRateToday ?? 0;
  const todayPayments = ts?.todayPaymentsCount ?? 0;
  const todayCustomers = ts?.todayCustomersCount ?? 0;
  const activeTargets = ts?.activeTargetsCount ?? 0;
  const completedPending = ts?.completedUndeliveredCount ?? 0;
  const todayBuybackGrams = ts?.todayBuybackGrams ?? 0;
  const todayBuybackPaidOut = ts?.todayBuybackPaidOut ?? 0;
  const todayBuybackCount = ts?.todayBuybackCount ?? 0;
  const recentPayments: any[] = ts?.recentPayments ?? [];
  const last30: any[] = ts?.last30Days ?? [];

  return (
    <div className="my-[1.5rem] space-y-6">
      {/* Header */}
      <div className="md:flex items-center justify-between">
        <div>
          <p className="font-semibold text-[1.125rem] text-defaulttextcolor !mb-0">Dashboard</p>
          <p className="font-normal text-[#8c9097] text-[0.813rem]">Business overview — HBC Himalayan Bullion</p>
        </div>
        <Link href="/sync">
          <button className="ti-btn ti-btn-light mt-2 md:mt-0">
            <i className="ri-refresh-line me-1"></i>Sync Dashboard
          </button>
        </Link>
      </div>

      {error && <div className="p-4 bg-danger/10 border-l-4 border-danger text-danger text-sm rounded-lg">{error}</div>}

      {/* ── Today's Silver Revenue — hero card ── */}
      <div className="box p-6 border-l-4 border-success bg-success/5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-[#8c9097] text-sm mb-1 font-medium">Today's Silver Revenue</p>
            <h2 className="text-[2rem] font-bold text-defaulttextcolor">
              Rs. {fmt(todayCash)}
            </h2>
            <p className="text-[0.78rem] text-[#8c9097] mt-1">
              {todayGrams.toFixed(3)}g paid for today
              {avgRate > 0 && <> · avg NPR {fmt(avgRate)}/g</>}
            </p>
          </div>
          <div className="flex gap-6 text-center">
            <div>
              <p className="text-2xl font-bold text-defaulttextcolor">{todayPayments}</p>
              <p className="text-xs text-[#8c9097]">payments</p>
            </div>
            <div className="w-px bg-gray-200" />
            <div>
              <p className="text-2xl font-bold text-defaulttextcolor">{todayCustomers}</p>
              <p className="text-xs text-[#8c9097]">customers</p>
            </div>
            <div className="w-px bg-gray-200" />
            <div>
              <p className="text-2xl font-bold text-defaulttextcolor">{activeTargets}</p>
              <p className="text-xs text-[#8c9097]">active targets</p>
            </div>
            <div className="w-px bg-gray-200" />
            <div>
              <p className="text-2xl font-bold text-warning">{completedPending}</p>
              <p className="text-xs text-[#8c9097]">awaiting collection</p>
            </div>
          </div>
        </div>
        {/* Buyback sub-row — only show when there's buyback activity today */}
        {todayBuybackCount > 0 && (
          <div className="mt-4 pt-4 border-t border-success/20 flex items-center gap-6 text-sm">
            <span className="text-[#8c9097]">↩ Today's Buybacks:</span>
            <span className="font-semibold text-orange-600">{todayBuybackCount} transaction{todayBuybackCount !== 1 ? 's' : ''}</span>
            <span className="text-[#8c9097]">·</span>
            <span className="font-semibold text-orange-600">{todayBuybackGrams.toFixed(3)}g returned</span>
            <span className="text-[#8c9097]">·</span>
            <span className="font-semibold text-orange-600">NPR {fmt(todayBuybackPaidOut)} paid out</span>
          </div>
        )}
      </div>

      {/* ── Metric row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Link href="/orders">
          <div className="box p-5 border-l-4 border-primary hover:shadow-md transition-shadow cursor-pointer">
            <p className="text-[#8c9097] text-[0.813rem] mb-1">Total Orders</p>
            <h3 className="text-[1.5rem] font-bold">{fmt(counts.totalOrders)}</h3>
            <i className="ri-shopping-cart-line text-primary/40 text-xl float-right -mt-8"></i>
          </div>
        </Link>
        <Link href="/customers">
          <div className="box p-5 border-l-4 border-purple-500 hover:shadow-md transition-shadow cursor-pointer">
            <p className="text-[#8c9097] text-[0.813rem] mb-1">Total Customers</p>
            <h3 className="text-[1.5rem] font-bold">{fmt(counts.totalCustomers)}</h3>
            <i className="ri-group-line text-purple-500/40 text-xl float-right -mt-8"></i>
          </div>
        </Link>
        <Link href="/invoices">
          <div className="box p-5 border-l-4 border-warning hover:shadow-md transition-shadow cursor-pointer">
            <p className="text-[#8c9097] text-[0.813rem] mb-1">Total Invoices</p>
            <h3 className="text-[1.5rem] font-bold">{fmt(counts.totalInvoices)}</h3>
            <i className="ri-file-list-3-line text-warning/40 text-xl float-right -mt-8"></i>
          </div>
        </Link>
        <div className="box p-5 border-l-4 border-secondary">
          <p className="text-[#8c9097] text-[0.813rem] mb-1">Zoho Connection</p>
          <h3 className="text-[1rem] font-bold">{zohoStatus === null ? 'Checking…' : zohoStatus ? 'Connected' : 'Disconnected'}</h3>
          <i className={`ri-${zohoStatus ? 'check-double' : 'close-circle'}-line ${zohoStatus ? 'text-success/40' : 'text-danger/40'} text-xl float-right -mt-8`}></i>
        </div>
      </div>

      {/* ── Main content grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Target Payments feed — 2/3 width */}
        <div className="lg:col-span-2">
          <div className="box">
            <div className="box-header flex items-center justify-between border-b p-4">
              <h4 className="box-title mb-0">Recent Target Payments</h4>
              <Link href="/targets" className="text-primary text-[0.813rem] font-semibold hover:underline">View Targets →</Link>
            </div>
            <div className="table-responsive">
              <table className="ti-custom-table ti-custom-table-hover text-sm">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Customer</th>
                    <th>Target</th>
                    <th>Item</th>
                    <th className="text-right">Grams</th>
                    <th className="text-right">Amount</th>
                    <th className="text-right">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {recentPayments.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-8 text-[#8c9097]">No payments yet</td></tr>
                  ) : recentPayments.map((p: any) => {
                    const today = isToday(p.paymentDate);
                    return (
                      <tr key={p.paymentNumber} className={today ? 'bg-success/5' : ''}>
                        <td className="whitespace-nowrap text-[#8c9097]">
                          {today
                            ? new Date(p.paymentDate).toLocaleTimeString('en-NP', { hour: '2-digit', minute: '2-digit' })
                            : new Date(p.paymentDate).toLocaleDateString('en-NP', { month: 'short', day: 'numeric' })
                          }
                          {today && <span className="ms-1 text-[0.6rem] text-success font-semibold">TODAY</span>}
                        </td>
                        <td className="font-medium">{p.customerName?.trim() || '—'}</td>
                        <td>
                          <Link href={`/targets/${p.targetId}`} className="text-primary hover:underline font-mono text-xs">
                            {p.targetNumber}
                          </Link>
                        </td>
                        <td className="text-[#8c9097]">{p.itemName}</td>
                        <td className="text-right font-mono">{Number(p.gramsPurchased).toFixed(3)}g</td>
                        <td className="text-right font-semibold">Rs. {fmt(p.totalAmount)}</td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-1.5">
                              <div
                                className="bg-success h-1.5 rounded-full"
                                style={{ width: `${Math.min(p.progressPercentAfter, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono w-10 text-right">{Number(p.progressPercentAfter).toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar — 1/3 */}
        <div className="space-y-6">
          {/* Recent Invoices */}
          <div className="box">
            <div className="box-header flex items-center justify-between border-b p-4">
              <h4 className="box-title mb-0">Recent Invoices</h4>
              <Link href="/invoices" className="text-primary text-[0.813rem] font-semibold hover:underline">View All →</Link>
            </div>
            <div className="box-body p-0">
              {recentInvoices.length > 0 ? recentInvoices.map((inv) => (
                <Link href={`/invoices/${inv.id}`} key={inv.id}
                  className="flex items-center justify-between p-3 border-b hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="font-semibold text-[0.813rem]">{inv.invoiceNumber}</p>
                    <p className="text-[0.7rem] text-[#8c9097]">{inv.date}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-[0.813rem]">Rs. {fmt(inv.amount)}</p>
                    <span className={`badge text-[0.65rem] ${getStatusColor(inv.status)}`}>{inv.status}</span>
                  </div>
                </Link>
              )) : (
                <div className="p-4 text-center text-[#8c9097] text-sm">No invoices yet</div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="box">
            <div className="box-header border-b p-4"><h4 className="box-title mb-0">Quick Actions</h4></div>
            <div className="box-body space-y-1 p-3">
              {[
                { href: '/orders/create', icon: 'ri-add-circle-line', color: 'text-primary', label: 'Create Order' },
                { href: '/targets', icon: 'ri-funds-line', color: 'text-success', label: 'View Targets' },
                { href: '/customers', icon: 'ri-user-add-line', color: 'text-purple-500', label: 'View Customers' },
                { href: '/rates', icon: 'ri-line-chart-line', color: 'text-warning', label: 'Update Silver Rate' },
                { href: '/sync', icon: 'ri-refresh-line', color: 'text-info', label: 'Sync Dashboard' },
              ].map(a => (
                <Link key={a.href} href={a.href}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                  <i className={`${a.icon} ${a.color} text-[1.1rem]`}></i>
                  <span className="font-medium text-[0.813rem]">{a.label}</span>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── 30-Day Daily Breakdown ── */}
      {last30.length > 0 && (
        <div className="box">
          <div className="box-header border-b p-4 flex items-center justify-between">
            <h4 className="box-title mb-0">30-Day Payment Activity</h4>
            <span className="text-xs text-[#8c9097]">Actual cash received per day</span>
          </div>
          <div className="table-responsive">
            <table className="ti-custom-table ti-striped-table text-sm">
              <thead>
                <tr>
                  <th>Date</th>
                  <th className="text-right">Payments</th>
                  <th className="text-right">Grams Paid For</th>
                  <th className="text-right">Cash Collected</th>
                </tr>
              </thead>
              <tbody>
                {[...last30].reverse().map((d: any) => {
                  const today = new Date(d.date).toDateString() === new Date().toDateString();
                  return (
                    <tr key={d.date} className={today ? 'bg-success/10 font-semibold' : ''}>
                      <td className="whitespace-nowrap">
                        {new Date(d.date).toLocaleDateString('en-NP', { weekday: 'short', month: 'short', day: 'numeric' })}
                        {today && <span className="ms-2 text-[0.65rem] text-success font-bold">TODAY</span>}
                      </td>
                      <td className="text-right">{d.paymentsCount}</td>
                      <td className="text-right font-mono">{Number(d.gramsSold).toFixed(3)}g</td>
                      <td className="text-right font-mono font-semibold">Rs. {fmt(d.cashIn)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t-2">
                <tr className="font-bold">
                  <td>Total (30 days)</td>
                  <td className="text-right">{last30.reduce((s: number, d: any) => s + d.paymentsCount, 0)}</td>
                  <td className="text-right font-mono">{last30.reduce((s: number, d: any) => s + Number(d.gramsSold), 0).toFixed(3)}g</td>
                  <td className="text-right font-mono">Rs. {fmt(last30.reduce((s: number, d: any) => s + Number(d.cashIn), 0))}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* ── Recent Orders (kept for reference) ── */}
      <div className="box">
        <div className="box-header flex items-center justify-between border-b p-4">
          <h4 className="box-title mb-0">Recent Sales Orders</h4>
          <Link href="/orders" className="text-primary text-[0.813rem] font-semibold hover:underline">View All →</Link>
        </div>
        <div className="table-responsive">
          <table className="ti-custom-table ti-custom-table-hover text-sm">
            <thead>
              <tr><th>Order</th><th>Customer</th><th>Amount</th><th>Status</th><th>Date</th></tr>
            </thead>
            <tbody>
              {recentOrders.length > 0 ? recentOrders.map((o) => (
                <tr key={o.id}>
                  <td>
                    <Link href={`/orders/${o.id}`} className="font-semibold text-primary hover:underline">{o.orderNumber}</Link>
                  </td>
                  <td>{o.customerName}</td>
                  <td className="font-semibold">Rs. {fmt(o.amount)}</td>
                  <td><span className={`badge ${getStatusColor(o.status)}`}>{o.status}</span></td>
                  <td className="text-[#8c9097]">{o.date}</td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="text-center py-8 text-[#8c9097]">No orders yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
