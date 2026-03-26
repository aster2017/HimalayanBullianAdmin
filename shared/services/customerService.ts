/**
 * Customer service - handles all customer-related API calls
 */

import apiClient from './apiClient';
import {
  ApiResponse,
  Customer,
  CreateCustomerRequest,
  UpdateCustomerRequest,
  CustomerListResponse,
} from '@/shared/types';

/**
 * Customer service class
 */
export class CustomerService {
  /**
   * Get all customers with pagination
   */
  static async getCustomers(page: number = 1, pageSize: number = 20): Promise<CustomerListResponse> {
    try {
      const response = await apiClient.get<ApiResponse<CustomerListResponse>>('/customers', {
        params: { page, pageSize },
      });
      return response.data.data || { items: [], totalCount: 0, pageNumber: page, pageSize };
    } catch (error) {
      console.error('Error fetching customers:', error);
      throw error;
    }
  }

  /**
   * Get customer by ID
   */
  static async getCustomerById(id: string): Promise<Customer> {
    try {
      const response = await apiClient.get<ApiResponse<Customer>>(`/customers/${id}`);
      return response.data.data || {} as Customer;
    } catch (error) {
      console.error(`Error fetching customer ${id}:`, error);
      throw error;
    }
  }

  /**
   * Create new customer
   */
  static async createCustomer(data: CreateCustomerRequest): Promise<Customer> {
    try {
      const response = await apiClient.post<ApiResponse<Customer>>('/customers', data);
      return response.data.data || {} as Customer;
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  }

  /**
   * Update customer
   */
  static async updateCustomer(id: string, data: UpdateCustomerRequest): Promise<Customer> {
    try {
      const response = await apiClient.put<ApiResponse<Customer>>(`/customers/${id}`, data);
      return response.data.data || {} as Customer;
    } catch (error) {
      console.error(`Error updating customer ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete customer
   */
  static async deleteCustomer(id: string): Promise<void> {
    try {
      await apiClient.delete(`/customers/${id}`);
    } catch (error) {
      console.error(`Error deleting customer ${id}:`, error);
      throw error;
    }
  }

  /**
   * Get customer orders
   */
  static async getCustomerOrders(customerId: string, page: number = 1, pageSize: number = 10): Promise<any> {
    try {
      const response = await apiClient.get(`/customers/${customerId}/orders`, {
        params: { page, pageSize },
      });
      return response.data.data || [];
    } catch (error) {
      console.error(`Error fetching orders for customer ${customerId}:`, error);
      throw error;
    }
  }

  /**
   * Get customer invoices
   */
  static async getCustomerInvoices(customerId: string, page: number = 1, pageSize: number = 10): Promise<any> {
    try {
      const response = await apiClient.get(`/customers/${customerId}/invoices`, {
        params: { page, pageSize },
      });
      return response.data.data || [];
    } catch (error) {
      console.error(`Error fetching invoices for customer ${customerId}:`, error);
      throw error;
    }
  }

  /**
   * Get customer lifetime value
   */
  static async getCustomerLifetimeValue(customerId: string): Promise<number> {
    try {
      const response = await apiClient.get(`/customers/${customerId}/lifetime-value`);
      return response.data.data?.lifetimeValue || 0;
    } catch (error) {
      console.error(`Error fetching lifetime value for customer ${customerId}:`, error);
      return 0;
    }
  }

  /**
   * Search customers by name or email
   */
  static async searchCustomers(searchTerm: string, page: number = 1, pageSize: number = 20): Promise<CustomerListResponse> {
    try {
      const response = await apiClient.get<ApiResponse<CustomerListResponse>>('/customers/search', {
        params: { q: searchTerm, page, pageSize },
      });
      return response.data.data || { items: [], totalCount: 0, pageNumber: page, pageSize };
    } catch (error) {
      // Fallback to regular getCustomers if search endpoint doesn't exist
      console.error('Search failed, falling back to list:', error);
      return this.getCustomers(page, pageSize);
    }
  }

  /**
   * Get customer statistics
   */
  static async getCustomerStats(): Promise<{ total: number; newThisMonth: number; avgLifetimeValue: number }> {
    try {
      const response = await apiClient.get('/customers/stats');
      return response.data.data || { total: 0, newThisMonth: 0, avgLifetimeValue: 0 };
    } catch (error) {
      console.error('Error fetching customer stats:', error);
      return { total: 0, newThisMonth: 0, avgLifetimeValue: 0 };
    }
  }
}
