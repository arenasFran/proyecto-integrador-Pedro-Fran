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

export type AppointmentStatus = 'Confirmado' | 'Cancelado' | 'Completado' | 'NoShow';

export type PaymentStatus = 'Pendiente' | 'Pagado';

export type PaymentMethod = 'local' | 'online' | 'memberPass';

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
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
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
