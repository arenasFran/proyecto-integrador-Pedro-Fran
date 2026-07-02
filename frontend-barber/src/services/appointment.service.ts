import api from './api';
import type { Appointment, CreateAppointmentPayload } from '../types/booking';

type CreateAppointmentResponse = {
  message: string;
  appointment: Appointment;
};

type AppointmentListResponse = {
  appointments: Appointment[];
};

type AppointmentSingleResponse = {
  appointment: Appointment;
};

type CancelAppointmentResponse = {
  message: string;
};

type UpdateStatusPayload = {
  status: 'Cancelado' | 'Completado' | 'NoShow';
  cancelReason?: string;
};

type ReschedulePayload = {
  date: string;
  startTime: string;
  barberId: string;
};

type RescheduleResponse = {
  message: string;
  appointment: Appointment;
};

export type AppointmentQueryParams = {
  barberId?: string;
  clientId?: string;
  date?: string;
  dateFrom?: string;
  dateTo?: string;
  paymentMethod?: string;
  page?: number;
  limit?: number;
  includeBarber?: string;
};

export type PaginatedAppointmentsResponse = {
  appointments: Appointment[];
  total: number;
  page: number;
  totalPages: number;
  limit: number;
};

export const tempLockService = {
  acquire: async (barberId: string, date: string, startTime: string): Promise<string> => {
    const response = await api.post<{ message: string; tempLockId: string }>('/api/appointments/temp-lock', { barberId, date, startTime });
    return response.data.tempLockId;
  },
  release: async (tempLockId: string): Promise<void> => {
    await api.delete(`/api/appointments/temp-lock/${tempLockId}`);
  },
};

export const appointmentService = {
  create: async (payload: CreateAppointmentPayload): Promise<CreateAppointmentResponse> => {
    const response = await api.post<CreateAppointmentResponse>('/api/appointments', payload);
    return response.data;
  },

  list: async (params?: AppointmentQueryParams): Promise<AppointmentListResponse> => {
    const response = await api.get<AppointmentListResponse>('/api/appointments', { params });
    return response.data;
  },

  getById: async (id: string): Promise<AppointmentSingleResponse> => {
    const response = await api.get<AppointmentSingleResponse>(`/api/appointments/${id}`);
    return response.data;
  },

  cancel: async (id: string, reason?: string): Promise<CancelAppointmentResponse> => {
    const response = await api.patch<CancelAppointmentResponse>(`/api/appointments/${id}/cancel`, { reason });
    return response.data;
  },

  updateStatus: async (id: string, payload: UpdateStatusPayload): Promise<{ message: string }> => {
    const response = await api.patch<{ message: string }>(`/api/appointments/${id}/status`, payload);
    return response.data;
  },

  reschedule: async (id: string, payload: ReschedulePayload): Promise<RescheduleResponse> => {
    const response = await api.patch<RescheduleResponse>(`/api/appointments/${id}/reschedule`, payload);
    return response.data;
  },
};

export default appointmentService;
