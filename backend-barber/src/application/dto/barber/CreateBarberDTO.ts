import { BarberSchedule } from '../../../domain/entities/Barber';

export type CreateBarberDTO = {
  email: string;
  password: string;
  name: string;
  lastname: string;
  phone: string;
  specialties: string[];
  age?: number;
  photoUrl?: string | null;
  slotDuration?: number;
  schedule: BarberSchedule;
};
