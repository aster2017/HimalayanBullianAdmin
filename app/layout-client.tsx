'use client';

import { Provider } from 'react-redux';
import store from '@/shared/redux/store';
import PrelineScript from './PrelineScript';
import { useState } from 'react';
import { Initialload } from '@/shared/contextapi';

export default function RootLayoutClient({ children }: { children: React.ReactNode }) {
  const [pageloading, setpageloading] = useState(false);

  return (
    <Provider store={store}>
      <Initialload.Provider value={{ pageloading, setpageloading }}>
        {children}
      </Initialload.Provider>
      <PrelineScript />
    </Provider>
  );
}
