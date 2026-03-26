'use client'

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/shared/redux/hooks';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { useRouter } from 'next/navigation';
import { fetchCustomers, deleteCustomer, searchCustomers, clearError } from '@/shared/redux/customersSlice';
import { CustomerService } from '@/shared/services/customerService';
import toast from 'react-hot-toast';

export default function CustomersPage() {
  useProtectedRoute();

  const dispatch = useAppDispatch();
  const router = useRouter();
  const customersState = useAppSelector((state) => state.customers);
  const { list = [], isLoading = false, error = null, totalCount = 0, currentPage = 1, pageSize = 20 } = customersState || {};

  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, newThisMonth: 0, avgLifetimeValue: 0 });

  // Fetch customers on mount
  useEffect(() => {
    dispatch(fetchCustomers({ page: 1, pageSize: 20 }));
    fetchStats();
  }, [dispatch]);

  // Fetch stats
  const fetchStats = async () => {
    try {
      const statsData = await CustomerService.getCustomerStats();
      setStats(statsData);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    }
  };

  // Handle search
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);

    if (term.trim()) {
      dispatch(searchCustomers({ searchTerm: term, page: 1, pageSize: 20 }));
    } else {
      dispatch(fetchCustomers({ page: 1, pageSize: 20 }));
    }
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    if (searchTerm.trim()) {
      dispatch(searchCustomers({ searchTerm, page: newPage, pageSize: 20 }));
    } else {
      dispatch(fetchCustomers({ page: newPage, pageSize: 20 }));
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      dispatch(deleteCustomer(id));
      setDeleteConfirm(null);
      toast.success('Customer deleted successfully');
      // Refresh list
      if (searchTerm.trim()) {
        dispatch(searchCustomers({ searchTerm, page: currentPage, pageSize: 20 }));
      } else {
        dispatch(fetchCustomers({ page: currentPage, pageSize: 20 }));
      }
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

  const totalPages = Math.ceil(totalCount / pageSize);

  if (isLoading && list.length === 0) {
    return (
      <div className="page-content">
        <div className="container-fluid">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 py-6 mb-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg animate-pulse"></div>
            ))}
          </div>
          <div className="h-96 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg animate-pulse"></div>
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
              <h2 className="page-title">Customers</h2>
              <p className="text-muted mt-2">Manage all your customers and their information.</p>
            </div>
            <div className="col-auto">
              <div className="btn-list">
                <Link href="/customers" className="btn btn-primary">
                  <i className="bx bx-refresh me-1"></i> Refresh
                </Link>
                <Link href="/" className="btn btn-success">
                  <i className="bx bx-plus me-1"></i> Add Customer (Coming Soon)
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div className="card bg-blue-500/10 border-l-4 border-blue-500 p-6 rounded-lg shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Customers</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-2">{stats.total || totalCount}</h3>
              </div>
              <div className="text-3xl opacity-50">
                <i className="bx bx-user-circle"></i>
              </div>
            </div>
          </div>

          <div className="card bg-green-500/10 border-l-4 border-green-500 p-6 rounded-lg shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">New This Month</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-2">{stats.newThisMonth}</h3>
              </div>
              <div className="text-3xl opacity-50">
                <i className="bx bx-user-plus"></i>
              </div>
            </div>
          </div>

          <div className="card bg-purple-500/10 border-l-4 border-purple-500 p-6 rounded-lg shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Avg Lifetime Value</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-2">${stats.avgLifetimeValue.toFixed(2)}</h3>
              </div>
              <div className="text-3xl opacity-50">
                <i className="bx bx-chart-bar"></i>
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

        {/* Search Bar */}
        <div className="card shadow-sm mb-6">
          <div className="card-body p-4">
            <div className="input-group">
              <span className="input-group-text">
                <i className="bx bx-search-alt-2"></i>
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Search by name or email..."
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
          </div>
        </div>

        {/* Customers Table */}
        <div className="card shadow-sm">
          <div className="card-header border-b p-4">
            <h5 className="card-title mb-0">Customers List</h5>
          </div>
          <div className="table-responsive">
            <table className="table table-vcenter mb-0">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-sm font-semibold">Name</th>
                  <th className="text-sm font-semibold">Email</th>
                  <th className="text-sm font-semibold">Phone</th>
                  <th className="text-sm font-semibold">Orders</th>
                  <th className="text-sm font-semibold">Lifetime Value</th>
                  <th className="text-sm font-semibold">Joined</th>
                  <th className="text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.length > 0 ? (
                  list.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50 border-b">
                      <td className="font-semibold">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">
                            {customer.firstName.charAt(0)}
                            {customer.lastName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-semibold text-sm">{customer.fullName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-sm text-gray-600">{customer.email}</td>
                      <td className="text-sm text-gray-600">{customer.phoneNumber || '-'}</td>
                      <td className="text-sm">
                        <span className="badge bg-blue-500/10 text-blue-800 px-2 py-1 rounded">
                          {customer.totalOrders}
                        </span>
                      </td>
                      <td className="text-sm font-semibold">${customer.lifetimeValue.toFixed(2)}</td>
                      <td className="text-sm text-gray-600">{new Date(customer.createdAt).toLocaleDateString()}</td>
                      <td className="text-sm">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/customers/${customer.id}`}
                            className="text-primary hover:underline text-sm font-semibold"
                          >
                            View
                          </Link>
                          <button
                            onClick={() => setDeleteConfirm(customer.id)}
                            className="text-danger hover:underline text-sm font-semibold"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-12 text-gray-500">
                      <i className="bx bx-inbox text-4xl mb-2 block opacity-50"></i>
                      <p className="font-semibold">No customers found</p>
                      <p className="text-sm">Try adjusting your search criteria</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="card-footer border-t p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages} ({totalCount} total customers)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="btn btn-sm btn-outline-primary disabled:opacity-50"
                  >
                    <i className="bx bx-chevron-left"></i> Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum = i + 1;
                      if (totalPages > 5) {
                        if (currentPage > 3) pageNum = currentPage - 2 + i;
                        if (currentPage > totalPages - 3) pageNum = totalPages - 4 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => handlePageChange(pageNum)}
                          className={`btn btn-sm ${
                            currentPage === pageNum
                              ? 'btn-primary'
                              : 'btn-outline-primary'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="btn btn-sm btn-outline-primary disabled:opacity-50"
                  >
                    Next <i className="bx bx-chevron-right"></i>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Customer?</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete this customer? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="btn btn-outline-secondary"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="btn btn-danger"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
