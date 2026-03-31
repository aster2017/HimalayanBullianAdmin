'use client';

import { Fragment, useEffect, useState } from 'react';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import Seo from '@/shared/layout-components/seo/seo';
import apiClient from '@/shared/services/apiClient';
import Link from 'next/link';

const CustomerReportPage = () => {
  useProtectedRoute();

  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await apiClient.get('/customers', { params: { page: 1, pageSize: 50 } });
        const data = res.data?.data;
        setCustomers(data?.items || []);
        setTotalCount(data?.totalCount || 0);
      } catch {}
      setLoading(false);
    };
    fetch();
  }, []);

  const activeCustomers = customers.filter(c => c.isActive);
  const withOrders = customers.filter(c => c.totalOrders > 0);
  const topByValue = [...customers].sort((a, b) => (b.lifetimeValue || 0) - (a.lifetimeValue || 0)).slice(0, 15);
  const topByOrders = [...customers].sort((a, b) => (b.totalOrders || 0) - (a.totalOrders || 0)).slice(0, 15);
  const totalLifetime = customers.reduce((sum, c) => sum + (c.lifetimeValue || 0), 0);

  if (loading) {
    return (<Fragment><Seo title="Customer Report" /><div className="my-[1.5rem]"><div className="h-96 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg animate-pulse"></div></div></Fragment>);
  }

  return (
    <Fragment>
      <Seo title="Customer Report" />

      <div className="md:flex block items-center justify-between my-[1.5rem] page-header-breadcrumb">
        <div>
          <p className="font-semibold text-[1.125rem] text-defaulttextcolor dark:text-defaulttextcolor/70 !mb-0">Customer Report</p>
          <p className="font-normal text-[#8c9097] text-[0.813rem]">Customer analytics and insights</p>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="box p-5 border-l-4 border-primary">
          <p className="text-[#8c9097] text-[0.813rem] mb-1">Total Customers</p>
          <h3 className="text-[1.5rem] font-bold">{totalCount.toLocaleString()}</h3>
        </div>
        <div className="box p-5 border-l-4 border-success">
          <p className="text-[#8c9097] text-[0.813rem] mb-1">Active</p>
          <h3 className="text-[1.5rem] font-bold text-success">{activeCustomers.length}</h3>
        </div>
        <div className="box p-5 border-l-4 border-info">
          <p className="text-[#8c9097] text-[0.813rem] mb-1">With Orders</p>
          <h3 className="text-[1.5rem] font-bold text-info">{withOrders.length}</h3>
        </div>
        <div className="box p-5 border-l-4 border-warning">
          <p className="text-[#8c9097] text-[0.813rem] mb-1">Total Lifetime Value</p>
          <h3 className="text-[1.5rem] font-bold text-warning">Rs. {totalLifetime.toLocaleString()}</h3>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top by Lifetime Value */}
        <div className="box">
          <div className="box-header">
            <h4 className="box-title">Top Customers by Lifetime Value</h4>
          </div>
          <div className="box-body p-0">
            <div className="overflow-x-auto">
              <table className="ti-custom-table ti-custom-table-hover">
                <thead><tr><th>#</th><th>Customer</th><th>Email</th><th className="text-right">Lifetime Value</th></tr></thead>
                <tbody>
                  {topByValue.map((c, i) => (
                    <tr key={c.id}>
                      <td className="font-semibold text-primary">{i + 1}</td>
                      <td><Link href={`/customers/${c.id}`} className="font-semibold hover:underline">{c.fullName}</Link></td>
                      <td className="text-[0.75rem] text-[#8c9097]">{c.email}</td>
                      <td className="text-right font-semibold text-success">Rs. {(c.lifetimeValue || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Top by Orders */}
        <div className="box">
          <div className="box-header">
            <h4 className="box-title">Top Customers by Order Count</h4>
          </div>
          <div className="box-body p-0">
            <div className="overflow-x-auto">
              <table className="ti-custom-table ti-custom-table-hover">
                <thead><tr><th>#</th><th>Customer</th><th className="text-right">Orders</th><th className="text-right">Value</th></tr></thead>
                <tbody>
                  {topByOrders.map((c, i) => (
                    <tr key={c.id}>
                      <td className="font-semibold text-primary">{i + 1}</td>
                      <td><Link href={`/customers/${c.id}`} className="font-semibold hover:underline">{c.fullName}</Link></td>
                      <td className="text-right font-semibold">{c.totalOrders}</td>
                      <td className="text-right text-[#8c9097]">Rs. {(c.lifetimeValue || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default CustomerReportPage;
