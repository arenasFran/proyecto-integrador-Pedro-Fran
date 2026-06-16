import { AuthProvider, BarberKind, ClientKind } from '../../domain/types/auth';
import { BarberSchedule } from '../../domain/entities/Barber';

export interface IBarberBaseInput {
  email: string;
  password: string;
  name: string;
  lastname: string;
  phone: string;
  twoFactorCode?: string;
  twoFactorExpires?: Date;
  kind?: BarberKind;
}

export interface IEmployeeInput extends IBarberBaseInput {
  kind: 'Empleado';
  services?: string[];
  age?: number;
  photoUrl?: string | null;
  isActive?: boolean;
  slotDuration?: number;
  maxAdvanceDays?: number;
  schedule: BarberSchedule;
}

export interface IAdminInput extends IBarberBaseInput {
  kind: 'Admin';
  services?: string[];
  age?: number;
  photoUrl?: string | null;
  isActive?: boolean;
  slotDuration?: number;
  maxAdvanceDays?: number;
  schedule: BarberSchedule;
}

export interface IClientBaseInput {
  name: string;
  lastname: string;
  phone?: string;
  contactEmail?: string;
  kind?: ClientKind;
}

export interface IRegisteredClientInput extends IClientBaseInput {
  email: string;
  password?: string;
  authProvider?: AuthProvider;
  googleId?: string;
  twoFactorCode?: string;
  twoFactorExpires?: Date;
  kind?: 'Registrado';
}

export interface IUnregisteredClientInput extends IClientBaseInput {
  kind?: 'NoRegistrado';
}

export type IUserInput = IRegisteredClientInput;
