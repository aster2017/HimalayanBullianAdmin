/**
 * Invoice related types
 */

/**
 * Invoice status
 */
export type InvoiceStatus = 'Draft' | 'Sent' | 'Paid' | 'Cancelled';

/**
 * Invoice line item
 */
export interface InvoiceLineItem {
  id: string;
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
 * Invoice
 */
export interface Invoice {
  id: string;
  invoiceNumber: string;
  orderNumber?: string;
  invoiceDate: string;
  dueDate: string;
  status: InvoiceStatus;
  subTotal: number;
  taxAmount: number;
  discountAmount: number;
  shippingCharges: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  lineItems?: InvoiceLineItem[];
}

/**
 * Invoice for listing
 */
export interface InvoiceListItem {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  status: InvoiceStatus;
  totalAmount: number;
  balanceAmount: number;
}

/**
 * Invoices state in Redux
 */
export interface InvoicesState {
  items: Invoice[];
  currentInvoice: Invoice | null;
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
  };
  statusFilter?: InvoiceStatus;
}
