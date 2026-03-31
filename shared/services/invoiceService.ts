/**
 * Invoice service - handles all invoice-related API calls
 */

import apiClient from './apiClient';
import { ApiResponse, PagedResult, Invoice, InvoiceStatus } from '@/shared/types';

/**
 * Invoice service class
 */
export class InvoiceService {
  /**
   * Get user's invoices with pagination
   */
  static async getInvoices(page: number = 1, pageSize: number = 20, status?: InvoiceStatus, search?: string): Promise<PagedResult<Invoice>> {
    const params: any = { page, pageSize };
    if (status) params.status = status;
    if (search) params.search = search;

    const response = await apiClient.get<ApiResponse<PagedResult<Invoice>>>('/invoices', { params });
    return response.data.data!;
  }

  /**
   * Get invoice details by ID
   */
  static async getInvoiceById(id: string): Promise<Invoice> {
    const response = await apiClient.get<ApiResponse<Invoice>>(`/invoices/${id}`);
    return response.data.data!;
  }

  /**
   * Download invoice as PDF
   */
  static async downloadInvoicePdf(id: string): Promise<Blob> {
    const response = await apiClient.get(`/invoices/${id}/download`, {
      responseType: 'blob',
    });
    return response.data;
  }

  /**
   * Download invoice PDF and open/save it
   */
  static async downloadAndOpenInvoicePdf(id: string, fileName?: string): Promise<void> {
    try {
      const blob = await this.downloadInvoicePdf(id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || `invoice-${id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download invoice PDF:', error);
      throw error;
    }
  }

  /**
   * Get unpaid invoices
   */
  static async getUnpaidInvoices(page: number = 1, pageSize: number = 20): Promise<PagedResult<Invoice>> {
    return this.getInvoices(page, pageSize, 'Sent');
  }

  /**
   * Get paid invoices
   */
  static async getPaidInvoices(page: number = 1, pageSize: number = 20): Promise<PagedResult<Invoice>> {
    return this.getInvoices(page, pageSize, 'Paid');
  }

  /**
   * Get invoices by status
   */
  static async getInvoicesByStatus(status: InvoiceStatus, page: number = 1, pageSize: number = 20): Promise<PagedResult<Invoice>> {
    return this.getInvoices(page, pageSize, status);
  }
}
