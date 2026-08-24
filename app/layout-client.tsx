'use client';

import { Provider } from 'react-redux';
import store from '@/shared/redux/store';
import { logout } from '@/shared/redux/authSlice';
import { clearStoredToken, getStoredToken } from '@/shared/utils/tokenStorage';
import PrelineScript from './PrelineScript';
import { useEffect, useState } from 'react';
import { Initialload } from '@/shared/contextapi';
import { DialogProvider } from '@/shared/context/DialogContext';
import { Toaster } from 'react-hot-toast';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;
const SESSION_POLL_MS = 60_000; // check every 60 seconds

/** Force the user back to the login page and wipe local auth state. */
function forceLogout() {
  store.dispatch(logout());
  window.location.href = '/';
}

export default function RootLayoutClient({ children }: { children: React.ReactNode }) {
  const [pageloading, setpageloading] = useState(false);

  // After a deploy, every browser tab that still has the previous HTML loaded
  // will try to import chunks that have been replaced on the server. Next.js
  // surfaces those as a ChunkLoadError. Auto-recover by reloading once when we
  // see one (with a sessionStorage guard so we don't loop on a genuine bug).
  useEffect(() => {
    const onError = (e: Event | PromiseRejectionEvent) => {
      const err: any = (e as PromiseRejectionEvent).reason ?? (e as ErrorEvent).error ?? e;
      const msg = err?.message ?? err?.name ?? '';
      const isChunk =
        err?.name === 'ChunkLoadError' ||
        /Loading chunk \d+ failed/i.test(msg) ||
        /Loading CSS chunk/i.test(msg);
      if (!isChunk) return;
      if (sessionStorage.getItem('hbc-chunk-reload-once') === '1') return;
      sessionStorage.setItem('hbc-chunk-reload-once', '1');
      window.location.reload();
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onError);
    // Clear the guard on a successful navigation tick so genuine future
    // chunk errors still get one auto-retry.
    const t = setTimeout(() => sessionStorage.removeItem('hbc-chunk-reload-once'), 30_000);
    return () => {
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onError);
      clearTimeout(t);
    };
  }, []);

  // VAPT: Session Misconfiguration + Role-Based Session Misconfiguration.
  // The backend revokes tokens immediately on role change, deactivation, or
  // password change. We need the frontend to detect this and redirect to login.
  //
  // Two complementary mechanisms:
  // 1. Event listener: apiClient fires 'hbc:session-expired' on any 401 that
  //    survives the refresh attempt → immediate redirect.
  // 2. Proactive poll: every 60 s we ping /auth/me with the stored token.
  //    If the server returns 401 the tab is redirected even if the user hasn't
  //    made a manual API call since their session was killed server-side.
  useEffect(() => {
    const onSessionExpired = () => forceLogout();
    window.addEventListener('hbc:session-expired', onSessionExpired);

    const staffRoles = ['SuperAdmin', 'Admin', 'Manager', 'Staff'];
    const pollInterval = setInterval(async () => {
      const stored = getStoredToken();
      // Only poll when a token is actually present (user is logged in)
      if (!stored?.token) return;
      try {
        const res = await fetch(`${API_BASE_URL}/auth/me`, {
          headers: { Authorization: `Bearer ${stored.token}` },
        });
        if (res.status === 401) {
          clearStoredToken();
          forceLogout();
          return;
        }
        // VAPT: if token belongs to a Customer, they have no business here
        if (res.ok) {
          const body = await res.json().catch(() => null);
          const roles: string[] = body?.data?.roles ?? body?.roles ?? [];
          if (roles.length > 0 && !roles.some((r: string) => staffRoles.includes(r))) {
            clearStoredToken();
            forceLogout();
          }
        }
      } catch {
        // Network error — don't log out; the user may just be offline
      }
    }, SESSION_POLL_MS);

    return () => {
      window.removeEventListener('hbc:session-expired', onSessionExpired);
      clearInterval(pollInterval);
    };
  }, []);

  return (
    <Provider store={store}>
      <Initialload.Provider value={{ pageloading, setpageloading }}>
        <DialogProvider>
          {children}
        </DialogProvider>
      </Initialload.Provider>
      <Toaster position="top-right" />
      <PrelineScript />
    </Provider>
  );
}
