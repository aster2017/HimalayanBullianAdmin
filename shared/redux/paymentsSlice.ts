/**
 * Redux payments slice - manages payments state
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { PaymentsState, Payment, InitiatePaymentRequest, PagedResult } from '@/shared/types';
import { PaymentService } from '@/shared/services/paymentService';

const initialState: PaymentsState = {
  items: [],
  currentPayment: null,
  loading: false,
  error: null,
  pagination: { page: 1, pageSize: 20, totalCount: 0 },
};

export const fetchPayments = createAsyncThunk(
  'payments/fetchPayments',
  async ({ page = 1, pageSize = 20 }: { page?: number; pageSize?: number } = {}, { rejectWithValue }) => {
    try {
      return await PaymentService.getPayments(page, pageSize);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch payments');
    }
  }
);

export const initiatePayment = createAsyncThunk(
  'payments/initiatePayment',
  async (request: InitiatePaymentRequest, { rejectWithValue }) => {
    try {
      return await PaymentService.initiatePayment(request);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to initiate payment');
    }
  }
);

const paymentsSlice = createSlice({
  name: 'payments',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPayments.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchPayments.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.items;
        state.pagination = {
          page: action.payload.pageNumber,
          pageSize: action.payload.pageSize,
          totalCount: action.payload.totalCount,
        };
      })
      .addCase(fetchPayments.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(initiatePayment.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(initiatePayment.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export default paymentsSlice.reducer;
