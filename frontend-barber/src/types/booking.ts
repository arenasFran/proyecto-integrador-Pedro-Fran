export type BarberPublic = {
  id: string;
  name: string;
  lastname: string;
  services: string[];
  photoUrl: string | null;
  isActive: boolean;
  slotDuration: number;
};

export type Service = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
};

export type AppointmentStatus = 'Pendiente' | 'Confirmado' | 'Cancelado' | 'Completado';

export type CreateAppointmentPayload = {
  barberId: string;
  serviceId: string;
  date: string;
  startTime: string;
  clientName: string;
  clientLastname: string;
  clientPhone?: string;
  clientEmail?: string;
};

export type Appointment = {
  id: string;
  barberId: string;
  clientId?: string;
  clientName: string;
  clientLastname: string;
  clientPhone?: string;
  clientEmail?: string;
  serviceId: string;
  serviceName: string;
  servicePrice: number;
  serviceDuration: number;
  date: string;
  startTime: string;
  endTime: string;
  status: AppointmentStatus;
  cancelReason?: string;
  cancelledAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type BookingStep = 'barber' | 'service' | 'datetime';

export type BookingState = {
  currentStep: BookingStep;
  selectedBarber: BarberPublic | null;
  selectedService: Service | null;
  selectedDate: string | null;
  selectedTime: string | null;
};
