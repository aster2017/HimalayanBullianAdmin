'use client';

import { Fragment, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useAppDispatch, useAppSelector } from '@/shared/redux/hooks';
import { fetchProductById } from '@/shared/redux/productsSlice';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';

const ProductDetailPage = () => {
  useProtectedRoute();

  const params = useParams();
  const id = params.id as string;
  const dispatch = useAppDispatch();
  const { currentProduct, loading, error } = useAppSelector((state) => state.products);

  const [quantity, setQuantity] = useState(1);

  useEffect(() => {
    if (id) {
      dispatch(fetchProductById(id));
    }
  }, [dispatch, id]);

  if (loading) {
    return (
      <Fragment>
        <Seo title="Product" />
        <div className="flex justify-center items-center h-96">
          <div className="text-center">
            <div className="inline-block">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="mt-4 text-[#8c9097]">Loading product...</p>
            </div>
          </div>
        </div>
      </Fragment>
    );
  }

  if (error || !currentProduct) {
    return (
      <Fragment>
        <Seo title="Product" />
        <div className="flex justify-center items-center h-96">
          <div className="text-center">
            <p className="text-danger mb-4">{error || 'Product not found'}</p>
            <Link href="/products">
              <button className="ti-btn ti-btn-primary !text-white">Back to Products</button>
            </Link>
          </div>
        </div>
      </Fragment>
    );
  }

  return (
    <Fragment>
      <Seo title={currentProduct.name} />

      <div className="md:flex block items-center justify-between my-[1.5rem] page-header-breadcrumb">
        <div>
          <p className="font-semibold text-[1.125rem] text-defaulttextcolor dark:text-defaulttextcolor/70 !mb-0">
            {currentProduct.name}
          </p>
        </div>
        <Link href="/products">
          <button className="ti-btn ti-btn-light mt-2 md:mt-0">Back to Products</button>
        </Link>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Product Images */}
        <div className="xl:col-span-5 col-span-12">
          <div className="box">
            {currentProduct.imageUrl ? (
              <div className="w-full aspect-square bg-gray-200 flex items-center justify-center overflow-hidden">
                <img
                  src={currentProduct.imageUrl}
                  alt={currentProduct.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-full aspect-square bg-gray-200 flex items-center justify-center">
                <span className="text-[#8c9097]">No image available</span>
              </div>
            )}

            {currentProduct.images && currentProduct.images.length > 0 && (
              <div className="box-body flex gap-2 overflow-x-auto">
                {currentProduct.images.map((image, index) => (
                  <img
                    key={index}
                    src={image.imageUrl}
                    alt={`Product ${index}`}
                    className="h-20 w-20 object-cover rounded cursor-pointer hover:opacity-75"
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Product Details */}
        <div className="xl:col-span-7 col-span-12">
          <div className="box">
            <div className="box-body">
              <h2 className="text-[1.5rem] font-semibold mb-2">{currentProduct.name}</h2>

              <div className="flex items-center gap-4 mb-4">
                <div>
                  <span className="text-[1.25rem] font-semibold text-primary">
                    Rs. {currentProduct.price?.toLocaleString('en-PK')}
                  </span>
                  {currentProduct.discountPrice && (
                    <span className="text-[0.875rem] text-[#8c9097] line-through ms-2">
                      Rs. {currentProduct.discountPrice?.toLocaleString('en-PK')}
                    </span>
                  )}
                </div>
              </div>

              {currentProduct.description && (
                <div className="mb-6">
                  <h4 className="font-semibold mb-2">Description</h4>
                  <p className="text-[#8c9097]">{currentProduct.description}</p>
                </div>
              )}

              {currentProduct.category && (
                <div className="mb-4">
                  <span className="text-[0.875rem]">
                    <span className="font-semibold">Category:</span> {currentProduct.category}
                  </span>
                </div>
              )}

              <div className="mb-6">
                <span className="text-[0.875rem]">
                  <span className="font-semibold">Availability:</span>{' '}
                  {currentProduct.stockQuantity > 0 ? (
                    <span className="text-success ms-2">In Stock ({currentProduct.stockQuantity})</span>
                  ) : (
                    <span className="text-danger ms-2">Out of Stock</span>
                  )}
                </span>
              </div>

              {currentProduct.stockQuantity > 0 && (
                <div className="flex gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    <label className="font-semibold">Quantity:</label>
                    <div className="flex items-center border rounded">
                      <button
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="px-3 py-2 hover:bg-gray-100"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        value={quantity}
                        onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-12 text-center border-0 outline-none"
                        min="1"
                        max={currentProduct.stockQuantity}
                      />
                      <button
                        onClick={() =>
                          setQuantity(Math.min(currentProduct.stockQuantity || 1, quantity + 1))
                        }
                        className="px-3 py-2 hover:bg-gray-100"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <button className="ti-btn ti-btn-primary !text-white flex-1">
                    Add to Cart
                  </button>
                </div>
              )}

              {currentProduct.sku && (
                <div className="text-[0.875rem] text-[#8c9097]">
                  <span className="font-semibold">SKU:</span> {currentProduct.sku}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Fragment>
  );
};

export default ProductDetailPage;
