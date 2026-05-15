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
}

export interface LoginResponse {
  message: string;
  token: string;
}

export interface TwoFactorSendResponse {
  message: string;
}

export const authService = {
  register: async (data: RegisterData): Promise<string> => {
    const response = await api.post<{ message: string }>('/auth/register', data);
    return response.data.message;
  },

  sendTwoFactorCode: async (data: LoginData): Promise<TwoFactorSendResponse> => {
    const response = await api.post<TwoFactorSendResponse>('/auth/2fa/send', data);
    return response.data;
  },

  googleLogin: async (data: GoogleLoginData): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/google', data);
    return response.data;
  },

  verifyTwoFactorCode: async (data: TwoFactorVerifyData): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/auth/2fa/verify', data);
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
    });
    return response.data.message;
  },
};

export default authService;