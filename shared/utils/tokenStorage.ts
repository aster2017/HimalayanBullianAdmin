/**
 * Token storage utilities for managing JWT tokens
 */

import { StoredToken } from '@/shared/types';

const TOKEN_KEY = 'hbc_auth_token';
const REFRESH_TOKEN_KEY = 'hbc_refresh_token';
const TOKEN_EXPIRY_KEY = 'hbc_token_expiry';

/**
 * Store token in localStorage
 */
export const setStoredToken = (token: StoredToken): void => {
  try {
    localStorage.setItem(TOKEN_KEY, token.token);
    if (token.refreshToken) {
      localStorage.setItem(REFRESH_TOKEN_KEY, token.refreshToken);
    }
    if (token.expiresAt) {
      localStorage.setItem(TOKEN_EXPIRY_KEY, token.expiresAt);
    }
  } catch (error) {
    console.error('Failed to store token:', error);
  }
};

/**
 * Get token from localStorage
 */
export const getStoredToken = (): StoredToken | null => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) return null;

    return {
      token,
      refreshToken: localStorage.getItem(REFRESH_TOKEN_KEY) || undefined,
      expiresAt: localStorage.getItem(TOKEN_EXPIRY_KEY) || undefined,
      type: 'Bearer',
    };
  } catch (error) {
    console.error('Failed to retrieve token:', error);
    return null;
  }
};

/**
 * Clear token from localStorage
 */
export const clearStoredToken = (): void => {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(TOKEN_EXPIRY_KEY);
  } catch (error) {
    console.error('Failed to clear token:', error);
  }
};

/**
 * Check if token exists
 */
export const hasStoredToken = (): boolean => {
  const token = getStoredToken();
  return !!token?.token;
};

/**
 * Check if token is expired
 */
export const isTokenExpired = (): boolean => {
  try {
    const token = getStoredToken();
    if (!token?.expiresAt) return false;

    const expiryDate = new Date(token.expiresAt);
    return new Date() > expiryDate;
  } catch {
    return true;
  }
};

/**
 * Get remaining time until token expires (in seconds)
 */
export const getTokenExpiryTime = (): number => {
  try {
    const token = getStoredToken();
    if (!token?.expiresAt) return 0;

    const expiryDate = new Date(token.expiresAt).getTime();
    const now = new Date().getTime();
    return Math.max(0, Math.floor((expiryDate - now) / 1000));
  } catch {
    return 0;
  }
};
