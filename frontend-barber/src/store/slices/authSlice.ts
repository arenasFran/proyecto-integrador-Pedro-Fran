import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { authApi } from '../../services/authApi';
import { setAccessToken } from '../../services/api';
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
    },
  },
  extraReducers: (builder) => {
    builder
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
        // Don't set error — this is a background fetch
      });
  },
});

export const { clearAuthState, logout, setUser, setInitialized, setLoginToken } = authSlice.actions;
export default authSlice.reducer;
