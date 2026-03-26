/**
 * Mock Authentication Service - for development/testing without backend
 */

import { LoginRequest, LoginResponse, User } from '@/shared/types';

// Mock users database
const MOCK_USERS = {
  'test@example.com': {
    password: 'password',
    user: {
      id: '1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      roles: ['user'],
      isActive: true,
    },
  },
  'admin@example.com': {
    password: 'admin123',
    user: {
      id: '2',
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
      roles: ['admin'],
      isActive: true,
    },
  },
};

export class MockAuthService {
  /**
   * Mock login
   */
  static async login(request: LoginRequest): Promise<LoginResponse> {
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 500));

    const mockUser = MOCK_USERS[request.email as keyof typeof MOCK_USERS];

    if (!mockUser || mockUser.password !== request.password) {
      throw new Error('Invalid email or password');
    }

    return {
      token: `mock_token_${Date.now()}`,
      refreshToken: `mock_refresh_${Date.now()}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      user: mockUser.user,
    };
  }

  /**
   * Mock refresh token
   */
  static async refreshToken(): Promise<LoginResponse> {
    await new Promise((resolve) => setTimeout(resolve, 300));

    const user: User = {
      id: '1',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      roles: ['user'],
      isActive: true,
    };

    return {
      token: `mock_token_${Date.now()}`,
      refreshToken: `mock_refresh_${Date.now()}`,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      user,
    };
  }
}

export const MOCK_CREDENTIALS = [
  {
    email: 'test@example.com',
    password: 'password',
    role: 'User',
    description: 'Regular user account',
  },
  {
    email: 'admin@example.com',
    password: 'admin123',
    role: 'Admin',
    description: 'Administrator account',
  },
];
