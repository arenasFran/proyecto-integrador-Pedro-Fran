import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from './baseQuery';
import type { Order, OrdersResponse, CreateOrderPayload, CreateManualOrderPayload } from '../types/order';
import type { InitiatePaymentResponse } from '../types/payment';

export const orderApi = createApi({
  reducerPath: 'orderApi',
  baseQuery: axiosBaseQuery,
  tagTypes: ['Orders', 'Order'],
  endpoints: (builder) => ({
    createOrder: builder.mutation<InitiatePaymentResponse, CreateOrderPayload>({
      query: (data) => ({
        url: '/api/orders',
        method: 'POST',
        data,
      }),
      invalidatesTags: ['Orders'],
    }),

    getMyOrders: builder.query<{ orders: Order[] }, void>({
      query: () => ({ url: '/api/orders/me' }),
      providesTags: ['Orders'],
    }),

    getAllOrders: builder.query<OrdersResponse, { status?: string; page?: number; limit?: number; desde?: string; hasta?: string } | void>({
      query: (params) => ({
        url: '/api/orders',
        params: params ?? undefined,
      }),
      providesTags: ['Orders'],
    }),

    getOrderById: builder.query<{ order: Order }, string>({
      query: (id) => ({ url: `/api/orders/${id}` }),
      providesTags: (_result, _error, id) => [{ type: 'Order', id }],
    }),

    updateOrderStatus: builder.mutation<{ order: Order }, { id: string; status: string }>({
      query: ({ id, status }) => ({
        url: `/api/orders/${id}/status`,
        method: 'PATCH',
        data: { status },
      }),
      invalidatesTags: ['Orders', 'Order'],
    }),

    deleteOrder: builder.mutation<{ message: string }, string>({
      query: (id) => ({
        url: `/api/orders/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Orders'],
    }),

    createManualOrder: builder.mutation<{ order: Order }, CreateManualOrderPayload>({
      query: (data) => ({
        url: '/api/orders/manual',
        method: 'POST',
        data,
      }),
      invalidatesTags: ['Orders'],
    }),
  }),
});

export const {
  useCreateOrderMutation,
  useGetMyOrdersQuery,
  useGetAllOrdersQuery,
  useGetOrderByIdQuery,
  useUpdateOrderStatusMutation,
  useDeleteOrderMutation,
  useCreateManualOrderMutation,
} = orderApi;
