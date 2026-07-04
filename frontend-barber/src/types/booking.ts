export type BarberPublic = {
  id: string;
  name: string;
  lastname: string;
  services: string[];
  photoUrl: string | null;
  isActive: boolean;
  slotDuration: number;
  maxAdvanceDays: number;
};

export type ServiceStatus = 'active' | 'inactive' | 'deleted';

export type Service = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  status: ServiceStatus;
};

export type AppointmentStatus = 'Confirmado' | 'Cancelado' | 'Completado' | 'NoShow';

export type PaymentStatus = 'Pendiente' | 'Pagado' | 'Cancelado';

export type PaymentMethod = 'local' | 'online' | 'memberPass';

export type StatusHistoryEntry = {
  status: AppointmentStatus;
  timestamp: string;
  actor: string;
};

export type CreatedBy = {
  type: 'staff' | 'registered' | 'anonymous';
  userId?: string;
};

export type ClientKind = 'Registrado' | 'NoRegistrado';

export type CreateAppointmentPayload = {
  barberId: string;
  serviceId: string;
  date: string;
  startTime: string;
  clientName: string;
  clientLastname: string;
  clientPhone: string;
  clientEmail: string;
  tempLockId?: string;
};

export type Appointment = {
  id: string;
  barberId: string;
  barberName?: string;
  barberPhotoUrl?: string;
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
  cancelledAt?: string | null;
  cancelledBy?: string;
  createdBy?: CreatedBy;
  statusHistory?: StatusHistoryEntry[];
  clientKind?: ClientKind;
  createdAt: string;
  updatedAt: string;
};

export type BarberBlock = {
  id: string;
  barberId: string;
  date: string;
  startTime: string;
  endTime: string;
  createdBy?: string;
};

export type BookingStep = 'barber' | 'service' | 'datetime';

export type BookingState = {
  currentStep: BookingStep;
  selectedBarber: BarberPublic | null;
  selectedService: Service | null;
  selectedDate: string | null;
  selectedTime: string | null;
};
