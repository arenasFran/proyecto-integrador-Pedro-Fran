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

export interface ProductDTO {
  id: string;
  name: string;
  price: number;
  stock: number;
  category: string;
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

export interface MyProfileDTO {
  id: string;
  name: string;
  lastname: string;
  email: string;
  phone: string;
  kind: string;
  photoUrl: string | null;
}

export interface AppointmentDTO {
  id: string;
  serviceName: string;
  barberName?: string;
  date: string;
  startTime: string;
  status: string;
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

function authHeader(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}` };
}

export function getServices(): Promise<{ services: ServiceDTO[] }> {
  return request('/services');
}

export function getBarbersPublic(): Promise<{ barbers: BarberDTO[] }> {
  return request('/barbers/public');
}

export function getProducts(): Promise<{ products: ProductDTO[] }> {
  return request('/products?status=active');
}

export function getSlots(barberId: string, date: string): Promise<SlotsResponse> {
  return request(`/barbers/${barberId}/slots?date=${date}`);
}

export function createGuestAppointment(
  dto: CreateGuestAppointmentDTO,
  accessToken?: string
): Promise<unknown> {
  return request('/appointments', {
    method: 'POST',
    body: JSON.stringify(dto),
    headers: accessToken ? authHeader(accessToken) : undefined,
  });
}

export function getMyProfile(accessToken: string): Promise<MyProfileDTO> {
  return request('/users/me', { headers: authHeader(accessToken) });
}

export function getMyAppointments(
  accessToken: string,
  params: { dateFrom?: string; sortBy?: 'date' | 'startTime'; sortDir?: 'asc' | 'desc'; limit?: number } = {}
): Promise<{ appointments: AppointmentDTO[]; total: number }> {
  const query = new URLSearchParams({ includeBarber: 'true' });
  if (params.dateFrom) query.set('dateFrom', params.dateFrom);
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.sortDir) query.set('sortDir', params.sortDir);
  if (params.limit) query.set('limit', String(params.limit));

  return request(`/appointments?${query.toString()}`, { headers: authHeader(accessToken) });
}

export function cancelAppointmentAsUser(
  accessToken: string,
  appointmentId: string,
  reason?: string
): Promise<{ message: string }> {
  return request(`/appointments/${appointmentId}/cancel`, {
    method: 'PATCH',
    body: JSON.stringify({ reason }),
    headers: authHeader(accessToken),
  });
}
