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

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed': return 'bg-success';
      case 'draft': return 'bg-secondary';
      case 'converted': return 'bg-info';
      case 'cancelled': return 'bg-danger';
      case 'paid': return 'bg-success';
      case 'partial': return 'bg-warning';
      case 'overdue': return 'bg-danger';
      default: return 'bg-secondary';
    }
  };

  if (loading) {
    return (
      <Fragment>
        <Seo title="Sales Report" />
        <div className="my-[1.5rem]">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg animate-pulse"></div>
            ))}
          </div>
          <div className="h-96 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg animate-pulse"></div>
        </div>
      </Fragment>
    );
  }

  const s = report?.summary;

  return (
    <Fragment>
      <Seo title="Sales Report" />

      <div className="md:flex block items-center justify-between my-[1.5rem] page-header-breadcrumb">
        <div>
          <p className="font-semibold text-[1.125rem] text-defaulttextcolor dark:text-defaulttextcolor/70 !mb-0">
            Sales Report
          </p>
          <p className="font-normal text-[#8c9097] dark:text-white/50 text-[0.813rem]">
            Revenue and sales analytics
          </p>
        </div>
        <div className="flex gap-2 mt-2 md:mt-0">
          {['week', 'month', 'quarter', 'year', 'all'].map((p) => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`ti-btn ti-btn-sm ${period === p ? 'ti-btn-primary-full !text-white' : 'ti-btn-light'}`}>
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="p-4 mb-4 bg-danger/40 text-sm border-t-4 border-danger text-danger/60 rounded-lg">{error}</div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="box p-5 border-l-4 border-primary">
          <p className="text-[#8c9097] text-[0.813rem] mb-1">Total Orders</p>
          <h3 className="text-[1.5rem] font-bold">{s?.totalOrders?.toLocaleString() || 0}</h3>
          <p className="text-[0.7rem] text-[#8c9097]">{s?.uniqueCustomers?.toLocaleString() || 0} unique customers</p>
        </div>

        <div className="box p-5 border-l-4 border-success">
          <p className="text-[#8c9097] text-[0.813rem] mb-1">Total Revenue</p>
          <h3 className="text-[1.5rem] font-bold text-success">Rs. {s?.totalRevenue?.toLocaleString() || 0}</h3>
          <p className="text-[0.7rem] text-[#8c9097]">Avg: Rs. {Math.round(s?.avgOrderValue || 0).toLocaleString()}/order</p>
        </div>

        <div className="box p-5 border-l-4 border-info">
          <p className="text-[#8c9097] text-[0.813rem] mb-1">Paid Amount</p>
          <h3 className="text-[1.5rem] font-bold text-info">Rs. {s?.totalPaid?.toLocaleString() || 0}</h3>
          <p className="text-[0.7rem] text-[#8c9097]">{s?.totalInvoices?.toLocaleString() || 0} invoices</p>
        </div>

        <div className="box p-5 border-l-4 border-danger">
          <p className="text-[#8c9097] text-[0.813rem] mb-1">Unpaid Amount</p>
          <h3 className="text-[1.5rem] font-bold text-danger">Rs. {s?.totalUnpaid?.toLocaleString() || 0}</h3>
          <p className="text-[0.7rem] text-[#8c9097]">Rs. {s?.totalPaymentsReceived?.toLocaleString() || 0} received</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Daily Revenue */}
        <div className="lg:col-span-2">
          <div className="box">
            <div className="box-header">
              <h4 className="box-title">Daily Revenue</h4>
            </div>
            <div className="box-body">
              {report?.dailyRevenue && report.dailyRevenue.length > 0 ? (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {report.dailyRevenue.map((day) => {
                    const maxRevenue = Math.max(...report.dailyRevenue.map((d) => d.revenue));
                    const width = maxRevenue > 0 ? (day.revenue / maxRevenue) * 100 : 0;
                    return (
                      <div key={day.date} className="flex items-center gap-3">
                        <span className="text-[0.75rem] text-[#8c9097] w-[80px] shrink-0">
                          {new Date(day.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                        </span>
                        <div className="flex-1">
                          <div className="bg-gray-100 rounded-full h-6 relative">
                            <div className="bg-primary/80 rounded-full h-6 flex items-center px-2" style={{ width: `${Math.max(width, 2)}%` }}>
                              {width > 20 && <span className="text-white text-[0.65rem] font-semibold">Rs. {day.revenue.toLocaleString()}</span>}
                            </div>
                          </div>
                        </div>
                        <span className="text-[0.7rem] text-[#8c9097] w-[60px] text-right">{day.count} orders</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[#8c9097] text-center py-8">No revenue data for this period</p>
              )}
            </div>
          </div>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Order Status */}
          <div className="box">
            <div className="box-header">
              <h4 className="box-title">Order Status</h4>
            </div>
            <div className="box-body space-y-3">
              {report?.orderStatusBreakdown?.map((item) => (
                <div key={item.status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${getStatusColor(item.status)}`}></span>
                    <span className="text-[0.813rem]">{item.status}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-[0.813rem]">{item.count.toLocaleString()}</span>
                    <span className="text-[0.7rem] text-[#8c9097] ml-2">Rs. {item.total.toLocaleString()}</span>
                  </div>
                </div>
              ))}
              {(!report?.orderStatusBreakdown || report.orderStatusBreakdown.length === 0) && (
                <p className="text-[#8c9097] text-center">No data</p>
              )}
            </div>
          </div>

          {/* Invoice Status */}
          <div className="box">
            <div className="box-header">
              <h4 className="box-title">Invoice Status</h4>
            </div>
            <div className="box-body space-y-3">
              {report?.invoiceStatusBreakdown?.map((item) => (
                <div key={item.status} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${getStatusColor(item.status)}`}></span>
                    <span className="text-[0.813rem]">{item.status}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-semibold text-[0.813rem]">{item.count.toLocaleString()}</span>
                    <span className="text-[0.7rem] text-[#8c9097] ml-2">Rs. {item.total.toLocaleString()}</span>
                  </div>
                </div>
              ))}
              {(!report?.invoiceStatusBreakdown || report.invoiceStatusBreakdown.length === 0) && (
                <p className="text-[#8c9097] text-center">No data</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Top Customers */}
      <div className="box mt-6">
        <div className="box-header flex items-center justify-between">
          <h4 className="box-title">Top Customers by Revenue</h4>
          <Link href="/customers" className="text-primary text-[0.813rem] font-semibold hover:underline">View All →</Link>
        </div>
        <div className="box-body p-0">
          <div className="overflow-x-auto">
            <table className="ti-custom-table ti-striped-table ti-custom-table-hover">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Customer</th>
                  <th>Orders</th>
                  <th>Total Revenue</th>
                  <th>Avg Order</th>
                </tr>
              </thead>
              <tbody>
                {report?.topCustomers?.map((cust, idx) => (
                  <tr key={cust.customerId}>
                    <td className="font-semibold text-primary">{idx + 1}</td>
                    <td className="font-semibold">{cust.name}</td>
                    <td>{cust.orderCount}</td>
                    <td className="font-semibold text-success">Rs. {cust.totalRevenue.toLocaleString()}</td>
                    <td className="text-[#8c9097]">Rs. {Math.round(cust.totalRevenue / cust.orderCount).toLocaleString()}</td>
                  </tr>
                ))}
                {(!report?.topCustomers || report.topCustomers.length === 0) && (
                  <tr><td colSpan={5} className="text-center py-8 text-[#8c9097]">No data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default SalesReportPage;
