export interface GuestBookingState {
  clientName?: string;
  clientLastname?: string;
  clientPhone?: string;
  clientEmail?: string;
  serviceId?: string;
  serviceName?: string;
  barberId?: string;
  barberName?: string;
  date?: string;
  startTime?: string;
  /** Hora candidata extraída por el LLM antes de que se resuelva la fecha; se aplica cuando se elige un día. */
  pendingTime?: string;
  /** Presente si el Telegram del usuario ya está vinculado: la reserva se crea como usuario registrado. */
  accessToken?: string;
  /** Texto libre que ya traía intención de reserva al entrar a la escena (ver bot.ts, intent "reservar"): se procesa apenas la escena esté lista para interpretarlo, en vez de descartarlo y volver a preguntar. */
  pendingFreeText?: string;
}
