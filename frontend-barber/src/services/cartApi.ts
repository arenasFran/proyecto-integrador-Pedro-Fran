import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from './baseQuery';

export interface CartItemInput {
  productId: string;
  quantity: number;
}

export interface CartResponse {
  items: CartItemInput[];
}

export const cartApi = createApi({
  reducerPath: 'cartApi',
  baseQuery: axiosBaseQuery,
  tagTypes: ['Cart'],
  endpoints: (builder) => ({
    getCart: builder.query<CartResponse, void>({
      query: () => ({ url: '/api/cart' }),
      providesTags: ['Cart'],
    }),

    syncCart: builder.mutation<CartResponse, { items: CartItemInput[] }>({
      query: (data) => ({
        url: '/api/cart/sync',
        method: 'POST',
        data,
      }),
      invalidatesTags: ['Cart'],
    }),

    clearCart: builder.mutation<{ message: string }, void>({
      query: () => ({
        url: '/api/cart',
        method: 'DELETE',
      }),
      invalidatesTags: ['Cart'],
    }),
  }),
});

export const {
  useGetCartQuery,
  useSyncCartMutation,
  useClearCartMutation,
} = cartApi;