/**
 * Order service - handles all order-related API calls
 */

import apiClient from './apiClient';
import {
  ApiResponse,
  PagedResult,
  SalesOrder,
  CreateOrderRequest,
  UpdateOrderRequest,
  OrderStatus,
  Invoice,
} from '@/shared/types';

/**
 * Order service class
 */
export class OrderService {
  /**
   * Get user's orders with pagination
   */
  static async getOrders(page: number = 1, pageSize: number = 20, status?: OrderStatus): Promise<PagedResult<SalesOrder>> {
    const params: any = { page, pageSize };
    if (status) {
      params.status = status;
    }

    const response = await apiClient.get<ApiResponse<PagedResult<SalesOrder>>>('/orders', { params });
    return response.data.data!;
  }

  /**
   * Get order details by ID
   */
  static async getOrderById(id: string): Promise<SalesOrder> {
    const response = await apiClient.get<ApiResponse<SalesOrder>>(`/orders/${id}`);
    return response.data.data!;
  }

  /**
   * Create new order
   */
  static async createOrder(request: CreateOrderRequest): Promise<SalesOrder> {
    const response = await apiClient.post<ApiResponse<SalesOrder>>('/orders', request);
    return response.data.data!;
  }

  /**
   * Update order (draft orders only)
   */
  static async updateOrder(id: string, request: UpdateOrderRequest): Promise<SalesOrder> {
    const response = await apiClient.put<ApiResponse<SalesOrder>>(`/orders/${id}`, request);
    return response.data.data!;
  }

  /**
   * Cancel/delete order (draft orders only)
   */
  static async deleteOrder(id: string): Promise<void> {
    await apiClient.delete<ApiResponse<boolean>>(`/orders/${id}`);
  }

  /**
   * Convert order to invoice
   */
  static async convertToInvoice(id: string): Promise<Invoice> {
    const response = await apiClient.post<ApiResponse<Invoice>>(`/orders/${id}/convert-to-invoice`);
    return response.data.data!;
  }

  /**
   * Get draft orders
   */
  static async getDraftOrders(page: number = 1, pageSize: number = 20): Promise<PagedResult<SalesOrder>> {
    return this.getOrders(page, pageSize, 'Draft');
  }

  /**
   * Get confirmed orders
   */
  static async getConfirmedOrders(page: number = 1, pageSize: number = 20): Promise<PagedResult<SalesOrder>> {
    return this.getOrders(page, pageSize, 'Confirmed');
  }
}
