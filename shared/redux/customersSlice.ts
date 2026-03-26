/**
 * Redux slice for customers state management
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { CustomerService } from '@/shared/services/customerService';
import { Customer, CustomersState, CreateCustomerRequest, UpdateCustomerRequest } from '@/shared/types';

/**
 * Initial state
 */
const initialState: CustomersState = {
  list: [],
  detail: null,
  isLoading: false,
  error: null,
  totalCount: 0,
  currentPage: 1,
  pageSize: 20,
};

/**
 * Async thunk: Fetch customers
 */
export const fetchCustomers = createAsyncThunk(
  'customers/fetchCustomers',
  async ({ page = 1, pageSize = 20 }: { page?: number; pageSize?: number } = {}, { rejectWithValue }) => {
    try {
      const response = await CustomerService.getCustomers(page, pageSize);
      return {
        customers: response.items || [],
        totalCount: response.totalCount || 0,
        pageNumber: response.pageNumber || page,
        pageSize: response.pageSize || pageSize,
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch customers');
    }
  }
);

/**
 * Async thunk: Fetch customer by ID
 */
export const fetchCustomerById = createAsyncThunk(
  'customers/fetchCustomerById',
  async (id: string, { rejectWithValue }) => {
    try {
      const customer = await CustomerService.getCustomerById(id);
      return customer;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch customer');
    }
  }
);

/**
 * Async thunk: Create customer
 */
export const createCustomer = createAsyncThunk(
  'customers/createCustomer',
  async (data: CreateCustomerRequest, { rejectWithValue }) => {
    try {
      const customer = await CustomerService.createCustomer(data);
      return customer;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create customer');
    }
  }
);

/**
 * Async thunk: Update customer
 */
export const updateCustomer = createAsyncThunk(
  'customers/updateCustomer',
  async ({ id, data }: { id: string; data: UpdateCustomerRequest }, { rejectWithValue }) => {
    try {
      const customer = await CustomerService.updateCustomer(id, data);
      return customer;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update customer');
    }
  }
);

/**
 * Async thunk: Delete customer
 */
export const deleteCustomer = createAsyncThunk(
  'customers/deleteCustomer',
  async (id: string, { rejectWithValue }) => {
    try {
      await CustomerService.deleteCustomer(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete customer');
    }
  }
);

/**
 * Async thunk: Search customers
 */
export const searchCustomers = createAsyncThunk(
  'customers/searchCustomers',
  async ({ searchTerm, page = 1, pageSize = 20 }: { searchTerm: string; page?: number; pageSize?: number }, { rejectWithValue }) => {
    try {
      const response = await CustomerService.searchCustomers(searchTerm, page, pageSize);
      return {
        customers: response.items || [],
        totalCount: response.totalCount || 0,
        pageNumber: response.pageNumber || page,
        pageSize: response.pageSize || pageSize,
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to search customers');
    }
  }
);

/**
 * Customers slice
 */
const customersSlice = createSlice({
  name: 'customers',
  initialState,
  reducers: {
    /**
     * Clear customer detail
     */
    clearCustomerDetail: (state) => {
      state.detail = null;
    },

    /**
     * Clear error
     */
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch customers
    builder
      .addCase(fetchCustomers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCustomers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.list = action.payload.customers;
        state.totalCount = action.payload.totalCount;
        state.currentPage = action.payload.pageNumber;
        state.pageSize = action.payload.pageSize;
      })
      .addCase(fetchCustomers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch customer by ID
    builder
      .addCase(fetchCustomerById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCustomerById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.detail = action.payload;
      })
      .addCase(fetchCustomerById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create customer
    builder
      .addCase(createCustomer.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createCustomer.fulfilled, (state, action) => {
        state.isLoading = false;
        state.list.unshift(action.payload);
        state.totalCount += 1;
      })
      .addCase(createCustomer.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update customer
    builder
      .addCase(updateCustomer.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateCustomer.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.list.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
        if (state.detail?.id === action.payload.id) {
          state.detail = action.payload;
        }
      })
      .addCase(updateCustomer.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Delete customer
    builder
      .addCase(deleteCustomer.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteCustomer.fulfilled, (state, action) => {
        state.isLoading = false;
        state.list = state.list.filter((c) => c.id !== action.payload);
        state.totalCount -= 1;
        if (state.detail?.id === action.payload) {
          state.detail = null;
        }
      })
      .addCase(deleteCustomer.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Search customers
    builder
      .addCase(searchCustomers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(searchCustomers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.list = action.payload.customers;
        state.totalCount = action.payload.totalCount;
        state.currentPage = action.payload.pageNumber;
        state.pageSize = action.payload.pageSize;
      })
      .addCase(searchCustomers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearCustomerDetail, clearError } = customersSlice.actions;
export default customersSlice.reducer;
