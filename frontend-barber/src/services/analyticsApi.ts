import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from './baseQuery';
import type {
  ClienteData,
  ClientAppointmentEntry,
  ClientesRecurrentesData,
  DistribucionData,
  DiaSemanaEntry,
  Granularidad,
  HeatmapEntry,
  HoraEntry,
  IngresoServicioEntry,
  NuevoClienteData,
  OverviewData,
  ReservasGananciasEntry,
} from '../types/analytics';
import type { Appointment } from '../types/booking';

export const analyticsApi = createApi({
  reducerPath: 'analyticsApi',
  baseQuery: axiosBaseQuery,
  tagTypes: ['ClientSanction'],
  endpoints: (builder) => ({
    getOverview: builder.query<OverviewData, { preset?: string; desde?: string; hasta?: string }>({
      query: (params) => ({
        url: '/api/analytics/overview',
        params,
      }),
    }),

    getAppointmentDetails: builder.query<{ appointments: Appointment[]; total: number }, { desde: string; hasta: string }>({
      query: (params) => ({
        url: '/api/analytics/appointments',
        params,
      }),
    }),

    getHeatmap: builder.query<HeatmapEntry[], { year?: number; lastYear?: boolean; desde?: string; hasta?: string }>({
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

    getClientesList: builder.query<ClienteData[], { desde: string; hasta: string; search?: string }>({
      query: (params) => ({
        url: '/api/analytics/clientes',
        params,
      }),
      providesTags: ['ClientSanction'],
    }),

    getNuevosClientes: builder.query<NuevoClienteData[], { desde: string; hasta: string }>({
      query: (params) => ({
        url: '/api/analytics/clientes-nuevos',
        params,
      }),
    }),

    getClientAppointments: builder.query<ClientAppointmentEntry[], string>({
      query: (clientKey) => ({
        url: `/api/analytics/clientes/${clientKey}/turnos`,
      }),
    }),

    getEcommerceOverview: builder.query<EcommerceOverview, { preset?: string; desde?: string; hasta?: string }>({
      query: (params) => ({
        url: '/api/analytics/ecommerce/overview',
        params,
      }),
    }),

    getProductPerformance: builder.query<ProductPerformanceEntry[], { preset?: string; desde?: string; hasta?: string }>({
      query: (params) => ({
        url: '/api/analytics/ecommerce/products',
        params,
      }),
    }),

    getMembershipRevenue: builder.query<ReservasGananciasEntry[], { preset?: string; desde?: string; hasta?: string }>({
      query: (params) => ({
        url: '/api/analytics/memberships/revenue',
        params,
      }),
    }),
  }),
});

export type EcommerceOverview = {
  totalOrders: number;
  totalRevenue: number;
  averageTicket: number;
  ordersByStatus: Record<string, number>;
  paidOrders: number;
  cancelledOrders: number;
};

export type ProductPerformanceEntry = {
  productId: string;
  name: string;
  totalSold: number;
  totalRevenue: number;
  timesOrdered: number;
};

export const {
  useGetOverviewQuery,
  useGetAppointmentDetailsQuery,
  useGetHeatmapQuery,
  useGetReservasGananciasQuery,
  useGetDistribucionQuery,
  useGetAvailableYearsQuery,
  useGetHorasQuery,
  useGetDiasSemanaQuery,
  useGetClientesRecurrentesQuery,
  useGetIngresosPorServicioQuery,
  useGetClientesListQuery,
  useGetNuevosClientesQuery,
  useGetClientAppointmentsQuery,
  useGetEcommerceOverviewQuery,
  useGetProductPerformanceQuery,
  useGetMembershipRevenueQuery,
} = analyticsApi;
