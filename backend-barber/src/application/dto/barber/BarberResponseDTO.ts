import { Barber, BarberSchedule } from '../../../domain/entities/Barber';
import { BarberKind } from '../../../domain/types/auth';

export type BarberResponseDTO = {
  _id: string;
  name: string;
  lastname: string;
  email: string;
  phone: string;
  kind: BarberKind;
  specialties: string[];
  age?: number;
  photoUrl?: string | null;
  isActive: boolean;
  slotDuration: number;
  schedule: BarberSchedule;
};

export const toBarberResponse = (barber: Barber): BarberResponseDTO => {
  return {
    _id: barber.id,
    name: barber.name,
    lastname: barber.lastname,
    email: barber.email,
    phone: barber.phone,
    kind: barber.kind,
    specialties: barber.specialties,
    age: barber.age,
    photoUrl: barber.photoUrl ?? null,
    isActive: barber.isActive,
    slotDuration: barber.slotDuration,
    schedule: barber.schedule,
  };
};
