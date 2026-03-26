import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import customersReducer from "./customersSlice";
import itemsReducer from "./itemsSlice";
import legacyReducer from "./reducer";

const store = configureStore({
  reducer: {
    auth: authReducer,
    customers: customersReducer,
    items: itemsReducer,
    legacy: legacyReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;