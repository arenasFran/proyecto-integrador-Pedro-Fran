import { Barber, BarberSchedule } from '../entities/Barber';

export type BarberUpdate = {
  email?: string;
  name?: string;
  lastname?: string;
  phone?: string;
  specialties?: string[];
  age?: number | null;
  photoUrl?: string | null;
  isActive?: boolean;
  slotDuration?: number;
  passwordHash?: string;
};

export interface IBarberRepository {
  findEmployeeById(id: string): Promise<Barber | null>;
  findAllEmployees(): Promise<Barber[]>;
  createEmployee(barber: Barber): Promise<Barber>;
  updateEmployee(id: string, update: BarberUpdate): Promise<Barber | null>;
  deactivateEmployee(id: string): Promise<void>;
  updateSchedule(id: string, schedule: BarberSchedule): Promise<Barber | null>;
}
