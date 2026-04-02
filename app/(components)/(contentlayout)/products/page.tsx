'use client';

import { Fragment, useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/shared/redux/hooks';
import { fetchProducts, setFilters } from '@/shared/redux/productsSlice';
import { useProtectedRoute } from '@/shared/hooks/useProtectedRoute';
import Seo from '@/shared/layout-components/seo/seo';
import Link from 'next/link';

const ProductsPage = () => {
  useProtectedRoute();

  const dispatch = useAppDispatch();
  const { items, loading, error, pagination, filters } = useAppSelector((state) => state.products);

  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    dispatch(
      fetchProducts({
        page: currentPage,
        pageSize,
        filters,
      })
    );
  }, [dispatch, currentPage, filters]);

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    // Debounce search - in real app, you'd use useCallback with debounce
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <Fragment>
      <Seo title="Products" />

      <div className="md:flex block items-center justify-between my-[1.5rem] page-header-breadcrumb">
        <div>
          <p className="font-semibold text-[1.125rem] text-defaulttextcolor dark:text-defaulttextcolor/70 !mb-0">
            Products
          </p>
          <p className="font-normal text-[#8c9097] dark:text-white/50 text-[0.813rem]">
            Browse and manage our product catalog
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 mb-4 bg-danger/40 text-sm border-t-4 border-danger text-danger/60 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Search Bar */}
      <div className="box mb-6">
        <div className="box-body">
          <div className="grid grid-cols-12 gap-6">
            <div className="xl:col-span-12 col-span-12">
              <input
                type="text"
                className="form-control form-control-lg w-full"
                placeholder="Search products..."
                value={searchTerm}
                onChange={handleSearch}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-12 gap-6">
        {loading ? (
          <div className="col-span-12 text-center py-12">
            <div className="inline-block">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
              <p className="mt-4 text-[#8c9097]">Loading products...</p>
            </div>
          </div>
        ) : items.length === 0 ? (
          <div className="col-span-12 text-center py-12">
            <p className="text-[#8c9097]">No products found</p>
          </div>
        ) : (
          items.map((product) => (
            <div key={product.id} className="xl:col-span-3 lg:col-span-4 md:col-span-6 col-span-12">
              <div className="box overflow-hidden">
                {product.imageUrl && (
                  <div className="w-full h-48 bg-gray-200 overflow-hidden">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover hover:scale-110 transition-transform"
                    />
                  </div>
                )}
                <div className="box-body">
                  <h5 className="font-semibold text-[1rem] mb-2 line-clamp-2">{product.name}</h5>
                  <p className="text-[#8c9097] text-[0.875rem] mb-3 line-clamp-2">
                    {product.description}
                  </p>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-primary text-[1.125rem]">
                      Rs. {product.price?.toLocaleString('en-NP')}
                    </span>
                    {product.discountPrice && (
                      <span className="text-[0.75rem] bg-warning/20 text-warning px-2 py-1 rounded">
                        Sale
                      </span>
                    )}
                  </div>
                  <p className="text-[#8c9097] text-[0.75rem] mb-4">
                    {product.stockQuantity > 0
                      ? `${product.stockQuantity} in stock`
                      : 'Out of stock'}
                  </p>
                  <Link href={`/products/${product.id}`}>
                    <button className="ti-btn ti-btn-primary-full w-full !text-white">
                      View Details
                    </button>
                  </Link>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {!loading && items.length > 0 && pagination.totalCount > 0 && (
        <div className="flex justify-center mt-8">
          <nav aria-label="Page navigation">
            <ul className="flex gap-2">
              <li>
                <button
                  onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="ti-btn ti-btn-light disabled:opacity-50"
                >
                  Previous
                </button>
              </li>
              {Array.from({
                length: Math.ceil(pagination.totalCount / pageSize),
              }).map((_, index) => (
                <li key={index + 1}>
                  <button
                    onClick={() => handlePageChange(index + 1)}
                    className={`ti-btn ${
                      currentPage === index + 1
                        ? 'ti-btn-primary-full !text-white'
                        : 'ti-btn-light'
                    }`}
                  >
                    {index + 1}
                  </button>
                </li>
              ))}
              <li>
                <button
                  onClick={() =>
                    handlePageChange(
                      Math.min(
                        Math.ceil(pagination.totalCount / pageSize),
                        currentPage + 1
                      )
                    )
                  }
                  disabled={currentPage === Math.ceil(pagination.totalCount / pageSize)}
                  className="ti-btn ti-btn-light disabled:opacity-50"
                >
                  Next
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}
    </Fragment>
  );
};

export default ProductsPage;
