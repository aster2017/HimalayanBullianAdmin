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

export class AuthService {
  static async login(request: LoginRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/login', request);
    return response.data;
  }

  static async register(request: RegisterRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/register', request);
    return response.data;
  }

  static async verifyEmail(email: string, code: string): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/verify-email', { email, code });
    return response.data;
  }

  static async resendOtp(email: string): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/resend-otp', { email });
    return response.data;
  }

  static async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<ApiResponse<User>>('/auth/me');
    return (response.data as any).data ?? response.data;
  }

  static async refreshToken(request: RefreshTokenRequest): Promise<LoginResponse> {
    const response = await apiClient.post<LoginResponse>('/auth/refresh-token', request);
    return response.data;
  }

  static async getProfile(): Promise<UserProfile> {
    const response = await apiClient.get<UserProfile>('/auth/profile');
    return response.data;
  }

  static async updateProfile(request: UpdateProfileRequest): Promise<UserProfile> {
    const response = await apiClient.put<UserProfile>('/auth/profile', request);
    return response.data;
  }

  static async changePassword(request: ChangePasswordRequest): Promise<void> {
    await apiClient.post<ApiResponse<boolean>>('/auth/change-password', request);
  }
}
