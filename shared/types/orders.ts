/**
 * Order and sales related types
 */

/**
 * Order statuses
 */
export type OrderStatus = 'Draft' | 'Confirmed' | 'Converted' | 'Cancelled';

/**
 * Order line item in order
 */
export interface OrderLineItem {
  id: string;
  itemId: string;
  itemName: string;
  sku?: string;
  quantity: number;
  rate: number;
  taxPercentage: number;
  taxAmount: number;
  discountAmount: number;
  lineTotal: number;
}

/**
 * Sales order (order in the system)
 */
export interface SalesOrder {
  id: string;
  zohoSalesOrderId?: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  orderDate: string;
  status: OrderStatus;
  subTotal: number;
  taxAmount: number;
  discountAmount: number;
  shippingCharges: number;
  totalAmount: number;
  customerNotes?: string;
  lineItems: OrderLineItem[];
  createdAt: string;
  updatedAt?: string;
}

/**
 * Order for listing
 */
export interface OrderListItem {
  id: string;
  orderNumber: string;
  orderDate: string;
  status: OrderStatus;
  totalAmount: number;
}

/**
 * Create order line item request
 */
export interface CreateOrderLineItem {
  itemId: string;
  quantity: number;
  rate: number;
  taxPercentage: number;
  discountAmount?: number;
}

/**
 * Create sales order request
 */
export interface CreateOrderRequest {
  customerId: string;
  orderDate: string;
  customerNotes?: string;
  billingAddressId?: string;
  shippingAddressId?: string;
  lineItems: CreateOrderLineItem[];
}

/**
 * Update order request
 */
export interface UpdateOrderRequest {
  customerNotes?: string;
  billingAddressId?: string;
  shippingAddressId?: string;
  lineItems: CreateOrderLineItem[];
}

/**
 * Orders state in Redux
 */
export interface OrdersState {
  items: SalesOrder[];
  currentOrder: SalesOrder | null;
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
  };
  statusFilter?: OrderStatus;
}
