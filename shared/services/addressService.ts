/**
 * Address service - handles all address-related API calls
 */

import apiClient from './apiClient';
import { ApiResponse, Address, CreateAddressRequest, UpdateAddressRequest, AddressType } from '@/shared/types';

/**
 * Address service class
 */
export class AddressService {
  /**
   * Get all user addresses
   */
  static async getAddresses(): Promise<Address[]> {
    const response = await apiClient.get<ApiResponse<Address[]>>('/addresses');
    return response.data.data!;
  }

  /**
   * Get address by ID
   */
  static async getAddressById(id: string): Promise<Address> {
    const response = await apiClient.get<ApiResponse<Address>>(`/addresses/${id}`);
    return response.data.data!;
  }

  /**
   * Create new address
   */
  static async createAddress(request: CreateAddressRequest): Promise<Address> {
    const response = await apiClient.post<ApiResponse<Address>>('/addresses', request);
    return response.data.data!;
  }

  /**
   * Update address
   */
  static async updateAddress(id: string, request: UpdateAddressRequest): Promise<Address> {
    const response = await apiClient.put<ApiResponse<Address>>(`/addresses/${id}`, request);
    return response.data.data!;
  }

  /**
   * Delete address (soft delete)
   */
  static async deleteAddress(id: string): Promise<void> {
    await apiClient.delete<ApiResponse<boolean>>(`/addresses/${id}`);
  }

  /**
   * Set address as default
   */
  static async setDefaultAddress(id: string): Promise<void> {
    await apiClient.post<ApiResponse<boolean>>(`/addresses/${id}/set-default`);
  }

  /**
   * Get billing addresses
   */
  static async getBillingAddresses(): Promise<Address[]> {
    const addresses = await this.getAddresses();
    return addresses.filter((a) => a.addressType === 'Billing' || a.addressType === 'Both');
  }

  /**
   * Get shipping addresses
   */
  static async getShippingAddresses(): Promise<Address[]> {
    const addresses = await this.getAddresses();
    return addresses.filter((a) => a.addressType === 'Shipping' || a.addressType === 'Both');
  }

  /**
   * Get default address by type
   */
  static async getDefaultAddress(type: AddressType): Promise<Address | null> {
    const addresses = await this.getAddresses();
    return addresses.find((a) => a.isDefault && (a.addressType === type || a.addressType === 'Both')) || null;
  }
}
