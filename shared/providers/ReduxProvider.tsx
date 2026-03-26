'use client';

/**
 * Redux Provider wrapper for Next.js app
 */

import React, { ReactNode } from 'react';
import { Provider } from 'react-redux';
import { store } from '@/shared/redux/store';

interface ReduxProviderProps {
  children: ReactNode;
}

export function ReduxProvider({ children }: ReduxProviderProps) {
  return <Provider store={store}>{children}</Provider>;
}
