'use client';

import { Fragment, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/shared/redux/hooks';
import { createOrder } from '@/shared/redux/ordersSlice';
import { fetchProducts } from '@/shared/redux/productsSlice';
import { fetchAddresses } from '@/shared/redux/addressesSlice';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';

interface OrderLineItem {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

const CreateOrderPage = () => {
  useProtectedRoute();

  const router = useRouter();
  const dispatch = useAppDispatch();
  const { items: products } = useAppSelector((state) => state.products);
  const { items: addresses } = useAppSelector((state) => state.addresses);
  const { isLoading, error } = useAppSelector((state) => state.orders);

  const [lineItems, setLineItems] = useState<OrderLineItem[]>([]);
  const [billingAddressId, setBillingAddressId] = useState('');
  const [shippingAddressId, setShippingAddressId] = useState('');
  const [validationError, setValidationError] = useState('');

  useEffect(() => {
    dispatch(fetchProducts({ page: 1, pageSize: 100 }));
    dispatch(fetchAddresses());
  }, [dispatch]);

  const handleAddItem = () => {
    setLineItems([
      ...lineItems,
      {
        productId: '',
        productName: '',
        quantity: 1,
        unitPrice: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (
    index: number,
    field: keyof OrderLineItem,
    value: any
  ) => {
    const updatedItems = [...lineItems];

    if (field === 'productId') {
      const product = products.find((p) => p.id === value);
      updatedItems[index] = {
        ...updatedItems[index],
        productId: value,
        productName: product?.name || '',
        unitPrice: product?.price || 0,
      };
    } else {
      updatedItems[index] = {
        ...updatedItems[index],
        [field]: value,
      };
    }

    setLineItems(updatedItems);
  };

  const calculateTotal = () => {
    return lineItems.reduce((total, item) => total + item.quantity * item.unitPrice, 0);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setValidationError('');

    if (lineItems.length === 0) {
      setValidationError('Please add at least one item');
      return;
    }

    if (!billingAddressId) {
      setValidationError('Please select a billing address');
      return;
    }

    dispatch(
      createOrder({
        lineItems: lineItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
        billingAddressId,
        shippingAddressId: shippingAddressId || billingAddressId,
      })
    ).then((action) => {
      if (action.type === createOrder.fulfilled.type) {
        router.push('/orders');
      }
    });
  };

  return (
    <Fragment>
      <Seo title="Create Order" />

      <div className="md:flex block items-center justify-between my-[1.5rem] page-header-breadcrumb">
        <div>
          <p className="font-semibold text-[1.125rem] text-defaulttextcolor dark:text-defaulttextcolor/70 !mb-0">
            Create Order
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.push('/orders')}
          className="ti-btn ti-btn-light mt-2 md:mt-0 !opacity-100"
        >
          Back to Orders
        </button>
      </div>

      {(error || validationError) && (
        <div className="p-4 mb-4 bg-danger/40 text-sm border-t-4 border-danger text-danger/60 rounded-lg">
          {error || validationError}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-12 gap-6">
          {/* Line Items */}
          <div className="col-span-12">
            <div className="box">
              <div className="box-header">
                <div className="flex justify-between items-center">
                  <h4 className="box-title">Order Items</h4>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="ti-btn ti-btn-primary-full !text-white"
                  >
                    <i className="ri-add-line inline-block me-2"></i>Add Item
                  </button>
                </div>
              </div>
              <div className="box-body">
                {lineItems.length === 0 ? (
                  <p className="text-[#8c9097]">No items added. Click "Add Item" to start.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="ti-custom-table ti-striped-table">
                      <thead>
                        <tr>
                          <th>Product</th>
                          <th>Quantity</th>
                          <th>Unit Price</th>
                          <th>Total</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.map((item, index) => (
                          <tr key={index}>
                            <td>
                              <select
                                value={item.productId}
                                onChange={(e) =>
                                  handleItemChange(index, 'productId', e.target.value)
                                }
                                className="form-control"
                                required
                              >
                                <option value="">Select Product</option>
                                {products.map((product) => (
                                  <option key={product.id} value={product.id}>
                                    {product.name}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td>
                              <input
                                type="number"
                                min="1"
                                value={item.quantity}
                                onChange={(e) =>
                                  handleItemChange(
                                    index,
                                    'quantity',
                                    parseInt(e.target.value) || 0
                                  )
                                }
                                className="form-control w-20"
                                required
                              />
                            </td>
                            <td>
                              <input
                                type="number"
                                step="0.01"
                                value={item.unitPrice}
                                readOnly
                                className="form-control w-24"
                              />
                            </td>
                            <td>
                              <span className="font-semibold">
                                Rs. {(item.quantity * item.unitPrice).toLocaleString('en-PK')}
                              </span>
                            </td>
                            <td>
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(index)}
                                className="ti-btn ti-btn-danger !text-white !whitespace-nowrap !bg-danger !opacity-100"
                              >
                                Remove
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {lineItems.length > 0 && (
                  <div className="flex justify-end mt-6 pt-6 border-t">
                    <div className="w-80">
                      <div className="flex justify-between mb-4">
                        <span className="font-semibold">Order Total:</span>
                        <span className="font-semibold text-primary text-[1.125rem]">
                          Rs. {calculateTotal().toLocaleString('en-PK')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Addresses */}
          <div className="xl:col-span-6 col-span-12">
            <div className="box">
              <div className="box-header">
                <h4 className="box-title">Billing Address</h4>
              </div>
              <div className="box-body">
                <select
                  value={billingAddressId}
                  onChange={(e) => setBillingAddressId(e.target.value)}
                  className="form-control form-control-lg"
                  required
                >
                  <option value="">Select Billing Address</option>
                  {addresses.map((address) => (
                    <option key={address.id} value={address.id}>
                      {address.street}, {address.city}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="xl:col-span-6 col-span-12">
            <div className="box">
              <div className="box-header">
                <h4 className="box-title">Shipping Address</h4>
              </div>
              <div className="box-body">
                <select
                  value={shippingAddressId}
                  onChange={(e) => setShippingAddressId(e.target.value)}
                  className="form-control form-control-lg"
                >
                  <option value="">Same as Billing</option>
                  {addresses.map((address) => (
                    <option key={address.id} value={address.id}>
                      {address.street}, {address.city}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="col-span-12">
            <div className="flex gap-4">
              <button
                type="submit"
                disabled={isLoading}
                className="ti-btn ti-btn-primary-full !text-white disabled:opacity-50"
              >
                {isLoading ? 'Creating Order...' : 'Create Order'}
              </button>
              <button type="button" onClick={() => router.push('/orders')} className="ti-btn ti-btn-light !opacity-100">
                Cancel
              </button>
            </div>
          </div>
        </div>
      </form>
    </Fragment>
  );
};

export default CreateOrderPage;
