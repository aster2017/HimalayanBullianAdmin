/**
 * Payment provider enable/disable (admin). Master switch per provider + a per-context
 * kill-switch (wallet / target / invoice). Backed by /admin/payments/toggles.
 */

import apiClient from './apiClient';

export type PaymentProvider = 'ConnectIps' | 'Fonepay';
export type PaymentPurpose = 'CreditTopup' | 'TargetPayment' | 'InvoicePayment';

export const PROVIDERS: { key: PaymentProvider; label: string }[] = [
  { key: 'ConnectIps', label: 'ConnectIPS / NCHL' },
  { key: 'Fonepay', label: 'Checkout by Fonepay' },
];

export const PURPOSES: { key: PaymentPurpose; label: string }[] = [
  { key: 'CreditTopup', label: 'Wallet top-up' },
  { key: 'TargetPayment', label: 'Target payments' },
  { key: 'InvoicePayment', label: 'Order / invoice checkout' },
];

/** Toggle keys mirror the backend: payment_<provider>_enabled / payment_<provider>_<purpose>_enabled. */
export const providerKey = (p: PaymentProvider) => `payment_${p.toLowerCase()}_enabled`;
export const contextKey = (p: PaymentProvider, c: PaymentPurpose) => `payment_${p.toLowerCase()}_${c.toLowerCase()}_enabled`;

export class PaymentTogglesService {
  static async getMatrix(): Promise<Record<string, boolean>> {
    const res = await apiClient.get('/admin/payments/toggles');
    if (!res.data?.success) throw new Error(res.data?.message || 'Failed to load payment toggles');
    return res.data.toggles as Record<string, boolean>;
  }

  static async setProvider(provider: PaymentProvider, enabled: boolean): Promise<void> {
    const res = await apiClient.put(`/admin/payments/provider/${provider}`, { enabled });
    if (!res.data?.success) throw new Error(res.data?.message || 'Failed to update provider');
  }

  static async setContext(provider: PaymentProvider, purpose: PaymentPurpose, enabled: boolean): Promise<void> {
    const res = await apiClient.put(`/admin/payments/context/${provider}/${purpose}`, { enabled });
    if (!res.data?.success) throw new Error(res.data?.message || 'Failed to update context');
  }
}
