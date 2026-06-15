/**
 * ConnectIPS / NCHL probe service — admin diagnostics.
 * Targets whatever environment THIS API instance is configured for
 * (UAT on staging, Production on prod). Cert/signing stay server-side.
 */

import apiClient from './apiClient';

export interface ConnectIpsConfig {
  environment: 'UAT' | 'Production';
  appId: string;
  merchantId: string;
  appName: string;
  gatewayUrl: string;
  validateUrl: string;
  mockMode: boolean;
}

export interface ConnectIpsProbeResult {
  validateUrl: string;
  canonical: string;
  signedToken: string;
  requestBody: string;
  httpStatus: number;
  responseBody: string;
  status: string;      // SUCCESS | FAILED | ERROR
  statusDesc: string;  // e.g. "TRANSACTION NOT FOUND"
}

export class ConnectIpsService {
  /** Non-secret config summary (environment, appId, URLs, mockMode). */
  static async getConfig(): Promise<ConnectIpsConfig> {
    const res = await apiClient.get('/admin/connectips/config');
    const body = res.data;
    if (!body?.success) throw new Error(body?.message || 'Failed to load ConnectIPS config');
    return body.data as ConnectIpsConfig;
  }

  /**
   * Signs the 4-field canonical and calls NCHL /validatetxn for the given
   * TXNID + amount. Read-only — no money moves. A random/unknown TXNID
   * returning httpStatus 200 + "TRANSACTION NOT FOUND" proves cert + Basic
   * Auth + signature + connectivity all work.
   */
  static async probeValidateTxn(txnId: string, amount: number): Promise<ConnectIpsProbeResult> {
    const res = await apiClient.post('/admin/connectips/probe-validatetxn', { txnId, amount });
    const body = res.data;
    if (!body?.success) throw new Error(body?.message || 'Probe failed');
    return body.data as ConnectIpsProbeResult;
  }
}

export default ConnectIpsService;
