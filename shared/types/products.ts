/**
 * Product and inventory related types
 */

/**
 * Product image
 */
export interface ProductImage {
  id: string;
  imageUrl: string;
  thumbnailUrl?: string;
  isPrimary: boolean;
  displayOrder: number;
}

/**
 * Product for listing (minimal info)
 */
export interface ProductListItem {
  id: string;
  name: string;
  sku?: string;
  rate: number;
  category?: string;
  stockOnHand: number;
  weight?: number;
  thumbnailUrl?: string;
  isFeatured: boolean;
}

/**
 * Product detailed view
 */
export interface Product {
  id: string;
  zohoItemId?: string;
  sku: string;
  name: string;
  description?: string;
  category?: string;
  subCategory?: string;
  weight?: number;
  purity?: string; // e.g., "22K", "24K"
  material?: string; // e.g., "Gold", "Silver"
  design?: string;
  rate: number;
  costPrice: number;
  taxName?: string;
  taxPercentage: number;
  discountPercentage?: number;
  stockOnHand: number;
  reorderLevel: number;
  unit?: string;
  isActive: boolean;
  isFeatured: boolean;
  images: ProductImage[];
  createdAt: string;
  updatedAt?: string;
}

/**
 * Create product request (admin)
 */
export interface CreateProductRequest {
  sku: string;
  name: string;
  description?: string;
  category?: string;
  subCategory?: string;
  weight?: number;
  purity?: string;
  material?: string;
  design?: string;
  rate: number;
  costPrice: number;
  taxName?: string;
  taxPercentage: number;
  discountPercentage?: number;
  stockOnHand: number;
  reorderLevel: number;
  unit?: string;
  isActive?: boolean;
  isFeatured?: boolean;
}

/**
 * Update product request (admin)
 */
export interface UpdateProductRequest {
  name: string;
  description?: string;
  category?: string;
  subCategory?: string;
  weight?: number;
  purity?: string;
  material?: string;
  design?: string;
  rate: number;
  costPrice: number;
  taxName?: string;
  taxPercentage: number;
  discountPercentage?: number;
  stockOnHand: number;
  reorderLevel: number;
  unit?: string;
  isActive: boolean;
  isFeatured: boolean;
}

/**
 * Product filters
 */
export interface ProductFilters {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  sortBy?: 'name' | 'price' | 'newest';
  sortDesc?: boolean;
}

/**
 * Products state in Redux
 */
export interface ProductsState {
  items: ProductListItem[];
  currentProduct: Product | null;
  featured: Product[];
  categories: string[];
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
  };
  filters: ProductFilters;
}
