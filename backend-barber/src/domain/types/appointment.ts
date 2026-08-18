export type AppointmentStatus = 'Confirmado' | 'Completado' | 'Cancelado' | 'NoShow';

export type PaymentStatus = 'Pendiente' | 'Pagado' | 'Cancelado';

export type PaymentMethod = 'local' | 'online' | 'memberPass';

export type StatusHistoryEntry = {
  status: AppointmentStatus;
  timestamp: Date;
  actor: string;
};

export const VALID_TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  Confirmado: ['Completado', 'Cancelado', 'NoShow'],
  Completado: [],
  Cancelado: [],
  NoShow: [],
};

export const STATUS_CATEGORIES = {
  countsAsRevenue: ['Completado'] as AppointmentStatus[],
  countsAsActivity: ['Confirmado', 'Completado', 'Cancelado', 'NoShow'] as AppointmentStatus[],
  countsAsDuration: ['Confirmado', 'Completado'] as AppointmentStatus[],
} as const;

export function appointmentCountsAsRevenue(
  status: AppointmentStatus,
  paymentStatus: PaymentStatus,
  paymentMethod?: PaymentMethod
): boolean {
  if (paymentMethod === 'memberPass') return false;

  return (
    STATUS_CATEGORIES.countsAsRevenue.includes(status) ||
    (status === 'Confirmado' && paymentStatus === 'Pagado')
  );
}
