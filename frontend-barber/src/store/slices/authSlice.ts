import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { authApi } from '../../services/authApi';
import { api, setAccessToken } from '../../services/api';
import type { User } from '../../types/auth';

interface AuthState {
  loginToken: string | null;
  user: User | null;
  isInitializing: boolean;
}

const initialState: AuthState = {
  loginToken: null,
  user: null,
  isInitializing: true,
};

export const updateCurrentUser = createAsyncThunk(
  'auth/updateCurrentUser',
  async (data: {
    name?: string;
    lastname?: string;
    email?: string;
    phone?: string;
    password?: string;
    photoUrl?: string | null;
  }, { rejectWithValue }) => {
    try {
      const response = await api.put<User>('/api/users/me', data);
      return response.data;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al actualizar perfil';
      return rejectWithValue(message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthState: () => {
      setAccessToken(null);
      return initialState;
    },
    logout: (state) => {
      setAccessToken(null);
      state.loginToken = null;
      state.user = null;
    },
    setUser: (state, action) => {
      state.user = action.payload;
    },
    setInitialized: (state) => {
      state.isInitializing = false;
    },
    setLoginToken: (state, action: PayloadAction<string>) => {
      state.loginToken = action.payload;
      setAccessToken(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(updateCurrentUser.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addMatcher(authApi.endpoints.verifyTwoFactorCode.matchFulfilled, (state, action) => {
        state.loginToken = action.payload.token;
        setAccessToken(action.payload.token);
      })
      .addMatcher(authApi.endpoints.completeGoogleProfile.matchFulfilled, (state, action) => {
        state.loginToken = action.payload.token;
        setAccessToken(action.payload.token);
        if ('user' in action.payload) {
          state.user = action.payload.user as any;
        }
      })
      .addMatcher(authApi.endpoints.googleLogin.matchFulfilled, (state, action) => {
        if ('token' in action.payload) {
          state.loginToken = action.payload.token;
          setAccessToken(action.payload.token);
        }
      })
      .addMatcher(authApi.endpoints.refreshToken.matchFulfilled, (state, action) => {
        state.loginToken = action.payload.token;
        setAccessToken(action.payload.token);
      })
      .addMatcher(authApi.endpoints.refreshToken.matchRejected, (state) => {
        setAccessToken(null);
        state.loginToken = null;
        state.user = null;
      })
      .addMatcher(authApi.endpoints.getProfile.matchFulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addMatcher(authApi.endpoints.getProfile.matchRejected, () => {
      });
  },
});

export const { clearAuthState, logout, setUser, setInitialized, setLoginToken } = authSlice.actions;
export default authSlice.reducer;
