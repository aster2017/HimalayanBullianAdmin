export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phoneNumber?: string;
  profilePictureUrl?: string;
  customerNumber?: string;
  zohoContactId?: string;
  isZohoLinked?: boolean;
  isEmailVerified?: boolean;
  isApproved?: boolean;
  roles: string[];
  permissions: string[];
  createdAt?: string;
  lastLoginAt?: string;
}

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

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token?: string | null;
  refreshToken?: string;
  expiresAt?: string;
  user?: User | null;
  requiredAction?: 'VerifyEmail' | 'AwaitingApproval' | null;
}

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

export interface RefreshTokenRequest {
  token: string;
  refreshToken: string;
}

export interface UpdateProfileRequest {
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  requiredAction: 'VerifyEmail' | 'AwaitingApproval' | null;
  pendingEmail: string | null;
}
