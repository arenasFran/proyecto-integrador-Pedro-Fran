import { createApi } from '@reduxjs/toolkit/query/react';
import type { AxiosError } from 'axios';
import api from './api';
import type {
  LoginData,
  TwoFactorVerifyData,
  LoginResponse,
  GoogleLoginData,
  GoogleLoginResponse,
  CompleteGoogleProfileData,
  RefreshTokenResponse,
  RegisterData,
  RequestResetData,
  ResetPasswordData,
  UserProfile,
} from './auth.service';

const axiosBaseQuery = async ({ url, method, data, params }: {
  url: string;
  method?: string;
  data?: unknown;
  params?: Record<string, unknown>;
}) => {
  try {
    const result = await api({
      url,
      method: method ?? 'GET',
      data,
      params,
    });
    return { data: result.data };
  } catch (axiosError) {
    const err = axiosError as AxiosError<{ error?: string }>;
    return {
      error: {
        status: err.response?.status,
        data: err.response?.data?.error ?? err.message,
      },
    };
  }
};

export const authApi = createApi({
  reducerPath: 'authApi',
  baseQuery: axiosBaseQuery,
  endpoints: (builder) => ({
    sendTwoFactorCode: builder.mutation<{ message: string }, LoginData>({
      query: (data) => ({
        url: '/auth/2fa/send',
        method: 'POST',
        data,
      }),
    }),

    verifyTwoFactorCode: builder.mutation<LoginResponse, TwoFactorVerifyData>({
      query: (data) => ({
        url: '/auth/2fa/verify',
        method: 'POST',
        data,
      }),
    }),

    googleLogin: builder.mutation<GoogleLoginResponse, GoogleLoginData>({
      query: (data) => ({
        url: '/auth/google',
        method: 'POST',
        data,
      }),
    }),

    completeGoogleProfile: builder.mutation<LoginResponse, CompleteGoogleProfileData>({
      query: (data) => ({
        url: '/auth/google/complete-profile',
        method: 'POST',
        data,
      }),
    }),

    refreshToken: builder.mutation<RefreshTokenResponse, void>({
      query: () => ({
        url: '/auth/refresh',
        method: 'POST',
        data: {},
      }),
    }),

    logout: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: '/auth/logout',
        method: 'POST',
      }),
    }),

    getProfile: builder.query<UserProfile, void>({
      query: () => ({
        url: '/api/users/me',
      }),
    }),

    register: builder.mutation<{ message: string }, RegisterData>({
      query: (data) => ({
        url: '/auth/register',
        method: 'POST',
        data,
      }),
    }),

    requestReset: builder.mutation<{ message: string }, RequestResetData>({
      query: (data) => ({
        url: '/auth/request-reset',
        method: 'POST',
        data,
      }),
    }),

    resetPassword: builder.mutation<{ message: string }, ResetPasswordData>({
      query: (data) => ({
        url: '/auth/reset-password',
        method: 'POST',
        data,
      }),
    }),
  }),
});

export const {
  useSendTwoFactorCodeMutation,
  useVerifyTwoFactorCodeMutation,
  useGoogleLoginMutation,
  useCompleteGoogleProfileMutation,
  useRefreshTokenMutation,
  useGetProfileQuery,
  useLazyGetProfileQuery,
  useRegisterMutation,
  useRequestResetMutation,
  useResetPasswordMutation,
  useLogoutMutation,
} = authApi;
