export type AppointmentStatus = 'Pendiente' | 'Confirmado' | 'Cancelado' | 'Completado' | 'NoShow';

export type StatusHistoryEntry = {
  status: AppointmentStatus;
  timestamp: Date;
  actor: string;
};

export const VALID_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  Pendiente: ['Confirmado', 'Cancelado'],
  Confirmado: ['Completado', 'Cancelado', 'NoShow'],
  Cancelado: [],
  Completado: [],
  NoShow: [],
};
