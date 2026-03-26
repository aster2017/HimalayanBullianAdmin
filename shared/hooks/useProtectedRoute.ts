/**
 * Hook for protecting routes - redirects to login if not authenticated
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppSelector } from '@/shared/redux/hooks';
import { getStoredToken } from '@/shared/utils/tokenStorage';

export function useProtectedRoute() {
  const router = useRouter();
  const { isAuthenticated } = useAppSelector((state) => state.auth);

  useEffect(() => {
    // Check if user is authenticated
    const token = getStoredToken();
    if (!isAuthenticated && !token) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  return { isAuthenticated };
}
