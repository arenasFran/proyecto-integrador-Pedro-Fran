import { AuthProvider, BarberKind, ClientKind } from '../../domain/types/auth';

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
}

export interface IAdminInput extends IBarberBaseInput {
  kind: 'Admin';
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
