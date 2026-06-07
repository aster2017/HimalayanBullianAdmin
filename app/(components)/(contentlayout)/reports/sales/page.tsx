'use client';

import { Fragment, useEffect, useState } from 'react';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import Seo from '@/shared/layout-components/seo/seo';
import apiClient from '@/shared/services/apiClient';
import Link from 'next/link';

interface ReportData {
  period: string;
  dateRange: { from: string | null; to: string };
  summary: {
    totalOrders: number;
    totalRevenue: number;
    avgOrderValue: number;
    totalInvoices: number;
    totalPaid: number;
    totalUnpaid: number;
    totalPaymentsReceived: number;
    uniqueCustomers: number;
  };
  dailyRevenue: { date: string; revenue: number; count: number }[];
  topCustomers: { customerId: string; name: string; totalRevenue: number; orderCount: number }[];
  orderStatusBreakdown: { status: string; count: number; total: number }[];
  invoiceStatusBreakdown: { status: string; count: number; total: number }[];
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

const ORDER_STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  delivered:  { bg: '#dcfce7', text: '#15803d' },
  confirmed:  { bg: '#dbeafe', text: '#1d4ed8' },
  cancelled:  { bg: '#fee2e2', text: '#dc2626' },
  invoiced:   { bg: '#fef3c7', text: '#b45309' },
  shipped:    { bg: '#ccfbf1', text: '#0f766e' },
  pending:    { bg: '#ede9fe', text: '#6d28d9' },
};

const INVOICE_STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  paid:     { bg: '#dcfce7', text: '#15803d' },
  partial:  { bg: '#fef3c7', text: '#b45309' },
  overdue:  { bg: '#fee2e2', text: '#dc2626' },
  draft:    { bg: '#f1f5f9', text: '#475569' },
  sent:     { bg: '#dbeafe', text: '#1d4ed8' },
  void:     { bg: '#fee2e2', text: '#dc2626' },
};

function statusStyle(status: string, map: Record<string, { bg: string; text: string }>) {
  return map[status?.toLowerCase()] || { bg: '#f1f5f9', text: '#475569' };
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString('en-NP', { year: 'numeric', month: 'short', day: 'numeric' });
}

function SectionHeader({
  icon, iconBg, iconColor, title, subtitle, right,
}: {
  icon: string; iconBg: string; iconColor: string; title: string; subtitle?: string; right?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: iconBg }}>
          <i className={`${icon} text-base`} style={{ color: iconColor }}></i>
        </div>
        <div>
          <p className="font-semibold text-[0.938rem] text-defaulttextcolor mb-0">{title}</p>
          {subtitle && <p className="text-[0.75rem] text-[#8c9097] mb-0">{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

const PERIODS = [
  { key: 'week',    label: 'Week' },
  { key: 'month',   label: 'Month' },
  { key: 'quarter', label: 'Quarter' },
  { key: 'year',    label: 'Year' },
  { key: 'all',     label: 'All' },
];

const SalesReportPage = () => {
  useProtectedRoute();

  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState('month');

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await apiClient.get(`/orders/reports/summary`, { params: { period } });
        setReport(res.data);
      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load report');
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [period]);

  const s = report?.summary;

  const dateRangeLabel = () => {
    if (!report?.dateRange) return '';
    const { from, to } = report.dateRange;
    if (!from) return `Up to ${fmtDate(to)}`;
    return `${fmtDate(from)} – ${fmtDate(to)}`;
  };

  const STAT_TILES = [
    {
      label: 'Total Orders',
      value: (s?.totalOrders || 0).toLocaleString(),
      sub: `${(s?.uniqueCustomers || 0).toLocaleString()} unique customers`,
      icon: 'ri-shopping-bag-3-line',
      iconBg: '#ede9fe',
      iconColor: '#6d28d9',
      accent: '#6366f1',
    },
    {
      label: 'Total Revenue',
      value: `Rs. ${(s?.totalRevenue || 0).toLocaleString()}`,
      sub: `Avg Rs. ${Math.round(s?.avgOrderValue || 0).toLocaleString()} / order`,
      icon: 'ri-money-dollar-circle-line',
      iconBg: '#fdf8ee',
      iconColor: '#C8A86B',
      accent: '#C8A86B',
    },
    {
      label: 'Paid Amount',
      value: `Rs. ${(s?.totalPaid || 0).toLocaleString()}`,
      sub: `${(s?.totalInvoices || 0).toLocaleString()} invoices`,
      icon: 'ri-checkbox-circle-line',
      iconBg: '#dcfce7',
      iconColor: '#16a34a',
      accent: '#22c55e',
    },
    {
      label: 'Unpaid Amount',
      value: `Rs. ${(s?.totalUnpaid || 0).toLocaleString()}`,
      sub: `Rs. ${(s?.totalPaymentsReceived || 0).toLocaleString()} received`,
      icon: 'ri-error-warning-line',
      iconBg: '#fee2e2',
      iconColor: '#dc2626',
      accent: '#dc2626',
    },
  ];

  if (loading) {
    return (
      <Fragment>
        <Seo title="Sales Report" />
        <div className="md:flex block items-center justify-between my-[1.5rem] page-header-breadcrumb">
          <div>
            <p className="font-semibold text-[1.125rem] text-defaulttextcolor !mb-0 flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0" style={{ background: '#fdf8ee' }}>
                <i className="ri-bar-chart-2-line text-[#C8A86B] text-base"></i>
              </span>
              Sales Report
            </p>
            <p className="font-normal text-[#8c9097] text-[0.813rem] mt-1">Revenue and sales analytics</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="box p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl animate-pulse bg-[#f1f5f9] flex-shrink-0"></div>
              <div className="flex-1 space-y-2">
                <div className="h-3 rounded animate-pulse bg-[#f1f5f9] w-20"></div>
                <div className="h-5 rounded animate-pulse bg-[#f1f5f9] w-28"></div>
                <div className="h-2.5 rounded animate-pulse bg-[#f1f5f9] w-24"></div>
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 box p-5">
            <div className="h-96 rounded-xl animate-pulse bg-[#f1f5f9]"></div>
          </div>
          <div className="space-y-6">
            <div className="box p-5"><div className="h-48 rounded-xl animate-pulse bg-[#f1f5f9]"></div></div>
            <div className="box p-5"><div className="h-48 rounded-xl animate-pulse bg-[#f1f5f9]"></div></div>
          </div>
        </div>
      </Fragment>
    );
  }

  const maxRevenue = Math.max(...(report?.dailyRevenue?.map(d => d.revenue) || [1]), 1);

  const orderTotal = report?.orderStatusBreakdown?.reduce((a, b) => a + b.count, 0) || 1;
  const invoiceTotal = report?.invoiceStatusBreakdown?.reduce((a, b) => a + b.count, 0) || 1;

  return (
    <Fragment>
      <Seo title="Sales Report" />

      {/* Page header */}
      <div className="md:flex block items-center justify-between my-[1.5rem] page-header-breadcrumb">
        <div>
          <p className="font-semibold text-[1.125rem] text-defaulttextcolor dark:text-defaulttextcolor/70 !mb-0 flex items-center gap-2">
            <span
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0"
              style={{ background: '#fdf8ee' }}
            >
              <i className="ri-bar-chart-2-line text-[#C8A86B] text-base"></i>
            </span>
            Sales Report
          </p>
          <p className="font-normal text-[#8c9097] dark:text-white/50 text-[0.813rem] mt-1">
            {report ? dateRangeLabel() : 'Revenue and sales analytics'}
          </p>
        </div>
        <div className="flex gap-1.5 mt-2 md:mt-0 flex-wrap">
          {PERIODS.map(p => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className="px-3 py-1.5 text-[0.813rem] font-medium rounded-md border transition-all"
              style={
                period === p.key
                  ? { background: 'linear-gradient(135deg,#C8A86B 0%,#a8863d 100%)', color: '#fff', borderColor: '#C8A86B' }
                  : { background: '#f8fafc', color: '#64748b', borderColor: '#e2e8f0' }
              }
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 mb-5 rounded-xl text-sm" style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#dc2626' }}>
          <i className="ri-error-warning-line me-2"></i>{error}
        </div>
      )}

      {/* Stat tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
              <p className="text-[0.938rem] font-bold text-defaulttextcolor mb-0 truncate">{tile.value}</p>
              <p className="text-[0.7rem] text-[#8c9097] mb-0 truncate">{tile.sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Daily Revenue */}
        <div className="lg:col-span-2 box p-5">
          <SectionHeader
            icon="ri-bar-chart-line"
            iconBg="#fdf8ee"
            iconColor="#C8A86B"
            title="Daily Revenue"
            subtitle={`${report?.dailyRevenue?.length || 0} days in period`}
          />
          {report?.dailyRevenue && report.dailyRevenue.length > 0 ? (
            <div className="space-y-2.5 max-h-[400px] overflow-y-auto pr-1">
              {report.dailyRevenue.map((day) => {
                const pct = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
                const showInside = pct > 22;
                return (
                  <div key={day.date} className="flex items-center gap-3">
                    <span className="text-[0.75rem] text-[#64748b] w-[72px] flex-shrink-0 font-medium">
                      {new Date(day.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </span>
                    <div className="flex-1 relative">
                      <div className="rounded-lg h-7" style={{ background: '#f1f5f9' }}>
                        <div
                          className="rounded-lg h-7 flex items-center px-2.5 transition-all"
                          style={{
                            width: `${Math.max(pct, 1.5)}%`,
                            background: 'linear-gradient(90deg,#C8A86B 0%,#a8863d 100%)',
                            minWidth: day.revenue > 0 ? 6 : 0,
                          }}
                        >
                          {showInside && (
                            <span className="text-white text-[0.65rem] font-semibold whitespace-nowrap">
                              Rs. {day.revenue.toLocaleString()}
                            </span>
                          )}
                        </div>
                        {!showInside && day.revenue > 0 && (
                          <span
                            className="absolute top-1/2 -translate-y-1/2 text-[0.65rem] font-semibold text-[#64748b] whitespace-nowrap"
                            style={{ left: `calc(${Math.max(pct, 1.5)}% + 8px)` }}
                          >
                            Rs. {day.revenue.toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <span className="text-[0.7rem] text-[#8c9097] w-[58px] text-right flex-shrink-0">
                      {day.count} {day.count === 1 ? 'order' : 'orders'}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ background: '#fdf8ee' }}>
                <i className="ri-bar-chart-line text-2xl" style={{ color: '#C8A86B' }}></i>
              </div>
              <p className="text-[#64748b] font-medium mb-0">No revenue data for this period</p>
            </div>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-5">

          {/* Order Status */}
          <div className="box p-5">
            <SectionHeader
              icon="ri-shopping-bag-3-line"
              iconBg="#ede9fe"
              iconColor="#6d28d9"
              title="Order Status"
            />
            <div className="space-y-3">
              {report?.orderStatusBreakdown?.map(item => {
                const style = statusStyle(item.status, ORDER_STATUS_STYLES);
                const pct = Math.round((item.count / orderTotal) * 100);
                return (
                  <div key={item.status}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: style.bg, color: style.text }}
                        >
                          {item.status}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-[0.813rem] text-defaulttextcolor">{item.count.toLocaleString()}</span>
                        <span className="text-[0.7rem] text-[#8c9097] ms-1.5">Rs. {item.total.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="rounded-full h-1.5" style={{ background: '#f1f5f9' }}>
                      <div
                        className="rounded-full h-1.5 transition-all"
                        style={{ width: `${pct}%`, background: style.text }}
                      ></div>
                    </div>
                  </div>
                );
              })}
              {(!report?.orderStatusBreakdown || report.orderStatusBreakdown.length === 0) && (
                <p className="text-[#8c9097] text-center text-sm py-4">No data</p>
              )}
            </div>
          </div>

          {/* Invoice Status */}
          <div className="box p-5">
            <SectionHeader
              icon="ri-file-list-3-line"
              iconBg="#fef3c7"
              iconColor="#b45309"
              title="Invoice Status"
            />
            <div className="space-y-3">
              {report?.invoiceStatusBreakdown?.map(item => {
                const style = statusStyle(item.status, INVOICE_STATUS_STYLES);
                const pct = Math.round((item.count / invoiceTotal) * 100);
                return (
                  <div key={item.status}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: style.bg, color: style.text }}
                        >
                          {item.status}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-semibold text-[0.813rem] text-defaulttextcolor">{item.count.toLocaleString()}</span>
                        <span className="text-[0.7rem] text-[#8c9097] ms-1.5">Rs. {item.total.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="rounded-full h-1.5" style={{ background: '#f1f5f9' }}>
                      <div
                        className="rounded-full h-1.5 transition-all"
                        style={{ width: `${pct}%`, background: style.text }}
                      ></div>
                    </div>
                  </div>
                );
              })}
              {(!report?.invoiceStatusBreakdown || report.invoiceStatusBreakdown.length === 0) && (
                <p className="text-[#8c9097] text-center text-sm py-4">No data</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Top Customers */}
      <div className="box mt-6 p-5">
        <SectionHeader
          icon="ri-trophy-line"
          iconBg="#fdf8ee"
          iconColor="#C8A86B"
          title="Top Customers by Revenue"
          right={
            <Link href="/customers" className="text-[0.813rem] font-semibold hover:underline" style={{ color: '#C8A86B' }}>
              View All →
            </Link>
          }
        />
        <div className="overflow-x-auto -mx-5">
          <table className="ti-custom-table ti-custom-table-hover min-w-[540px]">
            <thead style={{ background: '#f8fafc' }}>
              <tr>
                <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left w-12">#</th>
                <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">Customer</th>
                <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">Orders</th>
                <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">Total Revenue</th>
                <th className="py-3 px-4 text-[11px] font-semibold text-[#64748b] tracking-wide uppercase text-left">Avg Order</th>
                <th className="py-3 px-4"></th>
              </tr>
            </thead>
            <tbody>
              {report?.topCustomers?.map((cust, idx) => {
                const rank = idx + 1;
                const rankColors = [
                  { bg: '#fdf8ee', text: '#C8A86B' },
                  { bg: '#f1f5f9', text: '#64748b' },
                  { bg: '#fff7ed', text: '#c2410c' },
                ];
                const rankStyle = rankColors[idx] || { bg: '#f8fafc', text: '#94a3b8' };
                return (
                  <tr key={cust.customerId}>
                    <td className="py-3 px-4">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-[11px]"
                        style={{ background: rankStyle.bg, color: rankStyle.text }}
                      >
                        {rank}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                          style={{ background: avatarColor(cust.name), fontSize: 11 }}
                        >
                          {avatarInitials(cust.name)}
                        </div>
                        <Link
                          href={`/customers/${cust.customerId}`}
                          className="text-[0.813rem] font-semibold hover:underline"
                          style={{ color: '#C8A86B' }}
                        >
                          {cust.name}
                        </Link>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                        style={{ background: '#ede9fe', color: '#6d28d9' }}
                      >
                        {cust.orderCount}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-[0.813rem]" style={{ color: '#C8A86B' }}>
                        Rs. {cust.totalRevenue.toLocaleString()}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[0.813rem] text-[#64748b]">
                      Rs. {Math.round(cust.totalRevenue / cust.orderCount).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <Link href={`/customers/${cust.customerId}`}>
                        <button
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#64748b] hover:text-[#C8A86B] transition-colors"
                          style={{ background: '#f8fafc', border: '1px solid #e2e8f0' }}
                          title="View customer"
                        >
                          <i className="ri-eye-line text-sm"></i>
                        </button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {(!report?.topCustomers || report.topCustomers.length === 0) && (
                <tr>
                  <td colSpan={6} className="text-center py-10 text-[#8c9097]">No customer data for this period</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </Fragment>
  );
};

export default SalesReportPage;
