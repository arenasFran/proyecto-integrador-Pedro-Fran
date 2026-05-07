export interface RegisterFormData {
  email: string;
  password: string;
  repeatPassword: string;
  name: string;
  lastname: string;
  phone: string;
}

export interface RequestResetFormData {
  email: string;
}

export interface ResetPasswordFormData {
  token: string;
  password: string;
  repeatPassword: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface FormErrors {
  [key: string]: string | undefined;
}