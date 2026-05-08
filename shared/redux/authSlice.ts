import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { AuthState, User, LoginRequest, RegisterRequest } from '@/shared/types';
import { AuthService } from '@/shared/services/authService';
import { setStoredToken, clearStoredToken } from '@/shared/utils/tokenStorage';

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
  requiredAction: null,
  pendingEmail: null,
};

export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials: LoginRequest, { rejectWithValue }) => {
    try {
      const response = await AuthService.login(credentials);
      if (response.token) {
        setStoredToken({ token: response.token, refreshToken: response.refreshToken, expiresAt: response.expiresAt, type: 'Bearer' });
      }
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Login failed');
    }
  }
);

export const registerUser = createAsyncThunk(
  'auth/register',
  async (credentials: RegisterRequest, { rejectWithValue }) => {
    try {
      const response = await AuthService.register(credentials);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Registration failed');
    }
  }
);

export const verifyEmail = createAsyncThunk(
  'auth/verifyEmail',
  async ({ email, code }: { email: string; code: string }, { rejectWithValue }) => {
    try {
      const response = await AuthService.verifyEmail(email, code);
      return response;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Verification failed');
    }
  }
);

export const fetchCurrentUser = createAsyncThunk(
  'auth/fetchCurrentUser',
  async (_, { rejectWithValue }) => {
    try {
      const user = await AuthService.getCurrentUser();
      return user;
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.message || 'Failed to fetch user');
    }
  }
);

export const refreshUserToken = createAsyncThunk(
  'auth/refreshToken',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as any;
      if (!state.auth.token || !state.auth.refreshToken) return rejectWithValue('No token to refresh');
      const response = await AuthService.refreshToken({ token: state.auth.token, refreshToken: state.auth.refreshToken });
      setStoredToken({ token: response.token!, refreshToken: response.refreshToken, expiresAt: response.expiresAt, type: 'Bearer' });
      return response;
    } catch (error: any) {
      clearStoredToken();
      return rejectWithValue(error.response?.data?.message || 'Token refresh failed');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      state.user = null; state.token = null; state.refreshToken = null;
      state.isAuthenticated = false; state.error = null;
      state.requiredAction = null; state.pendingEmail = null;
      clearStoredToken();
    },
    clearError: (state) => { state.error = null; },
    clearRequiredAction: (state) => { state.requiredAction = null; state.pendingEmail = null; },
    setUser: (state, action: PayloadAction<User>) => { state.user = action.payload; state.isAuthenticated = true; },
    setToken: (state, action: PayloadAction<{ token: string; refreshToken?: string }>) => {
      state.token = action.payload.token; state.refreshToken = action.payload.refreshToken || null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => { state.isLoading = true; state.error = null; state.requiredAction = null; })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.isLoading = false;
        const { requiredAction, token, user, message } = action.payload;
        if (requiredAction === 'VerifyEmail' || requiredAction === 'AwaitingApproval') {
          state.requiredAction = requiredAction;
          state.pendingEmail = user?.email || null;
          state.error = message || null;
        } else if (token) {
          state.user = user || null; state.token = token;
          state.refreshToken = action.payload.refreshToken || null;
          state.isAuthenticated = true; state.error = null;
        }
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.isLoading = false; state.error = action.payload as string; state.isAuthenticated = false;
      });

    builder
      .addCase(registerUser.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        const { requiredAction, user } = action.payload;
        state.requiredAction = requiredAction || null;
        state.pendingEmail = user?.email || null;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.isLoading = false; state.error = action.payload as string;
      });

    builder
      .addCase(verifyEmail.pending, (state) => { state.isLoading = true; state.error = null; })
      .addCase(verifyEmail.fulfilled, (state, action) => {
        state.isLoading = false;
        const { requiredAction } = action.payload;
        state.requiredAction = requiredAction || null;
      })
      .addCase(verifyEmail.rejected, (state, action) => {
        state.isLoading = false; state.error = action.payload as string;
      });

    builder
      .addCase(fetchCurrentUser.fulfilled, (state, action) => {
        state.isLoading = false; state.user = action.payload; state.isAuthenticated = true;
      })
      .addCase(fetchCurrentUser.rejected, (state, action) => {
        state.isLoading = false; state.error = action.payload as string;
      });

    builder
      .addCase(refreshUserToken.fulfilled, (state, action) => {
        state.user = action.payload.user || null; state.token = action.payload.token!;
        state.refreshToken = action.payload.refreshToken || null;
      })
      .addCase(refreshUserToken.rejected, (state) => {
        state.user = null; state.token = null; state.refreshToken = null; state.isAuthenticated = false;
      });
  },
});

export const { logout, clearError, setUser, setToken, clearRequiredAction } = authSlice.actions;
export default authSlice.reducer;
