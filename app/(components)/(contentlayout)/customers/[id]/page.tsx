'use client'

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/shared/redux/hooks';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { useRouter, useParams } from 'next/navigation';
import { fetchCustomerById, updateCustomer, deleteCustomer, clearError, clearCustomerDetail } from '@/shared/redux/customersSlice';
import { CustomerService } from '@/shared/services/customerService';
import toast from 'react-hot-toast';
import { SalesOrder, Invoice } from '@/shared/types';

export default function CustomerDetailPage() {
  useProtectedRoute();

  const dispatch = useAppDispatch();
  const router = useRouter();
  const params = useParams();
  const customerId = params.id as string;

  const customersState = useAppSelector((state) => state.customers);
  const { detail: customer = null, isLoading = false, error = null } = customersState || {};

  const [orders, setOrders] = useState<SalesOrder[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  // Edit form state
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({
    firstName: '',
    lastName: '',
    phoneNumber: '',
  });

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Fetch customer detail, orders, and invoices
  useEffect(() => {
    if (customerId) {
      dispatch(fetchCustomerById(customerId));
      fetchOrders();
      fetchInvoices();
    }

    return () => {
      dispatch(clearCustomerDetail());
    };
  }, [customerId, dispatch]);

  // Initialize edit form when customer data loads
  useEffect(() => {
    if (customer) {
      setEditData({
        firstName: customer.firstName || '',
        lastName: customer.lastName || '',
        phoneNumber: customer.phoneNumber || '',
      });
    }
  }, [customer]);

  // Fetch orders
  const fetchOrders = async () => {
    setOrdersLoading(true);
    try {
      const data = await CustomerService.getCustomerOrders(customerId, 1, 10);
      setOrders(Array.isArray(data) ? data : data.items || []);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  // Fetch invoices
  const fetchInvoices = async () => {
    setInvoicesLoading(true);
    try {
      const data = await CustomerService.getCustomerInvoices(customerId, 1, 10);
      setInvoices(Array.isArray(data) ? data : data.items || []);
    } catch (err) {
      console.error('Failed to fetch invoices:', err);
    } finally {
      setInvoicesLoading(false);
    }
  };

  // Handle edit form submission
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer) return;

    try {
      await dispatch(updateCustomer({ id: customer.id, data: editData })).unwrap();
      toast.success('Customer updated successfully');
      setEditMode(false);
    } catch (err) {
      toast.error('Failed to update customer');
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!customer) return;

    try {
      await dispatch(deleteCustomer(customer.id)).unwrap();
      toast.success('Customer deleted successfully');
      router.push('/customers');
    } catch (err) {
      toast.error('Failed to delete customer');
    }
  };

  // Clear error when unmounting
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  if (isLoading) {
    return (
      <div className="page-content">
        <div className="container-fluid">
          <div className="h-96 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="page-content">
        <div className="container-fluid">
          <div className="box p-6">
            <div className="text-center">
              <i className="bx bx-inbox text-4xl mb-2 block opacity-50"></i>
              <p className="font-semibold">Customer not found</p>
              <Link href="/customers" className="btn btn-primary mt-4">
                Back to Customers
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-content">
      <div className="container-fluid">
        {/* Page Header */}
        <div className="page-header d-print-none mb-6">
          <div className="row align-items-center">
            <div className="col">
              <div className="flex items-center gap-3">
                <Link href="/customers" className="text-primary hover:underline text-sm">
                  <i className="bx bx-chevron-left"></i> Customers
                </Link>
                <span className="text-gray-400">/</span>
                <h2 className="page-title">{customer.fullName}</h2>
              </div>
            </div>
            <div className="col-auto">
              <div className="btn-list">
                <button onClick={() => setEditMode(true)} className="btn btn-primary">
                  <i className="bx bx-edit me-1"></i> Edit
                </button>
                <button onClick={() => setDeleteConfirm(true)} className="btn btn-danger">
                  <i className="bx bx-trash me-1"></i> Delete
                </button>
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

        {/* Customer Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="card bg-blue-500/10 border-l-4 border-blue-500 p-6 rounded-lg shadow-sm">
            <p className="text-gray-600 text-sm font-medium mb-1">Email</p>
            <p className="text-sm font-semibold text-gray-900 truncate">{customer.email}</p>
          </div>

          <div className="card bg-green-500/10 border-l-4 border-green-500 p-6 rounded-lg shadow-sm">
            <p className="text-gray-600 text-sm font-medium mb-1">Phone</p>
            <p className="text-sm font-semibold text-gray-900">{customer.phoneNumber || '-'}</p>
          </div>

          <div className="card bg-purple-500/10 border-l-4 border-purple-500 p-6 rounded-lg shadow-sm">
            <p className="text-gray-600 text-sm font-medium mb-1">Joined</p>
            <p className="text-sm font-semibold text-gray-900">{new Date(customer.createdAt).toLocaleDateString()}</p>
          </div>

          <div className="card bg-orange-500/10 border-l-4 border-orange-500 p-6 rounded-lg shadow-sm">
            <p className="text-gray-600 text-sm font-medium mb-1">Lifetime Value</p>
            <p className="text-sm font-semibold text-gray-900">Rs. {(customer.lifetimeValue || 0).toLocaleString()}</p>
          </div>
        </div>

        {/* Orders Section */}
        <div className="box mb-6">
          <div className="box-header flex justify-between items-center">
            <h5 className="box-title">Orders ({orders.length})</h5>
            <Link href={`/orders?customerId=${customer.id}`} className="text-primary hover:underline text-sm">
              View All
            </Link>
          </div>
          <div className="overflow-x-auto">
            {ordersLoading ? (
              <div className="p-6 text-center text-gray-500">
                <i className="bx bx-loader-alt animate-spin text-2xl"></i>
              </div>
            ) : orders.length > 0 ? (
              <table className="ti-custom-table ti-striped-table ti-custom-table-hover">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-sm font-semibold">Order Number</th>
                    <th className="text-sm font-semibold">Date</th>
                    <th className="text-sm font-semibold">Status</th>
                    <th className="text-sm font-semibold">Total</th>
                    <th className="text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 border-b">
                      <td className="text-sm font-semibold">{order.orderNumber}</td>
                      <td className="text-sm text-gray-600">{new Date(order.orderDate).toLocaleDateString()}</td>
                      <td className="text-sm">
                        <span
                          className={`badge px-2 py-1 rounded text-xs font-semibold ${
                            order.status === 'Confirmed'
                              ? 'bg-green-500/10 text-green-800'
                              : order.status === 'Draft'
                              ? 'bg-yellow-500/10 text-yellow-800'
                              : order.status === 'Converted'
                              ? 'bg-blue-500/10 text-blue-800'
                              : 'bg-red-500/10 text-red-800'
                          }`}
                        >
                          {order.status}
                        </span>
                      </td>
                      <td className="text-sm font-semibold">Rs. {order.totalAmount?.toLocaleString()}</td>
                      <td className="text-sm">
                        <Link href={`/orders/${order.id}`} className="text-primary hover:underline text-sm font-semibold">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-6 text-center text-gray-500">
                <i className="bx bx-inbox text-2xl mb-2 block opacity-50"></i>
                <p className="text-sm">No orders found</p>
              </div>
            )}
          </div>
        </div>

        {/* Invoices Section */}
        <div className="box">
          <div className="box-header flex justify-between items-center">
            <h5 className="box-title">Invoices ({invoices.length})</h5>
            <Link href={`/invoices?customerId=${customer.id}`} className="text-primary hover:underline text-sm">
              View All
            </Link>
          </div>
          <div className="overflow-x-auto">
            {invoicesLoading ? (
              <div className="p-6 text-center text-gray-500">
                <i className="bx bx-loader-alt animate-spin text-2xl"></i>
              </div>
            ) : invoices.length > 0 ? (
              <table className="ti-custom-table ti-striped-table ti-custom-table-hover">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-sm font-semibold">Invoice Number</th>
                    <th className="text-sm font-semibold">Date</th>
                    <th className="text-sm font-semibold">Status</th>
                    <th className="text-sm font-semibold">Total</th>
                    <th className="text-sm font-semibold">Balance</th>
                    <th className="text-sm font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50 border-b">
                      <td className="text-sm font-semibold">{invoice.invoiceNumber}</td>
                      <td className="text-sm text-gray-600">{new Date(invoice.invoiceDate).toLocaleDateString()}</td>
                      <td className="text-sm">
                        <span
                          className={`badge px-2 py-1 rounded text-xs font-semibold ${
                            invoice.status === 'Paid'
                              ? 'bg-green-500/10 text-green-800'
                              : invoice.status === 'Sent'
                              ? 'bg-blue-500/10 text-blue-800'
                              : invoice.status === 'Draft'
                              ? 'bg-yellow-500/10 text-yellow-800'
                              : 'bg-red-500/10 text-red-800'
                          }`}
                        >
                          {invoice.status}
                        </span>
                      </td>
                      <td className="text-sm font-semibold">Rs. {invoice.totalAmount?.toLocaleString()}</td>
                      <td className="text-sm">Rs. {(invoice.balanceAmount || 0)?.toLocaleString()}</td>
                      <td className="text-sm">
                        <Link href={`/invoices/${invoice.id}`} className="text-primary hover:underline text-sm font-semibold">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-6 text-center text-gray-500">
                <i className="bx bx-inbox text-2xl mb-2 block opacity-50"></i>
                <p className="text-sm">No invoices found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {editMode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Edit Customer</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                <input
                  type="text"
                  value={editData.firstName}
                  onChange={(e) => setEditData({ ...editData, firstName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                <input
                  type="text"
                  value={editData.lastName}
                  onChange={(e) => setEditData({ ...editData, lastName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={editData.phoneNumber}
                  onChange={(e) => setEditData({ ...editData, phoneNumber: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setEditMode(false)}
                  className="btn btn-outline-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Customer?</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete {customer.fullName}? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(false)}
                className="btn btn-outline-secondary"
              >
                Cancel
              </button>
              <button onClick={handleDelete} className="btn btn-danger">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
