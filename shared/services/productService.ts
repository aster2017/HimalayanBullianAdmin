/**
 * Product service - handles all product-related API calls
 */

import apiClient from './apiClient';
import { ApiResponse, PagedResult, Product, ProductListItem, ProductFilters } from '@/shared/types';

/**
 * Product service class
 */
export class ProductService {
  /**
   * Get products with pagination and filters
   */
  static async getProducts(
    page: number = 1,
    pageSize: number = 20,
    filters?: ProductFilters
  ): Promise<PagedResult<ProductListItem>> {
    const params = {
      page,
      pageSize,
      ...filters,
    };

    const response = await apiClient.get<ApiResponse<PagedResult<ProductListItem>>>('/products', { params });
    return response.data.data!;
  }

  /**
   * Get product details by ID
   */
  static async getProductById(id: string): Promise<Product> {
    const response = await apiClient.get<ApiResponse<Product>>(`/products/${id}`);
    return response.data.data!;
  }

  /**
   * Get featured products
   */
  static async getFeaturedProducts(): Promise<Product[]> {
    const response = await apiClient.get<ApiResponse<Product[]>>('/products/featured');
    return response.data.data!;
  }

  /**
   * Get all product categories
   */
  static async getCategories(): Promise<string[]> {
    const response = await apiClient.get<ApiResponse<string[]>>('/products/categories');
    return response.data.data!;
  }

  /**
   * Search products by term
   */
  static async searchProducts(searchTerm: string, page: number = 1, pageSize: number = 20): Promise<PagedResult<ProductListItem>> {
    return this.getProducts(page, pageSize, { search: searchTerm });
  }

  /**
   * Get products by category
   */
  static async getProductsByCategory(category: string, page: number = 1, pageSize: number = 20): Promise<PagedResult<ProductListItem>> {
    return this.getProducts(page, pageSize, { category });
  }

  /**
   * Get products by price range
   */
  static async getProductsByPriceRange(
    minPrice: number,
    maxPrice: number,
    page: number = 1,
    pageSize: number = 20
  ): Promise<PagedResult<ProductListItem>> {
    return this.getProducts(page, pageSize, { minPrice, maxPrice });
  }
}
