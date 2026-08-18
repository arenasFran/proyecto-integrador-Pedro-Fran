import { skipToken } from '@reduxjs/toolkit/query';
import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from './baseQuery';

export type RemoteCartItem = { productId: string; quantity: number };
export type RemoteCart = { items: RemoteCartItem[] };

export const cartApi = createApi({
  reducerPath: 'cartApi',
  baseQuery: axiosBaseQuery,
  tagTypes: ['Cart'],
  endpoints: (builder) => ({
    getCart: builder.query<RemoteCart, void>({
      query: () => ({ url: '/api/cart' }),
      providesTags: ['Cart'],
    }),
    syncCart: builder.mutation<RemoteCart, { items: RemoteCartItem[] }>({
      query: (data) => ({ url: '/api/cart/sync', method: 'POST', data }),
      invalidatesTags: ['Cart'],
    }),
    clearCart: builder.mutation<{ message: string }, void>({
      query: () => ({ url: '/api/cart', method: 'DELETE' }),
      invalidatesTags: ['Cart'],
    }),
  }),
});

export const { useGetCartQuery, useSyncCartMutation, useClearCartMutation } = cartApi;
export { skipToken };
