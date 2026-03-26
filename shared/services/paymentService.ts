/**
 * Payment service - handles all payment-related API calls
 */

import apiClient from './apiClient';
import {
  ApiResponse,
  PagedResult,
  Payment,
  InitiatePaymentRequest,
  PaymentInitiationResponse,
  VerifyPaymentRequest,
  OrderPaymentStatus,
} from '@/shared/types';

/**
 * Payment service class
 */
export class PaymentService {
  /**
   * Get user's payment history
   */
  static async getPayments(page: number = 1, pageSize: number = 20): Promise<PagedResult<Payment>> {
    const response = await apiClient.get<ApiResponse<PagedResult<Payment>>>('/payments', {
      params: { page, pageSize },
    });
    return response.data.data!;
  }

  /**
   * Get payment details by ID
   */
  static async getPaymentById(id: string): Promise<Payment> {
    const response = await apiClient.get<ApiResponse<Payment>>(`/payments/${id}`);
    return response.data.data!;
  }

  /**
   * Initiate payment for an invoice
   */
  static async initiatePayment(request: InitiatePaymentRequest): Promise<PaymentInitiationResponse> {
    const response = await apiClient.post<ApiResponse<PaymentInitiationResponse>>('/payments/initiate', request);
    return response.data.data!;
  }

  /**
   * Verify payment completion
   */
  static async verifyPayment(request: VerifyPaymentRequest): Promise<Payment> {
    const response = await apiClient.post<ApiResponse<Payment>>('/payments/verify', request);
    return response.data.data!;
  }

  /**
   * Get payment status for an order
   */
  static async getOrderPaymentStatus(orderId: string): Promise<OrderPaymentStatus> {
    const response = await apiClient.get<ApiResponse<OrderPaymentStatus>>(`/payments/order/${orderId}/status`);
    return response.data.data!;
  }

  /**
   * Check if order is paid
   */
  static async isOrderPaid(orderId: string): Promise<boolean> {
    const status = await this.getOrderPaymentStatus(orderId);
    return status.isPaid;
  }

  /**
   * Get remaining balance for order
   */
  static async getOrderBalance(orderId: string): Promise<number> {
    const status = await this.getOrderPaymentStatus(orderId);
    return status.balanceAmount;
  }
}
