/**
 * Item service - handles all inventory/item-related API calls
 */

import apiClient from './apiClient';
import {
  ApiResponse,
  Item,
  CreateItemRequest,
  UpdateItemRequest,
  StockAdjustmentRequest,
  ItemListResponse,
  ItemStats,
  StockTransaction,
  ItemFilters,
} from '@/shared/types';

/**
 * Item service class
 */
export class ItemService {
  /**
   * Get all items with pagination and filters
   */
  static async getItems(
    page: number = 1,
    pageSize: number = 20,
    filters?: Partial<ItemFilters>
  ): Promise<ItemListResponse> {
    try {
      const params: any = { page, pageSize };
      if (filters?.category) params.category = filters.category;
      if (filters?.status) params.status = filters.status;
      if (filters?.search) params.search = filters.search;

      const response = await apiClient.get<ApiResponse<ItemListResponse>>('/items', { params });
      return response.data.data || { items: [], totalCount: 0, pageNumber: page, pageSize };
    } catch (error) {
      console.error('Error fetching items:', error);
      throw error;
    }
  }

  /**
   * Get item by ID
   */
  static async getItemById(id: string): Promise<Item> {
    try {
      const response = await apiClient.get<ApiResponse<Item>>(`/items/${id}`);
      return response.data.data || ({} as Item);
    } catch (error) {
      console.error(`Error fetching item ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create new item
   */
  static async createItem(data: CreateItemRequest): Promise<Item> {
    try {
      const response = await apiClient.post<ApiResponse<Item>>('/items', data);
      return response.data.data || ({} as Item);
    } catch (error) {
      console.error('Error creating item:', error);
      throw error;
    }
  }

  /**
   * Update item
   */
  static async updateItem(id: string, data: UpdateItemRequest): Promise<Item> {
    try {
      const response = await apiClient.put<ApiResponse<Item>>(`/items/${id}`, data);
      return response.data.data || ({} as Item);
    } catch (error) {
      console.error(`Error updating item ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete item
   */
  static async deleteItem(id: string): Promise<void> {
    try {
      await apiClient.delete(`/items/${id}`);
    } catch (error) {
      console.error(`Error deleting item ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get stock history for an item
   */
  static async getStockHistory(itemId: string, page: number = 1, pageSize: number = 20): Promise<StockTransaction[]> {
    try {
      const response = await apiClient.get(`/items/${itemId}/stock-history`, {
        params: { page, pageSize },
      });
      return response.data.data || [];
    } catch (error) {
      console.error(`Error fetching stock history for item ${itemId}:`, error);
      return [];
    }
  }

  /**
   * Adjust stock for an item
   */
  static async adjustStock(itemId: string, adjustment: StockAdjustmentRequest): Promise<Item> {
    try {
      const response = await apiClient.post<ApiResponse<Item>>(`/items/${itemId}/adjust-stock`, adjustment);
      return response.data.data || ({} as Item);
    } catch (error) {
      console.error(`Error adjusting stock for item ${itemId}:`, error);
      throw error;
    }
  }

  /**
   * Get items by category
   */
  static async getItemsByCategory(category: string, page: number = 1, pageSize: number = 20): Promise<ItemListResponse> {
    try {
      const response = await apiClient.get<ApiResponse<ItemListResponse>>(`/items/category/${category}`, {
        params: { page, pageSize },
      });
      return response.data.data || { items: [], totalCount: 0, pageNumber: page, pageSize };
    } catch (error) {
      console.error(`Error fetching items by category ${category}:`, error);
      throw error;
    }
  }

  /**
   * Get low stock items
   */
  static async getLowStockItems(pageSize: number = 50): Promise<Item[]> {
    try {
      const response = await apiClient.get<ApiResponse<Item[]>>('/items/stock-status/low-stock', {
        params: { pageSize },
      });
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching low stock items:', error);
      return [];
    }
  }

  /**
   * Get out of stock items
   */
  static async getOutOfStockItems(pageSize: number = 50): Promise<Item[]> {
    try {
      const response = await apiClient.get<ApiResponse<Item[]>>('/items/stock-status/out-of-stock', {
        params: { pageSize },
      });
      return response.data.data || [];
    } catch (error) {
      console.error('Error fetching out of stock items:', error);
      return [];
    }
  }

  /**
   * Get item statistics
   */
  static async getItemStats(): Promise<ItemStats> {
    try {
      const response = await apiClient.get<ApiResponse<ItemStats>>('/items/stats');
      return response.data.data || { total: 0, lowStock: 0, outOfStock: 0, totalValue: 0 };
    } catch (error) {
      console.error('Error fetching item stats:', error);
      return { total: 0, lowStock: 0, outOfStock: 0, totalValue: 0 };
    }
  }

  /**
   * Search items by name, SKU, or category
   */
  static async searchItems(searchTerm: string, page: number = 1, pageSize: number = 20): Promise<ItemListResponse> {
    try {
      // Use the main /items endpoint with search query parameter
      return await this.getItems(page, pageSize, { search: searchTerm });
    } catch (error) {
      console.error('Error searching items:', error);
      return { items: [], totalCount: 0, pageNumber: page, pageSize };
    }
  }

  /**
   * Bulk upload items from CSV
   */
  static async bulkUploadItems(file: File): Promise<{ successCount: number; errorCount: number; errors: string[] }> {
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post('/items/bulk-upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data.data || { successCount: 0, errorCount: 0, errors: [] };
    } catch (error) {
      console.error('Error bulk uploading items:', error);
      throw error;
    }
  }
}
