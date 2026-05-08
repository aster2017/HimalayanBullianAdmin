'use client'

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useAppDispatch, useAppSelector } from '@/shared/redux/hooks';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { useRouter, useParams } from 'next/navigation';
import { fetchItemById, deleteItem, fetchStockHistory, adjustStock, clearError, clearItemDetail } from '@/shared/redux/itemsSlice';
import toast from 'react-hot-toast';
import { StockStatus } from '@/shared/types';
import apiClient from '@/shared/services/apiClient';

interface ProductImage {
  id: string;
  imageUrl: string;
  isPrimary: boolean;
  displayOrder: number;
  altText?: string;
}

export default function ItemDetailPage() {
  useProtectedRoute();

  const dispatch = useAppDispatch();
  const router = useRouter();
  const params = useParams();
  const itemId = params.id as string;

  const itemsState = useAppSelector((state) => state.items);
  const { detail: item = null, stockHistory = [], isLoading = false, error = null } = itemsState || {};

  const [historyLoading, setHistoryLoading] = useState(false);
  const [adjustmentMode, setAdjustmentMode] = useState(false);
  const [adjustmentData, setAdjustmentData] = useState({ quantity: 0, type: 'adjustment' as 'purchase' | 'sale' | 'adjustment', notes: '' });
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Image state
  const [images, setImages] = useState<ProductImage[]>([]);
  const [mainImage, setMainImage] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const apiBase = (process.env.NEXT_PUBLIC_API_URL || 'https://hbc-api.semis.app/api').replace('/api', '');

  useEffect(() => {
    if (itemId) {
      dispatch(fetchItemById(itemId));
      fetchStockHistoryData();
      loadImages();
    }
    return () => { dispatch(clearItemDetail()); };
  }, [itemId]);

  const loadImages = async () => {
    try {
      const res = await apiClient.get(`/items/${itemId}/images`);
      const imgs: ProductImage[] = res.data?.data || [];
      setImages(imgs);
      const primary = imgs.find(i => i.isPrimary) || imgs[0];
      if (primary) setMainImage(primary.imageUrl);
    } catch {}
  };

  const imgSrc = (url: string) => url.startsWith('http') ? url : `${apiBase}${url}`;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      await apiClient.post(`/items/${itemId}/images`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Image uploaded');
      await loadImages();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Upload failed');
    } finally {
      setImageUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSetPrimary = async (imageId: string) => {
    try {
      await apiClient.put(`/items/${itemId}/images/${imageId}/set-primary`);
      toast.success('Primary image updated');
      await loadImages();
    } catch { toast.error('Failed to set primary'); }
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!confirm('Delete this image?')) return;
    try {
      await apiClient.delete(`/items/${itemId}/images/${imageId}`);
      toast.success('Image deleted');
      await loadImages();
    } catch { toast.error('Failed to delete image'); }
  };

  const fetchStockHistoryData = async () => {
    setHistoryLoading(true);
    try { await dispatch(fetchStockHistory({ itemId, page: 1, pageSize: 20 })).unwrap(); } catch {}
    finally { setHistoryLoading(false); }
  };

  const handleAdjustmentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    try {
      await dispatch(adjustStock({ itemId: item.id, adjustment: adjustmentData })).unwrap();
      toast.success('Stock adjusted successfully');
      setAdjustmentMode(false);
      setAdjustmentData({ quantity: 0, type: 'adjustment', notes: '' });
      await fetchStockHistoryData();
    } catch { toast.error('Failed to adjust stock'); }
  };

  const handleDelete = async () => {
    if (!item) return;
    try {
      await dispatch(deleteItem(item.id)).unwrap();
      toast.success('Item deleted successfully');
      router.push('/items');
    } catch { toast.error('Failed to delete item'); }
  };

  useEffect(() => { return () => { dispatch(clearError()); }; }, [dispatch]);

  const getStockStatus = () => {
    if (!item) return { status: StockStatus.OutOfStock, label: 'Out of Stock', color: 'bg-red-500/10 text-red-800' };
    if (item.stockOnHand === 0) return { status: StockStatus.OutOfStock, label: 'Out of Stock', color: 'bg-red-500/10 text-red-800' };
    if (item.stockOnHand <= item.reorderLevel) return { status: StockStatus.LowStock, label: 'Low Stock', color: 'bg-yellow-500/10 text-yellow-800' };
    return { status: StockStatus.InStock, label: 'In Stock', color: 'bg-green-500/10 text-green-800' };
  };

  if (isLoading) return <div className="page-content"><div className="h-96 bg-gradient-to-r from-gray-200 to-gray-300 rounded-lg animate-pulse"></div></div>;
  if (!item) return <div className="page-content"><div className="card p-6 text-center"><p className="font-semibold">Item not found</p><Link href="/items" className="btn btn-primary mt-4">Back to Items</Link></div></div>;

  const stockStatus = getStockStatus();

  return (
    <div className="page-content">
      <div className="container-fluid">

        {/* Header */}
        <div className="page-header d-print-none mb-6">
          <div className="row align-items-center">
            <div className="col">
              <div className="flex items-center gap-3">
                <Link href="/items" className="text-primary hover:underline text-sm"><i className="bx bx-chevron-left"></i> Items</Link>
                <span className="text-gray-400">/</span>
                <h2 className="page-title">{item.name}</h2>
              </div>
            </div>
            <div className="col-auto">
              <div className="btn-list">
                <Link href={`/items/${itemId}/edit`} className="btn btn-primary"><i className="bx bx-edit me-1"></i> Edit</Link>
                <button onClick={() => setDeleteConfirm(true)} className="btn btn-danger"><i className="bx bx-trash me-1"></i> Delete</button>
              </div>
            </div>
          </div>
        </div>

        {error && <div className="alert alert-danger mb-4"><i className="bx bx-error-circle me-2"></i>{error}</div>}

        {/* KPI cards */}
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
            <p className="text-sm font-semibold text-gray-900">Rs. {item.rate?.toLocaleString()}</p>
          </div>
          <div className={`card border-l-4 p-6 rounded-lg shadow-sm ${stockStatus.status === 'OutOfStock' ? 'border-red-500 bg-red-500/10' : stockStatus.status === 'LowStock' ? 'border-yellow-500 bg-yellow-500/10' : 'border-green-500 bg-green-500/10'}`}>
            <p className="text-gray-600 text-sm font-medium mb-1">Status</p>
            <span className={`badge ${stockStatus.color} px-2 py-1 rounded text-xs font-semibold`}>{stockStatus.label}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-2 space-y-6">

            {/* IMAGE GALLERY */}
            <div className="box">
              <div className="box-header border-b p-4 flex items-center justify-between">
                <h5 className="box-title mb-0">Product Images</h5>
                <button onClick={() => fileInputRef.current?.click()} disabled={imageUploading}
                  className="ti-btn ti-btn-primary-full !text-white text-xs px-3 py-1.5">
                  {imageUploading
                    ? <><i className="ri-loader-4-line animate-spin me-1"></i>Uploading…</>
                    : <><i className="ri-upload-2-line me-1"></i>Upload Image</>}
                </button>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleUpload} />
              </div>
              <div className="box-body p-4">
                {images.length > 0 ? (
                  <>
                    <div className="mb-4 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 flex items-center justify-center" style={{ height: 280 }}>
                      {mainImage && <img src={imgSrc(mainImage)} alt={item.name} className="max-h-full max-w-full object-contain" />}
                    </div>
                    <div className="flex gap-3 flex-wrap">
                      {images.map(img => (
                        <div key={img.id} className="relative group">
                          <img
                            src={imgSrc(img.imageUrl)}
                            alt="thumb"
                            onClick={() => setMainImage(img.imageUrl)}
                            className={`w-20 h-20 object-cover rounded-lg border-2 cursor-pointer transition-all ${mainImage === img.imageUrl ? 'border-primary' : 'border-gray-200 hover:border-primary/50'}`}
                          />
                          {img.isPrimary && (
                            <span className="absolute top-1 left-1 bg-primary text-white text-[9px] font-bold px-1 py-0.5 rounded">PRIMARY</span>
                          )}
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex flex-col items-center justify-center gap-1">
                            {!img.isPrimary && (
                              <button onClick={() => handleSetPrimary(img.id)} className="text-[10px] text-white bg-blue-500/80 hover:bg-blue-600 px-2 py-1 rounded w-16">Set Primary</button>
                            )}
                            <button onClick={() => handleDeleteImage(img.id)} className="text-[10px] text-white bg-red-500/80 hover:bg-red-600 px-2 py-1 rounded w-16">Delete</button>
                          </div>
                        </div>
                      ))}
                      <button onClick={() => fileInputRef.current?.click()}
                        className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-300 hover:border-primary rounded-lg text-gray-400 hover:text-primary transition-colors">
                        <i className="ri-add-line text-xl"></i>
                        <span className="text-xs mt-1">Add</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 gap-3 text-gray-400">
                    <i className="ri-image-line text-5xl"></i>
                    <p className="text-sm font-medium">No images yet</p>
                    <button onClick={() => fileInputRef.current?.click()} className="ti-btn ti-btn-outline-primary text-sm">
                      <i className="ri-upload-2-line me-1"></i> Upload First Image
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Basic Info */}
            <div className="box">
              <div className="box-header border-b p-4"><h5 className="box-title mb-0">Basic Information</h5></div>
              <div className="box-body p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-gray-600 text-sm font-medium mb-1">Name</p><p className="text-sm font-semibold text-gray-900">{item.name}</p></div>
                  <div><p className="text-gray-600 text-sm font-medium mb-1">Category</p><p className="text-sm font-semibold text-gray-900">{item.category || '-'}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-gray-600 text-sm font-medium mb-1">Sub Category</p><p className="text-sm font-semibold text-gray-900">{item.subCategory || '-'}</p></div>
                  <div><p className="text-gray-600 text-sm font-medium mb-1">Unit</p><p className="text-sm font-semibold text-gray-900">{item.unit || '-'}</p></div>
                </div>
                <div><p className="text-gray-600 text-sm font-medium mb-1">Description</p><p className="text-sm text-gray-900">{item.description || '-'}</p></div>
              </div>
            </div>

            {/* Pricing */}
            <div className="box">
              <div className="box-header border-b p-4"><h5 className="box-title mb-0">Pricing & Tax</h5></div>
              <div className="box-body p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-gray-600 text-sm font-medium mb-1">Rate (Unit Price)</p><p className="text-sm font-semibold text-gray-900">Rs. {item.rate?.toLocaleString()}</p></div>
                  <div><p className="text-gray-600 text-sm font-medium mb-1">Cost Price</p><p className="text-sm font-semibold text-gray-900">Rs. {item.costPrice?.toLocaleString() || '0'}</p></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-gray-600 text-sm font-medium mb-1">Tax Name</p><p className="text-sm font-semibold text-gray-900">{item.taxName || '-'}</p></div>
                  <div><p className="text-gray-600 text-sm font-medium mb-1">Tax %</p><p className="text-sm font-semibold text-gray-900">{item.taxPercentage?.toFixed(2) || '0'}%</p></div>
                </div>
              </div>
            </div>

            {(item.weight || item.purity || item.material || item.design) && (
              <div className="box">
                <div className="box-header border-b p-4"><h5 className="box-title mb-0">Jewelry Details (HBC)</h5></div>
                <div className="box-body p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><p className="text-gray-600 text-sm font-medium mb-1">Weight (grams)</p><p className="text-sm font-semibold">{item.weight?.toFixed(2) || '-'}</p></div>
                    <div><p className="text-gray-600 text-sm font-medium mb-1">Purity</p><p className="text-sm font-semibold">{item.purity || '-'}</p></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><p className="text-gray-600 text-sm font-medium mb-1">Material</p><p className="text-sm font-semibold">{item.material || '-'}</p></div>
                    <div><p className="text-gray-600 text-sm font-medium mb-1">Design</p><p className="text-sm font-semibold">{item.design || '-'}</p></div>
                  </div>
                </div>
              </div>
            )}

            <div className="box">
              <div className="box-header border-b p-4"><h5 className="box-title mb-0">Stock Information</h5></div>
              <div className="box-body p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div><p className="text-gray-600 text-sm font-medium mb-1">Stock On Hand</p><p className="text-sm font-semibold">{item.stockOnHand} units</p></div>
                  <div><p className="text-gray-600 text-sm font-medium mb-1">Reorder Level</p><p className="text-sm font-semibold">{item.reorderLevel} units</p></div>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <div className="box">
              <div className="box-header border-b p-4"><h5 className="box-title mb-0">Quick Actions</h5></div>
              <div className="box-body p-6 space-y-3">
                <button onClick={() => fileInputRef.current?.click()} className="w-full ti-btn ti-btn-success-full !text-white">
                  <i className="ri-image-add-line me-2"></i>Upload Image
                </button>
                <button onClick={() => setAdjustmentMode(true)} className="w-full ti-btn ti-btn-primary-full !text-white">
                  <i className="ri-add-line me-2"></i>Adjust Stock
                </button>
                <Link href="/items" className="w-full block ti-btn ti-btn-light !opacity-100 text-center">
                  <i className="ri-arrow-left-s-line me-2"></i>Back to Items
                </Link>
              </div>
            </div>
            <div className="box bg-purple-500/10 border-l-4 border-purple-500">
              <div className="box-body p-6">
                <p className="text-gray-600 text-sm font-medium mb-2">Stock Value</p>
                <p className="text-3xl font-bold text-gray-900">Rs. {(item.stockOnHand * item.rate).toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-2">{item.stockOnHand} units × Rs. {item.rate?.toLocaleString()}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Stock History */}
        <div className="card shadow-sm">
          <div className="card-header border-b p-4"><h5 className="card-title mb-0">Stock History</h5></div>
          <div className="table-responsive">
            {historyLoading ? (
              <div className="p-6 text-center text-gray-500"><i className="bx bx-loader-alt animate-spin text-2xl"></i></div>
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
                  {stockHistory.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50 border-b">
                      <td className="text-sm text-gray-600">{new Date(t.date).toLocaleDateString()}</td>
                      <td className="text-sm">
                        <span className={`badge px-2 py-1 rounded text-xs font-semibold ${t.type === 'purchase' ? 'bg-green-500/10 text-green-800' : t.type === 'sale' ? 'bg-red-500/10 text-red-800' : 'bg-blue-500/10 text-blue-800'}`}>
                          {t.type.charAt(0).toUpperCase() + t.type.slice(1)}
                        </span>
                      </td>
                      <td className="text-sm font-semibold">{t.quantity}</td>
                      <td className="text-sm font-semibold">{t.newBalance}</td>
                      <td className="text-sm text-gray-600">{t.notes || '-'}</td>
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
                <select value={adjustmentData.type} onChange={(e) => setAdjustmentData({ ...adjustmentData, type: e.target.value as any })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="purchase">Purchase</option>
                  <option value="sale">Sale</option>
                  <option value="adjustment">Adjustment</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                <input type="number" value={adjustmentData.quantity}
                  onChange={(e) => setAdjustmentData({ ...adjustmentData, quantity: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={adjustmentData.notes} onChange={(e) => setAdjustmentData({ ...adjustmentData, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" rows={3} />
              </div>
              <div className="flex gap-3 justify-end pt-4">
                <button type="button" onClick={() => setAdjustmentMode(false)} className="btn btn-outline-secondary">Cancel</button>
                <button type="submit" className="btn btn-primary">Adjust Stock</button>
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
            <p className="text-gray-600 mb-4">Are you sure you want to delete {item.name}? This action cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteConfirm(false)} className="btn btn-outline-secondary">Cancel</button>
              <button onClick={handleDelete} className="btn btn-danger">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
