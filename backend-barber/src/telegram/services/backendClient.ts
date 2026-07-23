import { getConfig } from '../../infrastructure/config/env';

export interface ServiceDTO {
  id: string;
  name: string;
  price: number;
}

export interface BarberDTO {
  id: string;
  name: string;
  lastname: string;
}

export interface SlotsResponse {
  date: string;
  slots: string[];
  reason?: 'day-off' | 'already-past' | 'fully-booked';
}

export interface CreateGuestAppointmentDTO {
  barberId: string;
  serviceId: string;
  date: string;
  startTime: string;
  clientName: string;
  clientLastname: string;
  clientPhone: string;
  clientEmail: string;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const { apiBaseUrl } = getConfig().telegram;
  const res = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(body?.error || `Error ${res.status} llamando a ${path}`);
  }
  return body as T;
}

export function getServices(): Promise<{ services: ServiceDTO[] }> {
  return request('/services');
}

export function getBarbersPublic(): Promise<{ barbers: BarberDTO[] }> {
  return request('/barbers/public');
}

export function getSlots(barberId: string, date: string): Promise<SlotsResponse> {
  return request(`/barbers/${barberId}/slots?date=${date}`);
}

export function createGuestAppointment(dto: CreateGuestAppointmentDTO): Promise<unknown> {
  return request('/appointments', { method: 'POST', body: JSON.stringify(dto) });
}
