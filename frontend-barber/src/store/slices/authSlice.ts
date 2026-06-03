import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  authService,
  type GoogleLoginData,
  type LoginData,
  type RegisterData,
  type RequestResetData,
  type ResetPasswordData,
  type TwoFactorVerifyData,
} from '../../services/auth.service';
import { professionalService } from '../../services/professional.service';
import { getTokenUser } from '../../utils/token';
import type { Professional } from '../../types/professional';

interface AuthState {
  isLoading: boolean;
  error: string | null;
  twoFactorSendSuccess: string | null;
  twoFactorPendingEmail: string | null;
  loginSuccess: string | null;
  loginToken: string | null;
  registerSuccess: string | null;
  requestResetSuccess: string | null;
  resetPasswordSuccess: string | null;
  user: Professional | null;
}

const initialState: AuthState = {
  isLoading: false,
  error: null,
  twoFactorSendSuccess: null,
  twoFactorPendingEmail: null,
  loginSuccess: null,
  loginToken: null,
  registerSuccess: null,
  requestResetSuccess: null,
  resetPasswordSuccess: null,
  user: null,
};

const clearAllSuccessFlags = (state: AuthState) => {
  state.twoFactorSendSuccess = null;
  state.twoFactorPendingEmail = null;
  state.loginSuccess = null;
  state.registerSuccess = null;
  state.requestResetSuccess = null;
  state.resetPasswordSuccess = null;
};

export const sendTwoFactorCodeThunk = createAsyncThunk(
  'auth/sendTwoFactorCode',
  async (data: LoginData, { rejectWithValue }) => {
    try {
      const response = await authService.sendTwoFactorCode(data);
      return {
        message: response.message,
        email: data.email.trim().toLowerCase(),
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al enviar el código';
      return rejectWithValue(message);
    }
  }
);

export const googleLoginThunk = createAsyncThunk(
  'auth/googleLogin',
  async (data: GoogleLoginData, { rejectWithValue }) => {
    try {
      return await authService.googleLogin(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al iniciar sesión con Google';
      return rejectWithValue(message);
    }
  }
);

export const verifyTwoFactorCodeThunk = createAsyncThunk(
  'auth/verifyTwoFactorCode',
  async (data: TwoFactorVerifyData, { rejectWithValue }) => {
    try {
      return await authService.verifyTwoFactorCode(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al verificar el código';
      return rejectWithValue(message);
    }
  }
);

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

export const fetchUserProfile = createAsyncThunk(
  'auth/fetchUserProfile',
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem('authToken');
      const userData = getTokenUser(token);
      if (!userData?.id) throw new Error('No hay sesión activa');
      return await professionalService.getById(userData.id);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al cargar perfil';
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
    logout: (state) => {
      state.user = null;
      state.loginToken = null;
      state.loginSuccess = null;
      localStorage.removeItem('authToken');
    },
    setUser: (state, action) => {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(googleLoginThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.twoFactorSendSuccess = null;
        state.twoFactorPendingEmail = null;
      })
      .addCase(googleLoginThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.loginSuccess = action.payload.message;
        state.loginToken = action.payload.token;
      })
      .addCase(googleLoginThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(sendTwoFactorCodeThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
        state.loginSuccess = null;
      })
      .addCase(sendTwoFactorCodeThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.twoFactorSendSuccess = action.payload.message;
        state.twoFactorPendingEmail = action.payload.email;
      })
      .addCase(sendTwoFactorCodeThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      .addCase(verifyTwoFactorCodeThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(verifyTwoFactorCodeThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.loginSuccess = action.payload.message;
        state.loginToken = action.payload.token;
        state.twoFactorSendSuccess = null;
        state.twoFactorPendingEmail = null;
      })
      .addCase(verifyTwoFactorCodeThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
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
      })
      .addCase(fetchUserProfile.pending, (state) => {
        state.error = null;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.user = action.payload;
      })
      .addCase(fetchUserProfile.rejected, (state) => {
        // Don't set error — this is a background fetch
      });
  },
});

export const { clearAuthState, logout, setUser } = authSlice.actions;
export default authSlice.reducer;
