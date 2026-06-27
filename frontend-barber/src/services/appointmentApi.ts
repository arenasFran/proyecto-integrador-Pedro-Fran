import { createApi } from '@reduxjs/toolkit/query/react';
import { axiosBaseQuery } from './baseQuery';
import type { Appointment } from '../types/booking';
import type { AppointmentQueryParams } from './appointment.service';

type QueryParams = AppointmentQueryParams;

export const appointmentApi = createApi({
  reducerPath: 'appointmentApi',
  baseQuery: axiosBaseQuery,
  tagTypes: ['Appointments', 'Appointment'],
  endpoints: (builder) => ({
    getAppointments: builder.query<Appointment[], QueryParams | void>({
      query: (params) => ({
        url: '/api/appointments',
        params: params ?? undefined,
      }),
      transformResponse: (response: { appointments: Appointment[] }) => response.appointments,
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
  }),
});

export const {
  useGetAppointmentsQuery,
  useGetAppointmentByIdQuery,
  useCancelAppointmentMutation,
  useUpdateAppointmentStatusMutation,
  useRescheduleAppointmentMutation,
} = appointmentApi;
