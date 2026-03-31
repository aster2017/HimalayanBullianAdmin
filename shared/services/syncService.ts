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

export class SyncService {
  /**
   * Get comprehensive sync health status
   */
  static async getHealth(): Promise<SyncHealth> {
    const response = await apiClient.get('/sync/health');
    return response.data;
  }

  /**
   * Quick Zoho connectivity check
   */
  static async checkZohoConnection(): Promise<boolean> {
    try {
      await apiClient.get('/sync/zoho');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get unresolved sync errors
   */
  static async getErrors(entityType?: string, limit?: number): Promise<SyncError[]> {
    const params: any = {};
    if (entityType) params.entityType = entityType;
    if (limit) params.limit = limit;
    const response = await apiClient.get('/sync/errors', { params });
    return response.data;
  }

  /**
   * Get sync logs with filtering and pagination
   */
  static async getLogs(filter?: SyncLogFilter): Promise<PagedResult<SyncLog>> {
    const response = await apiClient.get('/sync/logs', { params: filter });
    return response.data;
  }

  /**
   * Get entity mapping statistics
   */
  static async getEntityMaps(): Promise<EntityMapStats[]> {
    const response = await apiClient.get('/sync/entity-maps');
    return response.data;
  }

  /**
   * Trigger full sync manually
   */
  static async triggerFullSync(): Promise<void> {
    await apiClient.post('/sync/full');
  }

  /**
   * Trigger item pull from Zoho
   */
  static async triggerItemPull(): Promise<void> {
    await apiClient.post('/sync/items/pull');
  }

  /**
   * Retry failed syncs
   */
  static async retryFailed(): Promise<void> {
    await apiClient.post('/sync/retry-failed');
  }
}
