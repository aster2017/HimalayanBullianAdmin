'use client'

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/shared/redux/hooks';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { OrderService } from '@/shared/services/orderService';
import { InvoiceService } from '@/shared/services/invoiceService';
import toast from 'react-hot-toast';

interface MetricCard {
  title: string;
  value: string | number;
  icon: string;
  bgColor: string;
  link: string;
  subtext?: string;
}

interface RecentOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  amount: number;
  status: string;
  date: string;
}

export default function AdminDashboard() {
  useProtectedRoute();

  const dispatch = useAppDispatch();
  const [metrics, setMetrics] = useState<MetricCard[]>([
    { title: 'Total Orders', value: '0', icon: 'bx-cart', bgColor: 'bg-blue-500/10 border-l-4 border-blue-500', link: '/orders', subtext: 'This month' },
    { title: 'Revenue', value: '$0', icon: 'bx-money', bgColor: 'bg-green-500/10 border-l-4 border-green-500', link: '/reports/sales', subtext: 'This month' },
    { title: 'Customers', value: '0', icon: 'bx-user-circle', bgColor: 'bg-purple-500/10 border-l-4 border-purple-500', link: '/customers', subtext: 'Total' },
    { title: 'Pending Invoices', value: '0', icon: 'bx-receipt', bgColor: 'bg-orange-500/10 border-l-4 border-orange-500', link: '/invoices', subtext: 'Unpaid' },
  ]);

  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard data
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // Fetch orders
        const orders = await OrderService.getOrders() || [];

        // Fetch invoices
        const invoices = await InvoiceService.getInvoices() || [];

        // Calculate metrics
        const totalOrders = orders.length;
        const totalRevenue = orders.reduce((sum: number, order: any) => sum + (order.totalAmount || 0), 0);
        const uniqueCustomers = new Set(orders.map((order: any) => order.customerId)).size;
        const pendingInvoices = invoices.filter((inv: any) => inv.status !== 'paid' && inv.status !== 'cancelled').length;

        // Update metrics
        setMetrics([
          { ...metrics[0], value: totalOrders },
          { ...metrics[1], value: `$${totalRevenue.toFixed(2)}` },
          { ...metrics[2], value: uniqueCustomers },
          { ...metrics[3], value: pendingInvoices },
        ]);

        // Prepare recent orders
        const recent = orders.slice(0, 5).map((order: any) => ({
          id: order.id,
          orderNumber: order.orderNumber || `#${order.id}`,
          customerName: order.customerName || 'Unknown',
          amount: order.totalAmount || 0,
          status: order.status || 'pending',
          date: new Date(order.createdAt || Date.now()).toLocaleDateString(),
        }));

        setRecentOrders(recent);
      } catch (err: any) {
        const errorMessage = err?.response?.data?.message || 'Failed to load dashboard data';
        setError(errorMessage);
        toast.error(errorMessage);
        console.error('Dashboard error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getStatusBadgeColor = (status: string) => {
    const statusLower = status.toLowerCase();
    switch (statusLower) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'shipped':
        return 'bg-purple-100 text-purple-800';
      case 'delivered':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="page-content">
        <div className="container-fluid">
          <div className="grid grid-cols-1 gap-6 py-6">
            {/* Skeleton Loaders for Metrics */}
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="container-fluid">
        {/* Page Header */}
        <div className="page-header d-print-none">
          <div className="row align-items-center">
            <div className="col">
              <h2 className="page-title">Admin Dashboard</h2>
              <p className="text-muted mt-2">Welcome back! Here's what's happening with your business today.</p>
            </div>
            <div className="col-auto">
              <div className="btn-list">
                <a href="/reports/sales" className="btn btn-primary">
                  <i className="bx bx-line-chart me-1"></i> View Reports
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="alert alert-danger mb-4" role="alert">
            <i className="bx bx-error-circle me-2"></i>
            {error}
          </div>
        )}

        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6 py-4">
          {metrics.map((metric, index) => (
            <Link href={metric.link} key={index}>
              <div className={`card ${metric.bgColor} p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-gray-600 text-sm font-medium">{metric.title}</p>
                    <h3 className="text-3xl font-bold text-gray-900 mt-2">{metric.value}</h3>
                    {metric.subtext && <p className="text-xs text-gray-500 mt-1">{metric.subtext}</p>}
                  </div>
                  <div className="text-3xl opacity-50">
                    <i className={`bx ${metric.icon}`}></i>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Orders Table */}
          <div className="lg:col-span-2">
            <div className="card shadow-sm">
              <div className="card-header border-b p-4">
                <div className="flex items-center justify-between">
                  <h5 className="card-title mb-0">Recent Orders</h5>
                  <a href="/orders" className="text-primary text-sm font-semibold hover:underline">
                    View All →
                  </a>
                </div>
              </div>
              <div className="table-responsive">
                <table className="table table-vcenter mb-0">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Customer</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Date</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.length > 0 ? (
                      recentOrders.map((order) => (
                        <tr key={order.id} className="hover:bg-gray-50">
                          <td className="font-semibold">{order.orderNumber}</td>
                          <td>{order.customerName}</td>
                          <td>${order.amount.toFixed(2)}</td>
                          <td>
                            <span className={`badge px-3 py-1 text-xs font-semibold rounded-full ${getStatusBadgeColor(order.status)}`}>
                              {order.status}
                            </span>
                          </td>
                          <td className="text-muted text-sm">{order.date}</td>
                          <td>
                            <a href={`/orders/${order.id}`} className="text-primary hover:underline text-sm">
                              View
                            </a>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-muted">
                          No recent orders
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Quick Actions Sidebar */}
          <div className="space-y-4">
            {/* Quick Actions Card */}
            <div className="card shadow-sm">
              <div className="card-header border-b p-4">
                <h5 className="card-title mb-0">Quick Actions</h5>
              </div>
              <div className="card-body p-4 space-y-3">
                <a
                  href="/orders/create"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-blue-50 transition-colors"
                >
                  <div className="text-lg text-blue-500">
                    <i className="bx bx-plus-circle"></i>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Create Order</p>
                    <p className="text-xs text-gray-500">New order</p>
                  </div>
                </a>

                <a
                  href="/customers"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-purple-50 transition-colors"
                >
                  <div className="text-lg text-purple-500">
                    <i className="bx bx-user-plus"></i>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Add Customer</p>
                    <p className="text-xs text-gray-500">New customer</p>
                  </div>
                </a>

                <a
                  href="/invoices"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-green-50 transition-colors"
                >
                  <div className="text-lg text-green-500">
                    <i className="bx bx-receipt"></i>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">View Invoices</p>
                    <p className="text-xs text-gray-500">All invoices</p>
                  </div>
                </a>

                <a
                  href="/reports/sales"
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-orange-50 transition-colors"
                >
                  <div className="text-lg text-orange-500">
                    <i className="bx bx-bar-chart-alt-2"></i>
                  </div>
                  <div>
                    <p className="font-semibold text-sm">View Reports</p>
                    <p className="text-xs text-gray-500">Analytics</p>
                  </div>
                </a>
              </div>
            </div>

            {/* System Status Card */}
            <div className="card shadow-sm">
              <div className="card-header border-b p-4">
                <h5 className="card-title mb-0">System Status</h5>
              </div>
              <div className="card-body p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">API Connection</span>
                  <span className="badge badge-success bg-green-500 text-white">Connected</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Database</span>
                  <span className="badge badge-success bg-green-500 text-white">Online</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
