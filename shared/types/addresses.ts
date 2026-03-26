/**
 * Address related types
 */

/**
 * Address type
 */
export type AddressType = 'Billing' | 'Shipping' | 'Both';

/**
 * Customer address
 */
export interface Address {
  id: string;
  addressType: AddressType;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phoneNumber: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Create address request
 */
export interface CreateAddressRequest {
  addressType: AddressType;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phoneNumber: string;
  isDefault?: boolean;
}

/**
 * Update address request
 */
export interface UpdateAddressRequest {
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phoneNumber: string;
  isDefault: boolean;
}

/**
 * Addresses state in Redux
 */
export interface AddressesState {
  items: Address[];
  currentAddress: Address | null;
  loading: boolean;
  error: string | null;
  billingAddresses: Address[];
  shippingAddresses: Address[];
}
