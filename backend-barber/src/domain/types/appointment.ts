export type AppointmentStatus = 'Pendiente' | 'Confirmado' | 'Cancelado' | 'Completado';

export const VALID_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  Pendiente: ['Confirmado', 'Cancelado'],
  Confirmado: ['Completado', 'Cancelado'],
  Cancelado: [],
  Completado: [],
};
