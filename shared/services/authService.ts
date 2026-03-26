/**
 * Authentication service - handles all auth-related API calls
 */

import apiClient from './apiClient';
import {
  ApiResponse,
  User,
  UserProfile,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RefreshTokenRequest,
  UpdateProfileRequest,
  ChangePasswordRequest,
} from '@/shared/types';

/**
 * Auth service class
 */
export class AuthService {
  /**
   * Login with email and password
   */
  static async login(request: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', request);
    return response.data;
  }

  /**
   * Register new user
   */
  static async register(request: RegisterRequest): Promise<User> {
    const response = await apiClient.post<User>('/auth/register', request);
    return response.data;
  }

  /**
   * Get current user profile
   */
  static async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  }

  /**
   * Refresh JWT token
   */
  static async refreshToken(request: RefreshTokenRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/refresh-token', request);
    return response.data;
  }

  /**
   * Get detailed user profile
   */
  static async getProfile(): Promise<UserProfile> {
    const response = await apiClient.get<UserProfile>('/auth/profile');
    return response.data;
  }

  /**
   * Update user profile
   */
  static async updateProfile(request: UpdateProfileRequest): Promise<UserProfile> {
    const response = await apiClient.put<UserProfile>('/auth/profile', request);
    return response.data;
  }

  /**
   * Change password
   */
  static async changePassword(request: ChangePasswordRequest): Promise<void> {
    await apiClient.post<ApiResponse<boolean>>('/auth/change-password', request);
  }
}
