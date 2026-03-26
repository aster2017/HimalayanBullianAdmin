/**
 * Axios API client with authentication and interceptors
 */

import axios, { AxiosError, AxiosInstance, AxiosResponse } from 'axios';
import { StoredToken } from '@/shared/types';
import { getStoredToken, setStoredToken, clearStoredToken } from '@/shared/utils/tokenStorage';

/**
 * API client configuration
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5003/api';
const API_TIMEOUT = parseInt(process.env.NEXT_PUBLIC_API_TIMEOUT || '30000', 10);

/**
 * Create axios instance
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Request interceptor - add JWT token to headers
 */
apiClient.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token?.token) {
      config.headers.Authorization = `Bearer ${token.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

/**
 * Response interceptor - handle token refresh, errors, and mock fallback
 */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Handle connection errors - fallback to mock auth for /auth/login
    if (error.message === 'Network Error' && originalRequest.url?.includes('/auth/login')) {
      try {
        const { MockAuthService } = await import('./mockAuthService');
        const loginData = JSON.parse(originalRequest.data);
        const response = await MockAuthService.login(loginData);

        return apiClient.request({
          ...originalRequest,
          data: JSON.stringify({ data: response }),
          headers: { ...originalRequest.headers, 'X-Mock-Response': 'true' },
        });
      } catch (mockError) {
        return Promise.reject(error);
      }
    }

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const token = getStoredToken();

        // If no refresh token, clear auth and let login handle it
        if (!token?.refreshToken) {
          clearStoredToken();
          // Redirect to login would happen in app-level interceptor
          return Promise.reject(error);
        }

        // Attempt to refresh token
        const response = await axios.post<{ data: { token: string; refreshToken?: string; expiresAt?: string } }>(
          `${API_BASE_URL}/auth/refresh-token`,
          {
            token: token.token,
            refreshToken: token.refreshToken,
          }
        );

        const newToken: StoredToken = {
          token: response.data.data.token,
          refreshToken: response.data.data.refreshToken,
          expiresAt: response.data.data.expiresAt,
          type: 'Bearer',
        };

        setStoredToken(newToken);

        // Retry original request with new token
        originalRequest.headers.Authorization = `Bearer ${newToken.token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        clearStoredToken();
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    return Promise.reject(error);
  }
);

export default apiClient;
