import api from './api';
import type { Appointment, CreateAppointmentPayload } from '../types/booking';

type CreateAppointmentResponse = {
  message: string;
  appointment: Appointment;
};

export const appointmentService = {
  create: async (payload: CreateAppointmentPayload): Promise<CreateAppointmentResponse> => {
    const response = await api.post<CreateAppointmentResponse>('/api/appointments', payload);
    return response.data;
  },
};

export default appointmentService;
