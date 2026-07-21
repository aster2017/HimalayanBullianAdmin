/**
 * Hook for protecting routes - redirects to login if not authenticated or not staff.
 * Primary guard is (contentlayout)/layout.tsx; this is per-page defense-in-depth.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/shared/redux/hooks';
import { clearStoredToken, getStoredToken } from '@/shared/utils/tokenStorage';
import { logout } from '@/shared/redux/authSlice';
import store from '@/shared/redux/store';

const STAFF_ROLES = ['SuperAdmin', 'Admin', 'Manager', 'Staff'];

export function useProtectedRoute() {
  const router = useRouter();
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);

  useEffect(() => {
    const token = getStoredToken();
    if (!isAuthenticated && !token) {
      router.push('/');
      return;
    }
    // If user is in Redux and is Customer-only, reject immediately
    if (user && !user.roles.some(r => STAFF_ROLES.includes(r))) {
      clearStoredToken();
      store.dispatch(logout());
      router.push('/');
    }
  }, [isAuthenticated, user, router]);

  return { isAuthenticated };
}
