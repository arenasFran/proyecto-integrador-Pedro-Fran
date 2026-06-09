import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  authService,
  type CompleteGoogleProfileData,
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

const REFRESH_TOKEN_KEY = 'refreshToken';

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
  refreshToken: string | null;
  requiresProfileCompletion: string | null;
  profileCompletionError: string | null;
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
  refreshToken: null,
  requiresProfileCompletion: null,
  profileCompletionError: null,
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
      const response = await authService.googleLogin(data);
      if ('requiresProfileCompletion' in response) {
        return response;
      }
      return response;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al iniciar sesión con Google';
      if (message === 'ACCOUNT_EXISTS_LOCAL') {
        return rejectWithValue('Este email ya está registrado con una contraseña. Usá el formulario de inicio de sesión.');
      }
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

export const completeGoogleProfileThunk = createAsyncThunk(
  'auth/completeGoogleProfile',
  async (data: CompleteGoogleProfileData, { rejectWithValue }) => {
    try {
      return await authService.completeGoogleProfile(data);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al completar el perfil';
      return rejectWithValue(message);
    }
  }
);

export const refreshTokenThunk = createAsyncThunk(
  'auth/refreshToken',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { auth: AuthState };
      const storedRefreshToken = state.auth.refreshToken || localStorage.getItem(REFRESH_TOKEN_KEY);
      if (!storedRefreshToken) {
        return rejectWithValue('No hay refresh token disponible');
      }
      return await authService.refreshToken(storedRefreshToken);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error al renovar el token';
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
      state.refreshToken = null;
      state.requiresProfileCompletion = null;
      localStorage.removeItem('authToken');
      localStorage.removeItem(REFRESH_TOKEN_KEY);
    },
    clearProfileCompletion: (state) => {
      state.requiresProfileCompletion = null;
      state.profileCompletionError = null;
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
        if ('requiresProfileCompletion' in action.payload) {
          state.requiresProfileCompletion = action.payload.partialToken;
          return;
        }
        state.loginSuccess = action.payload.message;
        state.loginToken = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        localStorage.setItem(REFRESH_TOKEN_KEY, action.payload.refreshToken);
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
        state.refreshToken = action.payload.refreshToken;
        state.twoFactorSendSuccess = null;
        state.twoFactorPendingEmail = null;
        localStorage.setItem(REFRESH_TOKEN_KEY, action.payload.refreshToken);
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
      .addCase(completeGoogleProfileThunk.pending, (state) => {
        state.isLoading = true;
        state.profileCompletionError = null;
      })
      .addCase(completeGoogleProfileThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.loginSuccess = action.payload.message;
        state.loginToken = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.requiresProfileCompletion = null;
        localStorage.setItem('authToken', action.payload.token);
        localStorage.setItem(REFRESH_TOKEN_KEY, action.payload.refreshToken);
      })
      .addCase(completeGoogleProfileThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.profileCompletionError = action.payload as string;
      })
      .addCase(refreshTokenThunk.pending, (state) => {
        state.error = null;
      })
      .addCase(refreshTokenThunk.fulfilled, (state, action) => {
        state.loginToken = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        localStorage.setItem('authToken', action.payload.token);
        localStorage.setItem(REFRESH_TOKEN_KEY, action.payload.refreshToken);
      })
      .addCase(refreshTokenThunk.rejected, (state) => {
        state.loginToken = null;
        state.refreshToken = null;
        state.user = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem(REFRESH_TOKEN_KEY);
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

export const { clearAuthState, logout, setUser, clearProfileCompletion } = authSlice.actions;
export default authSlice.reducer;
