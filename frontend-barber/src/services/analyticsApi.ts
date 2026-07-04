import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from './baseQuery';
import type {
  ClientesRecurrentesData,
  DistribucionData,
  DiaSemanaEntry,
  Granularidad,
  HeatmapEntry,
  HoraEntry,
  IngresoServicioEntry,
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

    getHeatmap: builder.query<HeatmapEntry[], { year?: number; lastYear?: boolean }>({
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

    getHoras: builder.query<HoraEntry[], { desde: string; hasta: string; barberId?: string }>({
      query: (params) => ({
        url: '/api/analytics/charts/horas',
        params,
      }),
    }),

    getDiasSemana: builder.query<DiaSemanaEntry[], { desde: string; hasta: string; barberId?: string }>({
      query: (params) => ({
        url: '/api/analytics/charts/dias-semana',
        params,
      }),
    }),

    getClientesRecurrentes: builder.query<ClientesRecurrentesData, { desde: string; hasta: string }>({
      query: (params) => ({
        url: '/api/analytics/charts/clientes-recurrentes',
        params,
      }),
    }),

    getIngresosPorServicio: builder.query<IngresoServicioEntry[], { desde: string; hasta: string }>({
      query: (params) => ({
        url: '/api/analytics/charts/ingresos-servicio',
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
  useGetHorasQuery,
  useGetDiasSemanaQuery,
  useGetClientesRecurrentesQuery,
  useGetIngresosPorServicioQuery,
} = analyticsApi;
