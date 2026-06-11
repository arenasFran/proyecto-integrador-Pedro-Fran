import { BarberDTOSchedule, BarberDTOKind } from './barber-dto.types';

export type BarberResponseDTO = {
  id: string;
  name: string;
  lastname: string;
  email: string;
  phone: string;
  kind: BarberDTOKind;
  services: string[];
  age?: number;
  photoUrl?: string | null;
  isActive: boolean;
  slotDuration: number;
  schedule: BarberDTOSchedule;
};

type BarberEntityLike = {
  id: string;
  name: string;
  lastname: string;
  email: string;
  phone: string;
  kind: string;
  services: string[];
  age?: number;
  photoUrl?: string | null;
  isActive: boolean;
  slotDuration: number;
  schedule: BarberDTOSchedule;
};

export const toBarberResponse = (barber: BarberEntityLike): BarberResponseDTO => {
  return {
    id: barber.id,
    name: barber.name,
    lastname: barber.lastname,
    email: barber.email,
    phone: barber.phone,
    kind: barber.kind as BarberDTOKind,
    services: barber.services,
    age: barber.age,
    photoUrl: barber.photoUrl ?? null,
    isActive: barber.isActive,
    slotDuration: barber.slotDuration,
    schedule: barber.schedule,
  };
};
