import { getStoredToken } from '@/shared/utils/tokenStorage';

export function getAuthHeaders(): Record<string, string> {
  const stored = getStoredToken();
  if (stored?.token) {
    return { Authorization: `Bearer ${stored.token}` };
  }
  return {};
}
