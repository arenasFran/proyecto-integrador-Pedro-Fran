import { Appointment, AppointmentPrimitives } from '../entities/Appointment';
import { AppointmentStatus, StatusHistoryEntry } from '../types/appointment';

export type AppointmentFilters = {
  barberId?: string;
  clientId?: string;
  clientEmail?: string;
  clientPhone?: string;
  date?: string;
  status?: AppointmentStatus;
  dateFrom?: string;
  dateTo?: string;
};

export type CreateAppointmentData = Omit<AppointmentPrimitives, 'id' | 'createdAt' | 'updatedAt'>;

export type UpdateStatusData = {
  status: AppointmentStatus;
  cancelReason?: string;
  cancelledAt?: Date;
  cancelledBy?: string;
  statusHistoryEntry?: StatusHistoryEntry;
};

export type UpdateAppointmentData = {
  date?: string;
  startTime?: string;
  endTime?: string;
  barberId?: string;
};

export interface IAppointmentRepository {
  findById(id: string): Promise<Appointment | null>;
  findMany(filters: AppointmentFilters): Promise<Appointment[]>;
  findByBarberAndDate(barberId: string, date: string): Promise<Appointment[]>;
  findByClientAndDate(clientId: string, date: string): Promise<Appointment[]>;
  findByContactAndDate(date: string, clientEmail?: string, clientPhone?: string): Promise<Appointment[]>;
  create(data: CreateAppointmentData): Promise<Appointment>;
  update(id: string, data: UpdateAppointmentData): Promise<Appointment | null>;
  updateStatus(id: string, data: UpdateStatusData): Promise<Appointment | null>;
}
