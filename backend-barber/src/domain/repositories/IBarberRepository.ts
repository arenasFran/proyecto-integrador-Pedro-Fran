import { Barber, BarberSchedule } from '../entities/Barber';

export type BarberUpdate = {
  email?: string;
  name?: string;
  lastname?: string;
  phone?: string;
  services?: string[];
  age?: number | null;
  photoUrl?: string | null;
  isActive?: boolean;
  slotDuration?: number;
  maxAdvanceDays?: number;
  passwordHash?: string;
};

export interface IBarberRepository {
  findBarberById(id: string): Promise<Barber | null>;
  findAllBarbers(): Promise<Barber[]>;
  createBarber(barber: Barber): Promise<Barber>;
  updateBarber(id: string, update: BarberUpdate): Promise<Barber | null>;
  deactivateBarber(id: string): Promise<void>;
  deleteBarber(id: string): Promise<void>;
  updateSchedule(id: string, schedule: BarberSchedule): Promise<Barber | null>;
}
