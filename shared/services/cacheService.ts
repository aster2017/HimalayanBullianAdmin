import apiClient from './apiClient';

export type FlushGroup = 'products' | 'settings' | 'rates' | 'all';

export interface FlushResult {
  success: boolean;
  flushed: string[];
  timestamp: string;
}

export class CacheService {
  static async flush(group: FlushGroup): Promise<FlushResult> {
    const res = await apiClient.post(`/cache/flush/${group}`);
    return res.data;
  }
}
