/**
 * Sync Dashboard Service - API calls for Zoho sync monitoring
 */

import apiClient from './apiClient';

// Types
export interface SyncHealth {
  zohoConnected: boolean;
  tokenExpiresAt: string | null;
  apiCallsLastMinute: number;
  apiCallsToday: number;
  unresolvedErrorCount: number;
  pendingChangesCount: number;
  checkpoints: SyncCheckpoint[];
}

export interface SyncCheckpoint {
  entityType: string;
  direction: string;
  lastSyncedAt: string;
  lastSyncRecordCount: number;
  isComplete: boolean;
}

export interface SyncError {
  id: string;
  entityType: string;
  entityId: string;
  zohoEntityId: string | null;
  operation: string;
  direction: string;
  errorMessage: string;
  errorDetails: string | null;
  httpStatusCode: number | null;
  attemptCount: number;
  status: string;
  createdAt: string;
}

export interface SyncLog {
  id: string;
  entityType: string;
  entityId: string;
  operation: string;
  direction: string;
  status: string;
  zohoEntityId: string | null;
  errorMessage: string | null;
  attemptCount: number;
  createdAt: string;
  completedAt: string | null;
  durationMs: number | null;
}

export interface SyncLogFilter {
  entityType?: string;
  status?: string;
  direction?: string;
  fromDate?: string;
  toDate?: string;
  pageNumber?: number;
  pageSize?: number;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export interface EntityMapStats {
  entityType: string;
  totalMapped: number;
  lastMappedAt: string | null;
}

/** Unwrap API response — handles both {success, data: X} and direct X */
function unwrap<T>(responseData: any): T {
  if (responseData && typeof responseData === 'object' && 'data' in responseData && 'success' in responseData) {
    return responseData.data as T;
  }
  return responseData as T;
}

export class SyncService {
  static async getHealth(): Promise<SyncHealth> {
    const response = await apiClient.get('/sync/health');
    const raw = unwrap<any>(response.data);
    return {
      zohoConnected: raw?.isZohoConnected ?? raw?.zohoConnected ?? false,
      tokenExpiresAt: raw?.tokenExpiresAt ?? null,
      apiCallsLastMinute: raw?.apiCallsLastMinute ?? 0,
      apiCallsToday: raw?.apiCallsToday ?? 0,
      unresolvedErrorCount: raw?.unresolvedErrors ?? raw?.unresolvedErrorCount ?? 0,
      pendingChangesCount: raw?.pendingChanges ?? raw?.pendingChangesCount ?? 0,
      checkpoints: raw?.checkpoints ?? [],
    };
  }

  static async checkZohoConnection(): Promise<boolean> {
    try {
      const res = await apiClient.get('/sync/zoho');
      return res.data?.zoho ?? res.data?.status === 'ok' ?? false;
    } catch {
      return false;
    }
  }

  static async getErrors(entityType?: string, limit?: number): Promise<SyncError[]> {
    const params: any = {};
    if (entityType) params.entityType = entityType;
    if (limit) params.limit = limit;
    try {
      const response = await apiClient.get('/sync/errors', { params });
      const data = unwrap<any>(response.data);
      return Array.isArray(data) ? data : data?.items ?? [];
    } catch {
      return [];
    }
  }

  static async getLogs(filter?: SyncLogFilter): Promise<PagedResult<SyncLog>> {
    try {
      const response = await apiClient.get('/sync/logs', { params: filter });
      const data = unwrap<any>(response.data);
      return {
        items: data?.items ?? [],
        totalCount: data?.totalCount ?? 0,
        pageNumber: data?.pageNumber ?? 1,
        pageSize: data?.pageSize ?? 20,
        totalPages: data?.totalPages ?? 0,
      };
    } catch {
      return { items: [], totalCount: 0, pageNumber: 1, pageSize: 20, totalPages: 0 };
    }
  }

  static async getEntityMaps(): Promise<EntityMapStats[]> {
    try {
      const response = await apiClient.get('/sync/entity-maps');
      const data = unwrap<any>(response.data);
      return Array.isArray(data) ? data : data?.items ?? [];
    } catch {
      return [];
    }
  }

  static async triggerFullSync(): Promise<void> {
    await apiClient.post('/sync/full');
  }

  static async triggerItemPull(): Promise<void> {
    await apiClient.post('/sync/items/pull');
  }

  static async retryFailed(): Promise<void> {
    await apiClient.post('/sync/retry-failed');
  }
}
