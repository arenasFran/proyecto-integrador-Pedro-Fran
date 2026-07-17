import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from './baseQuery';
import type { Payment } from '../types/payment';

export const paymentApi = createApi({
  reducerPath: 'paymentApi',
  baseQuery: axiosBaseQuery,
  tagTypes: ['Payment'],
  endpoints: (builder) => ({
    getPaymentById: builder.query<{ payment: Payment }, string>({
      query: (id) => ({ url: `/api/payments/${id}` }),
      providesTags: (_result, _error, id) => [{ type: 'Payment', id }],
    }),
    getPaymentByPreferenceId: builder.query<{ payment: Payment | null }, string>({
      query: (preferenceId) => ({ url: `/api/payments/by-preference/${preferenceId}` }),
    }),
    getPaymentByReference: builder.query<{ payment: Payment | null }, { referenceId: string; type: string }>({
      query: ({ referenceId, type }) => ({ url: `/api/payments/by-reference/${referenceId}`, params: { type } }),
    }),
    getAllPayments: builder.query<{ data: Payment[]; total: number; page: number; totalPages: number; limit: number }, { type?: string; status?: string; page?: number; limit?: number }>({
      query: (params) => ({ url: '/api/payments', params }),
      providesTags: ['Payment'],
    }),
  }),
});

export const {
  useGetPaymentByIdQuery,
  useGetPaymentByPreferenceIdQuery,
  useGetPaymentByReferenceQuery,
  useGetAllPaymentsQuery,
} = paymentApi;
