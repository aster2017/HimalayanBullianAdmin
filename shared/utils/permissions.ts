import { User } from '@/shared/types';

/**
 * Checks a permission claim against the logged-in user's flattened
 * role→permission set (populated by the backend at login/`/auth/me`,
 * see AuthController.GetUserPermissions). Menu items and routes gated
 * by a specific permission (e.g. "Roles.View") should use this rather
 * than the coarser admin/user role check — a role that no longer grants
 * a permission stops seeing the corresponding menu item and route.
 */
export function hasPermission(user: User | null | undefined, permission: string): boolean {
  return !!user?.permissions?.includes(permission);
}

/**
 * Resolves which tier of the sidebar (nav.tsx's "admin" | "user" split) a
 * user belongs to. Backed by the Portal.Access permission the backend
 * appends for every role with CanAccessPortal — never by a hardcoded list
 * of staff role names, which silently excluded every custom role
 * (ADMIN2, Inventory Flow) and every narrow one (Cashier, Buyback Officer,
 * KYC Officer): they authenticate, pass the route guards, and would then
 * land on the customer-tier menu.
 */
export function resolveNavTier(user: User | null | undefined): 'admin' | 'user' {
  return hasPermission(user, 'Portal.Access') ? 'admin' : 'user';
}
