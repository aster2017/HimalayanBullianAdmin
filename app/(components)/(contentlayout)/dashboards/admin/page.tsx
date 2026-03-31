'use client'

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import apiClient from '@/shared/services/apiClient';
import toast from 'react-hot-toast';

export default function AdminDashboard() {
  useProtectedRoute();

  const [stats, setStats] = useState({
    totalOrders: 0,
    totalRevenue: 0,
    totalCustomers: 0,
    totalInvoices: 0,
    totalPayments: 0,
    totalItems: 0,
    unpaidInvoices: 0,
    paidAmount: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [recentInvoices, setRecentInvoices] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [zohoStatus, setZohoStatus] = useState<boolean | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [ordersRes, invoicesRes, customersRes, itemsRes, paymentsRes] = await Promise.allSettled([
          apiClient.get('/orders', { params: { page: 1, pageSize: 10 } }),
          apiClient.get('/invoices', { params: { page: 1, pageSize: 10 } }),
          apiClient.get('/customers', { params: { page: 1, pageSize: 1 } }),
          apiClient.get('/items', { params: { page: 1, pageSize: 1 } }),
          apiClient.get('/payments', { params: { page: 1, pageSize: 1 } }),
        ]);

        const orders = ordersRes.status === 'fulfilled' ? ordersRes.value.data?.data : null;
        const invoices = invoicesRes.status === 'fulfilled' ? invoicesRes.value.data?.data : null;
        const customers = customersRes.status === 'fulfilled' ? customersRes.value.data?.data : null;
        const items = itemsRes.status === 'fulfilled' ? itemsRes.value.data?.data : null;
        const payments = paymentsRes.status === 'fulfilled' ? paymentsRes.value.data?.data : null;

        const orderItems = orders?.items || [];
        const invoiceItems = invoices?.items || [];
        const revenue = orderItems.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);
        const unpaid = invoiceItems.filter((inv: any) => inv.status !== 'Paid' && inv.status !== 'paid').length;

        setStats({
          totalOrders: orders?.totalCount || 0,
          totalRevenue: revenue,
          totalCustomers: customers?.totalCount || 0,
          totalInvoices: invoices?.totalCount || 0,
          totalPayments: payments?.totalCount || 0,
          totalItems: items?.totalCount || 0,
          unpaidInvoices: unpaid,
          paidAmount: invoiceItems.reduce((sum: number, i: any) => sum + (i.paidAmount || 0), 0),
        });

        setRecentOrders(orderItems.slice(0, 8).map((o: any) => ({
          id: o.id,
          orderNumber: o.orderNumber,
          customerName: o.customerName || 'Unknown',
          amount: o.totalAmount || 0,
          status: o.status || 'Draft',
          date: new Date(o.orderDate || o.createdAt).toLocaleDateString('en-GB'),
        })));

        setRecentInvoices(invoiceItems.slice(0, 5).map((inv: any) => ({
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          amount: inv.totalAmount || 0,
          paid: inv.paidAmount || 0,
          balance: inv.balanceAmount || 0,
          status: inv.status || 'Draft',
          date: new Date(inv.invoiceDate).toLocaleDateString('en-GB'),
        })));

        // Check Zoho status
        try {
          const zohoRes = await apiClient.get('/sync/zoho');
          setZohoStatus(zohoRes.data?.zoho ?? false);
        } catch { setZohoStatus(false); }

      } catch (err: any) {
        setError(err?.response?.data?.message || 'Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed': return 'bg-success/20 text-success';
      case 'draft': return 'bg-secondary/20 text-secondary';
      case 'converted': return 'bg-info/20 text-info';
      case 'cancelled': return 'bg-danger/20 text-danger';
      case 'paid': return 'bg-success/20 text-success';
      case 'partial': return 'bg-warning/20 text-warning';
      case 'overdue': return 'bg-danger/20 text-danger';
      case 'sent': return 'bg-info/20 text-info';
      default: return 'bg-secondary/20 text-secondary';
    }
  };

  if (isLoading) {
    return (
      <div className="my-[1.5rem]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg animate-pulse"></div>
          ))}
        </div>
        <div className="h-96 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="my-[1.5rem]">
      {/* Page Header */}
      <div className="md:flex block items-center justify-between mb-6">
        <div>
          <p className="font-semibold text-[1.125rem] text-defaulttextcolor dark:text-defaulttextcolor/70 !mb-0">
            Dashboard
          </p>
          <p className="font-normal text-[#8c9097] dark:text-white/50 text-[0.813rem]">
            Business overview - HBC Himalayan Bullion
          </p>
        </div>
        <div className="flex gap-2 mt-2 md:mt-0">
          <Link href="/sync">
            <button className="ti-btn ti-btn-light">
              <i className="ri-refresh-line me-1"></i> Sync Dashboard
            </button>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-4 mb-4 bg-danger/40 text-sm border-t-4 border-danger text-danger/60 rounded-lg">{error}</div>
      )}

      {/* Metric Cards Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <Link href="/orders">
          <div className="box p-5 border-l-4 border-primary hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[#8c9097] text-[0.813rem] mb-1">Total Orders</p>
                <h3 className="text-[1.5rem] font-bold text-defaulttextcolor">{stats.totalOrders.toLocaleString()}</h3>
              </div>
              <div className="text-[1.5rem] text-primary/50"><i className="ri-shopping-cart-line"></i></div>
            </div>
          </div>
        </Link>

        <div className="box p-5 border-l-4 border-success">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[#8c9097] text-[0.813rem] mb-1">Page Revenue</p>
              <h3 className="text-[1.5rem] font-bold text-defaulttextcolor">Rs. {stats.totalRevenue.toLocaleString()}</h3>
              <p className="text-[0.7rem] text-[#8c9097]">From latest 10 orders</p>
            </div>
            <div className="text-[1.5rem] text-success/50"><i className="ri-money-rupee-circle-line"></i></div>
          </div>
        </div>

        <Link href="/customers">
          <div className="box p-5 border-l-4 border-purple-500 hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[#8c9097] text-[0.813rem] mb-1">Total Customers</p>
                <h3 className="text-[1.5rem] font-bold text-defaulttextcolor">{stats.totalCustomers.toLocaleString()}</h3>
              </div>
              <div className="text-[1.5rem] text-purple-500/50"><i className="ri-group-line"></i></div>
            </div>
          </div>
        </Link>

        <Link href="/invoices">
          <div className="box p-5 border-l-4 border-warning hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[#8c9097] text-[0.813rem] mb-1">Total Invoices</p>
                <h3 className="text-[1.5rem] font-bold text-defaulttextcolor">{stats.totalInvoices.toLocaleString()}</h3>
              </div>
              <div className="text-[1.5rem] text-warning/50"><i className="ri-file-list-3-line"></i></div>
            </div>
          </div>
        </Link>
      </div>

      {/* Metric Cards Row 2 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Link href="/items">
          <div className="box p-5 border-l-4 border-info hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[#8c9097] text-[0.813rem] mb-1">Inventory Items</p>
                <h3 className="text-[1.5rem] font-bold text-defaulttextcolor">{stats.totalItems}</h3>
              </div>
              <div className="text-[1.5rem] text-info/50"><i className="ri-archive-line"></i></div>
            </div>
          </div>
        </Link>

        <Link href="/payments">
          <div className="box p-5 border-l-4 border-success hover:shadow-md transition-shadow cursor-pointer">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-[#8c9097] text-[0.813rem] mb-1">Total Payments</p>
                <h3 className="text-[1.5rem] font-bold text-defaulttextcolor">{stats.totalPayments}</h3>
              </div>
              <div className="text-[1.5rem] text-success/50"><i className="ri-bank-card-line"></i></div>
            </div>
          </div>
        </Link>

        <div className="box p-5 border-l-4 border-secondary">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[#8c9097] text-[0.813rem] mb-1">Zoho Connection</p>
              <h3 className="text-[1rem] font-bold text-defaulttextcolor">
                {zohoStatus === null ? 'Checking...' : zohoStatus ? 'Connected' : 'Disconnected'}
              </h3>
            </div>
            <div className={`text-[1.5rem] ${zohoStatus ? 'text-success/50' : 'text-danger/50'}`}>
              <i className={`ri-${zohoStatus ? 'check-double' : 'close-circle'}-line`}></i>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders */}
        <div className="lg:col-span-2">
          <div className="box">
            <div className="box-header flex items-center justify-between">
              <h4 className="box-title">Recent Orders</h4>
              <Link href="/orders" className="text-primary text-[0.813rem] font-semibold hover:underline">View All →</Link>
            </div>
            <div className="box-body p-0">
              <div className="overflow-x-auto">
                <table className="ti-custom-table ti-custom-table-hover">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.length > 0 ? recentOrders.map((order) => (
                      <tr key={order.id}>
                        <td>
                          <Link href={`/orders/${order.id}`} className="font-semibold text-primary hover:underline">
                            {order.orderNumber}
                          </Link>
                        </td>
                        <td className="text-[0.813rem]">{order.customerName}</td>
                        <td className="font-semibold">Rs. {order.amount.toLocaleString()}</td>
                        <td><span className={`badge ${getStatusColor(order.status)}`}>{order.status}</span></td>
                        <td className="text-[0.813rem] text-[#8c9097]">{order.date}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={5} className="text-center py-8 text-[#8c9097]">No orders yet</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Recent Invoices */}
          <div className="box">
            <div className="box-header flex items-center justify-between">
              <h4 className="box-title">Recent Invoices</h4>
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
                    <p className="font-semibold text-[0.813rem]">Rs. {inv.amount.toLocaleString()}</p>
                    <span className={`badge text-[0.65rem] ${getStatusColor(inv.status)}`}>{inv.status}</span>
                  </div>
                </Link>
              )) : (
                <div className="p-4 text-center text-[#8c9097]">No invoices yet</div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="box">
            <div className="box-header">
              <h4 className="box-title">Quick Actions</h4>
            </div>
            <div className="box-body space-y-2">
              <Link href="/orders/create" className="flex items-center gap-3 p-3 rounded-lg hover:bg-primary/5 transition-colors">
                <i className="ri-add-circle-line text-primary text-[1.2rem]"></i>
                <span className="font-semibold text-[0.813rem]">Create Order</span>
              </Link>
              <Link href="/customers" className="flex items-center gap-3 p-3 rounded-lg hover:bg-purple-500/5 transition-colors">
                <i className="ri-user-add-line text-purple-500 text-[1.2rem]"></i>
                <span className="font-semibold text-[0.813rem]">View Customers</span>
              </Link>
              <Link href="/items" className="flex items-center gap-3 p-3 rounded-lg hover:bg-info/5 transition-colors">
                <i className="ri-archive-line text-info text-[1.2rem]"></i>
                <span className="font-semibold text-[0.813rem]">Inventory</span>
              </Link>
              <Link href="/sync" className="flex items-center gap-3 p-3 rounded-lg hover:bg-warning/5 transition-colors">
                <i className="ri-refresh-line text-warning text-[1.2rem]"></i>
                <span className="font-semibold text-[0.813rem]">Sync Dashboard</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
