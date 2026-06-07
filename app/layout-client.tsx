'use client';

import { Provider } from 'react-redux';
import store from '@/shared/redux/store';
import PrelineScript from './PrelineScript';
import { useEffect, useState } from 'react';
import { Initialload } from '@/shared/contextapi';
import { DialogProvider } from '@/shared/context/DialogContext';

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

  return (
    <Provider store={store}>
      <Initialload.Provider value={{ pageloading, setpageloading }}>
        <DialogProvider>
          {children}
        </DialogProvider>
      </Initialload.Provider>
      <PrelineScript />
    </Provider>
  );
}
