/**
 * Redux addresses slice - manages user addresses state
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { AddressesState, Address, CreateAddressRequest, UpdateAddressRequest } from '@/shared/types';
import { AddressService } from '@/shared/services/addressService';

const initialState: AddressesState = {
  items: [],
  currentAddress: null,
  loading: false,
  error: null,
  billingAddresses: [],
  shippingAddresses: [],
};

export const fetchAddresses = createAsyncThunk('addresses/fetchAddresses', async (_, { rejectWithValue }) => {
  try {
    return await AddressService.getAddresses();
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Failed to fetch addresses');
  }
});

export const createAddress = createAsyncThunk(
  'addresses/createAddress',
  async (request: CreateAddressRequest, { rejectWithValue }) => {
    try {
      return await AddressService.createAddress(request);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to create address');
    }
  }
);

export const updateAddress = createAsyncThunk(
  'addresses/updateAddress',
  async ({ id, request }: { id: string; request: UpdateAddressRequest }, { rejectWithValue }) => {
    try {
      return await AddressService.updateAddress(id, request);
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to update address');
    }
  }
);

export const deleteAddress = createAsyncThunk('addresses/deleteAddress', async (id: string, { rejectWithValue }) => {
  try {
    await AddressService.deleteAddress(id);
    return id;
  } catch (error: any) {
    return rejectWithValue(error.response?.data?.message || 'Failed to delete address');
  }
});

const addressesSlice = createSlice({
  name: 'addresses',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAddresses.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchAddresses.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
        state.billingAddresses = action.payload.filter((a) => a.addressType === 'Billing' || a.addressType === 'Both');
        state.shippingAddresses = action.payload.filter((a) => a.addressType === 'Shipping' || a.addressType === 'Both');
      })
      .addCase(fetchAddresses.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(createAddress.fulfilled, (state, action) => {
        state.items.push(action.payload);
      })
      .addCase(createAddress.rejected, (state, action) => {
        state.error = action.payload as string;
      });

    builder.addCase(deleteAddress.fulfilled, (state, action) => {
      state.items = state.items.filter((item) => item.id !== action.payload);
    });
  },
});

export default addressesSlice.reducer;
