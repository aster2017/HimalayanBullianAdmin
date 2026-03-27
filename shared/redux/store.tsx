import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import customersReducer from "./customersSlice";
import itemsReducer from "./itemsSlice";
import ordersReducer from "./ordersSlice";
import productsReducer from "./productsSlice";
import invoicesReducer from "./invoicesSlice";
import paymentsReducer from "./paymentsSlice";
import addressesReducer from "./addressesSlice";
import legacyReducer from "./reducer";

const store = configureStore({
  reducer: {
    auth: authReducer,
    customers: customersReducer,
    items: itemsReducer,
    orders: ordersReducer,
    products: productsReducer,
    invoices: invoicesReducer,
    payments: paymentsReducer,
    addresses: addressesReducer,
    legacy: legacyReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;