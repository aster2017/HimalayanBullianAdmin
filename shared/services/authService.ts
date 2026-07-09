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
    // The admin web portal is staff-only: use the /admin/login path so the backend
    // rejects Customer accounts (they must sign in via the mobile app). Customers get
    // a 403 here, which surfaces as the message below.
    const response = await apiClient.post<LoginResponse>('/auth/admin/login', request);
    const data = response.data;
    // Belt-and-suspenders: refuse a customer-only session on the client too.
    const roles: string[] = (data as any)?.user?.roles ?? [];
    const staffRoles = ['SuperAdmin', 'Admin', 'Manager', 'Staff'];
    if (data?.success && !roles.some((r) => staffRoles.includes(r))) {
      return {
        ...data,
        success: false,
        token: undefined as any,
        message: 'This portal is for HBC staff. Please use the Himalayan Bullion mobile app to sign in.',
      } as LoginResponse;
    }
    return data;
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

  /**
   * Revoke the current access token server-side. Best-effort: callers still clear
   * local token storage regardless of the result. Without this, logging out only
   * dropped the token locally and it stayed valid on the server until expiry.
   */
  static async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // ignore — local sign-out proceeds regardless
    }
  }
}
