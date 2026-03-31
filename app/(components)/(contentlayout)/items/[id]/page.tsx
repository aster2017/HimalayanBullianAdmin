'use client'

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/shared/redux/hooks';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { useRouter, useParams } from 'next/navigation';
import { fetchItemById, deleteItem, fetchStockHistory, adjustStock, clearError, clearItemDetail } from '@/shared/redux/itemsSlice';
import { ItemService } from '@/shared/services/itemService';
import toast from 'react-hot-toast';
import { StockTransaction, StockStatus } from '@/shared/types';

export default function ItemDetailPage() {
  useProtectedRoute();

  const dispatch = useAppDispatch();
  const router = useRouter();
  const params = useParams();
  const itemId = params.id as string;

  const itemsState = useAppSelector((state) => state.items);
  const { detail: item = null, stockHistory = [], isLoading = false, error = null } = itemsState || {};

  const [historyLoading, setHistoryLoading] = useState(false);

  // Stock adjustment state only - edit moved to separate page

  // Stock adjustment state
  const [adjustmentMode, setAdjustmentMode] = useState(false);
  const [adjustmentData, setAdjustmentData] = useState({
    quantity: 0,
    type: 'adjustment' as 'purchase' | 'sale' | 'adjustment',
    notes: '',
  });

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Fetch item detail and stock history
  useEffect(() => {
    if (itemId) {
      dispatch(fetchItemById(itemId));
      fetchStockHistoryData();
    }

    return () => {
      dispatch(clearItemDetail());
    };
  }, [itemId, dispatch]);


  // Fetch stock history
  const fetchStockHistoryData = async () => {
    setHistoryLoading(true);
    try {
      await dispatch(fetchStockHistory({ itemId, page: 1, pageSize: 20 })).unwrap();
    } catch (err) {
      console.error('Failed to fetch stock history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Handle stock adjustment
  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;

    try {
      await dispatch(adjustStock({
        itemId: item.id,
        adjustment: {
          quantity: adjustmentData.quantity,
          type: adjustmentData.type,
          notes: adjustmentData.notes,
        }
      })).unwrap();
      toast.success('Stock adjusted successfully');
      setAdjustmentMode(false);
      setAdjustmentData({ quantity: 0, type: 'adjustment', notes: '' });
      await fetchStockHistoryData();
    } catch (err) {
      toast.error('Failed to adjust stock');
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!item) return;

    try {
      await dispatch(deleteItem(item.id)).unwrap();
      toast.success('Item deleted successfully');
      router.push('/items');
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

  // Get stock status
  const getStockStatus = () => {
    if (!item) return { status: StockStatus.OutOfStock, label: 'Out of Stock', color: 'bg-red-500/10 text-red-800' };

    if (item.stockOnHand === 0) {
      return { status: StockStatus.OutOfStock, label: 'Out of Stock', color: 'bg-red-500/10 text-red-800' };
    } else if (item.stockOnHand <= item.reorderLevel) {
      return { status: StockStatus.LowStock, label: 'Low Stock', color: 'bg-yellow-500/10 text-yellow-800' };
    } else {
      return { status: StockStatus.InStock, label: 'In Stock', color: 'bg-green-500/10 text-green-800' };
    }
  };

  if (isLoading) {
    return (
      <div className="page-content">
        <div className="container-fluid">
          <div className="h-96 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg animate-pulse"></div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="page-content">
        <div className="container-fluid">
          <div className="card shadow-sm p-6">
            <div className="text-center">
              <i className="bx bx-inbox text-4xl mb-2 block opacity-50"></i>
              <p className="font-semibold">Item not found</p>
              <Link href="/items" className="btn btn-primary mt-4">
                Back to Items
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const stockStatus = getStockStatus();

  return (
    <div className="page-content">
      <div className="container-fluid">
        {/* Page Header */}
        <div className="page-header d-print-none mb-6">
          <div className="row align-items-center">
            <div className="col">
              <div className="flex items-center gap-3">
                <Link href="/items" className="text-primary hover:underline text-sm">
                  <i className="bx bx-chevron-left"></i> Items
                </Link>
                <span className="text-gray-400">/</span>
                <h2 className="page-title">{item.name}</h2>
              </div>
            </div>
            <div className="col-auto">
              <div className="btn-list">
                <Link href={`/items/${itemId}/edit`} className="btn btn-primary">
                  <i className="bx bx-edit me-1"></i> Edit
                </Link>
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

        {/* Item Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="card bg-blue-500/10 border-l-4 border-blue-500 p-6 rounded-lg shadow-sm">
            <p className="text-gray-600 text-sm font-medium mb-1">SKU</p>
            <p className="text-sm font-semibold text-gray-900">{item.sku}</p>
          </div>

          <div className="card bg-green-500/10 border-l-4 border-green-500 p-6 rounded-lg shadow-sm">
            <p className="text-gray-600 text-sm font-medium mb-1">Current Stock</p>
            <p className="text-sm font-semibold text-gray-900">{item.stockOnHand} units</p>
          </div>

          <div className="card bg-purple-500/10 border-l-4 border-purple-500 p-6 rounded-lg shadow-sm">
            <p className="text-gray-600 text-sm font-medium mb-1">Unit Price</p>
            <p className="text-sm font-semibold text-gray-900">${item.rate.toFixed(2)}</p>
          </div>

          <div className={`card border-l-4 p-6 rounded-lg shadow-sm ${stockStatus.color.replace('text-', 'border-')}`}>
            <p className="text-gray-600 text-sm font-medium mb-1">Status</p>
            <span className={`badge ${stockStatus.color} px-2 py-1 rounded text-xs font-semibold`}>
              {stockStatus.label}
            </span>
          </div>
        </div>

        {/* Item Details Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          {/* Main Details - left 2/3 */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="box">
              <div className="box-header border-b p-4">
                <h5 className="box-title mb-0">Basic Information</h5>
              </div>
              <div className="box-body p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-600 text-sm font-medium mb-1">Name</p>
                    <p className="text-sm font-semibold text-gray-900">{item.name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm font-medium mb-1">Category</p>
                    <p className="text-sm font-semibold text-gray-900">{item.category || '-'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-600 text-sm font-medium mb-1">Sub Category</p>
                    <p className="text-sm font-semibold text-gray-900">{item.subCategory || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm font-medium mb-1">Unit</p>
                    <p className="text-sm font-semibold text-gray-900">{item.unit || '-'}</p>
                  </div>
                </div>
                <div>
                  <p className="text-gray-600 text-sm font-medium mb-1">Description</p>
                  <p className="text-sm text-gray-900">{item.description || '-'}</p>
                </div>
              </div>
            </div>

            {/* Pricing Information */}
            <div className="box">
              <div className="box-header border-b p-4">
                <h5 className="box-title mb-0">Pricing & Tax</h5>
              </div>
              <div className="box-body p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-600 text-sm font-medium mb-1">Rate (Unit Price)</p>
                    <p className="text-sm font-semibold text-gray-900">${item.rate.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm font-medium mb-1">Cost Price</p>
                    <p className="text-sm font-semibold text-gray-900">${item.costPrice?.toFixed(2) || 'N/A'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-600 text-sm font-medium mb-1">Tax Name</p>
                    <p className="text-sm font-semibold text-gray-900">{item.taxName || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm font-medium mb-1">Tax %</p>
                    <p className="text-sm font-semibold text-gray-900">{item.taxPercentage?.toFixed(2) || '0'}%</p>
                  </div>
                </div>
                <div>
                  <p className="text-gray-600 text-sm font-medium mb-1">Discount %</p>
                  <p className="text-sm font-semibold text-gray-900">{item.discountPercentage?.toFixed(2) || '0'}%</p>
                </div>
              </div>
            </div>

            {/* Jewelry Details */}
            {(item.weight || item.purity || item.material || item.design) && (
              <div className="box">
                <div className="box-header border-b p-4">
                  <h5 className="box-title mb-0">Jewelry Details (HBC)</h5>
                </div>
                <div className="box-body p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-600 text-sm font-medium mb-1">Weight (grams)</p>
                      <p className="text-sm font-semibold text-gray-900">{item.weight?.toFixed(2) || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm font-medium mb-1">Purity</p>
                      <p className="text-sm font-semibold text-gray-900">{item.purity || '-'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-600 text-sm font-medium mb-1">Material</p>
                      <p className="text-sm font-semibold text-gray-900">{item.material || '-'}</p>
                    </div>
                    <div>
                      <p className="text-gray-600 text-sm font-medium mb-1">Design</p>
                      <p className="text-sm font-semibold text-gray-900">{item.design || '-'}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Stock Information */}
            <div className="box">
              <div className="box-header border-b p-4">
                <h5 className="box-title mb-0">Stock Information</h5>
              </div>
              <div className="box-body p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-gray-600 text-sm font-medium mb-1">Stock On Hand</p>
                    <p className="text-sm font-semibold text-gray-900">{item.stockOnHand} units</p>
                  </div>
                  <div>
                    <p className="text-gray-600 text-sm font-medium mb-1">Reorder Level</p>
                    <p className="text-sm font-semibold text-gray-900">{item.reorderLevel} units</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Settings & Status */}
            <div className="box">
              <div className="box-header border-b p-4">
                <h5 className="box-title mb-0">Settings</h5>
              </div>
              <div className="box-body p-6 space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${item.isActive ? 'bg-green-500/10 text-green-800' : 'bg-red-500/10 text-red-800'}`}>
                    {item.isActive ? '✓ Active' : '✗ Inactive'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-block px-2 py-1 rounded text-xs font-semibold ${item.isFeatured ? 'bg-blue-500/10 text-blue-800' : 'bg-gray-500/10 text-gray-800'}`}>
                    {item.isFeatured ? '★ Featured' : '○ Not Featured'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions - right 1/3 */}
          <div className="space-y-6">
            <div className="box">
              <div className="box-header border-b p-4">
                <h5 className="box-title mb-0">Quick Actions</h5>
              </div>
              <div className="box-body p-6 space-y-3">
                <button
                  onClick={() => setAdjustmentMode(true)}
                  className="w-full ti-btn ti-btn-primary !text-white !bg-primary !opacity-100"
                >
                  <i className="ri-add-line me-2"></i>Adjust Stock
                </button>
                <Link href="/items" className="w-full block ti-btn ti-btn-light !opacity-100 text-center">
                  <i className="ri-arrow-left-s-line me-2"></i>Back to Items
                </Link>
              </div>
            </div>

            {/* Stock Value Card */}
            <div className="box bg-purple-500/10 border-l-4 border-purple-500">
              <div className="box-body p-6">
                <p className="text-gray-600 text-sm font-medium mb-2">Stock Value</p>
                <p className="text-3xl font-bold text-gray-900">${(item.stockOnHand * item.rate).toFixed(2)}</p>
                <p className="text-xs text-gray-500 mt-2">{item.stockOnHand} units × ${item.rate.toFixed(2)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stock History Section */}
        <div className="card shadow-sm">
          <div className="card-header border-b p-4">
            <h5 className="card-title mb-0">Stock History</h5>
          </div>
          <div className="table-responsive">
            {historyLoading ? (
              <div className="p-6 text-center text-gray-500">
                <i className="bx bx-loader-alt animate-spin text-2xl"></i>
              </div>
            ) : stockHistory.length > 0 ? (
              <table className="table table-vcenter mb-0">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="text-sm font-semibold">Date</th>
                    <th className="text-sm font-semibold">Type</th>
                    <th className="text-sm font-semibold">Quantity</th>
                    <th className="text-sm font-semibold">New Balance</th>
                    <th className="text-sm font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {stockHistory.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50 border-b">
                      <td className="text-sm text-gray-600">{new Date(transaction.date).toLocaleDateString()}</td>
                      <td className="text-sm">
                        <span
                          className={`badge px-2 py-1 rounded text-xs font-semibold ${
                            transaction.type === 'purchase'
                              ? 'bg-green-500/10 text-green-800'
                              : transaction.type === 'sale'
                              ? 'bg-red-500/10 text-red-800'
                              : 'bg-blue-500/10 text-blue-800'
                          }`}
                        >
                          {transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1)}
                        </span>
                      </td>
                      <td className="text-sm font-semibold">{transaction.quantity}</td>
                      <td className="text-sm font-semibold">{transaction.newBalance}</td>
                      <td className="text-sm text-gray-600">{transaction.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-6 text-center text-gray-500">
                <i className="bx bx-inbox text-2xl mb-2 block opacity-50"></i>
                <p className="text-sm">No stock history found</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {adjustmentMode && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-lg">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Adjust Stock</h3>
            <form onSubmit={handleAdjustmentSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={adjustmentData.type}
                  onChange={(e) => setAdjustmentData({ ...adjustmentData, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="purchase">Purchase</option>
                  <option value="sale">Sale</option>
                  <option value="adjustment">Adjustment</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input
                  type="number"
                  value={adjustmentData.quantity}
                  onChange={(e) => setAdjustmentData({ ...adjustmentData, quantity: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={adjustmentData.notes}
                  onChange={(e) => setAdjustmentData({ ...adjustmentData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  rows={3}
                />
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setAdjustmentMode(false)}
                  className="btn btn-outline-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Adjust Stock
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
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Item?</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete {item.name}? This action cannot be undone.
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
