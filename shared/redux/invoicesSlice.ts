/**
 * Redux invoices slice - manages invoices state
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { InvoicesState, Invoice, InvoiceListItem } from '@/shared/types';
import { InvoiceService } from '@/shared/services/invoiceService';

const initialState: InvoicesState = {
  items: [],
  currentInvoice: null,
  loading: false,
  error: null,
  pagination: { page: 1, pageSize: 20, totalCount: 0 },
};

export const fetchInvoices = createAsyncThunk(
  'invoices/fetchInvoices',
  async ({ page = 1, pageSize = 20 }: { page?: number; pageSize?: number } = {}, { rejectWithValue }) => {
    try {
      return await InvoiceService.getInvoices(page, pageSize);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch invoices');
    }
  }
);

export const fetchInvoiceById = createAsyncThunk('invoices/fetchById', async (id: string, { rejectWithValue }) => {
  try {
    return await InvoiceService.getInvoiceById(id);
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Failed to fetch invoice');
  }
});

export const fetchUnpaidInvoices = createAsyncThunk('invoices/fetchUnpaid', async (_, { rejectWithValue }) => {
  try {
    return await InvoiceService.getUnpaidInvoices();
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Failed to fetch unpaid invoices');
  }
});

export const fetchPaidInvoices = createAsyncThunk('invoices/fetchPaid', async (_, { rejectWithValue }) => {
  try {
    return await InvoiceService.getPaidInvoices();
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Failed to fetch paid invoices');
  }
});

const invoicesSlice = createSlice({
  name: 'invoices',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchInvoices.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchInvoices.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload?.items || [];
        state.pagination = {
          page: action.payload?.pageNumber || 1,
          pageSize: action.payload?.pageSize || 20,
          totalCount: action.payload?.totalCount || 0,
        };
      })
      .addCase(fetchInvoices.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(fetchInvoiceById.fulfilled, (state, action) => {
        state.currentInvoice = action.payload;
      })
      .addCase(fetchInvoiceById.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    builder
      .addCase(fetchUnpaidInvoices.fulfilled, (state, action) => {
        state.items = action.payload;
      })
      .addCase(fetchUnpaidInvoices.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    builder
      .addCase(fetchPaidInvoices.fulfilled, (state, action) => {
        state.items = action.payload;
      })
      .addCase(fetchPaidInvoices.rejected, (state, action) => {
        state.error = action.payload as string;
      });
  },
});

export default invoicesSlice.reducer;
