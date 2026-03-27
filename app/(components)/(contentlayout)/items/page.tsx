'use client'

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/shared/redux/hooks';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { useRouter } from 'next/navigation';
import { fetchItems, deleteItem, searchItems, clearError } from '@/shared/redux/itemsSlice';
import { ItemService } from '@/shared/services/itemService';
import toast from 'react-hot-toast';
import { StockStatus, getStockStatus } from '@/shared/types';

export default function ItemsPage() {
  useProtectedRoute();

  const dispatch = useAppDispatch();
  const router = useRouter();
  const itemsState = useAppSelector((state) => state.items);
  const { list = [], isLoading = false, error = null, totalCount = 0, currentPage = 1, pageSize = 20 } = itemsState || {};

  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [stats, setStats] = useState({ total: 0, lowStock: 0, outOfStock: 0, totalValue: 0 });

  // Fetch items on mount
  useEffect(() => {
    dispatch(fetchItems({ page: 1, pageSize: 20 }));
    fetchStats();
  }, [dispatch]);

  // Fetch stats
  const fetchStats = async () => {
    try {
      const statsData = await ItemService.getItemStats();
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
      dispatch(searchItems({ searchTerm: term, page: 1, pageSize: 20 }));
    } else {
      dispatch(fetchItems({ page: 1, pageSize: 20 }));
    }
  };

  // Handle pagination
  const handlePageChange = (newPage: number) => {
    if (searchTerm.trim()) {
      dispatch(searchItems({ searchTerm, page: newPage, pageSize: 20 }));
    } else {
      dispatch(fetchItems({ page: newPage, pageSize: 20 }));
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      dispatch(deleteItem(id));
      setDeleteConfirm(null);
      toast.success('Item deleted successfully');
      // Refresh list
      if (searchTerm.trim()) {
        dispatch(searchItems({ searchTerm, page: currentPage, pageSize: 20 }));
      } else {
        dispatch(fetchItems({ page: currentPage, pageSize: 20 }));
      }
    } catch (err) {
      toast.error('Failed to delete item');
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 py-6 mb-6">
            {[1, 2, 3, 4].map((i) => (
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
        <div className="md:flex block items-center justify-between my-[1.5rem] page-header-breadcrumb">
          <div>
            <p className="font-semibold text-[1.125rem] text-defaulttextcolor dark:text-defaulttextcolor/70 !mb-0">
              Inventory
            </p>
            <p className="font-normal text-[#8c9097] dark:text-white/50 text-[0.813rem]">
              Manage inventory items and stock levels.
            </p>
          </div>
          <div className="flex gap-2 mt-2 md:mt-0">
            <button
              onClick={() => router.push('/items')}
              className="ti-btn ti-btn-primary !text-white !bg-primary !opacity-100"
            >
              <i className="ri-refresh-line inline-block me-2"></i>Refresh
            </button>
            <Link href="/items/create">
              <button className="ti-btn ti-btn-success !text-white !bg-success !opacity-100">
                <i className="ri-add-line inline-block me-2"></i>Add Item
              </button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="card bg-blue-500/10 border-l-4 border-blue-500 p-6 rounded-lg shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Total Items</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-2">{stats.total || totalCount}</h3>
              </div>
              <div className="text-3xl opacity-50">
                <i className="ri-inbox-line"></i>
              </div>
            </div>
          </div>

          <div className="card bg-yellow-500/10 border-l-4 border-yellow-500 p-6 rounded-lg shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Low Stock Items</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-2">{stats.lowStock || 0}</h3>
              </div>
              <div className="text-3xl opacity-50">
                <i className="ri-error-warning-line"></i>
              </div>
            </div>
          </div>

          <div className="card bg-red-500/10 border-l-4 border-red-500 p-6 rounded-lg shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Out of Stock</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-2">{stats.outOfStock || 0}</h3>
              </div>
              <div className="text-3xl opacity-50">
                <i className="ri-close-circle-line"></i>
              </div>
            </div>
          </div>

          <div className="card bg-purple-500/10 border-l-4 border-purple-500 p-6 rounded-lg shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-gray-600 text-sm font-medium">Inventory Value</p>
                <h3 className="text-3xl font-bold text-gray-900 mt-2">${(stats.totalValue || 0).toFixed(2)}</h3>
              </div>
              <div className="text-3xl opacity-50">
                <i className="ri-bar-chart-line"></i>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="p-4 mb-4 bg-danger/40 text-sm border-t-4 border-danger text-danger/60 rounded-lg">
            <i className="ri-error-warning-line me-2"></i>
            {error}
          </div>
        )}

        {/* Search Bar */}
        <div className="box shadow-sm mb-6">
          <div className="box-body p-4">
            <div className="flex items-center gap-2 input-group">
              <span className="input-group-text">
                <i className="ri-search-line"></i>
              </span>
              <input
                type="text"
                className="form-control"
                placeholder="Search by name, SKU, or category..."
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
          </div>
        </div>

        {/* Items Table */}
        <div className="box shadow-sm">
          <div className="box-header border-b p-4">
            <h5 className="box-title mb-0">Items List</h5>
          </div>
          <div className="table-responsive">
            <table className="ti-custom-table ti-striped-table mb-0">
              <thead>
                <tr>
                  <th className="text-sm font-semibold">Item Name</th>
                  <th className="text-sm font-semibold">SKU</th>
                  <th className="text-sm font-semibold">Category</th>
                  <th className="text-sm font-semibold">Stock</th>
                  <th className="text-sm font-semibold">Status</th>
                  <th className="text-sm font-semibold">Unit Price</th>
                  <th className="text-sm font-semibold">Reorder Level</th>
                  <th className="text-sm font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {list.length > 0 ? (
                  list.map((item: any) => {
                    const stockStatus = getStockStatus(item.stockOnHand, item.reorderLevel);
                    const statusColor =
                      stockStatus === StockStatus.OutOfStock ? 'bg-red-500/10 text-red-800' :
                      stockStatus === StockStatus.LowStock ? 'bg-yellow-500/10 text-yellow-800' :
                      'bg-green-500/10 text-green-800';

                    const statusLabel =
                      stockStatus === StockStatus.OutOfStock ? 'Out of Stock' :
                      stockStatus === StockStatus.LowStock ? 'Low Stock' :
                      'In Stock';

                    return (
                      <tr key={item.id} className="hover:bg-gray-50 border-b">
                        <td className="font-semibold">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-500 text-white flex items-center justify-center text-sm font-bold">
                              <i className="ri-inbox-line"></i>
                            </div>
                            <div>
                              <p className="font-semibold text-sm">{item.name}</p>
                            </div>
                          </div>
                        </td>
                        <td className="text-sm text-gray-600 font-mono">{item.sku}</td>
                        <td className="text-sm text-gray-600">{item.category || '-'}</td>
                        <td className="text-sm font-semibold">{item.stockOnHand}</td>
                        <td className="text-sm">
                          <span className={`badge ${statusColor} px-2 py-1 rounded`}>
                            {statusLabel}
                          </span>
                        </td>
                        <td className="text-sm font-semibold">${(item.rate || 0).toFixed(2)}</td>
                        <td className="text-sm text-gray-600">{item.reorderLevel}</td>
                        <td className="text-sm">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/items/${item.id}`}
                              className="text-primary hover:underline text-sm font-semibold"
                            >
                              View
                            </Link>
                            <button
                              onClick={() => setDeleteConfirm(item.id)}
                              className="text-danger hover:underline text-sm font-semibold"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-500">
                      <i className="ri-inbox-line text-4xl mb-2 block opacity-50"></i>
                      <p className="font-semibold">No items found</p>
                      <p className="text-sm">Try adjusting your search criteria</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="box-footer border-t p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Page {currentPage} of {totalPages} ({totalCount} total items)
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="btn btn-sm btn-outline-primary disabled:opacity-50"
                  >
                    <i className="ri-arrow-left-s-line"></i> Previous
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
                    Next <i className="ri-arrow-right-s-line"></i>
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Item?</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete this item? This action cannot be undone.
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
                className="btn btn-danger !text-white !bg-danger !opacity-100"
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
