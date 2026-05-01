import api from './api';

export interface RegisterData {
  email: string;
  password: string;
  repeatPassword: string;
  name: string;
  lastname: string;
  phone: string;
}

export interface RequestResetData {
  email: string;
}

export interface ResetPasswordData {
  token: string;
  password: string;
  repeatPassword: string;
}

export const authService = {
  register: async (data: RegisterData): Promise<string> => {
    const response = await api.post<{ message: string }>('/auth/register', data);
    return response.data.message;
  },

  requestReset: async (data: RequestResetData): Promise<string> => {
    const response = await api.post<{ message: string }>('/auth/request-reset', data);
    return response.data.message;
  },

  resetPassword: async (data: ResetPasswordData): Promise<string> => {
    const response = await api.post<{ message: string }>('/auth/reset-password', {
      token: data.token,
      password: data.password,
    });
    return response.data.message;
  },
};

export default authService;