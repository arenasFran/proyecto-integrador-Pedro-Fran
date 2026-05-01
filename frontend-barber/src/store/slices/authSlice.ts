import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authService, type RegisterData, type RequestResetData, type ResetPasswordData } from '../../services/auth.service';

interface AuthState {
  isLoading: boolean;
  error: string | null;
  registerSuccess: string | null;
  requestResetSuccess: string | null;
  resetPasswordSuccess: string | null;
}

const initialState: AuthState = {
  isLoading: false,
  error: null,
  registerSuccess: null,
  requestResetSuccess: null,
  resetPasswordSuccess: null,
};

const clearAllSuccessFlags = (state: AuthState) => {
  state.registerSuccess = null;
  state.requestResetSuccess = null;
  state.resetPasswordSuccess = null;
};

export const registerThunk = createAsyncThunk(
  'auth/register',
  async (data: RegisterData, { rejectWithValue }) => {
    try {
      const message = await authService.register(data);
      return message;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al registrar';
      return rejectWithValue(message);
    }
  }
);

export const requestResetThunk = createAsyncThunk(
  'auth/requestReset',
  async (data: RequestResetData, { rejectWithValue }) => {
    try {
      const message = await authService.requestReset(data);
      return message;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al solicitar recuperación';
      return rejectWithValue(message);
    }
  }
);

export const resetPasswordThunk = createAsyncThunk(
  'auth/resetPassword',
  async (data: ResetPasswordData, { rejectWithValue }) => {
    try {
      const message = await authService.resetPassword(data);
      return message;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al restablecer contraseña';
      return rejectWithValue(message);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearAuthState: (state) => {
      state.error = null;
      clearAllSuccessFlags(state);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        clearAllSuccessFlags(state);
      })
      .addCase(registerThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.registerSuccess = action.payload;
        state.requestResetSuccess = null;
        state.resetPasswordSuccess = null;
      })
      .addCase(registerThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(requestResetThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        clearAllSuccessFlags(state);
      })
      .addCase(requestResetThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.registerSuccess = null;
        state.requestResetSuccess = action.payload;
        state.resetPasswordSuccess = null;
      })
      .addCase(requestResetThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(resetPasswordThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        clearAllSuccessFlags(state);
      })
      .addCase(resetPasswordThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.registerSuccess = null;
        state.requestResetSuccess = null;
        state.resetPasswordSuccess = action.payload;
      })
      .addCase(resetPasswordThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearAuthState } = authSlice.actions;
export default authSlice.reducer;
