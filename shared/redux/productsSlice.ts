/**
 * Redux products slice - manages product catalog state
 */

import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { ProductsState, Product, ProductListItem, ProductFilters, PagedResult } from '@/shared/types';
import { ProductService } from '@/shared/services/productService';

const initialState: ProductsState = {
  items: [],
  currentProduct: null,
  featured: [],
  categories: [],
  loading: false,
  error: null,
  pagination: { page: 1, pageSize: 20, totalCount: 0 },
  filters: {},
};

/**
 * Fetch products
 */
export const fetchProducts = createAsyncThunk(
  'products/fetchProducts',
  async (
    { page = 1, pageSize = 20, filters = {} }: { page?: number; pageSize?: number; filters?: ProductFilters } = {},
    { rejectWithValue }
  ) => {
    try {
      const result = await ProductService.getProducts(page, pageSize, filters);
      return result;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch products');
    }
  }
);

/**
 * Fetch featured products
 */
export const fetchFeaturedProducts = createAsyncThunk('products/fetchFeatured', async (_, { rejectWithValue }) => {
  try {
    return await ProductService.getFeaturedProducts();
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Failed to fetch featured products');
  }
});

/**
 * Fetch categories
 */
export const fetchCategories = createAsyncThunk('products/fetchCategories', async (_, { rejectWithValue }) => {
  try {
    return await ProductService.getCategories();
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Failed to fetch categories');
  }
});

/**
 * Fetch product by ID
 */
export const fetchProductById = createAsyncThunk('products/fetchById', async (id: string, { rejectWithValue }) => {
  try {
    return await ProductService.getProductById(id);
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Failed to fetch product');
  }
});

const productsSlice = createSlice({
  name: 'products',
  initialState,
  reducers: {
    setFilters: (state, action: PayloadAction<ProductFilters>) => {
      state.filters = action.payload;
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    clearCurrentProduct: (state) => {
      state.currentProduct = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Products
    builder
      .addCase(fetchProducts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProducts.fulfilled, (state, action: PayloadAction<PagedResult<ProductListItem>>) => {
        state.loading = false;
        state.items = action.payload.items;
        state.pagination = {
          page: action.payload.pageNumber,
          pageSize: action.payload.pageSize,
          totalCount: action.payload.totalCount,
        };
      })
      .addCase(fetchProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch Featured
    builder
      .addCase(fetchFeaturedProducts.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchFeaturedProducts.fulfilled, (state, action) => {
        state.loading = false;
        state.featured = action.payload;
      })
      .addCase(fetchFeaturedProducts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch Categories
    builder
      .addCase(fetchCategories.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.loading = false;
        state.categories = action.payload;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    // Fetch Product by ID
    builder
      .addCase(fetchProductById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchProductById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentProduct = action.payload;
      })
      .addCase(fetchProductById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { setFilters, clearFilters, clearCurrentProduct } = productsSlice.actions;
export default productsSlice.reducer;
