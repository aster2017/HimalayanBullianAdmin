import { getAuthHeaders } from './apiConfig';

const API = process.env.NEXT_PUBLIC_API_URL;

export interface CustomerResult {
  id: string; name: string; email: string;
  customerNumber?: string; isApproved: boolean; phone?: string;
}
export interface OrderResult {
  id: string; orderNumber: string; customerName: string;
  status: string; totalAmount: number;
}
export interface InvoiceResult {
  id: string; invoiceNumber: string; customerName: string;
  totalAmount: number; status: string;
}
export interface ProductResult {
  id: string; name: string; weightGrams: number; pricePerGram: number;
}
export interface PaymentResult {
  id: string; paymentNumber: string; customerName: string;
  amount: number; status: string; method: string;
}
export interface NchlTransactionResult {
  localId: string; nchlTxnId: string; amount: number;
  customerId: string; customerName: string; hbcStatus: string;
  verifyAttempts: number; lastVerifyAttemptAt?: string;
  createdAt: string; lastCallType?: string;
}
export interface SearchResult {
  customers: CustomerResult[];
  orders: OrderResult[];
  invoices: InvoiceResult[];
  products: ProductResult[];
  payments: PaymentResult[];
  nchlTransactions: NchlTransactionResult[];
}
export interface NchlProbeResult {
  txnId: string; status: string; statusDesc: string;
  httpStatus: number; validateUrl: string; hbcStatus: string;
}

export type SearchType = 'customers' | 'orders' | 'invoices' | 'products' | 'payments' | 'nchl';

export async function globalSearch(q: string, types?: SearchType[]): Promise<SearchResult> {
  const params = new URLSearchParams({ q });
  if (types?.length) params.set('types', types.join(','));
  const res = await fetch(`${API}/search?${params}`, { headers: getAuthHeaders() });
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}

export async function probeNchlTransaction(localTransactionId: string): Promise<{
  success: boolean; cached: boolean; probe: NchlProbeResult; hbcStatus: string;
}> {
  const res = await fetch(`${API}/search/nchl-probe`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ localTransactionId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Probe failed');
  }
  return res.json();
}
