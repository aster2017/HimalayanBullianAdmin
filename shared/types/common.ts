/**
 * Common types and interfaces used across the application
 */

/**
 * Standard API Response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  errors?: string[];
}

/**
 * Paginated result wrapper
 */
export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

/**
 * Pagination parameters for API requests
 */
export interface PaginationParams {
  pageNumber?: number;
  pageSize?: number;
  searchTerm?: string;
  sortBy?: string;
  sortDescending?: boolean;
}

/**
 * Loading state for async operations
 */
export type LoadingState = 'idle' | 'loading' | 'succeeded' | 'failed';

/**
 * Error state
 */
export interface ErrorState {
  code?: string;
  message: string;
  details?: Record<string, any>;
}

/**
 * Token stored in storage
 */
export interface StoredToken {
  token: string;
  refreshToken?: string;
  expiresAt?: string;
  type: 'Bearer';
}
