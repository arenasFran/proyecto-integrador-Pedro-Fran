import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from './baseQuery';
import type { Service } from '../types/booking';

export const serviceApi = createApi({
  reducerPath: 'serviceApi',
  baseQuery: axiosBaseQuery,
  tagTypes: ['Services'],
  endpoints: (builder) => ({
    getServices: builder.query<Service[], void>({
      query: () => ({
        url: '/api/services',
      }),
      transformResponse: (response: { services: Service[] }) => response.services,
      providesTags: ['Services'],
    }),

    getServicesAdmin: builder.query<Service[], void>({
      query: () => ({
        url: '/api/services',
        params: { includeInactive: 'true' },
      }),
      transformResponse: (response: { services: Service[] }) => response.services,
      providesTags: ['Services'],
    }),

    createService: builder.mutation<{ service: Service }, { name: string; description: string; price: number; imageUrl?: string }>({
      query: (data) => ({
        url: '/api/services',
        method: 'POST',
        data,
      }),
      invalidatesTags: ['Services'],
    }),

    updateService: builder.mutation<{ service: Service }, { id: string; data: Partial<{ name: string; description: string; price: number; imageUrl: string; isActive: boolean }> }>({
      query: ({ id, data }) => ({
        url: `/api/services/${id}`,
        method: 'PUT',
        data,
      }),
      invalidatesTags: ['Services'],
    }),

    deleteService: builder.mutation<{ service: Service }, string>({
      query: (id) => ({
        url: `/api/services/${id}`,
        method: 'DELETE',
      }),
      invalidatesTags: ['Services'],
    }),
  }),
});

export const {
  useGetServicesQuery,
  useGetServicesAdminQuery,
  useCreateServiceMutation,
  useUpdateServiceMutation,
  useDeleteServiceMutation,
} = serviceApi;
