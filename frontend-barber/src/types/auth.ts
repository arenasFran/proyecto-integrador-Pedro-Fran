export interface RegisterFormData extends Record<string, string> {
  email: string;
  password: string;
  repeatPassword: string;
  name: string;
  lastname: string;
  phone: string;
}

export interface LoginFormData extends Record<string, string> {
  email: string;
  password: string;
}

export interface GoogleLoginFormData extends Record<string, string> {
  token: string;
}

export interface TwoFactorCodeFormData extends Record<string, string> {
  token: string;
}

export interface RequestResetFormData extends Record<string, string> {
  email: string;
}

export interface ResetPasswordFormData extends Record<string, string> {
  token: string;
  password: string;
  repeatPassword: string;
  email: string;
}

export type User = {
  id: string;
  name: string;
  lastname: string;
  email: string;
  phone: string;
  kind: 'Admin' | 'Empleado' | 'Registrado';
  photoUrl?: string | null;
};

export interface ValidationError {
  field: string;
  message: string;
}

export interface FormErrors {
  [key: string]: string | undefined;
}