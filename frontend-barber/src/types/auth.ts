export interface RegisterFormData {
  email: string;
  password: string;
  repeatPassword: string;
  name: string;
  lastname: string;
  phone: string;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface GoogleLoginFormData {
  token: string;
}

export interface TwoFactorCodeFormData {
  token: string;
}

export interface RequestResetFormData {
  email: string;
}

export interface ResetPasswordFormData {
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