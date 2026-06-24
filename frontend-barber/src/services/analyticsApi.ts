import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from './baseQuery';
import type {
  DistribucionData,
  Granularidad,
  HeatmapEntry,
  OverviewData,
  ReservasGananciasEntry,
} from '../types/analytics';

export const analyticsApi = createApi({
  reducerPath: 'analyticsApi',
  baseQuery: axiosBaseQuery,
  endpoints: (builder) => ({
    getOverview: builder.query<OverviewData, { preset?: string; desde?: string; hasta?: string }>({
      query: (params) => ({
        url: '/api/analytics/overview',
        params,
      }),
    }),

    getHeatmap: builder.query<HeatmapEntry[], { anio?: number; ultimoAnio?: boolean }>({
      query: (params) => ({
        url: '/api/analytics/heatmap',
        params,
      }),
    }),

    getReservasGanancias: builder.query<
      ReservasGananciasEntry[],
      { desde: string; hasta: string; granularidad: Granularidad; barberId?: string; serviceId?: string; status?: string }
    >({
      query: (params) => ({
        url: '/api/analytics/charts/reservas-ganancias',
        params,
      }),
    }),

    getDistribucion: builder.query<DistribucionData, { desde: string; hasta: string }>({
      query: (params) => ({
        url: '/api/analytics/charts/distribucion',
        params,
      }),
    }),

    getAvailableYears: builder.query<number[], void>({
      query: () => ({ url: '/api/analytics/years' }),
    }),
  }),
});

export const {
  useGetOverviewQuery,
  useGetHeatmapQuery,
  useGetReservasGananciasQuery,
  useGetDistribucionQuery,
  useGetAvailableYearsQuery,
} = analyticsApi;
