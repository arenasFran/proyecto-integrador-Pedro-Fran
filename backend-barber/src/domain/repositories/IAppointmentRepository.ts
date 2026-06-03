import { Appointment, AppointmentPrimitives } from '../entities/Appointment';
import { AppointmentStatus } from '../types/appointment';

export type AppointmentFilters = {
  barberId?: string;
  clientId?: string;
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
};

export interface IAppointmentRepository {
  findById(id: string): Promise<Appointment | null>;
  findMany(filters: AppointmentFilters): Promise<Appointment[]>;
  findByBarberAndDate(barberId: string, date: string): Promise<Appointment[]>;
  create(data: CreateAppointmentData): Promise<Appointment>;
  updateStatus(id: string, data: UpdateStatusData): Promise<Appointment | null>;
}
