import { CreatedBy } from '../../../domain/entities/Appointment';

export type AppointmentResponseDTO = {
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
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  cancelReason?: string;
  cancelledAt?: Date | null;
  createdBy?: CreatedBy;
  statusHistory: Array<{ status: string; timestamp: Date; actor: string }>;
  createdAt: Date;
  updatedAt: Date;
};
