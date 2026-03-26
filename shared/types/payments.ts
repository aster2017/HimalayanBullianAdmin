/**
 * Payment related types
 */

/**
 * Payment method
 */
export type PaymentMethod = 'CreditCard' | 'DebitCard' | 'BankTransfer' | 'QR' | 'Cash';

/**
 * Payment status
 */
export type PaymentStatus = 'Pending' | 'Completed' | 'Failed';

/**
 * Payment record
 */
export interface Payment {
  id: string;
  paymentNumber: string;
  invoiceNumber?: string;
  amount: number;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  status: PaymentStatus;
  transactionId?: string;
  syncStatus: string;
}

/**
 * Initiate payment request
 */
export interface InitiatePaymentRequest {
  invoiceId: string;
  amount: number;
  paymentMethod: PaymentMethod;
}

/**
 * Payment initiation response
 */
export interface PaymentInitiationResponse {
  success: boolean;
  message: string;
  paymentSessionId: string;
  qrCode?: string;
  redirectUrl?: string;
  amount: number;
}

/**
 * Verify payment request
 */
export interface VerifyPaymentRequest {
  paymentSessionId: string;
  transactionId: string;
}

/**
 * Order payment status
 */
export interface OrderPaymentStatus {
  invoiceId: string;
  invoiceNumber: string;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: string;
  isPaid: boolean;
  payments: Payment[];
}

/**
 * Payments state in Redux
 */
export interface PaymentsState {
  items: Payment[];
  currentPayment: Payment | null;
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    pageSize: number;
    totalCount: number;
  };
}
