import { createApi } from '@reduxjs/toolkit/query/react';
import type { AxiosError } from 'axios';
import api from './api';
import type { Appointment } from '../types/booking';
import type { AppointmentQueryParams } from './appointment.service';

type QueryParams = AppointmentQueryParams;

const axiosBaseQuery = async ({ url, method, data, params }: {
  url: string;
  method?: string;
  data?: unknown;
  params?: QueryParams;
}) => {
  try {
    const result = await api({
      url,
      method: method ?? 'GET',
      data,
      params,
    });
    return { data: result.data };
  } catch (axiosError) {
    const err = axiosError as AxiosError<{ error?: string }>;
    return {
      error: {
        status: err.response?.status,
        data: err.response?.data?.error ?? err.message,
      },
    };
  }
};

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
