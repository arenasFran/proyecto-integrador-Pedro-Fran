export type BarberRole = 'empleado' | 'admin';
export type ClientRole = 'cliente';
export type UserRole = BarberRole | ClientRole;
export type AuthProvider = 'local' | 'google';

export interface IBarberBaseInput {
  email: string;
  password: string;
  name: string;
  lastname: string;
  phone: string;
  twoFactorCode?: string;
  twoFactorExpires?: Date;
  role: BarberRole;
}

export interface IEmployeeInput extends IBarberBaseInput {
  role: 'empleado';
}

export interface IAdminInput extends IBarberBaseInput {
  role: 'admin';
}

export interface IClientBaseInput {
  name: string;
  lastname: string;
  phone?: string;
  contactEmail?: string;
  role?: ClientRole;
}

export interface IRegisteredClientInput extends IClientBaseInput {
  email: string;
  password?: string;
  authProvider?: AuthProvider;
  googleId?: string;
  twoFactorCode?: string;
  twoFactorExpires?: Date;
}

export interface IUnregisteredClientInput extends IClientBaseInput {}

export type IUserInput = IRegisteredClientInput;