/**
 * Authentication related types and interfaces
 */

/**
 * User profile information
 */
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phoneNumber?: string;
  profilePictureUrl?: string;
  roles: string[];
  permissions: string[];
  createdAt?: string;
  lastLoginAt?: string;
}

/**
 * User profile details (more comprehensive)
 */
export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phoneNumber?: string;
  profilePictureUrl?: string;
  createdAt: string;
  lastLoginAt?: string;
}

/**
 * Login request payload
 */
export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

/**
 * Login response payload
 */
export interface LoginResponse {
  success: boolean;
  message: string;
  token: string;
  refreshToken?: string;
  expiresAt?: string;
  user: User;
}

/**
 * Registration request payload
 */
export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

/**
 * Refresh token request
 */
export interface RefreshTokenRequest {
  token: string;
  refreshToken: string;
}

/**
 * Profile update request
 */
export interface UpdateProfileRequest {
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

/**
 * Change password request
 */
export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

/**
 * Auth state in Redux
 */
export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
