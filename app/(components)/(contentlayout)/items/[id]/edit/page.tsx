'use client';

import { Fragment, useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/shared/redux/hooks';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import { fetchItemById, updateItem } from '@/shared/redux/itemsSlice';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { UpdateItemRequest } from '@/shared/types';

export default function EditItemPage() {
  useProtectedRoute();

  const router = useRouter();
  const params = useParams();
  const itemId = params.id as string;
  const dispatch = useAppDispatch();

  const itemsState = useAppSelector((state) => state.items);
  const { detail: item = null, isLoading = false } = itemsState || {};

  const [formLoading, setFormLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState<UpdateItemRequest>({
    name: '',
    description: '',
    category: '',
    subCategory: '',
    weight: undefined,
    purity: '',
    material: '',
    design: '',
    rate: 0,
    costPrice: 0,
    taxName: '',
    taxPercentage: 0,
    discountPercentage: 0,
    stockOnHand: 0,
    reorderLevel: 0,
    unit: '',
    isActive: true,
    isFeatured: false,
  });

  // Fetch item on mount
  useEffect(() => {
    if (itemId) {
      dispatch(fetchItemById(itemId));
    }
  }, [itemId, dispatch]);

  // Initialize form when item data loads
  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        description: item.description || '',
        category: item.category || '',
        subCategory: item.subCategory || '',
        weight: item.weight,
        purity: item.purity || '',
        material: item.material || '',
        design: item.design || '',
        rate: item.rate || 0,
        costPrice: item.costPrice || 0,
        taxName: item.taxName || '',
        taxPercentage: item.taxPercentage || 0,
        discountPercentage: item.discountPercentage || 0,
        stockOnHand: item.stockOnHand || 0,
        reorderLevel: item.reorderLevel || 0,
        unit: item.unit || '',
        isActive: item.isActive ?? true,
        isFeatured: item.isFeatured ?? false,
      });
    }
  }, [item]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const fieldValue = type === 'checkbox' ? (e.target as HTMLInputElement).checked :
                       type === 'number' ? (value === '' ? 0 : parseFloat(value)) :
                       value;

    setFormData((prev) => ({
      ...prev,
      [name]: fieldValue,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');

    // Validation
    if (!formData.name.trim()) {
      setError('Item name is required');
      return;
    }
    if (formData.rate <= 0) {
      setError('Rate must be greater than 0');
      return;
    }
    if (formData.costPrice < 0) {
      setError('Cost price cannot be negative');
      return;
    }

    setFormLoading(true);
    try {
      await (dispatch(updateItem({ id: itemId, data: formData })) as any).unwrap();
      toast.success('Item updated successfully');
      router.push(`/items/${itemId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to update item');
      toast.error(err.message || 'Failed to update item');
    } finally {
      setFormLoading(false);
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
          <div className="box">
            <div className="box-body p-6 text-center">
              <i className="ri-inbox-line text-4xl mb-2 block opacity-50"></i>
              <p className="font-semibold">Item not found</p>
              <Link href="/items" className="ti-btn ti-btn-primary-full !text-white mt-4 inline-block">
                Back to Items
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Fragment>
      <div className="md:flex block items-center justify-between my-[1.5rem] page-header-breadcrumb">
        <div>
          <p className="font-semibold text-[1.125rem] text-defaulttextcolor dark:text-defaulttextcolor/70 !mb-0">
            Edit Item: {item.name}
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push(`/items/${itemId}`)}
          className="ti-btn ti-btn-light mt-2 md:mt-0 !opacity-100"
        >
          Back to Item
        </button>
      </div>

      {error && (
        <div className="p-4 mb-4 bg-danger/40 text-sm border-t-4 border-danger text-danger/60 rounded-lg">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-12 gap-6">
          {/* Basic Information */}
          <div className="col-span-12 md:col-span-6">
            <div className="box">
              <div className="box-header">
                <h4 className="box-title">Basic Information</h4>
              </div>
              <div className="box-body space-y-4">
                <div>
                  <label className="form-label">SKU (Read-only)</label>
                  <input
                    type="text"
                    value={item.sku}
                    disabled
                    className="form-control form-control-lg opacity-60 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">SKU cannot be changed</p>
                </div>

                <div>
                  <label className="form-label">Item Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="form-control form-control-lg"
                    placeholder="e.g., Gold Ring"
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Description</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    className="form-control"
                    rows={3}
                    placeholder="Item description..."
                  />
                </div>

                <div>
                  <label className="form-label">Category</label>
                  <input
                    type="text"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="form-control form-control-lg"
                    placeholder="e.g., Rings"
                  />
                </div>

                <div>
                  <label className="form-label">Sub Category</label>
                  <input
                    type="text"
                    name="subCategory"
                    value={formData.subCategory}
                    onChange={handleChange}
                    className="form-control form-control-lg"
                    placeholder="e.g., Engagement Rings"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="col-span-12 md:col-span-6">
            <div className="box">
              <div className="box-header">
                <h4 className="box-title">Pricing & Tax</h4>
              </div>
              <div className="box-body space-y-4">
                <div>
                  <label className="form-label">Rate (Unit Price) *</label>
                  <input
                    type="number"
                    name="rate"
                    value={formData.rate}
                    onChange={handleChange}
                    className="form-control form-control-lg"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Cost Price</label>
                  <input
                    type="number"
                    name="costPrice"
                    value={formData.costPrice}
                    onChange={handleChange}
                    className="form-control form-control-lg"
                    step="0.01"
                    min="0"
                  />
                </div>

                <div>
                  <label className="form-label">Tax Name</label>
                  <input
                    type="text"
                    name="taxName"
                    value={formData.taxName}
                    onChange={handleChange}
                    className="form-control form-control-lg"
                    placeholder="e.g., VAT"
                  />
                </div>

                <div>
                  <label className="form-label">Tax Percentage (%)</label>
                  <input
                    type="number"
                    name="taxPercentage"
                    value={formData.taxPercentage}
                    onChange={handleChange}
                    className="form-control form-control-lg"
                    step="0.01"
                    min="0"
                    max="100"
                  />
                </div>

                <div>
                  <label className="form-label">Discount Percentage (%)</label>
                  <input
                    type="number"
                    name="discountPercentage"
                    value={formData.discountPercentage || 0}
                    onChange={handleChange}
                    className="form-control form-control-lg"
                    step="0.01"
                    min="0"
                    max="100"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Stock & Reorder */}
          <div className="col-span-12 md:col-span-6">
            <div className="box">
              <div className="box-header">
                <h4 className="box-title">Stock Information</h4>
              </div>
              <div className="box-body space-y-4">
                <div>
                  <label className="form-label">Stock On Hand *</label>
                  <input
                    type="number"
                    name="stockOnHand"
                    value={formData.stockOnHand}
                    onChange={handleChange}
                    className="form-control form-control-lg"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Reorder Level</label>
                  <input
                    type="number"
                    name="reorderLevel"
                    value={formData.reorderLevel}
                    onChange={handleChange}
                    className="form-control form-control-lg"
                    min="0"
                  />
                </div>

                <div>
                  <label className="form-label">Unit</label>
                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    className="form-control form-control-lg"
                  >
                    <option value="">-- Select Unit --</option>
                    <option value="pcs">Pieces (pcs)</option>
                    <option value="grams">Grams (g)</option>
                    <option value="set">Set</option>
                    <option value="pair">Pair</option>
                    <option value="dozen">Dozen</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Jewelry Details */}
          <div className="col-span-12 md:col-span-6">
            <div className="box">
              <div className="box-header">
                <h4 className="box-title">Jewelry Details (HBC)</h4>
              </div>
              <div className="box-body space-y-4">
                <div>
                  <label className="form-label">Weight (grams)</label>
                  <input
                    type="number"
                    name="weight"
                    value={formData.weight || ''}
                    onChange={handleChange}
                    className="form-control form-control-lg"
                    step="0.01"
                    min="0"
                  />
                </div>

                <div>
                  <label className="form-label">Purity</label>
                  <select
                    name="purity"
                    value={formData.purity}
                    onChange={handleChange}
                    className="form-control form-control-lg"
                  >
                    <option value="">-- Select Purity --</option>
                    <option value="24K">24K</option>
                    <option value="22K">22K</option>
                    <option value="18K">18K</option>
                    <option value="14K">14K</option>
                    <option value="10K">10K</option>
                    <option value="Sterling Silver">Sterling Silver</option>
                    <option value="Platinum">Platinum</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Material</label>
                  <select
                    name="material"
                    value={formData.material}
                    onChange={handleChange}
                    className="form-control form-control-lg"
                  >
                    <option value="">-- Select Material --</option>
                    <option value="Gold">Gold</option>
                    <option value="Silver">Silver</option>
                    <option value="Platinum">Platinum</option>
                    <option value="Diamond">Diamond</option>
                    <option value="Gemstone">Gemstone</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Design</label>
                  <input
                    type="text"
                    name="design"
                    value={formData.design}
                    onChange={handleChange}
                    className="form-control form-control-lg"
                    placeholder="e.g., Vintage, Modern, Traditional"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="col-span-12">
            <div className="box">
              <div className="box-header">
                <h4 className="box-title">Settings</h4>
              </div>
              <div className="box-body space-y-4">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={formData.isActive}
                      onChange={handleChange}
                      className="form-checkbox"
                    />
                    <span>Is Active</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      name="isFeatured"
                      checked={formData.isFeatured}
                      onChange={handleChange}
                      className="form-checkbox"
                    />
                    <span>Is Featured</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="col-span-12">
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={formLoading}
                className="ti-btn ti-btn-primary-full !text-white disabled:opacity-50"
              >
                {formLoading ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => router.push(`/items/${itemId}`)}
                className="ti-btn ti-btn-light !opacity-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </form>
    </Fragment>
  );
}
