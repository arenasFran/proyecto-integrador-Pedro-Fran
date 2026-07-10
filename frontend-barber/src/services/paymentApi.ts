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
  }),
});

export const {
  useGetPaymentByIdQuery,
  useGetPaymentByPreferenceIdQuery,
} = paymentApi;
