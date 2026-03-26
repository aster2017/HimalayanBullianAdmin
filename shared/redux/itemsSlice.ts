/**
 * Redux slice for items/inventory state management
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { ItemService } from '@/shared/services/itemService';
import {
  Item,
  ItemsState,
  StockTransaction,
  CreateItemRequest,
  UpdateItemRequest,
  StockAdjustmentRequest,
  ItemFilters,
} from '@/shared/types';

/**
 * Initial state
 */
const initialState: ItemsState = {
  list: [],
  detail: null,
  stockHistory: [],
  isLoading: false,
  error: null,
  totalCount: 0,
  currentPage: 1,
  pageSize: 20,
};

/**
 * Async thunk: Fetch items
 */
export const fetchItems = createAsyncThunk(
  'items/fetchItems',
  async (
    {
      page = 1,
      pageSize = 20,
      category,
      status,
      search,
    }: {
      page?: number;
      pageSize?: number;
      category?: string;
      status?: string;
      search?: string;
    } = {},
    { rejectWithValue }
  ) => {
    try {
      const filters: ItemFilters = { category, status: status as any, search };
      const response = await ItemService.getItems(page, pageSize, filters);
      return {
        items: response.items || [],
        totalCount: response.totalCount || 0,
        pageNumber: response.pageNumber || page,
        pageSize: response.pageSize || pageSize,
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch items');
    }
  }
);

/**
 * Async thunk: Fetch item by ID
 */
export const fetchItemById = createAsyncThunk(
  'items/fetchItemById',
  async (id: string, { rejectWithValue }) => {
    try {
      const item = await ItemService.getItemById(id);
      return item;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch item');
    }
  }
);

/**
 * Async thunk: Create item
 */
export const createItem = createAsyncThunk(
  'items/createItem',
  async (data: CreateItemRequest, { rejectWithValue }) => {
    try {
      const item = await ItemService.createItem(data);
      return item;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create item');
    }
  }
);

/**
 * Async thunk: Update item
 */
export const updateItem = createAsyncThunk(
  'items/updateItem',
  async ({ id, data }: { id: string; data: UpdateItemRequest }, { rejectWithValue }) => {
    try {
      const item = await ItemService.updateItem(id, data);
      return item;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update item');
    }
  }
);

/**
 * Async thunk: Delete item
 */
export const deleteItem = createAsyncThunk(
  'items/deleteItem',
  async (id: string, { rejectWithValue }) => {
    try {
      await ItemService.deleteItem(id);
      return id;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to delete item');
    }
  }
);

/**
 * Async thunk: Fetch stock history
 */
export const fetchStockHistory = createAsyncThunk(
  'items/fetchStockHistory',
  async ({ itemId, page = 1, pageSize = 20 }: { itemId: string; page?: number; pageSize?: number }, { rejectWithValue }) => {
    try {
      const history = await ItemService.getStockHistory(itemId, page, pageSize);
      return history;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch stock history');
    }
  }
);

/**
 * Async thunk: Adjust stock
 */
export const adjustStock = createAsyncThunk(
  'items/adjustStock',
  async ({ itemId, adjustment }: { itemId: string; adjustment: StockAdjustmentRequest }, { rejectWithValue }) => {
    try {
      const item = await ItemService.adjustStock(itemId, adjustment);
      return item;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to adjust stock');
    }
  }
);

/**
 * Async thunk: Search items
 */
export const searchItems = createAsyncThunk(
  'items/searchItems',
  async ({ searchTerm, page = 1, pageSize = 20 }: { searchTerm: string; page?: number; pageSize?: number }, { rejectWithValue }) => {
    try {
      const response = await ItemService.searchItems(searchTerm, page, pageSize);
      return {
        items: response.items || [],
        totalCount: response.totalCount || 0,
        pageNumber: response.pageNumber || page,
        pageSize: response.pageSize || pageSize,
      };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to search items');
    }
  }
);

/**
 * Items slice
 */
const itemsSlice = createSlice({
  name: 'items',
  initialState,
  reducers: {
    /**
     * Clear item detail
     */
    clearItemDetail: (state) => {
      state.detail = null;
      state.stockHistory = [];
    },

    /**
     * Clear error
     */
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch items
    builder
      .addCase(fetchItems.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchItems.fulfilled, (state, action) => {
        state.isLoading = false;
        state.list = action.payload.items;
        state.totalCount = action.payload.totalCount;
        state.currentPage = action.payload.pageNumber;
        state.pageSize = action.payload.pageSize;
      })
      .addCase(fetchItems.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch item by ID
    builder
      .addCase(fetchItemById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchItemById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.detail = action.payload;
      })
      .addCase(fetchItemById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Create item
    builder
      .addCase(createItem.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createItem.fulfilled, (state, action) => {
        state.isLoading = false;
        state.list.unshift(action.payload);
        state.totalCount += 1;
      })
      .addCase(createItem.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update item
    builder
      .addCase(updateItem.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateItem.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.list.findIndex((i) => i.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
        if (state.detail?.id === action.payload.id) {
          state.detail = action.payload;
        }
      })
      .addCase(updateItem.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Delete item
    builder
      .addCase(deleteItem.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(deleteItem.fulfilled, (state, action) => {
        state.isLoading = false;
        state.list = state.list.filter((i) => i.id !== action.payload);
        state.totalCount -= 1;
        if (state.detail?.id === action.payload) {
          state.detail = null;
          state.stockHistory = [];
        }
      })
      .addCase(deleteItem.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch stock history
    builder
      .addCase(fetchStockHistory.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchStockHistory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.stockHistory = action.payload;
      })
      .addCase(fetchStockHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Adjust stock
    builder
      .addCase(adjustStock.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(adjustStock.fulfilled, (state, action) => {
        state.isLoading = false;
        const index = state.list.findIndex((i) => i.id === action.payload.id);
        if (index !== -1) {
          state.list[index] = action.payload;
        }
        if (state.detail?.id === action.payload.id) {
          state.detail = action.payload;
        }
      })
      .addCase(adjustStock.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Search items
    builder
      .addCase(searchItems.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(searchItems.fulfilled, (state, action) => {
        state.isLoading = false;
        state.list = action.payload.items;
        state.totalCount = action.payload.totalCount;
        state.currentPage = action.payload.pageNumber;
        state.pageSize = action.payload.pageSize;
      })
      .addCase(searchItems.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearItemDetail, clearError } = itemsSlice.actions;
export default itemsSlice.reducer;
