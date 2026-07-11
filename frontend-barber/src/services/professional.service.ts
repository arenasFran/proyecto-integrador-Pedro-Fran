import api from './api';
import type { BarberPublic } from '../types/booking';
import type {
  BarberSchedule,
  Professional,
  ProfessionalPayload,
  ProfessionalUpdatePayload,
  SlotsResponse,
} from '../types/professional';

type ProfessionalRaw = Omit<Professional, 'id'> & { _id: string };
type ProfessionalsResponse = {
  barbers: ProfessionalRaw[];
  total?: number;
  page?: number;
  totalPages?: number;
  limit?: number;
};

type PublicBarbersResponse = {
  barbers: (Omit<BarberPublic, 'id'> & { id?: string; _id?: string; maxAdvanceDays?: number })[];
};

type ScheduleResponse = {
  schedule: BarberSchedule;
};

const mapProfessional = (raw: ProfessionalRaw): Professional => {
  const { _id, ...rest } = raw;
  return { id: _id, ...rest };
};

const mapBarberPublic = (raw: PublicBarbersResponse['barbers'][number]): BarberPublic => {
  return {
    id: raw.id ?? raw._id ?? '',
    name: raw.name,
    lastname: raw.lastname,
    services: raw.services,
    photoUrl: raw.photoUrl,
    isActive: raw.isActive,
    slotDuration: raw.slotDuration,
    maxAdvanceDays: raw.maxAdvanceDays ?? 30,
    schedule: raw.schedule,
  };
};

export const professionalService = {
  getPublic: async (): Promise<BarberPublic[]> => {
    const response = await api.get<PublicBarbersResponse>('/api/barbers/public');
    return response.data.barbers.map(mapBarberPublic);
  },

  list: async (params?: { page?: number; limit?: number }): Promise<Professional[]> => {
    const response = await api.get<ProfessionalsResponse>('/api/barbers', { params });
    return response.data.barbers.map(mapProfessional);
  },

  listPaginated: async (params: { page?: number; limit?: number; search?: string }): Promise<{ barbers: Professional[]; total: number; page: number; totalPages: number; limit: number }> => {
    const response = await api.get<ProfessionalsResponse>('/api/barbers', { params });
    return {
      barbers: response.data.barbers.map(mapProfessional),
      total: response.data.total ?? 0,
      page: response.data.page ?? 1,
      totalPages: response.data.totalPages ?? 1,
      limit: response.data.limit ?? 50,
    };
  },

  getById: async (id: string): Promise<Professional> => {
    const response = await api.get<ProfessionalRaw>(`/api/barbers/${id}`);
    return mapProfessional(response.data);
  },

  create: async (payload: ProfessionalPayload): Promise<Professional> => {
    const response = await api.post<ProfessionalRaw>('/api/barbers', payload);
    return mapProfessional(response.data);
  },

  update: async (id: string, payload: ProfessionalUpdatePayload): Promise<Professional> => {
    const response = await api.put<ProfessionalRaw>(`/api/barbers/${id}`, payload);
    return mapProfessional(response.data);
  },

  remove: async (id: string): Promise<string> => {
    const response = await api.delete<{ message: string }>(`/api/barbers/${id}`);
    return response.data.message;
  },

  deactivate: async (id: string): Promise<{ message: string }> => {
    const response = await api.patch<{ message: string }>(`/api/barbers/${id}/deactivate`);
    return response.data;
  },

  activate: async (id: string): Promise<Professional> => {
    const response = await api.put<ProfessionalRaw>(`/api/barbers/${id}`, { isActive: true });
    return mapProfessional(response.data);
  },

  getSchedule: async (id: string): Promise<BarberSchedule> => {
    const response = await api.get<ScheduleResponse>(`/api/barbers/${id}/schedule`);
    return response.data.schedule;
  },

  updateSchedule: async (id: string, schedule: BarberSchedule): Promise<BarberSchedule> => {
    const response = await api.put<ScheduleResponse>(`/api/barbers/${id}/schedule`, schedule);
    return response.data.schedule;
  },

  getSlots: async (id: string, date: string, excludeAppointmentId?: string): Promise<SlotsResponse> => {
    const response = await api.get<SlotsResponse>(`/api/barbers/${id}/slots`, {
      params: excludeAppointmentId ? { date, excludeAppointmentId } : { date },
    });
    return response.data;
  },
};

export default professionalService;
