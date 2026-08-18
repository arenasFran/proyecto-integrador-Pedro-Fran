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
  tagTypes: ['Analytics', 'ClientSanction'],
  refetchOnFocus: true,
  refetchOnReconnect: true,
  endpoints: (builder) => ({
    getOverview: builder.query<OverviewData, { preset?: string; desde?: string; hasta?: string }>({
      query: (params) => ({
        url: '/api/analytics/overview',
        params,
      }),
      providesTags: ['Analytics'],
    }),

    getAppointmentDetails: builder.query<{ appointments: Appointment[]; total: number }, { desde: string; hasta: string }>({
      query: (params) => ({
        url: '/api/analytics/appointments',
        params,
      }),
      providesTags: ['Analytics'],
    }),

    getHeatmap: builder.query<HeatmapEntry[], { year?: number; lastYear?: boolean; desde?: string; hasta?: string }>({
      query: (params) => ({
        url: '/api/analytics/heatmap',
        params,
      }),
      providesTags: ['Analytics'],
    }),

    getReservasGanancias: builder.query<
      ReservasGananciasEntry[],
      { desde: string; hasta: string; granularidad: Granularidad; barberId?: string; serviceId?: string; status?: string }
    >({
      query: (params) => ({
        url: '/api/analytics/charts/reservas-ganancias',
        params,
      }),
      providesTags: ['Analytics'],
    }),

    getHoras: builder.query<HoraEntry[], { desde: string; hasta: string; barberId?: string }>({
      query: (params) => ({
        url: '/api/analytics/charts/horas',
        params,
      }),
      providesTags: ['Analytics'],
    }),

    getDiasSemana: builder.query<DiaSemanaEntry[], { desde: string; hasta: string; barberId?: string }>({
      query: (params) => ({
        url: '/api/analytics/charts/dias-semana',
        params,
      }),
      providesTags: ['Analytics'],
    }),

    getClientesRecurrentes: builder.query<ClientesRecurrentesData, { desde: string; hasta: string }>({
      query: (params) => ({
        url: '/api/analytics/charts/clientes-recurrentes',
        params,
      }),
      providesTags: ['Analytics'],
    }),

    getIngresosPorServicio: builder.query<IngresoServicioEntry[], { desde: string; hasta: string }>({
      query: (params) => ({
        url: '/api/analytics/charts/ingresos-servicio',
        params,
      }),
      providesTags: ['Analytics'],
    }),

    getDistribucion: builder.query<DistribucionData, { desde: string; hasta: string }>({
      query: (params) => ({
        url: '/api/analytics/charts/distribucion',
        params,
      }),
      providesTags: ['Analytics'],
    }),

    getAvailableYears: builder.query<number[], void>({
      query: () => ({ url: '/api/analytics/years' }),
      providesTags: ['Analytics'],
    }),

    getClientesList: builder.query<ClienteData[], { desde: string; hasta: string; search?: string }>({
      query: (params) => ({
        url: '/api/analytics/clientes',
        params,
      }),
      providesTags: ['Analytics', 'ClientSanction'],
    }),

    getNuevosClientes: builder.query<NuevoClienteData[], { desde: string; hasta: string }>({
      query: (params) => ({
        url: '/api/analytics/clientes-nuevos',
        params,
      }),
      providesTags: ['Analytics'],
    }),

    getClientAppointments: builder.query<ClientAppointmentEntry[], string>({
      query: (clientKey) => ({
        url: `/api/analytics/clientes/${clientKey}/turnos`,
      }),
      providesTags: ['Analytics'],
    }),

    getEcommerceOverview: builder.query<EcommerceOverview, { preset?: string; desde?: string; hasta?: string }>({
      query: (params) => ({
        url: '/api/analytics/ecommerce/overview',
        params,
      }),
      providesTags: ['Analytics'],
    }),

    getProductPerformance: builder.query<ProductPerformanceEntry[], { preset?: string; desde?: string; hasta?: string }>({
      query: (params) => ({
        url: '/api/analytics/ecommerce/products',
        params,
      }),
      providesTags: ['Analytics'],
    }),

    getMembershipRevenue: builder.query<ReservasGananciasEntry[], { preset?: string; desde?: string; hasta?: string }>({
      query: (params) => ({
        url: '/api/analytics/memberships/revenue',
        params,
      }),
      providesTags: ['Analytics'],
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
