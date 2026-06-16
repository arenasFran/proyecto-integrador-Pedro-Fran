import { BarberDTOSchedule } from './barber-dto.types';

export type CreateBarberDTO = {
  email: string;
  password: string;
  name: string;
  lastname: string;
  phone: string;
  services: string[];
  age?: number;
  photoUrl?: string | null;
  slotDuration?: number;
  maxAdvanceDays?: number;
  schedule: BarberDTOSchedule;
};
