import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from './baseQuery';
import type { Appointment, CreateAppointmentPayload } from '../types/booking';
import type { AppointmentQueryParams, PaginatedAppointmentsResponse } from './appointment.service';

type QueryParams = AppointmentQueryParams;

export const appointmentApi = createApi({
  reducerPath: 'appointmentApi',
  baseQuery: axiosBaseQuery,
  tagTypes: ['Appointments', 'Appointment'],
  endpoints: (builder) => ({
    createAppointment: builder.mutation<{ message: string; appointment: Appointment }, CreateAppointmentPayload>({
      query: (data) => ({
        url: '/api/appointments',
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

    getAppointmentById: builder.query<Appointment, string>({
      query: (id) => ({
        url: `/api/appointments/${id}`,
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
  }),
});

export const {
  useCreateAppointmentMutation,
  useGetAppointmentsQuery,
  useGetAppointmentsPaginatedQuery,
  useGetAppointmentByIdQuery,
  useCancelAppointmentMutation,
  useUpdateAppointmentStatusMutation,
  useRescheduleAppointmentMutation,
  useMarkAsPaidMutation,
  useSendReminderMutation,
  useChangeBarberMutation,
} = appointmentApi;
