/**
 * Customer types and interfaces
 */

/**
 * Customer profile information
 */
export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  phoneNumber?: string;
  address?: Address;
  createdAt: string;
  updatedAt?: string;
  totalOrders: number;
  lifetimeValue: number;
  lastOrderDate?: string;
  isActive: boolean;
}

/**
 * Create customer request
 */
export interface CreateCustomerRequest {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
}

/**
 * Update customer request
 */
export interface UpdateCustomerRequest {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
}

/**
 * Customer with extended details
 */
export interface CustomerDetail extends Customer {
  orders?: any[];
  invoices?: any[];
  addresses?: Address[];
}

/**
 * Address information
 */
export interface Address {
  id: string;
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country?: string;
  addressType?: 'billing' | 'shipping' | 'both';
}

/**
 * Customer list response
 */
export interface CustomerListResponse {
  items: Customer[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
}

/**
 * Customer state in Redux
 */
export interface CustomersState {
  list: Customer[];
  detail: CustomerDetail | null;
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  currentPage: number;
  pageSize: number;
}
