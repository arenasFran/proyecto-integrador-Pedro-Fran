import { createApi } from '@reduxjs/toolkit/query/react';
import type { Appointment, ClientSearchResult, CreateAppointmentPayload } from '../types/booking';
import type { PaginatedAppointmentsResponse } from './appointment.service';
import { axiosBaseQuery } from './baseQuery';

export type QueryParams = {
  barberId?: string;
  clientId?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  status?: string;
  paymentMethod?: string;
  paymentStatus?: string;
  searchTerm?: string;
  page?: number;
  limit?: number;
  includeBarber?: string;
  includeClient?: string;
  sortBy?: 'date' | 'startTime';
  sortDir?: 'asc' | 'desc';
};

export const appointmentApi = createApi({
  reducerPath: 'appointmentApi',
  baseQuery: axiosBaseQuery,
  tagTypes: ['Appointments', 'Appointment'],
  endpoints: (builder) => ({
    acquireTempLock: builder.mutation<{ tempLockId: string }, { barberId: string; date: string; startTime: string }>({
      query: (data) => ({
        url: '/api/appointments/temp-lock',
        method: 'POST',
        data,
      }),
    }),

    releaseTempLock: builder.mutation<void, string>({
      query: (tempLockId) => ({
        url: `/api/appointments/temp-lock/${tempLockId}`,
        method: 'DELETE',
      }),
    }),

    createAppointment: builder.mutation<{ message: string; appointment: Appointment; preferenceId?: string; initPoint?: string }, CreateAppointmentPayload>({
      query: (data) => ({
        url: '/api/appointments',
        method: 'POST',
        data,
      }),
      invalidatesTags: ['Appointments'],
    }),

    createAdminAppointment: builder.mutation<{ message: string; appointment: Appointment; preferenceId?: string; initPoint?: string }, CreateAppointmentPayload>({
      query: (data) => ({
        url: '/api/appointments/admin',
        method: 'POST',
        data,
      }),
      invalidatesTags: ['Appointments'],
    }),

    getAppointments: builder.query<Appointment[], QueryParams | void>({
      query: (params) => ({
        url: '/api/appointments',
        params: params ?? undefined,
      }),
      transformResponse: (response: PaginatedAppointmentsResponse | { appointments: Appointment[] }) => {
        if ('total' in response) {
          return response.appointments;
        }
        return response.appointments;
      },
      providesTags: ['Appointments'],
    }),

    getAppointmentsPaginated: builder.query<PaginatedAppointmentsResponse, QueryParams>({
      query: (params) => ({
        url: '/api/appointments',
        params,
      }),
      transformResponse: (response: PaginatedAppointmentsResponse) => response,
      providesTags: ['Appointments'],
    }),

    getAppointmentsSummary: builder.query<{ total: number; countsByStatus: Record<string, number> }, Omit<QueryParams, 'page' | 'limit'>>({
      query: (params) => ({
        url: '/api/appointments/summary',
        params,
      }),
      transformResponse: (response: { total: number; countsByStatus: Record<string, number> }) => response,
      providesTags: ['Appointments'],
    }),

    getAppointmentById: builder.query<Appointment, string>({
      query: (id) => ({
        url: `/api/appointments/${id}`,
        params: { includeBarber: 'true', includeClient: 'true' },
      }),
      transformResponse: (response: { appointment: Appointment }) => response.appointment,
      providesTags: (_result, _error, id) => [{ type: 'Appointment', id }],
    }),

    cancelAppointment: builder.mutation<{ message: string }, { id: string; reason?: string }>({
      query: ({ id, reason }) => ({
        url: `/api/appointments/${id}/cancel`,
        method: 'PATCH',
        data: { reason },
      }),
      invalidatesTags: ['Appointments', 'Appointment'],
    }),

    updateAppointmentStatus: builder.mutation<
      { message: string },
      { id: string; status: 'Cancelado' | 'Completado' | 'NoShow'; cancelReason?: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/api/appointments/${id}/status`,
        method: 'PATCH',
        data: body,
      }),
      invalidatesTags: ['Appointments', 'Appointment'],
    }),

    rescheduleAppointment: builder.mutation<
      { message: string; appointment: Appointment },
      { id: string; date: string; startTime: string; barberId: string }
    >({
      query: ({ id, ...body }) => ({
        url: `/api/appointments/${id}/reschedule`,
        method: 'PATCH',
        data: body,
      }),
      invalidatesTags: ['Appointments', 'Appointment'],
    }),

    markAsPaid: builder.mutation<{ message: string }, { id: string }>({
      query: ({ id }) => ({
        url: `/api/appointments/${id}/payment`,
        method: 'PATCH',
      }),
      invalidatesTags: ['Appointments', 'Appointment'],
    }),

    sendReminder: builder.mutation<{ message: string }, { id: string }>({
      query: ({ id }) => ({
        url: `/api/appointments/${id}/send-reminder`,
        method: 'POST',
      }),
      invalidatesTags: ['Appointments'],
    }),

    changeBarber: builder.mutation<{ message: string }, { id: string; barberId: string }>({
      query: ({ id, barberId }) => ({
        url: `/api/appointments/${id}/change-barber`,
        method: 'PATCH',
        data: { barberId },
      }),
      invalidatesTags: ['Appointments', 'Appointment'],
    }),

    searchClients: builder.query<ClientSearchResult[], string>({
      query: (q) => ({
        url: '/api/appointments/clients/search',
        params: { q },
      }),
    }),
  }),
});

export const {
  useAcquireTempLockMutation,
  useReleaseTempLockMutation,
  useCreateAppointmentMutation,
  useCreateAdminAppointmentMutation,
  useGetAppointmentsQuery,
  useGetAppointmentsPaginatedQuery,
  useGetAppointmentsSummaryQuery,
  useGetAppointmentByIdQuery,
  useCancelAppointmentMutation,
  useUpdateAppointmentStatusMutation,
  useRescheduleAppointmentMutation,
  useMarkAsPaidMutation,
  useSendReminderMutation,
  useChangeBarberMutation,
  useLazySearchClientsQuery,
} = appointmentApi;
