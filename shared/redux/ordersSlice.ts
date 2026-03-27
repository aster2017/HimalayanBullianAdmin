/**
 * Redux orders slice - manages orders state
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { OrdersState, SalesOrder, CreateOrderRequest, UpdateOrderRequest, PagedResult } from '@/shared/types';
import { OrderService } from '@/shared/services/orderService';

const initialState: OrdersState = {
  items: [],
  currentOrder: null,
  loading: false,
  error: null,
  pagination: { page: 1, pageSize: 20, totalCount: 0 },
};

export const fetchOrders = createAsyncThunk(
  'orders/fetchOrders',
  async ({ page = 1, pageSize = 20 }: { page?: number; pageSize?: number } = {}, { rejectWithValue }) => {
    try {
      return await OrderService.getOrders(page, pageSize);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch orders');
    }
  }
);

export const fetchOrderById = createAsyncThunk('orders/fetchById', async (id: string, { rejectWithValue }) => {
  try {
    return await OrderService.getOrderById(id);
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Failed to fetch order');
  }
});

export const createOrder = createAsyncThunk(
  'orders/createOrder',
  async (request: CreateOrderRequest, { rejectWithValue }) => {
    try {
      return await OrderService.createOrder(request);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create order');
    }
  }
);

export const updateOrder = createAsyncThunk(
  'orders/updateOrder',
  async ({ id, request }: { id: string; request: UpdateOrderRequest }, { rejectWithValue }) => {
    try {
      return await OrderService.updateOrder(id, request);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update order');
    }
  }
);

export const deleteOrder = createAsyncThunk('orders/deleteOrder', async (id: string, { rejectWithValue }) => {
  try {
    await OrderService.deleteOrder(id);
    return id;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Failed to delete order');
  }
});

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    clearCurrentOrder: (state) => {
      state.currentOrder = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload?.items || [];
        state.pagination = {
          page: action.payload?.pageNumber || 1,
          pageSize: action.payload?.pageSize || 20,
          totalCount: action.payload?.totalCount || 0,
        };
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(fetchOrderById.fulfilled, (state, action) => {
        state.currentOrder = action.payload;
      })
      .addCase(fetchOrderById.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    builder
      .addCase(createOrder.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
        state.pagination.totalCount += 1;
      })
      .addCase(createOrder.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    builder
      .addCase(deleteOrder.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.id !== action.payload);
        state.pagination.totalCount -= 1;
      });
  },
});

export const { clearCurrentOrder } = ordersSlice.actions;
export default ordersSlice.reducer;
