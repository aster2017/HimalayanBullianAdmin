/**
 * Redux store configuration
 */

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import productsReducer from './productsSlice';
import ordersReducer from './ordersSlice';
import addressesReducer from './addressesSlice';
import paymentsReducer from './paymentsSlice';
import invoicesReducer from './invoicesSlice';
import customersReducer from './customersSlice';
import itemsReducer from './itemsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    products: productsReducer,
    orders: ordersReducer,
    addresses: addressesReducer,
    payments: paymentsReducer,
    invoices: invoicesReducer,
    customers: customersReducer,
    items: itemsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
