export interface IUserInput {
  email: string;
  password: string;
  name: string;
  lastname: string;
  phone: string;
  role?: 'cliente' | 'barbero' | 'empleado' | 'admin'
}