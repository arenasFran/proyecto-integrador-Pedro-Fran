import api from './api';

export interface RegisterData {
  email: string;
  password: string;
  repeatPassword: string;
  name: string;
  lastname: string;
  phone: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface GoogleLoginData {
  token: string;
}

export interface TwoFactorVerifyData {
  email: string;
  code: string;
}

export interface RequestResetData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  password: string;
  repeatPassword: string;
  email: string;
}

export interface LoginResponse {
  message: string;
  token: string;
  refreshToken: string;
}

export interface TwoFactorSendResponse {
  message: string;
}

export interface GoogleLoginSuccessResponse {
  message: string;
  token: string;
  refreshToken: string;
}

export interface GoogleRequiresProfileResponse {
  requiresProfileCompletion: true;
  partialToken: string;
}

export type GoogleLoginResponse = GoogleLoginSuccessResponse | GoogleRequiresProfileResponse;

export interface CompleteGoogleProfileData {
  partialToken: string;
  name: string;
  lastname?: string;
}

export interface RefreshTokenResponse {
  message: string;
  token: string;
  refreshToken: string;
}

export type UserProfile = {
  id: string;
  name: string;
  lastname: string;
  email: string;
  phone: string;
  kind: 'Admin' | 'Empleado' | 'Registrado';
  photoUrl: string | null;
};

export const authService = {
  getProfile: async (): Promise<UserProfile> => {
    const response = await api.get<UserProfile>('/api/users/me');
    return response.data;
  },

  register: async (data: RegisterData): Promise<string> => {
    const response = await api.post<{ message: string }>('/auth/register', data);
    return response.data.message;
  },

  sendTwoFactorCode: async (data: LoginData): Promise<TwoFactorSendResponse> => {
    const response = await api.post<TwoFactorSendResponse>('/auth/2fa/send', data);
    return response.data;
  },

  googleLogin: async (data: GoogleLoginData): Promise<GoogleLoginResponse> => {
    const response = await api.post<GoogleLoginResponse>('/auth/google', data);
    return response.data;
  },

  verifyTwoFactorCode: async (data: TwoFactorVerifyData): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/2fa/verify', data);
    return response.data;
  },

  completeGoogleProfile: async (data: CompleteGoogleProfileData): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/google/complete-profile', data);
    return response.data;
  },

  refreshToken: async (refreshToken: string): Promise<RefreshTokenResponse> => {
    const response = await api.post<RefreshTokenResponse>('/auth/refresh', { refreshToken });
    return response.data;
  },

  requestReset: async (data: RequestResetData): Promise<string> => {
    const response = await api.post<{ message: string }>('/auth/request-reset', data);
    return response.data.message;
  },

  resetPassword: async (data: ResetPasswordData): Promise<string> => {
    const response = await api.post<{ message: string }>('/auth/reset-password', {
      token: data.token,
      password: data.password,
      repeatPassword: data.repeatPassword,
      email: data.email,
    });
    return response.data.message;
  },
};

export default authService;