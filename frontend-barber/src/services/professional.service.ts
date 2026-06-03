import api from './api';
import type {
  BarberSchedule,
  Professional,
  ProfessionalPayload,
  ProfessionalUpdatePayload,
  SlotsResponse,
} from '../types/professional';

type ProfessionalsResponse = {
  barbers: Professional[];
};

type ScheduleResponse = {
  schedule: BarberSchedule;
};

export const professionalService = {
  list: async (): Promise<Professional[]> => {
    const response = await api.get<ProfessionalsResponse>('/api/barbers');
    return response.data.barbers;
  },

  getById: async (id: string): Promise<Professional> => {
    const response = await api.get<Professional>(`/api/barbers/${id}`);
    return response.data;
  },

  create: async (payload: ProfessionalPayload): Promise<Professional> => {
    const response = await api.post<Professional>('/api/barbers', payload);
    return response.data;
  },

  update: async (id: string, payload: ProfessionalUpdatePayload): Promise<Professional> => {
    const response = await api.put<Professional>(`/api/barbers/${id}`, payload);
    return response.data;
  },

  remove: async (id: string): Promise<string> => {
    const response = await api.delete<{ message: string }>(`/api/barbers/${id}`);
    return response.data.message;
  },

  getSchedule: async (id: string): Promise<BarberSchedule> => {
    const response = await api.get<ScheduleResponse>(`/api/barbers/${id}/schedule`);
    return response.data.schedule;
  },

  updateSchedule: async (id: string, schedule: BarberSchedule): Promise<BarberSchedule> => {
    const response = await api.put<ScheduleResponse>(`/api/barbers/${id}/schedule`, schedule);
    return response.data.schedule;
  },

  getSlots: async (id: string, date: string): Promise<SlotsResponse> => {
    const response = await api.get<SlotsResponse>(`/api/barbers/${id}/slots`, {
      params: { date },
    });
    return response.data;
  },
};

export default professionalService;
